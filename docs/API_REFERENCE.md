# Inkstone API リファレンス (v0.1.0)

```js
import { createSideRenderer, createCharacterView, /* … */ } from './src/index.js';
```

## 1. 公開されているもの (`src/index.js`)

| 名前 | 種類 | 内容 |
|---|---|---|
| `createSideRenderer(options)` | 関数 | 横スクロールのステージとキャラクターを描く Renderer を作る (§2) |
| `createCharacterView(options)` | 関数 | キャラクター1体の確認用の描画 (§7) |
| `STAGE_DEFAULTS` / `normalizeStage(stageData)` / `clampToStage(stage, x)` | 定数・関数 | ステージデータの既定値・検査・立てる範囲 (§3) |
| `SIDE_THEMES` / `SIDE_CHUNK` / `SIDE_VIEW_HEIGHT` | 表・定数 | 背景テーマ (`dungeon` / `forest` / `town` / `placeholder`)・背景の区画の幅 (512 論理 px)・縦に映るワールドの高さ (360 px) |
| `createCharacterRegistry(defs?)` | 関数 | キャラクター登録簿を作る (§6) |
| `validateCharacter(def)` | 関数 | キャラクター定義を検査する (不足があればエラー) |
| `BUILTIN_CHARACTERS` | 配列 | 組み込みのキャラクター定義 `[swordsman, archer, skeleton]` |
| `swordsman` / `archer` / `skeleton` | 定義 | 組み込みのキャラクター定義 (§5) |
| `ARCHER_ATTACK_KEYS` | 配列 | 弓使いの射撃のコマ割り (20コマ、離れ 0.75 を含む) |
| `frameKeysOf(actionSpec)` | 関数 | 動作のコマ割り (各コマの開始位相) |
| `sideWalkSecondsPerPixel(scale)` | 関数 | 画面上を1px歩く間に進めるアニメ時間 (秒)。足を滑らせないため |
| `SIDE_VIEW_ANGLE` | 定数 | 横向きの視点の角度 (真横から手前へ 25°、ラジアン)。脚と足運びはこの角度で描く |
| `SIDE_CHEST_TURN` | 定数 | 上半身だけをさらにカメラ側へひねる角度 (20°、ラジアン)。胴を斜め 45° の幅で見せる |
| `SIDE_DIRECTIONS` / `ACTIONS_LIST` | 定数 | 向き `R` (右) / `L` (左) と画面の横の向き `sign` / 人型の動作 (idle/walk/attack) |
| `PALETTE` | 定数 | 色 |
| `VERSION` | 文字列 | ライブラリの版 |

新しい職業を「描く」ための部品 (線・塗り・リグなど) は `src/authoring.js` にあります (`docs/CHARACTER_GUIDE.md`)。

## 2. Renderer の生成と破棄

```js
const renderer = createSideRenderer({
  canvas,               // 必須。描画先の <canvas>
  mode: 'live',         // 'live' (既定) | 'cached' (右向き・左向きの2方向のコマを作る)
  width: 960,           // 論理サイズ (CSS px)。キャンバスの実画素は width × dpr にする
  height: 540,
  dpr: 2,               // 既定: min(2, devicePixelRatio)
  characterScale: 1.25, // キャラの表示倍率 (ワールド px / キャラのローカル px)
  footOffset: 0,        // 足元を下げる描画だけの補正 (ワールド px)
  lineBoil: true,       // 線のゆらぎ (キャラの線を数 fps で描き直す)
  footFix: true,        // 足の接地補正 (滑り防止)
  characters: [...],    // 最初に登録するキャラクター定義 (既定: 剣士・弓使い・骸骨)
  stage: { id: 'hall', length: 3200, start: 260, margin: 60, theme: 'dungeon' },   // 最初のステージ (setStage と同じ)
});
renderer.dispose();     // キャッシュと背景の画像を解放。以後の呼び出しはエラー
```

- キャンバスの **CSS 上の大きさ** はアプリ側で決めてください (Renderer は実画素の大きさだけを設定します)。
- 1ページに複数の Renderer を作れます。カメラ・背景・キャッシュ・設定・登録簿はインスタンスごとに独立しています。
- 描画の規則 (移動・攻撃・矢がどこまで飛ぶか) はゲーム側です (例: `scroll/game.js`)。

## 3. ステージと背景

```js
renderer.setStage(stageData);   // 背景を作り直し、カメラを開始位置の中央へ
renderer.stage                  // 内部形式のステージ (読み取り専用として扱う)
```

