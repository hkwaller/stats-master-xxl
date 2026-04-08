#!/usr/bin/env node
/**
 * Scrapes complete NHL skater stats from the NHL API season by season.
 * Generates a new scores.js with all player-season records (not just 70+ pts).
 *
 * Usage: node scripts/scrape-nhl.mjs
 * Takes ~5-10 minutes. Output: scores.js in project root.
 *
 * Safe to interrupt and resume — state is checkpointed every 5 seasons.
 */

import { writeFileSync, existsSync, readFileSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const OUTPUT     = join(ROOT, 'scores.js');
const CHECKPOINT = join(ROOT, 'scripts', '.scrape-checkpoint.json');

// ─── Team name mapping ────────────────────────────────────────────────────────
const TEAM_NAMES = {
  ANA: 'Anaheim Ducks',     ARI: 'Arizona Coyotes',    BOS: 'Boston Bruins',
  BUF: 'Buffalo Sabres',    CAR: 'Carolina Hurricanes', CBJ: 'Columbus Blue Jackets',
  CGY: 'Calgary Flames',    CHI: 'Chicago Blackhawks',  COL: 'Colorado Avalanche',
  DAL: 'Dallas Stars',      DET: 'Detroit Red Wings',   EDM: 'Edmonton Oilers',
  FLA: 'Florida Panthers',  LAK: 'Los Angeles Kings',   MIN: 'Minnesota Wild',
  MTL: 'Montréal Canadiens', NJD: 'New Jersey Devils',  NSH: 'Nashville Predators',
  NYI: 'New York Islanders', NYR: 'New York Rangers',   OTT: 'Ottawa Senators',
  PHI: 'Philadelphia Flyers', PIT: 'Pittsburgh Penguins', SEA: 'Seattle Kraken',
  SJS: 'San Jose Sharks',   STL: 'St. Louis Blues',     TBL: 'Tampa Bay Lightning',
  TOR: 'Toronto Maple Leafs', UTA: 'Utah Hockey Club',  VAN: 'Vancouver Canucks',
  VGK: 'Vegas Golden Knights', WPG: 'Winnipeg Jets',    WSH: 'Washington Capitals',
  // Historical
  ATF: 'Atlanta Flames',         ATL: 'Atlanta Thrashers',      CLR: 'Colorado Rockies',
  HFD: 'Hartford Whalers',       KCS: 'Kansas City Scouts',     MDA: 'Mighty Ducks of Anaheim',
  MNS: 'Minnesota North Stars',  NYA: 'New York Americans',     OAK: 'Oakland Seals',
  CSE: 'California Golden Seals', PHX: 'Phoenix Coyotes',       QUE: 'Québec Nordiques',
  WIN: 'Winnipeg Jets (1979–96)', PIR: 'Pittsburgh Pirates',    MMR: 'Montréal Maroons',
  STE: 'St. Louis Eagles',        HAM: 'Hamilton Tigers',       PHQ: 'Philadelphia Quakers',
  TAN: 'Toronto Arenas',          TSP: 'Toronto St. Patricks',  MWN: 'Montreal Wanderers',
  // Old abbreviation aliases
  LA: 'Los Angeles Kings', TB: 'Tampa Bay Lightning', NJ: 'New Jersey Devils',
};

function resolveTeamNames(abbrevs) {
  if (!abbrevs) return '';
  return abbrevs.split(',').map(a => TEAM_NAMES[a.trim()] ?? a.trim()).join(', ');
}

// ─── Season list ──────────────────────────────────────────────────────────────
function allSeasonIds() {
  const ids = [];
  for (let y = 1917; y <= 2024; y++) {
    if (y === 2004) continue; // lockout — no season
    ids.push(y * 10000 + (y + 1));
  }
  return ids;
}

// ─── Fetch with exponential backoff (handles 429) ─────────────────────────────
async function fetchJSON(url, maxRetries = 5) {
  let delay = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.status === 429) {
        const wait = delay * attempt;
        process.stdout.write(`\n    429 rate-limited, waiting ${wait / 1000}s... `);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === maxRetries) throw e;
      console.warn(`\n    Retry ${attempt}/${maxRetries}: ${e.message}`);
      await sleep(1000 * attempt);
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Atomic write (write to .tmp then rename) ─────────────────────────────────
function writeFileSafe(dest, content) {
  const tmp = dest + '.tmp';
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, dest);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const seasons = allSeasonIds();
  console.log(`Fetching ${seasons.length} seasons (1917-18 → 2024-25, skipping 2004-05)\n`);

  // Load checkpoint
  let completedSeasons = {};
  let allRecords = [];

  if (existsSync(CHECKPOINT)) {
    try {
      const cp = JSON.parse(readFileSync(CHECKPOINT, 'utf-8'));
      // Safety guard: only restore if checkpoint looks real
      if (cp.allRecords?.length > 100) {
        completedSeasons = cp.completedSeasons;
        allRecords = cp.allRecords;
        console.log(`Resuming: ${Object.keys(completedSeasons).length} seasons done, ${allRecords.length} records\n`);
      }
    } catch { /* start fresh */ }
  }

  // Save checkpoint helper (only if we have substantial data)
  function saveCheckpoint() {
    if (allRecords.length > 100) {
      writeFileSafe(CHECKPOINT, JSON.stringify({ completedSeasons, allRecords }));
    }
  }

  // Graceful shutdown
  process.on('SIGINT', () => { saveCheckpoint(); console.log('\nInterrupted — checkpoint saved.'); process.exit(0); });
  process.on('SIGTERM', () => { saveCheckpoint(); process.exit(0); });

  for (let i = 0; i < seasons.length; i++) {
    const seasonId = seasons[i];
    const key = String(seasonId);

    if (completedSeasons[key] !== undefined) {
      process.stdout.write(`  [${i + 1}/${seasons.length}] ${seasonId} — skipped (${completedSeasons[key]} records)\n`);
      continue;
    }

    process.stdout.write(`  [${i + 1}/${seasons.length}] ${seasonId} ... `);

    try {
      const seasonRecords = [];
      let start = 0;
      let total = Infinity;

      while (start < total) {
        const url = `https://api.nhle.com/stats/rest/en/skater/summary?cayenneExp=gameTypeId=2%20and%20seasonId=${seasonId}&sort=points&start=${start}&limit=100`;
        const data = await fetchJSON(url);

        if (!data?.data?.length) break;
        total = data.total;
        seasonRecords.push(...data.data);
        start += data.data.length;

        if (seasonRecords.length < total) {
          await sleep(80); // small pause between pages
        }
      }

      for (const r of seasonRecords) {
        const lastName = r.lastName ?? '';
        const fullName = r.skaterFullName ?? lastName;
        const lastIdx  = fullName.lastIndexOf(lastName);
        const firstName = lastIdx > 0 ? fullName.substring(0, lastIdx).trim() : '';

        allRecords.push({
          playerId: r.playerId,
          firstName,
          lastName,
          seasonId,
          positionCode: r.positionCode ?? '',
          teamAbbrevs: r.teamAbbrevs ?? '',
          teamNames: resolveTeamNames(r.teamAbbrevs),
          gamesPlayed: r.gamesPlayed ?? 0,
          goals: r.goals ?? 0,
          assists: r.assists ?? 0,
          points: r.points ?? 0,
          penaltyMinutes: r.penaltyMinutes ?? 0,
        });
      }

      completedSeasons[key] = seasonRecords.length;
      process.stdout.write(`${seasonRecords.length} skaters\n`);

      if ((i + 1) % 5 === 0) saveCheckpoint();
    } catch (e) {
      process.stdout.write(`ERROR — ${e.message}\n`);
    }

    await sleep(200); // ~200ms between seasons
  }

  saveCheckpoint();

  // ─── Sanity check ──────────────────────────────────────────────────────────
  if (allRecords.length < 5000) {
    console.error(`\nAborted: only ${allRecords.length} records — looks incomplete. Check errors above.`);
    process.exit(1);
  }

  console.log(`\nProcessing ${allRecords.length.toLocaleString()} raw records...`);

  // Derive rookieFlag
  const playerFirstSeason = new Map();
  for (const r of allRecords) {
    const existing = playerFirstSeason.get(r.playerId);
    if (existing === undefined || r.seasonId < existing) {
      playerFirstSeason.set(r.playerId, r.seasonId);
    }
  }

  // Derive activePlayer (appears in 2024-25)
  const activePlayers = new Set(
    allRecords.filter(r => r.seasonId === 20242025).map(r => r.playerId)
  );

  // Build output lines
  const lines = allRecords.map((r, idx) => {
    const rookieFlag  = playerFirstSeason.get(r.playerId) === r.seasonId;
    const activePlayer = activePlayers.has(r.playerId);
    return (
      `  { id: ${idx + 1}, playerId: ${r.playerId}, firstName: ${JSON.stringify(r.firstName)}, ` +
      `lastName: ${JSON.stringify(r.lastName)}, seasonId: ${r.seasonId}, ` +
      `positionCode: ${JSON.stringify(r.positionCode)}, teamAbbrevs: ${JSON.stringify(r.teamAbbrevs)}, ` +
      `teamNames: ${JSON.stringify(r.teamNames)}, gamesPlayed: ${r.gamesPlayed}, ` +
      `goals: ${r.goals}, assists: ${r.assists}, points: ${r.points}, ` +
      `penaltyMinutes: ${r.penaltyMinutes}, activePlayer: ${activePlayer}, rookieFlag: ${rookieFlag} }`
    );
  });

  const output = `export const stats = [\n${lines.join(',\n')}\n]\n`;
  writeFileSafe(OUTPUT, output);

  const uniquePlayers = new Set(allRecords.map(r => r.playerId)).size;
  const seasons70plus = allRecords.filter(r => r.points >= 70).length;
  const missedSeasons = seasons.filter(s => completedSeasons[String(s)] === undefined);

  console.log(`\n✓ Done!`);
  console.log(`  Total records    : ${allRecords.length.toLocaleString()}`);
  console.log(`  Unique players   : ${uniquePlayers.toLocaleString()}`);
  console.log(`  70+ point seasons: ${seasons70plus.toLocaleString()}`);
  console.log(`  Active players   : ${activePlayers.size}`);
  if (missedSeasons.length) {
    console.log(`  ⚠ Failed seasons : ${missedSeasons.length} — ${missedSeasons.join(', ')}`);
  }
  console.log(`  Output           : scores.js`);
  console.log(`\nCheckpoint saved at scripts/.scrape-checkpoint.json (delete when done)\n`);
}

main().catch(err => {
  console.error('\nFatal:', err);
  process.exit(1);
});
