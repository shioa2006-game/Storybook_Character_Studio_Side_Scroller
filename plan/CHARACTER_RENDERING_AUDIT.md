# incremental_rpg_opus キャラクター表示・コード調査

対象: `C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus`

コードの読解と、既存の `unitFrame` を読み込んだメモリー上での画素計測による報告。ゲームコード・設定・ビルド成果物は変更していない。ブラウザーの現在のウィンドウ寸法や実測fpsは取得していないため、固定値でないものは実装の式を記す。

## 1. 画面の大きさ

| 項目 | コードで確認した値・処理 | 根拠 |
|---|---|---|
| 戦闘の論理解像度 | **400×180 world px** | [src/core/battle.ts:34](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:34) |
| 表示用world canvasの内部画素数 | **400×180**。DPRを掛けて増やさない | [src/render/renderer.ts:76](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:76) |
| オフスクリーン描画バッファ | **400×180** | [src/render/renderer.ts:93](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:93) |
| 文字・アイコン用overlay canvas | `max(1,round(cssW×DPR)) × max(1,round(cssH×DPR))`。worldとは別の画素数 | [src/render/renderer.ts:159](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:159) |
| CSS表示寸法 | コンテナー寸法とDPRから算出。固定寸法ではない | [src/render/renderer.ts:126](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:126) |
| 補間 | worldのCSSは最終的に `image-rendering:pixelated`。world・描画バッファは `imageSmoothingEnabled=false` | [src/render/renderer.ts:81](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:81)、[src/render/renderer.ts:92](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:92)、[src/render/renderer.ts:939](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:939)、[src/render/renderer.ts:970](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:970) |

拡大率の計算は以下の通り。`cw,ch` はコンテナーのCSS寸法、`dpr=window.devicePixelRatio || 1`。（[src/render/renderer.ts:131](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:131)）

- `fit=min(cw×dpr/400, ch×dpr/180)`、`s=floor(fit)`。
- `s>=1 && s/fit>=0.88` のとき、CSS寸法は `400×s/dpr, 180×s/dpr`。**デバイス画素で整数倍**になる。
- それ以外では `f=min(cw/400,ch/180)` としてCSS寸法を `400×f,180×f` にする。**端数倍率も使う**。
- 中央配置のleft/topもDPR単位に丸める。

上記の数値・分岐は [src/render/renderer.ts:138](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:138)、[src/render/renderer.ts:142](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:142)、[src/render/renderer.ts:146](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:146)、[src/render/renderer.ts:151](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:151)。したがって、CSS上の倍率が必ず整数になる実装ではない。

## 2. キャラクターの大きさ

### 計測の意味

以下の表は **tier=0、idleのframe=0** を基準とする。画像W×Hは `unitFrame(...).pix.w/h` で、`getUnitSprite` が返すcanvasの内部寸法と同じ。生成時の透明余白、攻撃・詠唱用の広い領域を含む。（[src/render/sprites/units.ts:214](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:214)、[src/render/sprites/index.ts:33](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:33)、[src/render/sprites/index.ts:53](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:53)）

「描画高さ」は **透明でない画素の最下端−最上端+1**。輪郭線・武器・角・炎・発光も含む。コードには「解剖学的な体だけ」を切り分けるマスクがないため、頭頂から足までを目視推定した値は記載しない。計算は実装済みの `bbox` と同じ。（[src/render/sprites/pix.ts:435](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:435)）

「生存ポーズの高さ範囲」は `idle/walk/attack/cast/hurt` に定義された全コマの最小～最大。実戦で選ばれないポーズも含むAPI上の範囲。各表の数字は、該当行のアート定義を [src/render/sprites/units.ts:214](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:214) の生成関数に通し、上記の方法で実測した値。

#### 味方

| キャラクターキー | 画像 W×H | 描画高さ | 生存ポーズの高さ範囲 | 足元アンカー (ax,ay) | アート定義 |
|---|---:|---:|---:|---:|---|
| guardian | 46×36 | 30 | 29～30 | (14,32) | [src/render/sprites/data/heroes.ts:198](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:198) |
| ranger | 43×40 | 27 | 27～34 | (13,36) | [src/render/sprites/data/heroes.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:337) |
| arcanist | 44×43 | 28 | 28～36 | (12,39) | [src/render/sprites/data/heroes.ts:482](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:482) |
| oracle | 42×38 | 25 | 25～31 | (13,34) | [src/render/sprites/data/heroes.ts:595](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:595) |

#### 通常敵・小型

size区分は敵データの `size`。これは画像の固定寸法ではない。（[src/data/enemies.ts:15](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/enemies.ts:15)、[src/core/battle.ts:39](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:39)）

| キャラクターキー | 画像 W×H | 描画高さ | 生存ポーズの高さ範囲 | 足元アンカー (ax,ay) | アート定義 |
|---|---:|---:|---:|---:|---|
| ash_crawler | 24×18 | 12 | 12～12 | (12,14) | [src/render/sprites/data/enemies.ts:9](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:9) |
| ember_wisp | 21×22 | 15 | 15～15 | (10,18) | [src/render/sprites/data/enemies.ts:39](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:39) |
| cinder_sapling | 20×21 | 14 | 14～14 | (10,17) | [src/render/sprites/data/enemies.ts:150](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:150) |
| tideling | 20×21 | 15 | 14～15 | (10,17) | [src/render/sprites/data/enemies.ts:218](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:218) |
| gem_bat | 24×17 | 11 | 9～11 | (12,13) | [src/render/sprites/data/enemies_deep.ts:34](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:34) |
| crystal_mite | 22×16 | 10 | 10～10 | (11,12) | [src/render/sprites/data/enemies_deep.ts:66](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:66) |
| lantern_eater | 26×23 | 17 | 17～17 | (13,19) | [src/render/sprites/data/enemies_deep.ts:419](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:419) |

#### 通常敵・中型

