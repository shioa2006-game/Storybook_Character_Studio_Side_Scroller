// Inkstone — 全キャラクターの横向き (R / L) の絵の指紋 (tests/fixtures/side-drawings.json) を作り直す。
//   絵を意図して変えたときだけ実行する。tests/node/side-drawings.test.mjs がこの指紋と照合し、
//   共通リグやキャラクターのコードを整理したときに、絵が1本の線も変わっていないことを確かめる。
//   使い方: node tools/update-side-drawings.mjs  (npm run drawings:update)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../characters/catalog.js';
import { sideDrawingHash } from '../tests/node/lib/drawing-hash.mjs';

const FIXTURE = path.join(fileURLToPath(new URL('../', import.meta.url)), 'tests/fixtures/side-drawings.json');
const previous = await readFile(FIXTURE, 'utf8').then(JSON.parse, () => ({}));
const next = Object.fromEntries(catalog.map(c => [c.id, sideDrawingHash(c.definition)]));
const changed = Object.keys(next).filter(id => previous[id] !== next[id]);
await writeFile(FIXTURE, JSON.stringify(next, null, 2) + '\n');
console.log(changed.length ? `指紋を更新: ${changed.join(', ')}` : '変更なし');
