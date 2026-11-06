/* ART: generates each SVG on demand. Used only by scripts/bake-art.js to produce the WebP files */
(function(){
const INK='#2A1B3D';
let store=new Map();
const mix=(hex,to,p)=>{const n=parseInt(hex.slice(1),16),m=parseInt(to.slice(1),16);const c=s=>{const a=(n>>s)&255,b=(m>>s)&255;return Math.round(a+(b-a)*p).toString(16).padStart(2,'0');};return '#'+c(16)+c(8)+c(0);};
const G=h=>{const id='g'+h.slice(1).toLowerCase();store.set(id,h);return `url(#${id})`;};
const S=w=>w?`stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`:'';
const C=(x,y,r,f,w=3,ex='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${S(w)} ${ex}/>`;
const E=(x,y,a,b,f,w=3,ex='')=>`<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${f}" ${S(w)} ${ex}/>`;
const P=(d,f,w=3,ex='')=>`<path d="${d}" fill="${f}" ${S(w)} ${ex}/>`;
const R=(x,y,W,H,r,f,w=3,ex='')=>`<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${r}" fill="${f}" ${S(w)} ${ex}/>`;
const L=(d,c=INK,w=2.4,ex='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
const LL=(d,c,w=4)=>L(d,INK,w+3.6)+L(d,c,w);
const T=(t,s)=>`<g transform="${t}">${s}</g>`;
const M=s=>T('translate(120 0) scale(-1 1)',s);
const TX=(x,y,t,sz,c=INK,ex='')=>`<text x="${x}" y="${y}" font-family="Verdana,Arial,sans-serif" font-weight="800" font-size="${sz}" text-anchor="middle" fill="${c}" ${ex}>${t}</text>`;
const spark=(x,y,s,c='#FFF6C9')=>`<path d="M${x} ${y-s}Q${x} ${y} ${x+s} ${y}Q${x} ${y} ${x} ${y+s}Q${x} ${y} ${x-s} ${y}Q${x} ${y} ${x} ${y-s}Z" fill="${c}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
const blob=(list,col,w=3)=>list.map(([x,y,r])=>C(x,y,r+w,INK,0)).join('')+list.map(([x,y,r])=>C(x,y,r,G(col),0)).join('');
const REG={},CACHE={};
const reg=(name,fn,vb='0 0 120 120')=>{REG[name]={fn,vb};};
const build=name=>{
  const a=REG[name];if(!a)throw new Error('missing art '+name);
  store=new Map();const inner=a.fn();
  const defs=[...store].map(([id,h])=>`<radialGradient id="${id}" cx=".36" cy=".26" r=".95"><stop offset="0" stop-color="${mix(h,'#FFFFFF',.42)}"/><stop offset=".52" stop-color="${h}"/><stop offset="1" stop-color="${mix(h,'#1A1030',.3)}"/></radialGradient>`).join('');
  const [,,vw,vh]=a.vb.split(' ').map(Number);
  store=new Map();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${a.vb}" width="${vw*4}" height="${vh*4}">${defs?`<defs>${defs}</defs>`:''}${inner}</svg>`;
};
const STEEL='#D5DCEC',GOLD='#FFC94D',WOOD='#8A5A3A',RED='#F0506E';
/* HAMSTER */
const FUR={golden:['#F2A94E','#FFF1D6'],cream:['#F5DDB4','#FFFBF2'],white:['#F1EAE0','#FFFFFF'],gray:['#A8A6BC','#ECEAF5'],brown:['#A9744F','#F3DFC8'],black:['#4B4560','#B4AEC8'],ginger:['#E8833A','#FFE6CC'],blue:['#8FB0EC','#EAF2FF'],pink:['#F3A6C4','#FFF0F6'],mint:['#86D9B8','#EFFFF7'],purple:['#A78BDA','#F3ECFF'],yellow:['#F8D24E','#FFF9D8']};
const BODY='M60 38C80 38 92 50 93 66C101 72 101 86 92 90C86 102 73 109 60 109C47 109 34 102 28 90C19 86 19 72 27 66C28 50 40 38 60 38Z';
const pupil=(x,hx)=>C(x,64,7.2,INK,0)+C(hx,61.5,2.7,'#FFF',0)+C(x+2.6,66.8,1.2,'#FFF',0);
const EYES={
  normal:()=>pupil(45,43)+pupil(75,73),
  angry:()=>pupil(45,43)+pupil(75,73)+L('M36 53L52 59',INK,3.4)+L('M84 53L68 59',INK,3.4),
  happy:()=>L('M37 67Q45 56 53 67',INK,3.4)+L('M67 67Q75 56 83 67',INK,3.4),
  sleepy:()=>L('M37 62Q45 70 53 62',INK,3.4)+L('M67 62Q75 70 83 62',INK,3.4),
  wink:()=>pupil(45,43)+L('M67 67Q75 56 83 67',INK,3.4),
  star:()=>C(45,64,7.4,INK,0)+C(75,64,7.4,INK,0)+`<path d="M45 58Q45 64 51 64Q45 64 45 70Q45 64 39 64Q45 64 45 58Z" fill="${GOLD}"/><path d="M75 58Q75 64 81 64Q75 64 75 70Q75 64 69 64Q75 64 75 58Z" fill="${GOLD}"/>`,
  flat:()=>pupil(45,43)+pupil(75,73)+L('M36 56H54',INK,3.2)+L('M66 56H84',INK,3.2),
};
const muzzle=()=>P('M56 70.5Q60 68.5 64 70.5Q62.5 74 60 74Q57.5 74 56 70.5Z','#F2708F',1.6)+L('M60 74V76.5M60 76.5Q56.5 80 53 77M60 76.5Q63.5 80 67 77',INK,2)+R(57,77.6,6,5,1.4,'#FFF',1.4);
const dome=c=>P('M27 58C27 22 93 22 93 58Q60 47 27 58Z',G(c));
const HAT={
  band:p=>P('M28 54Q60 44 92 54L92 60Q60 50 28 60Z',G(p.c||RED))+P('M92 55C102 52 108 58 112 50L112 62C106 66 98 62 92 60Z',G(p.c||RED),2.4),
  knight:()=>dome('#C4CEE4')+R(56,25,8,26,3,G(GOLD),2.2)+P('M60 27C58 6 84 2 92 18C82 14 72 18 67 30Z',G(RED))+C(36,48,2,'#7E8AAE',0)+C(84,48,2,'#7E8AAE',0),
  miner:()=>dome('#FFC94D')+P('M24 58Q60 46 96 58Q98 63 92 62Q60 52 28 62Q22 63 24 58Z',G('#E8A92E'),2.4)+R(52,29,16,8,3,G('#6E6E86'),2)+C(60,33,7,G('#FFF6C9'),2.4),
  goggles:()=>P('M27 50Q60 40 93 50L93 56Q60 46 27 56Z','#5A4A36',0,`stroke="${INK}" stroke-width="2"`)+C(45,47,10,G('#7A5A3E'),2.6)+C(45,47,6.4,G('#A8E8FF'),2)+C(75,47,10,G('#7A5A3E'),2.6)+C(75,47,6.4,G('#A8E8FF'),2),
  viking:()=>P('M30 46C16 42 12 26 19 12C24 28 32 32 40 34Z','#F6ECCF')+P('M90 46C104 42 108 26 101 12C96 28 88 32 80 34Z','#F6ECCF')+dome('#AEB6CC')+P('M22 58Q60 44 98 58L97 64Q60 50 23 64Z',G(GOLD),2.4)+R(56,44,8,20,3,G('#8E97B0'),2.2),
  kabuto:()=>P('M44 34C42 12 54 4 60 4C66 4 78 12 76 34C70 24 50 24 44 34Z',G(GOLD))+dome('#B8324B')+P('M18 62C20 52 26 50 32 52L28 66Z',G('#8A2238'),2.4)+P('M102 62C100 52 94 50 88 52L92 66Z',G('#8A2238'),2.4),
  crown:()=>P('M36 46L31 20L47 33L60 13L73 33L89 20L84 46Q60 54 36 46Z',G(GOLD))+C(60,40,4,G(RED),2)+C(45,42,2.6,G('#5B9DFA'),1.6)+C(75,42,2.6,G('#5B9DFA'),1.6),
  archer:()=>P('M25 54C29 30 56 22 74 26L106 39C94 42 90 46 95 54Q60 42 25 54Z',G('#3FA66A'))+P('M70 28C76 8 92 0 102 0C100 14 90 26 77 32Z',G(RED),2.4)+L('M72 28C80 18 88 10 98 4','#B8324B',1.6),
  straw:()=>E(60,50,44,10,G('#EFD27A'))+P('M36 48C36 26 84 26 84 48Q60 56 36 48Z',G('#F5DE93'))+P('M36 44Q60 52 84 44L84 49Q60 57 36 49Z',G(RED),2),
  nurse:()=>P('M36 48Q40 28 60 28Q80 28 84 48Q60 40 36 48Z','#FFFFFF')+P('M60 42C54 37 54 32 58 32Q60 32 60 35Q60 32 62 32C66 32 66 37 60 42Z','#F0506E',1.4),
  chef:()=>P('M38 50C24 44 26 22 42 25C44 8 76 8 78 25C94 22 96 44 82 50Q60 56 38 50Z','#FFFFFF')+L('M50 46V36M60 47V34M70 46V36','#C9C5D8',2),
  cowboy:()=>E(60,50,46,8.5,G('#B88355'))+P('M38 49C38 20 52 26 60 29C68 26 82 20 82 49Q60 56 38 49Z',G('#B88355'))+P('M38 43Q60 50 82 43L82 49Q60 56 38 49Z',G('#5A3A28'),2),
  night:p=>P('M30 56C32 28 72 16 92 28C106 38 110 56 113 68C103 64 96 54 88 48Q60 42 30 56Z',G(p.c||'#7B6BD6'))+L('M42 44Q50 32 66 28M56 46Q66 34 82 32M72 46Q80 38 92 40','#FFFFFF',2.4,'opacity=".7"')+C(113,70,7,'#FFFFFF')+P('M28 52Q60 42 92 50L92 58Q60 49 28 60Z','#FFFFFF'),
  wizard:p=>E(60,46,38,8,G(p.c||'#7B4FC9'))+P('M36 44C44 26 52 4 84 -10C78 8 82 24 85 44Q60 52 36 44Z',G(p.c||'#7B4FC9'))+spark(64,20,6,GOLD)+spark(52,34,3.4,GOLD)+P('M38 40Q60 48 83 40L84 45Q60 53 37 45Z',G(GOLD),2),
  beret:()=>T('rotate(-10 60 42)',E(60,42,33,12,G('#C93B5A'))+C(60,29,3.4,G('#C93B5A'),2.2)),
  hoodF:p=>P('M29 64C27 36 93 36 91 64C84 50 36 50 29 64Z',G(p.c||'#5A3A8E')),
  leaf:()=>[30,41,52,60,68,79,90].map((x,i)=>T(`translate(${x} ${[50,43,40,39,40,43,50][i]}) rotate(${[-40,-25,-10,0,10,25,40][i]})`,P('M0 4C-9 -2-7-14 0-18C7-14 9-2 0 4Z',G(i%2?'#4CCB7F':'#35B06E'),2.2))).join('')+C(60,38,4,G('#F59DB5'),2),
  thunder:()=>P('M28 44C12 40 4 26 6 14C14 24 24 28 34 32Z','#FFFFFF')+P('M92 44C108 40 116 26 114 14C106 24 96 28 86 32Z','#FFFFFF')+dome('#AEB6CC')+P('M62 22L52 40L60 40L56 52L70 34L62 34L66 22Z',G(GOLD),2),
  sailor:()=>P('M32 52Q60 26 88 52Q60 42 32 52Z','#FFFFFF')+P('M31 50Q60 40 89 50L89 57Q60 47 31 57Z',G('#3A5FB8'),2.4),
  tricorn:()=>P('M22 50C28 24 46 30 60 20C74 30 92 24 98 50Q60 60 22 50Z',G('#2E2A44'))+C(60,36,6.5,'#FFFFFF',2)+L('M57 44H63',INK,2)+L('M24 48Q60 58 96 48',GOLD,2),
  tophat:()=>R(42,2,36,42,3,G('#2E2A44'))+R(42,30,36,8,0,G(RED),2.2)+E(60,46,33,7,G('#2E2A44')),
  dive:()=>C(60,62,36,G('#D8F4FF'),3.4,'opacity=".42"')+L('M34 40Q44 30 60 28','#FFFFFF',3.4)+P('M24 68H36V82H24ZM84 68H96V82H84Z',G(GOLD),2.4)+C(60,26,5,G(GOLD),2.2),
  halo:()=>E(60,20,23,6.5,'none',0,`stroke="${INK}" stroke-width="7"`)+E(60,20,23,6.5,'none',0,`stroke="${GOLD}" stroke-width="3.8"`),
  aviator:()=>P('M28 58C28 26 92 26 92 58Q60 46 28 58Z',G('#8A5A3A'))+C(45,48,9,G('#6B4A32'),2.4)+C(45,48,5.8,G('#FFE28A'),1.8)+C(75,48,9,G('#6B4A32'),2.4)+C(75,48,5.8,G('#FFE28A'),1.8),
};
const stick=(c,len=56,w=4,top=16)=>LL(`M0 ${top}L2 ${-len}`,c,w);
const W={
  sword:()=>T('rotate(18)',P('M-5.5-8L-5.5-52L0-64L5.5-52L5.5-8Z',G('#E8EDF9'))+L('M0-56V-12','#9AA6C6',1.8)+R(-13,-10,26,6.5,3,G(GOLD))+R(-3,-4,6,14,2,'#7A4A2E')+C(0,12,3.8,G(GOLD))),
  short:()=>T('rotate(16)',P('M-5-8L-5-38L0-48L5-38L5-8Z',G('#E8EDF9'))+R(-11,-10,22,5.5,2.6,G('#C9743F'))+R(-3,-5,6,13,2,'#7A4A2E')),
  katana:()=>T('rotate(14)',P('M-3-10C-7-34-5-54 7-74C9-52 7-30 4-10Z',G('#EEF2FB'))+E(0,-9,8,3,G(GOLD),2.2)+R(-3.4,-7,6.8,20,2,G('#B8324B'),2.4)),
  axe:()=>T('rotate(14)',LL('M0 18L0-54',WOOD,4)+P('M1-52C16-62 32-52 33-32C24-38 12-36 1-30Z',G(STEEL))+P('M-1-52C-16-62-32-52-33-32C-24-38-12-36-1-30Z',G(STEEL))),
  hammer:()=>T('rotate(12)',LL('M0 20L0-40',WOOD,4.6)+R(-24,-66,48,28,6,G('#C4CEE4'))+R(-24,-58,48,10,0,G(GOLD),2.4)+P('M3-66L-8-50L-1-50L-5-38L10-54L2-54L7-66Z',G('#FFE28A'),1.8)),
  pick:()=>T('rotate(14)',LL('M0 20L0-48',WOOD,4.4)+P('M-34-42C-16-62 16-62 34-42C16-52-16-52-34-42Z',G(STEEL))+R(-5,-58,10,12,2,G('#7A7A92'),2.2)),
  wrench:()=>T('rotate(14)',LL('M0 16L0-34',STEEL,7)+P('M-12-34C-15-50-7-58 0-58L-2-46L8-46L8-58C14-56 15-44 12-34C6-28-6-28-12-34Z',G(STEEL))),
  fork:()=>T('rotate(10)',LL('M0 20V-40',WOOD,4)+LL('M-14-60V-46Q-14-40 0-40Q14-40 14-46V-60',STEEL,3.4)+LL('M0-40V-64',STEEL,3.4)),
  trident:()=>T('rotate(10)',LL('M0 22V-44',GOLD,4.2)+LL('M-16-58V-50Q-16-44 0-44Q16-44 16-50V-58',GOLD,3.8)+P('M-16-72L-21-56H-11Z',G(GOLD),2.4)+P('M16-72L11-56H21Z',G(GOLD),2.4)+P('M0-80L-6-58H6Z',G(GOLD),2.4)),
  heart:()=>T('rotate(12)',LL('M0 18V-36','#F59DB5',4)+P('M0-34C-20-48-14-68 0-58C14-68 20-48 0-34Z',G('#F0506E'))+spark(16,-66,5,GOLD)),
  pan:()=>T('rotate(14)',LL('M0 16L0-14','#55556A',5.4)+C(0,-34,21,G('#5D5D74'))+E(1,-34,12,10,'#FFFFFF',0)+C(2,-34,5,G(GOLD),1.4)),
  sling:()=>T('rotate(10)',LL('M0 16V-12',WOOD,4.6)+LL('M0-12L-12-34',WOOD,4.2)+LL('M0-12L12-34',WOOD,4.2)+L('M-12-34Q0-18 12-34',RED,2.4)+C(0,-26,4,G(GOLD),2)),
  moon:()=>T('rotate(8)',stick('#6B4A8E',60,4,20)+P('M10-92C-8-96-20-80-15-66C-10-54 6-50 15-57C4-57-5-65-5-75C-5-84 2-89 10-92Z',G('#FFE28A'))+spark(14,-78,5,'#FFFFFF')),
  orb:p=>T('rotate(8)',stick('#6B4A8E',56,4,20)+P('M-8-54Q2-44 12-54L10-60Q2-52-6-60Z',G(GOLD),2.2)+C(2,-68,11,G(p.c2||'#5B9DFA'))+spark(-10,-82,4.4)+spark(16,-58,3.4)),
  snow:()=>T('rotate(8)',stick('#7FB8D8',56,4,20)+C(2,-68,12,G('#BFEFFF'))+L('M2-78V-58M-7-73L11-63M-7-63L11-73','#FFFFFF',2.2)+spark(18,-82,4)),
  leaf:()=>T('rotate(6)',LL('M0 20C8-8-6-30 4-56','#7A5232',5)+P('M4-54C-16-58-24-76-18-90C-4-86 8-72 4-54Z',G('#4CCB7F'))+P('M4-54C10-72 24-82 36-78C36-62 22-52 4-54Z',G('#35B06E'))+C(4,-56,4,G('#F59DB5'),2)),
  bolt:()=>T('rotate(10)',LL('M0 14V-26','#5B7CFA',4)+P('M6-66L-11-38L0-38L-6-16L14-46L3-46Z',G(GOLD))),
  wand:()=>T('rotate(14)',LL('M0 12V-36',INK,3)+L('M0-36V-28','#FFFFFF',3)+spark(0,-48,9,GOLD)+spark(16,-36,4.4)+spark(-14,-40,3.6)),
  gun:()=>T('rotate(-20)',R(-8,-22,36,15,6,G('#5B7CFA'))+R(26,-19,14,9,2,G(GOLD),2.4)+R(-5,-9,11,20,3,G('#3A3A56'))+L('M10-22L2-12H8L4-6',GOLD,2)),
  bomb:()=>C(2,-16,18,G('#3A3550'))+LL('M10-32C12-40 20-42 24-48','#A9744F',2.6)+spark(27,-52,8,GOLD)+E(-4,-23,5,3,'#FFFFFF',0,'opacity=".5"'),
  flask:()=>P('M-6-44H6V-30L20-6Q24 6 12 6H-12Q-24 6-20-6L-6-30Z',G('#E8F8FF'))+P('M-15-8H15L18-2Q20 4 12 4H-12Q-20 4-18-2Z',G('#35D0E0'),0)+R(-7,-52,14,9,2,G('#C9743F'),2.2)+C(-4,-14,2.4,'#FFFFFF',0)+C(5,-20,1.8,'#FFFFFF',0),
  lute:()=>T('rotate(16)',LL('M0-30V-62','#7A4A2E',5.4)+E(0,-14,17,20,G('#C9743F'))+C(0,-16,5.4,INK,0)+L('M-3-58V-2M3-58V-2','#FFF6E0',1)+R(-5,-68,10,8,2,G('#7A4A2E'),2.2)),
  pillow:()=>T('rotate(-6)',R(-22,-44,46,36,13,G('#F6D8EE'))+C(-22,-44,3.6,G('#F06BAE'),1.8)+C(24,-44,3.6,G('#F06BAE'),1.8)+C(-22,-8,3.6,G('#F06BAE'),1.8)+C(24,-8,3.6,G('#F06BAE'),1.8)),
  book:()=>P('M-24-34Q-12-42 0-34Q12-42 24-34V0Q12-8 0 0Q-12-8-24 0Z',G('#FFF6E0'))+L('M0-34V0',INK,2.4)+L('M-18-28Q-10-32-5-28M-18-20Q-10-24-5-20M5-28Q10-32 18-28M5-20Q10-24 18-20','#B8A88A',1.8)+spark(10,-48,5,GOLD),
  scythe:()=>T('rotate(8)',LL('M0 22L4-72','#4A3A6A',4.6)+P('M4-72C-18-86-52-76-60-46C-42-62-20-64 3-56Z',G('#DDE0F4'))+L('M-2-68C-20-74-40-68-50-54','#FFFFFF',1.8)),
  star:()=>T('translate(0 -16)',P('M0-20L6-6L20 0L6 6L0 20L-6 6L-20 0L-6-6Z',G(STEEL))+C(0,0,3.4,INK,0)),
  anchor:()=>T('rotate(10)',LL('M0 18V-40','#5A6A88',5)+C(0,-47,6.5,'none',0,`stroke="${INK}" stroke-width="7"`)+C(0,-47,6.5,'none',0,`stroke="#8A96B0" stroke-width="3.4"`)+LL('M-13-28H13','#5A6A88',4)+LL('M-22-6Q-18 16 0 18Q18 16 22-6','#5A6A88',5)),
  saber:()=>T('rotate(14)',P('M-4-6C-16-30-10-56 8-68C2-46 4-24 6-6Z',G('#EEF2FB'))+P('M-11-7H13Q13 7 1 7Q-11 7-11-7Z',G(GOLD),2.4)+R(-3,-3,6,14,2,'#7A4A2E',2.2)),
  harpoon:()=>T('rotate(10)',LL('M0 20V-56','#8A96B0',3.8)+P('M0-78L10-56L2-59V-52H-2V-59L-10-56Z',G(STEEL))),
  scepter:()=>T('rotate(10)',LL('M0 20V-42',GOLD,4.4)+P('M-11-44L-14-60L-5-53L0-64L5-53L14-60L11-44Z',G(GOLD))+C(0,-48,4,G(RED),2)),
};
const OFF={
  shield:p=>P('M-18-24Q0-31 18-24L18 2Q16 22 0 33Q-16 22-18 2Z',G(p.c||'#5B7CFA'))+P('M-11-17Q0-22 11-17L11 1Q9 15 0 24Q-9 15-11 1Z',mix(p.c||'#5B7CFA','#FFFFFF',.28),0)+P('M0-12L3-3L12-3L5 3L8 12L0 6L-8 12L-5 3L-12-3L-3-3Z',GOLD,1.6),
  battery:()=>R(-17,-28,34,54,7,G(GOLD))+R(-6,-35,12,8,2,G('#6E6E86'),2.4)+P('M3-20L-9 2H-1L-4 18L10-6H1Z','#2A1B3D',0),
  bow:()=>LL('M-2-42Q-30 0-2 42',WOOD,4.2)+L('M-2-42L10 0L-2 42','#FFF6E0',1.5)+LL('M10 0H-24','#C9743F',2.2)+P('M-34 0L-22-6V6Z',G(STEEL),2)+P('M10 0L18-5V5Z',G(RED),1.6),
  dagger:()=>T('rotate(-16)',P('M-4-6V-30L0-40L4-30V-6Z',G('#E8EDF9'))+R(-9,-8,18,5,2.4,G(GOLD),2.2)+R(-2.6,-3,5.2,11,2,'#3A3550',2)),
  star:()=>T('translate(-2 -14)',P('M0-16L5-5L16 0L5 5L0 16L-5 5L-16 0L-5-5Z',G(STEEL))+C(0,0,2.8,INK,0)),
  flask:()=>T('translate(-4 2)',P('M-5-28H5V-20L14-4Q16 4 8 4H-8Q-16 4-14-4L-5-20Z',G('#FFD9EE'))+P('M-10-6H10L12-1Q13 3 8 3H-8Q-13 3-12-1Z',G('#F06BAE'),0)+R(-6,-34,12,7,2,G('#C9743F'),2)),
  book:()=>R(-14,-22,28,34,3,G('#7B4FC9'))+R(-10,-18,20,26,1,'#FFF6E0',1.6)+spark(0,-5,5,GOLD),
};
const BACK={
  cape:p=>P('M32 70C20 92 16 108 20 116L100 116C104 108 100 92 88 70Z',G(p.c||'#B8324B')),
  quiver:()=>T('rotate(22 96 56)',R(88,26,16,46,5,G('#A9744F'))+L('M92 26V14M100 26V12','#E8D2A0',2.4)+P('M92 16L88 8H96Z',G(RED),1.6)+P('M100 14L96 6H104Z',G('#4CCB7F'),1.6)),
  wings:()=>P('M30 62C6 56-8 62-11 42C0 44 10 34 30 46Z','#FFFFFF')+P('M90 62C114 56 128 62 131 42C120 44 110 34 90 46Z','#FFFFFF'),
  hood:p=>P('M22 70C16 30 42 18 60 16C78 18 104 30 98 70Q60 92 22 70Z',G(p.c||'#5A3A8E')),
  tank:()=>R(84,40,18,50,8,G(GOLD))+R(88,32,10,10,2,G('#8A96B0'),2.2),
  pack:()=>R(82,50,28,42,9,G('#C9743F'))+L('M90 60H104',INK,2),
  wheel:()=>C(60,62,62,'none',0,`stroke="${INK}" stroke-width="12"`)+C(60,62,62,'none',0,`stroke="${GOLD}" stroke-width="7"`)+[0,45,90,135].map(a=>T(`rotate(${a} 60 62)`,L('M-2 62H122',INK,5)+L('M-2 62H122',GOLD,2.4))).join('')+[0,60,120,180,240,300].map(a=>T(`rotate(${a} 60 62)`,spark(60,0,5.4,'#FFF6C9'))).join(''),
  aura:p=>C(60,66,56,p.c2||GOLD,0,'opacity=".22"')+C(60,66,46,p.c2||GOLD,0,'opacity=".22"')+spark(4,34,6,'#FFF6C9')+spark(116,26,7,'#FFF6C9')+spark(112,92,4.6,'#FFF6C9')+spark(8,90,4.4,'#FFF6C9'),
};
const FACEX={
  patch:()=>P('M36 58L54 60L52 70Q42 74 36 68Z',INK,0)+L('M30 50L58 62',INK,2.2),
  mask:()=>P('M27 68Q60 60 93 68C94 92 78 104 60 104C42 104 26 92 27 68Z',G('#3A3550')),
  glasses:()=>C(45,64,10,'none',2.4)+C(75,64,10,'none',2.4)+L('M55 62H65',INK,2.4),
  beard:()=>P('M33 80C40 88 50 84 60 84C70 84 80 88 87 80C90 100 72 112 60 112C48 112 30 100 33 80Z',G('#D97F3A')),
  scarf:p=>P('M29 86Q60 98 91 86L93 96Q60 108 27 96Z',G(p.c||'#2FB8C8'))+P('M78 98L92 120L76 118L68 100Z',G(p.c||'#2FB8C8')),
};
/* the scene asks scripts/bake-rig.js for its hamsters, so they match the pets */
const sceneHam=(k,o)=>window.sceneRig?window.sceneRig(k):hamster(o);
function hamster(p){
  const [fur,belly]=FUR[p.fur||'golden'];
  let s=E(60,114,42,6.5,INK,0,'opacity=".18"');
  (p.back||[]).forEach(b=>{s+=BACK[b](p);});
  const foot=G(mix(fur,'#7A4A2E',.28));
  s+=E(45,108.5,11.5,6.5,foot)+E(75,108.5,11.5,6.5,foot);
  if(!p.noEars)s+=C(35,42,11.5,G(fur))+C(35,43,6,'#F59DB5',0)+C(85,42,11.5,G(fur))+C(85,43,6,'#F59DB5',0);
  s+=P(BODY,G(fur));
  if(p.squeek)s+=P('M59 40C42 40 30 50 28 66C38 73 52 66 56 54Q59 47 59 40Z',G('#F2923C'),0)+P('M72 92C84 92 90 84 92 78C96 84 92 92 88 96C80 104 72 106 66 106Z',G('#F2923C'),0);
  s+=E(60,91,21,14.5,belly,0)+E(60,73,15.5,10.5,belly,0);
  s+=E(46,47,11,5,'#FFFFFF',0,'opacity=".28"');
  s+=E(35,79,7.5,5,'#F58FA8',0,'opacity=".8"')+E(85,79,7.5,5,'#F58FA8',0,'opacity=".8"');
  const fx=p.face||[];
  if(fx.includes('mask'))s+=FACEX.mask(p);
  s+=EYES[p.eyes||'normal']();
  if(!fx.includes('mask'))s+=muzzle();
  fx.filter(f=>f!=='mask').forEach(f=>{s+=FACEX[f](p);});
  if(p.hat)s+=HAT[p.hat](p);
  if(p.weapon)s+=T('translate(95 88)',W[p.weapon](p));
  s+=E(95,88,8,7,G(fur));
  if(p.off)s+=T('translate(25 88)',OFF[p.off](p));
  s+=E(25,88,8,7,G(fur));
  if(p.z)s+=TX(100,22,'z',16,'#7B6BD6')+TX(110,10,'z',11,'#7B6BD6');
  return s;
}
const PETS={
  blade:{fur:'golden',hat:'band',weapon:'sword'},
  knight:{fur:'cream',hat:'knight',noEars:1,weapon:'sword',off:'shield',c:'#5B7CFA',eyes:'angry'},
  miner:{fur:'brown',hat:'miner',noEars:1,weapon:'pick',eyes:'happy'},
  engineer:{fur:'gray',hat:'goggles',weapon:'wrench',back:['pack']},
  viking:{fur:'ginger',hat:'viking',noEars:1,weapon:'axe',face:['beard'],eyes:'angry'},
  samurai:{fur:'white',hat:'kabuto',noEars:1,weapon:'katana',eyes:'flat'},
  king:{fur:'golden',hat:'crown',weapon:'scepter',back:['aura','cape'],c:'#B8324B',eyes:'happy'},
  archer:{fur:'cream',hat:'archer',noEars:1,off:'bow',back:['quiver'],eyes:'flat'},
  farmer:{fur:'golden',hat:'straw',noEars:1,weapon:'fork',eyes:'happy'},
  nurse:{fur:'pink',hat:'nurse',weapon:'heart',eyes:'happy'},
  chef:{fur:'cream',hat:'chef',noEars:1,weapon:'pan',eyes:'wink'},
  hunter:{fur:'brown',hat:'cowboy',noEars:1,weapon:'sling',eyes:'flat'},
  druid:{fur:'mint',hat:'leaf',weapon:'leaf',back:['cape'],c:'#3FA66A'},
  dozer:{fur:'cream',hat:'night',noEars:1,weapon:'pillow',eyes:'sleepy',z:1},
  wizard:{fur:'purple',hat:'wizard',noEars:1,weapon:'moon',c:'#5A3AA8',eyes:'sleepy'},
  shade:{fur:'black',hat:'band',c:'#3A3550',face:['mask'],weapon:'star',off:'dagger',eyes:'angry'},
  singer:{fur:'pink',hat:'beret',weapon:'lute',eyes:'happy'},
  priest:{fur:'white',hat:'halo',back:['wings'],weapon:'book',eyes:'happy'},
  sandman:{fur:'purple',hat:'hoodF',noEars:1,back:['aura','hood'],c:'#3A2A6A',c2:'#F06BAE',weapon:'scythe',eyes:'angry'},
  sparky:{fur:'yellow',hat:'goggles',weapon:'bolt',eyes:'wink'},
  gunner:{fur:'gray',hat:'band',c:'#5B7CFA',weapon:'gun',eyes:'flat'},
  electrician:{fur:'golden',hat:'miner',noEars:1,weapon:'bolt',off:'battery',eyes:'flat'},
  magician:{fur:'blue',hat:'tophat',weapon:'wand',back:['cape'],c:'#5A3AA8',eyes:'wink'},
  bomber:{fur:'ginger',hat:'aviator',noEars:1,weapon:'bomb',face:['scarf'],c:'#F0506E',eyes:'happy'},
  thor:{fur:'yellow',hat:'thunder',noEars:1,weapon:'hammer',back:['aura','cape'],c:'#5B7CFA',c2:'#FFC94D',eyes:'angry'},
  sailor:{fur:'cream',hat:'sailor',weapon:'anchor',face:['scarf'],c:'#3A5FB8'},
  pirate:{fur:'brown',hat:'tricorn',noEars:1,weapon:'saber',face:['patch'],eyes:'flat'},
  alchemist:{fur:'blue',hat:'goggles',weapon:'flask',off:'flask',eyes:'wink'},
  diver:{fur:'golden',hat:'dive',weapon:'harpoon',back:['tank'],eyes:'normal'},
  icemage:{fur:'white',hat:'wizard',noEars:1,weapon:'snow',face:['scarf'],c:'#3A8FD8'},
  poseidon:{fur:'blue',hat:'crown',weapon:'trident',back:['aura','cape'],c:'#2FB8C8',c2:'#2FD6E8',eyes:'angry'},
  squeektoshi:{fur:'white',squeek:1,back:['wheel'],eyes:'star'},
};
Object.entries(PETS).forEach(([id,p])=>reg('pet_'+id,()=>hamster(p),'-14 -16 148 148'));
/* MONSTERS */
const eye=(x,y,r,o={})=>C(x,y,r,o.white||'#FFFFFF',2.4)+C(x+(o.dx||0),y+(o.dy===undefined?.8:o.dy),r*.52,o.pupil||INK,0)+C(x+(o.dx||0)-r*.2,y-r*.14,r*.17,'#FFFFFF',0);
const brow=(a,b,c,d,w=3.6)=>L(`M${a} ${b}L${c} ${d}`,INK,w);
const angry=(a,b,y,r,o)=>eye(a,y,r,o)+eye(b,y,r,o)+brow(a-r-1,y-r-1,a+r,y-r*.3)+brow(b+r+1,y-r-1,b-r,y-r*.3);
const worried=(a,b,y,r,o)=>eye(a,y,r,o)+eye(b,y,r,o)+brow(a-r,y-r*.4,a+r,y-r-2)+brow(b+r,y-r*.4,b-r,y-r-2);
const sly=(a,b,y,r,col)=>C(a,y,r,'#FFFFFF',2.4)+C(a+1.5,y+1,r*.48,INK,0)+P(`M${a-r-1} ${y-1}Q${a} ${y-r-5} ${a+r+1} ${y-1}Z`,col,2.2)+C(b,y,r,'#FFFFFF',2.4)+C(b+1.5,y+1,r*.48,INK,0)+P(`M${b-r-1} ${y-1}Q${b} ${y-r-5} ${b+r+1} ${y-1}Z`,col,2.2);
const fang=(x,y,s=7)=>P(`M${x-s/2} ${y}L${x} ${y+s}L${x+s/2} ${y}Z`,'#FFFFFF',1.6);
const snarl=(x,y,w,h=9)=>P(`M${x-w} ${y}Q${x} ${y-3} ${x+w} ${y}Q${x+w-2} ${y+h} ${x} ${y+h}Q${x-w+2} ${y+h} ${x-w} ${y}Z`,'#7A1F3D',2.4)+fang(x-w*.55,y-.5)+fang(x+w*.55,y-.5);
const shadow=()=>E(60,113,40,6,INK,0,'opacity=".18"');
const MA={
 grumpy_sprout:()=>shadow()+LL('M60 68V50','#3FA66A',4)+P('M60 52C44 48 24 38 24 14C46 14 62 30 60 52Z',G('#4CCB7F'))+L('M57 47C50 38 42 30 32 22','#2F8F5B',2)+P('M60 52C62 34 78 18 100 20C100 42 82 54 60 52Z',G('#35B06E'))+L('M64 48C72 40 82 32 92 27','#25875A',2)+P('M32 72H88L82 110Q60 116 38 110Z',G('#D97F45'))+R(27,62,66,14,5,G('#EE9A5C'))+angry(47,73,88,6.8)+L('M50 103L55 99L60 103L65 99L70 103',INK,2.6),
 husk_bug:()=>shadow()+L('M26 64L8 54M24 80L6 82M30 96L12 108M94 64L112 54M96 80L114 82M90 96L108 108',INK,4.2)+E(60,74,37,35,G('#A9B85E'))+L('M60 42V108',INK,3)+C(44,66,6,'#7E9444',0)+C(76,66,6,'#7E9444',0)+C(42,88,5,'#7E9444',0)+C(78,88,5,'#7E9444',0)+P('M45 26C38 14 42 6 49 3C47 12 52 18 55 24Z',G('#E0CA7A'),2.4)+P('M75 26C82 14 78 6 71 3C73 12 68 18 65 24Z',G('#E0CA7A'),2.4)+E(60,38,21,16,G('#6E8A3F'))+angry(52,68,37,5.2),
 corn_worm:()=>shadow()+E(100,108,5,3,INK)+E(78,108,5,3,INK)+E(56,108,5,3,INK)+C(100,92,13,G('#FFD95E'))+C(80,88,16,G('#FFE27A'))+C(58,84,19,G('#FFD95E'))+L('M78 74Q84 88 78 104M56 66Q64 84 56 102','#D9A92E',2.4)+P('M30 62C14 64 12 84 24 92C34 84 40 74 40 62Z',G('#4CCB7F'))+C(42,52,26,G('#FFE27A'))+L('M34 30C30 18 22 14 16 16',INK,2.6)+C(15,16,3.6,G(RED),2)+L('M50 28C52 16 60 12 66 14',INK,2.6)+C(67,14,3.6,G(RED),2)+eye(33,50,8)+eye(53,50,8)+L('M34 66Q43 74 52 66',INK,2.8)+P('M47 70C51 72 52 80 48 82C44 80 43 74 47 70Z',G('#35D07F'),1.8),
 popcorn:()=>shadow()+LL('M62 26C64 16 72 12 78 8','#6B4A2E',3)+spark(83,6,10,GOLD)+blob([[60,62,25],[35,70,19],[85,70,19],[45,44,17],[76,46,17],[60,90,21],[38,92,13],[82,92,13]],'#FFF4D6')+C(32,52,3,'#D9A92E',0)+C(90,56,3,'#D9A92E',0)+C(70,100,3,'#D9A92E',0)+angry(47,73,62,7.4)+snarl(60,78,12),
 strangle_vine:()=>shadow()+LL('M60 112C24 100 26 72 58 64C86 56 84 40 62 36','#3FA66A',10)+P('M34 92C20 92 10 84 6 72C20 70 32 76 38 86Z',G('#4CCB7F'))+P('M80 66C92 62 104 66 112 76C100 82 86 80 78 74Z',G('#35B06E'))+P('M28 34C30 6 88 2 94 30Z',G('#F0708A'))+P('M30 34C42 56 80 56 92 30Z',G('#D94F70'))+L('M34 36L40 44L46 37L52 46L58 38L64 46L70 37L76 44L84 33','#FFFFFF',2.6)+angry(46,74,18,6.2),
 spotted_shroom:()=>shadow()+P('M42 66C40 84 37 100 44 110H76C83 100 80 84 78 66Z',G('#FFF1DC'))+P('M12 68C12 28 38 10 60 10C82 10 108 28 108 68C92 76 28 76 12 68Z',G('#35B06E'))+C(40,36,9,'#EFFFF7',0)+C(76,28,7,'#EFFFF7',0)+C(90,52,6.4,'#EFFFF7',0)+C(58,56,6,'#EFFFF7',0)+C(26,54,5,'#EFFFF7',0)+worried(50,70,84,5.6)+L('M52 100Q56 96 60 100T68 100',INK,2.6)+C(14,92,2.6,'#6FE0A8',0)+C(106,88,3,'#6FE0A8',0)+C(102,104,2,'#6FE0A8',0),
 counting_sheep:()=>shadow()+R(40,90,10,20,4,G('#4B4560'))+R(70,90,10,20,4,G('#4B4560'))+blob([[60,50,25],[35,56,19],[85,56,19],[43,34,16],[77,34,16],[60,72,23],[39,76,16],[81,76,16]],'#FFFFFF')+E(36,62,9,5,G('#F59DB5'))+E(84,62,9,5,G('#F59DB5'))+E(60,62,18,20,G('#F59DB5'))+L('M46 56Q52 62 58 56',INK,3)+L('M62 56Q68 62 74 56',INK,3)+E(60,72,3.6,2.6,INK,0)+L('M60 75V78M60 78Q56 81 53 78M60 78Q64 81 67 78',INK,2)+TX(100,24,'z',18,'#7B6BD6')+TX(110,10,'z',12,'#7B6BD6'),
 ghost_pillow:()=>shadow()+P('M20 28Q60 14 100 28Q106 60 100 98Q90 88 80 98Q70 110 60 98Q50 88 40 98Q30 108 20 98Q14 60 20 28Z',G('#F7D7EE'))+C(20,27,5.4,G('#F06BAE'),2.2)+C(100,27,5.4,G('#F06BAE'),2.2)+E(44,52,8,11,INK,0)+E(76,52,8,11,INK,0)+C(42,48,2.8,'#FFFFFF',0)+C(74,48,2.8,'#FFFFFF',0)+E(60,74,6.5,9,'#7A1F3D',2.4)+E(30,66,7,4,'#F59DB5',0)+E(90,66,7,4,'#F59DB5',0),
 yawning_bat:()=>shadow()+P('M42 56C30 32 8 24-2 40C8 44 8 56 3 64C12 60 18 66 18 76C24 70 34 72 40 82Z',G('#8A5FB8'))+M(P('M42 56C30 32 8 24-2 40C8 44 8 56 3 64C12 60 18 66 18 76C24 70 34 72 40 82Z',G('#8A5FB8')))+P('M40 42L34 14L54 32Z',G('#A97AD6'))+P('M80 42L86 14L66 32Z',G('#A97AD6'))+C(60,58,25,G('#A97AD6'))+L('M44 50Q50 56 56 50',INK,3)+L('M64 50Q70 56 76 50',INK,3)+E(60,68,12,13,'#7A1F3D',2.6)+fang(50,57.5,6)+fang(70,57.5,6)+E(60,75,7,5,'#F0708A',0)+E(60,92,8,5,G('#8A5FB8')),
 insomniac_owl:()=>shadow()+P('M30 28L22 2L48 16Z',G('#C48AD8'))+P('M90 28L98 2L72 16Z',G('#C48AD8'))+P('M60 12C90 12 102 38 102 66C102 96 86 110 60 110C34 110 18 96 18 66C18 38 30 12 60 12Z',G('#C48AD8'))+L('M40 84Q46 90 52 84M54 92Q60 98 66 92M68 84Q74 90 80 84','#8E5AA6',2.6)+C(41,50,18,'#FFF6C9',3)+C(79,50,18,'#FFF6C9',3)+C(41,50,6,INK,0)+C(79,50,6,INK,0)+C(39,48,2,'#FFFFFF',0)+C(77,48,2,'#FFFFFF',0)+L('M26 66Q40 74 54 66M66 66Q80 74 94 66','#8E5AA6',3)+P('M53 60H67L60 74Z',G(GOLD),2.6)+E(44,110,8,4,G(GOLD),2.2)+E(76,110,8,4,G(GOLD),2.2),
 fud_cloud:()=>blob([[60,44,27],[33,54,20],[87,54,20],[45,32,16],[77,34,15],[60,62,21],[35,68,13],[85,68,13]],'#85799E')+worried(46,74,50,6.6)+L('M50 68Q55 63 60 68T70 68',INK,2.8)+TX(60,83,'FUD',13,'#FFFFFF')+P('M30 92C33 96 34 102 30 104C26 102 27 96 30 92Z',G('#7FC4F0'),1.8)+P('M56 98C59 102 60 108 56 110C52 108 53 102 56 98Z',G('#7FC4F0'),1.8)+P('M86 92C89 96 90 102 86 104C82 102 83 96 86 92Z',G('#7FC4F0'),1.8)+P('M72 90L64 104H70L66 116L80 98H73L77 90Z',G(GOLD),2),
 shadow_cat:()=>shadow()+LL('M88 100C114 92 114 60 98 50','#4A2A63',7)+P('M28 110C24 80 34 64 60 64C86 64 96 80 92 110Q60 118 28 110Z',G('#4A2A63'))+P('M32 34L27 4L56 22Z',G('#5A2F78'))+P('M88 34L93 4L64 22Z',G('#5A2F78'))+P('M34 26L32 12L46 22Z','#F06BAE',0)+P('M86 26L88 12L74 22Z','#F06BAE',0)+E(60,46,32,27,G('#5A2F78'))+E(46,44,9,7,'#FFE27A',2.4)+E(74,44,9,7,'#FFE27A',2.4)+E(46,44,2.4,6,INK,0)+E(74,44,2.4,6,INK,0)+brow(35,34,52,40)+brow(85,34,68,40)+P('M56 54H64L60 59Z','#F06BAE',1.8)+L('M60 59V62M60 62Q55 66 50 62M60 62Q65 66 70 62',INK,2.2)+fang(52,63.5,6)+fang(68,63.5,6)+L('M26 50H12M28 56L14 60M94 50H108M92 56L106 60','#F7D7EE',1.8),
 stray_plug:()=>shadow()+R(40,6,9,26,2,G(GOLD))+R(71,6,9,26,2,G(GOLD))+LL('M60 84C60 102 40 100 40 110C40 118 72 118 90 110','#3A3A56',5)+R(24,26,72,60,22,G('#F4F0E6'))+R(24,70,72,12,0,'#D8D2C4',0)+angry(46,74,50,7.6)+snarl(60,66,11)+spark(106,40,7,GOLD)+spark(14,62,6,GOLD),
 hv_firefly:()=>C(60,76,30,'#FFE27A',0,'opacity=".38"')+T('rotate(-26 34 42)',E(34,42,15,25,'#DFF3FF',2.4,'opacity=".85"'))+T('rotate(26 86 42)',E(86,42,15,25,'#DFF3FF',2.4,'opacity=".85"'))+E(60,76,18,24,G(GOLD))+L('M44 70Q60 76 76 70M44 82Q60 88 76 82','#D9A92E',2.6)+C(60,36,17,G('#5A5A78'))+L('M52 22C50 12 44 8 38 8M68 22C70 12 76 8 82 8',INK,2.6)+C(38,8,3,G(GOLD),2)+C(82,8,3,G(GOLD),2)+eye(52,36,6)+eye(68,36,6)+L('M56 46Q60 49 64 46',INK,2.2),
 swollen_battery:()=>shadow()+R(46,8,28,18,3,G('#C9D2E6'))+P('M30 28Q60 18 90 28C104 54 104 84 90 104Q60 114 30 104C16 84 16 54 30 28Z',G(GOLD))+P('M26 94Q60 106 94 94Q92 100 90 104Q60 114 30 104Q28 100 26 94Z',G('#3A3550'),0)+P('M53 30H67V38H75V50H67V58H53V50H45V38H53Z','#2A1B3D',0)+worried(44,76,68,7.4)+L('M50 84Q55 80 60 84T70 84',INK,2.8)+L('M92 44L82 54L88 60L78 70','#7A5A1A',2.4)+spark(12,40,7,'#FFE27A')+spark(108,70,6,'#FFE27A'),
 faulty_sensor:()=>shadow()+L('M60 38V18',INK,3)+C(60,14,5,G(RED),2.4)+R(36,96,10,16,3,G('#4B4560'))+R(74,96,10,16,3,G('#4B4560'))+R(20,36,80,64,10,G('#7A87AC'))+C(60,62,23,G('#2A2E44'))+C(60,62,14,G(RED),2.4)+C(55,57,4.4,'#FFFFFF',0)+R(30,88,60,7,2,'#2A2E44',0)+R(6,50,16,5,1,'#2FD6E8',0)+R(98,72,18,5,1,'#F06BAE',0)+R(2,70,12,4,1,'#F06BAE',0)+R(104,44,12,4,1,'#2FD6E8',0)+TX(100,26,'?',20,GOLD),
 gas_balloon:()=>L('M60 92C50 100 70 106 60 118',INK,2.4)+C(60,50,40,G('#F8A838'))+P('M54 90H66L60 98Z',G('#D97F2A'),2.4)+E(42,28,9,5,'#FFFFFF',0,'opacity=".55" transform="rotate(-30 42 28)"')+angry(46,74,44,7.4)+TX(60,76,'GWEI',18,'#2A1B3D'),
 shock_coil:()=>shadow()+[92,76,60,44].map(y=>L(`M24 ${y}a36 11 0 1 0 72 0a36 11 0 1 0 -72 0`,INK,12)+L(`M24 ${y}a36 11 0 1 0 72 0a36 11 0 1 0 -72 0`,'#E0924A',6.4)).join('')+E(60,24,32,15,G(GOLD))+eye(50,22,6)+eye(70,22,6)+L('M54 32Q60 35 66 32',INK,2.4)+spark(14,38,7,'#FFE27A')+spark(108,58,7,'#FFE27A')+spark(10,88,5,'#FFE27A'),
 lost_goldfish:()=>P('M84 62C100 40 116 38 120 44C112 56 112 68 120 80C116 86 100 84 84 62Z',G('#F8A838'))+P('M46 34C52 18 70 16 78 24C70 28 66 34 64 40Z',G('#F8A838'))+E(52,62,42,31,G('#FF9A4D'))+P('M18 72C30 90 70 94 90 72C78 92 64 93 52 93C38 93 24 86 18 72Z','#FFE6CC',0)+L('M58 44Q66 52 58 60M72 46Q80 54 72 62M60 66Q68 74 60 82','#D9702A',2.4)+eye(32,54,11)+C(14,68,3.6,INK,0)+P('M52 76C60 72 68 78 66 90C58 92 50 86 52 76Z',G('#F8A838'),2.4)+C(8,34,6.4,'#BFEFFF',2.2)+C(20,16,4,'#BFEFFF',2)+C(4,14,2.6,'#BFEFFF',1.8),
 leaky_bottle:()=>R(38,6,44,76,10,G('#C8F2FA'))+P('M41 40Q60 34 79 40V74Q79 80 73 80H47Q41 80 41 74Z',G('#2FD6E8'),0)+R(44,82,32,13,3,G('#C9743F'))+R(55,95,10,13,2,G(STEEL),2.4)+P('M60 110C64 114 65 118 60 120C55 118 56 114 60 110Z',G('#2FD6E8'),1.8)+C(46,70,6,'#C9743F',0)+C(74,60,4,'#C9743F',0)+angry(50,70,34,6.8)+L('M52 52L56 49L60 52L64 49L68 52',INK,2.6),
 slimy_snail:()=>shadow()+P('M4 108C10 90 24 88 38 88H98C110 88 116 100 116 108Z',G('#A8EEDC'))+C(72,60,34,G('#2FB8C8'))+L('M72 60C78 52 88 60 82 70C74 80 58 74 58 60C58 44 74 36 90 46',INK,3)+L('M24 66L18 46M38 64L44 44',INK,3.4)+E(30,80,17,20,G('#A8EEDC'))+eye(18,42,6.6)+eye(45,40,6.6)+L('M24 88Q30 92 36 88',INK,2.4)+C(102,110,2.6,'#A8EEDC',0)+C(112,104,2,'#A8EEDC',0),
 slick_soap:()=>shadow()+blob([[44,32,10],[60,28,12],[76,32,10]],'#FFFFFF')+R(16,36,88,62,22,G('#F7C8E0'))+R(26,46,68,42,14,'#FBDCEC',0)+sly(44,76,62,7,G('#F06BAE'))+L('M50 78Q60 84 72 74',INK,2.8)+C(10,28,6.4,'#E8FAFF',2.2)+C(108,24,7.4,'#E8FAFF',2.2)+C(112,100,4.6,'#E8FAFF',2)+C(6,90,4,'#E8FAFF',2),
 damp_moss:()=>shadow()+L('M38 34V22M46 30L50 18M78 32V20M72 30L68 18','#25875A',3)+blob([[60,68,36],[28,78,23],[92,78,23],[44,48,18],[76,48,18],[60,90,24]],'#3FB48A')+C(36,62,6,'#6FE0A8',0)+C(86,70,7,'#6FE0A8',0)+C(62,92,5,'#6FE0A8',0)+L('M44 66Q50 72 56 66',INK,3.2)+L('M64 66Q70 72 76 66',INK,3.2)+L('M54 80Q60 84 66 80',INK,2.6)+P('M90 96C93 100 94 106 90 108C86 106 87 100 90 96Z',G('#7FC4F0'),1.8),
 whale:()=>P('M6 66C6 40 34 24 62 24C90 24 106 44 106 66C106 94 78 106 50 104C22 102 6 90 6 66Z',G('#3FB4E8'))+P('M100 56C108 44 118 36 120 42C120 54 116 62 106 68Z',G('#3FB4E8'))+P('M9 78C26 92 62 98 100 82C90 98 72 104 50 104C28 102 14 94 9 78Z','#EAF8FF',0)+L('M22 84L30 92M38 90L42 98M56 92L58 100M74 90L72 98',  '#A8D8EE',2.4)+eye(30,54,7.6)+brow(21,44,38,48)+L('M12 74Q30 84 50 78',INK,2.8)+P('M56 80C66 78 74 84 72 96C62 96 54 90 56 80Z',G('#2F93C8'))+L('M62 22C60 14 56 12 50 12M62 22C64 14 68 12 74 12M62 22V8','#7FC4F0',3)+C(48,12,2.6,'#BFEFFF',0)+C(76,12,2.6,'#BFEFFF',0)+C(62,5,2.6,'#BFEFFF',0),
 biting_gear:()=>shadow()+[0,45,90,135,180,225,270,315].map(a=>T(`rotate(${a} 60 60)`,R(49,6,22,20,4,G('#A8BAFF')))).join('')+C(60,60,40,G('#A8BAFF'))+C(60,60,30,G('#8797D8'),2.4)+angry(49,71,54,8)+R(44,70,32,12,3,'#FFFFFF',2.4)+L('M52 70V82M60 70V82M68 70V82',INK,2),
 clothespin:()=>shadow()+P('M26 6L52 56L46 112H32L38 62L12 12Z',G('#D9A46B'))+P('M94 6L68 56L74 112H88L82 62L108 12Z',G('#D9A46B'))+C(60,58,15,G(STEEL))+L('M50 50Q60 58 70 50M50 58Q60 66 70 58M50 66Q60 72 70 66','#7A7A92',2.2)+eye(30,28,7.4)+eye(90,28,7.4)+brow(22,18,38,24)+brow(98,18,82,24)+L('M36 94H44M76 94H84',INK,2.4),
 sniper_bot:()=>shadow()+R(40,78,40,26,8,G('#8797D8'))+R(42,102,12,10,3,G('#4B4560'))+R(66,102,12,10,3,G('#4B4560'))+R(24,26,72,54,15,G('#A8BAFF'))+R(32,38,56,26,12,INK,0)+C(46,51,7,RED,0)+C(74,51,10,'none',0,`stroke="${RED}" stroke-width="2.6"`)+C(74,51,3,RED,0)+L('M74 37V43M74 59V65M60 51H66M82 51H88',RED,2.2)+L('M60 26V12',INK,3)+C(60,10,4.4,G(GOLD),2.2)+R(92,30,26,10,3,G('#3A3A56'))+R(40,70,40,5,2,'#6B7AB8',0),
 walking_cage:()=>shadow()+R(30,102,14,10,3,G('#4B4560'))+R(76,102,14,10,3,G('#4B4560'))+P('M20 104V44C20 14 100 14 100 44V104Z','#3A2F5E',3)+eye(46,60,8)+eye(74,60,8)+brow(36,48,54,54)+brow(84,48,66,54)+snarl(60,80,13)+[32,46,60,74,88].map(x=>L(`M${x} 24V102`,INK,6.4)+L(`M${x} 24V102`,'#C4CEE4',3)).join('')+L('M22 40H98',INK,6.4)+L('M22 40H98','#C4CEE4',3)+R(14,98,92,12,4,G('#A8BAFF'))+C(60,12,7,'none',0,`stroke="${INK}" stroke-width="7"`)+C(60,12,7,'none',0,`stroke="#C4CEE4" stroke-width="3.4"`),
 robot_vacuum:()=>shadow()+L('M12 104L0 112M14 96L0 96M108 104L120 112M106 96L120 96',INK,3.4)+E(60,78,50,28,G('#6E7EBC'))+E(60,66,48,27,G('#A8BAFF'))+E(60,52,13,6.6,G(RED))+angry(40,80,70,8)+R(50,82,20,6,2,INK,0)+C(16,62,2.4,'#C9C5D8',0)+C(106,58,3,'#C9C5D8',0),
 fake_contract:()=>shadow()+R(26,14,68,92,4,G('#FFF6E0'))+R(16,6,88,16,8,G('#E8D2A0'))+R(16,98,88,16,8,G('#E8D2A0'))+sly(46,74,42,7,'#E8D2A0')+L('M50 56Q60 64 72 52',INK,2.8)+L('M36 68H84M36 76H72','#C9BC9C',2.6)+T('rotate(-10 60 88)',R(38,80,44,14,3,'none',0,`stroke="${RED}" stroke-width="2.4"`)+TX(60,91,'APPROVE',9,RED))+C(90,88,8,G(RED),2.4),
};
/* BOSS */
const BA={
 alarm_clock:()=>shadow()+LL('M36 104L22 116M84 104L98 116','#7A1F3D',5)+L('M60 22V10',INK,4)+C(60,8,5,G(GOLD),2.4)+C(28,26,20,G(GOLD))+C(92,26,20,G(GOLD))+E(24,20,6,3.6,'#FFFFFF',0,'opacity=".6"')+E(88,20,6,3.6,'#FFFFFF',0,'opacity=".6"')+C(60,66,45,G('#F0506E'))+C(60,66,34,G('#FFF6E0'))+TX(60,42,'12',10,INK)+TX(88,70,'3',10,INK)+TX(60,96,'6',10,INK)+TX(32,70,'9',10,INK)+angry(47,73,60,7.6)+snarl(60,76,13,10),
 thief_squirrel:()=>shadow()+P('M78 100C118 98 124 50 98 18C94 38 80 44 70 58Z',G('#C9743F'))+P('M84 88C106 82 110 54 98 34C94 48 84 54 78 64Z',G('#E8A06A'),0)+P('M34 110C26 86 36 66 60 66C84 66 92 86 84 110Q60 118 34 110Z',G('#C9743F'))+E(60,92,16,14,'#FFE6CC',0)+P('M36 24L30 4L48 16Z',G('#C9743F'))+P('M76 24L82 4L64 16Z',G('#C9743F'))+C(56,42,28,G('#D98A4E'))+P('M28 36Q56 26 84 36Q86 54 70 52Q60 44 50 52Q30 54 28 36Z',INK,0)+eye(43,42,6.4)+eye(69,42,6.4)+E(56,56,4,3,INK,0)+L('M56 59V62',INK,2.2)+R(52,62,8,7,2,'#FFFFFF',1.8)+P('M4 110C-2 88 8 74 24 74C40 74 48 88 42 110Q24 118 4 110Z',G('#E8D2A0'))+L('M14 78Q24 84 34 78',INK,2.6)+TX(23,102,'$',20,'#8A5A3A'),
 broken_faucet:()=>R(44,2,32,9,4,G(RED))+R(55,9,10,14,2,G(STEEL))+R(2,24,40,24,5,G('#C4CEE4'))+P('M36 20H84C100 20 112 36 112 54V68H84V56C84 52 80 48 76 48H36Z',G('#E0E6F4'))+R(80,62,36,12,3,G('#B4BED6'))+angry(52,72,32,7)+L('M50 46L55 43L62 46L69 43L74 46',INK,2.6)+P('M84 74H112C114 88 106 102 116 120H72C86 102 82 88 84 74Z',G('#2FD6E8'))+L('M92 80C90 92 94 102 88 112M104 82C106 94 102 104 106 114','#BFEFFF',2.4)+C(64,108,3.4,G('#2FD6E8'),1.8)+C(56,98,2.4,G('#2FD6E8'),1.6),
 overloaded_charger:()=>shadow()+R(40,4,9,22,2,G(GOLD))+R(71,4,9,22,2,G(GOLD))+LL('M60 96C60 108 84 104 92 112','#3A3A56',5)+R(18,22,84,74,14,G('#3A3A56'))+R(26,30,68,6,3,'#55556A',0)+E(42,50,11,7,RED,2.4)+E(78,50,11,7,RED,2.4)+E(42,50,3,6,INK,0)+E(78,50,3,6,INK,0)+brow(28,38,52,44)+brow(92,38,68,44)+R(34,68,52,16,4,'#1E1A2B',2.4)+L('M42 68V84M52 68V84M62 68V84M72 68V84',GOLD,2.6)+C(92,86,3.4,'#35D07F',0)+P('M112 18L100 40H108L102 60L120 32H110L116 18Z',G(GOLD),2.2)+P('M12 44L2 62H9L4 78L18 56H10L15 44Z',G(GOLD),2.2),
 neighbor_cat:()=>shadow()+P('M12 116C8 84 26 64 60 64C94 64 112 84 108 116Z',G('#F2923C'))+E(60,98,24,18,'#FFF1DC',0)+P('M24 28L18-2L52 18Z',G('#F8A64E'))+P('M96 28L102-2L68 18Z',G('#F8A64E'))+P('M28 20L24 6L42 16Z','#F59DB5',0)+P('M92 20L96 6L78 16Z','#F59DB5',0)+E(60,44,44,34,G('#F8A64E'))+L('M60 10V24M48 12L50 24M72 12L70 24M20 40L32 42M18 52L30 52M100 40L88 42M102 52L90 52','#C9651E',3.4)+E(40,42,12,10,'#FFE27A',2.6)+E(80,42,12,10,'#FFE27A',2.6)+E(40,42,3,9,INK,0)+E(80,42,3,9,INK,0)+brow(26,28,50,36,4)+brow(94,28,70,36,4)+P('M55 56H65L60 62Z','#F06BAE',2)+L('M60 62V65M60 65Q54 70 47 65M60 65Q66 70 73 65',INK,2.6)+fang(50,66,7)+fang(70,66,7)+L('M12 54H-2M14 62L0 66M108 54H122M106 62L120 66','#FFFFFF',2)+E(28,110,16,10,G('#FFF1DC'))+E(92,110,16,10,G('#FFF1DC'))+L('M20 112V117M28 113V118M36 112V117M84 112V117M92 113V118M100 112V117',INK,2.2),
 giant_vacuum:()=>shadow()+C(46,102,11,G('#3A3A56'))+C(104,102,11,G('#3A3A56'))+LL('M40 62C8 60-2 84 8 100','#3A3A56',9)+E(74,64,44,40,G(RED))+E(74,34,28,13,G('#FF8A9C'))+R(66,16,16,12,3,G('#55556A'))+angry(60,90,60,9)+R(56,78,36,12,3,'#1E1A2B',2.4)+L('M64 78V90M74 78V90M84 78V90','#C4CEE4',2.2)+P('M-4 98H30L24 116H2Z',G(STEEL))+L('M4 110H20',INK,2.4)+C(-2,88,2.4,'#C9C5D8',0)+C(30,92,2,'#C9C5D8',0),
 rug_puller:()=>P('M-4 92H124V112H-4Z',G('#C93B5A'))+L('M4 98H116M4 106H116',GOLD,2.4)+L('M-2 112V118M10 112V118M22 112V118M34 112V118M46 112V118M58 112V118M70 112V118M82 112V118M94 112V118M106 112V118M118 112V118','#F6ECCF',2.4)+P('M30 100C26 70 40 50 60 50C80 50 94 70 90 100Z',G('#4A2A63'))+P('M52 54L60 72L68 54Z',G('#FFFFFF'),2)+C(60,38,23,G('#F5DDB4'))+R(38,-2,44,32,3,G('#2A1B3D'))+R(38,20,44,8,0,G(GOLD),2.2)+E(60,28,34,6,G('#2A1B3D'))+sly(50,70,38,6,G('#F5DDB4'))+C(70,39,9,'none',2.2)+P('M42 50C50 44 56 50 60 48C64 50 70 44 78 50C72 56 64 54 60 52C56 54 48 56 42 50Z',INK,0)+L('M50 56Q60 62 70 54',INK,2.4)+E(96,70,9,8,G('#F5DDB4'))+C(108,56,12,G(GOLD))+TX(108,61,'$',14,'#8A5A1A')+TX(18,64,'+1000%',11,'#1F9E5C')+E(24,86,9,8,G('#F5DDB4'))+LL('M24 86L14 96',  '#C93B5A',3),
 dumping_whale:()=>[[92,34,10,18],[104,44,10,22],[116,60,8,26]].map(([x,y,w,h])=>L(`M${x+w/2} ${y-6}V${y+h+6}`,RED,2.4)+R(x,y,w,h,1.5,RED,2)).join('')+P('M0 66C0 36 30 22 58 22C86 22 102 42 102 66C102 96 74 110 44 108C16 106 0 92 0 66Z',G('#3FB4E8'))+P('M96 58C106 48 110 74 104 82Z',G('#3FB4E8'))+P('M3 78C20 94 58 102 96 84C86 102 66 110 44 108C22 106 8 96 3 78Z','#EAF8FF',0)+L('M16 86L24 96M32 94L36 102M50 96L52 106M68 94L66 102','#A8D8EE',2.6)+eye(26,54,8.4)+brow(15,42,35,48,4.2)+L('M8 74Q26 84 46 78',INK,3)+fang(18,78,7)+fang(34,80,7)+P('M18 26L14 6L28 16L36 0L44 16L58 6L54 26Q36 32 18 26Z',G(GOLD))+C(36,20,3.6,G(RED),2)+P('M54 84C66 82 74 88 72 102C60 102 50 96 54 84Z',G('#2F93C8')),
 reorg_ghost:()=>P('M18 112V50C18 14 102 14 102 50V112L88 98L74 112L60 98L46 112L32 98Z',G('#D8E4FF'))+E(42,50,10,13,INK,0)+E(78,50,10,13,INK,0)+C(40,46,3,'#FFE27A',0)+C(76,46,3,'#FFE27A',0)+E(60,78,9,12,'#3A2F5E',2.4)+L('M2 28H14M2 28V40',GOLD,2.6)+R(-4,10,18,18,3,G(GOLD))+R(106,8,18,18,3,G('#A8BAFF'))+R(110,44,16,16,3,G(GOLD),2.6)+R(-8,50,16,16,3,G('#A8BAFF'),2.6)+L('M14 19H22M106 17H96M118 26V44M0 28V50',INK,3,'stroke-dasharray="3 4"')+P('M88 2L78 18H85L80 32L96 12H87L92 2Z',G(GOLD),2),
 cage_hand:()=>shadow()+R(34,96,52,20,5,G('#3FA66A'))+L('M34 104H86',  '#25875A',2.6)+P('M100 62C114 54 122 62 116 72C110 80 100 84 92 88Z',G('#FFD9B8'))+R(28,10,15,48,7.5,G('#FFD9B8'))+R(45,2,15,56,7.5,G('#FFD9B8'))+R(62,4,15,54,7.5,G('#FFD9B8'))+R(79,14,14,46,7,G('#FFD9B8'))+R(26,46,70,56,20,G('#FFD9B8'))+angry(46,76,68,8.4)+snarl(61,84,14,10)+C(35,8,3,'#F2EEE8',0)+C(52,-1,3,'#F2EEE8',0)+C(69,1,3,'#F2EEE8',0)+C(86,12,3,'#F2EEE8',0),
};
Object.entries(MA).forEach(([id,f])=>reg('mon_'+id,f,'-6 -6 132 132'));
Object.entries(BA).forEach(([id,f])=>reg('boss_'+id,f,'-10 -8 140 136'));
/* CHESTS, BAG, ELEMENT AND ROLE ICONS */
const chest=(c,band,gem,rays)=>(rays?[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>T(`rotate(${a} 60 62)`,P('M60 62L55 2L65 2Z',gem,0,'opacity=".4"'))).join(''):'')+E(60,112,46,6,INK,0,'opacity=".18"')+R(16,58,88,50,8,G(c))+P('M16 60C16 26 104 26 104 60Z',G(mix(c,'#FFFFFF',.12)))+R(28,34,12,74,3,G(band),2.6)+R(80,34,12,74,3,G(band),2.6)+R(16,56,88,9,3,G(band),2.6)+R(49,52,22,26,5,G(band))+C(60,63,6,G(gem),2.4)+R(58,66,4,8,1,INK,0)+(rays?spark(24,22,7)+spark(100,26,6):'');
reg('chest_1',()=>chest('#A9744F','#7A4A2E','#C9743F',0));
reg('chest_2',()=>chest('#C9743F','#E8A06A','#F2C14E',0));
reg('chest_3',()=>chest('#8A96B0','#D5DCEC','#5B9DFA',0));
reg('chest_4',()=>chest('#D9A92E','#FFE27A','#F0506E',1));
reg('chest_5',()=>chest('#3A8FD8','#BFEFFF','#F06BAE',1));
/* drawn in client/rig-art.js, listed here so the baker knows them */
reg('chest_sqk',()=>chest('#2A1758','#FF7AD9','#5BE7FF',1));
reg('pouch_sqk',()=>chest('#4A2C9C','#FFCB4F','#5BE7FF',0));
reg('bag',()=>shadow()+C(34,28,11,G('#C9743F'))+C(34,28,5.5,'#F59DB5',0)+C(86,28,11,G('#C9743F'))+C(86,28,5.5,'#F59DB5',0)+P('M38 30C14 60 16 110 60 110C104 110 106 60 82 30Q60 22 38 30Z',G('#D98A4E'))+P('M34 34Q60 26 86 34L84 44Q60 36 36 44Z',G(RED),2.4)+C(60,40,6,G(GOLD),2.2)+TX(60,92,'?',44,'#FFF6E0',`stroke="${INK}" stroke-width="2"`)+spark(100,20,6,GOLD)+spark(16,52,4.6,GOLD));
/* FOOD */
const fsh=()=>E(60,111,40,5,INK,0,'opacity=".16"');
const spade=c=>L('M60 108V70',mix(c,'#FFFFFF',.35),4.5)+P('M60 76C34 76 24 52 36 34C44 22 56 16 60 10C64 16 76 22 84 34C96 52 86 76 60 76Z',G(c))+L('M60 70V22M60 54L46 44M60 54L74 44M60 38L50 30M60 38L70 30',mix(c,'#FFFFFF',.45),2);
const sageLeaf=c=>P('M60 78C38 66 40 26 60 8C80 26 82 66 60 78Z',G(c))+L('M60 70V18M60 56L50 46M60 56L70 46M60 40L52 32M60 40L68 32','#E2EFE0',1.8);
const fan=()=>P('M60 62C44 58 38 46 42 38L48 42L50 30L56 38L60 24L64 38L70 30L72 42L78 38C82 46 76 58 60 62Z',G('#66BB6A'));
const spear=(x,r)=>T(`rotate(${r} ${x} 108)`,P(`M${x-6} 108L${x-5} 34C${x-6} 20 ${x-2} 12 ${x} 8C${x+2} 12 ${x+6} 20 ${x+5} 34L${x+6} 108Z`,G('#6FBF4A'))+L(`M${x-5} 30L${x} 38L${x+5} 30M${x-5} 48L${x} 56L${x+5} 48M${x-5} 68L${x} 76L${x+5} 68`,'#3E8E2F',2));
const pod=t=>T(t,P('M12 66C30 40 78 34 108 52C84 58 40 70 22 84C16 84 10 74 12 66Z',G('#4CAF50'))+L('M22 72C40 56 70 50 96 52','#A5E8A5',2)+C(38,62,4,'#8BD86B',1.6)+C(56,56,4,'#8BD86B',1.6)+C(74,52,4,'#8BD86B',1.6));
const root=(c,line,top)=>P('M60 112C48 92 34 62 38 44C44 34 76 34 82 44C86 62 72 92 60 112Z',G(c))+L('M44 54L56 56M76 66L64 68M48 74L58 76',line,2.4)+P('M60 40C52 28 42 24 34 8C48 12 56 20 60 30C62 18 66 10 74 4C74 16 70 30 64 40Z',G(top));
const berry=(x,y,r)=>C(x,y,r,G('#3F5FBF'))+C(x-r*.05,y-r*.5,r*.3,'#27377A',1.6)+C(x-r*.4,y+r*.05,r*.13,'#AFC0F5',0);
const fruitLeaf=(x,y)=>L(`M${x} ${y}Q${x} ${y-8} ${x+6} ${y-12}`,'#6B4A2E',4)+P(`M${x+6} ${y-6}C${x+14} ${y-14} ${x+28} ${y-12} ${x+32} ${y-6}C${x+24} ${y+2} ${x+12} ${y+2} ${x+6} ${y-6}Z`,G('#4CAF50'),2.2);
const seedAt=(x,y,r,c,c2)=>T(`translate(${x} ${y}) rotate(${r})`,P('M0-27C16-14 18 12 0 27C-18 12-16-14 0-27Z',G(c))+c2);
const shine=()=>spark(100,22,7,GOLD)+spark(20,34,5,GOLD);
const FD={
  romaine:()=>P('M60 8C84 22 92 62 78 94C72 106 66 110 60 110C54 110 48 106 42 94C28 62 36 22 60 8Z',G('#6CC24A'))+L('M60 20V104M60 44L46 34M60 44L74 34M60 62L42 50M60 62L78 50M60 80L46 70M60 80L74 70','#D8F0B0',2.6),
  cucumber:()=>C(60,60,44,G('#3E9B4F'))+C(60,60,35,G('#DDF3B4'),2.4)+C(60,60,15,'#C2E490',0)+[0,60,120,180,240,300].map(a=>T(`rotate(${a} 60 60)`,E(60,38,3.2,6,'#F7FFE0',1.6))).join(''),
  cress:()=>[[30,52],[44,38],[60,30],[76,38],[90,52],[50,60],[70,60]].map(([x,y])=>L(`M60 106Q${(60+x)/2} ${(106+y)/2+10} ${x} ${y}`,'#8BC34A',3)+E(x-6,y-2,7.5,5,G('#7CCB45'),1.8)+E(x+6,y-2,7.5,5,G('#7CCB45'),1.8)).join(''),
  parsley:()=>L('M60 108V64M60 80L36 60M60 80L84 60','#5FAE3A',4)+blob([[60,36,14],[46,28,11],[74,28,11],[60,18,11],[48,44,10],[72,44,10]],'#4CAF50')+blob([[30,56,12],[20,46,9],[38,44,9]],'#5CBF50')+blob([[90,56,12],[100,46,9],[82,44,9]],'#5CBF50'),
  basil:()=>L('M60 108V70','#5FAE3A',4)+P('M60 72C28 72 16 48 24 22C48 18 68 38 60 72Z',G('#3FA34D'))+L('M58 66Q46 46 30 28','#8FD68F',2.2)+P('M60 72C92 72 104 52 96 30C74 26 56 42 60 72Z',G('#4DB85C'))+L('M62 66Q74 50 90 36','#A5E8A5',2.2),
  coriander:()=>L('M60 108V60M60 88L30 70M60 88L90 70','#7CB342',3.4)+fan()+T('translate(-30 26) rotate(-24 60 40) scale(.9)',fan())+T('translate(30 26) rotate(24 60 40) scale(.9)',fan()),
  sage:()=>L('M60 108V76','#7F9C6B',4)+T('rotate(-30 60 76)',sageLeaf('#8FAE99'))+T('rotate(30 60 76)',sageLeaf('#9CBBA6')),
  chicory:()=>P('M60 108C36 100 32 58 48 18C54 36 56 44 60 58C64 44 66 36 72 18C88 58 84 100 60 108Z',G('#F4EFA8'))+P('M60 108C48 96 46 60 60 12C74 60 72 96 60 108Z',G('#FFFBD6'))+L('M60 34V100','#C7D67A',2)+P('M60 12C54 20 52 28 52 34L68 34C68 28 66 20 60 12Z',G('#C6E06A'),2)+P('M48 18C44 28 42 34 42 40L52 36Z',G('#B5D65C'),2)+P('M72 18C76 28 78 34 78 40L68 36Z',G('#B5D65C'),2),
  dandelion:()=>P('M52 108L44 92L30 94L38 78L22 76L36 62L24 52L44 52L44 34L58 62Z',G('#5DAE47'))+P('M68 108L76 92L90 94L82 78L98 76L84 62L96 52L76 52L76 34L62 62Z',G('#69BC4F'))+L('M60 108V46','#5FAE3A',3.6)+[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>T(`rotate(${a} 60 28)`,E(60,12,4.5,10,G('#FFD93D'),1.6))).join('')+C(60,28,8,G('#F5B91F'),2),
  spinach:()=>T('rotate(-26 60 104)',spade('#2E8B57'))+T('rotate(26 60 104)',spade('#2E8B57'))+spade('#37A168'),
  kale:()=>L('M60 110V40','#A5D6A7',5)+blob([[60,24,13],[42,30,13],[78,30,13],[30,46,13],[90,46,13],[36,64,13],[84,64,13],[48,80,12],[72,80,12],[60,46,22],[60,66,18]],'#2E7D32')+L('M60 96V30M60 72L42 56M60 72L78 56M60 52L46 38M60 52L74 38','#A5D6A7',3),
  cabbage:()=>C(60,60,46,G('#A5D86A'))+P('M60 14C36 30 30 62 44 102C20 92 12 66 18 44C24 28 40 16 60 14Z',G('#8CCB52'),2.4)+P('M60 14C84 30 90 62 76 102C100 92 108 66 102 44C96 28 80 16 60 14Z',G('#8CCB52'),2.4)+L('M60 30C54 52 54 80 60 104M60 44L50 34M60 44L70 34M60 64L49 54M60 64L71 54','#E6F7C2',2.4),
  zucchini:()=>T('rotate(-30 60 60)',R(8,36,92,36,18,G('#3C8D40'))+L('M20 46H88M20 54H92M20 62H88','#7CC87A',2)+R(2,48,8,12,3,G('#C7A35E'),2))+C(86,86,20,G('#3C8D40'))+C(86,86,15,G('#F3F7C2'),2)+[0,90,180,270].map(a=>T(`rotate(${a} 86 86)`,E(86,78,1.8,3.4,'#D6DC8E',0))).join(''),
  hay:()=>[-36,-24,-12,0,12,24,36].map(a=>T(`rotate(${a} 60 62)`,L('M60 108V14',INK,6.5)+L('M60 108V14','#F2D56B',3))).join('')+R(34,54,52,16,5,G('#C0392B'),2.6),
  pepper:()=>P('M60 28C40 18 18 30 20 62C22 92 38 110 52 106C56 105 58 102 60 102C62 102 64 105 68 106C82 110 98 92 100 62C102 30 80 18 60 28Z',G('#E8432E'))+L('M44 40C38 56 38 80 46 96M76 40C82 56 82 80 74 96','#B52A1A',2.4)+P('M52 28C52 20 56 16 56 8L66 8C66 16 68 22 68 28Q60 34 52 28Z',G('#4CAF50')),
  asparagus:()=>spear(38,-12)+spear(82,12)+spear(60,0),
  beans:()=>pod('translate(0 -22)')+pod('translate(-2 22) rotate(-4 60 60)')+pod('rotate(6 60 60)'),
  cauliflower:()=>P('M40 70L46 108H74L80 70Z',G('#C8E6A0'))+L('M60 74V104M50 76L54 104M70 76L66 104','#9BC46E',2.2)+blob([[60,40,22],[36,48,17],[84,48,17],[46,26,15],[74,26,15],[60,60,18],[28,64,12],[92,64,12]],'#FFF9E8'),
  broccoli:()=>P('M46 64L50 108H70L74 64Z',G('#9CCC65'))+L('M60 70V104','#7CB342',2.2)+blob([[60,38,22],[36,46,17],[84,46,17],[46,24,15],[74,24,15],[60,58,16],[28,60,11],[92,60,11]],'#2E8B3D'),
  sprout:()=>C(60,62,42,G('#8BC34A'))+P('M60 20C38 30 30 60 42 100C26 92 18 72 22 52C26 36 42 22 60 20Z',G('#689F38'),2.2)+P('M60 20C82 30 90 60 78 100C94 92 102 72 98 52C94 36 78 22 60 20Z',G('#689F38'),2.2)+P('M60 30C48 44 48 74 60 98C72 74 72 44 60 30Z',G('#C5E17A'),2.2),
  peas:()=>P('M8 44C30 100 90 100 112 44C92 64 28 64 8 44Z',G('#4FA153'))+P('M14 46C34 64 86 64 106 46C92 32 28 32 14 46Z',G('#A5D6A7'),2.4)+[26,47,68,90].map(x=>C(x,50,10.5,G('#7CCB45'),2.2)).join(''),
  carrot:()=>root('#F5891F','#C25F0C','#4CAF50'),
  parsnip:()=>root('#F3E3B5','#C9B27A','#7CB342'),
  sweetpotato:()=>T('rotate(-18 60 60)',P('M8 60C12 34 40 28 62 30C88 32 112 44 112 60C112 78 88 88 62 90C40 92 12 86 8 60Z',G('#9C4F5B'))+E(84,60,26,27,G('#F79A3E'),2.6)+E(84,60,15,16,'#FFB864',0))+L('M24 54L38 50M26 70L40 72','#6E2E3A',2.4),
  watermelon:()=>P('M8 42C12 84 40 108 60 108C80 108 108 84 112 42Z',G('#3E9B4F'))+P('M17 42C21 78 44 99 60 99C76 99 99 78 103 42Z','#F7FFE0',0)+P('M24 42C28 72 46 90 60 90C74 90 92 72 96 42Z',G('#F0506E'),2.4),
  cantaloupe:()=>P('M6 50C10 90 40 108 60 108C80 108 110 90 114 50C96 78 24 78 6 50Z',G('#D9C48A'))+P('M16 56C24 86 44 97 60 97C76 97 96 86 104 56C88 74 32 74 16 56Z',G('#FFB35C'),2.4)+L('M16 66L30 88M34 96L52 76M46 104L70 78M72 104L90 82M90 96L102 72','#A88F52',1.8),
  strawberry:()=>P('M60 108C34 96 16 66 24 44C30 30 48 28 60 34C72 28 90 30 96 44C104 66 86 96 60 108Z',G('#EE3B4B'))+[[42,54],[60,50],[78,54],[50,70],[70,70],[60,86]].map(([x,y])=>E(x,y,2.4,3.6,'#FFE27A',1.2)).join('')+P('M60 36C52 42 40 44 34 38C40 34 44 28 44 24C50 28 54 26 60 14C66 26 70 28 76 24C76 28 80 34 86 38C80 44 68 42 60 36Z',G('#4CAF50')),
  blueberry:()=>berry(38,76,24)+berry(82,76,24)+berry(60,40,26),
  blackberry:()=>L('M60 34Q60 18 70 8','#6B4A2E',4)+blob([[60,94,10],[46,84,11],[74,84,11],[60,74,11],[36,68,11],[84,68,11],[50,60,11],[70,60,11],[60,46,11],[42,48,10],[78,48,10]],'#3B2A63')+[[46,84],[74,84],[60,74],[36,68],[84,68],[50,60],[70,60],[60,46],[42,48],[78,48]].map(([x,y])=>C(x-3,y-3,2.2,'#8E7FC2',0)).join('')+P('M60 40C52 42 44 38 42 32C50 32 54 30 60 26C66 30 70 32 78 32C76 38 68 42 60 40Z',G('#4CAF50'),2.2),
  apple:()=>fruitLeaf(60,18)+P('M60 18C34 8 12 28 14 58C16 90 36 114 60 106C84 114 104 90 106 58C108 28 86 8 60 18Z',G('#E53935'))+P('M60 28C40 20 22 36 24 60C26 86 42 104 60 96C78 104 94 86 96 60C98 36 80 20 60 28Z',G('#FFF4D6'),2.2)+E(60,60,9,15,'#F2E6A8',1.6),
  pear:()=>fruitLeaf(60,20)+P('M60 18C48 18 44 30 42 44C38 60 22 66 22 84C22 102 42 110 60 110C78 110 98 102 98 84C98 66 82 60 78 44C76 30 72 18 60 18Z',G('#C5D94A'))+[[44,84],[60,96],[78,82],[62,62]].map(([x,y])=>C(x,y,1.8,'#8FA026',0)).join(''),
  peach:()=>fruitLeaf(60,24)+P('M60 24C32 12 12 40 16 66C20 94 42 108 60 106C78 108 100 94 104 66C108 40 88 12 60 24Z',G('#FFA26B'))+L('M60 26C50 46 50 78 60 104','#E8743B',2.6)+E(84,62,12,18,'#F4664A',0,'opacity=".35"'),
  mango:()=>fruitLeaf(44,20)+T('rotate(-24 60 62)',E(60,62,34,47,G('#FFB02E'))+E(46,44,14,20,'#F0506E',0,'opacity=".4"')),
  banana:()=>P('M26 12C18 50 44 94 102 90C110 90 112 82 106 78C72 76 50 52 42 12C40 4 28 4 26 12Z',G('#FFD93D'))+L('M34 18C38 48 60 74 98 84','#D9A92E',2)+R(26,4,14,10,3,G('#6B4A2E'),2)+C(34,92,16,G('#FFF3B0'))+C(34,92,5,'#E8D27A',0),
  oats:()=>E(60,52,46,14,G('#E8D5A3'))+[[36,48,-20],[52,42,14],[70,44,-10],[86,50,22],[46,56,6],[64,56,-16],[78,58,8]].map(([x,y,r])=>T(`rotate(${r} ${x} ${y})`,E(x,y,8,4.6,G('#F6E9C4'),1.6))).join('')+P('M14 54C16 90 38 108 60 108C82 108 104 90 106 54Q60 72 14 54Z',G('#7FB3D5')),
  millet:()=>L('M74 112C66 84 60 50 54 12',INK,6)+L('M74 112C66 84 60 50 54 12','#D9B84A',3)+[[58,20],[52,28],[63,30],[53,40],[66,40],[56,50],[68,50],[58,60],[71,60],[60,70],[73,70],[63,80],[53,62],[50,50],[47,38]].map(([x,y])=>C(x,y,5.6,G('#F2D56B'),1.6)).join(''),
  block:()=>P('M16 46L60 24L104 46V84L60 106L16 84Z',G('#C9995A'))+P('M16 46L60 68L104 46L60 24Z',G('#E5BE82'),2.4)+L('M60 68V106',INK,2.4)+[[36,46],[56,36],[76,44],[60,56],[30,70],[42,84],[78,76],[92,66]].map(([x,y])=>C(x,y,2.2,'#7A5428',0)).join('')+shine(),
  pumpkinseed:()=>seedAt(38,66,-24,'#8FBF5A',L('M0-18V18','#C8E69A',2))+seedAt(82,66,24,'#8FBF5A',L('M0-18V18','#C8E69A',2))+seedAt(60,52,0,'#A5D06A',L('M0-18V18','#D8F0B0',2))+shine(),
  sunflower:()=>[[38,66,-24],[82,66,24],[60,52,0]].map(([x,y,r])=>seedAt(x,y,r,'#3A3550',L('M-6-13V13M0-20V20M6-13V13','#F4F0E6',2))).join('')+shine(),
  tofu:()=>P('M18 50L60 28L102 50V86L60 106L18 86Z',G('#FFF2CF'))+P('M18 50L60 72L102 50L60 28Z',G('#FFFBEC'),2.4)+L('M60 72V106',INK,2.4)+shine(),
  mealworm:()=>[[20,88],[30,76],[42,67],[56,62],[70,60],[83,54],[92,42]].map(([x,y],i)=>C(x,y,11.5-(i===0?2.5:0),G('#D9962E'),2.4)).join('')+C(89,39,2.4,INK,0)+C(97,41,2.4,INK,0)+shine(),
  egg:()=>P('M60 12C34 12 18 48 18 70C18 94 38 108 60 108C82 108 102 94 102 70C102 48 86 12 60 12Z',G('#FFFDF5'))+C(60,72,23,G('#FFC83D'),2.4)+C(53,65,5,'#FFE9A6',0)+shine(),
  chicken:()=>P('M12 68C12 42 44 28 72 32C96 36 112 52 108 70C104 88 78 98 52 96C30 94 12 86 12 68Z',G('#F3D9AE'))+L('M28 66C44 54 70 50 94 58M30 78C46 68 70 64 92 70M40 48C54 42 70 42 84 46','#D9B27A',2.4)+shine(),
};
Object.entries(FD).forEach(([id,f])=>reg('food_'+id,()=>fsh()+f()));
reg('fbag_snack',()=>shadow()+T('translate(24 -6) rotate(-14 30 40) scale(.52)',FD.carrot())+T('translate(50 -8) rotate(16 30 40) scale(.5)',FD.broccoli())+P('M26 36L94 36L100 110H20Z',G('#C9A26B'))+P('M26 36L38 46H82L94 36Z',G('#A8824A'),2.4)+P('M60 94C42 80 46 64 60 74C74 64 78 80 60 94Z',G(RED),2.6));
reg('fbag_picnic',()=>shadow()+L('M28 58C28 6 92 6 92 58',INK,11)+L('M28 58C28 6 92 6 92 58','#C9743F',6)+T('translate(34 8) scale(.42)',FD.apple())+P('M14 56H106L96 110H24Z',G('#C9874A'))+L('M20 70H100M22 84H98M24 98H96M38 60L42 108M60 60V108M82 60L78 108','#8A5A2E',2.4)+R(8,46,104,16,5,G(RED))+[18,38,58,78,98].map(x=>R(x-5,46,10,16,0,'#FFF6E5',0,'opacity=".85"')).join('')+R(8,46,104,16,5,'none',3));
reg('fbag_feast',()=>shadow()+[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>T(`rotate(${a} 60 44)`,P('M60 44L55 -8L65 -8Z',GOLD,0,'opacity=".32"'))).join('')+T('translate(10 -2) scale(.5)',FD.egg())+T('translate(52 -6) scale(.5)',FD.chicken())+T('translate(32 -14) scale(.46)',FD.sunflower())+R(14,48,92,62,6,G('#A9744F'))+L('M14 68H106M14 88H106M36 48V110M84 48V110','#7A4A2E',3)+R(9,42,102,14,4,G(GOLD))+R(50,62,20,18,4,G('#FFE27A'))+C(60,71,4,INK,0)+spark(106,22,7,'#FFF6C9')+spark(12,24,6,'#FFF6C9'),'0 -14 120 134');
/* WHEEL RUN: the wheel turns behind the pet, the stand stays still */
reg('run_wheel',()=>C(120,120,112,'none',0,`stroke="${INK}" stroke-width="16"`)+C(120,120,112,'none',0,`stroke="${GOLD}" stroke-width="9"`)+C(120,120,88,'none',0,`stroke="${INK}" stroke-width="9"`)+C(120,120,88,'none',0,`stroke="#D5DCEC" stroke-width="4"`)+[...Array(24).keys()].map(i=>T(`rotate(${i*15} 120 120)`,L('M120 12V32',INK,6)+L('M120 12V32','#FFF6E5',2.6))).join('')+[0,45,90,135].map(a=>T(`rotate(${a} 120 120)`,L('M32 120H208',INK,7)+L('M32 120H208',GOLD,3))).join('')+C(120,120,14,G(STEEL)),'0 0 240 240');
reg('run_stand',()=>L('M120 106L44 216M120 106L196 216',INK,16)+L('M120 106L44 216M120 106L196 216','#8A96B0',9)+R(16,208,208,28,8,G('#6E7290'))+R(62,212,116,20,5,G('#2A2450'),2.4)+TX(120,227.5,'WHEELY',15,GOLD),'0 0 240 240');
const medal=(c,n)=>P('M34 4H56L68 44H46Z',G(RED))+P('M86 4H64L52 44H74Z',G('#5B9DFA'))+C(60,76,36,G(c))+C(60,76,26,G(mix(c,'#FFFFFF',.28)),2.4)+TX(60,89,n,34,INK);
reg('medal_1',()=>medal(GOLD,1));
reg('medal_2',()=>medal('#C4CEE4',2));
reg('medal_3',()=>medal('#D98A4E',3));
const icon=reg;
const elIcon={
  seed:()=>P('M24 4C38 16 42 28 36 38C30 46 18 46 12 38C6 28 10 16 24 4Z',G('#35D07F'),2.6),
  dream:()=>P('M30 4C14 4 4 16 6 28C8 40 22 48 34 42C22 42 16 32 18 22C20 14 24 8 30 4Z',G('#F06BAE'),2.6),
  spark:()=>P('M28 2L10 26H22L16 46L38 18H26L32 2Z',G('#FFC94D'),2.6),
  water:()=>P('M24 3C34 16 40 24 40 32C40 41 33 46 24 46C15 46 8 41 8 32C8 24 14 16 24 3Z',G('#2FD6E8'),2.6),
  steel:()=>[0,60,120].map(a=>T(`rotate(${a} 24 24)`,R(18,2,12,44,3,G('#A8BAFF'),2.2))).join('')+C(24,24,15,G('#A8BAFF'),2.6)+C(24,24,6,INK,0),
};
Object.entries(elIcon).forEach(([k,f])=>reg('el_'+k,f,'0 0 48 48'));
const roleIcon={
  fighter:()=>T('translate(24 40) rotate(0) scale(.62)',P('M-6-8L-6-52L0-62L6-52L6-8Z',G('#E8EDF9'),4)+R(-15,-10,30,7,3,G(GOLD),4)+R(-3,-4,6,14,2,'#7A4A2E',3)),
  tank:()=>T('translate(24 22) scale(.64)',OFF.shield({c:'#5B7CFA'})),
  ranger:()=>T('translate(30 24) scale(.48)',OFF.bow()),
  mage:()=>T('translate(20 44) scale(.42)',W.orb({c2:'#F06BAE'})),
  support:()=>P('M24 42C4 28 8 8 24 18C40 8 44 28 24 42Z',G('#F0506E'),2.8),
  assassin:()=>T('translate(24 24) scale(1.25)',P('M0-16L5-5L16 0L5 5L0 16L-5 5L-16 0L-5-5Z',G(STEEL))+C(0,0,2.8,INK,0)),
};
Object.entries(roleIcon).forEach(([k,f])=>reg('role_'+k,f,'0 0 48 48'));
/* BACKGROUNDS: a night sky over the tower and the wheel. Baked once, so none of this runs in the browser */
const seq=s=>{let x=s>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};};
const stopsOf=a=>a.map(([o,c,k])=>`<stop offset="${o}" stop-color="${c}"${k===undefined?'':` stop-opacity="${k}"`}/>`).join('');
const vGrad=(id,a,ex='x1="0" y1="0" x2="0" y2="1"')=>`<linearGradient id="${id}" ${ex}>${stopsOf(a)}</linearGradient>`;
const rGrad=(id,a,ex='')=>`<radialGradient id="${id}" ${ex}>${stopsOf(a)}</radialGradient>`;
const bgDefs=()=>`<defs>${[
  vGrad('bgSky',[[0,'#0B0A26'],[.3,'#17134A'],[.56,'#2B1E6B'],[.74,'#5B2F86'],[.88,'#B4557F'],[1,'#F6A25E']]),
  rGrad('bgHz',[[0,'#FFB56B',.55],[.55,'#F0709A',.18],[1,'#F0709A',0]]),
  rGrad('bgMoonGlow',[[0,'#FFF1C9',.5],[.3,'#FFE9A8',.2],[1,'#FFE9A8',0]]),
  rGrad('bgMoon',[[0,'#FFFBE8'],[.7,'#FFEDB4'],[1,'#F4D78C']],'cx=".38" cy=".34" r=".8"'),
  rGrad('bgDot',[[0,'#FFF6C9',.95],[.25,'#FFE27A',.5],[1,'#FFC94D',0]]),
  rGrad('bgWinGlow',[[0,'#FFC94D',.5],[1,'#FFC94D',0]]),
  rGrad('bgLamp',[[0,'#FFD76A',.75],[.4,'#FFB84D',.25],[1,'#FFB84D',0]]),
  rGrad('bgPink',[[0,'#FF8FA3',.5],[1,'#FF8FA3',0]]),
  rGrad('bgVig',[[.62,'#05031A',0],[1,'#05031A',.62]],'cx=".5" cy=".5" r=".78"'),
  vGrad('bgWin',[[0,'#FFF0B0'],[1,'#FFB84D']]),
  vGrad('bgWall',[[0,'#7C78B8'],[1,'#57528F']]),
  vGrad('bgLedge',[[0,'#B6B4DE'],[1,'#7F7BB6']]),
  vGrad('bgRoof',[[0,'#FF7E93'],[1,'#B5304F']]),
  vGrad('bgCl',[[0,'#6A5AB0'],[1,'#2E2470']],'gradientUnits="userSpaceOnUse" x1="0" y1="-96" x2="0" y2="44"'),
  vGrad('bgClP',[[0,'#D989B4'],[1,'#6D3B8C']],'gradientUnits="userSpaceOnUse" x1="0" y1="-96" x2="0" y2="44"'),
  vGrad('bgFar1',[[0,'#4A3190'],[1,'#7A4296']]),
  vGrad('bgFar2',[[0,'#38277F'],[1,'#553087']]),
  vGrad('bgMid',[[0,'#2F2474'],[1,'#1F1856']]),
  vGrad('bgNear',[[0,'#241B60'],[1,'#17114A']]),
  vGrad('bgFront',[[0,'#171149'],[1,'#0D0A30']]),
  vGrad('bgGold',[[0,'#FFE27A'],[1,'#E0A02C']]),
].join('')}<filter id="bgB30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter><filter id="bgB70" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="70"/></filter></defs>`;
const wave=(W,y,a,f,p)=>x=>y+Math.sin(x/W*6.283*f+p)*a+Math.sin(x/W*6.283*f*2.3+p*1.7)*a*.35;
const hillOf=(W,H,fn,fill,rim)=>{let d='';for(let i=0;i<=64;i++){const x=W*i/64;d+=`${i?'L':'M'}${x.toFixed(1)} ${fn(x).toFixed(1)}`;}return `<path d="${d}L${W} ${H}L0 ${H}Z" fill="${fill}"/>`+(rim?`<path d="${d}" fill="none" stroke="${rim}" stroke-width="4" opacity=".55"/>`:'');};
const bgCloud=(x,y,s,f,o=1)=>T(`translate(${x} ${y}) scale(${s})`,`<g fill="url(#${f})" opacity="${o}"><circle cx="-90" cy="0" r="46"/><circle cx="-30" cy="-30" r="66"/><circle cx="46" cy="-18" r="54"/><circle cx="104" cy="4" r="38"/><rect x="-136" y="0" width="278" height="44" rx="22"/></g>`);
function bgWindow(x,y,w,h,on){
  const a=w/2,d=`M${x-a} ${y}V${y-h+a}A${a} ${a} 0 0 1 ${x+a} ${y-h+a}V${y}Z`;
  return (on?C(x,y-h*.5,h*1.15,'url(#bgWinGlow)',0):'')+P(d,on?'url(#bgWin)':'#231C54',3.6)+L(`M${x} ${y-h}V${y}M${x-a} ${y-h*.42}H${x+a}`,on?'#C9872A':'#15103E',2.6);
}
function bgTower(cx,base,n,w0,fh,r,bal){
  let s='',y=base,w=w0,balcony='';
  for(let i=0;i<n;i++){
    const nw=w*.975,top=y-fh,x0=cx-w/2,x1=cx+w/2,x2=cx-nw/2,x3=cx+nw/2;
    s+=P(`M${x0} ${y}L${x2} ${top}H${x3}L${x1} ${y}Z`,'url(#bgWall)',5);
    for(let k=0;k<7;k++){const bx=x2+8+r()*(nw-52),by=top+10+r()*(fh-26);s+=R(bx.toFixed(1),by.toFixed(1),30,12,3,'#1A1238',0,'opacity=".1"');}
    s+=P(`M${x1-18} ${y}L${x3-18} ${top}H${x3}L${x1} ${y}Z`,'#C9C6F0',0,'opacity=".22"');
    if(i===0){
      s+=C(cx,y-46,76,'url(#bgWinGlow)',0)+P(`M${cx-32} ${y}V${y-58}A32 32 0 0 1 ${cx+32} ${y-58}V${y}Z`,G('#7A4A2E'),4.5)+L(`M${cx} ${y-90}V${y}M${cx-32} ${y-40}H${cx+32}`,'#4A2C1A',3)+C(cx+20,y-36,3.6,G(GOLD),1.6);
      [-1,1].forEach(q=>{s+=bgWindow(cx+q*nw*.36,y-20,26,42,true);});
    }else{
      const cnt=w>190?3:2;
      for(let k=0;k<cnt;k++){const wx=cx+(k-(cnt-1)/2)*(nw/cnt*.95);s+=bgWindow(wx,y-14,26,42,r()<.8);}
    }
    const gold=i%5===4;
    s+=R(x2-10,top-8,nw+20,16,6,gold?'url(#bgGold)':'url(#bgLedge)',5);
    if(gold)[-.3,0,.3].forEach(q=>{s+=P(`M${cx+q*nw-11} ${top+8}H${cx+q*nw+11}V${top+34}L${cx+q*nw} ${top+26}L${cx+q*nw-11} ${top+34}Z`,G(RED),3);});
    if(i===bal)balcony=T(`translate(${x3-14} ${y-82}) scale(.66)`,sceneHam('balcony',{fur:'golden',eyes:'happy',hat:'band'}))+R(x3-20,y-6,96,14,6,'url(#bgLedge)',5)+L(`M${x3+6} ${y-6}V${y-34}M${x3+40} ${y-6}V${y-34}M${x3+72} ${y-6}V${y-34}M${x3-4} ${y-34}H${x3+74}`,INK,4)+P(`M${x3-14} ${y+8}L${x3+12} ${y+8}L${x3-14} ${y+30}Z`,'url(#bgLedge)',4);
    y=top-4;w=nw;
  }
  s+=balcony;
  const rw=w+50,rh=fh*2.1;
  s+=L(`M${cx} ${y-rh-46}V${y-rh+8}`,INK,5)+P(`M${cx+1} ${y-rh-46}L${cx+58} ${y-rh-30}L${cx+1} ${y-rh-14}Z`,G(GOLD),3.6);
  s+=P(`M${cx-rw/2} ${y-6}Q${cx-rw*.16} ${y-rh*.44} ${cx} ${y-rh}Q${cx+rw*.16} ${y-rh*.44} ${cx+rw/2} ${y-6}Q${cx} ${y+18} ${cx-rw/2} ${y-6}Z`,'url(#bgRoof)',5);
  s+=L(`M${cx-rw*.22} ${y-rh*.25}Q${cx} ${y-rh*.17} ${cx+rw*.22} ${y-rh*.25}M${cx-rw*.12} ${y-rh*.55}Q${cx} ${y-rh*.5} ${cx+rw*.12} ${y-rh*.55}`,'#8F2340',4)+C(cx,y-rh,7,G(GOLD),3);
  return s;
}
function bgWheel(cx,ground,r){
  const cy=ground-r-26,k=r/200;
  const leg=x=>L(`M${cx} ${cy}L${x} ${ground}`,INK,24*k)+L(`M${cx} ${cy}L${x} ${ground}`,'#7A7EB8',13*k);
  let s=leg(cx-r*.66)+leg(cx+r*.66);
  [0,30,60,90,120,150].forEach(a=>{s+=T(`rotate(${a} ${cx} ${cy})`,L(`M${cx-r*.84} ${cy}H${cx+r*.84}`,INK,11*k)+L(`M${cx-r*.84} ${cy}H${cx+r*.84}`,'#E0A02C',5*k));});
  s+=C(cx,cy,r*.84,'none',0,`stroke="${INK}" stroke-width="${15*k}"`)+C(cx,cy,r*.84,'none',0,`stroke="#C4CEE4" stroke-width="${7*k}"`);
  s+=C(cx,cy,r,'none',0,`stroke="${INK}" stroke-width="${31*k}"`)+C(cx,cy,r,'none',0,`stroke="url(#bgGold)" stroke-width="${20*k}"`);
  for(let a=0;a<360;a+=12)s+=T(`rotate(${a} ${cx} ${cy})`,L(`M${cx} ${cy-r*.84}V${cy-r*.97}`,INK,7*k)+L(`M${cx} ${cy-r*.84}V${cy-r*.97}`,'#FFF6E5',3*k));
  s+=C(cx,cy,r*.1,G(STEEL),5*k);
  const hs=r*.0052;
  s+=T(`translate(${cx-60*hs} ${cy+r*.82-118*hs}) scale(${hs})`,sceneHam('wheel',{fur:'white',squeek:1,eyes:'star'}));
  s+=R(cx-r*.92,ground-10,r*1.84,26*k+6,9,G('#6E7290'),5)+R(cx-r*.42,ground-6,r*.84,18*k+4,5,G('#2A2450'),3)+TX(cx,ground+(11*k),'WHEELY',17*k,GOLD);
  return s;
}
const bgLamp=(x,y,h)=>C(x,y-h,h*.85,'url(#bgLamp)',0)+L(`M${x} ${y}V${y-h+10}`,INK,6)+L(`M${x} ${y}V${y-h+10}`,'#5A4A7A',3)+R(x-11,y-h-10,22,24,5,G('#FFD76A'),3.6)+P(`M${x-14} ${y-h-10}L${x} ${y-h-24}L${x+14} ${y-h-10}Z`,G('#4A3C70'),3);
const bgFlower=(x,y,h,lean,s)=>{
  const tx=x+lean,ty=y-h;
  let o=LL(`M${x} ${y}Q${x+lean*.15} ${y-h*.6} ${tx} ${ty}`,'#2E8B57',7*s);
  [[.35,-1],[.55,1]].forEach(([q,d])=>{const lx=x+lean*q*q,ly=y-h*q;o+=P(`M${lx} ${ly}C${lx+d*30*s} ${ly-34*s} ${lx+d*74*s} ${ly-26*s} ${lx+d*90*s} ${ly+6*s}C${lx+d*60*s} ${ly+22*s} ${lx+d*22*s} ${ly+20*s} ${lx} ${ly}Z`,G('#2F9C60'),3.4);});
  for(let a=0;a<360;a+=24)o+=T(`rotate(${a} ${tx} ${ty})`,E(tx,ty-38*s,10*s,24*s,G('#F7BE34'),2.8));
  o+=C(tx,ty,25*s,G('#6A4426'),3);
  [[-9,-8],[8,-10],[0,2],[-10,8],[10,7],[0,13]].forEach(([a,b])=>{o+=C(tx+a*s,ty+b*s,2.6*s,'#2A1B10',0);});
  return o;
};
const bgTuft=(x,y,c)=>L(`M${x} ${y}q-4 -18 -11 -27M${x} ${y}q0 -22 2 -33M${x} ${y}q4 -16 13 -24`,c,3.6);
const bgShroom=(x,y,s)=>C(x,y-16*s,34*s,'url(#bgPink)',0)+R(x-5*s,y-16*s,10*s,18*s,3,G('#FFF1DC'),2.6)+P(`M${x-17*s} ${y-14*s}C${x-15*s} ${y-34*s} ${x+15*s} ${y-34*s} ${x+17*s} ${y-14*s}Q${x} ${y-8*s} ${x-17*s} ${y-14*s}Z`,G('#F0506E'),2.8)+C(x-6*s,y-23*s,2.6*s,'#FFF6E5',0)+C(x+6*s,y-20*s,2.2*s,'#FFF6E5',0);
function nightScene(o){
  const {W,H,hz}=o,r=seq(o.seed||11);
  let s=bgDefs()+`<rect width="${W}" height="${hz+70}" fill="url(#bgSky)"/><rect y="${hz+60}" width="${W}" height="${H-hz-60}" fill="#120D38"/>`;
  s+=E(W*.3,hz*.38,W*.34,H*.13,'#3FB4E8',0,'opacity=".1" filter="url(#bgB70)"')+E(W*.72,hz*.52,W*.28,H*.1,'#F06BAE',0,'opacity=".1" filter="url(#bgB70)"');
  for(let i=0;i<o.stars;i++){const x=r()*W,q=r(),y=q*q*hz*.92,sz=.7+r()*r()*2.1,c=['#FFFFFF','#FFF1C9','#CFE0FF'][Math.floor(r()*3)];s+=C(x.toFixed(1),y.toFixed(1),sz.toFixed(2),c,0,`opacity="${(.35+r()*.65).toFixed(2)}"`);}
  for(let i=0;i<o.sparks;i++){const x=r()*W,y=r()*hz*.62,z=5+r()*7;s+=C(x.toFixed(1),y.toFixed(1),(z*2.4).toFixed(1),'url(#bgDot)',0,'opacity=".5"')+`<path d="M${x.toFixed(1)} ${(y-z).toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${(x+z).toFixed(1)} ${y.toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y+z).toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${(x-z).toFixed(1)} ${y.toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${(y-z).toFixed(1)}Z" fill="#FFF6C9"/>`;}
  const m=o.moon;
  s+=C(m.x,m.y,m.r*3.4,'url(#bgMoonGlow)',0)+C(m.x,m.y,m.r*1.32,'#FFF1C9',0,'opacity=".08"')+C(m.x,m.y,m.r,'url(#bgMoon)',0);
  [[-.34,-.28,.2],[.28,.18,.26],[.4,-.38,.12],[-.22,.42,.14],[-.52,.12,.08],[.04,-.06,.07]].forEach(([a,b,c])=>{s+=C(m.x+a*m.r,m.y+b*m.r,c*m.r,'#E8CF8A',0,'opacity=".6"');});
  o.cloudsHigh.forEach(([x,y,z,q])=>{s+=bgCloud(x,y,z,'bgCl',q);});
  s+=E(W*.5,hz,W*.72,H*.2,'url(#bgHz)',0);
  o.cloudsLow.forEach(([x,y,z,q])=>{s+=bgCloud(x,y,z,'bgClP',q);});
  s+=hillOf(W,H,wave(W,hz-84,46,3.2,.8),'url(#bgFar1)');
  s+=hillOf(W,H,wave(W,hz-34,36,2.1,2.4),'url(#bgFar2)','#7D5BC0');
  const mid=wave(W,hz+70,34,1.4,4.1),near=wave(W,hz+o.nearAt,30,1.1,1),front=wave(W,H-o.frontAt,20,1.7,3);
  s+=hillOf(W,H,mid,'url(#bgMid)','#6E58C8');
  const tx=o.tower.x,ty=mid(tx)+10,wx=o.wheel.x,wy=mid(wx)+6;
  if(!o.hero)s+=L(`M${tx} ${ty+8}C${tx+190} ${ty+66} ${tx+(wx-tx)*.4} ${ty+70} ${(tx+wx)/2} ${(ty+wy)/2+46}S${wx-190} ${wy+52} ${wx} ${wy+14}`,'#5B4AA6',34)+L(`M${tx} ${ty+8}C${tx+190} ${ty+66} ${tx+(wx-tx)*.4} ${ty+70} ${(tx+wx)/2} ${(ty+wy)/2+46}S${wx-190} ${wy+52} ${wx} ${wy+14}`,'#7564C2',22,'stroke-dasharray="26 30" opacity=".5"');
  const tz=o.tower.scale||1;
  s+=T(`translate(${tx} ${ty}) scale(${tz}) translate(${-tx} ${-ty})`,bgTower(tx,ty,o.tower.n,o.tower.w,o.tower.fh,seq(5),o.tower.bal));
  if(!o.hero){
    s+=bgWheel(wx,wy,o.wheel.r);
    o.lamps.forEach(q=>{const x=tx+(wx-tx)*q;s+=bgLamp(x,mid(x)+o.lampDrop,74);});
    s+=bgShroom(tx-o.tower.w*.72,mid(tx-o.tower.w*.72)+16,1.1)+bgShroom(tx-o.tower.w*.92,mid(tx-o.tower.w*.92)+22,.8)+bgShroom(tx+o.tower.w*.8,mid(tx+o.tower.w*.8)+20,.9);
    s+=R(tx+o.tower.w*.6,ty-20,10,50,3,G('#7A4A2E'),3)+R(tx+o.tower.w*.6-44,ty-44,98,34,6,G('#A9744F'),3.6)+TX(tx+o.tower.w*.6+5,ty-21,'FLOOR 1',15,'#FFF6E5');
  }
  s+=hillOf(W,H,near,'url(#bgNear)','#4D3FA6');
  for(let i=0;i<o.tufts;i++){const x=r()*W;s+=bgTuft(x.toFixed(1),(near(x)+3).toFixed(1),'#3D3596');}
  o.carrots.forEach(([x,z])=>{const y=near(x)+10;s+=T(`translate(${x-60*z} ${y-90*z}) scale(${z})`,FD.carrot())+E(x,y+6*z,46*z,16*z,'#17114A',0);});
  o.flowers.forEach(f=>{s+=bgFlower(...f);});
  s+=hillOf(W,H,front,'url(#bgFront)','#2F2780');
  for(let i=0;i<o.tufts;i++){const x=r()*W;s+=bgTuft(x.toFixed(1),(front(x)+3).toFixed(1),'#2A2470');}
  for(let i=0;i<o.flies;i++){const x=r()*W,y=hz-120+r()*(H-hz+60),z=8+r()*12;s+=C(x.toFixed(1),y.toFixed(1),z.toFixed(1),'url(#bgDot)',0);}
  s+=`<rect width="${W}" height="${H}" fill="url(#bgVig)"/>`;
  return s;
}
const SCENE_WIDE={W:1920,H:1080,hz:780,seed:11,stars:300,sparks:26,flies:26,tufts:46,nearAt:158,frontAt:64,lampDrop:30,moon:{x:1610,y:290,r:112},tower:{x:400,n:7,w:232,fh:64,bal:4},wheel:{x:1490,r:232},lamps:[.2,.8],
  cloudsHigh:[[720,310,1.05,.75],[1180,220,.72,.5],[120,360,.82,.6],[1830,500,.7,.5]],cloudsLow:[[1000,640,.95,.7],[1790,650,.8,.6],[640,690,.72,.6],[90,640,.8,.65]],
  carrots:[[860,.62],[930,.72],[1006,.6]],flowers:[[96,1080,330,20,1.08],[214,1080,250,-14,.86],[1838,1080,350,-24,1.12],[1716,1080,240,16,.84]]};
const SCENE_TALL={W:1080,H:1920,hz:1610,seed:23,stars:360,sparks:30,flies:22,tufts:26,nearAt:150,frontAt:54,lampDrop:24,moon:{x:790,y:240,r:112},tower:{x:236,n:15,w:176,fh:72},wheel:{x:742,r:150},lamps:[.34,.68],
  cloudsHigh:[[850,560,.8,.6],[230,150,.7,.5],[930,960,.7,.45],[130,1120,.7,.45]],cloudsLow:[[560,1470,.75,.7],[960,1500,.6,.6],[90,1500,.62,.6]],
  carrots:[[420,.56],[484,.62]],flowers:[[66,1920,250,12,.82],[1012,1920,270,-18,.86]]};
const SCENE_HERO={W:1200,H:620,hz:340,seed:31,hero:true,stars:170,sparks:14,flies:10,tufts:18,nearAt:110,frontAt:26,lampDrop:0,moon:{x:940,y:215,r:52},tower:{x:790,n:3,w:118,fh:62,scale:.62},wheel:{x:1100,r:0},lamps:[],
  cloudsHigh:[[680,190,.5,.6],[1090,170,.42,.45]],cloudsLow:[[1040,340,.5,.7],[560,350,.45,.6]],carrots:[],flowers:[]};
reg('scene',()=>nightScene(SCENE_HERO),'0 0 1200 620');
const dimmed=o=>`<defs><filter id="bgSoft" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${o.W/620}"/></filter></defs><g filter="url(#bgSoft)">${nightScene(o)}</g><rect width="${o.W}" height="${o.H}" fill="#110E2C" opacity=".72"/>`;
reg('bg_login',()=>nightScene(SCENE_WIDE),'0 0 1920 1080');
reg('bg_login_tall',()=>nightScene(SCENE_TALL),'0 0 1080 1920');
reg('bg_night',()=>dimmed(SCENE_WIDE),'0 0 1920 1080');
reg('bg_night_tall',()=>dimmed(SCENE_TALL),'0 0 1080 1920');
/* GEAR BY SET: 6 sets x 4 slots */
const SET_C={miner:'#C9743F',knight:'#5B7CFA',wizard:'#7B4FC9',hunter:'#3FA66A',nurse:'#F0506E',thunder:'#FFC94D'};
const SET_W={miner:'pick',knight:'sword',wizard:'orb',hunter:'sling',nurse:'heart',thunder:'hammer'};
const SET_H={miner:'miner',knight:'knight',wizard:'wizard',hunter:'archer',nurse:'nurse',thunder:'thunder'};
Object.keys(SET_C).forEach(s=>{
  const c=SET_C[s];
  reg('g_weapon_'+s,()=>T('translate(56 96) scale(.92)',W[SET_W[s]]({c2:c})),'10 10 100 100');
  reg('g_hat_'+s,()=>HAT[SET_H[s]]({c}),'0 -14 120 84');
  reg('g_armor_'+s,()=>P('M36 26L52 20Q60 28 68 20L84 26L100 44L88 56L82 50V100H38V50L32 56L20 44Z',G(mix(c,'#FFFFFF',.45)))+P('M46 40H74V86Q60 94 46 86Z',G(c),2.4)+spark(60,62,8,'#FFFFFF'),'10 10 100 100');
  reg('g_charm_'+s,()=>L('M40 18Q60 44 80 18',INK,4)+C(60,62,24,G(c))+C(60,62,14,G(mix(c,'#FFFFFF',.72)),2.4)+spark(60,62,8,GOLD),'10 10 100 100');
});
/* NAVIGATION ICONS */
reg('nav_tower',()=>R(30,92,60,18,3,G('#C4CEE4'))+R(36,70,48,22,3,G('#E0E6F4'))+R(36,48,48,22,3,G('#C4CEE4'))+R(36,26,48,22,3,G('#E0E6F4'))+P('M28 28L60 4L92 28Z',G(RED))+R(50,88,20,22,8,G('#6B4A2E'),2.4)+C(60,58,6,G(GOLD),2.2),'10 0 100 114');
reg('nav_team',()=>T('translate(0 0)',hamster(PETS.blade)),'-14 -16 148 148');
reg('nav_codex',()=>T('translate(60 78) scale(1.5)',W.book()),'6 -6 108 108');
reg('nav_shop',()=>R(20,50,80,58,4,G('#F2E6C9'))+R(32,66,24,42,2,G('#8A5A3A'),2.6)+C(50,88,2,GOLD,0)+R(64,66,26,22,2,G('#8FC8FF'),2.6)+P('M14 18H106L114 46C114 56 96 56 95 46C94 56 76 56 75 46C74 56 46 56 45 46C44 56 26 56 25 46C24 56 6 56 6 46Z',G(RED))+P('M34 18H50L46 46C44 54 26 54 25 46ZM70 18H86L95 46C94 54 76 54 75 46Z','#FFF6E5',2.2),'0 8 120 108');
reg('nav_rank',()=>L('M36 24H18C18 44 28 54 42 56M84 24H102C102 44 92 54 78 56',INK,8)+L('M36 24H18C18 44 28 54 42 56M84 24H102C102 44 92 54 78 56',GOLD,3.6)+P('M34 12H86C86 12 88 46 76 60C70 68 64 70 60 70C56 70 50 68 44 60C32 46 34 12 34 12Z',G(GOLD))+spark(60,36,12,'#FFF6C9')+R(53,70,14,16,2,G('#E5B23A'))+R(36,86,48,16,4,G('#8A5A3A')),'6 4 108 108');
reg('nav_items',()=>T('translate(60 92) rotate(30)',W.sword()),'10 10 100 100');
/* QUESTS: a quest scroll with a check, Tower Points as a purple token with a tower, and a plain X mark for social quests */
reg('nav_quest',()=>P('M32 22H88V96Q88 104 80 104H32Z',G('#F6E7C1'))+R(22,14,74,15,7.5,G('#E2B877'))+R(24,94,72,15,7.5,G('#E2B877'))+L('M42 46H76M42 60H72M42 74H64','#B8925E',3.4)+LL('M48 64L60 78L90 40','#35D07F',6)+spark(100,26,9,GOLD),'4 4 112 112');
reg('tp',()=>C(60,60,50,G('#9C7BFF'),4)+C(60,60,39,G('#6A4FB8'),3)+P('M44 88V42H51V34H57V42H63V34H69V42H76V88Z',G('#FFE27A'),3)+R(54,70,12,18,3,G('#8A5A3A'),2.4)+R(55,50,10,10,2,'#6A4FB8',2.2)+spark(90,26,9,'#FFF6C9')+spark(28,90,6,'#FFF6C9'),'0 0 120 120');
reg('x_logo',()=>R(14,14,92,92,24,'#15122B',4)+L('M40 36L82 86','#FFFFFF',10)+L('M82 36L40 86','#FFFFFF',4.5),'4 4 112 112');
reg('wheel_big',()=>hamster(PETS.squeektoshi),'-14 -16 148 148');
reg('logo',()=>hamster(PETS.squeektoshi),'-14 -16 148 148');
reg('arena',()=>hamster(PETS.blade),'-14 -16 148 148');
reg('hurt_pet',()=>hamster({fur:'golden',hat:'band',eyes:'sleepy',weapon:'sword'}),'-14 -16 148 148');
reg('win_pet',()=>hamster({fur:'golden',hat:'band',eyes:'happy',weapon:'sword',back:['aura']}),'-14 -16 148 148');
reg('coins',()=>[[36,84],[60,88],[84,84],[48,68],[72,68],[60,52]].map(([x,y])=>E(x,y,20,10,G(GOLD))+E(x,y-5,20,10,G('#FFE27A'))).join('')+spark(96,34,7,'#FFF6C9')+spark(24,44,5,'#FFF6C9'),'0 10 120 110');
reg('anvil',()=>P('M14 28H106C106 44 92 52 78 54V66C78 74 86 80 96 84V98H24V84C34 80 42 74 42 66V54C28 52 14 44 14 28Z',G('#6E7290')),'0 10 120 100');
reg('forge_hammer',()=>T('translate(70 100) rotate(-20)',W.hammer()),'0 0 130 130');
window.artSvg=build;
window.artIds=()=>Object.keys(REG);
})();