| キャラクターキー | 画像 W×H | 描画高さ | 生存ポーズの高さ範囲 | 足元アンカー (ax,ay) | アート定義 |
|---|---:|---:|---:|---:|---|
| char_wolf | 34×23 | 17 | 17～17 | (18,19) | [src/render/sprites/data/enemies.ts:88](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:88) |
| ash_brute | 32×39 | 24 | 23～33 | (16,35) | [src/render/sprites/data/enemies.ts:134](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:134) |
| reef_lurker | 35×25 | 18 | 17～18 | (17,21) | [src/render/sprites/data/enemies.ts:201](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:201) |
| drowned_archer | 26×31 | 25 | 24～25 | (13,27) | [src/render/sprites/data/enemies.ts:288](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:288) |
| siren | 27×34 | 25 | 24～27 | (13,30) | [src/render/sprites/data/enemies.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:337) |
| shardback | 33×25 | 18 | 17～18 | (16,21) | [src/render/sprites/data/enemies_deep.ts:22](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:22) |
| geomancer | 26×33 | 23 | 22～26 | (13,29) | [src/render/sprites/data/enemies_deep.ts:126](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:126) |
| frost_revenant | 30×29 | 23 | 22～23 | (17,25) | [src/render/sprites/data/enemies_deep.ts:165](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:165) |
| rime_archer | 26×30 | 24 | 23～24 | (13,26) | [src/render/sprites/data/enemies_deep.ts:206](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:206) |
| ice_wraith | 28×29 | 21 | 21～21 | (14,25) | [src/render/sprites/data/enemies_deep.ts:251](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:251) |
| frost_hound | 34×23 | 17 | 16～17 | (18,19) | [src/render/sprites/data/enemies_deep.ts:272](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:272) |
| voidspawn | 31×27 | 21 | 20～21 | (15,23) | [src/render/sprites/data/enemies_deep.ts:305](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:305) |
| gloom_caster | 26×30 | 21 | 21～21 | (13,26) | [src/render/sprites/data/enemies_deep.ts:338](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:338) |
| hollow_knight | 29×28 | 22 | 21～22 | (14,24) | [src/render/sprites/data/enemies_deep.ts:386](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:386) |
| ashen_echo | 31×27 | 20 | 20～20 | (18,23) | [src/render/sprites/data/enemies_deep.ts:455](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:455) |
| cinder_phoenix | 35×29 | 23 | 20～23 | (17,25) | [src/render/sprites/data/enemies_deep.ts:534](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:534) |
| ember_acolyte | 26×32 | 22 | 22～22 | (13,28) | [src/render/sprites/data/enemies_deep.ts:566](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:566) |

#### 通常敵・大型

| キャラクターキー | 画像 W×H | 描画高さ | 生存ポーズの高さ範囲 | 足元アンカー (ax,ay) | アート定義 |
|---|---:|---:|---:|---:|---|
| flame_construct | 40×42 | 36 | 35～36 | (20,38) | [src/render/sprites/data/enemies_deep.ts:494](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies_deep.ts:494) |

#### エリート

| キャラクターキー | 画像 W×H | 描画高さ | 生存ポーズの高さ範囲 | 足元アンカー (ax,ay) | アート定義 |
|---|---:|---:|---:|---:|---|
| thornback | 47×35 | 29 | 28～29 | (23,31) | [src/render/sprites/data/elites.ts:36](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/elites.ts:36) |
| coral_knight | 40×48 | 42 | 41～42 | (20,44) | [src/render/sprites/data/elites.ts:89](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/elites.ts:89) |
| prism_sentinel | 40×48 | 39 | 39～39 | (20,44) | [src/render/sprites/data/elites.ts:123](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/elites.ts:123) |
| glacial_warden | 44×56 | 42 | 41～50 | (22,52) | [src/render/sprites/data/elites.ts:168](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/elites.ts:168) |
| abyssal_herald | 42×54 | 44 | 43～47 | (21,50) | [src/render/sprites/data/elites.ts:212](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/elites.ts:212) |
| ember_tyrant | 50×48 | 38 | 37～38 | (28,44) | [src/render/sprites/data/elites.ts:261](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/elites.ts:261) |

#### 巨大ボス

| キャラクターキー | 画像 W×H | 描画高さ | 生存ポーズの高さ範囲 | 足元アンカー (ax,ay) | アート定義 |
|---|---:|---:|---:|---:|---|
| gnarlwood | 72×80 | 67 | 67～70 | (36,76) | [src/render/sprites/data/bosses.ts:72](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:72) |
| coilscale | 81×70 | 64 | 60～64 | (45,66) | [src/render/sprites/data/bosses.ts:129](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:129) |
| geode_colossus | 72×80 | 62 | 61～74 | (36,76) | [src/render/sprites/data/bosses.ts:180](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:180) |
| rimequeen | 72×82 | 68 | 68～76 | (40,78) | [src/render/sprites/data/bosses.ts:244](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:244) |
| hollow_sovereign | 84×84 | 70 | 70～78 | (47,80) | [src/render/sprites/data/bosses.ts:317](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:317) |

#### 影のパーティ

| キャラクターキー | 画像 W×H | 描画高さ | 生存ポーズの高さ範囲 | 足元アンカー (ax,ay) | アート定義 |
|---|---:|---:|---:|---:|---|
| shadow_guardian | 68×53 | 44 | 42～44 | (47,48) | [src/render/sprites/data/bosses.ts:375](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:375) |
| shadow_ranger | 63×59 | 39 | 39～50 | (44,54) | [src/render/sprites/data/bosses.ts:376](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:376) |
| shadow_arcanist | 65×63 | 41 | 41～54 | (47,58) | [src/render/sprites/data/bosses.ts:377](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:377) |
| shadow_oracle | 62×56 | 37 | 37～46 | (43,51) | [src/render/sprites/data/bosses.ts:378](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:378) |

影は味方のアート定義を継承し、別パレット、オーラなし、`scale:1.5`、`flip:true` を適用する。（[src/render/sprites/data/bosses.ts:356](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:356)）

### 倍率・余白・装備tierの注意点

- 味方、通常敵、エリート、巨大ボスはアート生成後の画像を戦闘画面へ**等倍**で描く。sizeごとの再拡大は行わない。生存ポーズの画像W×Hは同一キャラクター内で共通だった。（[src/render/fx/units.ts:184](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:184)、[src/render/fx/units.ts:382](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:382)、[src/render/sprites/units.ts:125](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:125)）
- 影の **1.5倍**は、完成した味方canvas全体を拡大する処理ではない。body/lightを拡大し、アンカーを `round(元値×1.5)` にした後、輪郭を付ける。拡大はScale3x後に画素を間引く方式で、出力寸法は `floor(元寸法×3/2)`。したがって影のcanvas寸法は味方canvas寸法の単純な1.5倍ではない。（[src/render/sprites/units.ts:309](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:309)、[src/render/sprites/units.ts:316](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:316)、[src/render/sprites/pix.ts:418](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:418)）
- 元マップは全ポーズの最大幅・最大高さに揃え、下揃え・背面側揃え。上下左右に**3px**の余白を入れ、輪郭処理でさらに各辺**1px**増える。（[src/render/sprites/units.ts:125](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:125)、[src/render/sprites/units.ts:62](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:62)、[src/render/sprites/units.ts:235](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:235)、[src/render/sprites/pix.ts:210](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:210)）
- 装備tierは **0～5**。tier **5** の生存ポーズではオーラ用に各辺**1px**増える。deadにはオーラを付けない。（[src/render/sprites/units.ts:219](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:219)、[src/render/sprites/data/heroes.ts:57](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:57)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321)、[src/render/sprites/units.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:337)）

tier=5、idle frame=0の計測結果は次の通り。生成・計測方法は上記と同じ。

