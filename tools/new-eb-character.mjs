// EMBERBOUND — start a new character from an existing one (plan/EMBERBOUND_PRODUCTION.md §1).
//   Copies the base character's file into characters/eb-<game id>/character.js, renames it, writes the
//   `emberbound` metadata and the Studio entry, registers it in the catalog, and copies its weapon entry
//   in tests/node/lib/clearance.mjs when the base has one. Then edit the new file.
//   使い方: node tools/new-eb-character.mjs --game oracle --from eb-arcanist --name "Oracle（暁の巫女）"
//           --height 25 [--facing R] [--category "EMBERBOUND 味方"] [--description "…"]
//   --from は characters/ のフォルダ名 (例 warrior, eb-arcanist)。
import { copyFile, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, syncCatalog } from './sync-catalog.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((out, a, i, all) => a.startsWith('--') ? [...out, [a.slice(2), all[i + 1]]] : out, []));
const usage = '使い方: node tools/new-eb-character.mjs --game <ゲーム ID> --from <元のフォルダ> --name <表示名> --height <ゲームの高さ px> [--facing R|L] [--category <カテゴリー>] [--description <説明>]';
for (const k of ['game', 'from', 'name', 'height']) if (!args[k]) { console.error(usage); process.exit(1); }
const id = `eb-${args.game.replace(/_/g, '-')}`;
const facing = args.facing || 'R', category = args.category || 'EMBERBOUND 味方';
const description = args.description || `EMBERBOUND EXPEDITION の ${args.game}。`;
const source = path.join(ROOT, 'characters', args.from, 'character.js');
const target = path.join(ROOT, 'characters', id, 'character.js');
if (await access(target).then(() => true, () => false)) { console.error(`すでにあります: characters/${id}/character.js`); process.exit(1); }

const base = await import(pathToFileURL(source).href);
const fromId = base.character.id;
await mkdir(path.dirname(target), { recursive: true });
await copyFile(source, target);

const raw = await readFile(target, 'utf8'), crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
// The base id inside strings (definition id, seeds such as 'goblin-…', render prefixes) becomes the new id.
// Code names that contain it (goblinPose) are left alone.
s = s.replace(new RegExp(`(['"\`])${fromId}(?=['"\`-])`, 'g'), `$1${id}`);
s = s.replace(/label:\s*(['"])[^'"]*\1/, `label:'${args.game} — EMBERBOUND'`);
const meta = `emberbound:{gameId:'${args.game}',heightPx:${Number(args.height)},facing:'${facing}'}`;
s = /emberbound:\s*\{[^}]*\}/.test(s) ? s.replace(/emberbound:\s*\{[^}]*\}/, meta) : s.replace(/(equipment:\s*\{[^}]*\},?)/, `$1\n  ${meta},`);
const studio = `export const studio=Object.freeze({name:${JSON.stringify(args.name)},category:${JSON.stringify(category)},\n  description:${JSON.stringify(description)},\n  preview:{direction:'${facing}',phase:0}});\n`;
const at = s.search(/export const studio\s*=/);
s = at >= 0 ? s.slice(0, at) + studio : s + '\n' + studio;
await writeFile(target, crlf ? s.replace(/\n/g, '\r\n') : s);

// Weapon clearance entry: copy the base's single-line entry, if it has one.
const clearance = path.join(ROOT, 'tests/node/lib/clearance.mjs');
const lib = await readFile(clearance, 'utf8');
const line = lib.split('\n').find(l => new RegExp(`^\\s*'?${fromId}'?: \\{.*\\] \\},\\s*$`).test(l));
if (line && !lib.includes(`'${id}':`)) {
  await writeFile(clearance, lib.replace(line, `${line}\n${line.replace(new RegExp(`'?${fromId}'?:`), `'${id}':`)}`));
  console.log(`武器の検査に追加: '${id}' (${fromId} と同じ読み方。武器を変えたら直す)`);
} else if (base.character.equipment && !line) console.log(`注意: ${fromId} の武器の検査は1行の形ではないため、tests/node/lib/clearance.mjs の ARMED に手で追加してください。`);

await syncCatalog();
console.log(`作成: characters/${id}/character.js (元: ${fromId})`);
console.log(`次: 見た目と動作を直す → npm run eb:check → tests/browser/eb-review.html?id=${id}`);
