#!/usr/bin/env node
/**
 * Dumps all unique NHL player names + career points into lib/data/player-names.json.
 * Career points are used to weight autocomplete results (more famous players surface first).
 * Re-run whenever the database is refreshed with new season data.
 *
 * Usage: node scripts/generate-player-names.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf-8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const PAGE_SIZE = 1000;
// player_id → { name, pts }
const players = new Map();
let from = 0;

process.stdout.write('Fetching player data');

while (true) {
  const { data, error } = await supabase
    .from('nhl_player_seasons')
    .select('player_id, first_name, last_name, points')
    .range(from, from + PAGE_SIZE - 1)
    .order('player_id');

  if (error) { console.error('\nError:', error.message); process.exit(1); }
  if (!data || data.length === 0) break;

  for (const r of data) {
    const existing = players.get(r.player_id);
    if (existing) {
      existing.pts += r.points;
    } else {
      players.set(r.player_id, { name: `${r.first_name} ${r.last_name}`, pts: r.points });
    }
  }

  process.stdout.write('.');
  if (data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}

// Sort by career points descending so the JSON is human-readable in that order too
const sorted = [...players.values()].sort((a, b) => b.pts - a.pts);

const outPath = join(ROOT, 'lib', 'data', 'player-names.json');
writeFileSync(outPath, JSON.stringify(sorted, null, 2));

console.log(`\n✓ ${sorted.length.toLocaleString()} unique players → lib/data/player-names.json`);
console.log(`  Top 5: ${sorted.slice(0, 5).map(p => `${p.name} (${p.pts}pts)`).join(', ')}`);
