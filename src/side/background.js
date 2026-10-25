/**
 * Inkstone — 横スクロールの背景 (層ごとの区画キャッシュ)
 *
 * 背景は層 (遠景・中景・主役の層 …) の重ね合わせ。層は parallax の速さで流れる (主役の層 = 1、奥ほど小さい)。
 * 点描の多い手描きは重いので、毎フレームは描かない。層を幅 CHUNK 論理 px の区画に切って画像に焼き込み、
 * 映っている区画だけを貼る。区画は倍率・DPR・キャンバスの大きさ・ステージが変わったときに作り直す。
 *
 * テーマの層 = { id, parallax, draw(g, view) }。g は区画に合わせて変換済みで、層の座標 (x = 層の上の位置、
 * y = 地面からの高さ。下へ +) でそのまま描ける。view = { x0, x1 (この区画の層の座標の範囲), top, bottom, stage, parallax }。
 * 区画の境界をまたぐ部品も両側の区画で同じ形になるよう、部品ごとに乱数の種を決めて描くこと (seed('層-番号') など)。
 */
import { drawPaper } from '../core/ink.js';
import { placeholderTheme } from './themes/placeholder.js';

/** 区画の幅 (論理 px) */
export const CHUNK = 512;

/** 背景のテーマ (ステージの theme で選ぶ)。段階4で鉛筆画のテーマを追加する */
export const SIDE_THEMES = { placeholder: placeholderTheme };

/** 区画の幅 (デバイス px, 整数)。隣り合う区画が継ぎ目なく並ぶよう整数にそろえる */
export const chunkDeviceWidth = cam => Math.round(CHUNK * cam.dpr);

/**
 * 層のうち画面に映る区画の番号の範囲。offset = 層の左端のずれ (デバイス px, 整数)。
 * DOM に依存しない (テストから直接使える)。
 */
export function visibleChunks(cam, parallax) {
  const wd = chunkDeviceWidth(cam), offset = Math.round(cam.dpr * cam.s * cam.x * parallax);
  return { first: Math.floor(offset / wd), last: Math.floor((offset + cam.width * cam.dpr - 1) / wd), offset, wd };
}

/**
 * ステージの背景を作る。draw(ctx, cam) で紙 → 各層を貼る。
 * @param {object} stage normalizeStage 済みのステージ
 */
export function createSideBackground(stage) {
  const theme = SIDE_THEMES[stage.theme];
  if (!theme) throw new Error(`Inkstone: 未登録の背景テーマ "${stage.theme}" (登録済み: ${Object.keys(SIDE_THEMES).join(', ')})`);
  const chunks = new Map();   // `${layer}:${i}` → canvas
  let key = '', paper = null, bakeMs = 0, baked = 0;
  const release = c => { c.width = 0; c.height = 0; };
  function reset(cam) {
    const k = `${cam.width}|${cam.height}|${cam.dpr}|${cam.s}|${cam.groundY}`;
    if (k === key) return;
    key = k; for (const c of chunks.values()) release(c); chunks.clear();
    if (paper) release(paper);
    paper = document.createElement('canvas'); paper.width = Math.round(cam.width * cam.dpr); paper.height = Math.round(cam.height * cam.dpr);
    const g = paper.getContext('2d'); g.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); drawPaper(g, cam.width, cam.height);
  }
  function bake(cam, layer, i, wd) {
    const t0 = performance.now(), c = document.createElement('canvas');
    c.width = wd; c.height = Math.round(cam.height * cam.dpr);
    const g = c.getContext('2d'), k = cam.dpr * cam.s;
    g.setTransform(k, 0, 0, k, -i * wd, cam.dpr * cam.groundY);
    layer.draw(g, { x0: i * wd / k, x1: (i + 1) * wd / k, top: -cam.groundY / cam.s, bottom: (cam.height - cam.groundY) / cam.s, stage, parallax: layer.parallax });
    bakeMs += performance.now() - t0; baked++;
    return c;
  }
  return {
    theme,
    draw(ctx, cam) {
      reset(cam);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paper, 0, 0);
      for (const layer of theme.layers) {
        const { first, last, offset, wd } = visibleChunks(cam, layer.parallax);
        for (let i = first; i <= last; i++) {
          const id = `${layer.id}:${i}`;
          if (!chunks.has(id)) chunks.set(id, bake(cam, layer, i, wd));
          ctx.drawImage(chunks.get(id), i * wd - offset, 0);
        }
        // Keep one spare chunk on each side; release the rest.
        for (const [id, c] of chunks) {
          const [lid, n] = id.split(':');
          if (lid === layer.id && (Number(n) < first - 1 || Number(n) > last + 1)) { release(c); chunks.delete(id); }
        }
      }
    },
    /** 区画の数・RGBA 理論容量・焼き込み時間 */
    stats() {
      let bytes = paper ? paper.width * paper.height * 4 : 0;
      for (const c of chunks.values()) bytes += c.width * c.height * 4;
      return { theme: theme.id, chunks: chunks.size, bytesRGBA: bytes, bakedChunks: baked, bakeMs };
    },
    dispose() { for (const c of chunks.values()) release(c); chunks.clear(); if (paper) release(paper); paper = null; key = ''; },
  };
}
