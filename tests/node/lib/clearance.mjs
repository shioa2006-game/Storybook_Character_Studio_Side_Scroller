// Weapon-vs-body clearance for side views (docs/SIDE_VIEW_GUIDE.md 2.7–2.8 and 3).
// Every point is in upper-body (U / UY) coordinates: a = forward, b = left, z = up.

/** Canvas stand-in: each draw function returns its pose; drawing calls are ignored. */
export const noopCanvas = new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => 0 : noopCanvas, apply: () => noopCanvas, set: () => true,
});

const TORSO = { A: 10, B: 16, z0: 14, z1: 48 };
const MARGIN = 1;   // allows grazing

/**
 * Per character: head sphere (centre and radius, as drawn), weapons read from the pose
 * returned by draw(), and whether a weapon end may touch the floor (a resting staff may).
 * Each weapon is a segment along `dir` from `base`, over [from, to] in local px.
 */
export const ARMED = {
  warrior: { head: [1.5, 0, 66, 18], weapons: P => [
    ...[P.sword, ...(P.trail?.samples ?? [])].map(s => ({ name: 'sword', base: s.hand, dir: s.dir, from: 6, to: 41 })),
  ] },
  // The EMBERBOUND Guardian keeps the warrior's body and sword.
  'eb-guardian': { head: [1.5, 0, 66, 18], weapons: P => [
    ...[P.sword, ...(P.trail?.samples ?? [])].map(s => ({ name: 'sword', base: s.hand, dir: s.dir, from: 6, to: 41 })),
  ] },
  // The Shadow Guardian and the Hollow Knight keep the Guardian's body and sword.
  'eb-shadow-guardian': { head: [1.5, 0, 66, 18], weapons: P => [
    ...[P.sword, ...(P.trail?.samples ?? [])].map(s => ({ name: 'sword', base: s.hand, dir: s.dir, from: 6, to: 41 })),
  ] },
  'eb-hollow-knight': { head: [1.5, 0, 66, 18], weapons: P => [
    ...[P.sword, ...(P.trail?.samples ?? [])].map(s => ({ name: 'sword', base: s.hand, dir: s.dir, from: 6, to: 41 })),
  ] },
  // The Coral Knight keeps the Guardian's body; the trident is held mid-shaft (butt to prong tips).
  'eb-coral-knight': { head: [1.5, 0, 66, 18], weapons: P => [{ name: 'trident', base: P.trident.hand, dir: P.trident.dir, from: -26, to: 59 }] },
  'eb-frost-revenant': { head: [1.5, 0, 66, 18], weapons: P => [{ name: 'sword', base: P.sword.hand, dir: P.sword.dir, from: -9, to: 46 }] },
  'eb-ember-tyrant': { head: [1.5, 0, 66, 18], weapons: P => [{ name: 'sword', base: P.sword.hand, dir: P.sword.dir, from: -9, to: 46 }] },
  'eb-ashen-echo': { head: [1.5, 0, 66, 18], weapons: P => [{ name: 'sword', base: P.sword.hand, dir: P.sword.dir, from: -9, to: 46 }] },
  swordsman: { head: [1.5, 0, 67, 17], weapons: P => [
    ...[P.sword, ...(P.trail?.pts ?? [])].map(s => ({ name: 'sword', base: s.hand, dir: s.dir, from: 6, to: 38 })),
  ] },
  king: { head: [1.5, 0, 69.5, 17], weapons: P => [{ name: 'sword', base: P.right, dir: P.blade, from: 6, to: 37 }] },
  'demon-king': { head: [1.5, 0, 69.5, 17], weapons: P => [{ name: 'greatsword', base: P.right, dir: P.blade, from: 6, to: 50 }] },
  // Physical z (after the skeleton's statureZ); skull radius 24 as in its own depth layering.
  // The resting side guard is fixed in front of the chest.
  skeleton: { head: [0, 0, 66, 24], weapons: P => P.attack ? [{ name: 'sword', base: P.attack.hand, dir: P.attack.dir, from: 6, to: 49 }] : [] },
  goblin: { head: [9, 0, 62, 16], weapons: P => [{ name: 'club', base: P.club, dir: P.axis, from: 4, to: 37 }] },
  'eb-ash-brute': { head: [9, 0, 63, 17], weapons: P => [{ name: 'club', base: P.club, dir: P.axis, from: 4, to: 40 }] },
  'eb-tideling': { head: [7, 0, 62, 26], weapons: P => [{ name: 'spear', base: P.spear, dir: P.axis, from: -24, to: 58 }] },
  mage: { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -38, to: 53, floor: false }] },
  'eb-arcanist': { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -38, to: 54, floor: false }] },
  'eb-shadow-arcanist': { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -38, to: 54, floor: false }] },
  'eb-oracle': { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -38, to: 54, floor: false }] },
  'eb-shadow-oracle': { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -38, to: 54, floor: false }] },
  'dark-mage': { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -36, to: 40, floor: false }] },
  'eb-geomancer': { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -36, to: 54, floor: false }] },
  'eb-abyssal-herald': { head: [1.5, 0, 71, 17], weapons: P => [{ name: 'staff', base: P.staff, dir: P.staffAxis, from: -36, to: 54, floor: false }] },
};


function inside([a, b, z], [ha, hb, hz, hr]) {
  if (z > TORSO.z0 && z < TORSO.z1 && (a / (TORSO.A - MARGIN)) ** 2 + (b / (TORSO.B - MARGIN)) ** 2 < 1) return 'torso';
  if (Math.hypot(a - ha, b - hb, z - hz) < hr - MARGIN) return 'head';
  return null;
}

/** First problem with one weapon segment, or null. */
export function weaponProblem(weapon, head) {
  const grip = inside(weapon.base, head);
  if (grip) return `${weapon.name} grip inside ${grip}`;
  for (let s = weapon.from; s <= weapon.to; s += 2.5) {
    const hit = inside(weapon.base.map((v, k) => v + weapon.dir[k] * s), head);
    if (hit) return `${weapon.name} inside ${hit} at ${s}`;
  }
  if (weapon.floor !== false) {
    const low = Math.min(...[weapon.from, weapon.to].map(s => weapon.base[2] + weapon.dir[2] * s));
    if (low < -MARGIN) return `${weapon.name} end below the floor (${low.toFixed(1)})`;
  }
  return null;
}

/** Every side-view problem of one character: [{ direction, action, phase, problem }]. */
export function sideProblems(definition, samples = 400) {
  const spec = ARMED[definition.id], out = [];
  for (const direction of ['R', 'L']) for (const [action, a] of Object.entries(definition.actions)) {
    for (let i = 0; i <= samples; i++) {
      const u = i / samples, info = definition.draw(noopCanvas, 0, 0, direction, action, u * a.period, 1, {});
      for (const weapon of spec.weapons(info.pose)) {
        const problem = weaponProblem(weapon, spec.head);
        if (problem) { out.push({ direction, action, phase: u, problem }); break; }
      }
    }
  }
  return out;
}
