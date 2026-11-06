/* CHARACTER ART: pets and bosses drawn in layers, so they can move and really wear what they have equipped. scripts/bake-art.js uses the same drawings for the small pictures in lists. Pets face right and stand on y=0. */
const RA=(()=>{
const INK='#2A1B3D';
const f2=n=>Math.round(n*100)/100;
function sm(pts,closed=true){
  const n=pts.length,Q=i=>pts[closed?(i+n)%n:Math.max(0,Math.min(n-1,i))];
  let d=`M${f2(pts[0][0])},${f2(pts[0][1])}`;
  for(let i=0;i<(closed?n:n-1);i++){const a=Q(i-1),b=Q(i),c=Q(i+1),e=Q(i+2);d+=`C${f2(b[0]+(c[0]-a[0])/6)},${f2(b[1]+(c[1]-a[1])/6)} ${f2(c[0]-(e[0]-b[0])/6)},${f2(c[1]-(e[1]-b[1])/6)} ${f2(c[0])},${f2(c[1])}`;}
  return d+(closed?'Z':'');
}
const ln=(w=3)=>`stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const inked=(d,fill,w=3)=>`<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${w+1.3}" stroke-linejoin="round" transform="translate(.7,1.1)"/><path d="${d}" fill="${fill}" ${ln(w)}/>`;
const lg=(id,stops,x2=1,y2=1)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c,i)=>`<stop offset="${f2(i/(stops.length-1))}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rg=(id,stops,cx=.4,cy=.35,r=.8)=>`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map((c,i)=>`<stop offset="${f2(i/(stops.length-1))}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const mix=(hex,to,p)=>{const n=parseInt(hex.slice(1),16),m=parseInt(to.slice(1),16);const c=s=>{const a=(n>>s)&255,b=(m>>s)&255;return Math.round(a+(b-a)*p).toString(16).padStart(2,'0');};return '#'+c(16)+c(8)+c(0);};
/* colors used through G() get one shared soft gradient */
const USED=new Set();
const G=h=>{USED.add(h);return `url(#rg${h.slice(1).toLowerCase()})`;};
const softDef=h=>`<radialGradient id="rg${h.slice(1).toLowerCase()}" cx=".36" cy=".26" r=".95"><stop offset="0" stop-color="${mix(h,'#FFFFFF',.42)}"/><stop offset=".52" stop-color="${h}"/><stop offset="1" stop-color="${mix(h,'#1A1030',.3)}"/></radialGradient>`;
const MATERIALS=lg('gSteel',['#FBFCFF','#C4CCE4','#7C84A8'])+lg('gSteelD',['#AEB6D2','#6F7799','#474C6E'])+lg('gGold',['#FFF6BE','#FFCB4F','#C07F18'])+lg('gGoldD',['#E8A92F','#A96D14','#6F430B'])+lg('gBlue',['#8FBCFF','#3F73E6','#20389A'])+lg('gBlueD',['#3454B8','#1E2F86','#141F5C'])+lg('gRed',['#FF9A8A','#E8434F','#9C1C3A'])+lg('gPurple',['#C7AEFF','#7D52E4','#3F2789'])+lg('gIce',['#F2FEFF','#9CE8F7','#3FA6D9'])+lg('gIceB',['#BFEBFF','#5BB5EA','#2C6FBE'])+lg('gWood',['#D29A62','#8F5E36','#5A3820'])+lg('gLeather',['#C8915A','#8E5C35','#5C3A20'])+lg('gCloth',['#6FA7FF','#2E58C8','#172C78'],.3,1)+lg('gBlade',['#FFFFFF','#DCE3F5','#8E97BC'],1,0)+lg('gGreen',['#9BE88A','#3FA66A','#1F6F48'])+lg('gWhite',['#FFFFFF','#F2EFFA','#C9C4DC'])+lg('gYellow',['#FFF08A','#F8C93A','#C98A1A'])+lg('gDenim',['#8FB4E6','#4C78BE','#2C4E8C'])+rg('gGemB',['#E4F3FF','#57A4FF','#17379E'])+rg('gGemP',['#F4E9FF','#B586FF','#4D239E'])+rg('gGemC',['#F4FFFF','#7CE9F7','#1C7FB8'])+rg('gGemY',['#FFFDE0','#FFD94D','#C9791A'])+rg('gGemR',['#FFE9EC','#FF6B7D','#A81C3C'])+rg('gGemG',['#EEFFF4','#62DE93','#14804B'])+rg('gGlowY',['rgba(255,225,110,.95)','rgba(255,200,60,.28)','rgba(255,200,60,0)'],.5,.5,.5)+rg('gGlowC',['rgba(190,245,255,.95)','rgba(90,210,245,.28)','rgba(90,210,245,0)'],.5,.5,.5)+rg('gGlowP',['rgba(230,205,255,.95)','rgba(165,110,255,.3)','rgba(165,110,255,0)'],.5,.5,.5)+rg('gGlowR',['rgba(255,190,200,.9)','rgba(240,80,110,.28)','rgba(240,80,110,0)'],.5,.5,.5)+rg('gGlowG',['rgba(200,255,220,.9)','rgba(80,220,140,.28)','rgba(80,220,140,0)'],.5,.5,.5);
/* one svg in the page holds the shared paints, so every character can use them */
let sheet=null;
function ensureDefs(){if(typeof document==='undefined')return;if(!sheet){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('width','0');s.setAttribute('height','0');s.setAttribute('aria-hidden','true');s.style.position='absolute';s.innerHTML=`<defs>${MATERIALS}</defs>`;document.body.appendChild(s);sheet=s;sheet.done=new Set();}const d=sheet.firstChild;let add='';for(const h of USED)if(!sheet.done.has(h)){sheet.done.add(h);add+=softDef(h);}if(add){const t=document.createElementNS('http://www.w3.org/2000/svg','svg');t.innerHTML=add;[...t.childNodes].forEach(n=>d.appendChild(n));}}
const inlineDefs=()=>MATERIALS+[...USED].map(softDef).join('');
/* the older drawing helpers, kept for the hats and tools every pet already has */
let SWK=.62;
const S=w=>w?`stroke="${INK}" stroke-width="${f2(w*SWK)}" stroke-linejoin="round" stroke-linecap="round"`:'';
const C=(x,y,r,f,w=3,ex='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${S(w)} ${ex}/>`;
const E=(x,y,a,b,f,w=3,ex='')=>`<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${f}" ${S(w)} ${ex}/>`;
const P=(d,f,w=3,ex='')=>`<path d="${d}" fill="${f}" ${S(w)} ${ex}/>`;
const Rc=(x,y,W,H,r,f,w=3,ex='')=>`<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="${r}" fill="${f}" ${S(w)} ${ex}/>`;
const L=(d,c=INK,w=2.4,ex='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${f2(w*SWK*1.4)}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
const LL=(d,c,w=4)=>L(d,INK,w+3.6)+L(d,c,w);
const T=(t,s)=>`<g transform="${t}">${s}</g>`;
const TX=(x,y,t,sz,c=INK,ex='')=>`<text x="${x}" y="${y}" font-family="Verdana,Arial,sans-serif" font-weight="800" font-size="${sz}" text-anchor="middle" fill="${c}" ${ex}>${t}</text>`;
const spark=(x,y,s,c='#FFF6C9')=>`<path d="M${x} ${y-s}Q${x} ${y} ${x+s} ${y}Q${x} ${y} ${x} ${y+s}Q${x} ${y} ${x-s} ${y}Q${x} ${y} ${x} ${y-s}Z" fill="${c}" stroke="${INK}" stroke-width="${f2(1.2*SWK)}" stroke-linejoin="round"/>`;
const STEEL='#D5DCEC',GOLD='#FFC94D',WOOD='#8A5A3A',RED='#F0506E';
const dome=c=>P('M27 58C27 22 93 22 93 58Q60 47 27 58Z',G(c));
const HAT={
  band:p=>P('M28 54Q60 44 92 54L92 60Q60 50 28 60Z',G(p.c||RED))+P('M28 55C18 52 12 58 8 50L8 62C14 66 22 62 28 60Z',G(p.c||RED),2.4),
  knight:()=>dome('#C4CEE4')+Rc(56,25,8,26,3,G(GOLD),2.2)+P('M60 27C58 6 84 2 92 18C82 14 72 18 67 30Z',G(RED))+C(36,48,2,'#7E8AAE',0)+C(84,48,2,'#7E8AAE',0),
  miner:()=>dome('#FFC94D')+P('M24 58Q60 46 96 58Q98 63 92 62Q60 52 28 62Q22 63 24 58Z',G('#E8A92E'),2.4)+Rc(52,29,16,8,3,G('#6E6E86'),2)+C(60,33,7,G('#FFF6C9'),2.4),
  goggles:()=>P('M27 50Q60 40 93 50L93 56Q60 46 27 56Z','#5A4A36',0,`stroke="${INK}" stroke-width="1.4"`)+C(45,47,10,G('#7A5A3E'),2.6)+C(45,47,6.4,G('#A8E8FF'),2)+C(75,47,10,G('#7A5A3E'),2.6)+C(75,47,6.4,G('#A8E8FF'),2),
  viking:()=>P('M30 46C16 42 12 26 19 12C24 28 32 32 40 34Z','#F6ECCF')+P('M90 46C104 42 108 26 101 12C96 28 88 32 80 34Z','#F6ECCF')+dome('#AEB6CC')+P('M22 58Q60 44 98 58L97 64Q60 50 23 64Z',G(GOLD),2.4)+Rc(56,44,8,20,3,G('#8E97B0'),2.2),
  kabuto:()=>P('M44 34C42 12 54 4 60 4C66 4 78 12 76 34C70 24 50 24 44 34Z',G(GOLD))+dome('#B8324B')+P('M18 62C20 52 26 50 32 52L28 66Z',G('#8A2238'),2.4)+P('M102 62C100 52 94 50 88 52L92 66Z',G('#8A2238'),2.4),
  crown:()=>P('M36 46L31 20L47 33L60 13L73 33L89 20L84 46Q60 54 36 46Z',G(GOLD))+C(60,40,4,G(RED),2)+C(45,42,2.6,G('#5B9DFA'),1.6)+C(75,42,2.6,G('#5B9DFA'),1.6)+L('M38 44Q60 51 82 44','#FFF6BE',1.6),
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
  tophat:()=>Rc(42,2,36,42,3,G('#2E2A44'))+Rc(42,30,36,8,0,G(RED),2.2)+E(60,46,33,7,G('#2E2A44')),
  dive:()=>C(60,62,36,'#D8F4FF',3.4,'opacity=".42"')+L('M34 40Q44 30 60 28','#FFFFFF',3.4)+P('M24 68H36V82H24ZM84 68H96V82H84Z',G(GOLD),2.4)+C(60,26,5,G(GOLD),2.2),
  halo:()=>E(60,20,23,6.5,'none',0,`stroke="${INK}" stroke-width="4.4"`)+E(60,20,23,6.5,'none',0,`stroke="${GOLD}" stroke-width="2.4"`),
  aviator:()=>P('M28 58C28 26 92 26 92 58Q60 46 28 58Z',G('#8A5A3A'))+C(45,48,9,G('#6B4A32'),2.4)+C(45,48,5.8,G('#FFE28A'),1.8)+C(75,48,9,G('#6B4A32'),2.4)+C(75,48,5.8,G('#FFE28A'),1.8),
};
const stick=(c,len=56,w=4,top=16)=>LL(`M0 ${top}L2 ${-len}`,c,w);
const TOOL={
  sword:()=>T('rotate(18)',P('M-5.5-8L-5.5-52L0-64L5.5-52L5.5-8Z',G('#E8EDF9'))+L('M0-56V-12','#9AA6C6',1.8)+Rc(-13,-10,26,6.5,3,G(GOLD))+Rc(-3,-4,6,14,2,'#7A4A2E')+C(0,12,3.8,G(GOLD))),
  katana:()=>T('rotate(14)',P('M-3-10C-7-34-5-54 7-74C9-52 7-30 4-10Z',G('#EEF2FB'))+E(0,-9,8,3,G(GOLD),2.2)+Rc(-3.4,-7,6.8,20,2,G('#B8324B'),2.4)),
  axe:()=>T('rotate(14)',LL('M0 18L0-54',WOOD,4)+P('M1-52C16-62 32-52 33-32C24-38 12-36 1-30Z',G(STEEL))+P('M-1-52C-16-62-32-52-33-32C-24-38-12-36-1-30Z',G(STEEL))),
  pick:()=>T('rotate(14)',LL('M0 20L0-48',WOOD,4.4)+P('M-34-42C-16-62 16-62 34-42C16-52-16-52-34-42Z',G(STEEL))+Rc(-5,-58,10,12,2,G('#7A7A92'),2.2)),
  wrench:()=>T('rotate(14)',LL('M0 16L0-34',STEEL,7)+P('M-12-34C-15-50-7-58 0-58L-2-46L8-46L8-58C14-56 15-44 12-34C6-28-6-28-12-34Z',G(STEEL))),
  fork:()=>T('rotate(10)',LL('M0 20V-40',WOOD,4)+LL('M-14-60V-46Q-14-40 0-40Q14-40 14-46V-60',STEEL,3.4)+LL('M0-40V-64',STEEL,3.4)),
  trident:()=>T('rotate(10)',LL('M0 22V-44',GOLD,4.2)+LL('M-16-58V-50Q-16-44 0-44Q16-44 16-50V-58',GOLD,3.8)+P('M-16-72L-21-56H-11Z',G(GOLD),2.4)+P('M16-72L11-56H21Z',G(GOLD),2.4)+P('M0-80L-6-58H6Z',G(GOLD),2.4)),
  heart:()=>T('rotate(12)',LL('M0 18V-36','#F59DB5',4)+P('M0-34C-20-48-14-68 0-58C14-68 20-48 0-34Z',G('#F0506E'))+spark(16,-66,5,GOLD)),
  pan:()=>T('rotate(14)',LL('M0 16L0-14','#55556A',5.4)+C(0,-34,21,G('#5D5D74'))+E(1,-34,12,10,'#FFFFFF',0)+C(2,-34,5,G(GOLD),1.4)),
  sling:()=>T('rotate(10)',LL('M0 16V-12',WOOD,4.6)+LL('M0-12L-12-34',WOOD,4.2)+LL('M0-12L12-34',WOOD,4.2)+L('M-12-34Q0-18 12-34',RED,2.4)+C(0,-26,4,G(GOLD),2)),
  moon:()=>T('rotate(8)',stick('#6B4A8E',60,4,20)+P('M10-92C-8-96-20-80-15-66C-10-54 6-50 15-57C4-57-5-65-5-75C-5-84 2-89 10-92Z',G('#FFE28A'))+spark(14,-78,5,'#FFFFFF')),
  snow:()=>T('rotate(8)',stick('#7FB8D8',56,4,20)+C(2,-68,12,G('#BFEFFF'))+L('M2-78V-58M-7-73L11-63M-7-63L11-73','#FFFFFF',2.2)+spark(18,-82,4)),
  leaf:()=>T('rotate(6)',LL('M0 20C8-8-6-30 4-56','#7A5232',5)+P('M4-54C-16-58-24-76-18-90C-4-86 8-72 4-54Z',G('#4CCB7F'))+P('M4-54C10-72 24-82 36-78C36-62 22-52 4-54Z',G('#35B06E'))+C(4,-56,4,G('#F59DB5'),2)),
  bolt:()=>T('rotate(10)',LL('M0 14V-26','#5B7CFA',4)+P('M6-66L-11-38L0-38L-6-16L14-46L3-46Z',G(GOLD))),
  wand:()=>T('rotate(14)',LL('M0 12V-36',INK,3)+L('M0-36V-28','#FFFFFF',3)+spark(0,-48,9,GOLD)+spark(16,-36,4.4)+spark(-14,-40,3.6)),
  gun:()=>Rc(-8,-22,36,15,6,G('#A9B4CE'))+Rc(26,-19,14,9,2,G(GOLD),2.4)+Rc(-5,-9,11,20,3,G('#3A3A56'))+L('M10-22L2-12H8L4-6',GOLD,2),
  bomb:()=>C(2,-16,18,G('#3A3550'))+LL('M10-32C12-40 20-42 24-48','#A9744F',2.6)+spark(27,-52,8,GOLD)+E(-4,-23,5,3,'#FFFFFF',0,'opacity=".5"'),
  flask:()=>P('M-6-44H6V-30L20-6Q24 6 12 6H-12Q-24 6-20-6L-6-30Z',G('#E8F8FF'))+P('M-15-8H15L18-2Q20 4 12 4H-12Q-20 4-18-2Z',G('#35D0E0'),0)+Rc(-7,-52,14,9,2,G('#C9743F'),2.2)+C(-4,-14,2.4,'#FFFFFF',0)+C(5,-20,1.8,'#FFFFFF',0),
  lute:()=>T('rotate(16)',LL('M0-30V-62','#7A4A2E',5.4)+E(0,-14,17,20,G('#C9743F'))+C(0,-16,5.4,INK,0)+L('M-3-58V-2M3-58V-2','#FFF6E0',1)+Rc(-5,-68,10,8,2,G('#7A4A2E'),2.2)),
  pillow:()=>T('rotate(-6)',Rc(-22,-44,46,36,13,G('#F6D8EE'))+C(-22,-44,3.6,G('#F06BAE'),1.8)+C(24,-44,3.6,G('#F06BAE'),1.8)+C(-22,-8,3.6,G('#F06BAE'),1.8)+C(24,-8,3.6,G('#F06BAE'),1.8)),
  book:()=>P('M-24-34Q-12-42 0-34Q12-42 24-34V0Q12-8 0 0Q-12-8-24 0Z',G('#FFF6E0'))+L('M0-34V0',INK,2.4)+L('M-18-28Q-10-32-5-28M-18-20Q-10-24-5-20M5-28Q10-32 18-28M5-20Q10-24 18-20','#B8A88A',1.8)+spark(10,-48,5,GOLD),
  scythe:()=>T('rotate(8)',LL('M0 22L4-72','#4A3A6A',4.6)+P('M4-72C-18-86-52-76-60-46C-42-62-20-64 3-56Z',G('#DDE0F4'))+L('M-2-68C-20-74-40-68-50-54','#FFFFFF',1.8)),
  star:()=>T('translate(0 -16)',P('M0-20L6-6L20 0L6 6L0 20L-6 6L-20 0L-6-6Z',G(STEEL))+C(0,0,3.4,INK,0)),
  anchor:()=>T('rotate(10)',LL('M0 18V-40','#5A6A88',5)+C(0,-47,6.5,'none',0,`stroke="${INK}" stroke-width="4.4"`)+C(0,-47,6.5,'none',0,`stroke="#8A96B0" stroke-width="2.2"`)+LL('M-13-28H13','#5A6A88',4)+LL('M-22-6Q-18 16 0 18Q18 16 22-6','#5A6A88',5)),
  saber:()=>T('rotate(14)',P('M-4-6C-16-30-10-56 8-68C2-46 4-24 6-6Z',G('#EEF2FB'))+P('M-11-7H13Q13 7 1 7Q-11 7-11-7Z',G(GOLD),2.4)+Rc(-3,-3,6,14,2,'#7A4A2E',2.2)),
  harpoon:()=>T('rotate(10)',LL('M0 20V-56','#8A96B0',3.8)+P('M0-78L10-56L2-59V-52H-2V-59L-10-56Z',G(STEEL))),
  scepter:()=>T('rotate(10)',LL('M0 20V-42',GOLD,4.4)+P('M-11-44L-14-60L-5-53L0-64L5-53L14-60L11-44Z',G(GOLD))+C(0,-48,4,G(RED),2)),
  bow:()=>T('scale(-1,1) rotate(20)',LL('M-2-42Q-30 0-2 42',WOOD,4.2)+L('M-2-42L10 0L-2 42','#FFF6E0',1.5)+LL('M10 0H-24','#C9743F',2.2)+P('M-34 0L-22-6V6Z',G(STEEL),2)+P('M10 0L18-5V5Z',G(RED),1.6)),
};
const OFF={
  shield:p=>P('M-18-24Q0-31 18-24L18 2Q16 22 0 33Q-16 22-18 2Z',G(p.c||'#5B7CFA'))+P('M-11-17Q0-22 11-17L11 1Q9 15 0 24Q-9 15-11 1Z',mix(p.c||'#5B7CFA','#FFFFFF',.28),0)+P('M0-12L3-3L12-3L5 3L8 12L0 6L-8 12L-5 3L-12-3L-3-3Z',GOLD,1.6),
  battery:()=>Rc(-17,-28,34,54,7,G(GOLD))+Rc(-6,-35,12,8,2,G('#6E6E86'),2.4)+P('M3-20L-9 2H-1L-4 18L10-6H1Z','#2A1B3D',0),
  dagger:()=>T('rotate(-16)',P('M-4-6V-30L0-40L4-30V-6Z',G('#E8EDF9'))+Rc(-9,-8,18,5,2.4,G(GOLD),2.2)+Rc(-2.6,-3,5.2,11,2,'#3A3550',2)),
  flask:()=>T('translate(-4 2)',P('M-5-28H5V-20L14-4Q16 4 8 4H-8Q-16 4-14-4L-5-20Z',G('#FFD9EE'))+P('M-10-6H10L12-1Q13 3 8 3H-8Q-13 3-12-1Z',G('#F06BAE'),0)+Rc(-6,-34,12,7,2,G('#C9743F'),2)),
};
/* the shared hamster */
const HEAD=sm([[6,-150],[44,-142],[64,-114],[68,-88],[46,-65],[8,-57],[-32,-63],[-54,-86],[-52,-114],[-30,-142]]);
const TORSO=sm([[-26,-68],[-42,-44],[-44,-18],[-24,-4],[8,-1],[38,-5],[50,-20],[48,-46],[34,-68],[4,-74]]);
const ARM='M-10,-1A10,10 0 0 1 10,-1C12,10 13,20 12,30A12.5,12.5 0 1 1 -12,30C-13,20 -12,10 -10,-1Z';
const star5=(x,y,r,fill,w=1.6)=>{let d='';for(let i=0;i<10;i++){const a=i/10*6.283-1.571,q=i%2?r*.45:r;d+=(i?'L':'M')+f2(x+Math.cos(a)*q)+','+f2(y+Math.sin(a)*q);}return `<path d="${d}Z" fill="${fill}" ${ln(w)}/>`;};
const zap=(x,y,s,fill='url(#gGold)',w=1.8)=>`<path d="M${x+2*s},${y-11*s}L${x-6*s},${y+1*s}L${x-.5*s},${y+1*s}L${x-3*s},${y+11*s}L${x+6.5*s},${y-2.5*s}L${x+1*s},${y-2.5*s}Z" fill="${fill}" ${ln(w)}/>`;
const tor=(fill)=>`<path d="${TORSO}" fill="${fill}"/>`;
const belt=(y,c='#3E2615',b='url(#gGold)')=>`<path d="M-46,${y}C-14,${y+8} 22,${y+8} 52,${y}" fill="none" stroke="${c}" stroke-width="9"/><rect x="0" y="${y-3}" width="15" height="13" rx="3" fill="${b}" ${ln(2)}/>`;
const skirtOf=(c)=>c;
/* clothes each pet wears when nothing is equipped */
const CLOTH={
  tunic:(c='url(#gLeather)')=>tor(c)+belt(-30)+`<path d="M-24,-72L34,-30" stroke="#5C3A20" stroke-width="7"/>`,
  overalls:(c='url(#gDenim)',s='#F2EFE4')=>tor(s)+`<path d="M-16,-70V-44H34V-70M-44,-30H52V4H-44Z" fill="${c}" stroke="${INK}" stroke-width="2.2"/><path d="M-16,-46H34V-20H-16Z" fill="${c}" stroke="${INK}" stroke-width="2"/><circle cx="-10" cy="-42" r="3" fill="url(#gGold)" ${ln(1.6)}/><circle cx="28" cy="-42" r="3" fill="url(#gGold)" ${ln(1.6)}/><path d="M-2,-34H20V-20H-2Z" fill="none" stroke="${INK}" stroke-width="1.6"/>`,
  vest:(c='url(#gLeather)',s='#F2EFE4')=>tor(s)+`<path d="M-46,-74H-4L4,-4H-46ZM50,-74H18L12,-4H54Z" fill="${c}" stroke="${INK}" stroke-width="2.2"/><circle cx="-1" cy="-40" r="2.4" fill="url(#gGold)"/><circle cx="-1" cy="-22" r="2.4" fill="url(#gGold)"/>`,
  sailor:()=>tor('#FBFBFF')+`<path d="M-30,-72L8,-40L44,-72L52,-54L8,-22L-40,-54Z" fill="url(#gCloth)" stroke="${INK}" stroke-width="2.2"/><path d="M-30,-66L8,-34L44,-66" fill="none" stroke="#fff" stroke-width="2"/><path d="M-46,-14H52V4H-46Z" fill="url(#gCloth)"/>`,
  dress:(c='#FFFFFF',t='#F0506E')=>tor(c)+`<path d="M-46,-14C-14,-6 22,-6 52,-14V4H-46Z" fill="${t}" opacity=".85"/><path d="M4,-46H12V-38H20V-30H12V-22H4V-30H-4V-38H4Z" fill="${t}" stroke="${INK}" stroke-width="1.6"/>`,
  apron:()=>tor('#F2EFF8')+`<path d="M-22,-72H38L46,0H-30Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.2"/><path d="M-10,-22H26V-6H-10Z" fill="#EEE9F6" stroke="${INK}" stroke-width="1.8"/><path d="M-44,-34C-14,-28 22,-28 52,-34" fill="none" stroke="#C9C4DC" stroke-width="4"/>`,
  robe:(c,t='#FFCB4F')=>tor(c)+`<path d="M8,-74V0" stroke="${t}" stroke-width="7"/><path d="M-46,-32C-16,-24 26,-24 52,-32" fill="none" stroke="${t}" stroke-width="5"/>`,
  ninja:()=>tor('#3A3550')+`<path d="M-30,-72L24,-30M44,-72L-10,-30" stroke="#5A5478" stroke-width="5"/><path d="M-46,-26C-14,-18 22,-18 52,-26V-14C22,-6 -14,-6 -46,-14Z" fill="#8A2238" stroke="${INK}" stroke-width="2"/>`,
  tech:(c='url(#gBlue)')=>tor('#E4E8F4')+`<path d="M-46,-72H6L2,-30H-46ZM52,-72H12L16,-30H52Z" fill="${c}" stroke="${INK}" stroke-width="2.2"/><path d="M-46,-24H52V-12H-46Z" fill="#3A3A56"/><rect x="2" y="-27" width="14" height="17" rx="2" fill="url(#gGold)" ${ln(1.8)}/>`,
  coat:(c='#2E2A44',t='#FFCB4F')=>tor(c)+`<path d="M-8,-74L8,-30L24,-74Z" fill="#F2EFE4" stroke="${INK}" stroke-width="2"/><path d="M8,-30V0" stroke="${t}" stroke-width="3"/><circle cx="1" cy="-20" r="2.6" fill="${t}"/><circle cx="1" cy="-8" r="2.6" fill="${t}"/><path d="M-46,-14C-14,-8 22,-8 52,-14" fill="none" stroke="${t}" stroke-width="3.4"/>`,
  lab:()=>tor('#FFFFFF')+`<path d="M8,-74V0" stroke="#C9C4DC" stroke-width="3"/><path d="M-6,-74L8,-46L22,-74Z" fill="#8FE0F0" stroke="${INK}" stroke-width="1.8"/><path d="M-30,-30H-10V-12H-30Z" fill="none" stroke="#B4AEC8" stroke-width="2"/><path d="M-24,-34V-26" stroke="#35D0E0" stroke-width="3"/>`,
  pajama:()=>tor('#D8CCFF')+`<path d="M-46,-60H52M-46,-44H52M-46,-28H52M-46,-12H52" stroke="#A796E8" stroke-width="5"/><circle cx="8" cy="-42" r="2.8" fill="#fff" ${ln(1.4)}/><circle cx="8" cy="-24" r="2.8" fill="#fff" ${ln(1.4)}/>`,
  suit:()=>tor('url(#gYellow)')+`<path d="M-46,-40H52" stroke="#A8761A" stroke-width="3"/><circle cx="-30" cy="-56" r="3" fill="#7A7A92"/><circle cx="38" cy="-56" r="3" fill="#7A7A92"/><path d="M-6,-34H22V-14H-6Z" fill="url(#gSteelD)" stroke="${INK}" stroke-width="2"/>`,
  fur:()=>tor('url(#gLeather)')+`<path d="${sm([[-30,-76],[-12,-62],[8,-68],[28,-62],[46,-76],[54,-56],[34,-50],[8,-54],[-16,-50],[-40,-56]])}" fill="#E8DCC8" stroke="${INK}" stroke-width="2.2"/><path d="M-44,-20H52" stroke="#3E2615" stroke-width="9"/><circle cx="8" cy="-20" r="7" fill="url(#gSteel)" ${ln(2)}/>`,
  samurai:()=>tor('#B8324B')+`<path d="M-30,-72L8,-34L44,-72" fill="none" stroke="#F4E6C8" stroke-width="8"/><path d="M-46,-24H52V-12H-46Z" fill="#2A1B3D"/><path d="M-46,-40H52M-46,-52H52" stroke="#8A2238" stroke-width="2.4"/><path d="M-46,-12V4H52V-12" fill="#8A2238"/>`,
  bard:()=>tor('#F06BAE')+`<path d="M-30,-72L8,-40L44,-72" fill="none" stroke="#FFF2C8" stroke-width="8"/><path d="M-46,-22C-14,-14 22,-14 52,-22" fill="none" stroke="#FFCB4F" stroke-width="5"/>`,
  tux:()=>tor('#2A2640')+`<path d="M-6,-74L8,-26L22,-74Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2"/><path d="M0,-66L8,-60L16,-66V-54L8,-60L0,-54Z" fill="url(#gRed)" ${ln(1.6)}/><circle cx="8" cy="-42" r="1.8" fill="#2A1B3D"/><circle cx="8" cy="-34" r="1.8" fill="#2A1B3D"/>`,
  jacket:()=>tor('url(#gLeather)')+`<path d="${sm([[-30,-76],[-8,-60],[8,-66],[24,-60],[46,-76],[50,-58],[8,-50],[-34,-58]])}" fill="#F0E2C8" stroke="${INK}" stroke-width="2.2"/><path d="M8,-52V0" stroke="#3E2615" stroke-width="3"/>`,
  royal:(c='#B8324B')=>tor(c)+`<path d="M-30,-74L8,-26L44,-74" fill="none" stroke="#FFF6E5" stroke-width="10"/><path d="M-46,-12C-14,-4 22,-4 52,-12V6H-46Z" fill="#FFF6E5"/><circle cx="-20" cy="-4" r="2" fill="#2A1B3D"/><circle cx="8" cy="0" r="2" fill="#2A1B3D"/><circle cx="34" cy="-3" r="2" fill="#2A1B3D"/><path d="M8,-26V-6" stroke="#FFCB4F" stroke-width="4"/>`,
  sash:(c='#FFFFFF',t='#FFCB4F')=>tor(c)+`<path d="M-30,-72L44,-16" stroke="${t}" stroke-width="10"/><path d="M-46,-16C-14,-8 22,-8 52,-16V6H-46Z" fill="${t}" opacity=".45"/>`,
};
/* GEAR, the same pieces in the Inventory and on the pet. Weapons have their grip at 0,0 and point up */
const wizHat=(cloth,trim,gem,emblem)=>`<g><path d="M-34,-128C-30,-160 -24,-186 -50,-214C-20,-210 2,-192 16,-168C28,-150 38,-138 46,-126Z" fill="${cloth}" ${ln(3)}/><path d="M-30,-150C-12,-146 22,-146 38,-138" fill="none" stroke="${trim}" stroke-width="7" stroke-linecap="round"/><path d="M-58,-124C-24,-138 42,-140 76,-120C52,-110 -32,-108 -58,-124Z" fill="${cloth}" ${ln(3)}/><path d="M-48,-124C-20,-132 40,-134 66,-120" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/>${emblem}<circle cx="-50" cy="-213" r="6.5" fill="${gem}" ${ln(2)}/></g>`;
const SHOULDER={steel:'url(#gSteel)',gold:'url(#gGold)',leather:'url(#gLeather)',denim:'url(#gDenim)'};
const GEAR={
  /* Knight */
  hat_knight:{slot:'hat',set:'knight',n:'Knight Helm',ears:false,art:`<g data-p="plume"><path d="M2,-162C-14,-196 -50,-206 -78,-186C-66,-186 -58,-180 -54,-172C-44,-176 -30,-172 -18,-158Z" fill="url(#gRed)" ${ln(3)}/><path d="M-6,-172C-22,-190 -44,-192 -62,-184" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round"/></g><path d="${sm([[-58,-104],[-58,-136],[-30,-160],[8,-168],[46,-160],[70,-134],[72,-104],[56,-112],[8,-122],[-42,-114]])}" fill="url(#gSteel)" ${ln(3.2)}/><path d="M6,-167C2,-150 2,-134 6,-120" fill="none" stroke="#6E7699" stroke-width="3" stroke-linecap="round"/><path d="M12,-166C8,-150 8,-134 12,-120" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/><path d="M-54,-118C-22,-132 36,-134 70,-116L72,-104C40,-122 -24,-120 -58,-104Z" fill="url(#gGold)" ${ln(2.6)}/><circle cx="-34" cy="-118" r="2.6" fill="#7A4D10"/><circle cx="-6" cy="-124" r="2.6" fill="#7A4D10"/><circle cx="24" cy="-124" r="2.6" fill="#7A4D10"/><circle cx="52" cy="-118" r="2.6" fill="#7A4D10"/><path d="M-42,-146C-26,-156 -8,-160 -2,-160" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3.4" stroke-linecap="round"/>`},
  armor_knight:{slot:'armor',set:'knight',n:'Knight Plate',shoulder:'steel',art:tor('url(#gSteel)')+`<path d="M8,-74L8,-4" stroke="#6E7699" stroke-width="3"/><path d="M13,-74L13,-4" stroke="#fff" stroke-opacity=".7" stroke-width="2"/><path d="M-44,-34C-16,-26 26,-26 52,-34L52,-14C26,-8 -16,-8 -44,-14Z" fill="url(#gCloth)" stroke="${INK}" stroke-width="2.4"/><path d="M-34,-60C-20,-68 -8,-70 2,-70" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-opacity=".9"/><circle cx="-26" cy="-44" r="2.8" fill="#596080"/><circle cx="36" cy="-44" r="2.8" fill="#596080"/>${star5(10,-22,7.5,'url(#gGold)')}`},
  weapon_knight:{slot:'weapon',set:'knight',n:'Knight Sword',len:92,rest:[-58,114],art:`<path d="M-8,-14L-8,-82L0,-98L8,-82L8,-14Z" fill="url(#gBlade)" ${ln(2.8)}/><path d="M0,-92V-16" stroke="#7C84A8" stroke-width="2.6"/><path d="M2,-92V-16" stroke="#fff" stroke-width="1.2"/><path d="M-22,-18C-14,-14 -8,-13 0,-13C8,-13 14,-14 22,-18L24,-10C12,-5 -12,-5 -24,-10Z" fill="url(#gGold)" ${ln(2.6)}/><circle cy="-11" r="4.6" fill="url(#gGemB)" ${ln(1.8)}/><rect x="-4" y="-6" width="8" height="20" rx="2" fill="url(#gBlue)" ${ln(2)}/><path d="M-4,0H4M-4,6H4" stroke="#14205C" stroke-width="1.4"/><circle cy="17" r="5" fill="url(#gGold)" ${ln(2.2)}/>`},
  charm_knight:{slot:'charm',set:'knight',n:'Knight Crest',chain:'#FFCB4F',art:`<path d="M0,0L13,4C13,17 8,24 0,29C-8,24 -13,17 -13,4Z" fill="url(#gBlue)" ${ln(2.4)}/><path d="M0,7V24M-7,13H7" stroke="#FFE9A0" stroke-width="2.4" stroke-linecap="round"/>`},
  /* Thunder */
  hat_thunder:{slot:'hat',set:'thunder',n:'Thunder Helm',ears:false,art:`<path d="M-48,-126C-78,-132 -96,-158 -90,-190C-78,-172 -62,-160 -38,-150Z" fill="url(#gSteel)" ${ln(3)}/><path d="M-60,-140C-74,-150 -82,-164 -84,-176" fill="none" stroke="#fff" stroke-width="2.4" stroke-opacity=".85" stroke-linecap="round"/><path d="M60,-126C90,-132 106,-158 100,-190C88,-172 72,-160 48,-150Z" fill="url(#gSteelD)" ${ln(3)}/><path d="${sm([[-56,-106],[-56,-136],[-28,-160],[8,-166],[44,-160],[70,-136],[70,-106],[50,-116],[8,-124],[-36,-116]])}" fill="url(#gGold)" ${ln(3.2)}/><path d="M-44,-140C-30,-152 -12,-158 2,-160" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3.4" stroke-linecap="round"/><path d="M-52,-118C-20,-132 36,-134 66,-118L68,-106C36,-122 -22,-120 -56,-106Z" fill="url(#gBlue)" ${ln(2.6)}/>${zap(8,-146,1.75)}<circle cx="8" cy="-124" r="6" fill="url(#gGemB)" ${ln(2)}/>`},
  armor_thunder:{slot:'armor',set:'thunder',n:'Storm Plate',shoulder:'gold',cape:'url(#gCloth)',art:tor('url(#gBlue)')+`<path d="M-44,-16C-14,-8 26,-8 52,-16L52,0L-44,0Z" fill="url(#gGold)" stroke="${INK}" stroke-width="2.4"/><path d="M-22,-74C-16,-54 -4,-42 8,-36C20,-42 30,-54 36,-74" fill="none" stroke="url(#gGold)" stroke-width="7"/>${zap(8,-20,1.2)}<path d="M-36,-46C-30,-54 -24,-58 -18,-60" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3.4" stroke-linecap="round"/>`},
  weapon_thunder:{slot:'weapon',set:'thunder',n:'Thunder Hammer',len:112,rest:[-74,134],art:`<rect x="-5" y="-84" width="10" height="110" rx="4" fill="url(#gWood)" ${ln(2.6)}/><path d="M-5,-16H5M-5,-8H5M-5,0H5" stroke="#FFD76A" stroke-width="2.6"/><path d="M-40,-122H40C46,-108 46,-92 40,-78H-40C-46,-92 -46,-108 -40,-122Z" fill="url(#gGold)" ${ln(3.2)}/><rect x="-46" y="-116" width="14" height="32" rx="4" fill="url(#gSteel)" ${ln(2.6)}/><rect x="32" y="-116" width="14" height="32" rx="4" fill="url(#gSteelD)" ${ln(2.6)}/>${zap(0,-100,1.7,'url(#gBlue)')}<path d="M-28,-116C-14,-119 10,-119 26,-116" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-linecap="round"/><circle cy="29" r="6" fill="url(#gGold)" ${ln(2.4)}/>`},
  charm_thunder:{slot:'charm',set:'thunder',n:'Storm Charm',chain:'#FFCB4F',art:`<circle cy="14" r="14" fill="url(#gBlue)" ${ln(2.4)}/>${zap(0,14,.95)}`},
  /* Wizard */
  hat_wizard:{slot:'hat',set:'wizard',n:'Wizard Hat',ears:false,art:wizHat('url(#gPurple)','#FFCB4F','url(#gGold)',star5(8,-168,9,'url(#gGold)'))},
  armor_wizard:{slot:'armor',set:'wizard',n:'Wizard Robe',skirt:'url(#gPurple)',art:tor('url(#gPurple)')+`<path d="M8,-74L8,0" stroke="#FFCB4F" stroke-width="7"/><path d="M-44,-32C-16,-24 26,-24 52,-32" fill="none" stroke="#FFCB4F" stroke-width="5"/>${star5(-20,-50,5,'#FFE9A0',1)}${star5(34,-52,4,'#FFE9A0',1)}${star5(-24,-14,4,'#FFE9A0',1)}${star5(36,-14,5,'#FFE9A0',1)}`},
  weapon_wizard:{slot:'weapon',set:'wizard',n:'Moon Staff',len:128,rest:[-58,92],art:`<circle cy="-118" r="30" fill="url(#gGlowP)"/><path d="M-3,30C-5,0 -3,-40 -4,-92L5,-92C4,-40 6,0 4,30Z" fill="url(#gWood)" ${ln(2.6)}/><path d="M-4,-60C-1,-56 2,-56 5,-60M-4,-30C-1,-26 2,-26 4,-30" fill="none" stroke="#5A3820" stroke-width="1.8"/><path d="M-14,-92C-20,-120 -2,-142 18,-140C4,-132 -2,-116 4,-100C8,-94 10,-92 14,-92C4,-86 -8,-86 -14,-92Z" fill="url(#gGold)" ${ln(2.8)}/><circle cx="8" cy="-116" r="10" fill="url(#gGemP)" ${ln(2.2)}/><circle cx="5" cy="-120" r="2.6" fill="#fff"/>`},
  charm_wizard:{slot:'charm',set:'wizard',n:'Moon Charm',chain:'#C7AEFF',art:`<circle cy="14" r="14" fill="url(#gGemP)" ${ln(2.4)}/><path d="M4,5A10,10 0 1 0 4,23A8,8 0 1 1 4,5Z" fill="#FFE9A0" ${ln(1.2)}/>`},
  /* Miner */
  hat_miner:{slot:'hat',set:'miner',n:'Miner Helmet',ears:false,art:`<path d="${sm([[-60,-108],[-58,-138],[-28,-162],[8,-170],[46,-162],[72,-136],[74,-108],[54,-116],[8,-124],[-40,-116]])}" fill="url(#gYellow)" ${ln(3.2)}/><path d="M8,-169V-122" stroke="#C98A1A" stroke-width="7"/><path d="M-62,-108C-24,-126 40,-126 78,-106C82,-100 76,-98 70,-100C36,-116 -20,-116 -54,-100C-60,-98 -66,-102 -62,-108Z" fill="url(#gYellow)" ${ln(2.8)}/><rect x="-6" y="-160" width="28" height="19" rx="6" fill="url(#gSteelD)" ${ln(2.6)}/><circle cx="8" cy="-150" r="22" fill="url(#gGlowY)"/><circle cx="8" cy="-150" r="10" fill="url(#gGemY)" ${ln(2.2)}/><circle cx="5" cy="-153" r="2.8" fill="#fff"/><path d="M-44,-146C-34,-154 -24,-158 -14,-160" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3.4" stroke-linecap="round"/>`},
  armor_miner:{slot:'armor',set:'miner',n:'Miner Overalls',shoulder:'leather',art:CLOTH.overalls('url(#gDenim)','#E8C8A0')+`<path d="M-46,-8H52" stroke="#2C4E8C" stroke-width="3" stroke-dasharray="6 5"/>`},
  weapon_miner:{slot:'weapon',set:'miner',n:'Miner Pick',len:88,rest:[-58,112],art:`<rect x="-5" y="-84" width="10" height="108" rx="4" fill="url(#gWood)" ${ln(2.6)}/><path d="M-5,-10H5M-5,-2H5" stroke="#3E2615" stroke-width="2.4"/><path d="M-58,-66C-32,-98 32,-98 58,-66C32,-82 -32,-82 -58,-66Z" fill="url(#gSteel)" ${ln(3)}/><rect x="-9" y="-96" width="18" height="24" rx="3" fill="url(#gSteelD)" ${ln(2.6)}/><path d="M-40,-78C-22,-90 -6,-92 6,-92" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-opacity=".85"/>`},
  charm_miner:{slot:'charm',set:'miner',n:'Gold Nugget',chain:'#C8915A',art:`<path d="${sm([[0,0],[13,5],[15,18],[6,27],[-8,26],[-15,14],[-10,3]])}" fill="url(#gGold)" ${ln(2.4)}/><path d="M-5,8L3,6M6,14L9,18M-6,18L-1,21" stroke="#A96D14" stroke-width="2" stroke-linecap="round"/><circle cx="-4" cy="7" r="2.4" fill="#fff" opacity=".85"/>`},
  /* Hunter */
  hat_hunter:{slot:'hat',set:'hunter',n:'Hunter Cap',ears:false,art:`<path d="M34,-158C50,-192 76,-204 96,-206C94,-182 78,-160 54,-148Z" fill="url(#gRed)" ${ln(3)}/><path d="M42,-156C56,-178 72,-192 90,-200" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><path d="${sm([[-58,-110],[-56,-138],[-26,-160],[14,-164],[58,-150],[100,-122],[66,-122],[62,-108],[8,-122],[-38,-116]])}" fill="url(#gGreen)" ${ln(3.2)}/><path d="M-54,-118C-20,-132 30,-134 62,-112L60,-104C30,-124 -22,-122 -56,-108Z" fill="#1F6F48" ${ln(2.4)}/><path d="M-40,-144C-28,-152 -14,-156 0,-158" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3.2" stroke-linecap="round"/>`},
  armor_hunter:{slot:'armor',set:'hunter',n:'Hunter Leather',shoulder:'leather',art:tor('url(#gLeather)')+`<path d="M-30,-72L44,-14M44,-72L-30,-14" stroke="#3E2615" stroke-width="7"/><circle cx="8" cy="-44" r="7" fill="url(#gGemG)" ${ln(2)}/><path d="M-46,-14C-14,-6 22,-6 52,-14V4H-46Z" fill="url(#gGreen)" stroke="${INK}" stroke-width="2.2"/>`},
  weapon_hunter:{slot:'weapon',set:'hunter',n:'Hunter Bow',len:58,rest:[-82,107],aim:90,fire:92,kind:'shoot',art:`<g transform="translate(22,2) scale(-.72,.72)"><path d="M4,-82C-36,-50 -36,50 4,82C-22,50 -22,-50 4,-82Z" fill="url(#gWood)" ${ln(2.8)}/><path d="M4,-80L18,0L4,80" fill="none" stroke="#FFF6E0" stroke-width="2"/><path d="M18,0H-52" stroke="#8F5E36" stroke-width="4"/><path d="M-64,0L-48,-8V8Z" fill="url(#gSteel)" ${ln(2.2)}/><path d="M18,0L28,-7V7Z" fill="url(#gRed)" ${ln(2)}/></g>`},
  charm_hunter:{slot:'charm',set:'hunter',n:'Beast Fang',chain:'#8F5E36',art:`<path d="M-8,2C-10,14 -6,24 2,32C6,22 10,12 8,2C4,-1 -4,-1 -8,2Z" fill="#FFF6E0" ${ln(2.4)}/><path d="M-3,6C-4,14 -2,20 1,25" fill="none" stroke="#C9B890" stroke-width="2"/>`},
  /* Nurse */
  hat_nurse:{slot:'hat',set:'nurse',n:'Nurse Cap',ears:true,art:`<path d="M-30,-128C-28,-152 -8,-164 8,-164C24,-164 46,-152 48,-128C20,-138 -4,-138 -30,-128Z" fill="url(#gWhite)" ${ln(3)}/><path d="M-34,-126C-4,-140 24,-140 52,-126L50,-116C24,-128 -4,-128 -32,-116Z" fill="#F7B9C8" ${ln(2.4)}/><path d="M4,-156H14V-148H22V-138H14V-130H4V-138H-4V-148H4Z" fill="url(#gRed)" ${ln(2)}/>`},
  armor_nurse:{slot:'armor',set:'nurse',n:'Nurse Dress',skirt:'url(#gWhite)',art:CLOTH.dress('url(#gWhite)','#F0506E')},
  weapon_nurse:{slot:'weapon',set:'nurse',n:'Heart Staff',len:104,rest:[-58,118],art:`<path d="M-3.5,30L-3.5,-68L3.5,-68L3.5,30Z" fill="#F7B9C8" ${ln(2.4)}/><path d="M-3.5,-40L3.5,-32M-3.5,-14L3.5,-6M-3.5,12L3.5,20" stroke="#F0506E" stroke-width="2.4"/><circle cy="-92" r="34" fill="url(#gGlowR)"/><path d="M0,-66C-34,-88 -26,-120 0,-104C26,-120 34,-88 0,-66Z" fill="url(#gRed)" ${ln(3)}/><path d="M-14,-102C-18,-96 -16,-90 -12,-86" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`},
  charm_nurse:{slot:'charm',set:'nurse',n:'Heart Locket',chain:'#F7B9C8',art:`<path d="M0,30C-22,14 -16,-4 0,6C16,-4 22,14 0,30Z" fill="url(#gRed)" ${ln(2.4)}/><path d="M-8,8C-10,12 -9,16 -6,18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`},
};
const SET_OF=Object.keys(GEAR);
/* what each pet wears with nothing equipped: hat, clothes, tool, off hand, back, face, eyes. hs moves and scales old hats */
const FUR={golden:['#F2A94E','#FFF1D6'],cream:['#F5DDB4','#FFFBF2'],white:['#E8E2EE','#FFFFFF'],gray:['#BDB8CF','#F2F0F8'],brown:['#B57F58','#F3DFC8'],black:['#57506E','#BDB7D0'],ginger:['#E8833A','#FFE6CC'],blue:['#8FB0EC','#EAF2FF'],pink:['#F3A6C4','#FFF0F6'],mint:['#86D9B8','#EFFFF7'],purple:['#A78BDA','#F3ECFF'],yellow:['#F8D24E','#FFF9D8'],ice:['#CBE6F7','#FFFFFF']};
const IRIS={seed:['#5FE08F','#127A45'],dream:['#FF8AC4','#A02372'],spark:['#FFD84D','#B56F08'],water:['#4FDDEF','#0F6FA6'],steel:['#8FB0FF','#2C4694']};
const AURA={l:{ring:'#FFD94D',ring2:'#FFF6BE',glow:'gGlowY'}};
/* holds a short thing upright beside the body: d along the arm, a is the rest angle it cancels */
const held=(d,a,sc,cx,cy)=>`translate(0,${-d}) rotate(${-a}) scale(${sc}) translate(${-cx},${-cy})`;
const PETS={
  blade:{el:'steel',rar:'n',fur:'golden',cap:{gear:'band',c:'#E8434F'},cloth:['tunic'],tool:['sword',{len:96}],eyes:'normal'},
  archer:{el:'seed',rar:'n',fur:'cream',cap:{old:'archer',noEars:1},cloth:['tunic','url(#gGreen)'],tool:['bow',{len:62,kind:'shoot',rest:[-82,107],aim:70,fire:112,at:'translate(22,2) scale(1.35)'}],back:'quiver',eyes:'flat'},
  farmer:{el:'seed',rar:'n',fur:'golden',cap:{old:'straw',noEars:1},cloth:['overalls'],tool:['fork',{len:96}],eyes:'happy'},
  dozer:{el:'dream',rar:'n',fur:'cream',cap:{old:'night',noEars:1},cloth:['pajama'],tool:['pillow',{len:70,rest:[-58,138],at:held(44,70,1.4,1,-26)}],eyes:'sleepy',scale:1.08},
  sparky:{el:'spark',rar:'n',fur:'yellow',cap:{old:'goggles'},cloth:['vest','#E8A92F'],tool:['bolt',{len:96,kind:'cast',rest:[-58,112]}],eyes:'wink'},
  sailor:{el:'water',rar:'n',fur:'cream',cap:{old:'sailor'},cloth:['sailor'],tool:['anchor',{len:94,rest:[-58,118],at:'translate(0,-20) scale(1.5)'}],eyes:'normal'},
  knight:{el:'steel',rar:'r',fur:'gray',cap:{gear:'hat_knight'},cloth:{gear:'armor_knight'},tool:{gear:'weapon_knight'},off:['shield',{c:'#3F73E6'}],eyes:'normal',scale:1.1},
  miner:{el:'seed',rar:'r',fur:'brown',cap:{gear:'hat_miner'},cloth:{gear:'armor_miner'},tool:{gear:'weapon_miner'},eyes:'happy'},
  engineer:{el:'steel',rar:'r',fur:'gray',cap:{old:'goggles'},cloth:['vest','#5A6A88'],tool:['wrench',{len:88}],back:'pack',eyes:'normal'},
  nurse:{el:'seed',rar:'r',fur:'pink',cap:{gear:'hat_nurse'},cloth:{gear:'armor_nurse'},tool:{gear:'weapon_nurse',kind:'cast'},eyes:'happy'},
  chef:{el:'seed',rar:'r',fur:'cream',cap:{old:'chef',noEars:1},cloth:['apron'],tool:['pan',{len:80}],eyes:'wink'},
  hunter:{el:'seed',rar:'r',fur:'brown',cap:{old:'cowboy',noEars:1},cloth:['vest'],tool:['sling',{len:74,kind:'shoot',rest:[-40,85],at:'translate(0,-6) scale(2)'}],eyes:'flat'},
  wizard:{el:'dream',rar:'r',fur:'purple',cap:{gear:'hat_wizard'},cloth:{gear:'armor_wizard'},tool:{gear:'weapon_wizard',kind:'cast'},eyes:'sleepy'},
  shade:{el:'dream',rar:'r',fur:'black',cap:{gear:'band',c:'#3A3550'},cloth:['ninja'],tool:['star',{len:40,kind:'shoot',rest:[-58,138],at:'translate(0,-40) scale(1.35) translate(0,16)'}],off:['dagger'],face:'mask',eyes:'angry'},
  gunner:{el:'spark',rar:'r',fur:'gray',cap:{gear:'band',c:'#3F73E6'},cloth:['tech'],tool:['gun',{len:84,kind:'shoot',rest:[-82,82],aim:90,at:'translate(20,18) scale(1.5)'}],eyes:'flat'},
  electrician:{el:'spark',rar:'r',fur:'golden',cap:{old:'miner',noEars:1},cloth:['overalls','url(#gYellow)','#4C78BE'],tool:['bolt',{len:96,kind:'cast',rest:[-58,112]}],off:['battery'],eyes:'flat'},
  pirate:{el:'water',rar:'r',fur:'brown',cap:{old:'tricorn',noEars:1},cloth:['coat','#7A1F3D'],tool:['saber',{len:96}],face:'patch',eyes:'flat'},
  alchemist:{el:'water',rar:'r',fur:'blue',cap:{old:'goggles'},cloth:['lab'],tool:['flask',{len:60,kind:'cast',rest:[-58,148],at:held(44,90,1.25,0,-23)}],off:['flask'],eyes:'wink'},
  diver:{el:'water',rar:'r',fur:'golden',cap:{old:'dive'},cloth:['suit'],tool:['harpoon',{len:110}],back:'tank',eyes:'normal'},
  viking:{el:'steel',rar:'e',fur:'ginger',cap:{old:'viking',noEars:1},cloth:['fur'],tool:['axe',{len:80}],face:'beard',eyes:'angry',scale:1.06},
  samurai:{el:'steel',rar:'e',fur:'white',cap:{old:'kabuto',noEars:1},cloth:['samurai'],tool:['katana',{len:108}],eyes:'flat',scale:1.03},
  druid:{el:'seed',rar:'e',fur:'mint',cap:{old:'leaf'},cloth:['robe','url(#gGreen)','#FFCB4F'],skirt:'url(#gGreen)',tool:['leaf',{len:120,kind:'cast'}],cape:'url(#gGreen)',eyes:'normal',scale:1.03},
  singer:{el:'dream',rar:'e',fur:'pink',cap:{old:'beret'},cloth:['bard'],tool:['lute',{len:96,kind:'cast',rest:[-58,100]}],eyes:'happy',scale:1.03},
  priest:{el:'dream',rar:'e',fur:'white',cap:{old:'halo'},cloth:['sash','url(#gWhite)','#FFCB4F'],skirt:'url(#gWhite)',tool:['book',{len:50,kind:'cast',rest:[-58,148],at:held(40,90,1.35,0,-20)}],back:'wings',eyes:'happy',scale:1.03},
  magician:{el:'dream',rar:'e',fur:'blue',cap:{old:'tophat'},cloth:['tux'],tool:['wand',{len:78,kind:'cast',rest:[-58,118]}],cape:'url(#gPurple)',eyes:'wink',scale:1.03},
  bomber:{el:'spark',rar:'e',fur:'ginger',cap:{old:'aviator',noEars:1},cloth:['jacket'],tool:['bomb',{len:52,kind:'shoot',rest:[-58,128],at:held(48,70,1.4,2,-16)}],face:'scarf',faceC:'#F0506E',eyes:'happy',scale:1.03},
  icemage:{el:'water',rar:'e',fur:'ice',cap:{hat:'ice'},cloth:{ice:1},skirt:'url(#gIceB)',tool:{ice:1,kind:'cast'},charm:'ice',eyes:'normal',scale:1.05,motes:'#BFF3FF'},
  king:{el:'steel',rar:'l',fur:'golden',cap:{old:'crown'},cloth:['royal'],skirt:'#B8324B',tool:['scepter',{len:96,kind:'cast',rest:[-58,112]}],cape:'url(#gRed)',eyes:'happy',scale:1.18},
  squeektoshi:{el:'seed',rar:'l',fur:'white',squeek:1,back:'wheel',eyes:'star',scale:1.1,noTool:1},
  sandman:{el:'dream',rar:'l',fur:'purple',cap:{old:'hoodF',c:'#3A2A6A',noEars:1},cloth:['robe','#3A2A6A','#F06BAE'],skirt:'#3A2A6A',tool:['scythe',{len:120}],back:'hood',backC:'#3A2A6A',eyes:'angry',scale:1.18},
  thor:{el:'spark',rar:'l',fur:'yellow',cap:{gear:'hat_thunder'},cloth:{gear:'armor_thunder'},tool:{gear:'weapon_thunder'},charm:'thunder',eyes:'angry',scale:1.2},
  poseidon:{el:'water',rar:'l',fur:'blue',cap:{old:'crown'},cloth:['sash','url(#gIceB)','#FFCB4F'],skirt:'url(#gIceB)',tool:['trident',{len:124,kind:'cast',rest:[-58,104]}],cape:'url(#gCloth)',eyes:'angry',scale:1.18},
};
/* pieces only the Ice Mage wears */
const ICE_HAT=wizHat('url(#gIceB)','#F2FEFF','url(#gGemC)',`<path d="M8,-178V-158M-1,-173L17,-163M17,-173L-1,-163" fill="none" stroke="#F4FFFF" stroke-width="3.2" stroke-linecap="round"/>`);
const ICE_CLOTH=tor('url(#gIceB)')+`<path d="M-44,-16C-14,-8 26,-8 52,-16L52,0L-44,0Z" fill="#F4FFFF" stroke="${INK}" stroke-width="2.2"/><path d="M-30,-72L8,-34L44,-72" fill="none" stroke="#F4FFFF" stroke-width="8"/><path d="M-22,-44V-30M-29,-40L-15,-34M-15,-40L-29,-34" stroke="#F4FFFF" stroke-width="2.2" stroke-linecap="round"/><path d="M34,-42V-28M27,-38L41,-32M41,-38L27,-32" stroke="#F4FFFF" stroke-width="2.2" stroke-linecap="round"/>`;
const ICE_STAFF=`<circle cy="-112" r="32" fill="url(#gGlowC)"/><path d="M-3,30L-4,-90L5,-90L4,30Z" fill="url(#gIceB)" ${ln(2.6)}/><path d="M-4,-40L5,-30M-4,-10L4,0" stroke="#F4FFFF" stroke-width="2"/><path d="M0,-146L13,-116L6,-88L-6,-88L-13,-116Z" fill="url(#gIce)" ${ln(2.8)}/><path d="M0,-146L0,-88M-13,-116L6,-88M13,-116L-6,-88" stroke="#fff" stroke-opacity=".75" stroke-width="1.6"/><path d="M-13,-104L-25,-116L-18,-90L-8,-88Z" fill="url(#gIce)" ${ln(2.2)}/><path d="M13,-104L25,-118L18,-90L8,-88Z" fill="url(#gIceB)" ${ln(2.2)}/>`;
const ICE_CHARM={chain:'#F4FFFF',art:`<path d="M0,0L12,14L0,28L-12,14Z" fill="url(#gIce)" ${ln(2.4)}/><path d="M0,0V28M-12,14H12" stroke="#fff" stroke-opacity=".8" stroke-width="1.4"/>`};
const OLD_HAT=(name,opt)=>T('translate(7,-150) scale(1.75) translate(-60,-38)',HAT[name](opt||{}));
const BACKS={
  quiver:()=>T('translate(-40,-62) rotate(-16)',`<rect x="-11" y="-30" width="22" height="66" rx="7" fill="url(#gLeather)" ${ln(3)}/><path d="M-5,-30V-48M5,-30V-52" stroke="#E8D2A0" stroke-width="3"/><path d="M-5,-48L-10,-60H0ZM5,-52L0,-64H10Z" fill="url(#gRed)" ${ln(2)}/>`),
  pack:()=>`<rect x="-66" y="-68" width="40" height="58" rx="11" fill="url(#gLeather)" ${ln(3)}/><path d="M-58,-52H-34" stroke="#3E2615" stroke-width="3"/><rect x="-56" y="-44" width="20" height="16" rx="3" fill="#E8D2A0" ${ln(2)}/>`,
  tank:()=>`<rect x="-70" y="-90" width="28" height="74" rx="12" fill="url(#gGold)" ${ln(3)}/><rect x="-62" y="-102" width="12" height="14" rx="3" fill="url(#gSteelD)" ${ln(2.4)}/><path d="M-66,-62H-46M-66,-40H-46" stroke="#A96D14" stroke-width="3"/>`,
  wings:()=>`<path d="M-30,-70C-70,-90 -100,-70 -112,-34C-92,-38 -88,-28 -92,-14C-74,-22 -66,-14 -62,-2C-48,-14 -36,-30 -28,-46Z" fill="url(#gWhite)" ${ln(3)}/><path d="M-44,-58C-64,-58 -82,-46 -96,-30M-42,-44C-56,-40 -68,-28 -76,-14" fill="none" stroke="#C9C4DC" stroke-width="2.4"/><path d="M42,-72C78,-92 104,-74 114,-44C96,-46 92,-36 94,-24C78,-32 70,-24 68,-14C56,-24 48,-40 42,-54Z" fill="url(#gWhite)" ${ln(3)}/>`,
  hood:c=>`<path d="${sm([[-72,-60],[-66,-130],[-30,-170],[10,-178],[50,-170],[84,-130],[88,-60],[40,-40],[-30,-40]])}" fill="${c}" ${ln(3.2)}/>`,
  wheel:()=>{let s=`<circle cx="6" cy="-82" r="118" fill="none" stroke="${INK}" stroke-width="17"/><circle cx="6" cy="-82" r="118" fill="none" stroke="url(#gGold)" stroke-width="10"/><circle cx="6" cy="-82" r="96" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="6" cy="-82" r="96" fill="none" stroke="#FFF2C8" stroke-width="3.4"/>`;for(let a=0;a<180;a+=45)s+=`<g transform="rotate(${a} 6 -82)"><path d="M-112,-82H124" stroke="${INK}" stroke-width="8"/><path d="M-112,-82H124" stroke="#FFD76A" stroke-width="3.6"/></g>`;for(let a=0;a<360;a+=60)s+=`<g transform="rotate(${a} 6 -82)"><path d="M6,-214L10,-204L20,-200L10,-196L6,-186L2,-196L-8,-200L2,-204Z" fill="#FFF6C9" ${ln(2)}/></g>`;return `<g data-p="wheel">${s}</g>`;},
};
const FACE={
  mask:()=>`<path d="${sm([[-60,-96],[0,-100],[72,-100],[76,-50],[8,-44],[-60,-50]])}" fill="#3A3550"/><path d="M-50,-96C-16,-102 34,-102 66,-96" fill="none" stroke="#5A5478" stroke-width="3"/>`,
  patch:()=>`<path d="M-54,-118L62,-88" stroke="${INK}" stroke-width="3.4"/><path d="${sm([[-22,-116],[0,-114],[2,-96],[-10,-90],[-22,-98]])}" fill="#1A1228" ${ln(2.4)}/>`,
  beard:()=>`<path d="${sm([[-42,-82],[-16,-72],[18,-74],[56,-84],[66,-70],[52,-44],[20,-30],[-14,-32],[-40,-50]])}" fill="url(#gLeather)" ${ln(2.8)}/><path d="M-20,-60L-16,-46M0,-60L2,-40M22,-60L22,-42M40,-62L36,-50" stroke="#5C3A20" stroke-width="2.4" stroke-linecap="round"/>`,
  scarf:c=>`<path d="${sm([[-34,-70],[8,-58],[50,-70],[52,-52],[8,-40],[-36,-52]])}" fill="${c}" ${ln(2.8)}/><path d="M36,-50L58,-16L34,-18L22,-44Z" fill="${c}" ${ln(2.8)}/>`,
};
const paw=c=>`<circle cx="0" cy="31" r="11.5" fill="${c}"/><path d="M-4,41V37M4,41V37" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>`;
let N=0;
/* the markup of a pet, every moving part named */
function hamster(key){
  const d=PETS[key],q=s=>'h'+id+s,id=N++;
  const[fur,belly]=FUR[d.fur]||FUR.golden,fL=mix(fur,'#FFFFFF',.45),fM=fur,fD=mix(fur,'#3A1F4A',.3),wL=mix(belly,'#FFFFFF',.5),wM=belly,wD=mix(belly,'#6A4A6A',.24);
  const iris=IRIS[d.el]||IRIS.steel,glowEye=d.rar==='l';
  const defs=`<defs>${lg(q('h'),[fL,fM,fD],.7,1)}${lg(q('t'),[fL,fM,fD],.6,1)}${lg(q('a'),[fL,fM,fD],.3,1)}${lg(q('w'),[wL,wM,wD],.5,1)}${rg(q('i'),['#FFFFFF',iris[0],iris[1]],.5,.75,.7)}${rg(q('b'),['rgba(255,120,130,.75)','rgba(255,120,130,0)'],.5,.5,.5)}<clipPath id="${q('cH')}"><path d="${HEAD}"/></clipPath><clipPath id="${q('cT')}"><path d="${TORSO}"/></clipPath></defs>`;
  const eye=(p,rx,ry)=>`<g data-p="${p}"><ellipse rx="${rx}" ry="${ry}" fill="#160C26"/><ellipse cx="1.4" cy="2.2" rx="${f2(rx*.74)}" ry="${f2(ry*.76)}" fill="url(#${q('i')})"/><ellipse cx="2" cy="1.4" rx="${f2(rx*.42)}" ry="${f2(ry*.48)}" fill="#120A20"/><circle cx="${f2(-rx*.32)}" cy="${f2(-ry*.42)}" r="${f2(rx*.34)}" fill="#fff"/><circle cx="${f2(rx*.36)}" cy="${f2(ry*.42)}" r="${f2(rx*.16)}" fill="#fff" opacity=".9"/><path d="M${f2(-rx*.92)},${f2(-ry*.42)}A${rx},${ry} 0 0 1 ${f2(rx*.92)},${f2(-ry*.42)}" fill="none" stroke="#160C26" stroke-width="3.4" stroke-linecap="round"/></g>`;
  const skin=`url(#${q('h')})`;
  const lids=d.eyes==='sleepy'?`<path d="M-26,-106C-18,-122 0,-122 6,-106Z" fill="${skin}" ${ln(2.4)}/><path d="M24,-106C30,-122 46,-122 52,-106Z" fill="${skin}" ${ln(2.4)}/>`:d.eyes==='flat'?`<path d="M-26,-108V-122H6V-108Z" fill="${skin}"/><path d="M-26,-108H6" ${ln(3)}/><path d="M24,-108V-122H52V-108Z" fill="${skin}"/><path d="M24,-108H52" ${ln(3)}/>`:'';
  const squeek=d.squeek?`<path d="${sm([[-58,-150],[-4,-156],[0,-126],[-22,-106],[-58,-96]])}" fill="#F2923C"/><path d="${sm([[30,-154],[72,-150],[76,-108],[50,-112],[34,-128]])}" fill="#F2923C"/>`:'';
  const starEye=d.eyes==='star'?`<path d="M-10,-114Q-10,-104 0,-104Q-10,-104 -10,-94Q-10,-104 -20,-104Q-10,-104 -10,-114Z" fill="#FFC94D"/><path d="M37,-114Q37,-104 47,-104Q37,-104 37,-94Q37,-104 27,-104Q37,-104 37,-114Z" fill="#FFC94D"/>`:'';
  return `${defs}
  <g data-p="aura"></g>
  <ellipse data-p="shadow" cx="4" cy="1" rx="60" ry="10" fill="#050310" opacity=".42"/>
  <g data-p="body"><g data-p="parts">
    <g data-p="back"></g>
    <path data-p="cape" d="" fill="none"/>
    <g data-p="tail"><path d="${sm([[-36,-34],[-54,-40],[-60,-30],[-50,-22],[-36,-22]])}" fill="${fM}" ${ln(3)}/></g>
    <g data-p="armB"><path d="${ARM}" fill="${fD}" ${ln(3)}/>${paw(wD)}</g>
    <g data-p="legB"><path d="${sm([[10,-12],[28,-16],[46,-12],[54,-4],[48,2],[16,2],[8,-4]])}" fill="${fD}" ${ln(3)}/><path d="${sm([[34,-11],[46,-9],[54,-3],[48,1],[34,1]])}" fill="${wD}"/></g>
    <g data-p="torso">${inked(TORSO,`url(#${q('t')})`,3)}<g clip-path="url(#${q('cT')})"><path d="${sm([[2,-64],[28,-54],[38,-30],[26,-8],[2,-4],[-16,-12],[-20,-36],[-10,-56]])}" fill="url(#${q('w')})"/><path d="M-10,-44l5,5l5,-5M6,-30l5,5l5,-5M-6,-20l5,5l5,-5M16,-46l5,5l5,-5" fill="none" stroke="${wD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="${sm([[-44,-30],[-30,-6],[8,4],[50,-6],[52,10],[-50,10]])}" fill="${fD}" opacity=".32"/><g data-slot="armor"></g><ellipse cx="6" cy="-76" rx="52" ry="20" fill="#1A0E2E" opacity=".3"/></g><path d="${TORSO}" fill="none" ${ln(3)}/></g>
    <g data-p="skirt"></g>
    <g data-p="legF"><path d="${sm([[-34,-11],[-16,-17],[6,-13],[16,-4],[10,3],[-24,3],[-36,-3]])}" fill="url(#${q('a')})" ${ln(3)}/><path d="${sm([[-2,-12],[10,-9],[16,-3],[10,2],[-4,2]])}" fill="${wM}"/><path d="M4,2V-3M10,2V-2" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/><path d="${sm([[-34,-11],[-16,-17],[6,-13],[16,-4],[10,3],[-24,3],[-36,-3]])}" fill="none" ${ln(3)}/></g>
    <g data-p="chain"></g>
    <g data-p="off"><g data-slot="off"></g></g>
    <g data-p="wF"><g data-slot="weapon"></g></g>
    <g data-p="head">
      <g data-p="earB"><circle cx="44" cy="-146" r="15" fill="${fD}" ${ln(3)}/><circle cx="45" cy="-144" r="8.5" fill="#F5A5B8"/></g>
      <g data-p="earF"><circle cx="-34" cy="-146" r="19" fill="${fM}" ${ln(3)}/><circle cx="-33" cy="-143" r="11" fill="#F5A5B8"/></g>
      <path d="M-4,-149L4,-160L9,-150L17,-158L20,-147Z" fill="${fM}" ${ln(2.6)}/>
      ${inked(HEAD,skin,3.2)}
      <g clip-path="url(#${q('cH')})">${squeek}<path d="${sm([[18,-100],[42,-104],[72,-98],[70,-60],[8,-50],[-44,-60],[-44,-82],[-18,-92],[6,-92]])}" fill="url(#${q('w')})"/><path d="${sm([[11,-96],[8,-120],[14,-136],[20,-120],[25,-96]])}" fill="url(#${q('w')})"/><path d="${sm([[-58,-76],[-40,-58],[10,-50],[56,-58],[76,-80],[80,-40],[-60,-40]])}" fill="${wD}" opacity=".5"/><path d="M-42,-124C-30,-138 -14,-146 2,-148" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-linecap="round"/><ellipse cx="-26" cy="-84" rx="19" ry="12" fill="url(#${q('b')})"/><ellipse cx="54" cy="-84" rx="15" ry="11" fill="url(#${q('b')})"/><g data-slot="faceIn"></g></g>
      <path d="${HEAD}" fill="none" ${ln(3.2)}/>
      <path d="M-46,-82L-62,-86M-44,-74L-60,-72" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".75"/><path d="M62,-82L74,-86M60,-74L72,-72" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>
      <g data-p="eyesOpen">${eye('eyeF',13,15)}${eye('eyeB',11,14.5)}${lids}${starEye}</g>
      <g data-p="eyesHurt" display="none"><path d="M-22,-112L-6,-104L-22,-96M50,-112L34,-104L50,-96" fill="none" ${ln(4)}/></g>
      <g data-p="eyesJoy" display="none"><path d="M-22,-100Q-10,-114 2,-100M26,-100Q37,-114 48,-100" fill="none" ${ln(4.4)}/></g>
      <path data-p="browF" d="M-24,-126Q-12,-132 2,-126" fill="none" stroke="${fD}" stroke-width="4" stroke-linecap="round"/>
      <path data-p="browB" d="M28,-126Q38,-131 50,-126" fill="none" stroke="${fD}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M13,-90C16,-93 23,-93 26,-90C25,-85 22,-83 19.5,-83C17,-83 14,-85 13,-90Z" fill="#E86C86" ${ln(2)}/><circle cx="17" cy="-89" r="1.5" fill="#fff"/>
      <g data-p="mouthC"><path d="M9,-79Q14,-74 19.5,-80Q25,-74 30,-79" fill="none" ${ln(2.4)}/><rect x="15.5" y="-79" width="4" height="6.5" rx="1" fill="#fff" ${ln(1.3)}/><rect x="20" y="-79" width="4" height="6.5" rx="1" fill="#fff" ${ln(1.3)}/></g>
      <g data-p="mouthO" display="none"><path d="M8,-80Q19,-76 31,-80Q30,-62 19.5,-62Q9,-62 8,-80Z" fill="#5C1630" ${ln(2.6)}/><path d="M12,-68Q19,-73 27,-68Q24,-62 19.5,-62Q15,-62 12,-68Z" fill="#F26D8A"/><rect x="15" y="-79.5" width="4" height="5" rx="1" fill="#fff"/><rect x="20" y="-79.5" width="4" height="5" rx="1" fill="#fff"/></g>
      <g data-slot="faceOut"></g>
      <g data-slot="hat"></g>
    </g>
    <g data-p="armF"><path d="${ARM}" fill="url(#${q('a')})" ${ln(3)}/>${paw(wM)}<g data-p="shoulderTop"></g></g>
    <g data-p="charm"><g data-slot="charm"></g></g>
  </g></g>`;
}
/* art for one slot of one pet, either its own piece or an equipped one */
function ownPiece(key,slot){
  const d=PETS[key];
  if(slot==='hat'){const c=d.cap;if(!c)return {art:'',ears:true};if(c.gear==='band')return {art:OLD_HAT('band',{c:c.c}),ears:true};if(c.gear)return GEAR[c.gear];if(c.hat==='ice')return {art:ICE_HAT,ears:false};return {art:OLD_HAT(c.old,{c:c.c}),ears:!c.noEars};}
  if(slot==='armor'){const c=d.cloth;if(!c)return {art:''};if(c.gear)return GEAR[c.gear];if(c.ice)return {art:ICE_CLOTH,skirt:'url(#gIceB)'};return {art:CLOTH[c[0]](c[1],c[2]),skirt:d.skirt,shoulder:d.rar==='l'?'gold':null,cape:d.cape};}
  if(slot==='weapon'){const t=d.tool;if(d.noTool||!t)return null;if(t.gear)return Object.assign({},GEAR[t.gear],t.kind?{kind:t.kind}:{});if(t.ice)return {art:ICE_STAFF,len:128,rest:[-58,92],kind:'cast'};const o=t[1]||{};return {art:T(o.at||'scale(1.5)',TOOL[t[0]]({})),len:o.len||90,rest:o.rest||(o.kind==='shoot'?[-82,96]:o.kind==='cast'?[-58,88]:[-58,96]),kind:o.kind,aim:o.aim,fire:o.fire};}
  if(slot==='charm'){if(d.charm==='ice')return ICE_CHARM;if(d.charm)return GEAR['charm_'+d.charm];return null;}
  if(slot==='off'){if(!d.off)return null;return {art:T('scale(1.45)',OFF[d.off[0]](d.off[1]||{}))};}
  return null;
}
const pieceOf=id=>GEAR[id]||null;
const chainPath=(c)=>`<path d="M-8,-66C2,-52 14,-50 26,-50C30,-50 34,-54 40,-66" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/><path d="M-8,-66C2,-52 14,-50 26,-50C30,-50 34,-54 40,-66" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
const SKIRT='M-44,-22C-48,-8 -54,2 -58,6C-30,15 40,15 64,6C60,2 54,-8 50,-22Z';
const shoulderArt=k=>`<path d="M-15,7C-16,-13 16,-13 15,7C8,12 -8,12 -15,7Z" fill="${SHOULDER[k]}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-8,-3C-3,-8 4,-8 8,-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".8"/>`;
/* a piece of gear as a standalone picture */
const PLATE_IC=sm([[-30,-74],[-12,-78],[8,-62],[28,-78],[46,-74],[62,-54],[50,-40],[42,-36],[40,-12],[30,0],[-14,0],[-24,-12],[-26,-36],[-34,-40],[-46,-54]]);
const ROBE_IC=sm([[-26,-76],[8,-60],[42,-76],[60,-60],[46,-42],[52,-10],[66,26],[8,32],[-50,26],[-36,-10],[-30,-42],[-44,-60]]);
function gearIcon(id){
  const g=GEAR[id],u='ic'+(N++);if(!g)return '';
  if(g.slot==='armor'){
    const shape=g.skirt?ROBE_IC:PLATE_IC;
    const pad=g.shoulder?[[-40,-60],[56,-60]].map(([x,y])=>`<g transform="translate(${x},${y})">${shoulderArt(g.shoulder)}</g>`).join(''):'';
    return `<defs><clipPath id="${u}"><path d="${shape}"/></clipPath></defs><path d="${shape}" fill="${g.skirt||'url(#gSteel)'}"/><g clip-path="url(#${u})">${g.art}</g><path d="${shape}" fill="none" ${ln(3.2)}/>${pad}`;
  }
  if(g.slot==='charm')return `<path d="M-22,-34C-12,-12 12,-12 22,-34" fill="none" stroke="${INK}" stroke-width="6"/><path d="M-22,-34C-12,-12 12,-12 22,-34" fill="none" stroke="${g.chain}" stroke-width="3"/><g transform="translate(0,-14) scale(1.5)">${g.art}</g>`;
  if(g.slot==='weapon')return `<g transform="rotate(32)">${g.art}</g>`;
  return g.art;
}
/* BOSSES */
const shine=(d,o=.75,w=5)=>`<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
const bossEye=(p,x,y,r,o={})=>`<g data-p="${p}" transform="translate(${x},${y})"><ellipse rx="${r}" ry="${r*(o.tall||1.08)}" fill="#160C26"/><ellipse rx="${f2(r*.82)}" ry="${f2(r*(o.tall||1.08)*.84)}" fill="${o.iris||'#FFF6E0'}"/><ellipse cx="${o.dx||0}" cy="${o.dy===undefined?1:o.dy}" rx="${f2(r*(o.pw||.42))}" ry="${f2(r*(o.ph||.5))}" fill="#120A20"/><circle cx="${f2((o.dx||0)-r*.2)}" cy="${f2(-r*.24)}" r="${f2(r*.2)}" fill="#fff"/></g>`;
const brow=(x1,y1,x2,y2,w=7,c=INK)=>`<path d="M${x1},${y1}L${x2},${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const teeth=(x,y,w,h)=>{let s=`<path d="M${x-w},${y}Q${x},${y-5} ${x+w},${y}Q${x+w-3},${y+h} ${x},${y+h}Q${x-w+3},${y+h} ${x-w},${y}Z" fill="#5C1630" ${ln(3)}/>`;const n=Math.round(w/6);for(let i=0;i<n;i++){const a=x-w+6+i*(2*w-12)/(Math.max(1,n-1));s+=`<path d="M${f2(a-4)},${y}L${f2(a)},${y+9}L${f2(a+4)},${y}Z" fill="#fff" ${ln(1.6)}/>`;}return s;};
const BOSS={
  neighbor_cat:{w:430,h:310,ax:30,art(q){
    const stripe=(a,b,c,w=13)=>`<path d="M${a}Q${b} ${c}" fill="none" stroke="#C25A1A" stroke-width="${w}" stroke-linecap="round"/>`;
    const BODY=sm([[-70,-152],[10,-172],[90,-164],[148,-116],[156,-56],[118,-14],[20,-8],[-70,-12],[-120,-48],[-122,-112]]),HD=sm([[-112,-244],[-58,-236],[-24,-204],[-14,-162],[-34,-122],[-110,-100],[-186,-122],[-208,-162],[-196,-206],[-160,-238]]);
    const leg=(pid,x,fill,pad)=>`<g data-p="${pid}"><path d="${sm([[x-26,-92],[x+20,-92],[x+24,-40],[x+18,-8],[x-36,6],[x-52,-6],[x-38,-22],[x-30,-50]])}" fill="${fill}" ${ln(3.6)}/><path d="${sm([[x-34,-30],[x+18,-32],[x+18,-8],[x-36,6],[x-52,-6]])}" fill="${pad}" ${ln(3)}/><path d="M${x-34},0L${x-34},-12M${x-20},2L${x-20},-11M${x-6},0L${x-6},-12" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><g data-p="${pid}C" opacity="0"><path d="M${x-44},2L${x-54},18L${x-36},6ZM${x-28},6L${x-34},24L${x-18},8ZM${x-12},6L${x-14},24L${x},6Z" fill="#fff" ${ln(2)}/></g></g>`;
    let spikes='';for(const [x,y] of [[-40,-176],[-4,-186],[34,-188],[72,-182],[106,-168],[134,-146],[154,-116]]){const a=Math.atan2(y+70,x-60),tx=x+Math.cos(a)*34,ty=y+Math.sin(a)*34,nx=-Math.sin(a)*13,ny=Math.cos(a)*13;spikes+=`<path d="M${f2(x+nx)},${f2(y+ny)}L${f2(tx)},${f2(ty)}L${f2(x-nx)},${f2(y-ny)}Z" fill="url(#gPurple)" ${ln(2.8)}/>`;}
    return `<defs>${lg(q('o'),['#FFC06A','#F68F2E','#C9601B'],.6,1)}${lg(q('oD'),['#E2802B','#BE5A18','#8E3F12'],.6,1)}${lg(q('cr'),['#FFFDF2','#FFEBC8','#E8C89A'],.5,1)}${rg(q('e'),['#FFFFB0','#D9F03D','#7CA60F'],.5,.6,.7)}<clipPath id="${q('cB')}"><path d="${BODY}"/></clipPath><clipPath id="${q('cH')}"><path d="${HD}"/></clipPath></defs>
    <path data-p="tailI" d="" fill="none" stroke="${INK}" stroke-width="36" stroke-linecap="round"/><path data-p="tailF" d="" fill="none" stroke="#F0882B" stroke-width="28" stroke-linecap="round"/><path data-p="tailS" d="" fill="none" stroke="#B9531A" stroke-width="28" stroke-dasharray="12 26"/>
    <g data-p="back"><path d="${sm([[70,-50],[126,-60],[168,-30],[166,-4],[92,2],[62,-16]])}" fill="url(#${q('oD')})" ${ln(3.6)}/>${leg('legB',-34,`url(#${q('oD')})`,'#E8C89A')}<g data-p="spikes" opacity="0">${spikes}</g>${inked(BODY,`url(#${q('o')})`,3.6)}<g clip-path="url(#${q('cB')})">${stripe('-20,-176','-8,-130','-26,-92')}${stripe('30,-180','44,-130','22,-86')}${stripe('78,-176','94,-126','72,-82')}${stripe('124,-150','130,-104','112,-70')}<path d="${sm([[-124,-92],[-70,-84],[-34,-54],[-40,-8],[-100,-8],[-130,-40]])}" fill="url(#${q('cr')})"/><path d="${sm([[-124,-30],[-60,-18],[60,-16],[160,-40],[170,20],[-130,20]])}" fill="#7A3408" opacity=".3"/>${shine('M30,-166C62,-168 96,-158 124,-136',.7,8)}</g><path d="${BODY}" fill="none" ${ln(3.6)}/><path d="${sm([[62,-92],[118,-104],[156,-68],[160,-20],[150,0],[70,4],[46,-10],[34,-50]])}" fill="url(#${q('o')})" ${ln(3.6)}/>${stripe('82,-100','100,-70','82,-44',11)}${stripe('118,-96','136,-62','116,-34',11)}<path d="${sm([[110,-18],[172,-16],[186,-6],[178,4],[100,6],[96,-6]])}" fill="url(#${q('cr')})" ${ln(3.6)}/><path d="M150,4V-5M164,4V-6" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/></g>
    ${leg('legF',-96,`url(#${q('o')})`,'#FFEBC8')}
    <g data-p="head"><g data-p="earB"><path d="M-196,-196L-212,-286L-140,-236Z" fill="url(#${q('oD')})" ${ln(3.6)}/><path d="M-188,-214L-200,-264L-156,-232Z" fill="#E98A98"/></g><g data-p="earF"><path d="M-74,-236L-22,-292L-22,-196Z" fill="url(#${q('o')})" ${ln(3.6)}/><path d="M-60,-234L-30,-268L-30,-212Z" fill="#F5A5AE"/></g>${inked(HD,`url(#${q('o')})`,3.6)}<g clip-path="url(#${q('cH')})">${stripe('-112,-250','-112,-220','-112,-198',11)}${stripe('-82,-246','-84,-222','-92,-206',10)}${stripe('-142,-246','-140,-222','-132,-206',10)}${stripe('-20,-180','-40,-174','-58,-170',10)}${stripe('-18,-156','-36,-152','-52,-150',10)}${stripe('-206,-180','-190,-176','-176,-172',9)}<path d="${sm([[-112,-168],[-84,-146],[-50,-136],[-44,-108],[-110,-92],[-176,-108],[-172,-136],[-140,-146]])}" fill="url(#${q('cr')})"/><path d="${sm([[-210,-124],[-110,-98],[-20,-124],[-10,-90],[-210,-90]])}" fill="#8E3F12" opacity=".28"/>${shine('M-180,-214C-160,-232 -130,-240 -104,-240',.7,7)}</g><path d="${HD}" fill="none" ${ln(3.6)}/><path d="M-46,-134L-2,-146M-46,-126L0,-124M-48,-118L-6,-104M-176,-134L-226,-146M-176,-126L-228,-124M-174,-118L-222,-104" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".85"/><g data-p="eyeF"><ellipse rx="24" ry="27" fill="#160C26"/><ellipse rx="20" ry="23" fill="url(#${q('e')})"/><ellipse data-p="pupF" rx="6" ry="20" fill="#120A20"/><circle cx="-8" cy="-11" r="5.4" fill="#fff"/><circle cx="7" cy="9" r="2.6" fill="#fff" opacity=".8"/></g><g data-p="eyeB"><ellipse rx="20" ry="26" fill="#160C26"/><ellipse rx="16.5" ry="22" fill="url(#${q('e')})"/><ellipse data-p="pupB" rx="5" ry="19" fill="#120A20"/><circle cx="-7" cy="-10" r="4.6" fill="#fff"/><circle cx="6" cy="9" r="2.2" fill="#fff" opacity=".8"/></g><path data-p="lidF" d="M-84,-208Q-50,-204 -44,-188L-52,-176Q-68,-190 -94,-192Z" fill="url(#${q('o')})" ${ln(3)}/><path data-p="lidB" d="M-178,-208Q-146,-206 -128,-192L-138,-178Q-154,-190 -188,-190Z" fill="url(#${q('oD')})" ${ln(3)}/><path d="M-122,-152L-100,-152L-111,-140Z" fill="#E86C86" ${ln(2.6)}/><g data-p="mouthC"><path d="M-111,-140V-132M-140,-126Q-126,-120 -111,-132Q-96,-120 -82,-126" fill="none" ${ln(2.8)}/><path d="M-128,-125L-124,-112L-118,-127ZM-104,-127L-98,-112L-94,-125Z" fill="#fff" ${ln(1.8)}/></g><g data-p="mouthO" display="none"><path d="M-150,-130Q-111,-120 -72,-130Q-74,-84 -111,-84Q-148,-84 -150,-130Z" fill="#5C1630" ${ln(3)}/><path d="M-134,-100Q-111,-112 -88,-100Q-96,-84 -111,-84Q-126,-84 -134,-100Z" fill="#F26D8A"/><path d="M-138,-128L-130,-106L-122,-126ZM-100,-126L-92,-106L-84,-128Z" fill="#fff" ${ln(2)}/></g></g>
    <g data-p="collar"><path d="M-186,-112C-150,-92 -74,-90 -32,-112L-28,-96C-72,-72 -152,-74 -188,-96Z" fill="url(#gRed)" ${ln(3)}/><g data-p="bell"><circle cx="-110" cy="-68" r="13" fill="url(#gGold)" ${ln(2.8)}/><path d="M-122,-68H-98" stroke="${INK}" stroke-width="2"/><circle cx="-110" cy="-61" r="2.6" fill="${INK}"/><circle cx="-115" cy="-74" r="2.4" fill="#fff"/></g></g>`;
  }},
  alarm_clock:{w:300,h:300,art(q){
    const FACE_D='M0,-222A96,96 0 1 1 -.1,-222Z';
    return `<defs>${lg(q('r'),['#FF8A98','#E8344F','#99163A'],.6,1)}${rg(q('f'),['#FFFFFF','#FFF6DC','#E8D6AE'],.45,.4,.8)}</defs>
    <g data-p="legL"><path d="M-54,-46L-82,-6" stroke="${INK}" stroke-width="17" stroke-linecap="round"/><path d="M-54,-46L-82,-6" stroke="#7A1F3D" stroke-width="9" stroke-linecap="round"/></g><g data-p="legR"><path d="M54,-46L82,-6" stroke="${INK}" stroke-width="17" stroke-linecap="round"/><path d="M54,-46L82,-6" stroke="#7A1F3D" stroke-width="9" stroke-linecap="round"/></g>
    <g data-p="bellL"><path d="M-44,-216L-58,-232" stroke="${INK}" stroke-width="7"/><path d="${sm([[-104,-232],[-96,-268],[-62,-280],[-30,-262],[-22,-230],[-60,-216]])}" fill="url(#gGold)" ${ln(3.4)}/>${shine('M-90,-250C-84,-262 -72,-270 -60,-270',.9,5)}</g>
    <g data-p="bellR"><path d="M44,-216L58,-232" stroke="${INK}" stroke-width="7"/><path d="${sm([[104,-232],[96,-268],[62,-280],[30,-262],[22,-230],[60,-216]])}" fill="url(#gGold)" ${ln(3.4)}/>${shine('M40,-262C50,-272 62,-274 74,-270',.9,5)}</g>
    <g data-p="clapper"><path d="M0,-236V-276" stroke="${INK}" stroke-width="7"/><circle cy="-284" r="10" fill="url(#gGold)" ${ln(3)}/></g>
    <circle cy="-126" r="112" fill="url(#${q('r')})" ${ln(4)}/>${shine('M-88,-170C-74,-204 -44,-226 -12,-230',.8,8)}
    <path d="${FACE_D}" transform="translate(0,16)" fill="url(#${q('f')})" ${ln(3.4)}/>
    ${[...Array(12).keys()].map(i=>`<path d="M0,-210V-${i%3?202:194}" transform="rotate(${i*30} 0 -126) translate(0,16)" stroke="${INK}" stroke-width="${i%3?2.4:4}" stroke-linecap="round"/>`).join('')}
    <g data-p="hour"><path d="M0,-126L0,-168" stroke="${INK}" stroke-width="7" stroke-linecap="round"/></g><g data-p="minute"><path d="M0,-126L0,-190" stroke="#E8344F" stroke-width="4.6" stroke-linecap="round"/></g><circle cy="-126" r="6.5" fill="url(#gGold)" ${ln(2.2)}/>
    ${bossEye('eyeL',-38,-146,21)}${bossEye('eyeR',38,-146,21)}${brow(-64,-178,-16,-160)}${brow(64,-178,16,-160)}
    <g data-p="mouthC">${teeth(0,-92,30,17)}</g><g data-p="mouthO" display="none">${teeth(0,-100,36,36)}</g>`;
  }},
  giant_vacuum:{w:360,h:290,ax:20,art(q){
    return `<defs>${lg(q('r'),['#FF8A98','#E8344F','#99163A'],.6,1)}${lg(q('d'),['#6E6E86','#3A3A56','#1E1A2B'],.5,1)}</defs>
    <circle cx="-36" cy="-30" r="30" fill="url(#${q('d')})" ${ln(3.6)}/><circle cx="-36" cy="-30" r="12" fill="url(#gSteel)" ${ln(2.4)}/><circle cx="122" cy="-30" r="30" fill="url(#${q('d')})" ${ln(3.6)}/><circle cx="122" cy="-30" r="12" fill="url(#gSteel)" ${ln(2.4)}/>
    <g data-p="hose"><path d="M-76,-150C-146,-156 -178,-104 -166,-46" fill="none" stroke="${INK}" stroke-width="34" stroke-linecap="round"/><path d="M-76,-150C-146,-156 -178,-104 -166,-46" fill="none" stroke="#3A3A56" stroke-width="24" stroke-linecap="round"/><path d="M-76,-150C-146,-156 -178,-104 -166,-46" fill="none" stroke="#6E6E86" stroke-width="24" stroke-dasharray="4 13"/><g data-p="nozzle"><path d="${sm([[-214,-56],[-126,-56],[-112,-4],[-226,-4]])}" fill="url(#gSteel)" ${ln(3.6)}/><path d="M-214,-22H-126" stroke="${INK}" stroke-width="3.4"/><path d="M-222,-8H-116" stroke="#3A3A56" stroke-width="8"/>${shine('M-204,-46H-142',.9,4.4)}</g></g>
    <path d="${sm([[-98,-90],[-82,-172],[-10,-216],[86,-214],[150,-160],[166,-86],[140,-30],[40,-16],[-70,-30]])}" fill="url(#${q('r')})" ${ln(4)}/>${shine('M-66,-156C-44,-188 -6,-204 40,-204',.8,8)}
    <path d="${sm([[-30,-226],[10,-250],[70,-250],[108,-226],[70,-208],[10,-208]])}" fill="#FF8A9C" ${ln(3.4)}/><rect x="28" y="-274" width="42" height="28" rx="8" fill="url(#${q('d')})" ${ln(3.2)}/>
    ${bossEye('eyeL',-6,-132,26)}${bossEye('eyeR',84,-132,26)}${brow(-38,-170,22,-150,8)}${brow(116,-170,56,-150,8)}
    <g data-p="mouthC"><rect x="-22" y="-92" width="92" height="34" rx="9" fill="#1E1A2B" ${ln(3.2)}/><path d="M0,-92V-58M24,-92V-58M48,-92V-58" stroke="#C4CEE4" stroke-width="4"/></g><g data-p="mouthO" display="none"><rect x="-22" y="-98" width="92" height="52" rx="14" fill="#1E1A2B" ${ln(3.2)}/><circle cx="24" cy="-72" r="16" fill="#3A3A56"/></g>`;
  }},
  thief_squirrel:{w:330,h:300,art(q){
    return `<defs>${lg(q('o'),['#E8A06A','#C9743F','#8A4A24'],.6,1)}${lg(q('t'),['#F4B988','#D98A4E','#A85E2E'],.5,1)}</defs>
    <g data-p="tail"><path d="${sm([[50,-40],[150,-60],[178,-150],[146,-250],[96,-272],[112,-210],[84,-160],[50,-130]])}" fill="url(#${q('t')})" ${ln(3.6)}/><path d="M112,-70C136,-110 140,-170 118,-226" fill="none" stroke="#FFE2C4" stroke-width="16" stroke-linecap="round"/></g>
    <path d="${sm([[-58,-4],[-72,-68],[-40,-128],[28,-132],[72,-70],[64,-4],[4,6]])}" fill="url(#${q('o')})" ${ln(3.6)}/><ellipse cx="4" cy="-52" rx="40" ry="40" fill="#FFE6CC"/>
    <path d="M-50,-4C-68,-2 -78,6 -70,10H-26V-6ZM44,-4C62,-2 72,6 64,10H20V-6Z" fill="url(#${q('o')})" ${ln(3)}/>
    <g data-p="bag"><path d="${sm([[-150,-6],[-168,-60],[-138,-104],[-102,-104],[-68,-60],[-84,-6],[-118,4]])}" fill="url(#gLeather)" ${ln(3.4)}/><path d="M-138,-104C-126,-92 -112,-92 -102,-104" fill="none" ${ln(4)}/><text x="-116" y="-30" font-family="Verdana,sans-serif" font-weight="800" font-size="46" text-anchor="middle" fill="#FFD76A" stroke="${INK}" stroke-width="2" paint-order="stroke">$</text></g>
    <g data-p="head"><path d="M-44,-200L-60,-266L-8,-226ZM40,-200L58,-266L4,-226Z" fill="url(#${q('o')})" ${ln(3.4)}/><circle cy="-170" r="72" fill="url(#${q('t')})" ${ln(3.6)}/><path d="${sm([[-74,-186],[-40,-204],[0,-186],[40,-204],[74,-186],[70,-150],[34,-146],[0,-168],[-34,-146],[-70,-150]])}" fill="#2A2440" ${ln(2.4)}/>${bossEye('eyeL',-32,-174,17)}${bossEye('eyeR',32,-174,17)}<ellipse cy="-134" rx="11" ry="8" fill="${INK}"/><path d="M0,-126V-118" ${ln(3)}/><g data-p="mouthC"><rect x="-11" y="-118" width="22" height="20" rx="4" fill="#fff" ${ln(2.6)}/><path d="M0,-118V-98" stroke="${INK}" stroke-width="2"/></g><g data-p="mouthO" display="none"><ellipse cy="-106" rx="20" ry="16" fill="#5C1630" ${ln(3)}/><rect x="-10" y="-122" width="20" height="12" rx="3" fill="#fff" ${ln(2.2)}/></g></g>`;
  }},
  rug_puller:{w:400,h:310,art(q){
    return `<defs>${lg(q('c'),['#6B3F8E','#4A2A63','#2A1740'],.5,1)}${lg(q('s'),['#FFF0D0','#F5DDB4','#D9B98A'],.5,1)}${lg(q('r'),['#E85A7A','#C93B5A','#8A2240'],.5,1)}</defs>
    <g data-p="rug"><path data-p="rugP" d="M-190,-44C-120,-52 -60,-38 0,-44C60,-52 120,-38 190,-44L190,0L-190,0Z" fill="url(#${q('r')})" ${ln(3.4)}/><path d="M-178,-30H178M-178,-14H178" stroke="#FFD76A" stroke-width="4" stroke-dasharray="14 8"/><path d="M-186,0V12M-164,0V12M-142,0V12M-120,0V12M-98,0V12M-76,0V12M-54,0V12M-32,0V12M-10,0V12M12,0V12M34,0V12M56,0V12M78,0V12M100,0V12M122,0V12M144,0V12M166,0V12M186,0V12" stroke="#F6ECCF" stroke-width="4"/></g>
    <path d="${sm([[-74,-34],[-80,-110],[-44,-162],[44,-162],[80,-110],[74,-34]])}" fill="url(#${q('c')})" ${ln(3.6)}/><path d="M-24,-158L0,-104L24,-158Z" fill="#fff" ${ln(2.6)}/><path d="M0,-150L-9,-136L0,-104L9,-136Z" fill="url(#gRed)" ${ln(2)}/>${shine('M-62,-110C-58,-130 -46,-146 -34,-152',.45,6)}
    <g data-p="armL"><path d="M-70,-132C-104,-120 -122,-98 -130,-70" fill="none" stroke="${INK}" stroke-width="29" stroke-linecap="round"/><path d="M-70,-132C-104,-120 -122,-98 -130,-70" fill="none" stroke="#4A2A63" stroke-width="19" stroke-linecap="round"/><circle cx="-132" cy="-62" r="17" fill="url(#${q('s')})" ${ln(3.2)}/></g>
    <g data-p="armR"><path d="M70,-132C104,-136 124,-150 134,-176" fill="none" stroke="${INK}" stroke-width="29" stroke-linecap="round"/><path d="M70,-132C104,-136 124,-150 134,-176" fill="none" stroke="#4A2A63" stroke-width="19" stroke-linecap="round"/><circle cx="136" cy="-184" r="17" fill="url(#${q('s')})" ${ln(3.2)}/><circle cx="146" cy="-224" r="31" fill="url(#gGold)" ${ln(3.4)}/><text x="146" y="-208" font-family="Verdana,sans-serif" font-weight="800" font-size="40" text-anchor="middle" fill="#8A5A1A">$</text></g>
    <g data-p="head"><circle cy="-208" r="56" fill="url(#${q('s')})" ${ln(3.6)}/><rect x="-52" y="-310" width="104" height="82" rx="6" fill="#2A2440" ${ln(3.6)}/><rect x="-52" y="-258" width="104" height="18" fill="url(#gGold)" ${ln(2.8)}/><ellipse cy="-234" rx="82" ry="15" fill="#2A2440" ${ln(3.6)}/>${bossEye('eyeL',-24,-210,14,{tall:.9})}${bossEye('eyeR',24,-210,14,{tall:.9})}<circle cx="24" cy="-210" r="20" fill="none" stroke="#FFCB4F" stroke-width="3.6"/><path d="M-46,-218Q-24,-232 -6,-216L-6,-210Q-24,-222 -44,-208ZM46,-218Q24,-232 6,-216L6,-210Q24,-222 44,-208Z" fill="url(#${q('s')})" ${ln(2.6)}/><path d="M-46,-182C-30,-196 -12,-184 0,-188C12,-184 30,-196 46,-182C30,-170 12,-178 0,-176C-12,-178 -30,-170 -46,-182Z" fill="${INK}"/><g data-p="mouthC"><path d="M-22,-166Q0,-154 24,-170" fill="none" ${ln(3.2)}/></g><g data-p="mouthO" display="none"><path d="M-24,-172Q0,-164 24,-172Q22,-150 0,-150Q-22,-150 -24,-172Z" fill="#5C1630" ${ln(3)}/></g></g>
    <text x="-132" y="-160" font-family="Verdana,sans-serif" font-weight="800" font-size="26" text-anchor="middle" fill="#35D07F" stroke="${INK}" stroke-width="1.6" paint-order="stroke">+1000%</text>`;
  }},
  broken_faucet:{w:330,h:320,art(q){
    return `<defs>${lg(q('m'),['#FCFDFF','#C9D2E6','#808BB0'],.5,1)}${lg(q('w'),['#BFF6FF','#2FD6E8','#1782B8'],.5,1)}</defs>
    <rect x="-168" y="-262" width="30" height="112" rx="8" fill="url(#gSteelD)" ${ln(3.4)}/><rect x="-146" y="-250" width="56" height="88" rx="10" fill="url(#${q('m')})" ${ln(3.4)}/>
    <path d="${sm([[-96,-256],[56,-256],[124,-220],[148,-144],[148,-112],[84,-112],[84,-142],[62,-168],[-96,-164]])}" fill="url(#${q('m')})" ${ln(4)}/>${shine('M-82,-244H46C78,-238 104,-214 118,-182',.9,8)}
    <rect x="72" y="-120" width="88" height="30" rx="7" fill="url(#gSteelD)" ${ln(3.4)}/>
    <g data-p="handle"><rect x="-22" y="-296" width="24" height="44" rx="4" fill="url(#gSteelD)" ${ln(3)}/><rect x="-62" y="-318" width="104" height="24" rx="11" fill="url(#gRed)" ${ln(3.4)}/>${shine('M-48,-310H26',.8,4)}</g>
    ${bossEye('eyeL',-46,-214,22)}${bossEye('eyeR',22,-214,22)}${brow(-74,-246,-24,-232)}${brow(50,-246,0,-232)}
    <g data-p="mouthC"><path d="M-50,-178L-36,-188L-20,-178L-6,-188L10,-178L24,-188" fill="none" ${ln(4)}/></g><g data-p="mouthO" display="none">${teeth(-12,-192,36,22)}</g>
    <g data-p="water"><path d="M84,-90H156C160,-52 146,-30 170,6H70C94,-30 80,-52 84,-90Z" fill="url(#${q('w')})" ${ln(3.4)}/><path d="M104,-80C100,-54 108,-34 98,-8M132,-78C136,-52 128,-30 138,-4" fill="none" stroke="#E8FCFF" stroke-width="5" stroke-linecap="round"/></g><path d="M-60,-22C-40,-34 8,-34 58,-22C40,-6 -40,-6 -60,-22Z" fill="url(#${q('w')})" ${ln(3)}/>`;
  }},
  dumping_whale:{w:400,h:300,art(q){
    return `<defs>${lg(q('b'),['#8FDCFF','#3FB4E8','#1C6FA8'],.6,1)}${lg(q('w'),['#FFFFFF','#EAF8FF','#B8DCEE'],.5,1)}</defs>
    <g data-p="candles">${[[120,-226,26,50],[152,-206,26,62],[184,-178,22,76]].map(([x,y,w,h])=>`<path d="M${x+w/2},${y-14}V${y+h+14}" stroke="#E8344F" stroke-width="5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#gRed)" ${ln(3)}/>`).join('')}</g>
    <g data-p="tail"><path d="${sm([[120,-92],[166,-128],[210,-176],[212,-112],[174,-72],[126,-58]])}" fill="url(#${q('b')})" ${ln(3.6)}/></g>
    <path d="${sm([[-186,-92],[-140,-188],[-30,-222],[92,-196],[150,-100],[108,-24],[-20,0],[-138,-20]])}" fill="url(#${q('b')})" ${ln(4)}/>${shine('M-150,-140C-120,-186 -64,-208 -10,-208',.8,9)}
    <path d="${sm([[-178,-62],[-90,-34],[30,-30],[132,-66],[102,-22],[-20,-1],[-134,-20]])}" fill="url(#${q('w')})" ${ln(3)}/><path d="M-138,-42L-126,-16M-98,-34L-90,-6M-52,-30L-48,0M0,-30L0,-2M46,-36L40,-10" stroke="#8FC8E4" stroke-width="4" stroke-linecap="round"/>
    ${bossEye('eyeL',-104,-132,25)}${brow(-138,-172,-76,-152,9)}
    <g data-p="mouthC"><path d="M-178,-82Q-128,-52 -66,-76" fill="none" ${ln(4)}/><path d="M-158,-72L-148,-52L-136,-68ZM-116,-66L-104,-46L-94,-68Z" fill="#fff" ${ln(2.2)}/></g><g data-p="mouthO" display="none"><path d="M-182,-84Q-124,-58 -60,-80Q-70,-30 -126,-30Q-178,-34 -182,-84Z" fill="#5C1630" ${ln(3.4)}/><path d="M-158,-58Q-126,-70 -92,-58Q-104,-36 -126,-36Q-148,-36 -158,-58Z" fill="#F26D8A"/></g>
    <g data-p="fin"><path d="${sm([[-30,-72],[32,-76],[72,-34],[38,-14],[-14,-34]])}" fill="#2F93C8" ${ln(3.4)}/></g>
    <g data-p="crown"><path d="M-136,-200L-150,-266L-110,-232L-82,-284L-54,-232L-14,-266L-28,-200Q-82,-182 -136,-200Z" fill="url(#gGold)" ${ln(3.4)}/><circle cx="-82" cy="-214" r="9" fill="url(#gGemR)" ${ln(2.4)}/>${shine('M-124,-210C-102,-204 -62,-204 -40,-210',.8,4)}</g>`;
  }},
  overloaded_charger:{w:300,h:310,art(q){
    return `<defs>${lg(q('b'),['#6E6E86','#3A3A56','#1E1A2B'],.6,1)}${rg(q('e'),['#FFC8C8','#F0506E','#8A1030'],.5,.5,.7)}</defs>
    <rect x="-52" y="-310" width="24" height="60" rx="5" fill="url(#gGold)" ${ln(3.4)}/><rect x="28" y="-310" width="24" height="60" rx="5" fill="url(#gGold)" ${ln(3.4)}/>
    <g data-p="cord"><path d="M0,-40C0,-10 60,-16 92,-4" fill="none" stroke="${INK}" stroke-width="19" stroke-linecap="round"/><path d="M0,-40C0,-10 60,-16 92,-4" fill="none" stroke="#3A3A56" stroke-width="11" stroke-linecap="round"/></g>
    <rect x="-118" y="-262" width="236" height="222" rx="34" fill="url(#${q('b')})" ${ln(4)}/>${shine('M-96,-226C-90,-240 -70,-246 -50,-246',.55,8)}<rect x="-96" y="-248" width="192" height="14" rx="7" fill="#55556A"/><path d="M-118,-60H118" stroke="#1E1A2B" stroke-width="7"/>
    ${bossEye('eyeL',-50,-186,32,{iris:`url(#${q('e')})`,tall:.75,pw:.18,ph:.62})}${bossEye('eyeR',50,-186,32,{iris:`url(#${q('e')})`,tall:.75,pw:.18,ph:.62})}${brow(-92,-226,-16,-204,10)}${brow(92,-226,16,-204,10)}
    <g data-p="mouthC"><rect x="-76" y="-138" width="152" height="46" rx="11" fill="#14101F" ${ln(3.4)}/><path d="M-50,-138V-92M-20,-138V-92M10,-138V-92M40,-138V-92" stroke="#FFCB4F" stroke-width="6"/></g><g data-p="mouthO" display="none"><rect x="-80" y="-146" width="160" height="66" rx="16" fill="#14101F" ${ln(3.4)}/><path d="M-64,-136L-40,-92L-18,-136L6,-92L30,-136L54,-92" fill="none" stroke="#FFE14D" stroke-width="7" stroke-linejoin="round"/></g>
    <circle cx="86" cy="-76" r="9" fill="#35D07F" ${ln(2.4)}/><g data-p="led"><circle cx="86" cy="-76" r="18" fill="url(#gGlowG)"/></g>
    <g data-p="zaps">${zap(138,-250,3.2)}${zap(-138,-170,2.6)}${zap(136,-120,2)}</g>`;
  }},
  reorg_ghost:{w:320,h:320,art(q){
    return `<defs>${lg(q('g'),['#FFFFFF','#D8E4FF','#95A8E0'],.5,1)}</defs>
    <g data-p="blocks">${[[-140,-250,'url(#gGold)'],[130,-262,'url(#gSteel)'],[148,-150,'url(#gGold)'],[-156,-136,'url(#gSteel)']].map(([x,y,f],i)=>`<g data-p="blk${i}"><rect x="${x-20}" y="${y-20}" width="40" height="40" rx="7" fill="${f}" ${ln(3.2)}/><path d="M${x-10},${y-8}H${x+8}M${x-10},${y+2}H${x+2}" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" opacity=".55"/></g>`).join('')}</g>
    <g data-p="sheet"><path data-p="sheetP" d="M-100,-20V-168C-100,-268 100,-268 100,-168V-20L68,-52L34,-20L0,-52L-34,-20L-68,-52Z" fill="url(#${q('g')})" ${ln(4)}/>${shine('M-78,-170C-74,-216 -44,-244 -4,-250',.9,8)}</g>
    <ellipse cx="-40" cy="-166" rx="23" ry="30" fill="#160C26"/><ellipse cx="40" cy="-166" rx="23" ry="30" fill="#160C26"/><circle cx="-46" cy="-176" r="7.5" fill="#FFE27A"/><circle cx="34" cy="-176" r="7.5" fill="#FFE27A"/>
    <g data-p="mouthC"><ellipse cy="-100" rx="20" ry="26" fill="#3A2F5E" ${ln(3.4)}/></g><g data-p="mouthO" display="none"><ellipse cy="-96" rx="32" ry="38" fill="#3A2F5E" ${ln(3.4)}/></g>
    <ellipse cx="-70" cy="-128" rx="16" ry="9" fill="#F7B6DA" opacity=".6"/><ellipse cx="70" cy="-128" rx="16" ry="9" fill="#F7B6DA" opacity=".6"/>
    <g data-p="zaps">${zap(96,-256,2.2)}</g>`;
  }},
  cage_hand:{w:320,h:320,art(q){
    const fin=(p,x,y,w,h)=>`<g data-p="${p}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w/2}" fill="url(#${q('s')})" ${ln(3.6)}/><path d="M${x+5},${y+h*.55}H${x+w-5}M${x+5},${y+h*.3}H${x+w-5}" stroke="#D9A888" stroke-width="2.6" stroke-linecap="round"/><rect x="${x+6}" y="${y+4}" width="${w-12}" height="${w*.6}" rx="4" fill="#FFF8F0" ${ln(2)}/></g>`;
    return `<defs>${lg(q('s'),['#FFE9D0','#FFD3AE','#E0A47E'],.6,1)}</defs>
    <rect x="-90" y="-52" width="180" height="58" rx="14" fill="url(#gGreen)" ${ln(3.8)}/><path d="M-90,-30H90" stroke="#1F6F48" stroke-width="5"/><path d="M-60,-46V0M-20,-46V0M20,-46V0M60,-46V0" stroke="#1F6F48" stroke-width="2.4" opacity=".55"/>
    ${fin('f1',-104,-268,44,126)}${fin('f2',-52,-300,44,160)}${fin('f3',2,-292,44,152)}${fin('f4',54,-256,40,116)}
    <g data-p="thumb"><path d="${sm([[88,-128],[136,-178],[166,-174],[162,-136],[122,-92],[92,-74]])}" fill="url(#${q('s')})" ${ln(3.6)}/></g>
    <path d="${sm([[-108,-48],[-110,-156],[-84,-176],[60,-178],[100,-152],[104,-48],[0,-36]])}" fill="url(#${q('s')})" ${ln(4)}/>
    ${bossEye('eyeL',-38,-128,23)}${bossEye('eyeR',38,-128,23)}${brow(-70,-162,-14,-144,8)}${brow(70,-162,14,-144,8)}
    <g data-p="mouthC">${teeth(0,-92,38,24)}</g><g data-p="mouthO" display="none">${teeth(0,-98,44,44)}</g>`;
  }},
};
/* BAGS AND CHESTS */
function blindBag(){
  const u='b'+(N++),B=sm([[-30,-44],[-66,-14],[-86,40],[-70,88],[0,100],[70,88],[86,40],[66,-14],[30,-44]]);
  return `<defs>${lg(u+'v',['#B28AFF','#6F3FD8','#351B7E'],.6,1)}${rg(u+'s',['rgba(255,235,150,.9)','rgba(255,205,70,.15)','rgba(255,205,70,0)'],.5,.5,.5)}<clipPath id="${u}c"><path d="${B}"/></clipPath></defs><circle cy="20" r="104" fill="url(#${u}s)"/><path d="M-30,-44C-40,-66 -52,-74 -40,-90C-26,-82 -14,-92 0,-92C14,-92 26,-82 40,-90C52,-74 40,-66 30,-44Z" fill="url(#${u}v)" ${ln(3.4)}/><circle cx="-36" cy="-96" r="17" fill="#6F3FD8" ${ln(3)}/><circle cx="-35" cy="-94" r="9.5" fill="#F5A5C8"/><circle cx="36" cy="-96" r="17" fill="#5A30BE" ${ln(3)}/><circle cx="35" cy="-94" r="9.5" fill="#F5A5C8"/>${inked(B,`url(#${u}v)`,3.4)}<g clip-path="url(#${u}c)"><path d="M-90,70C-40,94 40,94 90,70V110H-90Z" fill="#23105E" opacity=".55"/><path d="M-58,-8C-68,12 -74,34 -72,54" fill="none" stroke="#E6D6FF" stroke-opacity=".6" stroke-width="8" stroke-linecap="round"/><path d="M-18,-30L-24,60M18,-30L26,60M-44,-16L-58,50M44,-16L58,50" stroke="#2C1470" stroke-width="2.6" opacity=".5"/><g fill="#FFE9A0" opacity=".9"><circle cx="-44" cy="60" r="2.6"/><circle cx="50" cy="20" r="2.4"/><circle cx="46" cy="66" r="3"/><circle cx="-52" cy="20" r="2"/></g></g><path d="M-33,-46C-14,-34 14,-34 33,-46L37,-34C14,-20 -14,-20 -37,-34Z" fill="url(#gGold)" ${ln(3)}/><path d="M-20,-30C-30,-14 -36,-6 -44,-2M20,-30C30,-14 36,-6 44,-2" fill="none" stroke="#FFCB4F" stroke-width="4.4" stroke-linecap="round"/><circle cx="-46" cy="0" r="6.5" fill="url(#gGold)" ${ln(2.4)}/><circle cx="46" cy="0" r="6.5" fill="url(#gGold)" ${ln(2.4)}/><circle cy="38" r="34" fill="#27115F" ${ln(3)}/><text x="0" y="60" text-anchor="middle" font-family="Verdana,sans-serif" font-weight="800" font-size="56" fill="url(#gGold)" stroke="${INK}" stroke-width="2.2" paint-order="stroke">?</text>${star5(-74,-40,12,'url(#gGold)',2)}${star5(78,-30,9,'url(#gGold)',1.8)}${star5(84,70,7,'#FFF6BE',1.4)}`;
}
function snackBag(){
  const u='s'+(N++);
  const leaf=(x,y,r,c='#3FB463')=>`<path d="M${x},${y}C${x-16},${y-16} ${x-10},${y-36} ${x+4},${y-44}C${x+16},${y-30} ${x+16},${y-14} ${x},${y}Z" transform="rotate(${r} ${x} ${y})" fill="${c}" ${ln(2.6)}/>`;
  return `<defs>${lg(u+'p',['#F1D7A8','#D5AC72','#A87C46'],.7,1)}${lg(u+'c',['#FFB05E','#F07A1E','#C2540F'],.6,1)}${rg(u+'g',['#9CE878','#3FB463','#1D7F45'],.4,.3,.8)}</defs>${leaf(-16,-66,-32)}${leaf(-12,-66,-4,'#52C672')}<path d="M-6,-20C-26,-44 -30,-70 -14,-72C2,-72 8,-44 6,-20Z" fill="url(#${u}c)" ${ln(3.2)}/><path d="M-20,-52L-8,-50M-16,-38L-4,-36" stroke="#A84A0C" stroke-width="2.2" stroke-linecap="round"/><g fill="url(#${u}g)" ${ln(3)}><circle cx="26" cy="-52" r="16"/><circle cx="46" cy="-46" r="14"/><circle cx="38" cy="-66" r="14"/><circle cx="60" cy="-58" r="10"/></g><path d="M34,-34C34,-22 36,-14 38,-6" stroke="#2C8A4C" stroke-width="10" stroke-linecap="round"/><g ${ln(2.2)}><ellipse cx="-44" cy="-38" rx="7" ry="12" transform="rotate(-24 -44 -38)" fill="#4A3A2E"/><ellipse cx="-60" cy="-30" rx="6" ry="11" transform="rotate(-44 -60 -30)" fill="#3A2E25"/></g>${inked('M-70,-24L70,-24L82,88C82,96 76,100 68,100L-68,100C-76,100 -82,96 -82,88Z',`url(#${u}p)`,3.4)}<path d="M-70,-24L-58,-8L-44,-24L-30,-8L-16,-24L-2,-8L12,-24L26,-8L40,-24L54,-8L70,-24Z" fill="#E2BE85" ${ln(2.6)}/><path d="M-66,-2C-70,28 -72,56 -72,84" fill="none" stroke="#FFF2D2" stroke-opacity=".7" stroke-width="6" stroke-linecap="round"/><path d="M58,-6L72,92L82,88L70,-24Z" fill="#7E5A2E" opacity=".35"/><path d="M-60,90H62" stroke="#8A6636" stroke-width="2.4" stroke-dasharray="7 6"/><circle cy="42" r="32" fill="#FFF6E4" ${ln(2.8)}/><path d="M0,62C-22,44 -20,26 -9,26C-4,26 -1,29 0,33C1,29 4,26 9,26C20,26 22,44 0,62Z" fill="url(#gRed)" ${ln(2.6)}/>`;
}
function picnicBag(){
  const u='p'+(N++);
  return `<defs>${lg(u+'w',['#E8B277','#C9874A','#8A5A2E'],.6,1)}${rg(u+'a',['#FF9A8A','#E53935','#8E1C24'],.35,.3,.85)}${rg(u+'y',['#FFF08A','#F8C93A','#C98A1A'],.35,.3,.85)}</defs><path d="M-72,-16C-72,-104 72,-104 72,-16" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M-72,-16C-72,-104 72,-104 72,-16" fill="none" stroke="#C9874A" stroke-width="8" stroke-linecap="round"/><circle cx="-20" cy="-40" r="28" fill="url(#${u}a)" ${ln(3)}/><path d="M-20,-68Q-22,-82 -8,-86" fill="none" ${ln(4)}/><path d="M-10,-78C4,-90 18,-82 22,-74C10,-66 -2,-68 -10,-78Z" fill="#4CAF50" ${ln(2.4)}/><path d="M-36,-52C-32,-58 -28,-60 -22,-60" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-opacity=".85"/><path d="M6,-16C12,-54 40,-72 52,-60C60,-48 44,-22 22,-12Z" fill="url(#${u}y)" ${ln(3)}/><path d="M-90,-20H90L74,92C72,100 66,104 60,104H-60C-66,104 -72,100 -74,92Z" fill="url(#${u}w)" ${ln(3.6)}/><path d="M-86,10H86M-82,42H82M-78,74H78M-50,-18L-44,102M0,-18V102M50,-18L44,102" stroke="#6E4422" stroke-width="3.4" opacity=".7"/><rect x="-100" y="-34" width="200" height="26" rx="8" fill="url(#gRed)" ${ln(3.4)}/>${[-80,-40,0,40,80].map(x=>`<rect x="${x-10}" y="-32" width="20" height="22" fill="#FFF6E5" opacity=".92"/>`).join('')}<rect x="-100" y="-34" width="200" height="26" rx="8" fill="none" ${ln(3.4)}/>`;
}
function feastBag(){
  const u='f'+(N++);
  return `<defs>${lg(u+'w',['#D29A62','#A9744F','#6E4422'],.6,1)}${rg(u+'g',['rgba(255,225,110,.95)','rgba(255,200,60,.2)','rgba(255,200,60,0)'],.5,.5,.5)}${rg(u+'e',['#FFFFFF','#FFF6E4','#E8D6B8'],.35,.3,.9)}${rg(u+'m',['#F8E4BE','#EDC98E','#C2925A'],.35,.3,.9)}</defs><circle cy="-30" r="104" fill="url(#${u}g)"/>${[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>`<path d="M0,-30L-7,-124L7,-124Z" transform="rotate(${a} 0 -30)" fill="#FFD76A" opacity=".3"/>`).join('')}<path d="M-54,-16C-64,-68 -30,-86 -16,-68C-2,-50 -14,-20 -30,-12Z" fill="url(#${u}e)" ${ln(3)}/><circle cx="-34" cy="-40" r="14" fill="#FFC83D" ${ln(2.4)}/><path d="M-8,-14C-6,-62 44,-74 64,-48C76,-32 58,-10 34,-8Z" fill="url(#${u}m)" ${ln(3)}/><path d="M6,-40C22,-52 44,-50 58,-40M6,-26C22,-36 40,-34 54,-26" fill="none" stroke="#C2925A" stroke-width="3"/><g ${ln(2.4)}><ellipse cx="-6" cy="-66" rx="9" ry="16" transform="rotate(-14 -6 -66)" fill="#4A3A2E"/><ellipse cx="14" cy="-76" rx="8" ry="14" transform="rotate(16 14 -76)" fill="#3A2E25"/></g><rect x="-88" y="-14" width="176" height="114" rx="10" fill="url(#${u}w)" ${ln(3.8)}/><path d="M-88,24H88M-88,62H88M-44,-14V100M44,-14V100" stroke="#5A3820" stroke-width="4"/><rect x="-96" y="-28" width="192" height="26" rx="7" fill="url(#gGold)" ${ln(3.4)}/>${shine('M-82,-20H82',.85,4)}<rect x="-20" y="10" width="40" height="36" rx="7" fill="url(#gGold)" ${ln(3.2)}/><circle cy="24" r="7" fill="${INK}"/><rect x="-2.6" y="26" width="5.2" height="12" fill="${INK}"/>${[-76,76].map(x=>`<circle cx="${x}" cy="88" r="6" fill="url(#gSteel)" ${ln(2)}/>`).join('')}${star5(90,-90,11,'#FFF6C9',2)}${star5(-92,-78,9,'#FFF6C9',1.8)}`;
}
function chestArt(c,band,gem,rays,dark){
  const u='c'+(N++),gemF=gem;
  return `<defs>${lg(u+'b',[mix(c,'#FFFFFF',.3),c,mix(c,'#1A1030',.4)],.6,1)}${lg(u+'l',[mix(c,'#FFFFFF',.45),mix(c,'#FFFFFF',.1),mix(c,'#1A1030',.25)],.6,1)}${lg(u+'m',[mix(band,'#FFFFFF',.5),band,mix(band,'#1A1030',.35)],.5,1)}${rg(u+'g',[mix(gem,'#FFFFFF',.7),gem,mix(gem,'#1A1030',.4)],.35,.3,.85)}</defs>${rays?[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>`<path d="M0,-20L-9,-128L9,-128Z" transform="rotate(${a} 0 -20)" fill="${gemF}" opacity=".35"/>`).join(''):''}<ellipse cy="96" rx="96" ry="12" fill="#050310" opacity=".28"/><rect x="-92" y="-22" width="184" height="112" rx="14" fill="url(#${u}b)" ${ln(4)}/><path d="M-92,-22C-92,-98 92,-98 92,-22Z" fill="url(#${u}l)" ${ln(4)}/>${dark?`<path d="M-92,14H92M-92,50H92M-60,-20V88M60,-20V88" stroke="${mix(c,'#1A1030',.55)}" stroke-width="3" opacity=".7"/>`:''}${shine('M-74,-44C-50,-72 -14,-82 22,-80',.6,7)}<rect x="-68" y="-74" width="24" height="164" rx="6" fill="url(#${u}m)" ${ln(3.2)}/><rect x="44" y="-74" width="24" height="164" rx="6" fill="url(#${u}m)" ${ln(3.2)}/><rect x="-96" y="-30" width="192" height="20" rx="6" fill="url(#${u}m)" ${ln(3.2)}/><rect x="-26" y="-38" width="52" height="58" rx="10" fill="url(#${u}m)" ${ln(3.4)}/><circle cy="-16" r="13" fill="url(#${u}g)" ${ln(2.8)}/><rect x="-4" y="-6" width="8" height="18" rx="2" fill="${INK}"/><circle cx="-56" cy="60" r="3.4" fill="#fff" opacity=".7"/><circle cx="56" cy="60" r="3.4" fill="#fff" opacity=".7"/>${rays?star5(-84,-96,11,'#FFF6C9',2)+star5(90,-84,9,'#FFF6C9',1.8):''}`;
}
/* SQK: a night dark chest with bands of lit LED dots in the Squeek colours and a gold wheel for a lock, so it reads apart from every coin chest. The pouch and the coin share the wheel */
const SQK_LED=['#FF7AD9','#5BE7FF','#FFE27A','#9DFF7A'];
const sqkLed=(x,y,c)=>`<circle cx="${f2(x)}" cy="${f2(y)}" r="7" fill="${c}" opacity=".26"/><circle cx="${f2(x)}" cy="${f2(y)}" r="3.6" fill="${c}"/><circle cx="${f2(x-1)}" cy="${f2(y-1.2)}" r="1.3" fill="#fff" opacity=".85"/>`;
const sqkRow=(x0,y0,x1,y1,n,k)=>Array.from({length:n},(_,i)=>sqkLed(x0+(x1-x0)*i/(n-1),y0+(y1-y0)*i/(n-1),SQK_LED[(i+k)%SQK_LED.length])).join('');
const sqkWheel=(cx,cy,r,u)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${u})" ${ln(3.4)}/><circle cx="${cx}" cy="${cy}" r="${f2(r*.7)}" fill="${INK}"/>${[0,60,120,180,240,300].map(a=>`<path d="M${cx},${cy}L${cx},${f2(cy-r*.62)}" transform="rotate(${a} ${cx} ${cy})" stroke="#FFCB4F" stroke-width="${f2(r*.12)}" stroke-linecap="round"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="${f2(r*.2)}" fill="#5BE7FF" ${ln(2)}/>`;
function sqkChest(){
  const u='q'+(N++);
  return `<defs>${lg(u+'b',['#4A2C86','#2A1758','#140A2E'],.6,1)}${lg(u+'l',['#5E3AA6','#36206E','#1C0F40'],.6,1)}${lg(u+'m',['#3E2470','#22123F','#120826'],.5,1)}${rg(u+'g',['rgba(255,122,217,.8)','rgba(91,231,255,.22)','rgba(91,231,255,0)'],.5,.45,.55)}${rg(u+'c',['#FFF6C9','#FFCB4F','#B87A12'],.35,.3,.85)}</defs>
    <circle cy="-14" r="122" fill="url(#${u}g)"/>${[0,30,60,90,120,150,180,210,240,270,300,330].map((a,i)=>`<path d="M0,-20L-8,-130L8,-130Z" transform="rotate(${a} 0 -20)" fill="${i%2?'#5BE7FF':'#FF7AD9'}" opacity=".3"/>`).join('')}
    <ellipse cy="96" rx="98" ry="12" fill="#050310" opacity=".35"/>
    <rect x="-94" y="-22" width="188" height="112" rx="14" fill="url(#${u}b)" ${ln(4)}/><path d="M-94,-22C-94,-100 94,-100 94,-22Z" fill="url(#${u}l)" ${ln(4)}/>
    ${shine('M-76,-44C-52,-74 -16,-84 20,-82',.42,6)}
    <rect x="-70" y="-76" width="24" height="166" rx="6" fill="url(#${u}m)" ${ln(3.2)}/><rect x="46" y="-76" width="24" height="166" rx="6" fill="url(#${u}m)" ${ln(3.2)}/><rect x="-98" y="-31" width="196" height="20" rx="6" fill="url(#${u}m)" ${ln(3.2)}/>
    ${sqkRow(-88,-21,88,-21,13,0)}${sqkRow(-58,-62,-58,80,8,1)}${sqkRow(58,-62,58,80,8,2)}
    ${sqkWheel(0,-16,30,u+'c')}
    <text x="0" y="52" text-anchor="middle" font-family="Verdana,sans-serif" font-weight="800" font-size="28" letter-spacing="2" fill="#FFE27A" stroke="${INK}" stroke-width="2.6" paint-order="stroke">SQK</text>
    ${star5(-102,-88,11,'#FF7AD9',2)}${star5(98,-100,10,'#5BE7FF',2)}${star5(104,-26,7,'#FFE27A',1.6)}`;
}
function sqkPouch(){
  const u='o'+(N++),B=sm([[-28,-40],[-64,-10],[-84,38],[-68,86],[0,100],[68,86],[84,38],[64,-10],[28,-40]]);
  return `<defs>${lg(u+'v',['#8A5CF0','#4A2C9C','#22125A'],.6,1)}${rg(u+'s',['rgba(255,122,217,.7)','rgba(91,231,255,.16)','rgba(91,231,255,0)'],.5,.5,.5)}${rg(u+'c',['#FFF6C9','#FFCB4F','#B87A12'],.35,.3,.85)}<clipPath id="${u}k"><path d="${B}"/></clipPath></defs>
    <circle cy="22" r="106" fill="url(#${u}s)"/>
    <circle cx="-30" cy="-58" r="18" fill="url(#${u}c)" ${ln(3)}/><circle cx="26" cy="-64" r="20" fill="url(#${u}c)" ${ln(3)}/><circle cx="2" cy="-74" r="16" fill="url(#${u}c)" ${ln(3)}/>
    <path d="M-30,-44C-42,-62 -50,-72 -38,-84C-24,-76 -12,-80 0,-80C12,-80 24,-76 38,-84C50,-72 42,-62 30,-44Z" fill="url(#${u}v)" ${ln(3.4)}/>
    ${inked(B,`url(#${u}v)`,3.4)}
    <g clip-path="url(#${u}k)"><path d="M-90,70C-40,94 40,94 90,70V110H-90Z" fill="#160A3E" opacity=".55"/><path d="M-60,-6C-70,14 -76,36 -74,56" fill="none" stroke="#E6D6FF" stroke-opacity=".55" stroke-width="8" stroke-linecap="round"/></g>
    <path d="M-34,-44C-14,-32 14,-32 34,-44L38,-32C14,-18 -14,-18 -38,-32Z" fill="url(#gGold)" ${ln(3)}/>
    ${sqkRow(-30,-34,30,-34,5,0)}
    ${sqkWheel(0,38,32,u+'c')}
    ${star5(-80,-36,11,'#FF7AD9',2)}${star5(82,-28,9,'#5BE7FF',1.8)}${star5(86,70,7,'#FFE27A',1.4)}`;
}
/* one finished picture as an svg string, for baking */
const VB_PET='-124 -226 248 248';
function wearAll(key,gear){
  return {hat:gear&&gear.hat?GEAR['hat_'+gear.hat]:ownPiece(key,'hat'),armor:gear&&gear.armor?GEAR['armor_'+gear.armor]:ownPiece(key,'armor'),weapon:gear&&gear.weapon?GEAR['weapon_'+gear.weapon]:ownPiece(key,'weapon'),charm:gear&&gear.charm?GEAR['charm_'+gear.charm]:ownPiece(key,'charm'),off:(gear&&gear.weapon&&PETS[key].off)?null:ownPiece(key,'off')};
}
const BOSS_VB=k=>{const b=BOSS[k]||RA.MON[k];return `${-b.w/2-30+(b.ax||0)} ${-b.h-30} ${b.w+60} ${b.h+60}`;};
return {INK,f2,sm,ln,inked,lg,rg,shine,bossEye,brow,teeth,G,mix,PETS,GEAR,BOSS,FUR,BACKS,FACE,CLOTH,SKIRT,hamster,ownPiece,pieceOf,wearAll,chainPath,shoulderArt,gearIcon,blindBag,snackBag,picnicBag,feastBag,chestArt,sqkChest,sqkPouch,ensureDefs,inlineDefs,VB_PET,BOSS_VB,star5,zap,HEAD,TORSO};
})();
