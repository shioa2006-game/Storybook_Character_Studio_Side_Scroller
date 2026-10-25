# Inkstone アーキテクチャ

## 1. モジュール構成

```
src/
├─ index.js              ゲーム向けの公開 API (createSideRenderer など)。新しいゲームはここだけを import する
├─ authoring.js          制作者向けの描画部品 (新しい職業を描くときに import する)
├─ core/                 描画の基本技術 (ゲームにも背景にも依存しない)
│  ├─ random.js            シード付き乱数 (mulberry32)。状態の保存・復元
│  ├─ settings.js          描画設定 DRAW (線幅・線のゆらぎ・足の接地補正) と isolateDrawing
│  ├─ geometry.js          点・補間・外接矩形・楕円・凸包などの幾何、床の奥行きの比 (TW / TH)
│  ├─ palette.js           色 PAL
│  ├─ ink.js               手描き表現: 揺らぎ線・角丸・塗り・二度描き・点描・ハッチング・紙・ひび
│  └─ paint.js             色の濃淡の塗り paint (同色の濃い陰 + 点描 + 輪郭)・線の太さの階層 LW・先細りの形
├─ characters/           キャラクター
│  ├─ rig.js               共通人体リグ: 向き (右 R / 左 L と上半身のひねり)・rigFrame・walkFeet・ik2・bodyLayerKey・renderRig・接地補正・travelDir / chestToLegs
│  ├─ painting.js          人物の立体部品: ミトン形の手・太さのある脚とブーツ
│  ├─ swordsman.js         剣士 (姿勢・顔・フード・剣・盾・組み立て・定義)
│  ├─ archer-pose.js       弓使いの姿勢・弓と弦の幾何・矢の形
│  ├─ archer-parts.js      弓使いの部品 (髪・顔・胴着・ケープ・矢筒・弓)
│  ├─ archer.js            弓使いの組み立て (描画順の補正) と定義
│  ├─ skeleton.js          骸骨 (専用骨格寸法・上半身用の投影 JU / WU) と定義
│  └─ registry.js          キャラクター登録簿 (検査・登録・取得)・コマ割り
├─ side/                 横スクロールの描画
│  ├─ stage.js             ステージデータの検査と既定値 (長さ・開始位置・余白・背景テーマ)
│  ├─ camera.js            カメラ (高さから倍率・地面の位置、追従と端で止める、座標変換)
│  ├─ background.js        背景の層を区画ごとに画像へ焼き込んで使い回す仕組み (高さの帯・絵のある範囲だけ作る)、テーマの登録 SIDE_THEMES
│  ├─ themes/pencil.js     テーマで共有する鉛筆画の部品 (床の帯、繰り返し、石積みの割り付け、正面の石、両端の壁)
│  ├─ themes/dungeon.js    ダンジョンの回廊 (奥の回廊・石壁とアーチの窓・松明と炎・敷石・前景の柱と鎖)
│  ├─ themes/forest.js     森の小道 (空・遠くの木立・木・茂み・土の小道・前景のシダと枝)
│  ├─ themes/town.js       城下町の通り (遠くの城・木組みの家並み・街灯と旗・石畳・前景の街灯と看板)
│  ├─ themes/placeholder.js 仮の背景 (ステージの theme の既定値)
│  └─ renderer.js          SideRenderer (背景 → 足元の影 → キャラ → 飛んでいる矢 → 前景)
└─ rendering/            Renderer と CharacterView が共有する描画の道具
   ├─ camera.js            DPR の既定値
   ├─ cache.js             Cached Frames のコマのストア (共有・作り直し・破棄・統計)、コマ1枚の画像 frameCanvas
   ├─ effects.js           足元の影
   └─ character-view.js    CharacterView (1体の確認用の描画。Studio が使う)
```

ゲームの規則 (移動・攻撃・矢がどこまで飛ぶか・入力の解釈) は `src/` にはありません。横スクロールの確認画面では `scroll/game.js` (規則) と `scroll/controls.js` (入力) にあります。

## 2. 依存関係

矢印は「import する側 → される側」。循環はありません。

```
index.js ──► side/renderer.js, side/{stage, background, camera}, rendering/character-view.js, characters/registry.js, characters/rig.js
side/renderer.js ──► side/{stage, camera, background}, rendering/{cache, effects, camera}, characters/registry, characters/rig, core/*
side/background.js ──► side/themes/*, core/ink
side/themes/* ──► side/themes/pencil, core/{ink, paint, random, palette, geometry}
rendering/character-view.js ──► rendering/{cache, effects, camera}, characters/registry, characters/rig, core/*
rendering/cache.js ──► effects, characters/registry, characters/rig
characters/registry.js ──► swordsman, archer, skeleton
characters/{swordsman, archer*, skeleton}.js ──► characters/rig, characters/painting, core/*
core/{ink, paint}.js ──► core/random, core/geometry, core/palette, core/settings
```

`core/` は何にも依存しない層、`characters/` は `core/` だけに依存する層、`side/` と `rendering/` はその上の層です。

## 3. 描画の流れ (1フレーム)

`renderer.render(frame)` の中で、次の順に描きます。

1. 描画設定 (線幅・ゆらぎ・接地補正) と乱数状態を、この Renderer のものに切り替える
2. 紙と、キャラクターより奥の背景の層 (焼き込んだ区画を貼る)
3. 背景の動き (松明の炎など。`timeSeconds` で揺れる)
4. 全ユニットの足元の影
5. ユニット (x の小さい順)
6. 飛んでいる矢
7. キャラクターより手前の前景の層
8. 描画設定と乱数状態を元に戻す

