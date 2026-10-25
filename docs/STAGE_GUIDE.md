# 横スクロールの背景ガイド

横スクロール (`scroll/index.html`) の鉛筆画の背景を描く・増やすときの手引きです。描画の API は [API_REFERENCE.md](API_REFERENCE.md) §3 を見てください。

## 1. 仕組み

- 背景は **テーマ** (`src/side/themes/*.js`) です。テーマは層の重ね合わせで、層ごとに流れる速さ (`parallax`) が違います。主役の層 (キャラクターが立つ床) が 1、奥ほど小さく、キャラクターより手前の前景は 1 より大きくします。
- 点描の多い手描きは重いので、毎フレームは描きません。層を幅 512 論理 px の **区画** に切って画像へ焼き込み、映っている区画だけを貼ります (`src/side/background.js`)。区画は倍率・DPR・キャンバスの大きさ・ステージが変わると作り直します。
- 新しいテーマは `SIDE_THEMES` (`src/side/background.js`) に登録し、ステージの `theme` にそのキーを書きます。横スクロールの画面で選べるようにするには `scroll/game.js` の `SCROLL_STAGES` に足します。

| テーマ | ファイル | 層 (奥 → 手前) |
|---|---|---|
| ダンジョンの回廊 `dungeon` | `themes/dungeon.js` | 奥の回廊 .35 / 石壁・アーチの窓・松明 .8 / 敷石の床 1 / 両端の壁 1 / 前景の柱・鎖 1.3 |
| 森 `forest` | `themes/forest.js` | 空 .12 / 遠くの木立 .3 / 木 .6 / 茂み .85 / 土の小道 1 / 両端の岩 1 / 前景のシダ・枝 1.3 |
| 城下町 `town` | `themes/town.js` | 遠くの丘と城 .28 / 家並み .65 / 街灯・旗・樽 .9 / 石畳 1 / 両端の壁 1 / 前景の街灯・看板 1.3 |
| 仮の背景 `placeholder` | `themes/placeholder.js` | 段階3の簡易背景 (ステージの `theme` の既定値) |

## 2. 層の書き方

```js
export const myTheme = Object.freeze({
  id: 'my', name: '名前',
  layers: Object.freeze([
    { id: 'far', parallax: .3, opacity: .7, band: [null, FLOOR.back + 2], draw: far },
    { id: 'ground', parallax: 1, band: [FLOOR.back - 12, null], draw: ground },
    { id: 'ends', parallax: 1, spans: stage => stageEnds(stage), draw: ends },
    { id: 'front', parallax: 1.3, front: true, spans: stage => periodicSpans(stage, 1.3, 1200, [[700, 30, 30]]), draw: foreground },
  ]),
});
```

- `draw(g, view)`: 区画に焼き込む絵。`g` は区画に合わせて変換済みで、**層の座標** (x = 層の上の位置、y = 地面からの高さ。下へ +。足元 = 0) でそのまま描けます。`view = { x0, x1, top, bottom, stage, parallax }` の `x0`〜`x1` がこの区画の範囲です。
- `front: true`: キャラクターより手前に描きます。主役を隠さないよう、まばらに置きます。
- `opacity`: 遠景を淡くします。
- `band: [上端, 下端]`: この層が描く高さの範囲 (ワールド y。`null` = 画面の端)。区画の画像をその高さだけ作るので、メモリが減ります。**帯の外の絵は切れる** ので、描く範囲より少し広く取ります。
- `spans: stage => [[x0, x1], …]`: 絵がある範囲 (層の座標)。範囲外の区画は作りません。まばらな前景と両端の壁に使います。
- `dynamic(g, view, time)`: 毎フレーム描く軽い動き (松明の炎)。区画には焼き込みません。

## 3. 鉛筆画のコツ

- **乱数の種は部品ごとに決める**。部品を描く前に `seed('テーマ-部品-番号')` を呼びます。区画の境界をまたぐ部品は両側の区画で別々に描かれるので、種が部品ごとでないと継ぎ目で形がずれます。乱数を使わない揺れは `wave(x, …)` で作ります。
- **繰り返しは `each(view, step, pad, fn, offset)`**。間隔 `step` の n 番目の部品を、区画にかかる分だけ呼びます。`pad` は部品のはみ出し幅です (足りないと区画の端で部品が切れる)。
- **奥ほど薄く・細く**。遠景は `opacity` と細い線、点描を少なく。手前ほど線を太くし、二度描き (`inkLine` の `double`) を増やします。
- **床は壁と違う石に見せる**。壁は背の高い石を密な点描で、床は長く淡い敷石を薄い点描で描くと、床が壁に見えません (ダンジョンの例)。
- **木の葉は岩に見せない**。輪郭を `|sin|` の波で丸く刻み (`blob`)、明るい緑で塗ります。遠くの針葉樹は3段の三角形にします (森の例)。
- **大きさはキャラクターに合わせる**。戦士は頭の飾りまで約 140 ワールド px で、画面に映る高さ 360 px の約4割です。家や城を大きくしすぎると、キャラクターが小人に見えます。
- **両端の壁は `stageEnds(stage)` の範囲に描く**。カメラは 0〜length の外を映さないので、壁は少しだけステージの内側へ入れて画面の端に見せます。内側の面は `endFace` で描きます。

## 4. 共通の部品 (`themes/pencil.js`)

| 部品 | 内容 |
|---|---|
| `FLOOR` | 床の帯 `{ back: -26, front: 16, slab: 54 }` (奥の縁・手前の縁・縁石の下端) |
| `each(view, step, pad, fn, offset)` | 間隔ごとの部品を区画にかかる分だけ呼ぶ |
| `stoneCourse(view, key, phase, cb, { span, minL, maxL })` | 石積みの1段の割り付け (区間ごとに種を決めるので、どの区画から描いても同じ) |
| `frontStone(g, x0, y0, x1, y1, o)` / `stoneTop(…)` | 正面から見た石 / 上から見た石の天端 |
| `strokes(g, list, o)` | 草・葉の短い描線の束 |
| `periodicSpans(stage, parallax, step, items)` / `stageEnds(stage)` | `spans` の範囲を作る |
| `endFace(g, x, side, top, bottom, o)` | 両端の壁の内側の面 |
| `wave(x, a, f, p)` | 乱数を使わない滑らかな揺れ |

線・塗り・点描・ハッチングはキャラクターと同じ `src/core/ink.js` (`inkLine`・`inkShape`・`stipplePoly`・`hatchPoly`・`faceCracks`) と `src/core/paint.js` (`paint`) を使います。

## 5. 確認

- **背景だけを見る**: [side-stage.html](../tests/browser/side-stage.html) を開きます (サーバー経由)。`?theme=forest&x=1200` で場所を指定、`w` / `h` でキャンバスの大きさ、`zoom` で拡大、`character=none` でキャラクターなし、`dir=L` で向き、`t` で時刻 (炎の揺れ)、`mark=1` で区画の境界線を表示します。継ぎ目は `mark=1&zoom=3` で境界をまたぐ石・木がずれていないかを見ます。
- **歩いて見る**: `scroll/index.html?stage=town` または画面の「場所を選ぶ」。両端 (x = 60 と 3140) まで歩いて壁が見えること、「開発者向け情報」の `background` で区画の数と容量 (`bytesRGBA`) を確かめます。
- **自動の検査**: `tests/node/side-themes.test.mjs` が、全テーマの層の形、同じ区画を2回描いて同じ絵になること (種の決め忘れ)、線が `band` の外へ出ていないこと (帯で切れる絵) を調べます。
