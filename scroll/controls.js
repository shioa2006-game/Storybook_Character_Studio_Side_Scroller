const KEY_MOVES = Object.freeze({ ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 });

/**
 * Hold ←/→ (or A/D, or the on-screen buttons) to walk; the most recent held direction wins.
 * Space attacks once per press. Releasing everything stops.
 */
export function bindScrollControls(canvas, game, { isEnabled = () => true, onChange = () => {} } = {}) {
  const win = canvas.ownerDocument.defaultView;
  const held = [];   // [{ source, dir }] in press order
  const interactive = target => target?.closest?.('input, textarea, select, a, [contenteditable="true"], [role="slider"]');
  const apply = () => { game.setMove(held.length ? held[held.length - 1].dir : 0); onChange(); };
  const press = (source, dir) => { release(source, false); held.push({ source, dir }); apply(); };
  function release(source, update = true) {
    const i = held.findIndex(h => h.source === source);
    if (i >= 0) held.splice(i, 1);
    if (update) apply();
  }

  function keydown(event) {
    if (!isEnabled() || event.altKey || event.ctrlKey || event.metaKey || interactive(event.target)) return;
    if (event.code === 'Space') {
      // A focused button must not also activate itself.
      event.preventDefault(); if (!event.repeat) { game.attack(); onChange(); }
      return;
    }
    if (!(event.code in KEY_MOVES)) return;
    event.preventDefault();
    if (!event.repeat) press(event.code, KEY_MOVES[event.code]);
  }
  function keyup(event) { if (event.code in KEY_MOVES) release(event.code); }
  function clear() { held.length = 0; apply(); }

  /** Make a button walk while it is held (pointer or keyboard Enter/Space on the button itself). */
  function holdButton(button, dir) {
    const id = `button:${dir}`, down = e => { if (isEnabled()) { e.preventDefault(); button.setPointerCapture?.(e.pointerId); press(id, dir); } };
    const up = () => release(id);
    button.addEventListener('pointerdown', down);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, up);
    return () => { button.removeEventListener('pointerdown', down); for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.removeEventListener(type, up); };
  }

  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  win.addEventListener('keydown', keydown);
  win.addEventListener('keyup', keyup);
  win.addEventListener('blur', clear);
  return {
    clear, holdButton,
    dispose() {
      win.removeEventListener('keydown', keydown);
      win.removeEventListener('keyup', keyup);
      win.removeEventListener('blur', clear);
      clear();
    },
  };
}