| 味方 | 画像W×H | 描画高さ | アンカー | 根拠 |
|---|---:|---:|---:|---|
| Guardian | 48×38 | 30 | (15,33) | [src/render/sprites/data/heroes.ts:198](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:198)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |
| Ranger | 45×42 | 28 | (14,37) | [src/render/sprites/data/heroes.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:337)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |
| Arcanist | 46×45 | 28 | (13,40) | [src/render/sprites/data/heroes.ts:482](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:482)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |
| Oracle | 44×40 | 26 | (14,35) | [src/render/sprites/data/heroes.ts:595](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:595)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |

**代表の描画高さは Guardian=30px、Charwolf=17px、Thornback=29px、Gnarlwood=67px。** いずれも上記のidle先頭コマの計測値。UIが使う「足元アンカーから上端まで」は、それぞれ **29 / 16 / 28 / 66px** となり、描画画素の総高さとは異なる。（[src/render/sprites/data/heroes.ts:198](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:198)、[src/render/sprites/data/enemies.ts:88](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/enemies.ts:88)、[src/render/sprites/data/elites.ts:36](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/elites.ts:36)、[src/render/sprites/data/bosses.ts:72](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:72)、[src/render/fx/units.ts:80](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:80)）

deadは別形状になる。回転型の派生deadでは、切り出し・回転によってcanvas寸法も変わる。全ポーズを同じ外接矩形とみなすことはできない。（[src/render/sprites/units.ts:262](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:262)）敵の実戦退場ではdead画像ではなく、死亡直前の画像から退場演出を作る。（[src/render/fx/units.ts:553](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:553)）

## 3. 描く位置

### 足元・地面

`SpriteFrame.ax,ay` は足元の基準点。描画左上は `round(unit.x+dx-ax), round(unit.y+dy-ay)`。**canvasの最下端を地面に合わせる方式ではない**。（[src/render/sprites/index.ts:13](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:13)、[src/render/fx/units.ts:184](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:184)）

元の足元アンカーYは `MARGIN+全マップの最大高さ`、輪郭・拡大・オーラの分だけ補正される。（[src/render/sprites/units.ts:239](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:239)、[src/render/sprites/units.ts:309](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:309)、[src/render/sprites/units.ts:318](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:318)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321)）

地面の基本線は **y=150**。隊列には奥行き用のY差がある。（[src/core/battle.ts:36](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:36)、[src/core/battle.ts:46](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:46)）

| 区分 | 足元の基準座標（並び順） | X間隔 | 根拠 |
|---|---|---|---|
| 味方全員加入時：Guardian / Ranger / Arcanist / Oracle | (152,150), (120,146), (90,151), (60,147) | 前から後ろへ32,30,30px | [src/core/battle.ts:46](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:46)、[src/core/battle.ts:174](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:174)、[src/core/types.ts:5](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/types.ts:5) |
| 通常編成・エリート編成 | (236,150), (266,144), (296,153), (324,146), (352,152), (378,145) | 30,30,28,28,26px | [src/core/battle.ts:52](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:52) |
| 単体ボス | (318,152) | — | [src/core/battle.ts:60](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:60) |
| 影のパーティ | (240,150), (280,145), (318,152), (356,146) | 40,38,38px | [src/core/battle.ts:68](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:68)、[src/data/areas.ts:151](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:151) |
| ボスの召喚枠 | (236,150), (262,144), (212,153), (274,156), (224,141) | 一定間隔ではない | [src/core/battle.ts:61](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:61) |

飛行敵は生成時に基準Yから **18px** 上げ、描画時に `round(sin(t×3.2+id)×2)` の上下動を加える。攻撃の踏み込み、登場、被弾などのオフセットも別途加算する。（[src/core/battle.ts:572](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:572)、[src/render/fx/units.ts:137](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:137)、[src/render/fx/units.ts:171](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:171)）

### 同時出現数

| 対象 | 現在のデータ・実装 | 根拠 |
|---|---|---|
| 味方 | 加入済みを順に配置。最大4人 | [src/core/types.ts:5](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/types.ts:5)、[src/core/state.ts:69](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/state.ts:69)、[src/core/battle.ts:174](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:174) |
| 通常の初期編成 | 定義済み最大6体。Drowned Ruins / The Ember Heartに該当編成がある | [src/data/areas.ts:48](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:48)、[src/data/areas.ts:150](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:150) |
| 第1エリアの初期編成 | 最大4体 | [src/data/areas.ts:13](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:13) |
| 第1エリアのボス戦 | Gnarlwoodと苗木最大4体で計5体 | [src/data/areas.ts:23](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:23)、[src/data/enemies.ts:34](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/enemies.ts:34) |
| 召喚を含む現在の最大編成 | CoilscaleとTideling最大5体で計6体。ボス用召喚位置も5枠 | [src/data/enemies.ts:58](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/enemies.ts:58)、[src/core/battle.ts:61](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:61) |
| 最終ボス | 影4人 | [src/data/areas.ts:151](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:151) |

**「敵は必ず6体で打ち切る」という初期生成の共通上限処理ではない。** `spawnStage` は編成配列を全件生成し、通常位置が不足すると最後の位置を使う。一方、召喚は空き位置がなければ中止する。上の最大数は現在の編成・召喚定義についての値。（[src/core/battle.ts:473](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:473)、[src/core/battle.ts:1762](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1762)）

### 向き

味方は元アートが右向き、通常敵・エリート・巨大ボスは元アートが左向き。戦闘の `drawImage` に敵全体を左右反転する処理はない。影だけは焼き込み時に `flipH` し、`ax=画像幅-ax` に変える。（各表のアート定義、[src/render/fx/units.ts:382](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:382)、[src/render/sprites/data/bosses.ts:363](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:363)、[src/render/sprites/units.ts:328](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:328)）

## 4. 動作とアニメーション

### ポーズとコマ数

APIのポーズは `idle / walk / attack / cast / hurt / dead`。（[src/render/sprites/units.ts:12](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:12)）

| 対象 | idle | walk | attack | cast | hurt | dead | 根拠 |
|---|---:|---:|---:|---:|---:|---:|---|
| Guardian / Shadow Guardian | 2 | 2 | 2 | 1 | 1 | 1 | [src/render/sprites/data/heroes.ts:198](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:198)、[src/render/sprites/units.ts:159](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:159)、[src/render/sprites/data/bosses.ts:356](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:356) |
| Ranger / Shadow Ranger | 2 | 2 | 2 | 1 | 1 | 1 | [src/render/sprites/data/heroes.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:337)、[src/render/sprites/units.ts:159](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:159)、[src/render/sprites/data/bosses.ts:356](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:356) |
| Arcanist / Shadow Arcanist | 2 | 2 | 2 | 2 | 1 | 1 | [src/render/sprites/data/heroes.ts:482](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:482)、[src/render/sprites/units.ts:159](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:159)、[src/render/sprites/data/bosses.ts:356](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:356) |
| Oracle / Shadow Oracle | 2 | 2 | 1 | 1 | 1 | 1 | [src/render/sprites/data/heroes.ts:595](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:595)、[src/render/sprites/units.ts:159](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:159)、[src/render/sprites/data/bosses.ts:356](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/bosses.ts:356) |
| その他の通常敵・エリート・巨大ボス（上の一覧全員） | 2 | 2 | 1 | 1 | 1 | 1 | 各行のアート定義を [src/render/sprites/units.ts:190](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:190) で列挙した結果 |

