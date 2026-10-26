/**
 * EMBERBOUND EXPEDITION — Glacial Warden (game id `glacial_warden`, elite), a new hulking armoured body after the
 * user's reference image: a broad, heavy torso and limbs in pale blue ice plate edged with white frost, a thick
 * white fur mantle over huge pauldrons, a small closed helm with glowing eyes and a crown of ice spikes, a long
 * navy cloak, and a great hammer — a block of ice bound in iron on a long wrapped haft — held across the front of
 * the body in both hands, its head out in front (to the left when facing left).
 * Drawn by hand in a right-facing local frame like the other non-rig bodies (creature.js), so its proportions are
 * its own: a big body and a small head. It is built on a simple skeleton so it stays a plausible person:
 * - Shoulders, hips, knees and feet are fixed points; every arm is two bones of fixed length (UPPER, FORE) solved
 *   from shoulder to hand, its elbow always bending down and back (`elbow`). Every hand pose is within reach.
 * - The same hands and stance whichever way it faces: right foot and shoulder forward, right hand up the haft, left
 *   hand at the pommel end. Facing left (the game) its left side is toward us, so the forward limbs are the far
 *   ones; facing right they are the near ones and only the depth order changes (docs/SIDE_VIEW_GUIDE.md).
 * - The fur mantle sits under the helm, so the visor is never covered; a raised arm goes behind the helm.
 * Actions (plan/EMBERBOUND_PRODUCTION.md): attack = Frost Bash (a sledgehammer swing: the hammer swung down and
 * back past the legs, raised behind the back until the hands are over the head, then over the top and down in
 * front; impact at u = .45, 0.135 s), `cast` = the Avalanche wind-up the game loops (the hammer held up high over
 * the head, trembling), and the shared hurt.
 */
import { TAU, PAL, keyframes } from '../../src/authoring.js';
import { hurtAction, phase, sample, fallTilt } from '../shared/emberbound/actions.js';
import { face, blob, disc, line, limb, tufted, drawCreature } from '../shared/emberbound/creature.js';

const C = {
  plate: '#9dbbdc', plateLight: '#cfe1f1', plateMid: '#7a9cc4', plateDark: '#55759e', frost: '#f3f7fb',
  fur: '#f1efe9', furShade: '#d2d8df', cape: '#3f4c86', capeDark: '#2d376a', mail: '#3a4a66',
  ice: '#cfe7f5', iceLight: '#f0f9fd', iron: '#4a4f5a', silver: '#d3dde8', silverDark: '#8d97a6', eye: '#86f2ea', ink: PAL.ink,
};
export const WARDEN_ATTACK_T = .3;    // Frost Bash: the head lands at u = .45 (0.135 s)
export const WARDEN_WINDUP_T = .6;    // Avalanche wind-up: a loop
const IDLE_T = 3;

// Skeleton (local px, facing right, feet on y = 0). The right ("lead") side is forward, the left ("rear") back.
export const SKELETON = Object.freeze({
  shoulder: { lead: [14, -144], rear: [-8, -142] },
  hip: { lead: [10, -76], rear: [-12, -76] }, knee: { lead: [16, -42], rear: [-16, -42] }, ankle: { lead: [18, -12], rear: [-20, -12] },
  UPPER: 37, FORE: 35,
  face: { x0: 8, x1: 30, y0: -176, y1: -154 },   // the visor and the helm's front, which must stay visible
});
const { UPPER, FORE } = SKELETON;
// The hammer along its haft from the point between the hands, which hold it near the pommel end: the right hand
// GRIP ahead (toward the head), the left GRIP behind; the pommel at BUTT, the ice head from HEAD0 to HEAD1 on the
// long haft, HEAD_W either side of it.
const GRIP = 12, BUTT = -18, HEAD0 = 58, HEAD1 = 100, HEAD_W = 22;
// Hammer poses: [x, y, haft angle] of the point between the hands (angle 0 = forward, π/2 = down). The Bash turns
// the haft one whole way round (the angle grows by 2π). While the hands rise behind the back the head hangs down
// behind it, so the pommel points up behind the helm; the hands are over the head before the haft comes upright,
// and upright only once they are ahead of the face — so neither the pommel, the head nor a hand crosses the visor.
const IDLE = [30, -104, -1.05];
const BASH = [[0, IDLE], [.05, [24, -120, .9]], [.1, [6, -112, 2.4]], [.15, [-18, -112, 1.95]], [.2, [-22, -150, 1.9]], [.3, [-14, -200, 2.2]],
  [.36, [20, -210, 3.3]], [.4, [44, -196, 4.4]], [.43, [58, -168, 5.4]], [.45, [58, -100, 6.83]], [.62, [58, -98, 6.88]],
  [.82, [42, -104, 5.88]], [1, [30, -104, -1.05 + TAU]]];
