/**
 * EMBERBOUND EXPEDITION — Rimequeen Isveil (game id `rimequeen`, area 4 boss), the Oracle's robed body (from the
 * mage) after the user's reference image: long wavy silver-lavender hair, pointed ears, a pale face with dark
 * stern eyes, a tall crown of ice spikes, a deep blue gown flaring wide to the ground with white fur trim and a
 * pale blue front panel patterned with ice diamonds, a fur collar with a snowflake brooch, wide bell sleeves
 * hung with ice drops, an open hand, and a silver staff crowned with a great snowflake.
 * Actions (plan/EMBERBOUND_PRODUCTION.md): `attack` is the ice spear (a quick thrust of the staff; the shard is
 * released at u = .12), `cast` = the Frozen Tomb / Absolute Zero wind-up the game loops (staff raised, palm out,
 * the snowflake glowing, snow circling), and the shared hurt. She does not walk.
 * Anatomical +b is LEFT (staff), −b RIGHT (open hand).
 */
import {
  TAU, rigFrame, renderRig, ik2, keyframes, nrm3, travelDir,
  paint, paintA, ellipsePts, taperPts, cLine, mittenHand, legParts2,
  strokePath, DRAW, PAL,
} from '../../src/authoring.js';
import { hurtAction, phase, sample, hurtAmount, fallTilt, withTilt } from '../shared/emberbound/actions.js';

const C = {
  gown:'#3f6596', gownDark:'#2d4c78', panel:'#a9cbe6', panelDark:'#7ea8cf', fur:'#f3f1ec', furShade:'#d3d8de',
  hair:'#e9e4f1', hairShade:'#c4bad9', hairLight:'#ffffff', skin:'#e9eef3', skinShade:'#cfd8e2',
  silver:'#dde4ec', silverDark:'#97a3b3', ice:'#cde8f5', iceDark:'#8dbbdb', glow:'#dff6ff', eye:'#262d3b', ink:PAL.ink,
};
const IDLE_T=3.4;
// Game timing (seconds).
export const QUEEN_ATTACK_T=.3;   // ice spear: the thrust peaks and the shard leaves at u = .12
export const QUEEN_WINDUP_T=.6;   // Frozen Tomb / Absolute Zero wind-up: a loop
const KEYS=Object.freeze({ attack:[0,.06,.12,.2,.3,.45,.6,.8] });
const blend=(keys,u)=>keyframes(keys,u);
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const shape=(ctx,pts,fill,o={})=>paintA(ctx,pts,{fill,w:1.5,depth:1.7,
  speck:.55,speckScale:.3,amp:.22,...o});
const oval=(ctx,x,y,rx,ry,fill,o={})=>paint(ctx,ellipsePts(x,y,rx,ry,28),
  {fill,w:1.2,depth:1,speck:.35,speckScale:.3,amp:.2,...o});
/** A small crystal drop hanging from (x, y). */
const drop=(ctx,x,y,l=6)=>{shape(ctx,[[x,y],[x+1.8,y+l*.45],[x,y+l],[x-1.8,y+l*.45]],C.ice,{w:.8,depth:.2,speck:0,amp:.05});};

// The free right hand held out open in front of the chest.
const REST={staff:[0,39,43],palm:[13,-19,33]};
export function queenPose(action,t) {
  const P={body:[0,0,0],footL:[0,6,0],footR:[0,-6,0],
    staff:REST.staff.slice(),palm:REST.palm.slice(),pitch:.07,sway:0,glow:0,snow:-1,t,blink:false};
  if(action==='attack') {
    // Ice spear: a quick thrust that points the snowflake ahead, a flash and a shard, then back to rest.
    const u=phase(t,QUEEN_ATTACK_T);
    P.staff=blend([[0,REST.staff],[.12,[25,20,42]],[.45,[24,21,42]],[1,REST.staff]],u);
    P.palm=blend([[0,REST.palm],[.12,[15,-17,38]],[.45,[15,-17,38]],[1,REST.palm]],u);
    const a=blend([[0,[0,.07,0]],[.12,[2,2.4,1.2]],[.45,[2,2.4,1.2]],[1,[0,.07,0]]],u);
    P.body=[a[0],0,0];P.pitch=a[1];P.sway=a[2];
    P.glow=sample([[0,[.3]],[.1,[1]],[.3,[.6]],[.6,[0]],[1,[0]]],u);
  } else if(action==='cast') {
    // The wind-up: the staff raised high beside the head, the palm out, the snowflake pulsing; periodic in u.
    const u=phase(t,QUEEN_WINDUP_T),w=Math.sin(TAU*u);
    P.staff=[4,30,68+w*.6];P.palm=[24,-23,46+w*.6];P.pitch=-.15;P.sway=-.5+w*.3;P.body=[-1,0,.5];
    P.glow=.8+.2*w;P.snow=u;
  } else if(action==='hurt') {
    const k=hurtAmount(t);
    P.body=[-2.5*k,0,-1.2*k];P.staff=[REST.staff[0]-2*k,REST.staff[1],REST.staff[2]+3*k];
    P.palm=[REST.palm[0]-2*k,REST.palm[1],REST.palm[2]+5*k];P.sway=1.5*k;P.blink=k>.5;
  } else {
    const s=Math.sin(TAU*phase(t,IDLE_T));P.body[2]=s*.55;P.sway=s*.6;
    P.glow=.35+.12*Math.sin(t*2.6);
  }
  return P;
}

