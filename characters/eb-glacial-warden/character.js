/**
 * EMBERBOUND EXPEDITION — Glacial Warden (game id `glacial_warden`, elite), the Guardian's armoured body (by way of
 * the Frost Revenant) after the user's reference image: broad plate of pale blue ice with white frost edges, a
 * thick white fur collar over the shoulders, a closed helm with a crown of ice spikes and glowing eyes, a long
 * navy cloak, and a great hammer — a block of ice bound in iron on a wrapped iron haft — held in both hands.
 * Actions (plan/EMBERBOUND_PRODUCTION.md): attack = Frost Bash (the hammer raised and brought down, impact at
 * 0.135 s), `cast` = the Avalanche wind-up the game loops (the hammer held high, trembling), and the shared hurt.
 * Equipment is anatomical: the hammer is in both hands — LEFT (+b) on the upper haft, RIGHT (−b) lower down.
 */
import {
  TAU, DRAW, PAL, LW, LAYER,
  rigFrame, renderRig, footProj, legParts2, ik2, keyframes,
  nrm3, yawToBody, bodyLayerKey,
  paint, paintA, taperPts, ellipsePts, cLine, mittenHand, bbox,
  clipPath, stipplePoly, rimWeight,
} from '../../src/authoring.js';
import { hurtAction, phase, sample, hurtAmount, fallTilt, withTilt } from '../shared/emberbound/actions.js';

// Game timing (seconds).
export const WARDEN_ATTACK_T = .3;    // Frost Bash: the head lands at u = .45 (0.135 s)
export const WARDEN_WINDUP_T = .6;    // Avalanche wind-up: a loop
const KEYS = Object.freeze({ attack: [0, .1, .2, .28, .36, .45, .52, .62, .75, .88] });

const C = Object.freeze({
  steel: '#9dbbdc', light: '#d6e6f4', mid: '#7598c0', dark: '#4d6d96',
  black: '#1d2433', cloth: '#3b4a68', leather: '#4e4a52', leatherLight: '#6d6873',
  blue: '#3f4e8c', blueDark: '#2d3a6c', frost: '#f3f7fb', silver: '#d3dde8', silverDark: '#8d97a6',
  ice: '#cde6f4', iceDark: '#8db8d8', glow: '#86f2ea', fur: '#f2f0ea', iron: '#4a4f5a',
});
// The hammer, from the lower (right) hand along the haft: butt BUTT behind it, the upper (left) hand GRIP
// along, the ice head from HEAD0 to HEAD1 (local px).
const BUTT = 4, GRIP = 16, HEAD0 = 20, HEAD1 = 46;
// Poses as [lower hand a, b, z, haft direction] in chest (UY) coordinates.
const READY = [12, -8, 24, .1, .7, .7];
const WINDUP = [8, 14, 46, -.45, .35, .82];
const BASH = [[0, READY], [.25, WINDUP], [.36, [16, 10, 44, .3, .2, .93]], [.45, [13, 4, 38, .9, .1, -.42]], [.62, [13, 4, 37, .88, .1, -.45]], [.72, [16, 2, 34, .8, .3, .1]], [.85, [16, -4, 28, .4, .6, .6]], [1, READY]];
const metal = (ctx, points, o = {}) => {
  const shape = paint(ctx, points, {
    fill: C.steel, w: LW.part, depth: 2, light: .48, speck: 1.15, amp: .3, ...o,
  });
  // Fine pen grain inside the plate, strongest near its rim (the Guardian's engraved texture).
  stipplePoly(ctx, shape, 6.4, { color: '#3e4656', scale: .29, wfn: rimWeight(shape, .35, .5) });
  const bb = bbox(shape), w = bb.x1-bb.x0, h = bb.y1-bb.y0;
  if (w*h > 350) {
    ctx.save(); clipPath(ctx,shape);
    for (const [a,b,sl] of [[.23,.43,.08],[.72,.62,-.07],[.6,.2,.055]]) {
      const x=bb.x0+w*a,y=bb.y0+h*b;
      cLine(ctx,[[x,y],[x+w*sl,y+h*.07]],.4);
    }
    ctx.restore();
  }
  return shape;
};
const metalA = (ctx, points, o = {}) => metal(ctx, points.map(([x, y]) => ({ x, y })), o);
const line = (ctx, points, width = LW.fine) => cLine(ctx, points.map(p => Array.isArray(p) ? p : [p.x, p.y]), width);
/** A silver medallion with a four-pointed star. */
function medallion(ctx, x, y, r) {
  paint(ctx, ellipsePts(x, y, r, r, 16), { fill: C.silver, w: LW.detail, depth: .8, speck: .2, amp: .12 });
  paint(ctx, ellipsePts(x, y, r * .62, r * .62, 14), { fill: C.blueDark, w: .6, depth: 0, speck: 0, amp: .1 });
  const star = []; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, k = i % 2 ? r * .16 : r * .55; star.push([x + Math.cos(a) * k, y + Math.sin(a) * k]); }
  paintA(ctx, star, { fill: C.silver, w: .5, depth: 0, speck: 0, amp: .05 });
}
/** Frost crusted along the top of a plate: a white cap from p to q (screen points) with icicles hanging below. */
function frostCap(ctx, p, q, thick, drips = 3) {
  const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, pts = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push({ x: p.x + dx * u - nx * thick * .3, y: p.y + dy * u - ny * thick * .3 }); }
  for (let i = 8; i >= 0; i--) {
    const u = i / 8, drip = i % Math.max(1, Math.round(8 / drips)) === 1 ? thick * 1.9 : thick * (.6 + .2 * Math.sin(i * 2.1));
    pts.push({ x: p.x + dx * u + nx * drip, y: p.y + dy * u + ny * drip });
  }
  paint(ctx, pts, { fill: C.frost, w: .9, depth: .5, speck: .3, amp: .35, step: 3 });
}

