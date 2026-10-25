/**
 * EMBERBOUND EXPEDITION — Coilscale Matriarch (game id `coilscale`, area 2 boss), a new serpent queen after the
 * user's reference image: a pale sea-green woman with long dark teal hair, pink finned ears and a gold crown
 * with a red gem, a deep blue dress with gold trim, a gold scale peplum, draped sleeves and gold bracelets with
 * red drops; below the waist a long blue-scaled serpent body with a cream belly, coiled in a ring on the
 * ground with the tail curling up behind, and a golden trident with a red gem. Shares the tail and arm parts
 * with the Siren (characters/shared/emberbound/merfolk.js).
 * Actions (plan/EMBERBOUND_PRODUCTION.md): idle (swaying), attack (a short push of the open hand that throws a
 * venom bolt, released at u = .15 — her poison attack on the back row), `cast` = the Crashing Wave wind-up the
 * game loops (trident raised, the coils rising, water swirling), and the shared hurt.
 */
import { TAU, PAL } from '../../src/authoring.js';
import { hurtAction, phase, sample, fallTilt } from '../shared/emberbound/actions.js';
import { face, blob, disc, line, limb, drawCreature } from '../shared/emberbound/creature.js';
import { tube, arm, eyes } from '../shared/emberbound/merfolk.js';

const C = { skin:'#a3c9c4', skinDark:'#84aca8', hair:'#2f5a66', hairDark:'#22434d', fin:'#e08a85', dress:'#3c6a8f', dressDark:'#2c4f6d',
  gold:'#d3ab55', goldDark:'#a07c34', gem:'#d6524c', scale:'#6f9fb7', scaleDark:'#55809a', belly:'#efe5c8',
  venom:'#8fc66a', venomDark:'#557f3c', water:'#86cfe0', waterLight:'#dcf4f6', ink:PAL.ink };
const IDLE_T = 3;
export const COIL_ATTACK_T = .3;   // the venom bolt leaves the hand at u = .15
export const COIL_WINDUP_T = .6;   // Crashing Wave wind-up: a loop

export function coilPose(action, t) {
  const s = Math.sin(TAU * phase(t, IDLE_T));
  const P = { lean: s * 2, lift: 0, near: [[26, -158], [40, -168]], trident: [-18, -128], tilt: .06, splay: 0, bolt: -1, swirl: -1, tail: s, t };
  if (action === 'attack') {
    const u = phase(t, COIL_ATTACK_T), k = sample([[0, [0]], [.1, [1]], [.45, [1]], [1, [0]]], u);
    P.near = [[28 + 2 * k, -158 + 2 * k], [42 + 10 * k, -168 + 10 * k]]; P.lean = 5 * k;
    P.bolt = u >= .15 && u < .75 ? (u - .15) / .6 : -1;
  } else if (action === 'cast') {
    // Crashing Wave: the trident raised high, the near hand forward, the body risen; periodic in u.
    const u = phase(t, COIL_WINDUP_T), w = Math.sin(TAU * u);
    P.trident = [-12, -190 + w]; P.tilt = -.08; P.near = [[30, -164], [46, -176 + w]]; P.splay = .25;
    P.lift = 8 + w * 1.5; P.lean = -3 + w; P.swirl = u; P.tail = w;
  }
  return P;
}

