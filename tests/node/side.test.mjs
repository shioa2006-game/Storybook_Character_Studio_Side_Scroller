import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRS, SIDE_DIR_ORDER, SIDE_VIEW_ANGLE, SIDE_CHEST_TURN, bodyLayerKey, footProj, rigFrame, walkFeet, WALK_HZ } from '../../src/characters/rig.js';
import { SIDE_DIRECTIONS, sideWalkSecondsPerPixel } from '../../src/index.js';
import { createFrameCacheStore } from '../../src/rendering/cache.js';
import { catalog } from '../../characters/catalog.js';

test('side directions face screen right / left without mirroring the body', () => {
  assert.deepEqual(SIDE_DIR_ORDER, ['R', 'L']);
  assert.deepEqual(Object.keys(SIDE_DIRECTIONS), SIDE_DIR_ORDER);
  for (const key of SIDE_DIR_ORDER) {
    const rf = rigFrame(key, [0, 0, 0]), sign = SIDE_DIRECTIONS[key].sign;
    const ahead = rf.W(10, 0, 0), left = rf.W(0, 10, 0);
    assert.equal(Math.hypot(...DIRS[key].f).toFixed(9), '1.000000000');
    assert.equal(rf.sx, sign);
    // Forward is horizontal up to the small viewer tilt; the heads keep their front (3/4) art.
    assert.ok(Math.abs(ahead.x - sign * 10 * Math.cos(SIDE_VIEW_ANGLE)) < 1e-9);
    // Right-facing shows the right side nearest; left-facing shows the left side nearest.
    assert.equal(left.d > 0, key === 'L');
  }
});

test('side views turn only the upper body toward the camera', () => {
  for (const key of SIDE_DIR_ORDER) {
    const rf = rigFrame(key, [0, 0, 0]);
    // The torso is drawn as a card across b: turned 25° + 20°, it shows the width it was drawn for (seen at 45°).
    const width = f => Math.abs(f(0, 10, 0).x - f(0, -10, 0).x);
    assert.equal(SIDE_VIEW_ANGLE + SIDE_CHEST_TURN, Math.PI / 4);
    assert.ok(Math.abs(width(rf.U) - 20 * Math.SQRT1_2) < 1e-9, key);
    assert.ok(Math.abs(width(rf.W) - 20 * Math.sin(SIDE_VIEW_ANGLE)) < 1e-9, key);
    assert.equal(Math.sign(rf.turn), SIDE_DIRECTIONS[key].sign);
    // A point on the turned chest sorts in the same torso layer as its leg-frame counterpart.
    const chest = rf.U(10, 0, 30), key0 = bodyLayerKey(rf, 10, 0, 30);
    assert.ok(Math.abs(key0 % 1000 - chest.d) < 1e-9, key);
  }
});

test('side walk speed keeps the planted foot fixed on the ground', () => {
  for (const scale of [1, 1.25]) {
    const secondsPerPixel = sideWalkSecondsPerPixel(scale);
    for (const key of SIDE_DIR_ORDER) {
      const sign = SIDE_DIRECTIONS[key].sign;
      // Left foot is planted for cycle phases 0.25..0.75 (linear stance).
      const t0 = 0.35 / WALK_HZ, t1 = 0.6 / WALK_HZ;
      const x = t => { const f = walkFeet(t).footL; return footProj(DIRS[key], f[0], f[1], f[2]).x * scale; };
      const footSpeed = (x(t1) - x(t0)) / (t1 - t0);   // screen px per animation second, relative to the body
      assert.ok(Math.abs(footSpeed * secondsPerPixel + sign) < 1e-9, `${key} ${scale}`);
    }
  }
});

test('catalog and side caches use the two side directions', () => {
  for (const entry of catalog) {
    assert.deepEqual(entry.directions, entry.definition.directional === false ? [] : ['R', 'L'], entry.id);
    if (entry.directions.length) assert.equal(entry.preview.direction, 'R', entry.id);
  }
  assert.deepEqual(createFrameCacheStore().directions, ['R', 'L']);
});