不足ポーズは生成する。idleの追加コマは呼吸または上下移動、walk未定義ならidle、attack未定義なら前傾、cast未定義ならattack、hurt未定義なら後ずさり、dead未定義なら転倒・圧縮を使う。（[src/render/sprites/units.ts:159](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:159)、[src/render/sprites/units.ts:249](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:249)）

| 状態 | コマ選択・1コマ時間 | 表示時間・ループ | 根拠 |
|---|---|---|---|
| 待機 idle | `floor(t×2.6+id×0.37)%n`。1コマ=1/2.6秒≒0.384615秒 | 待機中ループ。開始位相は個体で異なる | [src/render/fx/units.ts:130](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:130) |
| 移動 walk | `floor(t×9+slot×0.5)%n`。1コマ=1/9秒≒0.111111秒 | 味方のwalkフェーズ中ループ。敵のpose選択にはwalkがない | [src/render/fx/units.ts:104](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:104)、[src/render/fx/units.ts:131](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:131) |
| 攻撃 attack | `min(n-1,floor(actFlash/0.2×n))` | 0.2秒の区間内で進む。2コマなら各0.1秒、1コマなら0.2秒。moduloループしない | [src/render/fx/units.ts:108](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:108)、[src/render/fx/units.ts:114](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:114)、[src/render/fx/units.ts:132](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:132) |
| 通常の詠唱 cast | 上と同じ | 味方Arcanist/Oracle、magic敵の行動で0.2秒。Arcanistは各0.1秒、Oracleは1コマ0.2秒 | [src/render/fx/units.ts:108](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:108)、[src/render/fx/units.ts:114](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:114)、[src/render/fx/units.ts:132](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:132) |
| 敵の溜め中 cast | actFlash区間外では `floor(t×6)%n`。1コマ=1/6秒≒0.166667秒 | windupがある間ループ。現在の影以外の敵はcastが1コマなので静止画像 | [src/render/fx/units.ts:115](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:115)、[src/render/fx/units.ts:132](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:132)、[src/render/fx/units.ts:134](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:134) |
| 被弾 hurt | コマ選択式は `floor(t×6)%n` だが全対象1コマ | hitFlash<0.14秒の間。攻撃・詠唱などの上位条件で上書きされる | [src/render/fx/units.ts:104](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:104)、[src/render/fx/units.ts:134](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:134) |
| スタン・凍結 | hurtの先頭コマに固定 | ステータス継続中。味方はstun/frozen、敵のpose分岐はstun | [src/render/fx/units.ts:107](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:107)、[src/render/fx/units.ts:113](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:113)、[src/render/fx/units.ts:135](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:135) |
| 味方の戦闘不能 dead | frame=0固定 | 生存へ戻るまで保持。ループアニメではない | [src/render/fx/units.ts:106](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:106)、[src/render/fx/units.ts:133](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:133) |
| 敵の退場 | 死亡直前画像を保存して演出 | 通常0.55秒、エリート0.85秒、過剰ダメージ0.3秒、ボス2.3秒。boss判定が優先 | [src/render/fx/units.ts:553](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:553)、[src/render/fx/units.ts:575](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:575) |

上記はシミュレーション時間。タイマーはtickごとに更新され、指定時刻を過ぎた処理は次のtickで実行する。描画コマや実時間が小数秒値に完全一致するという意味ではない。（[src/core/battle.ts:346](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:346)、[src/core/battle.ts:390](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:390)、[src/ui/app.ts:27](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:27)）

味方Guardian/Rangerのスキルでも実戦のpose選択は `attack`。APIにcast画像が存在することと、戦闘でcast画像が選ばれることは別。敵は通常攻撃種別がmagicならcast、それ以外はattack。（[src/render/fx/units.ts:104](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:104)、[src/core/battle.ts:300](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:300)）

windupの表示時間は能力別の `windup` 値に従う。例はThornbackのGore Charge **2.2秒**、GnarlwoodのRoot Crush **2.5秒**、Sapling Call **0.8秒**。残り時間をdtで減らし、終了時に能力を実行する。（[src/data/enemies.ts:26](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/enemies.ts:26)、[src/data/enemies.ts:33](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/enemies.ts:33)、[src/data/enemies.ts:34](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/enemies.ts:34)、[src/core/battle.ts:1658](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1658)）

### 攻撃開始・発射・着弾

時刻はその行動開始からのシミュレーション秒。以下はコードで設定されたイベント・予約処理の時刻であり、ブラウザーでの実測値ではない。

| 行動 | 発生・発射 | 効果適用・着弾 | 根拠 |
|---|---|---|---|
| Guardian通常攻撃 | 開始時にattackイベント | 0.12秒後 | [src/core/battle.ts:757](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:757)、[src/core/battle.ts:765](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:765) |
| Ranger通常矢 | 開始時に発射（0秒） | 0.18秒後 | [src/core/battle.ts:784](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:784)、[src/core/battle.ts:844](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:844) |
| Ranger追加のDouble Shot | 0.08秒後に追加発射 | 追加発射の0.18秒後、最初の攻撃から0.26秒後 | [src/core/battle.ts:785](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:785)、[src/core/battle.ts:844](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:844) |
| Arcanist通常bolt | 開始時（0秒） | 0.3秒後 | [src/core/battle.ts:801](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:801) |
| Arcanist chainの最初の命中 | 開始時にイベント | 0.08秒後 | [src/core/battle.ts:893](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:893) |
| Oracle回復 / smite | 開始時（0秒） | 0.25秒後 | [src/core/battle.ts:822](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:822)、[src/core/battle.ts:831](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:831) |
| 敵通常近接 | 開始時（0秒） | 0.15秒後 | [src/core/battle.ts:1726](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1726) |
| 敵通常遠隔・魔法 | 開始時（0秒） | 0.3秒後 | [src/core/battle.ts:1726](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1726) |
| Shield Bash | 開始時にイベント | 0.1秒後 | [src/core/battle.ts:991](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:991)、[src/core/battle.ts:998](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:998) |
| Arrow Rain | 第i矢は `0.15+i×1.5/n` 秒。iは0開始、nは総矢数 | 各矢の発射から0.12秒後。最初は開始から0.27秒後 | [src/core/battle.ts:1047](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1047) |
| Meteor | 開始時にfxイベント | 0.8秒後 | [src/core/battle.ts:1075](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1075)、[src/core/balance.ts:66](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/balance.ts:66) |
| Sanctuary | 同じ呼び出し内で演出・バリア・回復 | 初回効果は遅延予約なし（0秒） | [src/core/battle.ts:1134](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1134) |
| 敵windup後のstrike | windup終了後に実行 | strikeのイベントから0.15秒後 | [src/core/battle.ts:1664](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1664)、[src/core/battle.ts:1792](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1792) |