| キー | 既定値 | 内容 |
|---|---|---|
| `id` | `''` | 名前 (診断情報に出る) |
| `name` | `''` | 表示名 |
| `length` | 2400 | ステージの長さ (ワールド px。200 以上) |
| `start` | 240 | 開始位置 (`margin` 〜 `length − margin`) |
| `margin` | 40 | キャラクターが立てない左右の余白 (`clampToStage` で収める) |
| `theme` | `'placeholder'` | 背景テーマ (`SIDE_THEMES` のキー)。鉛筆画の `dungeon` / `forest` / `town` |

- **ワールド座標**: x = ステージの左端からの距離 (右へ +)、y = 地面からの高さ (下へ +、足元 = 0)。単位はワールド px。縦に `SIDE_VIEW_HEIGHT` (360) px が映るよう倍率が決まり、地面は画面の高さの 74% の位置です。
- **背景**: テーマの層を幅 `SIDE_CHUNK` の区画に焼き込み、映る区画だけを貼ります。倍率・DPR・キャンバスの大きさ・ステージが変わると作り直します。区画はスクロールの向きの側に1枚だけ先に作り、通り過ぎた区画は捨てます。
  層 = `{ id, parallax, draw(g, view), front?, opacity?, band?, spans?, dynamic? }`。`draw` は層の座標 (x = 層の上の位置、y = 地面からの高さ) で描き、`view = { x0, x1, top, bottom, stage, parallax }`。`front` はキャラクターより手前、`opacity` は貼るときの不透明度、`band: [上端, 下端]` は描く高さの範囲 (ワールド y。`null` = 画面の端。区画をその高さだけ作る)、`spans: stage => [[x0, x1], …]` は絵がある範囲 (範囲外の区画は作らない)、`dynamic(g, view, time)` は毎フレーム描く動き。テーマの作り方は [STAGE_GUIDE.md](STAGE_GUIDE.md)。

## 4. 描画 (1フレーム)

```js
const info = renderer.render({
  timeSeconds,                      // 画面全体の演出の時刻 (秒): 松明の炎など
  units: [Unit, ...],
  projectiles: [Projectile, ...],   // 省略可
});
// info = { totalMs, characterMs, warnings: [] }
```

描画順は、紙と奥の背景の層 → 背景の動き → 足元の影 → キャラクター (x の小さい順) → 飛んでいる矢 → 前景の層です。

### Unit

| キー | 必須 | 内容 |
|---|---|---|
| `id` | | 名前 (警告に出る) |
| `character` | ✔ | 登録されたキャラクターの id (`'swordsman'` など) |
| `x` | ✔ | ステージ上の位置 (ワールド px) |
| `direction` | ✔ (向きのあるキャラ) | `'R'` (右向き) / `'L'` (左向き) |
| `action` | | `'idle'` (既定) / `'walk'` / `'attack'`。定義にない動作は idle で描き、`info.warnings` に記録 |
| `actionTime` | | その動作を始めてからの秒数 (既定 0) |

### アニメーション時刻の指定

- 待機・攻撃: `actionTime` = 動作を始めてからの経過秒数。攻撃の長さは定義の `actions.attack.period` (剣士 1.15 秒・弓使い 1.7 秒)。攻撃が終わったら待機へ戻すのはゲームの仕事です。
- 歩行: `actionTime` = **横に歩いた距離 (ワールド px) × `sideWalkSecondsPerPixel(characterScale)`** にすると、画面上で足が床を滑りません (経過時間で進めると移動速度と足の動きがずれます)。
- 弓使いの矢を放つ瞬間: 攻撃の位相 `projectile.releaseAt` (0.75) × 周期。そのときにゲーム側で矢を生成し、以後は `projectiles` として渡します。
- `timeSeconds` はキャラの動作とは独立した「画面の時刻」です (炎の揺れ。ゲームの一時停止中も進めてよい)。

### Projectile (飛んでいる矢)

| キー | 内容 |
|---|---|
| `character` | 放ったキャラの id (矢の形・放つ位置は定義の `projectile` から) |
| `x` | 放った瞬間の射手の足元の位置 |
| `direction` | 放った向き (`'R'` / `'L'`) |
| `distance` | 進んだ距離 (ワールド px。ゲームが時間 × 速さで決める) |

矢は定義の `projectile.origin(direction)` の矢筈の位置から、画面の水平に向きの側へ進みます。

## 5. キャラクター定義 (CharacterDefinition)

