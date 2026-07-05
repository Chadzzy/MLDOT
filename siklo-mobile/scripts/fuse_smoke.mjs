#!/usr/bin/env node
/**
 * fuse.js smoke test for the Go search index (P4). Mirrors the exact Fuse
 * config used in src/features/go/GoHome.tsx — if you tune one, tune both.
 *
 * Asserts the top hit for a handful of representative queries: an English
 * misspelling/abbreviation ("mongkok", "tst"), Traditional Chinese exact
 * text ("旺角"), and a full English name ("queen mary hospital").
 *
 * Usage: node scripts/fuse_smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Fuse from 'fuse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data/hk_poi.json');
const pois = JSON.parse(readFileSync(dataPath, 'utf-8'));

// Keep in sync with src/features/go/GoHome.tsx.
const fuse = new Fuse(pois, {
  keys: [
    { name: 'name_en', weight: 0.35 },
    { name: 'aliases', weight: 0.35 },
    { name: 'name_yue', weight: 0.2 },
    { name: 'name_cmn', weight: 0.2 },
    { name: 'area', weight: 0.1 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 1,
});

const cases = [
  { query: 'mongkok', expectedNameEn: 'Mong Kok Station' },
  { query: 'tst', expectedNameEn: 'Tsim Sha Tsui Station' },
  { query: '旺角', expectedNameEn: 'Mong Kok Station' },
  { query: 'queen mary hospital', expectedNameEn: 'Queen Mary Hospital' },
];

let failed = false;
for (const { query, expectedNameEn } of cases) {
  const results = fuse.search(query);
  const top = results[0]?.item;
  const ok = top?.name_en === expectedNameEn;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  "${query}" -> top hit: ${top ? top.name_en : '(no results)'}` +
      (ok ? '' : `  (expected "${expectedNameEn}")`),
  );
  if (!ok) failed = true;
}

if (failed) {
  console.error('\nfuse smoke test FAILED');
  process.exit(1);
}
console.log('\nAll fuse smoke assertions passed.');