矢の描画はattackイベントを受けて即座に生成する。`attack` の特定コマまで待つ処理ではない。`travel` が投射物の寿命にも渡される。（[src/render/renderer.ts:589](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:589)、[src/render/fx/effects.ts:107](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/effects.ts:107)）

### 攻撃速度との関係

攻撃速度の変更は `atkTimer -= dt×speed` に掛かる。一方 `actFlash` は通常のdtで進み、ポーズ区間は固定の **0.2秒**、待機・歩行のコマ選択も固定の時間式。**個体の攻撃速度に比例してポーズを早回しする処理はない**。攻撃が再発するとactFlashが再びリセットされる。（[src/core/battle.ts:638](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:638)、[src/core/battle.ts:1692](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1692)、[src/core/battle.ts:346](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:346)、[src/core/battle.ts:757](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:757)、[src/core/battle.ts:1730](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1730)、[src/render/fx/units.ts:130](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:130)）

全体のスローモーション・チュートリアル倍率・デバッグ速度はシミュレーション時間に作用するので、この場合は演出側も追随する。（[src/ui/app.ts:258](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:258)、[src/render/renderer.ts:905](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:905)）

### getUnitSprite・frameCount・白い被弾表示

- `getUnitSprite(key,pose,frame,tier)` はフレーム値を整数化し、`unitFrame` の結果をcanvas化する。`unitFrame` ではコマ番号をポーズのコマ数でmoduloし、tierを **0～5** に制限する。（[src/render/sprites/index.ts:63](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:63)、[src/render/sprites/units.ts:214](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:214)）
- `frameCount` は `unitFrameCount` の転送で、返すのはポーズのレシピ数。毎秒の描画回数ではない。（[src/render/sprites/index.ts:78](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:78)、[src/render/sprites/units.ts:190](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:190)）
- ダメージ適用で `hitFlash=0`。生存中かつ `hitFlash<0.09` 秒では、同じポーズ・コマ・tierを白一色にした画像を使う。アルファ値とアンカーは元画像を維持し、白画像もキャッシュされる。（[src/core/battle.ts:1243](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1243)、[src/core/battle.ts:1479](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:1479)、[src/render/fx/units.ts:186](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:186)、[src/render/sprites/index.ts:68](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:68)、[src/render/sprites/pix.ts:330](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:330)）
- 白い表示の **0.09秒** とhurtポーズの **0.14秒** は別条件。白画像は描画時に通常画像の代わりに使われる。（[src/render/fx/units.ts:109](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:109)、[src/render/fx/units.ts:186](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:186)、[src/render/fx/units.ts:382](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:382)）

## 5. キャラクターに重ねる表示

### 「頭上」の基準

UIの `v.top` は初期化時のidle先頭コマの不透明画素上端を、描画中の足元位置に足した値。`spriteBounds` はアルファ **40超** を対象にする。生存中は攻撃コマの高い武器に合わせて外接矩形を取り直さない。deadではその画像から取り直す。（[src/render/fx/units.ts:80](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:80)、[src/render/fx/units.ts:191](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:191)、[src/render/fx/pixel.ts:212](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/pixel.ts:212)）

以下のworld pxはCSS pxとは異なる。DPR overlayの `k` は **overlay内部幅/400**。（[src/render/renderer.ts:165](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:165)、[src/render/fx/hud.ts:529](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:529)）

| 表示 | 位置 | 大きさ・補足 | 根拠 |
|---|---|---|---|
| 通常敵HP | 左上Y=`round(v.top)-5`、Xはv.cx中心 | 内側幅small14 / medium18 / large26 / huge40、高さ2。黒枠は幅+2、高さ4 | [src/render/fx/hud.ts:29](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:29)、[src/render/fx/hud.ts:53](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:53)、[src/render/fx/hud.ts:158](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:158) |
| エリートHP | 通常敵HPと同じ基準 | さらに外側に幅+4、高さ6の金枠 | [src/render/fx/hud.ts:162](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:162) |
| 敵Ward | HPの内側Yから2px上 | 幅はHP幅×残Ward割合、高さ1、外枠高さ3 | [src/render/fx/hud.ts:183](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:183) |
| 敵Armorアイコン | HP左端から7px左、HP内側Yから2px上 | 元絵5×5 | [src/render/fx/hud.ts:16](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:16)、[src/render/fx/hud.ts:192](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:192) |
| 味方HP | **頭上ではなく足元**。X=h.x中心、Y=`round(h.y+3)` | 内側16×2、黒枠18×4。踏み込み後のv.x/v.yではなく元のh.x/h.yを使う | [src/render/fx/hud.ts:195](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:195) |
| 味方Barrierバー | 味方HP内側Yから2px上 | 最大幅16、高さ1 | [src/render/fx/hud.ts:217](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:217) |
| 敵溜めゲージ | 非bossはHP内側Yから7px上、すなわち頭頂基準から12px上。bossは頭頂基準から8px上。Yは最低30 | 幅small26 / medium28 / large36 / huge58。高さboss4、その他3。外枠は幅/高さ各+4 | [src/render/fx/hud.ts:30](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:30)、[src/render/fx/hud.ts:57](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:57)、[src/render/fx/hud.ts:226](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:226) |
| BREAKゲージ | 溜めゲージ内側Y+高さ+3 | 溜めと同じ幅、内側高さ2、枠高さ4 | [src/render/fx/hud.ts:277](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:277) |
| 巨大ボスHP | 画面固定の(x,y)=(70,13) | 内側260×5、外側266×11 | [src/render/fx/hud.ts:318](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:318) |
| 影4人のHP | 画面固定。内側x=9,109,209,309、y=15 | 各82×3、外枠86×7。式はslotW=400/count、bw=round(slotW−18) | [src/render/fx/hud.ts:395](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:395)、[src/data/areas.ts:153](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:153) |

敵HPの「頭上5px」は**バー内側上端**の位置で、空白のすき間が5pxあるという意味ではない。（[src/render/fx/hud.ts:53](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:53)、[src/render/fx/hud.ts:168](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:168)）

### 状態アイコン・Mark・周囲のエフェクト

