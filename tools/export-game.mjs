import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverCharacters, ROOT } from './sync-catalog.mjs';
import { moduleFiles } from './lib/module-files.mjs';

export async function exportGame({ ids, out=path.join(ROOT,'exports','game-kit'), root=ROOT }) {
  if(!Array.isArray(ids)||!ids.length||ids.some(id=>!id))throw new Error('--characters warrior,archer のようにIDを指定してください');
  if(new Set(ids).size!==ids.length)throw new Error('選択IDが重複しています');
  const catalog=await discoverCharacters(root),selected=ids.map(id=>{const c=catalog.find(c=>c.id===id);if(!c)throw new Error(`未登録のID「${id}」。登録済み: ${catalog.map(c=>c.id).join(', ')}`);return c;});
  const folders=selected.filter(c=>!c.builtin).map(c=>path.posix.dirname(c.source));
  const graph=await moduleFiles(root,selected.map(c=>c.source),folders);
  out=path.resolve(out);root=path.resolve(root);const relative=path.relative(root,out),back=path.relative(out,root);
  const containsRoot=!back||(!back.startsWith('..'+path.sep)&&back!=='..'&&!path.isAbsolute(back));
  if(containsRoot||['src','characters','studio','scroll','docs','tools','tests'].some(d=>relative===d||relative.startsWith(d+path.sep)))throw new Error('出力先はソースと重ならない新しいフォルダにしてください');
  try{await readdir(out);throw new Error(`出力先は既に存在します: ${out}。別の --out を指定してください`);}catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(out,{recursive:true});
  await cp(path.join(root,'src'),path.join(out,'src'),{recursive:true});
  for(const file of graph.filter(f=>!f.startsWith('src/'))){await mkdir(path.dirname(path.join(out,file)),{recursive:true});await cp(path.join(root,file),path.join(out,file));}
  await mkdir(path.join(out,'scroll'),{recursive:true});
  for(const file of ['scroll/game.js','scroll/controls.js'])await cp(path.join(root,file),path.join(out,file));
  await mkdir(path.join(out,'characters'),{recursive:true});
  const imports=selected.map((c,i)=>`import { ${c.exportName} as c${i} } from ${JSON.stringify('../'+c.source)};`).join('\n');
  await writeFile(path.join(out,'characters/register.js'),`${imports}\nexport const characters = [${selected.map((_,i)=>'c'+i).join(', ')}];\nexport function registerCharacters(renderer) { for (const character of characters) renderer.registerCharacter(character); return characters; }\n`);
  await writeFile(path.join(out,'index.html'),KIT_HTML);await writeFile(path.join(out,'main.js'),KIT_JS);
  await mkdir(path.join(out,'tools'),{recursive:true});await cp(path.join(root,'tools/serve.mjs'),path.join(out,'tools/serve.mjs'));
  await writeFile(path.join(out,'package.json'),JSON.stringify({private:true,type:'module',scripts:{start:'node tools/serve.mjs 8091'}},null,2)+'\n');
  await writeFile(path.join(out,'USE_IN_GAME.md'),useInGame(ids));
  const manifest={generatedAt:new Date().toISOString(),selected:ids,additionalModules:graph.filter(f=>!f.startsWith('src/')),sampleGame:['scroll/game.js','scroll/controls.js'],sharedLibrary:'src/ (complete, unmodified)',studioIncluded:false};
  await writeFile(path.join(out,'export-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return{out,...manifest};
}

const useInGame=ids=>`# Inkstone ゲーム用キット (横スクロール)

選択: ${ids.join(', ')}

このフォルダだけで動作します。元のStudioは不要です。Node.js 18以上で次を実行してください。

\`\`\`sh
node tools/serve.mjs 8091
\`\`\`

http://127.0.0.1:8091/ を開きます。file:// では起動できません。← → (A / D) を押している間歩き、Spaceで攻撃します。場所 (鉛筆画の背景) とキャラクター、Live / Cached を切り替えられます。

ゲームへは src/ と characters/ を相対位置を保ってコピーしてください。scroll/game.js (歩く・攻撃・矢の規則) と scroll/controls.js (キー入力) はサンプルです。自分のゲームの規則に置き換えてかまいません。

\`\`\`js
import { createSideRenderer } from './src/index.js';
import { registerCharacters } from './characters/register.js';
const renderer = createSideRenderer({ canvas, width: 960, height: 540, characters: [], characterScale: 1.25,
  stage: { id: 'hall', length: 3200, start: 260, margin: 60, theme: 'dungeon' } });   // theme: dungeon / forest / town
registerCharacters(renderer);
// 自分のゲームループで:
renderer.follow(hero.x);
renderer.render({ timeSeconds, units: [{ id: 'hero', character: 'warrior', x: hero.x, direction: 'R', action: 'walk', actionTime }] });
\`\`\`

向きは右 R / 左 L です。歩行の actionTime は「横に歩いた距離 × sideWalkSecondsPerPixel(characterScale)」にすると足が滑りません。終了時は renderer.dispose() を呼んでください。

共通 src/ は未改変で全体を含み、内蔵3体のソースも静的依存として残ります。登録するのは選択したキャラクターだけです。未選択の追加キャラクターやStudio UIは含みません。ライブラリ更新時はsrc/全体を同じ版で置き換えてください。個別ファイルの混在は避けてください。
`;

const KIT_HTML=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Inkstone Game Kit</title><style>body{font:18px/1.6 system-ui;background:#f3eee3;color:#282e27;max-width:1100px;margin:24px auto;padding:20px}h1{font-size:32px}label{display:inline-block;margin:8px}select,button{font:inherit;min-height:50px;padding:8px;border:2px solid #60705d;border-radius:6px;background:#fffdf7}.stage{height:min(56vw,540px);border:1px solid #60705d}canvas{width:100%;height:100%;display:block;background:#eee9dd;touch-action:none}.moves{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}pre{font-size:16px;white-space:pre-wrap}</style><h1>Inkstone Game Kit</h1><p>選択したキャラクターを横スクロールのステージで動かします。← → (A / D) で歩き、Spaceで攻撃します。</p><label>場所 <select id="stage"></select></label><label>キャラクター <select id="character"></select></label><label>描画方式 <select id="mode"><option value="live">Live Vector</option><option value="cached">Cached Frames</option></select></label><div class="stage"><canvas id="scene" tabindex="0" aria-label="横スクロールのステージ。← → で歩き、Space で攻撃"></canvas></div><div class="moves"><button id="left" type="button">← 左へ歩く</button><button id="right" type="button">右へ歩く →</button><button id="attack" type="button">攻撃する（Space）</button></div><p id="status" role="status"></p><details><summary>診断情報</summary><pre id="diagnostics"></pre></details><script type="module" src="./main.js"></script></html>`;
const KIT_JS=`import { createSideRenderer } from './src/index.js';
import { characters, registerCharacters } from './characters/register.js';
import { createScrollGame, SCROLL_STAGES, CHARACTER_SCALE } from './scroll/game.js';
import { bindScrollControls } from './scroll/controls.js';
const $=id=>document.getElementById(id), canvas=$('scene');
let stage=SCROLL_STAGES.dungeon, def=characters[0], mode='live', time=0, last=null;
const renderer=createSideRenderer({canvas,width:960,height:540,characters:[],characterScale:CHARACTER_SCALE,stage});
registerCharacters(renderer);
const game=createScrollGame({stage,characterScale:CHARACTER_SCALE,character:def});
const controls=bindScrollControls(canvas,game);
controls.holdButton($('left'),-1);controls.holdButton($('right'),1);
$('attack').onclick=()=>{game.attack();canvas.focus({preventScroll:true});};
for(const [key,s] of Object.entries(SCROLL_STAGES)){const o=document.createElement('option');o.value=key;o.textContent=s.name;$('stage').append(o);}
for(const c of characters){const o=document.createElement('option');o.value=c.id;o.textContent=c.label||c.id;$('character').append(o);}
$('stage').onchange=()=>{stage=SCROLL_STAGES[$('stage').value];renderer.setStage(stage).centerOn(game.unit.x);canvas.focus({preventScroll:true});};
$('character').onchange=()=>{controls.clear();def=characters.find(c=>c.id===$('character').value);game.setCharacter(def);renderer.disposeCaches();if(mode==='cached')renderer.prepareCaches([def.id]);canvas.focus({preventScroll:true});};
$('mode').onchange=()=>{mode=$('mode').value;if(mode==='cached')renderer.prepareCaches([def.id]);else renderer.disposeCaches();renderer.setMode(mode);};
function resize(){const r=canvas.parentElement.getBoundingClientRect();if(r.width&&r.height)renderer.resize(Math.round(r.width),Math.round(r.height)).centerOn(game.unit.x);}
new ResizeObserver(resize).observe(canvas.parentElement);
function tick(now){const dt=last===null||document.hidden?0:Math.min(.05,(now-last)/1000);last=now;time+=dt;game.update(dt);renderer.follow(game.unit.x);renderer.render({timeSeconds:time,units:[game.unit],projectiles:game.projectiles});$('status').textContent=stage.name+' / '+def.id+' / '+game.status+' / x '+Math.round(game.unit.x);if(document.querySelector('details').open)$('diagnostics').textContent=JSON.stringify(renderer.getDiagnostics(),null,2);requestAnimationFrame(tick);}
resize();requestAnimationFrame(tick);
window.addEventListener('pagehide',event=>{if(!event.persisted){controls.dispose();renderer.dispose();}});
`;
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2);let ids,out;for(let i=0;i<args.length;i++){if(args[i]==='--characters')ids=args[++i]?.split(',').map(s=>s.trim());else if(args[i]==='--out')out=args[++i];else throw new Error('使い方: node tools/export-game.mjs --characters warrior,archer [--out 新しい出力先]');}console.log(JSON.stringify(await exportGame({ids,out}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
