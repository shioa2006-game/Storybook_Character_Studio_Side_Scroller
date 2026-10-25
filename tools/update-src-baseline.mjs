// Inkstone — 共通ライブラリ src/ のハッシュ基準 (tests/fixtures/src-baseline.json) を作り直す。
//   src/ を意図して変更したときだけ実行する。基準は src/ の全ファイルを対象にし、
//   tests/node/tools.test.mjs がこの基準と照合して、意図しない変更を検出する。
//   改行コード (CRLF / LF) もハッシュに含まれるので、変更したファイルの改行を保ってから実行する。
//   使い方: node tools/update-src-baseline.mjs  (npm run baseline:update)
import { access, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleFiles } from './lib/module-files.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BASELINE = path.join(ROOT, 'tests/fixtures/src-baseline.json');

const previous = JSON.parse(await readFile(BASELINE, 'utf8'));
// Every module reachable from the public entry points, plus files already listed that still exist.
const reachable = await moduleFiles(ROOT, ['src/index.js', 'src/authoring.js'], ['src']);
const exists = p => access(path.join(ROOT, p)).then(() => true, () => false);
const kept = [];
for (const e of previous) if (await exists(e.Path)) kept.push(e.Path);
const removed = previous.map(e => e.Path).filter(p => !kept.includes(p));
const paths = [...new Set([...kept, ...reachable])];
const entries = [];
for (const p of paths) {
  const hash = createHash('sha256').update(await readFile(path.join(ROOT, p))).digest('hex').toUpperCase();
  entries.push({ Path: p, Hash: hash });
}
const changed = entries.filter(e => previous.find(o => o.Path === e.Path)?.Hash !== e.Hash).map(e => e.Path);
// Keep the existing file format: two-space JSON with CRLF line endings.
await writeFile(BASELINE, JSON.stringify(entries, null, 2).replace(/\n/g, '\r\n') + '\r\n');
console.log(changed.length || removed.length ? [changed.length && `基準を更新: ${changed.join(', ')}`, removed.length && `基準から削除: ${removed.join(', ')}`].filter(Boolean).join('\n') : '変更なし');