const CAST = [0, -214, 3.3];

export function wardenPose(action, t) {
  const s = Math.sin(TAU * phase(t, IDLE_T));
  const P = { breathe: s, hammer: IDLE.slice(), lean: 0, crouch: 0, cape: s * 1.5, shake: 0, dust: -1 };
  if (action === 'attack') {
    const u = phase(t, WARDEN_ATTACK_T);
    P.hammer = keyframes(BASH, u);
    P.lean = sample([[0, [0]], [.1, [2]], [.3, [-6]], [.45, [10]], [.62, [9]], [1, [0]]], u);
    P.crouch = sample([[0, [0]], [.1, [4]], [.3, [-4]], [.45, [8]], [.62, [7]], [1, [0]]], u);
    P.cape = -P.lean * .5; P.dust = u >= .45 && u < .85 ? (u - .45) / .4 : -1;
  } else if (action === 'cast') {
    // Avalanche: the hammer held up high over the head, the body braced and trembling; periodic in u.
    const u = phase(t, WARDEN_WINDUP_T), w = Math.sin(TAU * u * 2);
    P.hammer = [CAST[0] + w * .6, CAST[1], CAST[2] + w * .03]; P.lean = -4; P.crouch = 3; P.shake = w * 1.2; P.cape = 2 + w;
  }
  return P;
}

/** Elbow of a two-bone arm from shoulder S to hand H. Of the two solutions it takes the natural one, lower and
 *  further back: an elbow never bends forward or up. */
function elbow(S, H) {
  const dx = H[0] - S[0], dy = H[1] - S[1], L = Math.hypot(dx, dy) || 1, d = Math.max(Math.abs(UPPER - FORE) + .01, Math.min(L, UPPER + FORE - .01));
  const along = (UPPER * UPPER - FORE * FORE + d * d) / (2 * d), h = Math.sqrt(Math.max(0, UPPER * UPPER - along * along));
  const ux = dx / L, uy = dy / L, m = [S[0] + ux * along, S[1] + uy * along];
  const a = [m[0] - uy * h, m[1] + ux * h], b = [m[0] + uy * h, m[1] - ux * h];
  return a[1] - a[0] * .5 >= b[1] - b[0] * .5 ? a : b;
}

/** The posed skeleton (local px, after the lean): shoulders, elbows, hands and the hammer. Used by the drawing and
 *  by the checks (tests/node/eb-warden-skeleton.test.mjs). */
export function wardenRig(action, t) {
  const P = wardenPose(action, t), b = P.breathe;
  // The upper body leans and crouches with the swing, in proportion to height above the hips.
  const U = ([px, py]) => { const k = Math.max(0, Math.min(1, (-py - 76) / 80)); return [px + (P.lean + P.shake) * k, py + P.crouch * k - b * k]; };
  const [cx, cy, ang] = P.hammer, dir = [Math.cos(ang), Math.sin(ang)], n = [-dir[1], dir[0]];
  const at = s => U([cx + dir[0] * s, cy + dir[1] * s]);
  const H = { lead: at(GRIP), rear: at(-GRIP) };
  // A shoulder rises (up to 10 px) as its hand goes above it, as real shoulders shrug when the arms go overhead.
  const shoulder = side => { const p = U(SKELETON.shoulder[side]), k = Math.max(0, Math.min(1, (p[1] - H[side][1]) / 50)); return [p[0], p[1] - 10 * k]; };
  const S = { lead: shoulder('lead'), rear: shoulder('rear') };
  const E = { lead: elbow(S.lead, H.lead), rear: elbow(S.rear, H.rear) };
  const head = [at(HEAD0), at(HEAD1)].flatMap(p => [[p[0] + n[0] * HEAD_W, p[1] + n[1] * HEAD_W], [p[0] - n[0] * HEAD_W, p[1] - n[1] * HEAD_W]]);
  // Behind the back (its head behind the helm) the hammer is drawn behind the body.
  const behind = at((HEAD0 + HEAD1) / 2)[0] < -6;
  return { P, U, at, dir, n, S, E, H, hammer: { butt: at(BUTT - 4), neck: at(HEAD0), head: [head[0], head[2], head[3], head[1]], behind } };
}