| 表示 | 位置・寸法 | 根拠 |
|---|---|---|
| 状態アイコンの共通サイズ | `iconScale=max(1,round(k×6.5/16))`、画像一辺=`16×iconScale` **デバイス画素**。常に6.5 world pxになるわけではない | [src/render/fx/hud.ts:533](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:533) |
| 敵Burn/有限時間Mark/Stun | HPバー右端+2 world px。縦中心はHP内側Y+1。bossは本体右端+2を横基準にする | [src/render/fx/hud.ts:541](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:541) |
| 味方Doom/Frozen/毒 | 中心Y=v.top−9 world px。アイコンの横間隔は画像一辺+2×k。毒は5×kの文字 | [src/render/fx/hud.ts:601](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:601) |
| Doom切迫時 | 残り1.5秒未満でアイコン倍率 `1+0.15×abs(sin(t×14))` | [src/render/fx/hud.ts:614](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:614) |
| スタンの星 | 星3個、中心Y=v.top−2、縦振幅2。横半径=max(6,v.w/2+1)、星サイズ引数1 | [src/render/fx/units.ts:475](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:475) |
| 有限時間Mark | 上左右の赤いL字。基準余白3px、線長2px、線幅1px | [src/render/fx/units.ts:483](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:483) |
| 手動フォーカスMark（Infinity） | 金色の四隅。基準余白3pxに `round(sin(t×6))` を加算、線長4px、線幅1px。中央に1×1の点 | [src/render/fx/units.ts:483](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:483) |
| Mark登場時 | 最初の0.25秒、余白に最大10pxのpopを加算。上端=v.top−pad、下端=v.y+1+pad×0.5 | [src/render/fx/units.ts:485](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:485) |
| 凍結の氷 | 左=v.cx−v.w/2−3、上=v.top−3、幅=round(v.w+6)、高さ=round(v.y−v.top+4) | [src/render/fx/units.ts:424](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:424) |
| Barrierの輪 | 中心(v.cx,v.cy)、半径(v.w/2+4, v.h/2+4)。最初の0.3秒は最大1.25倍 | [src/render/fx/units.ts:445](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:445) |
| Ward六角形 | 半径r=max(v.w,v.h)×0.58+3、縦半径r×1.04 | [src/render/fx/units.ts:461](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/units.ts:461) |

溜め中の技名はゲージYから **6 world px上**、通常文字サイズ **6.2×k**、bossは **1.2倍**。中断可否ラベルはさらに **6.6×k×boss倍率** 上、文字サイズ **4.6×k**。エリート名はHP内側Yから **5 world px上**、文字サイズ **4.8×k**。（[src/render/fx/hud.ts:560](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:560)、[src/render/fx/hud.ts:596](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/fx/hud.ts:596)）

### クリックの当たり範囲

画像の不透明範囲を使わず、`SIZE_BOX` と余白で判定する。（[src/core/battle.ts:253](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:253)）

| size | 基本W×H | 上下左右6pxの余白を含む判定矩形W×H | 根拠 |
|---|---:|---:|---|
| small | 16×16 | 28×28 | [src/core/battle.ts:39](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:39)、[src/core/battle.ts:259](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:259) |
| medium | 22×26 | 34×38 | [src/core/battle.ts:39](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:39)、[src/core/battle.ts:259](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:259) |
| large | 32×38 | 44×50 | [src/core/battle.ts:39](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:39)、[src/core/battle.ts:259](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:259) |
| huge | 60×64 | 72×76 | [src/core/battle.ts:39](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:39)、[src/core/battle.ts:259](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:259) |

範囲は `x∈[e.x−W/2−6,e.x+W/2+6]`、`y∈[e.y−H−6,e.y+6]`。死亡中・untargetableは除外し、重なる場合はクリックXに敵Xが近いものを選ぶ。描画の踏み込み・登場補正・輪郭幅には追随しない。（[src/core/battle.ts:254](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/battle.ts:254)）

クリック位置はworld canvasのDOM矩形を用いて **400×180** 座標に戻す。カメラの揺れを差し引く処理はここにない。入力は `enemyAt` を呼び、Ranger加入時にfocusを設定する。（[src/render/renderer.ts:211](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:211)、[src/ui/app.ts:781](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:781)）

## 6. 戦闘以外の画面

### 野営地

背景canvasは戦闘と同じ論理解像度・内部画素数。キャラクターは通常の `unitFrame` をworldへ等倍で描く。（[src/render/renderer.ts:76](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:76)、[src/render/renderer.ts:1054](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:1054)、[src/render/sprites/scenes.ts:904](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:904)）

| キャラクター | 位置・向き | tier=0の画像寸法と下半身処理 | 根拠 |
|---|---|---|---|
| Guardian | x=164、足元y=150、右向き | 46×36、全画像 | [src/render/sprites/scenes.ts:989](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:989)、[src/render/sprites/data/heroes.ts:198](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:198) |
| Ranger | x=140、描画アンカーy=147、右向き | 元43×40を43×30に切り出す | [src/render/sprites/scenes.ts:990](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:990)、[src/render/sprites/scenes.ts:912](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:912)、[src/render/sprites/data/heroes.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:337) |
| Arcanist | x=238、描画アンカーy=147、左向きへ反転 | 元44×43を44×33に切り出す | [src/render/sprites/scenes.ts:991](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:991)、[src/render/sprites/scenes.ts:912](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:912)、[src/render/sprites/data/heroes.ts:482](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:482) |
| Oracle | x=262、足元y=150、左向きへ反転 | 42×38、全画像 | [src/render/sprites/scenes.ts:992](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:992)、[src/render/sprites/data/heroes.ts:595](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:595) |

座るキャラクターは `crop(0,0,画像幅,ay−6)`。**画像の下端から6pxを単純に切る処理ではない**。切り出し後のayも `ay−6` にする。その後、Y=146に **20×5px** の丸太を重ねる。（[src/render/sprites/scenes.ts:917](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:917)、[src/render/sprites/scenes.ts:990](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:990)、[src/render/sprites/scenes.ts:1000](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1000)）

待機コマは `floor(time×1.6)%2`、**1コマ0.625秒**。（[src/render/sprites/scenes.ts:994](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:994)）画面の帯高さはDPRとウィンドウ高から別途計算される。（[src/ui/app.ts:298](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:298)）

### パーティ画面

ポートレートcanvasの内部画素数とCSSサイズは **112×112**。足元は **(56,104)**。倍率は以下の式で毎回求める。（[src/ui/camp/party.ts:204](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/camp/party.ts:204)、[src/styles/camp.css:1777](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/styles/camp.css:1777)、[src/ui/camp/dom.ts:134](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/camp/dom.ts:134)）

`half=max(ax,画像幅−ax,1)`、`up=max(ay,1)`

`scale=max(1,floor(min((112−8)/(2×half),(112−10)/up)))`

現在の味方idle先頭コマはtier **0～5** のいずれも、この式の結果が**1倍**。したがってcanvasの112pxが体の高さではない。全画像を足元基準で描画する。（各味方のアート定義、[src/render/sprites/units.ts:214](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:214)、[src/ui/camp/dom.ts:134](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/camp/dom.ts:134)）