function gown(ctx,rf,P) {
  const p=rf.U(0,0,0),sw=P.sway;
  ctx.save();ctx.translate(p.x,p.y);
  // A deep blue gown flaring wide to the ground, a white fur trim along the hem.
  const hem=[[-38+sw,1],[-24,3],[-8,2],[8,3],[24,2],[38+sw,1]];
  shape(ctx,[[-12,-51],[-17,-44],[-16,-34],[-24+sw,-18],[-34+sw,-5],...hem,[34+sw,-5],[24+sw,-18],[16,-34],[15,-43],[11,-51]],C.gown,{w:1.9,depth:2.2});
  shape(ctx,[...hem.map(([x,y])=>[x,y+.5]),...hem.slice().reverse().map(([x,y])=>[x*.97,y-5])],C.fur,{w:1.3,depth:.8,speck:.6,amp:.5,step:3});
  const Q=pts=>pts.map(([b,z])=>{const q=rf.U(9,b,z);return[q.x-p.x,q.y-p.y];});
  // Pale blue front panel widening to the hem, edged with fur, patterned with ice diamonds.
  shape(ctx,Q([[-5,34],[-8,18],[-12,4],[-14,-1],[14,-1],[12,4],[8,18],[5,34]]),C.panel,{w:1.2,depth:1});
  for(const side of [-1,1]) strokePath(ctx,Q([[side*5,34],[side*8,18],[side*12,4],[side*14,-1]]).map(([x,y])=>({x,y})),2.4,false,C.fur);
  for(const z of [26,16,7]){const d=rf.U(9.5,0,z);shape(ctx,[[d.x-p.x,d.y-p.y-3.4],[d.x-p.x+2,d.y-p.y],[d.x-p.x,d.y-p.y+3.4],[d.x-p.x-2,d.y-p.y]],C.panelDark,{w:.6,depth:0,speck:0});}
  // A silver girdle with a hanging ice drop.
  shape(ctx,[[-14,-36],[14,-36],[14,-32.5],[-14,-32.5]],C.silver,{w:1,depth:.6});
  const g=rf.U(10,0,34);drop(ctx,g.x-p.x,g.y-p.y,8);
  // Fur collar round the shoulders with a snowflake brooch.
  shape(ctx,[[-15,-52],[-21,-45],[-20,-39],[-8,-41],[0,-39],[8,-41],[20,-39],[21,-45],[15,-52],[0,-48]],C.fur,{w:1.4,depth:1.4,speck:.6,amp:.5,step:3});
  const b=rf.U(10,0,45);
  for(let i=0;i<3;i++){const a=i*Math.PI/3;cLine(ctx,[[b.x-p.x-Math.cos(a)*3.4,b.y-p.y-Math.sin(a)*3.4],[b.x-p.x+Math.cos(a)*3.4,b.y-p.y+Math.sin(a)*3.4]],.9);}
  oval(ctx,b.x-p.x,b.y-p.y,1.4,1.4,C.ice,{w:.5,depth:0,speck:0});
  cLine(ctx,[[-18+sw,-14],[-12,-28],[-9,-35]],.6);
  cLine(ctx,[[19+sw,-13],[13,-27],[11,-34]],.6);
  ctx.restore();
}

