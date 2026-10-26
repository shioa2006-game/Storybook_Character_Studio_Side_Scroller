// Glacial Warden is drawn by hand on its own skeleton (characters/eb-glacial-warden/character.js). These checks keep
// it a plausible person in every frame: each hand within reach of its shoulder (no hand floating off its arm),
// fixed bone lengths, the hammer above the floor, and the visor never covered by the hammer or a hand in front.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKELETON, wardenRig, WARDEN_ATTACK_T, WARDEN_WINDUP_T } from '../../characters/eb-glacial-warden/character.js';

const ACTIONS = { idle: 3, attack: WARDEN_ATTACK_T, cast: WARDEN_WINDUP_T };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Every problem of one frame, as text. */
export function wardenProblems(action, t) {
  const rig = wardenRig(action, t), out = [], { UPPER, FORE } = SKELETON;
  for (const side of ['lead', 'rear']) {
    const reach = dist(rig.S[side], rig.H[side]);
    if (reach > UPPER + FORE - .5) out.push(`${side} hand out of reach (${reach.toFixed(1)} > ${UPPER + FORE})`);
    if (Math.abs(dist(rig.S[side], rig.E[side]) - UPPER) > .5 || Math.abs(dist(rig.E[side], rig.H[side]) - FORE) > .5) out.push(`${side} arm bones stretched`);
    // With the hand below the shoulder the elbow bends back (behind the line shoulder → hand), never forward.
    const [S, E, H] = [rig.S[side], rig.E[side], rig.H[side]];
    if (H[1] > S[1] && (H[0] - S[0]) * (E[1] - S[1]) - (H[1] - S[1]) * (E[0] - S[0]) < 0) out.push(`${side} elbow bent forward`);
  }
  // The visor box moves with the lean (uniformly at its height).
  const o = rig.U([0, -170]), fb = SKELETON.face, box = { x0: fb.x0 + o[0], x1: fb.x1 + o[0], y0: fb.y0 + o[1] + 170, y1: fb.y1 + o[1] + 170 };
  const inFace = ([x, y], r = 0) => x > box.x0 - r && x < box.x1 + r && y > box.y0 - r && y < box.y1 + r;
  // Hammer: the haft from pommel to head, then the ice head (sampled across its face).
  const [b, nk] = [rig.hammer.butt, rig.hammer.neck];
  for (let k = 0; k <= 20; k++) if (inFace([b[0] + (nk[0] - b[0]) * k / 20, b[1] + (nk[1] - b[1]) * k / 20], 3)) { out.push('haft over the visor'); break; }
  const [q0, q1, q2, q3] = rig.hammer.head;
  outer: for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
    const u = i / 8, v = j / 8, a = [q0[0] + (q1[0] - q0[0]) * u, q0[1] + (q1[1] - q0[1]) * u], c = [q3[0] + (q2[0] - q3[0]) * u, q3[1] + (q2[1] - q3[1]) * u];
    if (inFace([a[0] + (c[0] - a[0]) * v, a[1] + (c[1] - a[1]) * v])) { out.push('hammer head over the visor'); break outer; }
  }
  for (const p of rig.hammer.head) if (p[1] > 2) { out.push(`hammer head below the floor (${p[1].toFixed(1)})`); break; }
  // Hands drawn in front of the helm (those not raised, see SKELETON.raisedY) and their forearms.
  for (const side of ['lead', 'rear']) {
    const H = rig.H[side], E = rig.E[side];
    if (H[1] < SKELETON.raisedY) continue;
    if (inFace(H, 9)) out.push(`${side} hand over the visor`);
    for (let k = 0; k <= 10; k++) if (inFace([E[0] + (H[0] - E[0]) * k / 10, E[1] + (H[1] - E[1]) * k / 10], 9)) { out.push(`${side} forearm over the visor`); break; }
  }
  return out;
}

test('Glacial Warden stays a plausible person in every frame', () => {
  const problems = [];
  for (const [action, period] of Object.entries(ACTIONS)) for (let i = 0; i <= 400; i++) {
    for (const p of wardenProblems(action, i / 400 * period)) problems.push(`${action} u=${(i / 400).toFixed(3)}: ${p}`);
  }
  assert.deepEqual(problems.slice(0, 8), []);
});