座り用の脚切り出しは使わない。外枠は `overflow:hidden`。枠下部には高さ **10px** の半透明疑似要素があり、canvas自体には `z-index:1` がある。ソース上はこれを脚専用の切り取りには使っていない。（[src/styles/camp.css:1754](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/styles/camp.css:1754)、[src/styles/camp.css:1767](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/styles/camp.css:1767)、[src/ui/camp/dom.ts:145](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/camp/dom.ts:145)）

コマ更新は **420ms** ごとのsetInterval。未加入キャラはtier=0、idle frame=0を暗色シルエットで表示する。（[src/ui/camp/party.ts:170](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/camp/party.ts:170)、[src/ui/camp/party.ts:531](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/camp/party.ts:531)）

### 加入通知

`spriteCanvas(hero,176,gearTier(level))` を呼ぶ。倍率は `max(1,floor(176/max(画像幅,画像高)))`。全画像を拡大し、拡大後の寸法そのものをcanvas内部寸法にする。ここでDPRは掛けない。（[src/ui/notices.ts:223](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/notices.ts:223)、[src/ui/notices.ts:132](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/notices.ts:132)）

| 味方 | tier 0～4：倍率 / canvas W×H | tier 5：倍率 / canvas W×H | 根拠 |
|---|---|---|---|
| Guardian | 3倍 / 138×108 | 3倍 / 144×114 | [src/render/sprites/data/heroes.ts:198](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:198)、[src/ui/notices.ts:148](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/notices.ts:148)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |
| Ranger | 4倍 / 172×160 | 3倍 / 135×126 | [src/render/sprites/data/heroes.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:337)、[src/ui/notices.ts:148](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/notices.ts:148)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |
| Arcanist | 4倍 / 176×172 | 3倍 / 138×135 | [src/render/sprites/data/heroes.ts:482](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:482)、[src/ui/notices.ts:148](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/notices.ts:148)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |
| Oracle | 4倍 / 168×152 | 4倍 / 176×160 | [src/render/sprites/data/heroes.ts:595](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:595)、[src/ui/notices.ts:148](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/notices.ts:148)、[src/render/sprites/units.ts:321](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:321) |

idleのみ、RAF中で前回更新から **420ms超** になったとき次コマへ進む。脚専用のcropはない。親ポートレートはoverflow:hiddenで、高さは通常 **250CSS px**、画面幅 **760px以下** では **200px**、画面高 **700px以下** では後のCSSルールにより **210px**。（[src/ui/notices.ts:157](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/notices.ts:157)、[src/styles/screens.css:761](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/styles/screens.css:761)、[src/styles/screens.css:1462](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/styles/screens.css:1462)、[src/styles/screens.css:1486](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/styles/screens.css:1486)）

### タイトル

味方の **tier=0、idle frame=0** を黒いシルエット化し、**1.5倍**にして縁の光を加える。キャラクター自身のコマは固定。（[src/render/sprites/scenes.ts:1079](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1079)）

| キャラクター | タイトル用画像W×H | xの足元基準 | 根拠 |
|---|---:|---:|---|
| Guardian | 69×54 | 300 | [src/render/sprites/scenes.ts:1080](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1080)、[src/render/sprites/data/heroes.ts:198](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:198)、[src/render/sprites/pix.ts:418](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:418) |
| Ranger | 64×60 | 264 | [src/render/sprites/scenes.ts:1080](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1080)、[src/render/sprites/data/heroes.ts:337](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:337)、[src/render/sprites/pix.ts:418](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:418) |
| Arcanist | 66×64 | 230 | [src/render/sprites/scenes.ts:1080](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1080)、[src/render/sprites/data/heroes.ts:482](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:482)、[src/render/sprites/pix.ts:418](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:418) |
| Oracle | 63×57 | 196 | [src/render/sprites/scenes.ts:1080](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1080)、[src/render/sprites/data/heroes.ts:595](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/data/heroes.ts:595)、[src/render/sprites/pix.ts:418](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:418) |

Yは `round(hillY(x))+3−round(元ay×1.5)`。脚のcropはしない。前景の地形を描いた後にシルエットを描く。（[src/render/sprites/scenes.ts:1086](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1086)、[src/render/sprites/scenes.ts:1116](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1116)）

さらにcanvas全体を `max(1,viewport幅/canvas表示幅,viewport高/canvas表示高)` のCSS transformで画面を覆うように拡大する。タイトルの最終表示は、キャラクターの1.5倍加工だけでは決まらない。（[src/ui/app.ts:317](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:317)、[src/styles/hud.css:274](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/styles/hud.css:274)）

補足：全身ポートレートとは別に `hero_*` アイコンがある。こちらは頭・肩を **16×16** に切り出す処理で、下半身が含まれない。（[src/render/sprites/icons.ts:31](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/icons.ts:31)）

## 7. 描画とビルド

### fps・キャッシュ

- **描画はrequestAnimationFrameごと**。コード上で描画fpsを固定していない。実測fpsはこの調査では未取得。（[src/ui/app.ts:211](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:211)）
- 戦闘シミュレーションは固定 **1/60秒** 刻み。通常は1描画フレームにつき最大 **8tick**、デバッグ速度に応じて上限が増える。これは描画が必ず60fpsという意味ではない。（[src/ui/app.ts:27](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:27)、[src/ui/app.ts:263](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:263)）
- 通常のフレーム間dtは最大 **0.1秒** に制限。描画用のシミュレーション時刻はbattle.timeと未処理accumulatorを使う。（[src/ui/app.ts:29](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:29)、[src/ui/app.ts:218](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/ui/app.ts:218)、[src/render/renderer.ts:905](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/renderer.ts:905)）
- スプライトはASCIIマップとパレットから生成する。`gridCache` は正規化マップ、`frameCache` はキー・ポーズ・コマ・tierごとのPix、WeakMapはPix/UnitFrameに対応するcanvasと白シルエットを保持する。**初回取得時に生成し、以後再利用する**。（[src/render/sprites/units.ts:119](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:119)、[src/render/sprites/units.ts:204](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:204)、[src/render/sprites/index.ts:31](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:31)、[src/render/sprites/index.ts:50](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:50)）
- `preloadSprites` は存在し、全ポーズ・全コマ、味方はtier **0～5**、敵はtier **0** を事前生成できる。ただし `src` と起動入口を検索した結果、現在のアプリからこの関数を呼ぶ箇所はなかった。**事前生成APIがあることと、起動時に全画像を事前生成していることは別**。（[src/render/sprites/index.ts:200](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:200)、[src/main.ts:10](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/main.ts:10)）
- 野営地の座り画像やタイトルの背景・人物画像にもキャッシュがある。（[src/render/sprites/scenes.ts:910](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:910)、[src/render/sprites/scenes.ts:1091](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/scenes.ts:1091)）