export function wardenPose(action, t) {
  const P = { body: [0, 0, 0], yaw: 0, footL: [0, 7, 0], footR: [0, -7, 0], lower: READY.slice(0, 3), dir: nrm3(READY.slice(3)), cape: 0, scarf: 0, shake: 0 };
  if (action === 'attack') {
    const u = phase(t, WARDEN_ATTACK_T), k = keyframes(BASH, u);
    P.lower = k.slice(0, 3); P.dir = nrm3(k.slice(3));
    const lean = sample([[0,[0]],[.25,[-2.5]],[.45,[5]],[.62,[4]],[1,[0]]],u);
    P.body = [lean, 0, sample([[0,[0]],[.25,[1]],[.45,[-1.8]],[.62,[-1.4]],[1,[0]]],u)];
    P.footL = [sample([[0,[0]],[.3,[0]],[.45,[5]],[.7,[5]],[1,[0]]],u), 7, sample([[0,[0]],[.3,[0]],[.38,[2.5]],[.45,[0]],[1,[0]]],u)];
    P.cape = -lean * .6;
  } else if (action === 'cast') {
    // Avalanche: the hammer held high to the side, the body braced and trembling; periodic in u.
    const u = phase(t, WARDEN_WINDUP_T), w = Math.sin(TAU * u * 2);
    P.lower = [WINDUP[0] + w * .4, WINDUP[1], WINDUP[2] + Math.cos(TAU * u) * .6]; P.dir = nrm3([WINDUP[3] + w * .03, WINDUP[4], WINDUP[5]]);
    P.body = [-1.5 + w * .3, 0, -.8]; P.footL = [3, 8, 0]; P.footR = [-3, -8, 0]; P.cape = 1 + w;
  } else if (action === 'hurt') {
    const k = hurtAmount(t);
    P.body = [-2.5 * k, 0, -1.2 * k]; P.yaw = .12 * k; P.lower = [READY[0] - 2 * k, READY[1], READY[2] + 3 * k]; P.cape = 3 * k;
  } else {
    const u = phase(t, TAU / 2), breathe = Math.sin(u * TAU);
    P.body[2] = breathe * .65; P.lower = [READY[0], READY[1], READY[2] + breathe * .2]; P.cape = Math.sin(u * TAU - .7) * 1.4;
  }
  P.upper = P.lower.map((v, i) => v + P.dir[i] * GRIP);
  return P;
}

