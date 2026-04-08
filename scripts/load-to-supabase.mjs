#!/usr/bin/env node
/**
 * Bulk-loads nhl_player_seasons from scores.js into Supabase.
 * Safe to re-run: truncates the table first.
 *
 * Usage: node scripts/load-to-supabase.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Load env from .env.local ──────────────────────────────────────────────────
const envFile = join(ROOT, '.env.local');
const env = Object.fromEntries(
  readFileSync(envFile, 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Load scores.js ────────────────────────────────────────────────────────────
console.log('Loading scores.js ...');
const { stats } = await import(pathToFileURL(join(ROOT, 'scores.js')).href);
console.log(`  ${stats.length.toLocaleString()} records loaded`);

// ── Map to DB columns (camelCase → snake_case) ────────────────────────────────
const rows = stats.map(r => ({
  player_id:       r.playerId,
  first_name:      r.firstName,
  last_name:       r.lastName,
  season_id:       r.seasonId,
  position_code:   r.positionCode,
  team_abbrevs:    r.teamAbbrevs,
  team_names:      r.teamNames,
  games_played:    r.gamesPlayed,
  goals:           r.goals,
  assists:         r.assists,
  points:          r.points,
  penalty_minutes: r.penaltyMinutes,
  active_player:   r.activePlayer,
  rookie_flag:     r.rookieFlag,
}));

// ── Truncate existing data ────────────────────────────────────────────────────
console.log('\nTruncating nhl_player_seasons ...');
const { error: truncErr } = await supabase
  .from('nhl_player_seasons')
  .delete()
  .gte('id', 0);

if (truncErr) {
  console.warn('Truncate warning:', truncErr.message, '(continuing anyway)');
}

// ── Bulk insert in batches ────────────────────────────────────────────────────
const BATCH = 500;
const total = rows.length;
let inserted = 0;
let errors = 0;

console.log(`\nInserting ${total.toLocaleString()} records in batches of ${BATCH} ...\n`);

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const batchNum = Math.floor(i / BATCH) + 1;
  const totalBatches = Math.ceil(rows.length / BATCH);

  const { error } = await supabase
    .from('nhl_player_seasons')
    .insert(batch);

  if (error) {
    console.error(`  Batch ${batchNum}/${totalBatches} FAILED: ${error.message}`);
    errors++;
  } else {
    inserted += batch.length;
    const pct = Math.round((inserted / total) * 100);
    process.stdout.write(
      `\r  ${inserted.toLocaleString()} / ${total.toLocaleString()} (${pct}%)  batch ${batchNum}/${totalBatches}`
    );
  }

  // Small pause to avoid rate limits
  if (i + BATCH < rows.length) await new Promise(r => setTimeout(r, 50));
}

// ── Verify ────────────────────────────────────────────────────────────────────
console.log('\n');
const { count } = await supabase
  .from('nhl_player_seasons')
  .select('*', { count: 'exact', head: true });

console.log(`\n✓ Done!`);
console.log(`  Inserted : ${inserted.toLocaleString()} records`);
console.log(`  DB count : ${count?.toLocaleString() ?? '?'}`);
console.log(`  Errors   : ${errors}`);
if (errors > 0) {
  console.warn('\n⚠  Some batches failed — re-run the script to fill gaps.');
}
