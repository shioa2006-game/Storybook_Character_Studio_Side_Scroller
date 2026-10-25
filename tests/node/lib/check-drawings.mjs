// Quick check while refactoring: node tests/node/lib/check-drawings.mjs [id ...]
// Compares each character's right / left drawing with tests/fixtures/side-drawings.json.
import { readFile } from 'node:fs/promises';
import { catalog } from '../../../characters/catalog.js';
import { sideDrawingHash } from './drawing-hash.mjs';

const expected = JSON.parse(await readFile(new URL('../../fixtures/side-drawings.json', import.meta.url), 'utf8'));
const ids = process.argv.slice(2);
let changed = 0;
for (const c of catalog.filter(c => !ids.length || ids.includes(c.id))) {
  const same = sideDrawingHash(c.definition) === expected[c.id];
  if (!same) changed++;
  console.log(`${same ? 'same   ' : 'CHANGED'} ${c.id}`);
}
process.exitCode = changed ? 1 : 0;