/** Long wavy silver hair falling well past the shoulders: its own part, behind the gown. */
function backHair(ctx,h,rf) {
  ctx.save();ctx.translate(h.x,h.y);ctx.scale(rf.sx,1);
  shape(ctx,[[-22,-10],[-27,4],[-26,16],[-31,26],[-27,36],[-32,46],[-24,52],[-17,46],[-10,52],[-2,46],[4,50],[10,44],[16,48],[22,40],[24,26],[23,8],[19,-8]],C.hair,{w:1.6,depth:1.6});
  for(const pts of [[[-24,12],[-27,26],[-25,40]],[[-16,20],[-16,34],[-12,46]],[[14,18],[18,30],[16,42]]]) cLine(ctx,pts,.55);
  shape(ctx,[[-24,20],[-27,34],[-24,44],[-20,34]],C.hairShade,{w:0,depth:0,speck:.4});
  ctx.restore();
}

function head(ctx,h,rf,P) {
  ctx.save();ctx.translate(h.x,h.y);ctx.scale(rf.sx,1);
  // A tall crown of ice spikes (behind the hair's top), then the hair mass.
  for(const [x,hgt,w] of [[-14,12,4],[-7,18,4.6],[1,26,5.2],[9,18,4.6],[16,12,4]]) {
    shape(ctx,[[x-w,-20],[x-w*.4,-20-hgt*.7],[x,-20-hgt],[x+w*.4,-20-hgt*.7],[x+w,-20]],C.ice,{w:1.3,depth:.8,light:.35,speck:.2,amp:.06});
    cLine(ctx,[[x,-21],[x,-20-hgt*.8]],.45);
  }
  shape(ctx,[[-19,-19],[-11,-23],[7,-23],[18,-17],[22,-4],[21,15],[15,22],
    [12,17],[7,23],[-1,21],[-9,23],[-14,18],[-20,20],[-23,9],[-21,-4]],C.hair,{w:1.7});
  shape(ctx,[[-18,-2],[-15,6],[-16,16],[-12,25],[-18,23],[-22,14],[-21,3]],C.hair,{w:1});
  shape(ctx,[[19,-4],[22,9],[19,19],[16,22],[18,11],[15,2]],C.hair,{w:1});
  oval(ctx,2,1,18.4,20,C.skin,{w:1.6,speck:0,depth:1.1});
  // A long pointed ear.
  shape(ctx,[[-13,4],[-27,-2],[-20,8],[-14,11]],C.skin,{w:1.1,depth:.6,speck:0});
  cLine(ctx,[[-15,6],[-22,2]],.5);
  // Dark, stern almond eyes, a small flat mouth.
  if(P.blink) for(const x of [-2,12]) cLine(ctx,[[x-2.4,5],[x+2.4,5]],.9);
  else for(const [x,y] of [[-2,5],[12,3]]) {
    shape(ctx,[[x-2.6,y+1],[x-1,y-3],[x+2.4,y-1.6],[x+2,y+2.6],[x-1,y+3]],C.eye,{w:.5,depth:0,speck:0,amp:.05});
    oval(ctx,x+.4,y-1,.7,.9,'#ffffff',{w:0,depth:0,speck:0});
  }
  cLine(ctx,[[-6,-1],[0,-2]],.8);cLine(ctx,[[9,-2.5],[15,-2]],.8);
  cLine(ctx,[[3,15],[7,15]],.65);
  shape(ctx,[[-21,-8],[-14,-20],[1,-24],[15,-19],[21,-9],[23,4],[17,-3],
    [19,9],[13,4],[10,-7],[6,1],[4,-12],[-2,-1],[-2,-14],[-9,-3],[-14,2],[-13,-9],[-20,5]],C.hair,{w:1.2});
  cLine(ctx,[[-12,-16],[-16,-6],[-18,2]],.55);
  cLine(ctx,[[3,-20],[1,-13],[-3,-7]],.55);
  // The crown band across the brow with a central ice gem.
  shape(ctx,[[-19,-17],[19,-17],[19,-13],[-19,-13]],C.silver,{w:1,depth:.5});
  shape(ctx,[[1,-19],[3.4,-15],[1,-11],[-1.4,-15]],C.ice,{w:.7,depth:0,speck:0});
  for(const x of [-17,19]) drop(ctx,x,-13,6);
  ctx.restore();
}