/** The Guardian's legs (legParts2) with frosted knee and greave plates over dark mail. */
function armoredLegs(ctx, rf, P) {
  const legs = legParts2(ctx, rf, P, {
    pants: C.cloth, boot: C.mid, sole: C.dark, bootH: .46,
    legR0: 4.5, legR1: 3.9, footR: 4, soleR: 3.5,
  });
  return legs.map((leg, i) => {
    const base = leg.draw, ft = i === 0 ? P.footL : P.footR, sign = i === 0 ? 1 : -1;
    return { ...leg, draw: () => {
      base();
      const hip = rf.W(P.body[0] * .5, sign * 6.5, 21 + P.body[2] * .6);
      const ankle = footProj(rf.dir, ft[0], ft[1], ft[2] + 5);
      const knee = { x: hip.x * .52 + ankle.x * .48, y: hip.y * .52 + ankle.y * .48 };
      metal(ctx, taperPts(knee, ankle, 3.9, 3), { fill: C.mid, depth: 1.5, speck: .7 });
      metalA(ctx, [[knee.x-4.8,knee.y-2.7],[knee.x,knee.y-4.7],[knee.x+4.8,knee.y-2],
        [knee.x+4.1,knee.y+2.7],[knee.x,knee.y+4.1],[knee.x-4.5,knee.y+2]], { depth: 1.3 });
      frostCap(ctx, { x: knee.x - 4.5, y: knee.y - 3 }, { x: knee.x + 4.5, y: knee.y - 2.5 }, 1.6, 2);
    } };
  });
}

/** Long tattered blue cloak behind the body. */
function drawCape(ctx, rf, P) {
  const Q = arr => arr.map(([b, z]) => { const k = Math.max(0, (48 - z) / 40); return rf.UY(-8, b + P.cape * k * 2, z); });
  paint(ctx, Q([[-14, 50], [-22, 38], [-30, 10], [-26, 2], [-20, 8], [-16, 0], [-10, 7], [-4, -1], [2, 7], [8, 0], [14, 7], [20, 1], [26, 8], [30, 3], [32, 12], [22, 38], [14, 50]]),
    { fill: C.blueDark, w: 1.8, depth: 2, speck: .8, speckScale: .32, amp: .35 });
  for (const b of [-16, -6, 8, 20]) line(ctx, Q([[b * .6, 42], [b, 12]]), .6);
}

