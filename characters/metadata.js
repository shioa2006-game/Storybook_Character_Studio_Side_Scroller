import { validateCharacter, SIDE_DIRECTIONS, frameKeysOf } from '../src/index.js';

export function normalizeEntry(entry) {
  const def = validateCharacter(entry.definition), meta = entry.studio;
  const fail = message => { throw new Error(`${entry.source || def.id}: ${message}`); };
  if (!/^[a-z][a-z0-9-]*$/.test(def.id)) fail('IDは英小文字から始まる英小文字・数字・ハイフンにしてください');
  if (!meta || !['name', 'category', 'description'].every(k => typeof meta[k] === 'string' && meta[k].trim())) fail('studio.name / category / description が必要です');
  const directions = def.directional === false ? [] : (meta.directions || Object.keys(SIDE_DIRECTIONS));
  if (def.directional === false && meta.directions?.length) fail('directional:false に方向は指定できません');
  if (def.directional !== false && (!Array.isArray(directions) || !directions.length || new Set(directions).size !== directions.length || directions.some(d => !SIDE_DIRECTIONS[d]))) fail('対応方向には重複のない R (右) / L (左) を指定してください');
  if (def.directional !== false && directions.length !== 2) fail('Studioのキャッシュは左右2方向を一括生成します。方向ありの定義は右・左の両方を実装してください');
  for (const [action, spec] of Object.entries(def.actions)) {
    if (!Number.isFinite(spec.period) || (!spec.keys && (!Number.isInteger(spec.frames) || spec.frames < 1)) || frameKeysOf(spec).some(n => !Number.isFinite(n))) fail(`actions.${action} の周期・コマ割りが不正です`);
  }
  if (Object.values(def.frameBox).some(v => !Number.isFinite(v))) fail('frameBoxは有限の数値にしてください');
  const preview = { direction: directions.includes('R') ? 'R' : directions[0] || null, phase: 0, ...meta.preview };
  if ((directions.length && !directions.includes(preview.direction)) || (!directions.length && preview.direction !== null)) fail('preview.direction が対応方向にありません');
  if (!Number.isFinite(preview.phase) || preview.phase < 0 || preview.phase >= 1) fail('preview.phase は0以上1未満です');
  if (meta.order !== undefined && !Number.isFinite(meta.order)) fail('studio.order は数値にしてください');
  return Object.freeze({ ...entry, id: def.id, name: meta.name, category: meta.category, description: meta.description, order: meta.order ?? Infinity,
    directions: Object.freeze([...directions]), actions: Object.freeze(Object.keys(def.actions)), preview: Object.freeze(preview) });
}

export function buildCatalog(entries) {
  const seen = new Map();
  // Entries with studio.order come first in that order; the rest keep their registration order after them.
  return Object.freeze(entries.map(entry => {
    const item = normalizeEntry(entry);
    if (seen.has(item.id)) throw new Error(`ID重複「${item.id}」: ${seen.get(item.id)} と ${item.source}`);
    seen.set(item.id, item.source); return item;
  }).sort((a, b) => a.order === b.order ? 0 : a.order - b.order));
}
