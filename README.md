# character-studio

Inkstone Character Studio — 手描きCanvas 2Dのキャラクターを制作・蓄積・確認し、ゲーム用コードとして持ち出す工房です。外部画像・外部ライブラリ・クラウドサービスは不要です。

## 起動する

Node.js 18以上。パッケージのインストールは不要です。

- Windows: **`start-studio.bat`** をダブルクリック。カタログを更新し、ローカルサーバーとブラウザーを起動します。
- ターミナル: **`npm start`** → 表示されたURLを開きます（通常は <http://127.0.0.1:8081/>）。終了はCtrl+C。
- 配信元フォルダが一致するStudioだけを再利用します。旧版や別フォルダのサーバーが使用中のポートは避け、8081〜8090の空きポートで起動します。`start-studio.bat` は選ばれたURLを自動で開きます。

トップページはキャラクターギャラリーです。詳細画面で向き（右・左）・動作・再生・位相・拡大/通常サイズ・Live/Cachedを確認します。「横スクロールで見る」から、選択したキャラクターを横に長いステージで操作できます。

**横スクロール** (`scroll/index.html`) では、← → (A / D) を押している間歩き、Spaceで攻撃します。弓使い・骸骨弓兵は矢を放ちます。「場所を選ぶ」で鉛筆画の背景を ダンジョンの回廊・森の小道・城下町の通り から切り替えられます (`?stage=forest` でも指定可)。背景の描き方と増やし方は[横スクロールの背景ガイド](docs/STAGE_GUIDE.md)を参照してください。

キャラクターは左右2方向（右 R / 左 L）の待機・歩行・攻撃で描きます。以前の8×8ダンジョンと4方向（NW / NE / SW / SE）の表示は、横スクロール化の段階5で退役しました（[計画](docs/SIDE_SCROLLER_PLAN.md)）。通常サイズは倍率1.25×です。

## キャラクターを追加する

1. `characters/<slug>/character.js` にInkstone定義 `character` と表示情報 `studio` をnamed exportします。
2. `node tools/sync-catalog.mjs` を実行します。
3. ギャラリー・横スクロール・描画検証ページで確認します。
4. 定義と `characters/catalog.generated.js` を一緒に保存します。

UIコードを編集する必要はありません。[制作手順とAIへの指示テンプレート](docs/STUDIO_GUIDE.md)、描き方の基本は[キャラクター追加ガイド](docs/CHARACTER_GUIDE.md)、右向き・左向きで仕上げるコツと確認方法は[横向きキャラクター制作ガイド](docs/SIDE_VIEW_GUIDE.md)を参照してください。

人間型は「灰燼の衛士」を基準に約2.2頭身で制作します。羽飾り・武器・影を除く寸法と比較方法は制作ガイドに記載しています。

## ゲーム用コードを出力する

```sh
node tools/export-game.mjs --characters warrior,archer
```

**`exports/game-kit/`** に共通 `src/`、選択した追加キャラクター、登録コード、起動サンプル、説明書を生成します。既存出力は上書きしません。別の出力には `--out ./exports/my-game` を指定します。出力フォルダは保守用の原本ではなく、その時点のコピーです。

```sh
cd exports/game-kit
node tools/serve.mjs 8091
```

<http://127.0.0.1:8091/> を開きます。キットは元のStudioに依存しません。[持ち出しガイド](docs/EXPORT_GUIDE.md)を参照してください。

## フォルダの役割

| 場所 | 内容 |
|---|---|
| `src/` | Inkstoneの共通描画ライブラリ。原則変更しない |
| `characters/` | 追加キャラクターの原本と共通カタログ |
| `studio/` | ギャラリーと詳細画面 |
| `scroll/` | カタログ共通の横スクロールの確認ページ、移動・攻撃・矢・入力 |
| `tools/` | 起動、静的サーバー、登録情報生成、ゲーム用出力 |
| `tests/node/` | 横スクロール・背景・キャラクターの絵・登録・エクスポートの自動テスト |
| `tests/browser/` | 実ブラウザーで実行する描画・背景・レイアウト検証 |
| `tests/fixtures/` | 全キャラクターの左右の絵の指紋、エンジンのハッシュ基準 |
| `docs/` | 現在のAPI・制作・出力ガイド |
| `docs/reports/` | Studio制作報告と画像・測定記録 |
| `docs/archive/` | 過去の戦士制作実験。通常のアプリから読み込まない |
| `exports/` | 必要時に生成するゲーム用キット。Git管理対象外 |

`catalog.generated.js` は静的配信にも必要なので削除しません。

## 検証する

```sh
npm test
npm run catalog:check
```

`src/` を意図して変更したときは `npm run baseline:update` で `tests/fixtures/src-baseline.json` を作り直してから `npm test` を実行します。キャラクターの絵を意図して変えたときは `npm run drawings:update` で左右の絵の指紋 (`tests/fixtures/side-drawings.json`) を作り直します。コードの整理だけなら、指紋が変わらないことが「絵が1本の線も変わっていない」証拠になります。

サーバー起動後、次のページで検証できます。

- [全キャラクターの描画範囲とLive/Cached](tests/browser/check.html)
- [1体の左右の全コマを並べる](tests/browser/side-sheet.html)（例: `?id=warrior&act=attack`）
- [全キャラクターの左右を一覧にする](tests/browser/side-overview.html)
- [背景の1場面とキャラクター](tests/browser/side-stage.html)（例: `?theme=forest&x=1200`）
- [画面幅・拡大相当の再配置](tests/browser/responsive.html)
- [40カード時の遅延描画](tests/browser/performance.html)

[Studio制作・検証報告](docs/reports/CHARACTER_STUDIO_REPORT.md) / [リポジトリ整理記録](docs/reports/REPOSITORY_CLEANUP.md) / [過去の戦士制作実験](docs/archive/warrior/REPORT.md)

## 静的配信と保守

相対URLとハッシュルーティングを使用します。静的配信時は生成済みカタログを含めてください。日常のアプリには `index.html`、`src/`、`characters/`、`studio/`、`scroll/` と参照するガイドが必要です。テスト・過去資料・ゲーム用キットを配信する必要はありません。

制作コードの原本に出力先のファイルを逆コピーしないでください。共通ライブラリを意図して更新するときは全体を同じ版にそろえ、`npm run baseline:update` で `tests/fixtures/src-baseline.json` の基準を作り直し、テストを確認してください。

**改行コードを保ってください。** ファイルごとに CRLF と LF が混在しています (`README.md`・`docs/STUDIO_GUIDE.md` などは CRLF、`docs/CHARACTER_GUIDE.md`・多くの `.js` は LF、`src/characters/skeleton.js`・`index.html` などは1行だけ CRLF が混ざっている)。スクリプトで書き換えると、ファイル全体の改行が変わることがあります (Windows の Python はテキストモードで書くと LF を CRLF に変える)。編集後は `git diff --stat` で、変更した行数よりはるかに多い差分が出ていないかを確かめてください。`src/` の改行が変わるとハッシュ基準のテストも失敗します。