function drawTorso(ctx, rf, P) {
  const U = rf.UY, Q = arr => arr.map(([b,z]) => U(0,b,z));
  paint(ctx, Q([[14,46],[-14,46],[-17,29],[-19,19],[-10,16],[0,18],[10,16],[19,19],[16,30]]),
    { fill:C.cloth, w:LW.outline, depth:3, speck:1.5 });
  for (const [b,z] of [[-12,23],[-6,23],[0,23],[6,23],[12,23],[-9,20],[-3,20],[3,20],[9,20]]) {
    const a=U(0,b,z); line(ctx,[[a.x-2,a.y-.6],[a.x,a.y+1.2],[a.x+2,a.y-.6]],.5);
  }
  metal(ctx,Q([[13,47],[-13,47],[-17,40],[-13,29],[-5,27],[5,27],[13,29],[17,40]]),
    {w:LW.outline,depth:3.4,light:.65});
  paint(ctx,Q([[11,44],[-1,46],[-1,30],[8,31],[13,39]]),{fill:C.light,w:0,depth:0,speck:.35,amp:.2});
  line(ctx,Q([[0,45],[0,33],[-2,29]]),.75);
  // An ice gem set in the breastplate.
  const sc=U(1,2,38);
  paintA(ctx,[[sc.x,sc.y-5],[sc.x+3.2,sc.y],[sc.x,sc.y+5],[sc.x-3.2,sc.y]],{fill:C.silver,w:LW.detail,depth:.4,speck:0,amp:.06});
  paintA(ctx,[[sc.x,sc.y-2.6],[sc.x+1.6,sc.y],[sc.x,sc.y+2.6],[sc.x-1.6,sc.y]],{fill:C.ice,w:0,depth:0,speck:0,amp:.04});
  frostCap(ctx, U(0,-13,47), U(0,13,47), 2.4, 4);
  metal(ctx,Q([[15,29],[-15,29],[-17,24],[0,22],[17,24]]),{fill:C.mid,depth:1.8});
  for (const sign of [-1,1]) {
    metal(ctx,Q([[sign*3,21],[sign*16,22],[sign*18,15],[sign*7,13],[sign*4,15]]),{depth:1.7,speck:.9});
    line(ctx,Q([[sign*6,17],[sign*15,18]]),.65);
  }
  paint(ctx,Q([[16,29],[-16,29],[-16,25.3],[16,25.3]]),{fill:C.leather,w:LW.part,depth:.9,speck:.5});
  const b=U(3,1,27.1);
  medallion(ctx,b.x,b.y,3.6);
  // A plated skirt hanging in front, edged with frost.
  const T=(db,z)=>U(3,db,z);
  metal(ctx,[T(-7,26),T(7,26),T(8,10),T(0,6),T(-8,10)],{fill:C.mid,depth:1.4});
  frostCap(ctx,T(-8,11),T(8,11),1.4,3);

}

/** The Guardian's gorget: the head-side rim follows the head, the lower rim follows the chest. */
function drawGorget(ctx, rf, head) {
  const U = rf.UY;
  const side = Math.sign(U(0,1,48).x-U(0,0,48).x);
  const Q = (b,z,a=0) => U(a,b*side,z);
  const H = (x,y) => ({x:head.x+x, y:head.y+y});
  paint(ctx,[H(-10,14),H(10,14),Q(12,49),Q(8,44),Q(-8,44),Q(-12,49)],
    {fill:C.blueDark,w:LW.part,depth:1.5,speck:1});
  metal(ctx,[H(-9,19),H(9,19),Q(15,49),Q(12,45),Q(5,43,2),
    Q(-5,43,2),Q(-12,45),Q(-15,49)],{w:LW.part,depth:2,light:.55,speck:.8});
  line(ctx,[Q(-12,47),Q(-5,45,2),Q(5,45,2),Q(12,47)],.65);
}

