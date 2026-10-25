import test from 'node:test';
import assert from 'node:assert/strict';
import { warrior } from '../../characters/warrior/character.js';

// Canvas stand-in: drawWarriorRig returns its pose; every drawing call is ignored.
const noop = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });

// Body volumes in upper-body (UY) coordinates: breastplate as an elliptic cylinder,
// helmet as a sphere (the helmet art is drawn at 0.9 scale). A 1px margin allows grazing.
const TORSO = { A: 10, B: 17, z0: 14, z1: 48 }, HEAD = { a: 1.5, z: 66, r: 18 }, MARGIN = 1;
function collision({ hand, dir }) {
  const inside = ([a, b, z]) =>
    (z > TORSO.z0 && z < TORSO.z1 && (a / (TORSO.A - MARGIN)) ** 2 + (b / (TORSO.B - MARGIN)) ** 2 < 1) ? 'torso'
      : Math.hypot(a - HEAD.a, b, z - HEAD.z) < HEAD.r - MARGIN ? 'head' : null;
  const atHand = inside(hand);
  if (atHand) return `hand inside ${atHand}`;
  for (let s = 6; s <= 41; s += 2.5) {   // blade only: from just past the crossguard to the tip
    const hit = inside(hand.map((v, k) => v + dir[k] * s));
    if (hit) return `blade inside ${hit} at ${s}`;
  }
  if (hand[2] + dir[2] * 41 < -MARGIN) return 'tip below the floor';
  return null;
}

test('clearance check flags a blade through the head (negative control)', () => {
  assert.match(collision({ hand: [10, 4, 50], dir: [-.5, 0, .87] }), /blade inside head/);
  assert.match(collision({ hand: [0, 8, 30], dir: [1, 0, 0] }), /torso/);
  assert.equal(collision({ hand: [-18, 10, 47], dir: [-.9, 0, .45] }), null);
});

test('side-view sword never passes through the body or the floor', () => {
  for (const direction of ['R', 'L']) for (const [action, spec] of Object.entries(warrior.actions)) {
    for (let i = 0; i <= 400; i++) {
      const u = i / 400, info = warrior.draw(noop, 0, 0, direction, action, u * spec.period, 1, {});
      const samples = [info.pose.sword, ...(info.pose.trail?.samples ?? [])];
      for (const sword of samples) {
        const problem = collision(sword);
        assert.equal(problem, null, `${direction} ${action} phase ${u.toFixed(3)}: ${problem}`);
      }
    }
  }
});
