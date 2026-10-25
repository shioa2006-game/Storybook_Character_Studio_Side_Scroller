// EMBERBOUND — one command after editing `characters/eb-*` (plan/EMBERBOUND_PRODUCTION.md §4).
//   1. Regenerates the catalog.
//   2. Updates the drawing fingerprints (tests/fixtures/side-drawings.json) of EMBERBOUND characters only.
//      If any other character's picture changed, it stops: that change was not intended.
//   3. Runs every node test.
//   4. Prints the review page of each EMBERBOUND character that changed.
//   使い方: node tools/eb-check.mjs  (npm run eb:check)
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, syncCatalog } from './sync-catalog.mjs';

const FIXTURE = path.join(ROOT, 'tests/fixtures/side-drawings.json');
const isEmberbound = id => id.startsWith('eb-');

await syncCatalog();
// Import after regenerating, so the catalog includes new characters.
const { catalog } = await import(pathToFileURL(path.join(ROOT, 'characters/catalog.js')).href);
const { sideDrawingHash } = await import(pathToFileURL(path.join(ROOT, 'tests/node/lib/drawing-hash.mjs')).href);
const previous = JSON.parse(await readFile(FIXTURE, 'utf8'));
const next = {}, changed = [], unexpected = [];
for (const entry of catalog) {
  const hash = sideDrawingHash(entry.definition);
  if (previous[entry.id] === hash) { next[entry.id] = hash; continue; }
  if (isEmberbound(entry.id)) { next[entry.id] = hash; changed.push(entry.id); }
  else { next[entry.id] = previous[entry.id]; unexpected.push(entry.id); }
}
if (unexpected.length) {
  console.error(`EMBERBOUND 以外のキャラクターの絵が変わっています: ${unexpected.join(', ')}\n意図した変更なら npm run drawings:update を実行してください。`);
  process.exit(1);
}
await writeFile(FIXTURE, JSON.stringify(next, null, 2) + '\n');
console.log(changed.length ? `指紋を更新: ${changed.join(', ')}` : '絵の指紋: 変更なし');

// Node expands the pattern itself (as npm test does).
const test = spawnSync(process.execPath, ['--test', 'tests/node/*.test.mjs'], { cwd: ROOT, encoding: 'utf8' });
const summary = (test.stdout + test.stderr).split('\n').filter(l => /^ℹ (tests|pass|fail) |^✖ /.test(l));
console.log(summary.join('\n'));
if (test.status !== 0) { console.error('テストが失敗しました。npm test で詳細を確認してください。'); process.exitCode = 1; }
for (const id of changed) console.log(`確認ページ: tests/browser/eb-review.html?id=${id}`);