### Vite単一HTMLと外部モジュール

以下はこのプロジェクトの設定と、インストール済みプラグインの実装で確認した内容。外部ハーネスの取り込みやビルド変更は実施していない。

| 項目 | 確認できた制約・挙動 | 根拠 |
|---|---|---|
| ビルド手順 | `tsc --noEmit && vite build`。型チェック成功後にViteへ進む | [package.json:8](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/package.json:8) |
| モジュール・実行環境 | TypeScriptのmoduleはESNext、resolutionはbundler、targetはES2022、libにはDOM。strict、erasableSyntaxOnly、verbatimModuleSyntax、isolatedModulesが有効 | [tsconfig.json:3](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/tsconfig.json:3) |
| HTML入口 | HTMLからsrc/main.tsをmodule scriptとして読み込む | [index.html:23](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/index.html:23) |
| 単一HTMLプラグイン | `viteSingleFile()`、base='./'、build target='es2022' | [vite.config.ts:4](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/vite.config.ts:4) |
| アセットのinline条件 | プロジェクト設定はassetsInlineLimit=100000000。ただし既定のrecommended設定により、プラグインが `()=>true` に上書きする | [vite.config.ts:7](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/vite.config.ts:7)、[node_modules/vite-plugin-singlefile/dist/esm/index.js:22](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/dist/esm/index.js:22) |
| JSの分割 | インストール済みViteは8.3.2。この版向け分岐では `output.codeSplitting=false`。以前の版向けの `inlineDynamicImports=true` と区別されている | [node_modules/vite/package.json:3](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite/package.json:3)、[node_modules/vite-plugin-singlefile/dist/esm/index.js:43](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/dist/esm/index.js:43) |
| CSS | `cssCodeSplit=false` にし、生成CSSをHTMLのstyleへ埋め込む | [node_modules/vite-plugin-singlefile/dist/esm/index.js:31](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/dist/esm/index.js:31)、[node_modules/vite-plugin-singlefile/dist/esm/index.js:107](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/dist/esm/index.js:107) |
| 外部モジュールのコード | プラグインが埋め込む対象はViteのbundleに入ったJS/CSS。生成JSのscript srcをinline scriptに置換する。別のURLや任意ファイルを探して読み込む処理ではない | [node_modules/vite-plugin-singlefile/dist/esm/index.js:4](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/dist/esm/index.js:4)、[node_modules/vite-plugin-singlefile/dist/esm/index.js:77](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/dist/esm/index.js:77) |
| publicや別ファイル | publicの静的ファイルは自動inlineされない。プラグインもその処理を行わない。bundle内でもJS/CSS以外は未inline通知の対象 | [node_modules/vite-plugin-singlefile/README.md:109](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/README.md:109)、[node_modules/vite-plugin-singlefile/dist/esm/index.js:124](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/node_modules/vite-plugin-singlefile/dist/esm/index.js:124) |
| external指定 | 現在のvite.config.tsにはrollupOptions.external等の除外指定がない | [vite.config.ts:4](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/vite.config.ts:4) |
| キャラクターAPI | 現在の呼び出し側が受け取るものはcanvasと足元ax/ay。ポーズ・コマ・tierによる取得とframeCountも使う | [src/render/sprites/index.ts:13](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:13)、[src/render/sprites/index.ts:63](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:63)、[src/render/sprites/index.ts:78](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/index.ts:78) |

したがって、現在の単一HTML化で確認できる対象は「ビルド時にbundleへ取り込まれたコード・対象アセット」。外部ハーネスをそのままimportした場合の型チェック、ブラウザー上の動作、追加ファイルの有無については、実行していないため可否を断定しない。

## 8. 既存スクリーンショット

調査対象プロジェクト内の画像を列挙し、該当画像と生成コードを確認した範囲では、**「実際の戦闘画面・味方全員・第1エリアの敵・等倍」を満たす既存スクリーンショットは見つからなかった**。

近い画像は [docs/art/battle_ashwood.png](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/docs/art/battle_ashwood.png)。

ただしこれは次の内容で、指定条件を満たす実プレイ撮影ではない。

- `scripts/sprite-preview.ts` の `battleSheet` が生成するアート確認画像。（[scripts/sprite-preview.ts:242](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/scripts/sprite-preview.ts:242)）
- **400×180** の場面を上下に並べた **400×360** の画像を **2倍** で保存するので、ファイル寸法は **800×720**。PNGヘッダーの寸法も一致した。（[scripts/sprite-preview.ts:249](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/scripts/sprite-preview.ts:249)、[scripts/sprite-preview.ts:253](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/scripts/sprite-preview.ts:253)、[scripts/sprite-preview.ts:256](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/scripts/sprite-preview.ts:256)、[scripts/sprite-preview.ts:272](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/scripts/sprite-preview.ts:272)）
- Ashwoodの `area.index=0` に対して `i>area.index` の味方を除くため、描かれる味方は **Guardianのみ**。（[src/data/areas.ts:8](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/data/areas.ts:8)、[src/core/types.ts:5](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/core/types.ts:5)、[scripts/sprite-preview.ts:258](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/scripts/sprite-preview.ts:258)）
- 上段は通常編成、下段はボス編成で、ゲームのHUDや実行中の戦闘処理をキャプチャしたものではない。（[scripts/sprite-preview.ts:251](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/scripts/sprite-preview.ts:251)）

## 付録：計測の再現方法

以下をプロジェクトルートからメモリー上で実行した。ファイルを出力しない。値を変更せず既存の生成関数を利用するため、アート変更後の再確認にも同じ条件で使える。

```javascript
import { unitKeys, unitFrame, unitFrameCount } from './src/render/sprites/units.ts';
import { bbox } from './src/render/sprites/pix.ts';

for (const key of unitKeys()) {
  const f = unitFrame(key, 'idle', 0, 0);
  const b = bbox(f.pix);
  const heights = ['idle', 'walk', 'attack', 'cast', 'hurt'].flatMap(pose =>
    Array.from({ length: unitFrameCount(key, pose) }, (_, i) => {
      const q = bbox(unitFrame(key, pose, i, 0).pix);
      return q.y1 - q.y0 + 1;
    }),
  );
  console.log({
    key,
    canvas: [f.pix.w, f.pix.h],
    drawnHeight: b.y1 - b.y0 + 1,
    liveHeightRange: [Math.min(...heights), Math.max(...heights)],
    anchor: [f.ax, f.ay],
  });
}
```

生成処理の根拠は [src/render/sprites/units.ts:214](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/units.ts:214)、境界計算の根拠は [src/render/sprites/pix.ts:435](C:/DevelopmentEnvironment/Incremental_Rpg/incremental_rpg_opus/src/render/sprites/pix.ts:435)。tierやposeを変えれば、上の注記通り結果も変わる。

