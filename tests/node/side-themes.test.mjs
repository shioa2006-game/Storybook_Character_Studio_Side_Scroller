import test from 'node:test';
import assert from 'node:assert/strict';
import { SIDE_THEMES, normalizeStage } from '../../src/index.js';
import { periodicSpans, stageEnds, each } from '../../src/side/themes/pencil.js';
import { SCROLL_STAGES } from '../../scroll/game.js';

/**
 * A 2D context that only records where ink lands. It tracks the transform stack so every path point is in layer
 * coordinates (the bake transform is identity here), and keeps the stroked points and line widths. A clip narrows the
 * height range that ink can reach (hatching is drawn past its shape and clipped to it).
 */
function recorder() {
  let m = [1, 0, 0, 1, 0, 0], path = [];
  const stack = [], strokes = [], state = { lineWidth: 1, clip: [-Infinity, Infinity] };
  const apply = (x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const mul = (a, b, c, d, e, f) => { m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]; };
  const scale = () => Math.hypot(m[0], m[1]);
  const gradient = { addColorStop() {} };
  const api = {
    save() { stack.push([m, { ...state }]); },
    restore() { const s = stack.pop(); if (s) { m = s[0]; Object.assign(state, s[1]); } },
    translate(x, y) { mul(1, 0, 0, 1, x, y); },
    scale(x, y) { mul(x, 0, 0, y, 0, 0); },
    rotate(a) { mul(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0); },
    transform(a, b, c, d, e, f) { mul(a, b, c, d, e, f); },
    setTransform(a, b, c, d, e, f) { m = [a, b, c, d, e, f]; },
    beginPath() { path = []; },
    moveTo(x, y) { path.push(apply(x, y)); },
    lineTo(x, y) { path.push(apply(x, y)); },
    quadraticCurveTo(cx, cy, x, y) { path.push(apply(cx, cy), apply(x, y)); },
    bezierCurveTo(a, b, c, d, x, y) { path.push(apply(a, b), apply(c, d), apply(x, y)); },
    arc(x, y, r) { path.push(apply(x - r, y - r), apply(x + r, y + r)); },
    ellipse(x, y, rx, ry) { path.push(apply(x - rx, y - ry), apply(x + rx, y + ry)); },
    rect(x, y, w, h) { path.push(apply(x, y), apply(x + w, y + h)); },
    clip() { const ys = path.map(p => p.y); state.clip = [Math.max(state.clip[0], Math.min(...ys)), Math.min(state.clip[1], Math.max(...ys))]; },
    stroke() { const [a, b] = state.clip; strokes.push({ points: path.filter(p => p.y >= a && p.y <= b), width: state.lineWidth * scale() }); },
    createLinearGradient: () => gradient, createRadialGradient: () => gradient, createPattern: () => null,
    setLineDash() {}, getLineDash: () => [], measureText: () => ({ width: 0 }),
  };
  const g = new Proxy(state, {
    get: (t, k) => (k in api ? api[k] : k in t ? t[k] : () => undefined),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { g, strokes };
}

const stage = normalizeStage({ ...SCROLL_STAGES.dungeon, theme: 'dungeon' });
const VIEW = { top: -360 * .74, bottom: 360 * .26 };   // the camera's world-y range at the reference height
const themes = Object.entries(SIDE_THEMES).filter(([key]) => key !== 'placeholder');

function drawChunk(layer, x0, x1) {
  const r = recorder();
  layer.draw(r.g, { x0, x1, top: VIEW.top, bottom: VIEW.bottom, stage, parallax: layer.parallax });
  return r.strokes;
}

test('every scroll location has a registered pencil theme with a well-formed layer list', () => {
  for (const key of ['dungeon', 'forest', 'town']) {
    assert.equal(SCROLL_STAGES[key].theme, key);
    assert.equal(SIDE_THEMES[key].id, key);
  }
  for (const [key, theme] of Object.entries(SIDE_THEMES)) {
    assert.ok(Object.isFrozen(theme.layers), key);
    assert.equal(new Set(theme.layers.map(l => l.id)).size, theme.layers.length, `${key}: layer ids are unique`);
    for (const layer of theme.layers) {
      const where = `${key}/${layer.id}`;
      assert.ok(layer.parallax > 0 && typeof layer.draw === 'function', where);
      if (layer.band) {
        assert.equal(layer.band.length, 2, where);
        const [a, b] = layer.band;
        assert.ok(a === null || b === null || a < b, `${where}: band top is above its bottom`);
        assert.ok(b === null || b > VIEW.top, `${where}: band reaches the screen`);
      }
      if (layer.spans) for (const [a, b] of layer.spans(stage)) assert.ok(a < b, where);
    }
  }
});

test('stage ends reach just inside the stage, and periodic spans cover every repeat', () => {
  const [[l0, l1], [r0, r1]] = stageEnds(stage);
  assert.ok(l0 < 0 && l1 > 0 && l1 < stage.margin, 'left wall shows at the screen edge, outside the walkable range');
  assert.ok(r0 > stage.length - stage.margin && r0 < stage.length && r1 > stage.length);
  const spans = periodicSpans(stage, 1.3, 1500, [[900, 40, 40]]);
  for (let x = 0; x <= stage.length * 1.3; x += 1500) assert.ok(spans.some(([a, b]) => a <= x + 900 && b >= x + 900), `repeat at ${x}`);
  const hits = [];
  each({ x0: 1000, x1: 2000 }, 500, 0, (n, x) => hits.push([n, x]), 100);
  assert.deepEqual(hits, [[1, 600], [2, 1100], [3, 1600]]);
});

test('theme layers draw the same ink every time a chunk is baked', () => {
  for (const [key, theme] of themes) for (const layer of theme.layers) {
    const x0 = layer.id === 'ends' ? -256 : 1024, a = drawChunk(layer, x0, x0 + 512), b = drawChunk(layer, x0, x0 + 512);
    assert.ok(a.length > 0, `${key}/${layer.id} draws ink`);
    assert.deepEqual(a, b, `${key}/${layer.id} is seeded per element`);
  }
});

test('ink lines stay inside each layer band (a band would cut them off)', () => {
  const failures = [];
  for (const [key, theme] of themes) for (const layer of theme.layers) {
    if (!layer.band) continue;
    const [top, bottom] = layer.band, bad = [];
    for (let x0 = 0; x0 < stage.length * layer.parallax; x0 += 512) {
      for (const s of drawChunk(layer, x0, x0 + 512)) for (const p of s.points) {
        const pad = s.width / 2 + 1;
        if ((top !== null && p.y < top - pad && p.y > VIEW.top) || (bottom !== null && p.y > bottom + pad && p.y < VIEW.bottom)) bad.push(Math.round(p.y));
      }
    }
    if (bad.length) failures.push(`${key}/${layer.id} band [${top}, ${bottom}]: ink at y ${Math.min(...bad)}..${Math.max(...bad)}`);
  }
  assert.deepEqual(failures, []);
});
