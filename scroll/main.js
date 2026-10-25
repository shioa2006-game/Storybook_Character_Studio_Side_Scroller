import { createSideRenderer } from '../src/index.js';
import { catalog, findCharacter } from '../characters/catalog.js';
import { createScrollGame, SCROLL_STAGES, CHARACTER_SCALE } from './game.js';
import { bindScrollControls } from './controls.js';

const $ = id => document.getElementById(id);
const canvas = $('scroll');
const params = new URL(location.href).searchParams;
let selected = findCharacter(params.get('character')) || findCharacter('warrior') || catalog[0];
let stage = SCROLL_STAGES[params.get('stage')] || SCROLL_STAGES.dungeon;
const renderer = createSideRenderer({ canvas, width: 960, height: 540, characters: [], characterScale: CHARACTER_SCALE, lineBoil: true, footFix: true });
for (const entry of catalog) renderer.registerCharacter(entry.definition);
renderer.setStage(stage);
const game = createScrollGame({ stage, characterScale: CHARACTER_SCALE, character: selected.definition });
let mode = 'live', last = null, sceneTime = 0, resizeTimer, request = 0, raf = 0, disposed = false;
const errors = [];
function showError(error) {
  const message = error instanceof Error ? error.message : String(error);
  errors.push(message); $('app-message').textContent = `表示エラー: ${message}`;
}
window.addEventListener('error', e => showError(e.error || e.message));
window.addEventListener('unhandledrejection', e => showError(e.reason));
const controls = bindScrollControls(canvas, game);
const releaseHold = [controls.holdButton($('walk-left'), -1), controls.holdButton($('walk-right'), 1)];

for (const [key, s] of Object.entries(SCROLL_STAGES)) {
  const option = document.createElement('option');
  option.value = key; option.textContent = s.name;
  $('stage-select').append(option);
}
$('stage-select').value = stage.theme;
$('stage-select').addEventListener('change', e => {
  const next = SCROLL_STAGES[e.target.value];
  if (!next) return;
  stage = next; renderer.setStage(stage).centerOn(game.unit.x);
  const url = new URL(location.href); url.searchParams.set('stage', e.target.value); history.replaceState(null, '', url);
  canvas.focus({ preventScroll: true });
});
for (const entry of catalog) {
  const option = document.createElement('option');
  option.value = entry.id; option.textContent = entry.name;
  $('character-select').append(option);
}
function updateCharacter() {
  $('character-select').value = selected.id;
  $('character-name').textContent = selected.name;
  $('character-category').textContent = selected.category;
  $('character-description').textContent = selected.description;
  $('gallery-detail').href = `../index.html#character/${encodeURIComponent(selected.id)}`;
  const labels = { idle: '待機', walk: '歩行', attack: '攻撃', cast: '詠唱・スキル', hurt: '被弾', dead: '戦闘不能' }, def = selected.definition;
  const notes = [`${selected.directions.length ? '左右' : '方向なし'} / ${selected.actions.map(a => labels[a] || a).join('・')}`];
  if (!selected.actions.includes('walk')) notes.push('歩行アニメーションは未対応です。待機姿勢のまま移動します');
  if (!selected.actions.includes('attack')) notes.push('攻撃は未対応です。Spaceは無効です');
  if (def.projectile) notes.push('攻撃で矢を放ちます');
  $('capability-note').textContent = notes.join('。') + '。';
  $('attack').disabled = !game.canAttack;
  $('attack').textContent = game.canAttack ? '攻撃する（Space）' : '攻撃は未対応';
  const url = new URL(location.href); url.searchParams.set('character', selected.id);
  history.replaceState(null, '', url);
}
$('character-select').addEventListener('change', e => {
  const entry = findCharacter(e.target.value);
  if (!entry) return;
  request++; controls.clear();
  game.setCharacter(entry.definition); selected = entry;
  renderer.disposeCaches(); $('app-message').textContent = '';
  if (mode === 'cached') renderer.prepareCaches([selected.id]);
  updateCharacter(); render(0); updateDiagnostics();
});
$('reset').addEventListener('click', () => { controls.clear(); game.reset(); renderer.centerOn(game.unit.x); canvas.focus({ preventScroll: true }); });
$('attack').addEventListener('click', () => { game.attack(); canvas.focus({ preventScroll: true }); });
async function setMode(value) {
  const token = ++request;
  $('app-message').textContent = value === 'cached' ? `${selected.name}のキャッシュを準備しています…` : '';
  await new Promise(resolve => setTimeout(resolve, 0));
  if (disposed || token !== request) return;
  if (value === 'cached') renderer.prepareCaches([selected.id]);
  else renderer.disposeCaches();
  mode = value; renderer.setMode(mode);
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  $('app-message').textContent = ''; updateDiagnostics();
}
for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => setMode(button.dataset.mode).catch(showError));

function resize() {
  if (disposed) return;
  const wrap = document.querySelector('.scroll-canvas-wrap');
  const width = Math.round(wrap.clientWidth), height = Math.round(wrap.clientHeight), dpr = Math.min(2, devicePixelRatio || 1);
  const camera = renderer.getCamera();
  if (width && height && (camera.width !== width || camera.height !== height || camera.dpr !== dpr)) {
    renderer.resize(width, height, dpr).centerOn(game.unit.x);
    if (mode === 'cached') renderer.prepareCaches([selected.id]);
  }
}
const observer = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
observer.observe(document.querySelector('.scroll-canvas-wrap'));
document.addEventListener('visibilitychange', () => { last = null; controls.clear(); });
function render(dt) {
  game.update(dt);
  renderer.follow(game.unit.x);
  renderer.render({ timeSeconds: sceneTime, units: [game.unit], projectiles: game.projectiles });
  const facing = selected.directions.length ? ` · ${game.unit.direction === 'R' ? '右向き' : '左向き'}` : '';
  $('game-state').textContent = `${game.status}${facing}`;
  $('position').textContent = `${stage.name} · 位置 ${Math.round(game.unit.x)} / ${stage.length}`;
}
function snapshot() { return { character: selected.id, stage: stage.theme, mode, game: game.snapshot(), renderer: renderer.getDiagnostics(), errors: [...errors] }; }
function updateDiagnostics() { if ($('diagnostics').open) $('diagnostic-output').textContent = JSON.stringify(snapshot(), null, 2); }
$('refresh-diagnostics').addEventListener('click', updateDiagnostics);
$('diagnostics').addEventListener('toggle', updateDiagnostics);
function tick(now) {
  if (disposed) return;
  const dt = last === null || document.hidden ? 0 : Math.min((now - last) / 1000, .05); last = now; sceneTime += dt;
  try { if (!document.hidden) render(dt); } catch (error) { showError(error); return; }
  raf = requestAnimationFrame(tick);
}
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disposed = true; request++; cancelAnimationFrame(raf); clearTimeout(resizeTimer); observer.disconnect();
  releaseHold.forEach(fn => fn()); controls.dispose(); renderer.dispose();
});
// For browser checks: the live game and renderer of this page.
window.__scroll = { game, renderer, snapshot };
updateCharacter(); resize(); render(0); raf = requestAnimationFrame(tick);