function sleeve(ctx,rf,j) {
  const s=rf.U(...j.S),e=rf.U(...j.E),h=rf.U(...j.H);
  paint(ctx,taperPts(s,e,6,5.6),{fill:C.gown,w:1.5,depth:1.6,speck:.5,speckScale:.3});
  const dx=h.x-e.x,dy=h.y-e.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
  const cuff={x:h.x-dx/L*3,y:h.y-dy/L*3};
  // A wide bell sleeve hanging low below the forearm, a fur cuff, two ice drops.
  paint(ctx,[{x:e.x+nx*5,y:e.y+ny*5},{x:cuff.x+nx*8,y:cuff.y+ny*8},{x:cuff.x+nx*4,y:cuff.y+ny*4+14},
    {x:cuff.x-nx*7,y:cuff.y-ny*7},{x:e.x-nx*4,y:e.y-ny*4}],{fill:C.gown,w:1.5,depth:1.8,speck:.5,speckScale:.3});
  paint(ctx,taperPts({x:cuff.x-nx*7,y:cuff.y-ny*7},{x:cuff.x+nx*8,y:cuff.y+ny*8},2.2,2.2),{fill:C.fur,w:.9,depth:.4,speck:.3,amp:.4});
  for(const k of [.3,.9]) drop(ctx,cuff.x+nx*(8*k-1)+1,cuff.y+ny*(8*k-1)+6+k*8,6);
  cLine(ctx,[[e.x,e.y+2],[cuff.x-dx/L*5,cuff.y-dy/L*5]],.6);
}

function staff(ctx,rf,P) {
  const axis=P.staffAxis,at=z=>rf.U(...P.staff.map((v,i)=>v+axis[i]*z));
  // A silver shaft wound with a thin ice ribbon.
  const shaft=[-38,-30,-22,-14,-6,2,10,18,26,33].map(z=>at(z));
  strokePath(ctx,shaft,5*DRAW.lw,false,C.ink);strokePath(ctx,shaft,3.1,false,C.silver);
  for(let z=-30;z<26;z+=7){const a=at(z),b=at(z+4);cLine(ctx,[[a.x-2.6,a.y+1],[b.x+2.6,b.y-1]],.9);strokePath(ctx,[{x:a.x-2.2,y:a.y+.8},{x:b.x+2.2,y:b.y-.8}],1.1,false,C.iceDark);}
  const bt=at(-38);shape(ctx,[[bt.x-2,bt.y],[bt.x,bt.y+6],[bt.x+2,bt.y]],C.ice,{w:.8,depth:0,speck:0});
  // The snowflake head: six crystal arms with side barbs round a gem.
  const c=at(46),glow=P.glow;
  if(glow>0){ctx.save();ctx.globalAlpha=glow*.35;oval(ctx,c.x,c.y,14+glow*6,14+glow*6,C.glow,{w:0,depth:0,speck:0});ctx.restore();}
  const top=at(60),ang0=Math.atan2(top.y-c.y,top.x-c.x);
  for(let i=0;i<6;i++){
    const a=ang0+i*TAU/6,ux=Math.cos(a),uy=Math.sin(a),px=-uy,py=ux,R=13;
    const P2=(s,w)=>[c.x+ux*s+px*w,c.y+uy*s+py*w];
    shape(ctx,[P2(2,-2),P2(R-3,-2.4),P2(R+2,0),P2(R-3,2.4),P2(2,2)],C.ice,{w:1.1,depth:.4,light:.3,speck:0,amp:.05});
    for(const sgn of [-1,1]) shape(ctx,[P2(R*.5,sgn*1.6),P2(R*.68,sgn*5.4),P2(R*.75,sgn*1.6)],C.ice,{w:.8,depth:0,speck:0,amp:.04});
  }
  oval(ctx,c.x,c.y,4,4,C.silver,{w:1,depth:.4,speck:0});
  oval(ctx,c.x,c.y,2.2,2.2,C.iceDark,{w:0,depth:0,speck:0});
  const c0=at(31.5),c1=at(36);
  strokePath(ctx,[c0,c1],5*DRAW.lw,false,C.ink);strokePath(ctx,[c0,c1],3.4,false,C.silverDark);
  if(glow>.5) for(let i=0;i<6;i++){const a=i*TAU/6+.5;cLine(ctx,[[c.x+Math.cos(a)*17,c.y+Math.sin(a)*17],[c.x+Math.cos(a)*21,c.y+Math.sin(a)*21]],.55);}
}

function magic(ctx,rf,P,direction) {
  if(P.snow<0) return;
  // Snow circling her as the spell gathers (positions cycle with the loop).
  const c=rf.U(0,0,40);
  for(let i=0;i<8;i++){
    const u=(P.snow+i/8)%1,a=TAU*u+i,r=30+(i%3)*8,x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r*.45-u*20;
    ctx.save();ctx.globalAlpha=Math.sin(Math.PI*u);
    for(let k=0;k<3;k++){const b=k*Math.PI/3,ln=[{x:x-Math.cos(b)*3.6,y:y-Math.sin(b)*3.6},{x:x+Math.cos(b)*3.6,y:y+Math.sin(b)*3.6}];
      strokePath(ctx,ln,2.6*DRAW.lw,false,PAL.ink);strokePath(ctx,ln,1.3,false,'#ffffff');}
    ctx.restore();
  }
  void direction;
}

