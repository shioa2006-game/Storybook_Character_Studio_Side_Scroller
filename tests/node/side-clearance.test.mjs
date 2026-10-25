import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../../characters/catalog.js';
import { ARMED, sideProblems, weaponProblem } from './lib/clearance.mjs';

test('clearance check flags blades through the head, the torso and the floor (negative control)', () => {
  const head = ARMED.warrior.head, blade = (base, dir) => ({ name: 'sword', base, dir, from: 6, to: 41 });
  assert.match(weaponProblem(blade([10, 4, 50], [-.5, 0, .87]), head), /sword inside head/);
  assert.match(weaponProblem(blade([0, 8, 30], [1, 0, 0]), head), /grip inside torso/);
  assert.match(weaponProblem(blade([20, 20, 20], [.6, 0, -.8]), head), /below the floor/);
  assert.equal(weaponProblem(blade([-18, 10, 47], [-.9, 0, .45]), head), null);
  assert.equal(weaponProblem({ ...blade([20, 20, 20], [.6, 0, -.8]), floor: false }, head), null);
});

test('every armed character keeps grips and weapons out of the body and the floor in side views', () => {
  for (const id of Object.keys(ARMED)) {
    const entry = catalog.find(e => e.id === id);
    assert.ok(entry, `${id} is in the catalog`);
    const problems = sideProblems(entry.definition, 200);
    assert.deepEqual(problems.slice(0, 3).map(p => `${id} ${p.direction} ${p.action} ${p.phase.toFixed(3)}: ${p.problem}`), []);
  }
});
