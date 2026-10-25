/**
 * EMBERBOUND EXPEDITION — Ice Wraith (game id `ice_wraith`), a new floating ghost after the user's reference
 * image: a hood and long robe of pale icy cloth, darkening to blue toward the torn, dripping hems that stream out
 * behind it; a white mask with dark hollow eyes and mouth inside the hood; wide ragged sleeves reaching forward.
 * It has no legs; the hem floats a little above the ground.
 * Actions (plan/EMBERBOUND_PRODUCTION.md): idle (floating, the hems rippling), attack (a short lunge, the sleeves
 * raking forward; contact at 0.15 s), `cast` = Blizzard, the wind-up the game loops (sleeves raised, snow
 * swirling round it), and the shared hurt.
 */
import { TAU, PAL } from '../../src/authoring.js';
import { hurtAction, phase, sample, fallTilt } from '../shared/emberbound/actions.js';
import { face, blob, disc, line, drawCreature } from '../shared/emberbound/creature.js';

const C = { cloth: '#e3ecf4', clothMid: '#b7cbe0', clothDark: '#6f8fb3', inner: '#3e5573', mask: '#edf2f6', hole: '#283346', snow: '#f4f8fc', ink: PAL.ink };
const IDLE_T = 2.4;
export const WRAITH_ATTACK_T = .3;    // lunge: the sleeves rake through at u = .5
export const WRAITH_BLIZZARD_T = .6;  // Blizzard wind-up: a loop

export function wraithPose(action, t) {
  const s = Math.sin(TAU * phase(t, IDLE_T));
  const P = { bob: s * 3, wave: t, shift: 0, reach: 0, raise: 0, lean: 0, snow: -1 };
  if (action === 'attack') {
    const u = phase(t, WRAITH_ATTACK_T);
    P.shift = sample([[0, [0]], [.25, [-5]], [.5, [14]], [.7, [11]], [1, [0]]], u);
    P.reach = sample([[0, [0]], [.25, [-6]], [.5, [12]], [.7, [9]], [1, [0]]], u);
    P.raise = sample([[0, [0]], [.25, [10]], [.5, [-4]], [1, [0]]], u);
    P.lean = sample([[0, [0]], [.5, [4]], [1, [0]]], u);
  } else if (action === 'cast') {
    // Blizzard: both sleeves raised, the body swaying, snow circling; periodic in u.
    const u = phase(t, WRAITH_BLIZZARD_T), w = Math.sin(TAU * u);
    P.raise = 22 + w * 2; P.reach = -2; P.bob = w * 2; P.snow = u;
  }
  return P;
}

/**
 * A hanging strip of torn cloth: from a base of width `w` at (x, y), it falls along angle `a` for `len`,
 * swaying (phase `ph`) and narrowing to a curled point.
 */
function strip(x, y, a, len, w, ph) {
  const L = [], R = [], n = 6;
  for (let i = 0; i <= n; i++) {
    const u = i / n, sway = Math.sin(ph + u * 3) * 4 * u, c = Math.cos(a), s2 = Math.sin(a);
    const px = x + c * len * u - s2 * sway, py = y + s2 * len * u + c * sway, hw = w / 2 * (1 - u * .85);
    L.push([px - s2 * hw, py + c * hw]); R.push([px + s2 * hw, py - c * hw]);
  }
  const tip = L[n], curl = [tip[0] + Math.cos(a + 1.2) * 3, tip[1] + Math.sin(a + 1.2) * 3];
  return [...L, curl, ...R.reverse()];
}