export function drawWarden(ctx, x, y, direction, action, t, scale = 1, opts = {}) {
  const rig = wardenRig(action, t), { P, U, at, dir, n, S, E, H } = rig, f = face(direction);
  // Facing left the left ("rear") side is toward us; facing right the right ("lead") side is.
  const near = direction === 'R' ? 'lead' : 'rear', far = near === 'lead' ? 'rear' : 'lead';
  const frostEdge = (pts, thick) => {
    // White frost along a plate's edge, with small icicles hanging from it.
    const q = pts.map(U), out = [...q];
    for (let i = q.length - 1; i >= 0; i--) out.push([q[i][0], q[i][1] + (i % 2 ? thick * 2.2 : thick)]);
    blob(ctx, f, out, C.frost, { w: 1, depth: .4, speck: .2, amp: .3 });
  };
  // A gauntlet closed round the haft: a block across it with knuckle lines along it.
  const gauntlet = (h, col) => {
    const q = (a, w) => [h[0] + dir[0] * a + n[0] * w, h[1] + dir[1] * a + n[1] * w];
    blob(ctx, f, [q(-7, -8), q(7, -8), q(8, 0), q(7, 9), q(-7, 9), q(-8, 0)], col, { w: 1.8, depth: 1.2, speck: .3 });
    for (const a of [-3.5, 0, 3.5]) line(ctx, f, [q(a, -7), q(a, -2)], .55);
  };
  const upperArm = (side, col) => limb(ctx, f, [S[side], E[side]], 12, 10.5, col, { w: 1.8, depth: 2 });
  const forearm = (side, col, lightCol) => {
    limb(ctx, f, [E[side], H[side]], 10.5, 9.5, col, { w: 1.8, depth: 1.8 });
    const e = E[side]; blob(ctx, f, [[e[0] - 7, e[1] - 5], [e[0] + 6, e[1] - 6], [e[0] + 8, e[1] + 5], [e[0] - 6, e[1] + 6]], lightCol, { w: 1.4, depth: .8 });
  };
  // A raised hand (above the shoulders) takes its arm behind the helm, so the arm never covers the face.
  const raised = side => H[side][1] < -150;
  const parts = [];
  parts.push({ id: 'cape', d: -12, draw: () => {
    const cw = P.cape;
    blob(ctx, f, [[-26, -150], [-10, -150], [-22, -110], [-28, -60], [-24, -20], [-28, 0], [-66 + cw, 2], [-64 + cw, -30], [-54, -90], [-42, -136]].map(U), C.cape, { w: 2, depth: 3, speck: 1.2 });
    blob(ctx, f, [[-66 + cw, 2], [-28, 0], [-32, -40], [-48, -60], [-64 + cw, -30]].map(U), C.capeDark, { w: 0, depth: .6, speck: .6 });
    for (const [px, py] of [[-50, -10], [-38, -4], [-58, -24]]) disc(ctx, f, ...U([px, py]), 1.4, 1.2, C.frost, { w: 0, depth: 0, speck: 0 });
  } });
  // An armoured leg from hip to ankle: thigh, knee plate with a star-diamond, greave, pointed sabaton.
  const leg = (side, isNear) => {
    const hp = SKELETON.hip[side], kn = SKELETON.knee[side], an = SKELETON.ankle[side], col = isNear ? C.plate : C.plateMid;
    const ck = P.crouch * .5, hip = [hp[0], hp[1] + ck], knee = [kn[0] + ck * .4, kn[1] + ck * .5];
    limb(ctx, f, [hip, knee], 14, 12, col, { w: 1.8, depth: 2 });
    limb(ctx, f, [knee, an], 12, 11, col, { w: 1.8, depth: 2 });
    blob(ctx, f, [[an[0] - 13, -14], [an[0] + 12, -14], [an[0] + 25, -2], [an[0] + 23, 0], [an[0] - 13, 0]], isNear ? C.plateMid : C.plateDark, { w: 1.8, depth: 1.6 });
    const [kx, ky] = knee;
    blob(ctx, f, [[kx - 11, ky - 3], [kx, ky - 9], [kx + 11, ky - 3], [kx + 9, ky + 9], [kx, ky + 14], [kx - 9, ky + 9]], isNear ? C.plateLight : C.plate, { w: 1.6, depth: 1.2 });
    blob(ctx, f, [[kx, ky - 4], [kx + 3.4, ky + 3], [kx, ky + 10], [kx - 3.4, ky + 3]], C.silver, { w: .8, depth: 0, speck: 0 });
    if (isNear) frostEdge([[an[0] - 12, -15], [an[0], -16], [an[0] + 12, -15]], 2);
  };
  parts.push({ id: 'farLeg', d: -10, draw: () => leg(far, false) });
  parts.push({ id: 'farUpperArm', d: -8, draw: () => upperArm(far, C.plateMid) });
  parts.push({ id: 'nearLeg', d: -6, draw: () => leg(near, true) });
  parts.push({ id: 'body', d: 0, draw: () => {
    // Mail at the hips, the plated skirt, then the broad breastplate with a star emblem and frost on its edges.
    blob(ctx, f, [[-30, -86], [32, -86], [30, -62], [-28, -62]].map(U), C.mail, { w: 1.6, depth: 1.2, speck: .8 });
    for (const px of [-18, 6, 26]) blob(ctx, f, [[px - 12, -84], [px + 12, -84], [px + 13, -58], [px, -52], [px - 13, -58]].map(U), C.plateMid, { w: 1.6, depth: 1.4, speck: .7 });
    frostEdge([[-30, -58], [-18, -54], [-6, -58], [6, -54], [20, -58], [38, -56]], 1.6);
    const chest = [[-30, -88], [30, -88], [34, -104], [38, -124], [32, -144], [12, -150], [-12, -150], [-30, -144], [-36, -122], [-34, -102]];
    blob(ctx, f, chest.map(U), C.plate, { w: 2.4, depth: 4, light: .25, speck: 1.6 });
    blob(ctx, f, [[16, -142], [30, -138], [36, -122], [30, -100], [20, -104]].map(U), C.plateLight, { w: 0, depth: 0, speck: .5 });
    blob(ctx, f, [[-34, -94], [34, -94], [34, -86], [-34, -86]].map(U), C.silverDark, { w: 1.4, depth: .6 });
    blob(ctx, f, [[12, -134], [20, -118], [12, -102], [4, -118]].map(U), C.silver, { w: 1.2, depth: .4, speck: 0 });
    blob(ctx, f, [[12, -128], [16, -118], [12, -108], [8, -118]].map(U), C.ice, { w: 0, depth: 0, speck: 0 });
    line(ctx, f, [[-12, -144], [-14, -116], [-10, -96]].map(U), .7);
    frostEdge([[-34, -96], [-16, -98], [0, -96], [18, -98], [34, -96]], 1.8);
  } });
  // Pauldrons over the shoulders: the near one lighter with a silver stud, the far one darker; both under the helm.
  const PAULDRON = { lead: [[0, -150], [20, -153], [34, -144], [32, -128], [14, -122], [0, -134]], rear: [[-30, -148], [-12, -153], [4, -146], [4, -128], [-12, -120], [-32, -130]] };
  const pauldron = (side, isNear) => {
    const pts = PAULDRON[side], c = SKELETON.shoulder[side];
    blob(ctx, f, pts.map(U), isNear ? C.plate : C.plateMid, { w: 2, depth: 2.4, light: isNear ? .2 : .1, speck: 1 });
    if (isNear) disc(ctx, f, ...U([c[0] + 2, c[1] + 4]), 4.2, 4.2, C.silver, { w: 1, depth: .5, speck: 0 });
    frostEdge([[pts[5][0] + 2, pts[3][1] - 2], [c[0], pts[4][1] - 1], [pts[3][0] - 2, pts[3][1] - 2]], 1.6);
  };
  parts.push({ id: 'farPauldron', d: 1, draw: () => pauldron(far, false) });
  parts.push({ id: 'mantle', d: 2, draw: () => {
    // The thick fur mantle round the shoulders and the helm's base; its front stays below the visor.
    const fur = [[-38, -140], [-34, -154], [-20, -160], [-6, -154], [8, -151], [22, -151], [34, -146], [38, -136], [24, -136], [8, -139], [-10, -139], [-28, -134]];
    blob(ctx, f, tufted(fur.map(U), 6, 3.4), C.fur, { w: 1.8, depth: 1.8, speck: .8, amp: .5 });
    blob(ctx, f, tufted([[-30, -146], [-12, -150], [8, -147], [28, -144], [20, -141], [0, -143], [-20, -142]].map(U), 5, 2.2), C.furShade, { w: 0, depth: .4, speck: .4 });
  } });
  // The far arm's forearm and hand: in front of the body, behind the helm and the hammer.
  parts.push({ id: 'farForearm', d: 2.5, draw: () => { forearm(far, C.plateMid, C.plate); gauntlet(H[far], C.plateMid); } });
  parts.push({ id: 'head', d: 3, draw: () => {
    // A small closed helm on the shoulders: a crown of ice spikes, a silver band, a dark visor with glowing eyes.
    for (const [dx, h, w] of [[-2, 8, 3.4], [4, 12, 3.8], [11, 17, 4.2], [18, 12, 3.8], [24, 8, 3.4]])
      blob(ctx, f, [[dx - w, -183], [dx - w * .4, -183 - h * .7], [dx, -183 - h], [dx + w * .4, -183 - h * .7], [dx + w, -183]].map(U), C.ice, { w: 1.3, depth: .8, light: .35, speck: .2, amp: .06 });
    blob(ctx, f, [[-6, -154], [-8, -172], [-3, -184], [12, -188], [25, -182], [29, -170], [27, -154], [10, -150]].map(U), C.plate, { w: 2, depth: 2, speck: .8 });
    blob(ctx, f, [[-5, -186], [26, -186], [27, -180], [-6, -180]].map(U), C.silver, { w: 1.2, depth: .5 });
    blob(ctx, f, [[12, -173], [29, -172], [29, -163], [12, -164]].map(U), C.ink, { w: .8, depth: 0, speck: 0 });
    for (const [ex, ey] of [[18, -168.5], [25, -168]]) disc(ctx, f, ...U([ex, ey]), 1.9, 1.5, C.eye, { w: 0, depth: 0, speck: 0 });
    line(ctx, f, [[2, -176], [4, -160]].map(U), .6);
  } });
  parts.push({ id: 'nearPauldron', d: 4, draw: () => pauldron(near, true) });
  // Swung low behind the legs the hammer is behind the body; raised behind the back it stays visible but behind the
  // helm and a raised arm.
  parts.push({ id: 'hammer', d: !rig.hammer.behind ? 7 : rig.hammer.neck[1] > -100 ? -11 : 2.55, draw: () => {
    const p0 = at(BUTT), p1 = at(HEAD0);
    blob(ctx, f, [[p0[0] + n[0] * 2.6, p0[1] + n[1] * 2.6], [p1[0] + n[0] * 2.6, p1[1] + n[1] * 2.6], [p1[0] - n[0] * 2.6, p1[1] - n[1] * 2.6], [p0[0] - n[0] * 2.6, p0[1] - n[1] * 2.6]], C.iron, { w: 1.6, depth: .8, speck: .3, amp: .08 });
    for (let s2 = -30; s2 < 26; s2 += 5) { const q = at(s2); line(ctx, f, [[q[0] - n[0] * 2.6, q[1] - n[1] * 2.6], [q[0] + n[0] * 2.6 + dir[0] * 2, q[1] + n[1] * 2.6 + dir[1] * 2]], .45); }
    // The silver pommel, a silver collar under the head.
    const pm = at(BUTT - 4);
    blob(ctx, f, [[pm[0] + n[0] * 4, pm[1] + n[1] * 4], [pm[0] - n[0] * 4, pm[1] - n[1] * 4], [pm[0] - dir[0] * 8, pm[1] - dir[1] * 8]], C.silver, { w: 1.2, depth: .5, speck: 0 });
    const cl = at(HEAD0 - 4);
    blob(ctx, f, [[cl[0] + n[0] * 5, cl[1] + n[1] * 5], [cl[0] + dir[0] * 4 + n[0] * 5, cl[1] + dir[1] * 4 + n[1] * 5], [cl[0] + dir[0] * 4 - n[0] * 5, cl[1] + dir[1] * 4 - n[1] * 5], [cl[0] - n[0] * 5, cl[1] - n[1] * 5]], C.silver, { w: 1.2, depth: .5, speck: 0 });
    // The ice block: a front face and a lighter top face, faint inner cracks, two iron bands.
    const h0 = at(HEAD0), h1 = at(HEAD1), W = HEAD_W, D = [5, -5];
    const face4 = [[h0[0] + n[0] * W, h0[1] + n[1] * W], [h1[0] + n[0] * W, h1[1] + n[1] * W], [h1[0] - n[0] * W, h1[1] - n[1] * W], [h0[0] - n[0] * W, h0[1] - n[1] * W]];
    blob(ctx, f, [face4[0], face4[1], [face4[1][0] + D[0], face4[1][1] + D[1]], [face4[0][0] + D[0], face4[0][1] + D[1]]], C.iceLight, { w: 1.6, depth: .4, speck: .2, amp: .06 });
    blob(ctx, f, [face4[1], [face4[1][0] + D[0], face4[1][1] + D[1]], [face4[2][0] + D[0], face4[2][1] + D[1]], face4[2]], C.plateLight, { w: 1.6, depth: .4, speck: .2, amp: .06 });
    blob(ctx, f, face4, C.ice, { w: 2, depth: 1.6, light: .35, speck: .6, amp: .08 });
    for (const [u2, v] of [[.3, -.4], [.6, .35], [.45, .75], [.75, -.6]]) { const q = [h0[0] + (h1[0] - h0[0]) * u2 + n[0] * W * v, h0[1] + (h1[1] - h0[1]) * u2 + n[1] * W * v]; line(ctx, f, [[q[0] - 4, q[1] - 1], [q[0] + 2, q[1] + 3], [q[0] + 5, q[1] - 1]], .5); }
    for (const u2 of [.2, .8]) {
      const m = [h0[0] + (h1[0] - h0[0]) * u2, h0[1] + (h1[1] - h0[1]) * u2];
      blob(ctx, f, [[m[0] + n[0] * (W + 1.5) - dir[0] * 2.4, m[1] + n[1] * (W + 1.5) - dir[1] * 2.4], [m[0] + n[0] * (W + 1.5) + dir[0] * 2.4, m[1] + n[1] * (W + 1.5) + dir[1] * 2.4],
        [m[0] - n[0] * (W + 1.5) + dir[0] * 2.4, m[1] - n[1] * (W + 1.5) + dir[1] * 2.4], [m[0] - n[0] * (W + 1.5) - dir[0] * 2.4, m[1] - n[1] * (W + 1.5) - dir[1] * 2.4]], C.silverDark, { w: 1.2, depth: .4, speck: 0, amp: .05 });
    }
  } });
  // The near arm: in front of everything, unless its hand is raised (then behind the helm and the hammer).
  parts.push({ id: 'nearArm', d: raised(near) ? 2.6 : 9, draw: () => { upperArm(near, C.plate); forearm(near, C.plate, C.plateLight); gauntlet(H[near], C.plate); } });
  parts.push({ id: 'impact', d: 12, draw: () => {
    if (P.dust < 0) return;
    // Snow and ice chips bursting from where the hammer strikes.
    const h = at((HEAD0 + HEAD1) / 2);
    ctx.save(); ctx.globalAlpha = 1 - P.dust;
    for (let i = 0; i < 6; i++) {
      const a = -1.2 + i * .5, r = 26 + P.dust * 30;
      disc(ctx, f, h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r * .8, 5 * (1 - P.dust * .5), 3.6 * (1 - P.dust * .5), C.frost, { w: 1, depth: 0, speck: 0 });
    }
    ctx.restore();
  } });
  drawCreature(ctx, x, y, f, scale, parts, 'eb-glacial-warden', fallTilt(action, t), { pivot: 50, toe: 50, shift: 0 });
  return { pose: P, order: parts.map(p => p.id) };
}

export const character = Object.freeze({
  id: 'eb-glacial-warden', label: 'Glacial Warden — EMBERBOUND', kind: 'creature', directional: true, draw: drawWarden,
  actions: { idle: { period: IDLE_T, frames: 12 },
    attack: { period: WARDEN_ATTACK_T, keys: [0, .05, .1, .15, .2, .3, .36, .4, .43, .45, .52, .62, .82], once: true },
    cast: { period: WARDEN_WINDUP_T, frames: 8 },
    hurt: hurtAction },
  frameBox: { x0: -230, x1: 230, y0: -330, y1: 14 },
  emberbound: { gameId: 'glacial_warden', heightPx: 42, facing: 'L' },
});
export const studio = Object.freeze({ order: 28, name: 'Glacial Warden（氷河の番人）', category: 'EMBERBOUND 第4エリア',
  description: '幅広い青い氷の鎧と白い毛皮の肩の重装兵（エリート）。氷の冠の兜、両手で持つ大きな氷のハンマー。Frost Bash と Avalanche を使う。',
  preview: { direction: 'L', phase: 0 } });