export function drawCoilscale(ctx, x, y, direction, action, t, scale = 1, opts = {}) {
  const P = coilPose(action, t), f = face(direction);
  // Upper-body points lean and rise in proportion to their height above the coils.
  const U = ([px, py]) => { const k = Math.max(0, Math.min(1, (-py - 40) / 150)); return [px + P.lean * k, py - P.lift * k]; };
  // Coil halves: the back half sits a little higher, so the coils read as stacked turns of a thick body.
  const ring = (a0, a1, cy, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [Math.cos(a) * 84, cy + Math.sin(a) * 18]; });
  const parts = [];
  parts.push({ id: 'tail', d: -8, draw: () => {
    // The tail end, rising behind the ring and curling over.
    const tw = P.tail * 3;
    tube(ctx, f, [[-80, -42], [-104, -54], [-120, -76], [-118 + tw, -98], [-104 + tw, -106]], [36, 28, 20, 12, 5], { fill: C.scale, bellyFill: C.belly, bellySide: 1, belly: .4, scale: true });
  } });
  parts.push({ id: 'coilBack', d: -6, draw: () => tube(ctx, f, ring(Math.PI, TAU, -50), Array(11).fill(44), { fill: C.scaleDark, bellyFill: C.belly, bellySide: 1, belly: .3, scale: true }) });
  // A further turn inside the ring, so its middle reads as stacked coils rather than a hollow.
  parts.push({ id: 'coilInner', d: -5.5, draw: () => tube(ctx, f, Array.from({ length: 13 }, (_, i) => { const a = Math.PI + TAU * i / 12; return [Math.cos(a) * 56, -46 + Math.sin(a) * 9]; }), Array(13).fill(30), { fill: C.scale, scale: true }) });
  parts.push({ id: 'hairBack', d: -5, draw: () => {
    const hair = [[10, -232], [-14, -236], [-34, -222], [-44, -200], [-44, -176], [-52, -160], [-48, -146], [-56, -132], [-48, -118], [-38, -124],
      [-32, -116], [-24, -130], [-16, -140], [-10, -160], [-4, -188], [6, -204]];
    blob(ctx, f, hair.map(U), C.hair, { w: 2.2, depth: 3.4, light: .25, speck: 1.6 });
    for (const pts of [[[-24, -212], [-34, -192], [-42, -168], [-48, -142]], [[-14, -214], [-20, -190], [-26, -160], [-34, -130]]]) line(ctx, f, pts.map(U), .7);
  } });
  parts.push({ id: 'trident', d: -4, draw: () => {
    // Held upright in the far hand, behind the body; the head carries a red gem.
    const [hx, hy] = U(P.trident), a = -Math.PI / 2 + P.tilt, ux = Math.cos(a), uy = Math.sin(a);
    const at = s => [hx + ux * s, hy + uy * s], butt = at(-78), top = at(104);
    limb(ctx, f, [butt, top], 3.4, 3, C.goldDark, { w: 1.5, depth: .6 });
    for (const s of [-6, 6, 60]) disc(ctx, f, ...at(s), 3.4, 2.4, C.gold, { w: 1, depth: .4, speck: 0 });
    const [tx, ty] = top, nx = -uy, ny = ux, Q = (s, w) => [tx + ux * s + nx * w, ty + uy * s + ny * w];
    blob(ctx, f, [Q(-4, -11), Q(3, -12), Q(5, 0), Q(3, 12), Q(-4, 11), Q(-2, 0)], C.gold, { w: 1.4, depth: .8, speck: .2 });
    for (const w of [-10, 0, 10]) {
      const len = w ? 18 : 24;
      blob(ctx, f, [Q(2, w - 2.2), Q(len - 4, w - 1.8), Q(len, w), Q(len - 4, w + 1.8), Q(2, w + 2.2)], C.gold, { w: 1.3, depth: .6, speck: .1 });
      if (w) blob(ctx, f, [Q(len - 7, w), Q(len - 4, w + Math.sign(w) * 3.5), Q(len - 2, w)], C.gold, { w: 1, depth: 0, speck: 0 });
    }
    disc(ctx, f, ...Q(0, 0), 3.4, 3.4, C.gem, { w: 1, depth: .4, speck: 0 });
    for (const w of [-9, 9]) { const [px, py] = Q(-3, w); line(ctx, f, [[px, py], [px, py + 6]], .6); disc(ctx, f, px, py + 8, 1.8, 2.6, C.gem, { w: .7, depth: 0, speck: 0 }); }
  } });
  parts.push({ id: 'farArm', d: -3, draw: () => {
    const h = U(P.trident);
    arm(ctx, f, U([-6, -162]), U([-20, (-162 + P.trident[1]) / 2 + 4]), h, C.skinDark, { r0: 5.4, r1: 4.6, r2: 4, hand: 4.6, grip: true });
    disc(ctx, f, ...U([P.trident[0] - 1, P.trident[1] + 7]), 4.8, 2.4, C.gold, { w: 1, depth: .4, speck: 0 });
  } });
  parts.push({ id: 'body', d: 0, draw: () => {
    // The serpent body rising out of the ring into the waist.
    tube(ctx, f, [[28, -30], [24, -70], U([12, -110]), U([4, -130])], [56, 46, 36, 30], { fill: C.scale, bellyFill: C.belly, bellySide: 1, belly: .45, scale: true });
  } });
  parts.push({ id: 'coilFront', d: 4, draw: () => tube(ctx, f, ring(0, Math.PI, -32), Array(11).fill(52), { fill: C.scale, bellyFill: C.belly, bellySide: -1, belly: .28, scale: true }) });
  parts.push({ id: 'torso', d: 6, draw: () => {
    // Bodice with gold trim and a red gem, bare shoulders, a gold scale peplum over the join, draped panels.
    blob(ctx, f, [[-13, -132], [13, -132], [14, -150], [12, -166], [-12, -166], [-14, -150]].map(U), C.skin, { w: 2, depth: 2, speck: .4 });
    blob(ctx, f, [[-13, -132], [13, -132], [14, -150], [10, -158], [0, -152], [-10, -158], [-14, -150]].map(U), C.dress, { w: 1.8, depth: 2, speck: .8 });
    line(ctx, f, [U([-10, -157]), U([0, -146]), U([10, -157])], 1.6); line(ctx, f, [U([-10, -157]), U([0, -146]), U([10, -157])], .1);
    blob(ctx, f, [[-10, -158], [-9, -155.5], [0, -144], [9, -155.5], [10, -158], [0, -146.5]].map(U), C.gold, { w: .7, depth: .2, speck: 0 });
    disc(ctx, f, ...U([0, -149]), 3, 3.6, C.gem, { w: 1, depth: .5, speck: 0 });
    // Draped dress panels falling over the serpent body.
    blob(ctx, f, [[-16, -134], [16, -134], [22, -112], [14, -96], [8, -104], [2, -92], [-4, -102], [-12, -94], [-18, -108]].map(U), C.dressDark, { w: 1.8, depth: 1.6, speck: .8 });
    // Gold scale peplum: two rows of rounded plates.
    for (const [row, z] of [[0, -134], [1, -128]]) for (let i = 0; i < 6; i++) {
      const px = -15 + i * 6 + row * 3;
      blob(ctx, f, [[px - 3.2, z - 2], [px + 3.2, z - 2], [px + 3, z + 2.5], [px, z + 5], [px - 3, z + 2.5]].map(U), C.gold, { w: 1, depth: .5, speck: .2 });
    }
    for (const px of [-8, 2, 12]) { const [qx, qy] = U([px, -122]); line(ctx, f, [[qx, qy], [qx, qy + 6]], .5); disc(ctx, f, qx, qy + 8, 1.6, 2.4, C.gem, { w: .6, depth: 0, speck: 0 }); }
  } });
  parts.push({ id: 'head', d: 8, draw: () => {
    const K = 1.25, H = ([px, py]) => U([6 + (px - 6) * K, -178 + (py + 178) * K]);
    const hc = H([6, -196]);
    // Pink finned ear, then the face and hair framing it.
    blob(ctx, f, [[-10, -198], [-28, -212], [-24, -198], [-28, -188], [-10, -190]].map(H), C.fin, { w: 1.3, depth: .7, speck: .2 });
    for (const yy of [-208, -198, -190]) line(ctx, f, [H([-11, -195]), H([-25, yy])], .45);
    disc(ctx, f, hc[0], hc[1], 24 * K, 25 * K, C.skin, { w: 2.2, depth: 2.4, speck: .4 });
    blob(ctx, f, [[-22, -204], [-14, -218], [2, -224], [18, -220], [28, -208], [24, -198], [16, -208], [8, -200], [0, -210], [-10, -202]].map(H), C.hair, { w: 1.8, depth: 1.8, speck: .9 });
    // Gold crown with points and a red gem.
    const crown = [[-12, -218], [-10, -226], [-6, -221], [-2, -232], [2, -222], [6, -236], [10, -222], [14, -230], [16, -220], [18, -214], [-12, -212]];
    blob(ctx, f, crown.map(H), C.gold, { w: 1.4, depth: .9, speck: .3 });
    disc(ctx, f, ...H([6, -220]), 3 * K, 3.8 * K, C.gem, { w: 1, depth: .4, speck: 0 });
    // Stern almond eyes under slanted brows, a small frown.
    const hurt = action === 'hurt' && t < .2;
    eyes(ctx, f, [H([10, -194]), H([24, -194])], 2.8 * K, 3.8 * K, { closed: hurt });
    line(ctx, f, [H([5, -201]), H([10, -200]), H([14, -198])], 1.2);
    line(ctx, f, [H([20, -198]), H([24, -200]), H([28, -201])], 1.1);
    line(ctx, f, [H([14, -181]), H([18, -183]), H([22, -181])], .9);
  } });
  parts.push({ id: 'nearArm', d: 10, draw: () => {
    const s = U([12, -162]), e = U(P.near[0]), h = U(P.near[1]);
    arm(ctx, f, s, e, h, C.skin, { r0: 5.4, r1: 4.6, r2: 4, hand: 4.6, splay: P.splay });
    // A draped sleeve hanging from the upper arm, and a gold bracelet with red drops.
    blob(ctx, f, [s, [e[0] - 2, e[1] - 4], [e[0] + 2, e[1] + 10], [e[0] - 6, e[1] + 22], [s[0] - 4, s[1] + 18], [s[0] - 8, s[1] + 6]], C.dress, { w: 1.6, depth: 1.4, speck: .6 });
    const bx = e[0] + (h[0] - e[0]) * .55, by = e[1] + (h[1] - e[1]) * .55;
    disc(ctx, f, bx, by, 2.6, 4.6, C.gold, { w: 1, depth: .4, speck: 0 });
    disc(ctx, f, bx, by + 7, 1.6, 2.4, C.gem, { w: .6, depth: 0, speck: 0 });
  } });
  parts.push({ id: 'magic', d: 14, draw: () => {
    if (P.bolt >= 0) {
      // The venom bolt flies forward and fades.
      const u = P.bolt, h = U(P.near[1]), bx = h[0] + 10 + u * 70, by = h[1] + u * 6, r = 9 * (1 - u * .3);
      ctx.save(); ctx.globalAlpha = 1 - u * .6;
      disc(ctx, f, bx, by, r * 1.3, r, C.venom, { w: 1.4, depth: .8, speck: .3 });
      disc(ctx, f, bx - r * .3, by - r * .25, r * .4, r * .3, '#d8f0b8', { w: 0, depth: 0, speck: 0 });
      for (const k of [1, 2, 3]) disc(ctx, f, bx - r - k * 7, by + (k % 2 ? -3 : 3), 2.4 - k * .5, 2 - k * .4, C.venomDark, { w: .6, depth: 0, speck: 0 });
      ctx.restore();
    }
    if (P.swirl >= 0) {
      // Water swirling up around the coils as the wave gathers (cycles with the loop).
      for (let i = 0; i < 3; i++) {
        const u = (P.swirl + i / 3) % 1, a = TAU * u, wx = Math.cos(a) * 110, wy = -40 + Math.sin(a) * 26 - u * 30;
        ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * u) * .9;
        blob(ctx, f, [[wx - 12, wy], [wx - 4, wy - 7], [wx + 8, wy - 6], [wx + 14, wy + 1], [wx + 6, wy - 1], [wx - 4, wy + 2]], C.water, { w: 1.2, depth: .4, speck: 0 });
        line(ctx, f, [[wx - 6, wy - 2], [wx + 6, wy - 4]], .5);
        ctx.restore();
      }
    }
  } });
  drawCreature(ctx, x, y, f, scale, parts, 'eb-coilscale', fallTilt(action, t), { pivot: 100, toe: 100, shift: 0 });
  return { pose: P, order: parts.map(p => p.id) };
}

export const character = Object.freeze({
  id: 'eb-coilscale', label: 'Coilscale Matriarch — EMBERBOUND', kind: 'creature', directional: true, draw: drawCoilscale,
  actions: { idle: { period: IDLE_T, frames: 12 },
    attack: { period: COIL_ATTACK_T, keys: [0, .08, .15, .25, .35, .45, .55, .7, .85], once: true, releaseAt: .15 },
    cast: { period: COIL_WINDUP_T, frames: 8 },
    hurt: hurtAction },
  frameBox: { x0: -220, x1: 220, y0: -350, y1: 16 },
  emberbound: { gameId: 'coilscale', heightPx: 64, facing: 'L' },
});
export const studio = Object.freeze({ order: 17, name: 'Coilscale Matriarch（とぐろ鱗の女王）', category: 'EMBERBOUND 第2エリア',
  description: '第2エリアのボス。上半身は人の姿、下半身は青い鱗の長い蛇。金の冠と三叉槍。Tideling を呼び、大波 Crashing Wave と毒で攻める。',
  preview: { direction: 'L', phase: 0 } });
