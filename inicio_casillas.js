// inicio_casillas.js - F1214 · Casillas de la guía visual (v5) aplicadas al Inicio real.
// Estructura + 7 casillas por lugar, 5 niveles de profundidad, bruma entre niveles y ajuste automático al tamaño de cada casilla.
// Sin atributo style en el marcado (CSP): posiciones y escalas van como atributos SVG; los movimientos, en inicio_arte.css.
'use strict';
(function () {
const C=(x,y,r,f,o)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${o?` opacity="${o}"`:''}/>`;
const E=(x,y,a,b,f,o)=>`<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${f}"${o?` opacity="${o}"`:''}/>`;
const P=(d,f,x='')=>`<path d="${d}" fill="${f}" ${x}/>`;
const R=(x,y,w,h,f,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}"/>`;
const S=(d,c,w)=>`<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const sh=w=>`<ellipse class="sd" cx="${w*.2}" cy="0" rx="${w}" ry="${w*.24}" fill="#1b2a2a" opacity=".2"/><ellipse class="sd" cx="${w*.1}" cy="0" rx="${w*.6}" ry="${w*.14}" fill="#1b2a2a" opacity=".2"/>`;
const rot=(a,s)=>`<g transform="rotate(${a})">${s}</g>`;
const PALM=(p,l)=>sh(32)+S(`M0 0Q${-4*l} -40 ${6*l} -86`,p.t,9)+`<g transform="translate(${6*l} -86)">`+[-160,-125,-85,-45,-5,25].map((a,i)=>rot(a,P('M0 0Q24-20 48-2Q24-8 0 0z',i%2?p.m:p.d))).join('')+C(-3,5,4,p.t)+C(4,6,4,p.t)+`</g>`;
const CW=[[-5,-100],[-26,-54],[16,-54],[-58,-42],[50,-42]];
const hw=y=>14+(y+18)*5/82,band=(a,b)=>`M${-hw(a)} ${a}L${-hw(b)} ${b}H${hw(b)}L${hw(a)} ${a}z`;
const HAB={
bosque:{n:'Bosque',amb:0,
 day:{sk:['#a9dcdc','#f7f0d6'],far:'#a4bfc4',mid:'#7fae86',gr:'#a5c985',gd:'#7fa86a',pa:'#e0d2ad',fg:'#2f5f45'},
 night:{sk:['#1c2a52','#4a5b88'],far:'#40557a',mid:'#2f4a5c',gr:'#3e5d57',gd:'#2d4a47',pa:'#6b7d7a',fg:'#14282a'},
 p:{d:'#3d7a4f',m:'#5a9a5f',l:'#86c277',t:'#7d5e46',a:'#5b8fb9',b:'#f4e9cc',s1:'#7c8591',s2:'#a3acb6',s3:'#cfd6dc',k:'#b2545a',f:'#f08fb0',y:'#f2c14e',a2:'#d6c9a8'},
 bg:c=>P('M0 150L55 98L105 138L165 86L235 142L300 102L355 128L400 112V160H0z',c.far)+Array.from({length:23},(_,i)=>C(i*18,152+Math.sin(i*1.7)*4,13,c.mid)).join('')+R(0,152,400,36,c.mid),
 st:{n:'Castillo',f:p=>sh(74)+R(-64,-60,24,60,p.s2)+R(-64,-60,7,60,p.s3)+R(40,-60,24,60,p.s2)+R(55,-60,9,60,p.s1)+P('M-69-58L-52-88L-35-58z',p.k)+P('M35-58L52-88L69-58z',p.k)+R(-34,-72,68,72,p.s2)+R(-34,-72,16,72,p.s3)+R(22,-72,12,72,p.s1)+[0,1,2,3,4].map(i=>R(-34+i*14,-80,8,9,p.s2)).join('')+R(-13,-112,26,46,p.s2)+R(-13,-112,8,46,p.s3)+R(7,-112,6,46,p.s1)+P('M-18-110L0-140L18-110z',p.k)+P('M-18-110L0-140L-4-110z','#cf6f74')+S('M0-140V-154',p.s1,1.6)+P('M0-154L13-150L0-146z',p.a)+P('M-10 0V-20Q0-34 10-20V0z','#4a3a30')+CW.map(w=>R(w[0],w[1],10,14,'#3c4654',5)).join(''),
  o:()=>CW.map(w=>E(w[0]+5,w[1]+7,13,15,'#ffb347',.28)+R(w[0],w[1],10,14,'#ffd877',5)).join('')},
 items:[
 {n:'Roble',fp:'2×2',s:2,f:p=>sh(38)+P('M-9 0Q-6-18-5-46H6Q7-18 12 0z',p.t)+P('M-9 0Q-6-18-5-46H-1Q-3-18-9 0z','#9b7a5e')+C(11,-54,24,p.d)+C(-13,-56,24,p.d)+C(0,-76,30,p.d)+C(-9,-79,24,p.m)+C(-19,-58,15,p.m)+C(-15,-86,11,p.l)+C(-27,-64,7,p.l)},
 {n:'Pino',fp:'1×2',s:0,f:p=>sh(22)+R(-3,-14,6,14,p.t)+[[-48,-8,28],[-66,-26,23],[-84,-46,17]].map(a=>P(`M0 ${a[0]}L${-a[2]} ${a[1]}H${a[2]}z`,p.d)+P(`M0 ${a[0]}L${-a[2]} ${a[1]}H-2z`,p.m)).join('')},
 {n:'Arbusto florido',fp:'1×1',s:1,f:p=>sh(24)+C(8,-10,12,p.d)+C(-4,-16,16,p.d)+C(-8,-19,12,p.m)+C(-14,-12,8,p.m)+[[-10,-26],[2,-30],[10,-18],[-16,-14]].map(a=>C(a[0],a[1],3,p.f)).join('')+C(2,-30,1.2,p.y)},
 {n:'Hongos',fp:'1×1',s:5,f:p=>sh(18)+[[-7,-16,10],[8,-11,7]].map(a=>R(a[0]-2.5,a[1],5,-a[1],p.b,2)+P(`M${a[0]-a[2]} ${a[1]}Q${a[0]} ${a[1]-a[2]*1.6} ${a[0]+a[2]} ${a[1]}z`,p.k)+C(a[0]-2,a[1]-a[2]*.5,1.4,'#fff')).join('')},
 {n:'Tronco',fp:'2×1',s:3,f:p=>sh(46)+R(-40,-20,80,20,p.t,9)+R(-40,-20,80,8,'#a98568',4)+E(-40,-10,6,10,'#d9bf9a')+E(-40,-10,2.5,5,p.t)+E(14,-20,15,5,p.m)+C(-10,-24,3,p.f)},
 {n:'Ave',fp:'1×1',s:4,f:p=>sh(12)+S('M-3-2V-7M4-2V-7','#8a6a50',1.5)+E(0,-15,12,9,p.a)+E(-2,-12,7,5,p.b)+C(-9,-22,6,p.a)+P('M-14-22L-19-20L-14-18z','#e9b24f')+C(-10,-23,1.2,'#2b3b4d')+P('M10-17L19-22L16-10z',p.d)}]},
desierto:{n:'Desierto',amb:1,
 day:{sk:['#f4c98f','#fdf0d6'],far:'#d6a38e',mid:'#e0ae7c',gr:'#ebcd9c',gd:'#d7b07a',pa:'#f6e2b9',fg:'#8a4f3a'},
 night:{sk:['#2a2756','#7a5f8a'],far:'#5a4a70',mid:'#4c4160',gr:'#5e5362',gd:'#4d4455',pa:'#8a7f92',fg:'#2a1f33'},
 p:{d:'#5d8f64',m:'#7fb06f',l:'#a9d08c',t:'#c58f5c',a:'#d86b4a',b:'#f6e7c8',s1:'#b58a5d',s2:'#d3a877',s3:'#ecd0a2',k:'#8a5a3b',g:'#3fb8af',y:'#f2c14e'},
 bg:c=>P('M0 158L28 118H92L112 158L150 134H210L238 158L290 112H350L378 158H400V176H0z',c.far)+P('M0 168Q90 136 180 164T400 150V190H0z',c.mid),
 st:{n:'Templo',f:p=>sh(76)+[[-66,-14,132],[-54,-28,108],[-42,-42,84]].map(a=>R(a[0],a[1],a[2],14,p.s2)+R(a[0],a[1],a[2],4,p.s3)+R(a[0]+a[2]-14,a[1],14,14,p.s1)).join('')+P('M-14 0L-9-14H9L14 0z',p.s3)+R(-26,-76,52,34,p.s3)+P('M-8-42V-62Q0-72 8-62V-42z',p.k)+R(-26,-76,7,34,'#f3e2c0')+R(19,-76,7,34,'#f3e2c0')+R(-32,-84,64,9,p.s1)+R(-32,-84,64,3,p.s3)+P('M-32-84L0-104L32-84z',p.s2)+P('M-32-84L0-104L-3-84z',p.s3)+P('M0-126L6-115L0-104L-6-115z',p.g)+S('M-40-42V-52M40-42V-52',p.t,2.5)+C(-40,-55,3,p.y)+C(40,-55,3,p.y),
  o:()=>C(0,-115,17,'#7ff0e6',.35)+C(0,-115,4,'#d9fffb')+C(-40,-55,9,'#ffb347',.4)+C(40,-55,9,'#ffb347',.4)+E(0,-52,8,12,'#ffd877',.75)},
 items:[
 {n:'Saguaro',fp:'2×2',s:2,f:p=>sh(28)+S('M10-44h9a7 7 0 0 0 7-7v-18M-10-30h-9a7 7 0 0 1-7-7v-14',p.d,11)+R(-10,-90,20,90,p.d,10)+R(-10,-90,8,90,p.m,4)+S('M-3-84V-6',p.l,1.4)+C(0,-92,3,p.a)},
 {n:'Palma datilera',fp:'1×2',s:0,f:p=>PALM(p,1)},
 {n:'Agave',fp:'1×1',s:1,f:p=>sh(20)+[-62,-32,32,62].map(a=>rot(a,P('M0 0C-5-12-3-24 0-32C3-24 5-12 0 0z',p.d))).join('')+P('M0 0C-5-14-3-28 0-38C3-28 5-14 0 0z',p.l)},
 {n:'Vasija',fp:'1×1',s:5,f:p=>sh(14)+P('M-8-30Q-14-14-8-4Q0 2 8-4Q14-14 8-30z',p.a)+P('M-8-30Q-14-14-8-4Q-4-14-4-30z','#e98a68')+R(-6,-36,12,7,p.a,2)+S('M-11-18H11',p.b,2)+S('M-10-12Q0-8 10-12',p.b,1.5)},
 {n:'Rocas',fp:'2×1',s:3,f:p=>sh(44)+E(0,-10,38,13,p.s1)+P('M-32-12Q-12-32 12-24Q30-20 36-10Q0-2-32-12z',p.s3)+E(20,-22,12,8,p.s2)+E(14,-26,6,3,p.s3)},
 {n:'Lagartija',fp:'1×1',s:4,f:p=>sh(16)+S('M12-5q14-2 18-12',"#8f9e55",3)+S('M-5-2l-3 4M6-2l3 4',"#8f9e55",2.5)+E(0,-6,13,6,'#8f9e55')+C(-14,-7,5,'#8f9e55')+C(-15,-9,1.2,'#3a2a22')}]},
costa:{n:'Costa',amb:1,
 day:{sk:['#aee0ee','#fdf1dc'],far:'#7cc4d0',mid:'#a5d9d8',gr:'#efd9ad',gd:'#dcc08a',pa:'#fbeccb',fg:'#2d6b66'},
 night:{sk:['#1b2c58','#46628e'],far:'#2c5878',mid:'#386a86',gr:'#6a6a73',gd:'#555563',pa:'#8a8a95',fg:'#10262b'},
 p:{d:'#2f7f78',m:'#4fb09a',l:'#8bd6bf',t:'#a67b55',a:'#f08a7b',b:'#fff3df',s1:'#8b97a8',s2:'#b9c3d0',s3:'#e7ecf2',k:'#d6453d',g:'#ffd877',y:'#f2c14e'},
 bg:c=>R(0,146,400,40,c.far)+P('M240 148Q280 122 318 148z',c.mid)+P('M120 146h14l-3 4h-8z',c.fg)+P('M127 146V136L134 145z','#fff')+`<path d="M20 160q8-3 16 0M150 168q8-3 16 0M300 158q8-3 16 0M70 176q8-3 16 0" stroke="#fff" stroke-opacity=".55" stroke-width="1.4" fill="none"/>`+P('M0 176Q100 164 200 176T400 172V190H0z',c.mid),
 st:{n:'Faro',f:p=>sh(60)+P('M-44 0Q-36-16-14-18H18Q40-14 48 0z',p.s1)+P('M-44 0Q-36-16-14-18H-4Q-24-10-26 0z',p.s2)+P('M-14-18L-9-100H9L14-18z',p.b)+[28,56,84].map(a=>P(band(-a,-a-14),p.k)).join('')+P('M-14-18L-9-100H-3L-6-18z','#fff','opacity=".4"')+P('M8-18L5-100H9L14-18z',p.s2,'opacity=".45"')+R(-14,-104,28,4,p.s1)+R(-8,-118,16,14,p.g,2)+S('M0-118V-104',p.s1,1.5)+P('M-11-118L0-134L11-118z',p.k)+C(0,-136,2.5,p.s1)+R(-3,-14,6,12,p.t,2),
  o:()=>P('M0-111L-130-140V-84z','#fff0b0','opacity=".3"')+P('M0-111L130-140V-84z','#fff0b0','opacity=".3"')+C(0,-111,15,'#ffe28a',.5)+R(-8,-118,16,14,'#fff1b8',2)},
 items:[
 {n:'Palmera',fp:'1×2',s:0,f:p=>PALM(p,-1)},
 {n:'Cofre',fp:'1×1',s:1,f:p=>sh(22)+R(-17,-18,34,18,p.t,3)+P('M-17-18Q0-34 17-18z','#8d6342')+R(-17,-20,34,3,p.y)+R(-2,-16,4,9,p.y,1)+E(14,-1,6,2.5,p.y)+E(-15,-1,4,2,p.y)},
 {n:'Sombrilla',fp:'2×2',s:2,f:p=>sh(24)+E(0,-3,20,5,p.b)+R(-1.5,-52,3,52,p.t)+P('M-30-48Q0-80 30-48z',p.k)+P('M-30-48Q-20-64-8-69L-3-48z',p.b)+P('M3-48L8-70Q22-64 30-48z',p.b)},
 {n:'Rocas costeras',fp:'2×1',s:3,f:p=>sh(44)+E(0,-10,38,13,p.s1)+P('M-32-12Q-12-32 12-24Q30-20 36-10Q0-2-32-12z',p.s3)+E(20,-22,12,8,p.s2)+E(14,-26,6,3,p.s3)},
 {n:'Cangrejo',fp:'1×1',s:4,f:p=>sh(16)+S('M-8-3l-5 5M8-3l5 5M-4-2l-3 5M4-2l3 5',p.a,2)+E(0,-9,13,8,p.a)+C(-17,-18,5,p.a)+C(17,-18,5,p.a)+C(-4,-18,1.8,'#2b3b4d')+C(4,-18,1.8,'#2b3b4d')},
 {n:'Concha',fp:'1×1',s:5,f:p=>sh(14)+P('M-13 0Q-16-17 0-24Q16-17 13 0z',p.b)+P('M-13 0Q-16-17 0-24Q-8-12-6 0z','#fff')+S('M0 0V-20M7 0L9-17','#e0b9a0',1.5)}]}
};
const fn=n=>HAB.bosque.items.find(i=>i.n===n).f;
const ROBLE=fn('Roble'),AVE=fn('Ave'),PINO=fn('Pino'),ov=(f,o)=>p=>f({...p,...o});
const CAB={n:'Cabaña de alerce',fp:'4×2',f:p=>sh(60)+R(-42,-40,84,40,'#a3704a',3)+R(-42,-40,16,40,'#bd8a5f')+R(26,-40,16,40,'#8a5a38')+R(20,-82,9,22,p.s1)+P('M-52-38L0-84L52-38z','#6e4a36')+P('M-52-38L0-84L-4-38z','#8a6048')+R(-8,-26,16,26,'#4a3228',6)+R(-34,-30,14,12,'#3c4654',2)+R(20,-30,14,12,'#3c4654',2),o:()=>R(-34,-30,14,12,'#ffd877',2)+R(20,-30,14,12,'#ffd877',2)+E(0,-14,9,14,'#ffb347',.5)};
const CASA={n:'Casa del árbol',fp:'4×2',f:p=>sh(40)+P('M-14 0Q-10-30-8-70H10Q12-30 18 0z',p.t)+C(-30,-100,20,p.d)+C(30,-104,22,p.d)+C(0,-122,22,p.m)+R(-34,-62,68,6,'#8a5a38')+R(-24,-90,48,28,'#bd8a5f',2)+P('M-30-88L0-110L30-88z',p.k)+R(-5,-80,10,18,'#4a3228',4)+R(10,-84,10,10,'#3c4654',2)+S('M26-56L30 0',p.t,2),o:()=>R(10,-84,10,10,'#ffd877',2)};
const V={bosque:[
 [CAB,CASA,{...HAB.bosque.st,fp:'4×2',lock:1}],
 [{n:'Pewén',fp:'1×2',f:p=>sh(24)+R(-4,-76,8,76,'#7a6a52')+S('M0-46L-18-58M0-34L18-48','#7a6a52',2.5)+P('M-32-70Q0-94 32-70Q10-62 0-62Q-10-62-32-70z',p.d)+P('M-24-88Q0-108 24-88Q8-80 0-80Q-8-80-24-88z',p.m)+E(-10,-98,9,3,p.l)},{n:'Alerce',fp:'1×2',f:ov(PINO,{t:'#9a5a3a',d:'#4a7a5a',m:'#6a9a6a'})},{n:'Pino',fp:'1×2',f:PINO}],
 [{n:'Copihue',fp:'1×1',f:p=>sh(22)+C(0,-14,13,p.d)+C(-6,-18,10,p.m)+[[-8,-24],[6,-26],[10,-14],[-12,-12]].map(a=>P(`M${a[0]-3} ${a[1]}Q${a[0]} ${a[1]+10} ${a[0]+3} ${a[1]}z`,'#d6263b')).join('')},{n:'Helecho',fp:'1×1',f:p=>sh(22)+[-70,-40,-12,15,45,70].map((a,i)=>rot(a,P('M0 0Q7-16 2-32Q-4-16 0 0z',i%2?p.m:p.d))).join('')},{n:'Arbusto florido',fp:'1×1',f:fn('Arbusto florido')}],
 [{n:'Roble',fp:'2×2',f:ROBLE},{n:'Lenga otoñal',fp:'2×2',f:ov(ROBLE,{d:'#b4582f',m:'#d9843f',l:'#f0b25a'})},{n:'Coihue',fp:'2×2',f:ov(ROBLE,{d:'#2f6f5a',m:'#4a9a7a',l:'#7bc7a0'})}],
 [{n:'Tronco',fp:'2×1',f:fn('Tronco')},{n:'Roca musgosa',fp:'2×1',f:p=>sh(40)+E(0,-12,36,14,p.s1)+P('M-30-14Q-10-32 14-26Q32-22 34-12Q0-4-30-14z',p.s2)+E(-6,-24,16,6,p.m)+E(14,-22,8,4,p.l)},{n:'Banca de madera',fp:'2×1',f:p=>sh(40)+R(-34,-34,68,6,'#a3704a',2)+R(-34,-22,68,7,p.t,2)+R(-30,-16,6,16,'#8a5a38')+R(24,-16,6,16,'#8a5a38')}],
 [{n:'Chucao',fp:'1×1',f:ov(AVE,{a:'#8a5a3a',b:'#d9b48a'})},{n:'Azulejo',fp:'1×1',f:AVE},{n:'Picaflor',fp:'1×1',f:ov(AVE,{a:'#3fa86a',b:'#f0e0c0'})}],
 [{n:'Hongos',fp:'1×1',f:fn('Hongos')},{n:'Flores silvestres',fp:'1×1',f:p=>sh(18)+[[-9,-2],[0,-3],[9,-1]].map((a,i)=>S(`M${a[0]} ${a[1]}V${a[1]-14}`,p.d,1.6)+C(a[0],a[1]-16,4,['#f08fb0','#f2c14e','#e7e0ff'][i])).join('')},{n:'Piedras',fp:'1×1',f:p=>sh(16)+E(-6,-6,9,6,p.s1)+E(7,-5,7,5,p.s2)+E(1,-11,5,3.5,p.s3)}],
 [{n:'Fogata',fp:'1×1',f:p=>sh(18)+S('M-12-2L10-8M12-2L-10-8',p.t,4)+P('M0-8Q-9-20 0-32Q3-22 8-18Q10-12 0-8z','#f08a3c')+P('M0-8Q-4-16 0-24Q4-16 0-8z','#ffd877')},{n:'Farol de madera',fp:'1×1',f:p=>sh(14)+R(-1.5,-44,3,44,p.t)+R(-7,-56,14,14,'#3c4654',3)+R(-5,-54,10,10,p.y,2)+P('M-9-56L0-64L9-56z',p.t)},{n:'Letrero',fp:'1×1',f:p=>sh(16)+R(-2,-34,4,34,p.t)+R(-16,-36,32,14,'#bd8a5f',2)+S('M-10-31H10M-10-27H4',p.b,1.5)}]
]};
const f2=n=>HAB.desierto.items.find(i=>i.n===n).f;
V.desierto=[
 [{n:'Refugio de adobe',fp:'4×2',f:p=>sh(58)+R(-42,-36,84,36,'#d6a06b',2)+R(-42,-36,14,36,'#e6b987')+R(30,-36,12,36,'#b9824f')+R(6,-64,36,30,'#d6a06b',2)+R(6,-64,12,30,'#e6b987')+R(-46,-42,92,8,'#b9824f',2)+R(0,-70,48,7,'#b9824f',2)+R(-8,-26,16,26,'#5a3a28',7)+R(16,-28,12,10,'#3c4654',2)+R(22,-54,10,10,'#3c4654',2)+C(-46,-38,3,p.t)+C(46,-38,3,p.t),o:()=>R(16,-28,12,10,'#ffd877',2)+R(22,-54,10,10,'#ffd877',2)+E(0,-13,9,13,'#ffb347',.5)},
  {n:'Mirador de piedra',fp:'4×2',f:p=>sh(46)+P('M-24 0L-17-92H17L24 0z',p.s2)+P('M-24 0L-17-92H-7L-12 0z',p.s3)+S('M-20-30H20M-18-60H18',p.s1,1.5)+R(-26,-100,52,9,p.s1,2)+S('M-24-100V-114M0-100V-114M24-100V-114M-24-114H24','#8a5a3b',2.5)+P('M-6 0V-16Q0-24 6-16V0z','#4a3228')+S('M0-114V-130',p.s1,1.8)+P('M0-130L14-126L0-122z',p.a),o:()=>C(0,-106,13,'#ffd877',.4)+R(-3,-110,6,8,'#ffd877',2)+E(0,-8,6,9,'#ffb347',.5)},
  {...HAB.desierto.st,fp:'4×2',lock:1}],
 [{n:'Palma datilera',fp:'1×2',f:f2('Palma datilera')},{n:'Chañar',fp:'1×2',f:p=>sh(26)+S('M0 0Q-8-24 2-46Q6-60-2-72',p.t,8)+C(-16,-70,18,p.d)+C(14,-76,20,p.d)+C(0,-88,20,p.m)+C(-8,-92,12,p.l)+[[-18,-66],[12,-82],[4,-96],[20,-70]].map(a=>C(a[0],a[1],2.4,p.y)).join('')},{n:'Cardón',fp:'1×2',f:p=>sh(22)+S('M8-40h8a6 6 0 0 0 6-6v-22M-8-28h-8a6 6 0 0 1-6-6v-18',p.d,8)+R(-8,-100,16,100,p.d,8)+R(-8,-100,6,100,p.m,3)+C(0,-102,3,p.a)}],
 [{n:'Agave',fp:'1×1',f:f2('Agave')},{n:'Añañuca',fp:'1×1',f:p=>sh(18)+[[-10,-2],[0,-3],[10,-1]].map((a,i)=>S(`M${a[0]} ${a[1]}V${a[1]-16}`,p.d,1.8)+C(a[0],a[1]-18,5,['#e5484d','#ff8a4c','#f2c14e'][i])+C(a[0],a[1]-18,2,'#fff3d6')).join('')},{n:'Cactus barril',fp:'1×1',f:p=>sh(20)+E(0,-14,15,15,p.d)+E(-5,-15,6,14,p.m)+S('M0-28V0M-9-26Q-12-14-9-2M9-26Q12-14 9-2','#4a7a52',1.2)+C(0,-30,4,p.a)}],
 [{n:'Saguaro',fp:'2×2',f:f2('Saguaro')},{n:'Algarrobo',fp:'2×2',f:p=>sh(40)+P('M-8 0Q-4-16-12-34Q-6-30 0-34Q8-30 14-40Q10-20 10 0z',p.t)+E(0,-52,46,20,p.d)+E(-10,-58,32,14,p.m)+E(-18,-62,16,7,p.l)+E(24,-48,22,10,p.d)},{n:'Candelabro',fp:'2×2',f:p=>sh(32)+S('M-9-48Q-26-48-26-74M9-60Q28-60 28-86M-9-26Q-22-26-22-42',p.d,10)+R(-9,-100,18,100,p.d,9)+R(-9,-100,7,100,p.m,3)+C(-26,-76,3.5,p.a)+C(28,-88,3.5,p.a)}],
 [{n:'Rocas',fp:'2×1',f:f2('Rocas')},{n:'Duna pequeña',fp:'2×1',f:p=>sh(40)+P('M-44 0Q-22-26 0-24Q24-22 44 0z',p.s3)+P('M-44 0Q-22-26 0-24Q-8-10-14 0z','#f4dcb0')+S('M-26-8Q-10-14 4-10M-8-4Q8-9 24-5',p.s2,1.4)},{n:'Tronco seco',fp:'2×1',f:p=>sh(44)+R(-40,-14,80,14,'#a98568',7)+R(-40,-14,80,5,'#c9a688',3)+S('M-20-14L-26-26M18-14L26-24','#a98568',3)+E(-40,-7,4,7,'#8a6a50')}],
 [{n:'Lagartija',fp:'1×1',f:f2('Lagartija')},{n:'Guanaco',fp:'1×1',f:p=>sh(24)+S('M-9-14V-1M-3-14V0M9-14V-1M14-14V0','#9a6b45',2.4)+E(2,-20,16,8,'#c58f5c')+S('M-12-22Q-16-34-12-40','#c58f5c',5)+E(-12,-43,6,4,'#e8d3b0')+P('M-15-45L-17-52L-12-46z','#c58f5c')+S('M18-22q4-2 5 2','#c58f5c',3)},{n:'Zorro',fp:'1×1',f:p=>sh(24)+S('M-8-3V0M-2-3V0M8-3V0M13-3V0','#6e5a50',2.2)+E(0,-12,16,7,'#9c8777')+C(-17,-15,6,'#9c8777')+P('M-22-15L-31-12L-22-11z','#6e5a50')+P('M-19-20L-17-28L-14-20z','#9c8777')+P('M-13-19L-9-27L-8-18z','#9c8777')+P('M14-12Q34-22 36-6Q26-12 14-8z','#c27b4a')+C(-19,-16,1,'#2b1f1a')}],
 [{n:'Vasija',fp:'1×1',f:f2('Vasija')},{n:'Apacheta',fp:'1×1',f:p=>sh(16)+E(0,-5,12,5,p.s1)+E(-1,-12,9,4.5,p.s2)+E(1,-18,6,3.5,p.s3)+E(0,-23,3.6,2.4,p.s2)},{n:'Hierba seca',fp:'1×1',f:p=>sh(16)+[-30,-12,6,22].map(a=>rot(a,S('M0 0Q2-14-2-24','#cfa660',2))).join('')+S('M0 0Q4-16 0-30','#e0bd78',2)}],
 V.bosque[7]
];
V.costa=[
[{...HAB.costa.st,fp:'4×2'},
 {n:'Caseta de pescadores',fp:'4×2',f:p=>sh(56)+R(-38,-34,76,34,'#7fa3b8',2)+R(-38,-34,14,34,'#9bbdd0')+R(24,-34,14,34,'#5f8aa3')+R(14,-80,9,20,p.s1)+P('M-46-32L0-70L46-32z','#c45a4a')+P('M-46-32L0-70L-4-32z','#d9786a')+R(-9,-22,18,22,'#4a3a30',4)+R(-34,-26,14,12,'#3c4654',2)+R(20,-26,14,12,'#3c4654',2)+S('M-40-2H40',p.t,3),o:()=>R(-34,-26,14,12,'#ffd877',2)+R(20,-26,14,12,'#ffd877',2)+E(0,-11,9,12,'#ffb347',.5)},
 {n:'Torre salvavidas',fp:'4×2',lock:1,f:p=>sh(46)+R(-26,-34,4,34,p.t)+R(22,-34,4,34,p.t)+S('M-24-4L24-30M24-4L-24-30',p.t,2.5)+R(-32,-64,64,30,'#f3e2c0',2)+R(-32,-64,15,30,'#fff3df')+R(-32,-66,64,5,p.k,2)+P('M-38-66L0-88L38-66z',p.k)+P('M-38-66L0-88L-4-66z','#e8665e')+S('M0-88V-104',p.s1,1.6)+P('M0-104L14-100L0-96z',p.y)+S('M26 0L34-30',p.t,2.5)+R(-14,-56,28,14,'#3c4654',2),o:()=>R(-14,-56,28,14,'#ffd877',2)+E(0,-48,18,12,'#ffb347',.3)}],
[{n:'Palma chilena',fp:'1×2',f:p=>PALM({...p,t:'#9a8878'},-1)},
 {n:'Pino de costa',fp:'1×2',f:p=>sh(24)+S('M0 0Q-4-26 4-50Q8-66 20-74',p.t,6)+E(22,-78,22,8,p.d)+E(10,-66,18,7,p.m)+E(30,-68,14,6,p.d)+E(4,-54,12,5,p.m)+E(18,-86,12,5,p.l)},
 {n:'Palmera joven',fp:'1×2',f:p=>sh(18)+S('M0 0Q-3-18 4-38',p.t,5)+`<g transform="translate(4 -38)">`+[-160,-120,-80,-40,0,30].map((a,i)=>rot(a,P('M0 0Q14-12 28-2Q14-6 0 0z',i%2?p.m:p.d))).join('')+`</g>`}],
[{n:'Chagual',fp:'1×1',f:p=>sh(22)+[-62,-36,-12,12,36,62].map((a,i)=>rot(a,P('M0 0Q6-14 2-28Q-4-14 0 0z',i%2?p.m:p.d))).join('')+S('M0 0V-46',p.m,2.6)+C(0,-48,4,p.y)+C(-3,-42,2.6,p.y)+C(3,-38,2.6,p.y)},
 {n:'Doca florida',fp:'1×1',f:p=>sh(24)+E(-8,-6,12,6,p.m)+E(8,-5,13,6,p.d)+E(0,-9,11,6,p.l)+C(-8,-12,3.4,'#e45c8a')+C(6,-13,3.4,'#e45c8a')+C(0,-15,3,'#f08fb0')+C(-1,-15,1,p.y)},
 {n:'Pasto de dunas',fp:'1×1',f:p=>sh(18)+[-34,-16,2,18,34].map(a=>rot(a,S('M0 0Q2-16-2-28','#9fbe6a',2))).join('')+S('M0 0Q4-18 0-34','#c9d98a',2)}],
[{n:'Sombrilla',fp:'2×2',f:p=>sh(24)+E(0,-3,20,5,p.b)+R(-1.5,-52,3,52,p.t)+P('M-30-48Q0-80 30-48z',p.k)+P('M-30-48Q-20-64-8-69L-3-48z',p.b)+P('M3-48L8-70Q22-64 30-48z',p.b)},
 {n:'Toldo de playa',fp:'2×2',f:p=>sh(30)+E(0,-3,22,5,p.b)+R(-24,-50,3,50,p.t)+R(21,-50,3,50,p.t)+P('M-34-52Q0-72 34-52V-40H-34z',p.a)+P('M-34-52Q-22-64-12-67L-12-40H-34z',p.b)+P('M-2-70Q10-68 14-66L14-40H-2z',p.b)+P('M22-62Q30-58 34-52V-40H22z',p.b)},
 {n:'Ramada de totora',fp:'2×2',f:p=>sh(40)+R(-30,-44,4,44,p.t)+R(26,-44,4,44,p.t)+P('M-42-40L0-86L42-40z','#d9bf7a')+P('M-42-40L0-86L-6-40z','#ead79a')+S('M-30-48L0-80M-14-44L8-76M6-42L22-68','#b39a5a',1.2)+P('M-42-40Q0-32 42-40L42-35Q0-27-42-35z','#b39a5a')+R(-16,-8,32,8,'#8d6342',2)}],
[{n:'Rocas costeras',fp:'2×1',f:p=>sh(44)+E(0,-10,38,13,p.s1)+P('M-32-12Q-12-32 12-24Q30-20 36-10Q0-2-32-12z',p.s3)+E(20,-22,12,8,p.s2)+E(14,-26,6,3,p.s3)},
 {n:'Tronco de mar',fp:'2×1',f:p=>sh(44)+R(-40,-12,80,12,'#c9b79c',6)+R(-40,-12,80,4,'#e0d2ba',2)+S('M-12-12L-20-24M14-12L22-22','#c9b79c',3)+E(-40,-6,3,6,'#a89478')},
 {n:'Redes tendidas',fp:'2×1',f:p=>sh(44)+R(-40,-32,3,32,p.t)+R(37,-32,3,32,p.t)+S('M-38-30Q0-8 38-30',p.s1,1.6)+S('M-34-22Q0-2 34-22',p.s2,1.2)+S('M-26-26V-12M-12-21V-7M0-19V-5M12-21V-7M26-26V-12',p.s2,1)+C(-8,-12,2.4,p.k)+C(14,-12,2.4,p.k)}],
[{n:'Cangrejo',fp:'1×1',f:p=>sh(16)+S('M-8-3l-5 5M8-3l5 5M-4-2l-3 5M4-2l3 5',p.a,2)+E(0,-9,13,8,p.a)+C(-17,-18,5,p.a)+C(17,-18,5,p.a)+C(-4,-18,1.8,'#2b3b4d')+C(4,-18,1.8,'#2b3b4d')},
 {n:'Gaviota',fp:'1×1',f:p=>sh(16)+S('M-2-2V-9M3-2V-9','#f0a050',1.6)+E(0,-16,11,7,'#fff')+P('M-10-17Q-2-24 8-17Q0-10-10-17z','#aab6c4')+P('M-11-16L-19-14L-11-12z','#aab6c4')+C(9,-23,5,'#fff')+P('M12-23L19-21L12-20z','#f0a050')+C(10,-24,1,'#2b3b4d')},
 {n:'Pingüino de Humboldt',fp:'1×1',f:p=>sh(16)+E(0,-14,8,13,'#2b3b4d')+E(1,-12,5,9,'#fff')+C(0,-26,5.5,'#2b3b4d')+P('M3-27L9-25L3-24z','#f0a050')+C(1.5,-27.5,1,'#fff')+E(-8,-14,2.5,7,'#2b3b4d')+E(-4,-1,3,1.5,'#f0a050')+E(4,-1,3,1.5,'#f0a050')+S('M-5-24Q0-20 4-24','#fff',1.2)}],
[{n:'Concha',fp:'1×1',f:p=>sh(14)+P('M-13 0Q-16-17 0-24Q16-17 13 0z',p.b)+P('M-13 0Q-16-17 0-24Q-8-12-6 0z','#fff')+S('M0 0V-20M7 0L9-17','#e0b9a0',1.5)},
 {n:'Estrella de mar',fp:'1×1',f:p=>sh(14)+`<g transform="translate(0 -9)">`+[0,72,144,216,288].map(a=>rot(a,P('M0 0L-3.4-5L0-14L3.4-5z',p.a))).join('')+C(0,0,3.6,p.a)+C(0,0,1.4,'#fff')+`</g>`},
 {n:'Caracol',fp:'1×1',f:p=>sh(14)+E(0,-3,11,3,'#e6cba5')+C(2,-9,8,'#e9b98a')+C(2,-9,5.4,'#f4d4a8')+C(2,-9,2.6,'#e9b98a')+S('M-9-4Q-14-10-12-16','#e6cba5',2)+C(-12,-17,1.3,'#2b3b4d')}],
[{n:'Fogata de playa',fp:'1×1',f:p=>sh(18)+E(-9,-2,5,3,p.s1)+E(9,-2,5,3,p.s2)+E(0,0,6,3,p.s1)+P('M0-6Q-9-18 0-30Q3-20 8-16Q10-10 0-6z','#f08a3c')+P('M0-6Q-4-14 0-22Q4-14 0-6z','#ffd877')},
 {n:'Antorcha de caña',fp:'1×1',f:p=>sh(14)+S('M0 0V-40','#a67b55',2.8)+P('M-4-40L4-40L3-44L-3-44z','#8a6a45')+P('M0-44Q-8-54 0-66Q3-58 6-54Q8-48 0-44z','#f08a3c')+P('M0-44Q-3-52 0-58Q3-52 0-44z','#ffd877')},
 {n:'Linterna de playa',fp:'1×1',f:p=>sh(14)+R(-1.5,-40,3,40,p.t)+R(-8,-52,16,14,'#e7ecf2',3)+R(-6,-50,12,10,p.y,2)+P('M-10-52L0-60L10-52z',p.k)+C(0,-61,1.6,p.s1)}]
];

const NAMES=['Árbol esbelto','Planta','Árbol grande','Suelo ancho','Animal','Detalle pequeño','Ambiente'];
const G={};Object.keys(HAB).forEach(k=>{const h=HAB[k];G[k]=[{label:'Estructura',s:-1,vars:V[k]?V[k][0]:[{...h.st,fp:'4×2'}]}].concat(NAMES.map((l,s)=>{const it=h.items.find(i=>i.s===s);return {label:l,s,vars:V[k]?V[k][s+1]:(it?[it]:[])}}).filter(g=>g.vars.length))});
  const SL=[{x:46,y:270,w:64,h:98,fp:'1×2',k:.58,l:1},{x:52,y:348,w:44,h:46,fp:'1×1',k:1.02,l:4},{x:120,y:302,w:80,h:88,fp:'2×2',k:.78,l:2},{x:232,y:334,w:88,h:42,fp:'2×1',k:.95,l:3},{x:290,y:398,w:60,h:40,fp:'1×1',k:1.3,l:5},{x:160,y:372,w:40,h:34,fp:'1×1',k:1.15,l:4},{x:322,y:318,w:44,h:40,fp:'1×1',k:.86,l:2}];
  const ST={x:268,y:266,w:120,h:104,k:.6,l:1};
  // Día en que llega cada casilla (índice de G): estructura al cerrar el día 10; ambiente con la atmósfera del día 9.
  const DIA_SLOT={1:3,3:4,0:5,4:6,2:7,5:8,6:9};
  const KSEL='tb_casillas_sel';
  const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
  const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){/* sin guardar */}};
  function leerSel(){try{return JSON.parse(lsGet(KSEL)||'{}')||{}}catch(e){return {}}}
  function elegida(hab,i){const s=leerSel()[hab];const n=(G[hab]||[])[i];if(!n)return -1;const v=s&&typeof s[i]==='number'?s[i]:0;return v<n.vars.length?v:0}
  function elegir(hab,i,v){const s=leerSel();s[hab]=s[hab]||[];s[hab][i]=v;lsSet(KSEL,JSON.stringify(s))}
  function llega(g,i){return i===0?10:(DIA_SLOT[g[i].s]||10)}
  // Piezas visibles ese día, de lejos a cerca. Devuelve marcado SVG (sin style).
  function capa(hab,dias){
    const g=G[hab];if(!g)return '';const h=HAB[hab],p=h.p,d=Math.max(0,Math.floor(dias||0));
    const sl=i=>i===0?ST:SL[g[i].s];
    const lista=g.map((x,i)=>({i,v:x.vars[elegida(hab,i)],sl:sl(i),dia:llega(g,i)})).filter(e=>e.v&&d>=e.dia).sort((a,b)=>a.sl.y-b.sl.y);
    if(!lista.length)return '';
    const pc=e=>`<g class="pc-w${e.dia===d?' nueva':''}"><g class="pc" data-x="${e.sl.x}" data-y="${e.sl.y}" data-w="${e.sl.w}" data-h="${e.sl.h}" data-k="${e.sl.k}" transform="translate(${e.sl.x} ${e.sl.y}) scale(${e.sl.k})">${e.v.f(p)}</g></g>`;
    const lej=lista.filter(e=>e.sl.y<310),cer=lista.filter(e=>e.sl.y>=310);
    return `<g class="casillas" data-lugar="${hab}" aria-hidden="true"><defs><linearGradient id="casBruma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe0" stop-opacity="0"/><stop offset=".5" stop-color="#f4efe0" stop-opacity=".34"/><stop offset="1" stop-color="#f4efe0" stop-opacity="0"/></linearGradient></defs>${lej.map(pc).join('')}<rect class="cas-bruma" x="-40" y="262" width="440" height="46" fill="url(#casBruma)"/>${cer.map(pc).join('')}</g>`;
  }
  // Tras insertar en el DOM: cada pieza se reduce sola si excede su casilla.
  function ajustar(raiz){
    (raiz||document).querySelectorAll('.casillas .pc').forEach(e=>{
      if(e.dataset.s)return;const gg=e.firstElementChild;if(!gg)return;
      const sd=gg.querySelectorAll('.sd');sd.forEach(n=>n.setAttribute('display','none'));let b=null;try{b=gg.getBBox()}catch(x){b=null}sd.forEach(n=>n.removeAttribute('display'));
      if(!b||!b.width)return;const w=+e.dataset.w,hh=+e.dataset.h,k0=+e.dataset.k,L=Math.max(-b.x,b.x+b.width),up=-b.y,k=Math.min(k0,w/2/L,up>0?hh/up:k0);
      e.setAttribute('transform',`translate(${e.dataset.x} ${e.dataset.y}) scale(${k.toFixed(3)})`);e.dataset.s=k.toFixed(3);
    });
  }
  const api={HAB,G,SL,ST,capa,ajustar,elegir,elegida,llega,tiene:h=>!!G[h]};
  if(typeof window!=='undefined')window.TBCasillas=api;if(typeof module!=='undefined')module.exports=api;
})();
