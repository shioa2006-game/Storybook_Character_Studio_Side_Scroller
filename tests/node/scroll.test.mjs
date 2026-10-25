import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollGame, scrollStage, CHARACTER_SCALE } from '../../scroll/game.js';
import { bindScrollControls } from '../../scroll/controls.js';
import { normalizeStage, sideWalkSecondsPerPixel, STAGE_DEFAULTS } from '../../src/index.js';
import { createSideCamera, followCamera, centerCamera, viewWidth, sideWorldToScreen, sideScreenToWorld } from '../../src/side/camera.js';
import { visibleChunks } from '../../src/side/background.js';
import { catalog, findCharacter } from '../../characters/catalog.js';

const advance = (game, seconds, step = 1 / 60) => {
  for (let left = seconds; left > 1e-9; left -= step) game.update(Math.min(left, step));
};
const warrior = findCharacter('warrior').definition, archer = findCharacter('archer').definition;

test('stage data fills defaults and rejects impossible ranges', () => {
  assert.deepEqual(normalizeStage({}), { ...STAGE_DEFAULTS });
  assert.throws(() => normalizeStage({ length: 100 }), /length/);
  assert.throws(() => normalizeStage({ length: 1000, start: 10 }), /start/);
  assert.throws(() => normalizeStage({ length: 1000, margin: 600 }), /margin/);
});

test('camera follows outside the central dead zone and stops at the stage ends', () => {
  const cam = createSideCamera({ width: 960, height: 540 }), length = 3200, w = viewWidth(cam);
  centerCamera(cam, 1600, length);
  assert.equal(cam.x, 1600 - w / 2);
  const x0 = cam.x;
  followCamera(cam, 1600 + w * .1, length); assert.equal(cam.x, x0);   // inside the dead zone
  followCamera(cam, 1600 + w * .3, length); assert.ok(cam.x > x0);     // pushed by the target
  centerCamera(cam, 10, length); assert.equal(cam.x, 0);
  centerCamera(cam, length - 10, length); assert.equal(cam.x, length - w);
  const p = sideWorldToScreen(cam, 2000, -30), q = sideScreenToWorld(cam, p.x, p.y);
  assert.ok(Math.abs(q.x - 2000) < 1e-9 && Math.abs(q.y + 30) < 1e-9);
});

test('background chunks cover the whole screen with integer device offsets', () => {
  for (const dpr of [1, 1.25, 2]) for (const parallax of [.3, .6, 1]) for (const x of [0, 137.4, 2047.9]) {
    const cam = createSideCamera({ width: 987, height: 520, dpr }); cam.x = x;
    const { first, last, offset, wd } = visibleChunks(cam, parallax);
    assert.ok(Number.isInteger(offset) && Number.isInteger(wd));
    assert.ok(first * wd - offset <= 0, 'left edge covered');
    assert.ok((last + 1) * wd - offset >= cam.width * dpr, 'right edge covered');
  }
});

test('holding a direction walks, faces, and advances the walk by distance (no foot slide)', () => {
  const game = createScrollGame({ character: warrior, speed: 90 });
  assert.equal(game.unit.x, scrollStage.start);
  game.setMove(1); advance(game, 1);
  assert.ok(Math.abs(game.unit.x - (scrollStage.start + 90)) < 1e-6);
  assert.equal(game.unit.direction, 'R'); assert.equal(game.unit.action, 'walk');
  assert.ok(Math.abs(game.unit.actionTime - 90 * sideWalkSecondsPerPixel(CHARACTER_SCALE)) < 1e-9);
  game.setMove(-1); advance(game, .5);
  assert.equal(game.unit.direction, 'L');
  game.setMove(0); advance(game, .1);
  assert.equal(game.unit.action, 'idle');
});

test('the stage ends stop the walker', () => {
  const game = createScrollGame({ character: warrior });
  game.setMove(-1); advance(game, 10);
  assert.equal(game.unit.x, scrollStage.margin); assert.equal(game.unit.action, 'idle'); assert.match(game.status, /端/);
  game.setMove(1); advance(game, 60);
  assert.equal(game.unit.x, scrollStage.length - scrollStage.margin);
});

test('attacks play in place for their own period, then walking resumes if still held', () => {
  for (const entry of catalog) {
    const game = createScrollGame({ character: entry.definition }), spec = entry.definition.actions.attack;
    if (!spec) { assert.equal(game.attack(), false); continue; }
    assert.equal(game.attack(), true);
    const x = game.unit.x; game.setMove(1);
    advance(game, spec.period - .02);
    assert.equal(game.unit.action, 'attack', entry.id); assert.equal(game.unit.x, x, entry.id);
    advance(game, .1);
    // Characters without a walk (EMBERBOUND enemies) move in their idle pose.
    assert.equal(game.unit.action, entry.definition.actions.walk ? 'walk' : 'idle', entry.id); assert.ok(game.unit.x > x, entry.id);
  }
});

test('archers release one arrow at the release phase; it flies along the facing and expires', () => {
  const game = createScrollGame({ character: archer, arrowSpeed: 400, arrowRange: 200 }), spec = archer.actions.attack;
  game.attack();
  advance(game, spec.period * archer.projectile.releaseAt - .02, 1 / 120);
  assert.equal(game.projectiles.length, 0);
  advance(game, .04, 1 / 120);
  assert.equal(game.projectiles.length, 1);
  const [arrow] = game.projectiles;
  assert.equal(arrow.direction, 'R'); assert.equal(arrow.character, 'archer');
  advance(game, .25);
  assert.ok(Math.abs(game.projectiles[0].distance - (arrow.distance + 100)) < 1e-6);
  advance(game, .5);
  assert.equal(game.projectiles.length, 0, 'gone after its range');
  game.setCharacter(warrior); assert.equal(game.projectiles.length, 0);
});

test('scroll controls: latest held direction wins, Space attacks once per press, blur stops', () => {
  const win = new EventTarget(), canvas = new EventTarget();
  canvas.ownerDocument = { defaultView: win };
  canvas.hasAttribute = () => false;
  const moves = []; let attacks = 0;
  const game = { setMove: m => moves.push(m), attack: () => attacks++ };
  const control = bindScrollControls(canvas, game);
  const key = (code, type = 'keydown', repeat = false) => {
    const event = new Event(type, { cancelable: true }); Object.assign(event, { code, repeat }); win.dispatchEvent(event);
  };
  key('ArrowRight'); key('KeyA'); key('KeyA', 'keydown', true);
  assert.deepEqual(moves, [1, -1]);
  key('KeyA', 'keyup'); assert.equal(moves.at(-1), 1);
  key('ArrowRight', 'keyup'); assert.equal(moves.at(-1), 0);
  key('Space'); key('Space', 'keydown', true); assert.equal(attacks, 1);
  key('KeyD'); win.dispatchEvent(new Event('blur')); assert.equal(moves.at(-1), 0);
  control.dispose(); const n = moves.length; key('KeyD'); assert.equal(moves.length, n);
});