function drawHelmet(ctx, c, sx, P) {
  const M = points => points.map(([x,y]) => [c.x+x*sx,c.y+y]);
  const steel = (points,o={}) => metalA(ctx,M(points),o);
  const cloth = (points,fill,o={}) => paintA(ctx,M(points),{fill,w:LW.part,depth:2,speck:1,...o});
  // A crown of ice spikes on the helm (drawn first, the band over it below).
  const spike = (x, h, w, fill) => paintA(ctx, M([[x - w, -22], [x - w * .4, -22 - h * .7], [x, -22 - h], [x + w * .4, -22 - h * .7], [x + w, -22]]), { fill, w: LW.part, depth: .8, light: .35, speck: .2, amp: .06 });
  for (const [x, h, w] of [[-14, 12, 4], [-6, 16, 4.5], [2, 22, 5], [10, 16, 4.5], [17, 11, 3.8]]) spike(x, h, w, C.ice);
  for (const [x, h] of [[-6, 16], [2, 22], [10, 16]]) line(ctx, M([[x, -24], [x, -22 - h * .8]]), .45);
  // Closed helm: dome, a beaked visor over a dark slit, two glowing eyes.
  steel([[-22,-5],[-20,-18],[-10,-27],[3,-29],[15,-23],[22,-12],[24,-2],[25,8],[19,15],[8,18],[-6,18],[-16,14],[-22,6]],{w:LW.outline,depth:3.2,light:.65});
  cloth([[-17,-16],[-9,-24],[-1,-26],[1,-16],[-6,-10]],C.light,{w:0,depth:0,speck:.5});
  line(ctx,M([[-3,-27],[-4,-18],[-8,-10]]),.8);
  cloth([[0,-4],[25,-6],[26,2],[20,5],[2,4]],C.black,{w:LW.detail,depth:0,speck:0});
  for (const [x,y] of [[10,-.5],[20,-1]]) {
    const p=M([[x,y]])[0];
    paint(ctx,ellipsePts(p[0],p[1],2.6,1.6,10),{fill:C.glow,w:0,depth:0,speck:0,amp:.05});
    ctx.fillStyle='#e8fffb';ctx.beginPath();ctx.arc(p[0],p[1],.7,0,TAU);ctx.fill();
  }
  line(ctx,M([[0,-5],[13,-8],[26,-6.5]]),.9);
  steel([[2,6],[24,4],[26,9],[18,15],[6,16]],{fill:C.mid,w:LW.detail,depth:1});
  for (const x of [9,13,17]) line(ctx,M([[x,9],[x+.5,13]]),.6);
  // Cheek hinge with a star medallion, frost on the brow.
  steel([[-21,-1],[-15,2],[-12,11],[-16,16],[-24,12],[-20,6]],{depth:1.8});
  const md=M([[-17,6]])[0]; medallion(ctx,md[0],md[1],4.2);
  // The crown band across the brow, with a small ice gem.
  steel([[-21,-18],[19,-18],[20,-13],[-20,-13]],{fill:C.silver,w:LW.detail,depth:.8});
  const g=M([[0,-15.5]])[0]; paintA(ctx,[[g[0],g[1]-3.5],[g[0]+2.6,g[1]],[g[0],g[1]+3.5],[g[0]-2.6,g[1]]],{fill:C.ice,w:.7,depth:0,speck:0,amp:.04});
}

/** The great hammer: a wrapped iron haft through both hands, a block of ice bound by iron bands at its head. */
function drawHammer(ctx, at) {
  const butt = at(-BUTT), top = at(HEAD1 + 1);
  const dx = top.x - butt.x, dy = top.y - butt.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const side = (p, w) => [{ x: p.x + nx * w, y: p.y + ny * w }, { x: p.x - nx * w, y: p.y - ny * w }];
  const [b0, b1] = side(butt, 2.2), [t0, t1] = side(at(HEAD0), 2.2);
  paint(ctx, [b0, t0, t1, b1], { fill: C.iron, w: LW.part, depth: .8, speck: .3, amp: .1 });
  for (let s2 = 0; s2 < GRIP + 2; s2 += 3) { const p = at(s2); line(ctx, [[p.x - nx * 2.2, p.y - ny * 2.2], [p.x + nx * 2.2 + dx / L * 2, p.y + ny * 2.2 + dy / L * 2]], .45); }
  paint(ctx, ellipsePts(butt.x, butt.y, 2.8, 2.8, 10), { fill: C.silver, w: LW.detail, depth: .5, speck: 0, amp: .08 });
  // The ice block: a cuboid across the haft (front face and a lighter top face), then the iron bands.
  const h0 = at(HEAD0), h1 = at(HEAD1), W = 15, D = { x: 4, y: -4 };
  const face = [{ x: h0.x + nx * W, y: h0.y + ny * W }, { x: h1.x + nx * W, y: h1.y + ny * W }, { x: h1.x - nx * W, y: h1.y - ny * W }, { x: h0.x - nx * W, y: h0.y - ny * W }];
  paint(ctx, [face[0], face[1], { x: face[1].x + D.x, y: face[1].y + D.y }, { x: face[0].x + D.x, y: face[0].y + D.y }], { fill: '#eef8fd', w: LW.part, depth: .4, speck: .2, amp: .08 });
  paint(ctx, face, { fill: C.ice, w: LW.outline, depth: 1.4, light: .35, speck: .5, amp: .1 });
  for (const [u, v] of [[.3, -.4], [.6, .3], [.45, .7]]) { const p = { x: h0.x + (h1.x - h0.x) * u + nx * W * v, y: h0.y + (h1.y - h0.y) * u + ny * W * v }; line(ctx, [[p.x - 3, p.y - 1], [p.x + 2, p.y + 2], [p.x + 4, p.y - 1]], .45); }
  for (const u of [.18, .82]) {
    const m = { x: h0.x + (h1.x - h0.x) * u, y: h0.y + (h1.y - h0.y) * u }, ux = dx / L * 1.8, uy = dy / L * 1.8;
    paint(ctx, [{ x: m.x + nx * (W + 1) - ux, y: m.y + ny * (W + 1) - uy }, { x: m.x + nx * (W + 1) + ux, y: m.y + ny * (W + 1) + uy }, { x: m.x - nx * (W + 1) + ux, y: m.y - ny * (W + 1) + uy }, { x: m.x - nx * (W + 1) - ux, y: m.y - ny * (W + 1) - uy }], { fill: C.silverDark, w: LW.detail, depth: .4, speck: 0, amp: .05 });
  }
}

