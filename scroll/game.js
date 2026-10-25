import { normalizeStage, clampToStage, sideWalkSecondsPerPixel, validateCharacter } from '../src/index.js';

/** The stage is data consumed by Inkstone. Movement rules live here. */
export const CHARACTER_SCALE = 1.25;
export const scrollStage = Object.freeze({ id: 'scroll-placeholder-v1', name: '仮の回廊', length: 3200, start: 260, margin: 60, theme: 'placeholder' });

/**
 * Game state only: Inkstone owns projection, poses, background and drawing.
 * Hold left/right to walk (the walk animation advances by distance, so feet never slide);
 * attack plays once in place; archers release an arrow that flies along the facing.
 */
export function createScrollGame({
  stage = scrollStage,
  characterScale = CHARACTER_SCALE,
  speed = 90,          // world px per second
  arrowSpeed = 460,    // world px per second
  arrowRange = 720,    // world px before an arrow disappears
  character = null,
} = {}) {
  const st = normalizeStage(stage), secondsPerPixel = sideWalkSecondsPerPixel(characterScale);
  if (!(Number.isFinite(speed) && speed > 0 && arrowSpeed > 0 && arrowRange > 0 && characterScale > 0)) throw new Error('Game: speed, arrowSpeed, arrowRange and characterScale must be positive');
  const unit = { id: 'hero', character: 'warrior', x: st.start, direction: 'R', action: 'idle', actionTime: 0 };
  let move = 0, walked = 0, canWalk = true, attackSpec = null, projectileSpec = null, released = false;
  let projectiles = [], nextArrow = 1, status = '待機中';

  function idle(message = '待機中') { unit.action = 'idle'; unit.actionTime = 0; status = message; }

  /** -1 = left, 0 = stop, +1 = right (held keys / buttons). Ignored while attacking. */
  function setMove(value) { move = Math.sign(value || 0); }

  function attack() {
    if (!attackSpec || unit.action === 'attack') return false;
    unit.action = 'attack'; unit.actionTime = 0; released = false; status = '攻撃中';
    return true;
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .25);   // no teleport after a background-tab stall
    for (const p of projectiles) p.distance += arrowSpeed * dt;
    projectiles = projectiles.filter(p => {
      const tip = p.x + (p.direction === 'L' ? -1 : 1) * p.distance;
      return p.distance <= arrowRange && tip >= 0 && tip <= st.length;
    });
    if (unit.action === 'attack') {
      unit.actionTime += dt;
      if (projectileSpec && !released && unit.actionTime >= projectileSpec.releaseAt * attackSpec.period) {
        released = true;
        projectiles.push({ id: `arrow-${nextArrow++}`, character: unit.character, x: unit.x, direction: unit.direction, distance: 0 });
      }
      if (unit.actionTime >= attackSpec.period) idle();
      return;
    }
    if (move) {
      unit.direction = move > 0 ? 'R' : 'L';
      const x = clampToStage(st, unit.x + move * speed * dt), dx = Math.abs(x - unit.x);
      unit.x = x;
      if (dx > 1e-9) {
        if (unit.action !== 'walk') walked = 0;
        walked += dx;
        unit.action = canWalk ? 'walk' : 'idle';
        unit.actionTime = canWalk ? walked * secondsPerPixel : unit.actionTime + dt;
        status = canWalk ? '移動中' : '移動中（待機姿勢）';
        return;
      }
      if (unit.action === 'walk') idle('ステージの端です');
      else { unit.actionTime += dt; status = 'ステージの端です'; }
      return;
    }
    if (unit.action === 'walk') idle();
    else unit.actionTime += dt;
  }

  function reset() {
    unit.x = st.start; unit.direction = 'R'; move = 0; walked = 0; projectiles = []; idle();
  }

  // Switching keeps the position and facing; never carry an unfinished attack or arrows.
  function setCharacter(definition) {
    validateCharacter(definition);
    unit.character = definition.id;
    canWalk = !!definition.actions.walk;
    attackSpec = definition.actions.attack ?? null;
    projectileSpec = attackSpec && definition.projectile ? definition.projectile : null;
    walked = 0; projectiles = []; idle();
  }

  const api = {
    unit, stage: st, update, setMove, attack, reset, setCharacter,
    get projectiles() { return projectiles.map(p => ({ ...p })); },
    get moving() { return move; },
    get status() { return status; },
    get canAttack() { return !!attackSpec; },
    snapshot() {
      return { unit: { ...unit }, status, move, walked, secondsPerPixel, speed, arrowSpeed, arrowRange,
        attackPeriod: attackSpec?.period ?? null, projectiles: api.projectiles, stage: st };
    },
  };
  if (character) setCharacter(character);
  return api;
}