```js
{
  id: 'archer', label: '弓使い', kind: 'humanoid',       // kind は説明用 ('humanoid' | 'sprite')
  directional: true,                                     // false = 向きなし
  draw(ctx, x, y, direction, action, time, scale, opts), // (x, y) = 足元。direction = 'R' | 'L'。opts.shadow === false なら影を描かない。戻り値は { pose, order } を推奨 (CHARACTER_GUIDE.md §1)
  actions: {
    idle:   { period: 2.856, frames: 16 },               // 等間隔のコマ数
    walk:   { period: 0.714, frames: 10 },
    attack: { period: 1.7, keys: [0, 0.07, …], once: true, releaseAt: 0.75 },   // 不等間隔のコマ割り
  },
  frameBox: { x0: -74, x1: 74, y0: -124, y1: 20 },       // Cached Frames の1コマの範囲 (ローカル px)
  projectile: { type: 'arrow', releaseAt, origin(direction) → { nock: {x, y}, f: [fx, fy] }, draw(ctx, p, d, len, lw), length },
  equipment: { leftHand: 'bow', rightHand: 'string', back: 'quiver' },   // 説明用
}
```

組み込み: `swordsman` (左右 80コマ)・`archer` (92コマ)・`skeleton` (108コマ)。追加の手順は `docs/CHARACTER_GUIDE.md`、横向きの仕上げ方は `docs/SIDE_VIEW_GUIDE.md`。

## 6. キャラクター登録

```js
renderer.registerCharacter(def);   // 検査して登録 (同じ id は置き換え。その id のキャッシュは次の描画で作り直す)
renderer.getCharacter('archer');   // 定義 (未登録ならエラー)
renderer.hasCharacter('mage');     // true / false
renderer.listCharacters();         // 登録順の定義の配列 (UI の一覧を作るのに使う)

const registry = createCharacterRegistry([swordsman, archer]);   // 単独の登録簿 (CharacterView で共有できる)
registry.register(def); registry.get(id); registry.list(); registry.has(id); registry.unregister(id);
```

登録簿は Renderer ごとに別々です (一方への登録はもう一方に影響しません)。

## 7. CharacterView (キャラクター1体の確認用)

```js
const view = createCharacterView({ canvas, width: 420, height: 470, scale: 2.9, mode: 'live', lineScale: 0.72, registry, directions: ['R', 'L'] });
view.render({ character: 'archer', direction: 'R', action: 'attack', actionTime: 1.2,
              originX, originY, tile: true, clear: true, clip: { x, y, w, h }, projectile: true });
view.setMode('cached'); view.setScale(1.5); view.setOptions({ lineBoil, footFix, lineScale }); view.resize(w, h, dpr);
view.getDiagnostics(); view.disposeCaches(); view.dispose();
```

`directions` は Cached Frames で作る向きです (既定 `['R', 'L']`)。`direction` の既定は `directions` の先頭です。`tile: true` で足元に下敷きのタイルと向きの矢印を描きます。

`render` は Live のとき定義の `draw` が返す情報 (手・武器の位置など) を返します。`clip` と `clear: true` を組み合わせると、1枚のキャンバスに一覧を並べられます。

## 8. カメラ

```js
renderer.follow(hero.x, zone);   // 追従 (画面中央の遊び zone (既定 0.12) の外へ出たときだけ動き、ステージの端で止まる)
renderer.centerOn(x);            // x を画面の中央に置く
renderer.getCamera();            // { x, scale, groundY, dpr, width, height }
renderer.resize(width, height, dpr);
renderer.worldToScreen(x, y = 0);   // → 論理キャンバス座標 (CSS px)
renderer.screenToWorld(px, py);     // → ワールド座標 { x, y }
renderer.characterScale;
```

倍率または DPR が変わると、背景の区画とキャラのコマを次の描画で作り直します。

## 9. 方式・設定・キャッシュ

```js
renderer.setMode('live' | 'cached');
renderer.setOptions({ lineBoil, footFix });   // 変えた設定に合わせて、コマは次に使うときに作り直す
renderer.getOptions();                        // { mode, lineBoil, footFix, characterScale, footOffset }
renderer.prepareCaches(ids?);    // コマを今すぐ作る (既定: 登録済み全部)。→ { id: { frames, bytesRGBA, buildMs } }
renderer.disposeCaches(ids?);    // 破棄 (既定: 全部)
```

`prepareCaches` を呼ばずに Cached で描くと、最初に必要になったフレームで同期生成します (その間画面が止まる)。

## 10. 診断情報

```js
renderer.getDiagnostics();
// {
//   mode, options, camera, characterFrameScale, stage,
//   lastFrame: { totalMs, characterMs, warnings },
//   background: { theme, chunks, bytesRGBA, bakedChunks, bakeMs },
//   caches: { characters: { id: { frames, bytesRGBA, buildMs, frameW, frameH, k } }, totalFrames, totalBytesRGBA },
//   syncPauses: [{ id, ms, frames, at }],   // キャッシュの同期生成の記録
//   memoryNote: 'bytesRGBA は幅×高さ×4 の理論値 …',
// }
```

`totalMs` は `render()` の中の CPU 時間です (GPU での塗りの時間は含みません)。