function armParts(ctx,rf,P,side) {
  const sb=side==='L'?16:-16, S=[0,sb,44], H=side==='L'?P.upper:P.lower;
  const E=ik2(S,H,11.8,12.3,[-.45,side==='L'?1:-1,-.7]);
  const U=rf.UY, key=p=>{const a=yawToBody(rf,p[0],p[1]);return bodyLayerKey(rf,a[0],a[1],p[2]);};
  const s=U(...S),e=U(...E),h=U(...H), mid={x:e.x*.5+h.x*.5,y:e.y*.5+h.y*.5};
  const upper = ()=>{
    paint(ctx,taperPts(s,e,5,4),{fill:C.cloth,w:LW.part,depth:1.8,speck:1});
    // Domed pauldrons crusted with frost and icicles, a star medallion.
    const dx=e.x-s.x,dy=e.y-s.y,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux;
    const Q=(a,b)=>({x:s.x+ux*a+nx*b,y:s.y+uy*a+ny*b});
    metal(ctx,[Q(-5,-3),Q(-3,-8),Q(3,-9),Q(9,-6),Q(10,5),Q(3,8),Q(-3,6)],{w:LW.outline,depth:2.6,light:.6});
    metal(ctx,[Q(6,-7),Q(10,-5.5),Q(12,-1),Q(11,5),Q(7,7),Q(7,2)],{fill:C.mid,w:LW.detail,depth:1.2});
    frostCap(ctx, Q(-4,-6), Q(9,-6), 1.8, 3);
    const q=Q(2,1); medallion(ctx,q.x,q.y,2.6);
  };
  const fore=(a,b)=>{
    paint(ctx,taperPts(a,b,4.5,3.7),{fill:C.cloth,w:LW.part,depth:1,speck:.7});
    metal(ctx,taperPts(a,b,4.2,3.5),{depth:1.7,speck:.8});
    const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
    line(ctx,[[b.x+nx*3,b.y+ny*3],[b.x-nx*3,b.y-ny*3]],.8);
  };
  const parts=[{id:'upper'+side,d:key(E),draw:upper}];
  const boundary=Math.round(key(E)/1000)!==Math.round(key(H)/1000);
  if(boundary) {
    parts.push({id:'foreElbow'+side,d:key(E)+.05,draw:()=>fore(e,mid)});
    parts.push({id:'foreHand'+side,d:key(H),draw:()=>fore(mid,h)});
  } else parts.push({id:'fore'+side,d:key(H),draw:()=>fore(e,h)});
  const gauntlet=()=>{
    mittenHand(ctx,h,h.x-e.x,h.y-e.y,3.9,C.steel,{thumbSide:side==='L'?rf.sx:-rf.sx});
    line(ctx,[[h.x-1.7,h.y-1],[h.x+1.4,h.y-1]],.6);
  };
  return {parts,S,E,H,hand:h,key:key(H),gauntlet};
}

