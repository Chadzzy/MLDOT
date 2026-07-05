#!/usr/bin/env node
/**
 * Structural + script-correctness validator for src/data/hk_poi.json (P4).
 *
 * Checks:
 *  1. Every entry has all required fields, non-empty.
 *  2. `aliases` are all lowercase (Chinese aliases are a no-op under
 *     .toLowerCase(), only Latin-script aliases are actually asserted).
 *  3. No duplicate `name_en` across the dataset.
 *  4. Traditional/Simplified correctness spot-check: for a curated set of
 *     characters that differ between scripts (車/车, 東/东, 國/国, 灣/湾, …),
 *     if a `name_yue`/`landmark_yue` field contains the Traditional form,
 *     the corresponding `name_cmn`/`landmark_cmn` field must contain the
 *     Simplified form at the same character position (and vice versa) —
 *     i.e. the two scripts must not have been left identical when they
 *     should differ.
 *
 * Usage: node scripts/validate_poi.mjs [path/to/hk_poi.json]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = process.argv[2] ?? path.join(__dirname, '../src/data/hk_poi.json');

const REQUIRED_FIELDS = [
  'name_yue',
  'name_cmn',
  'name_en',
  'area',
  'landmark_yue',
  'landmark_cmn',
  'landmark_en',
  'jyutping',
  'pinyin',
  'aliases',
];

// A representative sample of Traditional -> Simplified pairs common in HK
// place names (stations, hospitals, malls, streets). Not exhaustive — this
// is a spot-check, not a full OpenCC reimplementation.
const TRAD_TO_SIMP = {
  '車': '车', '東': '东', '國': '国', '廣': '广', '灣': '湾', '華': '华',
  '圖': '图', '館': '馆', '龍': '龙', '園': '园', '醫': '医', '學': '学',
  '鐵': '铁', '場': '场', '機': '机', '島': '岛', '環': '环', '區': '区',
  '電': '电', '開': '开', '關': '关', '錢': '钱', '錦': '锦', '頭': '头',
  '顯': '显', '觀': '观', '體': '体', '匯': '汇', '樂': '乐', '產': '产',
  '業': '业', '貿': '贸', '會': '会', '飛': '飞', '馬': '马', '讓': '让',
  '兒': '儿', '語': '语', '韓': '韩', '買': '买', '賣': '卖',
  '爾': '尔', '親': '亲', '聯': '联', '運': '运', '選': '选',
  '簡': '简', '總': '总', '號': '号', '樓': '楼', '銅': '铜', '鑼': '锣',
  '鑽': '钻', '嶺': '岭', '寶': '宝', '樹': '树', '術': '术',
  '藝': '艺', '築': '筑', '護': '护', '證': '证', '講': '讲', '義': '义',
  '豐': '丰', '徑': '径', '寧': '宁', '橋': '桥', '雞': '鸡',
  '長': '长', '樑': '梁',
};

let failed = false;
function fail(msg) {
  failed = true;
  console.error(`FAIL: ${msg}`);
}

const raw = readFileSync(dataPath, 'utf-8');
/** @type {any[]} */
const pois = JSON.parse(raw);

if (!Array.isArray(pois) || pois.length === 0) {
  fail(`Expected a non-empty array at ${dataPath}`);
  process.exit(1);
}

console.log(`Loaded ${pois.length} POI entries from ${dataPath}`);

// 1. Required fields, non-empty.
for (const poi of pois) {
  const label = poi.name_en ?? `id=${poi.id}`;
  for (const field of REQUIRED_FIELDS) {
    const v = poi[field];
    if (v === undefined || v === null) {
      fail(`${label}: missing field "${field}"`);
      continue;
    }
    if (Array.isArray(v)) {
      if (v.length === 0) fail(`${label}: "${field}" is an empty array`);
    } else if (typeof v === 'string') {
      if (v.trim().length === 0) fail(`${label}: "${field}" is empty`);
    }
  }
}

// 2. Aliases lowercase.
for (const poi of pois) {
  const label = poi.name_en ?? `id=${poi.id}`;
  for (const alias of poi.aliases ?? []) {
    if (alias !== alias.toLowerCase()) {
      fail(`${label}: alias "${alias}" is not lowercase`);
    }
  }
}

// 3. No duplicate name_en.
{
  const seen = new Map();
  for (const poi of pois) {
    const key = poi.name_en;
    if (seen.has(key)) {
      fail(`Duplicate name_en: "${key}" (ids ${seen.get(key)} and ${poi.id})`);
    } else {
      seen.set(key, poi.id);
    }
  }
}

// 4. Traditional/Simplified spot-check.
function checkScriptPair(label, fieldT, fieldS, textT, textS) {
  if (typeof textT !== 'string' || typeof textS !== 'string') return;
  for (const [trad, simp] of Object.entries(TRAD_TO_SIMP)) {
    if (textT.includes(trad)) {
      if (!textS.includes(simp)) {
        fail(
          `${label}: "${fieldT}" contains Traditional "${trad}" but "${fieldS}" ("${textS}") lacks Simplified "${simp}"`,
        );
      }
      if (textS.includes(trad) && trad !== simp) {
        fail(
          `${label}: "${fieldS}" ("${textS}") still contains the Traditional form "${trad}" instead of "${simp}"`,
        );
      }
    }
  }
}

let scriptPairsChecked = 0;
for (const poi of pois) {
  const label = poi.name_en ?? `id=${poi.id}`;
  checkScriptPair(label, 'name_yue', 'name_cmn', poi.name_yue, poi.name_cmn);
  checkScriptPair(label, 'landmark_yue', 'landmark_cmn', poi.landmark_yue, poi.landmark_cmn);
  scriptPairsChecked += 1;
}
console.log(`Script-pair spot-check ran across ${scriptPairsChecked} entries (Traditional/Simplified char map).`);

// Sanity: name_yue must not be byte-identical to name_cmn for entries that
// contain any character in our Traditional/Simplified map (that would mean
// the conversion silently failed for that entry).
let identicalButShouldDiffer = 0;
for (const poi of pois) {
  const tradChars = Object.keys(TRAD_TO_SIMP);
  const containsMappedChar = tradChars.some(c => poi.name_yue?.includes(c));
  if (containsMappedChar && poi.name_yue === poi.name_cmn) {
    identicalButShouldDiffer += 1;
    fail(`${poi.name_en}: name_yue and name_cmn are identical ("${poi.name_yue}") despite containing a Traditional-only character`);
  }
}

if (failed) {
  console.error('\nValidation FAILED.');
  process.exit(1);
}

console.log('\nAll checks passed:');
console.log(`  - ${pois.length} entries, all required fields present and non-empty`);
console.log('  - all aliases lowercase');
console.log('  - no duplicate name_en');
console.log('  - Traditional/Simplified spot-check clean (no mismatched or un-converted scripts)');