## 4. ワールド座標と画面座標

```
ワールド (x, y)        x = ステージの左端からの距離 (右へ +)、y = 地面からの高さ (下へ +、足元 = 0)
   │ カメラ (x, s, groundY)  論理 = (s × (x − カメラの x), groundY + s × y)。縦に 360 ワールド px が映る倍率 s、地面は画面の高さの 74%
論理座標 (CSS px)       キャンバスの見た目の大きさ
   │ × dpr
デバイス座標 (実画素)
```

- ユニットの位置 x はゲームが決めます。描画だけの補正 (足元を下げる `footOffset`・キャラの倍率 `characterScale`) は Renderer の設定で、位置は変えません。
- 背景の層は `parallax` の速さで流れます (層の座標 = カメラの x × parallax)。
- キャラクターの中では、体の座標系 (a = 前、b = 左、z = 上) を前ベクトルで投影します (`characters/rig.js`)。右向き・左向きは左右反転ではなく、別の向きとして投影するので、持ち手は体の左右のまま保たれます (`docs/SIDE_VIEW_GUIDE.md`)。
- `renderer.worldToScreen(x, y)` / `screenToWorld(px, py)` で変換します。

## 5. 静的な描画と動的な描画

| 種類 | 何を | いつ描くか |
|---|---|---|
| 背景の区画 | 層ごとの鉛筆画 (壁・床・木・家並み・前景の柱など) を幅 512 論理 px ずつ | 映る範囲に入ったとき。倍率・DPR・キャンバスの大きさ・ステージが変わったら作り直す |
| 背景の動き | 松明の炎 | 毎フレーム |
| キャラクター | キャラ・影・飛んでいる矢 | 毎フレーム (Cached Frames ならコマ画像を貼る) |

背景の区画は、層の `band` (描く高さ) と `spans` (絵がある範囲) の分だけ作り、スクロールの向きの側に1枚だけ先に作ります (`docs/STAGE_GUIDE.md`)。

## 6. Live Vector と Cached Frames

| | Live Vector | Cached Frames |
|---|---|---|
| キャラの描き方 | 毎フレーム、ベクターで描く | あらかじめ作ったコマ画像を貼る |
| 時刻 | 連続 (どの瞬間も描ける) | コマ割り (待機16・歩行10・攻撃14 / 射撃20 コマなど) の最も近い前のコマ |
| 生成の手間 | なし | 職業ごとに右向き・左向きのコマを同期処理で作る (初回のみ) |

**Cached Frames は描画結果を保持するだけで、姿勢を決めません。** どのコマを貼るかは、定義の動作 (周期・コマ割り) とゲームから渡された `actionTime` だけで決まります。

## 7. キャッシュの生成・共有・破棄

- **ストアは Renderer ごとに1つ** (`rendering/cache.js`)。同じ Renderer の中では、**同じ職業のユニットは何体でも1組のコマを共有** します (弓使いは何体でも左右 92 コマ)。
- コマは次のものに依存し、どれかが変わると次に使うときにその職業のコマを作り直します (古いコマは解放)。
  - 倍率 k = キャラの倍率 × カメラ倍率 × DPR (`resize` で変わる)
  - 描画設定 (線幅・線のゆらぎ・足の接地補正。`setOptions`)
  - キャラクター定義そのもの (`registerCharacter` で同じ id を置き換えたとき)
- 生成は同期処理で、その間は画面が止まります。`renderer.prepareCaches()` を読み込み中に呼ぶと、ゲーム中の停止を避けられます。生成時間は `getDiagnostics().syncPauses` に記録されます。
- `disposeCaches(ids)` で破棄、`dispose()` で Renderer ごと破棄します。
- 容量の `bytesRGBA` は幅 × 高さ × 4 の **理論値** です。ブラウザが実際に使うメモリ (GPU 側の複製・管理領域) とは異なります。

## 8. 状態の分離 (複数の Renderer・ほかのコードとの共存)

- カメラ・背景・キャッシュ・描画設定・キャラクター登録簿は **Renderer インスタンスの中** にあります。
- 描画関数が読む共有の値は2つだけです: 描画設定 `DRAW` (core/settings.js) と乱数の状態 (core/random.js)。
  Renderer / CharacterView は描画の入口で自分の値を書き込み、終わったら元に戻します (`isolateDrawing`)。JavaScript の描画は同期処理なので、途中で別の Renderer が割り込むことはありません。
- 乱数はライブラリ内部のもので、`Math.random` やゲーム側の乱数には触れません。
- ライブラリは `window` に名前を追加しません。

## 9. ゲーム側との責務分担

| 描画エンジン (src/) | ゲーム (例: scroll/game.js) |
|---|---|
| カメラ・倍率・DPR・追従 | 誰がどこにいるか・どれだけ歩いたか・ステージの端で止まるか |
| 背景・キャラ・影・炎・矢の絵 | 攻撃できるか・いつ矢を放つか・矢がどこまで飛ぶか・何に当たるか |
| Live / Cached の切り替え、キャッシュの生成・破棄 | 入力の解釈 (キー・ボタン → 歩く / 攻撃) |
| 歩行のアニメ時間の換算 (`sideWalkSecondsPerPixel`) | 歩いた距離・動作の開始時刻 (`actionTime` を作る) |

ゲームは毎フレーム「誰がどこで何をしているか」(units) と「矢がどこまで飛んだか」(projectiles) を渡すだけです。