/** A thick white fur collar over the shoulders and round the neck. */
function drawFurCollar(ctx, rf) {
  // A fluffy ring round the shoulders: points all the way round the neck (forward a, sideways b), so it reads in
  // every view; the helmet covers its middle.
  const U = rf.UY, pts = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 24 * Math.PI * 2, r = i % 2 ? 1 : 1.12;
    pts.push(U(Math.cos(t) * 21 * r, Math.sin(t) * 32 * r, 43 + (i % 2 ? -2 : 1) + Math.cos(t) * -3));
  }
  paint(ctx, pts, { fill: C.fur, w: LW.part, depth: 1.6, speck: .8, speckScale: .3, amp: .55, step: 2.5 });
  for (const t of [.3, 1.2, 2.2, 3.4, 4.4, 5.4]) { const p = U(Math.cos(t) * 16, Math.sin(t) * 25, 43); cLine(ctx, [[p.x - 1, p.y - 2], [p.x + 1, p.y + 2]], .5); }
}

export function drawGlacialWarden(ctx,x,y,direction,action,t,scale=1,opts={}) {
  const P=wardenPose(action,t);
  const rf=rigFrame(direction,P.body,P.yaw),U=rf.UY;
  const parts=armoredLegs(ctx,rf,P);
  parts.push({id:'cape',d:-200,draw:()=>drawCape(ctx,rf,P)});
  parts.push({id:'torso',d:LAYER.torso,draw:()=>drawTorso(ctx,rf,P)});
  const head=rf.U(1.5,0,66);
  parts.push({id:'gorget',d:LAYER.torso+1,draw:()=>drawGorget(ctx,rf,head)});
  // The fur collar lies over the shoulders and upper arms, under the helmet.
  parts.push({id:'furCollar',d:LAYER.head-.5,draw:()=>drawFurCollar(ctx,rf)});
  parts.push({id:'helmet',d:LAYER.head,draw:()=>{
    ctx.save();ctx.translate(head.x,head.y);ctx.scale(.9,.9);
    drawHelmet(ctx,{x:0,y:0},rf.sx,P);ctx.restore();
  }});
  const left=armParts(ctx,rf,P,'L'),right=armParts(ctx,rf,P,'R');
  parts.push(...left.parts,...right.parts);
  // The hammer lies between the two hands' depths; both gauntlets grip over it.
  const at=s2=>U(...P.lower.map((v,i)=>v+P.dir[i]*s2));
  parts.push({id:'hammer',d:Math.min(left.key,right.key)+.02,draw:()=>drawHammer(ctx,at)});
  parts.push({id:'leftGauntlet',d:Math.max(left.key,right.key)+.04,draw:left.gauntlet});
  parts.push({id:'rightGauntlet',d:Math.max(left.key,right.key)+.05,draw:right.gauntlet});
  withTilt(ctx,x,y,scale,rf.sx,fallTilt(action,t),false,
    ()=>renderRig(ctx,x,y,scale,parts,{prefix:'eb-glacial-warden',boil:DRAW.boil?Math.floor(t*5)%3:0,shadow:opts.shadow}));
  return {pose:P,order:parts.map(p=>p.id)};
}

export const character=Object.freeze({
  id:'eb-glacial-warden',label:'Glacial Warden — EMBERBOUND',kind:'humanoid',directional:true,draw:drawGlacialWarden,
  actions:{idle:{period:TAU/2,frames:20},
    attack:{period:WARDEN_ATTACK_T,keys:KEYS.attack,once:true},
    cast:{period:WARDEN_WINDUP_T,frames:8},
    hurt:hurtAction},
  frameBox:{x0:-120,x1:120,y0:-160,y1:29},
  equipment:{leftHand:'hammer',rightHand:'hammer'},
  emberbound:{gameId:'glacial_warden',heightPx:42,facing:'L'},
});
export const studio=Object.freeze({order:28,name:"Glacial Warden（氷河の番人）",category:"EMBERBOUND 第4エリア",
  description:"幅広い青い氷の鎧と白い毛皮の肩の重装兵（エリート）。氷の冠の兜、大きな氷のハンマー。Frost Bash と Avalanche を使う。",
  preview:{direction:'L',phase:0}});
