# ゲームへの持ち出し

## 出力する

```sh
node tools/sync-catalog.mjs
node tools/export-game.mjs --characters warrior,archer
# 別の出力先
node tools/export-game.mjs --characters warrior --out ./exports/warrior-v2
```

IDは `swordsman`、`archer`、`skeleton`、`warrior`。将来追加したIDも自動的に使えます。指定がない場合・未知ID・重複IDは理由付きエラーになります。エクスポートは最新の定義を発見・検査してから行います。出力先が既に存在する場合は上書きしません。別の新規フォルダを指定してください。

```text
exports/game-kit/
  src/                     共通ライブラリ一式
  characters/
    warrior/character.js   選択した追加キャラクター
    shared/...             実際にimportされる共有部品（ある場合）
    register.js            選択した定義の配列と登録関数
  scroll/game.js            サンプルのゲームの規則 (歩く・攻撃・矢)
  scroll/controls.js        サンプルのキー入力 (← → / A D で歩く、Space で攻撃)
  index.html / main.js      横スクロールのサンプル (場所・キャラクター・Live/Cached を切り替える)
  tools/serve.mjs           既存と同じ静的サーバー
  package.json
  export-manifest.json      選択IDと追加依存ファイル
  USE_IN_GAME.md
```

キットを別フォルダ・別リポジトリへコピーし、次を実行します。

```sh
cd exports/game-kit
node tools/serve.mjs 8091
```

<http://127.0.0.1:8091/> を開き、鉛筆画の背景の上でキャラクターを左右に歩かせ・攻撃させて確認します (場所・キャラクター・Live/Cached を切り替えられます)。元のStudioを起動する必要はありません。StudioのUI、過去の画像や検証ファイルは含まれません。

## 既存ゲームへ組み込む

`src/` と `characters/` の相対位置を保ってコピーします。他のアセットと衝突する場合は、両方を `vendor/inkstone/` など同じ親フォルダに入れてください。

```js
import { createSideRenderer, sideWalkSecondsPerPixel } from './src/index.js';
import { characters, registerCharacters } from './characters/register.js';

const renderer = createSideRenderer({
  canvas: document.querySelector('canvas'),
  width: 960, height: 540,
  characters: [], mode: 'live', characterScale: 1.25,
  stage: { id: 'my-stage', length: 3200, start: 260, margin: 60, theme: 'forest' },   // dungeon / forest / town
});
registerCharacters(renderer);
const hero = { id: 'player', character: characters[0].id, x: 260, direction: 'R', action: 'idle', actionTime: 0 };
renderer.follow(hero.x);
renderer.render({ timeSeconds: 0, units: [hero] });

renderer.setMode('cached');
renderer.prepareCaches([characters[0].id]); // 初回同期生成を任意のタイミングで
// ゲームループで x と actionTime を更新し、follow と render を繰り返す
// 歩行の actionTime = 横に歩いた距離 × sideWalkSecondsPerPixel(1.25)
// 終了時: renderer.dispose();
```

入力、移動、当たり判定、攻撃終了後の状態管理はゲーム側の担当です (キットの `scroll/game.js` が例です)。向きは右 `R` / 左 `L` を `direction` で指定します。左右反転ではなく別の向きとして描くので、剣・盾などの持ち手は体の左右のまま保たれます。

## 依存の扱い

- 共通 `src/` は全体を未改変でコピーします。公開indexと登録モジュールが内蔵3体を静的importするため、未選択の内蔵キャラのソースも含まれます。ただし登録する配列には選択したIDだけが入ります。
- 追加キャラは選択した `character.js` と、その静的相対import / re-exportの推移的な依存だけをコピーします。importパスは書き換えず、同じフォルダ構造を保存します。
- 選択していない追加キャラへの依存はエラー。再利用部品は `characters/shared/` に分離します。
- ブラウザー用JavaScript ES Modulesの相対パスと明示的な拡張子を使用してください。解析は意図的に小さな制作規約に限定しています。動的import、require、npmのbare import、外部URL、query付きimport、コード外の画像・fetch依存は今回の持ち出し対象外です。画像等を使う機能は追加していません。
- 登録スクリプトは信頼済みのローカル定義をNode.jsでimportします。ブラウザーAPIの呼び出しはdraw関数内に置き、トップレベルでdocumentを参照しないでください。

## 更新時

出力はスナップショットです。Studio側のキャラクター変更はコピー先へ自動反映されません。再エクスポートし、ゲーム側の変更と比較して導入してください。エクスポート先を第二のキャラクター制作原本にしないでください。

ライブラリ更新時は `src/` の版を揃え、単一ファイルだけを混ぜないでください。登録API、造形、向き・動作、コマ割り、frameBox、通常サイズ、背景を再検証します。コピー先のimport・環境差を確認するまで更新完了と判断しないでください。
