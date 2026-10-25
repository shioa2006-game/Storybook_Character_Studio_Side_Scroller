import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalog } from '../../characters/catalog.js';
import { recordingContext, sideDrawingHash } from './lib/drawing-hash.mjs';

const expected = JSON.parse(await readFile(new URL('../fixtures/side-drawings.json', import.meta.url), 'utf8'));

test('every character draws exactly the recorded right / left pictures (npm run drawings:update after intended art changes)', () => {
  assert.deepEqual(Object.keys(expected).sort(), catalog.map(c => c.id).sort());
  const changed = catalog.filter(c => sideDrawingHash(c.definition) !== expected[c.id]).map(c => c.id);
  assert.deepEqual(changed, []);
});

test('the fingerprint notices a one-pixel change (negative control)', () => {
  const warrior = catalog.find(c => c.id === 'warrior').definition;
  const shifted = { ...warrior, draw: (ctx, x, ...rest) => warrior.draw(ctx, x + 1, ...rest) };
  assert.notEqual(sideDrawingHash(shifted), expected.warrior);
  const log = [];
  recordingContext(log).lineTo(1, 2);
  assert.deepEqual(log, ['lineTo(1.0000,2.0000)']);
});