/** The open right hand, palm out. */
function openHand(ctx,h,e,sx) {
  mittenHand(ctx,h,h.x-e.x,h.y-e.y-4,3.4,C.skin,{thumbSide:-sx});
}

export function drawRimequeen(ctx,x,y,direction,action,t,scale=1,opts={}) {
  const P=queenPose(action,t),rf=rigFrame(direction,P.body),U=rf.U;
  // Facing left (staff hand near) the forward point aims the staff at the viewer: turn it back to the travel
  // direction while it strikes (SIDE_VIEW_GUIDE.md 2.3). Facing right it already points ahead.
  P.staffAxis=nrm3([P.pitch,.35,1]);
  if(direction==='L'&&action==='attack') P.staffAxis=travelDir(rf,P.staffAxis,
    keyframes([[0,[0]],[.08,[1]],[.45,[1]],[.7,[0]],[1,[0]]],phase(t,QUEEN_ATTACK_T))[0]);
  // The gown reaches the ground, so only the shoes would show; the legs stay as the Oracle's for the stance.
  const parts=legParts2(ctx,rf,P,{pants:C.gownDark,boot:C.silverDark,cuff:C.silver,footR:3.7,soleR:3.3});
  const headCenter=U(1.5,0,71);
  const layer=p=>U(...p).d>0?40:-20;
  parts.push({id:'hairBack',d:-5,draw:()=>backHair(ctx,headCenter,rf)});
  parts.push({id:'gown',d:0,draw:()=>gown(ctx,rf,P)});
  parts.push({id:'head',d:100,draw:()=>head(ctx,headCenter,rf,P)});
  for(const [side,H] of [[1,P.staff],[-1,P.palm]]) {
    const S=[0,side*13,49],E=ik2(S,H,14,15,[-3,side*4,-14]),j={S,E,H};
    const d=side===-1?25:layer(mid(S,H));
    // Facing left the left-hand staff is nearest; raised for the spell it passes beside the head in both facings.
    const staffInFront=side===1&&(direction==='L'||H[2]>58);
    parts.push({id:'sleeve'+side,d,draw:()=>sleeve(ctx,rf,j)});
    if(side===1) parts.push({id:'staff',d:staffInFront?101:d+1,draw:()=>staff(ctx,rf,P)});
    parts.push({id:'hand'+side,d:staffInFront?102:d+(side===-1?.5:2),draw:()=>{
      const h=U(...H),e=U(...E);
      if(side===1) mittenHand(ctx,h,h.x-e.x,h.y-e.y,3.2,C.skin,{thumbSide:side*rf.sx});
      else openHand(ctx,h,e,rf.sx);
    }});
  }
  parts.push({id:'magic',d:110,draw:()=>magic(ctx,rf,P,direction)});
  withTilt(ctx,x,y,scale,rf.sx,fallTilt(action,t),false,
    ()=>renderRig(ctx,x,y,scale,parts,{prefix:'eb-rimequeen',boil:0,shadow:opts.shadow}));
  return {pose:P,order:parts.map(p=>p.id)};
}

export const character=Object.freeze({
  id:'eb-rimequeen',label:'Rimequeen Isveil — EMBERBOUND',kind:'humanoid',directional:true,draw:drawRimequeen,
  actions:{idle:{period:IDLE_T,frames:16},
    attack:{period:QUEEN_ATTACK_T,keys:KEYS.attack,once:true,releaseAt:.12},
    cast:{period:QUEEN_WINDUP_T,frames:8},
    hurt:hurtAction},
  frameBox:{x0:-120,x1:120,y0:-170,y1:30},
  equipment:{leftHand:'staff',rightHand:'open hand'},
  emberbound:{gameId:'rimequeen',heightPx:68,facing:'L'},
});
export const studio=Object.freeze({order:29,name:"Rimequeen Isveil（霧氷の女王イスヴェイル）",category:"EMBERBOUND 第4エリア",
  description:"第4エリアのボス。白銀の長い髪、氷の冠、裾の広がった青いドレス、雪の結晶の杖。Frozen Tomb と Absolute Zero を使う。",
  preview:{direction:'L',phase:0}});
