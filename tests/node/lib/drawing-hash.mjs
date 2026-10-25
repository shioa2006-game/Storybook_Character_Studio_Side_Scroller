// Side-view drawing fingerprints: every canvas call a character makes for R / L, hashed per character.
// Used to prove that a refactor (such as removing the old four-direction code) leaves the pictures unchanged.
import { createHash } from 'node:crypto';
import { isolateDrawing, DRAW_DEFAULTS } from '../../../src/core/settings.js';

const STATE_DEFAULTS = { globalAlpha: 1, lineWidth: 1, globalCompositeOperation: 'source-over', fillStyle: '#000000', strokeStyle: '#000000', lineCap: 'butt', lineJoin: 'miter' };
const fmt = v => typeof v === 'number' ? (Math.abs(v) < 5e-5 ? '0' : v.toFixed(4)) : typeof v === 'object' && v !== null ? (v.__id ?? JSON.stringify(v)) : String(v);

/** A 2D context that appends every call and property write to `log` (numbers rounded to 4 decimals). */
export function recordingContext(log) {
  let state = { ...STATE_DEFAULTS }, made = 0;
  const stack = [];
  const object = kind => {
    const id = `${kind}#${made++}`;
    return new Proxy({ __id: id }, { get: (t, k) => k in t ? t[k] : (...args) => { log.push(`${id}.${String(k)}(${args.map(fmt).join(',')})`); } });
  };
  const special = {
    save: () => { stack.push({ ...state }); log.push('save'); },
    restore: () => { if (stack.length) state = stack.pop(); log.push('restore'); },
    createLinearGradient: (...a) => { log.push(`linear(${a.map(fmt).join(',')})`); return object('gradient'); },
    createRadialGradient: (...a) => { log.push(`radial(${a.map(fmt).join(',')})`); return object('gradient'); },
    measureText: s => ({ width: String(s).length * 6 }),
    getLineDash: () => [],
  };
  return new Proxy(state, {
    get: (_, k) => k in special ? special[k] : k in state ? state[k] : k === 'canvas' ? { width: 300, height: 300 } : (...args) => { log.push(`${String(k)}(${args.map(fmt).join(',')})`); },
    set: (_, k, v) => { state[k] = v; log.push(`${String(k)}=${fmt(v)}`); return true; },
  });
}

/** Phases sampled per action (the start of every cached frame plus evenly spaced in-betweens). */
export const SAMPLES = 24;

/** sha256 of every R / L frame of one definition (and its projectile, if any). */
export function sideDrawingHash(definition) {
  const hash = createHash('sha256'), sink = { push: line => hash.update(line + '\n') };
  for (const direction of ['R', 'L']) for (const [action, spec] of Object.entries(definition.actions)) {
    for (let i = 0; i < SAMPLES; i++) {
      const time = i / SAMPLES * spec.period;
      hash.update(`${direction}/${action}/${i}\n`);
      const info = isolateDrawing({ ...DRAW_DEFAULTS }, () => definition.draw(recordingContext(sink), 0, 0, definition.directional === false ? null : direction, action, time, 1, { shadow: false }));
      if (info?.order) hash.update(`order ${JSON.stringify(info.order)}\n`);
    }
  }
  const pj = definition.projectile;
  if (pj) for (const direction of ['R', 'L']) {
    const o = pj.origin(direction);
    hash.update(`projectile ${direction} ${JSON.stringify(o, (k, v) => typeof v === 'number' ? +v.toFixed(4) : v)}\n`);
    isolateDrawing({ ...DRAW_DEFAULTS }, () => pj.draw(recordingContext(sink), o.nock, o.f, pj.length, 1));
  }
  return hash.digest('hex').slice(0, 16).toUpperCase();
}