export function drawWraith(ctx, x, y, direction, action, t, scale = 1, opts = {}) {
  const P = wraithPose(action, t), f = face(direction), sx = P.shift, by = -P.bob, wv = Math.sin(P.wave * 2) * 3;
  const U = ([px, py]) => [px + sx + P.lean * Math.max(0, -py - 30) / 60, py + by];
  const parts = [];
  // A wide bell sleeve from the shoulder reaching forward (raised by P.raise): it widens and droops toward the
  // open end, which hangs in torn strips.
  const sleeve = (sh, near) => {
    const k = near ? 1 : .85, cx = sh[0] + (30 + P.reach) * k, cy = sh[1] + 6 - P.raise, col = near ? C.cloth : C.clothMid;
    for (const [dx, len, ph] of [[-8, 16, 0], [-2, 20, 1.3], [4, 15, 2.1]]) blob(ctx, f, strip(cx + dx, cy + 10, 1.85, len, 7, P.wave * 2 + ph + (near ? 0 : 1)).map(U), C.clothDark, { w: 1.2, depth: .6, speck: .3 });
    blob(ctx, f, [sh, [sh[0] + 12, sh[1] - 4], [cx - 2, cy - 7], [cx + 4, cy - 4], [cx + 6, cy + 6], [cx - 4, cy + 13], [cx - 14, cy + 12], [sh[0] + 2, sh[1] + 14]].map(U), col, { w: 1.7, depth: 1.8, speck: .7 });
    blob(ctx, f, [[cx + 4, cy - 4], [cx + 6, cy + 6], [cx - 4, cy + 13], [cx - 2, cy + 2]].map(U), C.inner, { w: 1, depth: 0, speck: 0 });
    line(ctx, f, [U([sh[0] + 8, sh[1] + 4]), U([cx - 8, cy + 2])], .55);
  };
  parts.push({ id: 'farSleeve', d: -6, draw: () => sleeve([-2, -58], false) });
  parts.push({ id: 'robe', d: -2, draw: () => {
    // The robe falls from the shoulders and streams down and back; its lower edge is torn into tongues, longer
    // toward the back, that are part of the same cloth (one outline) and darken to blue toward their tips.
    const F = [22, -34], B = [-60, -22], n = 6, lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const tongues = [];
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n, p0 = lerp(F, B, i / n), p1 = lerp(F, B, (i + 1) / n), m = lerp(p0, p1, .5);
      const a = 1.8 + u * .8, len = 14 + u * 22 + 5 * Math.sin(i * 2.3) ** 2, sw = Math.sin(P.wave * 2 + i * .9) * 4;
      const d = [Math.cos(a), Math.sin(a)], q = [-d[1], d[0]], tip = [m[0] + d[0] * len + q[0] * sw, m[1] + d[1] * len + q[1] * sw];
      const curl = [tip[0] + Math.cos(a + 1.3) * 4, tip[1] + Math.sin(a + 1.3) * 4];
      const mA = lerp(p0, tip, .5), mB = lerp(p1, tip, .5);
      tongues.push({ p0, p1, tip, curl, mA: [mA[0] + q[0] * sw * .4, mA[1] + q[1] * sw * .4], mB: [mB[0] + q[0] * sw * .4, mB[1] + q[1] * sw * .4] });
    }
    const hem = tongues.flatMap(g => [g.p0, g.mA, g.tip, g.curl, g.mB]);
    const robe = [[14, -62], [22, -50], [24, -40], ...hem, B, [-72, -34 + wv], [-52, -46], [-30, -56], [-8, -64]];
    blob(ctx, f, robe.map(U), C.cloth, { w: 2, depth: 3, light: .25, speck: 1.2 });
    blob(ctx, f, [[22, -44], F, ...hem, B, [-64, -36 + wv], [-36, -42], [-8, -46]].map(U), C.clothMid, { w: 0, depth: .8, speck: .6 });
    for (const g of tongues) blob(ctx, f, [lerp(g.p0, g.tip, .45), g.mA, g.tip, g.curl, g.mB, lerp(g.p1, g.tip, .45)].map(U), C.clothDark, { w: 0, depth: .4, speck: .4 });
    for (const pts of [[[8, -54], [2, -42], [-2, -32]], [[-14, -56], [-24, -42], [-28, -28]], [[-38, -48], [-50, -36], [-54, -24]]]) line(ctx, f, pts.map(U), .6);
    for (const [hx, hy, r] of [[-28, -40, 2.2], [-50, -32, 1.7]]) disc(ctx, f, ...U([hx, hy]), r, r * 1.3, C.inner, { w: .6, depth: 0, speck: 0 });
  } });
  parts.push({ id: 'hood', d: 4, draw: () => {
    // The hood, its tip trailing back in tatters, a dark opening and the white mask inside.
    blob(ctx, f, strip(-8, -88, -2.7, 34, 12, P.wave * 2).map(U), C.clothMid, { w: 1.5, depth: 1, speck: .5 });
    blob(ctx, f, [[-12, -64], [-16, -78], [-8, -90], [6, -96], [20, -90], [28, -76], [27, -62], [14, -54], [-2, -55]].map(U), C.cloth, { w: 2, depth: 2.4, speck: .8 });
    blob(ctx, f, [[6, -86], [20, -82], [25, -70], [22, -60], [10, -58], [4, -68]].map(U), C.inner, { w: 1.2, depth: 0, speck: 0 });
    blob(ctx, f, [[9, -82], [19, -79], [23, -69], [20, -61], [12, -60], [8, -70]].map(U), C.mask, { w: 1.3, depth: .8, speck: .2 });
    for (const [ex, ey] of [[13, -74], [20, -73]]) disc(ctx, f, ...U([ex, ey]), 1.8, 2.8, C.hole, { w: .5, depth: 0, speck: 0 });
    disc(ctx, f, ...U([17, -65]), 1.6, 2.4, C.hole, { w: .5, depth: 0, speck: 0 });
    line(ctx, f, [[-6, -60], [6, -58], [18, -56]].map(U), .7);
  } });
  parts.push({ id: 'nearSleeve', d: 8, draw: () => sleeve([4, -56], true) });
  parts.push({ id: 'snow', d: 12, draw: () => {
    if (P.snow < 0) return;
    // Snow and ice flakes swirling round it as the blizzard gathers (they cycle with the loop).
    for (let i = 0; i < 7; i++) {
      const u = (P.snow + i / 7) % 1, a = TAU * u + i, r = 34 + (i % 3) * 10, fx = Math.cos(a) * r - 10, fy = -50 + Math.sin(a) * r * .55 - u * 16;
      ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * u);
      for (let k = 0; k < 3; k++) { const b = k * Math.PI / 3; line(ctx, f, [[fx - Math.cos(b) * 4, fy - Math.sin(b) * 4], [fx + Math.cos(b) * 4, fy + Math.sin(b) * 4]], .6); }
      disc(ctx, f, fx, fy, 1.2, 1.2, C.snow, { w: 0, depth: 0, speck: 0 });
      ctx.restore();
    }
  } });
  drawCreature(ctx, x, y, f, scale, parts, 'eb-ice-wraith', fallTilt(action, t), { pivot: 30, toe: 30, shift: 0 });
  return { pose: P, order: parts.map(p => p.id) };
}

export const character = Object.freeze({
  id: 'eb-ice-wraith', label: 'Ice Wraith — EMBERBOUND', kind: 'creature', directional: true, draw: drawWraith,
  actions: { idle: { period: IDLE_T, frames: 12 },
    attack: { period: WRAITH_ATTACK_T, keys: [0, .12, .25, .38, .5, .6, .7, .85], once: true },
    cast: { period: WRAITH_BLIZZARD_T, frames: 8 },
    hurt: hurtAction },
  frameBox: { x0: -130, x1: 130, y0: -130, y1: 14 },
  emberbound: { gameId: 'ice_wraith', heightPx: 21, facing: 'L' },
});
export const studio = Object.freeze({ order: 26, name: 'Ice Wraith（氷の亡霊）', category: 'EMBERBOUND 第4エリア',
  description: '氷色の布のフードと長衣をまとって浮かぶ亡霊。白い仮面に暗い目と口の穴、裂けた裾。吹雪 Blizzard で全体を凍えさせる。',
  preview: { direction: 'L', phase: 0 } });
