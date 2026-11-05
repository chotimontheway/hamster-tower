/* MOTION: characters made of named parts and a pose of plain numbers, so any two poses blend smoothly. One clock moves them all and stops itself when nothing is on screen. */
const MOT=(()=>{
const {INK,f2}=RA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),rad=d=>d*Math.PI/180;
const EASE={lin:t=>t,out:t=>1-(1-t)*(1-t)*(1-t),in:t=>t*t*t,inOut:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,back:t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);}};
const TW=[],ALL=new Set();let raf=0,last=0,now=0,frozen=0,skip=0,epoch=0;
const spd=()=>(typeof speed==='function'?speed():1);
function tw(o,to,ms,e='out'){
  return new Promise(res=>{if(RM){Object.assign(o,to);res();return;}const from={};for(const k in to){from[k]=o[k];for(const w of TW)if(w.o===o&&k in w.to)delete w.to[k];}TW.push({o,from,to,t:0,ms:Math.max(1,ms/spd()),e:EASE[e]||EASE.out,res});kick();});
}
/* a move still waiting when its battle ends simply never continues */
const nap=ms=>new Promise(r=>{const e=epoch;setTimeout(()=>{if(e===epoch)r();},RM?0:ms/spd());});
const freeze=ms=>{if(!RM)frozen=Math.max(frozen,ms/spd());};
function kick(){if(!raf){last=0;raf=requestAnimationFrame(loop);}}
function loop(t){
  raf=0;const real=Math.min(50,last?t-last:16);last=t;
  let dt=real;if(frozen>0){frozen-=real;dt=0;}now+=real;
  for(let i=TW.length-1;i>=0;i--){const w=TW[i];w.t+=dt;const k=w.e(clamp(w.t/w.ms,0,1));for(const n in w.to)w.o[n]=lerp(w.from[n],w.to[n],k);if(w.t>=w.ms){TW.splice(i,1);w.res();}}
  const low=typeof FX!=='undefined'&&FX.Q&&FX.Q.level===0;skip++;
  let live=false;for(const a of ALL){if(!a.el.isConnected){ALL.delete(a);continue;}if(!a.still)live=true;if(a.still&&!a.moving())continue;if(low&&skip%2&&!a.moving())continue;try{a.update(now);}catch(err){ALL.delete(a);}}
  if((live&&!document.hidden)||TW.length)raf=requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(ALL.size||TW.length))kick();});
const POSE={x:0,y:0,hop:0,lean:0,sx:1,sy:1,head:0,headY:0,armF:-58,wF:90,armB:-24,wB:8,legF:0,legB:0,legFy:0,legBy:0,ear:0,brow:0,flash:0,alpha:1,cold:0,kx:0,kl:0,kq:0,a:0,b:0,wig:0,tail:0,tailA:1,puff:0,pupil:.1,lid:.3,claws:0,spikes:0};
const ELC={seed:'#35D07F',dream:'#F06BAE',spark:'#FFC94D',water:'#2FD6E8',steel:'#A8BAFF'};
class Actor{
  constructor(kind,key,o={}){
    this.kind=kind;this.key=key;this.o=o;this.still=!!o.still;this.flip=!!o.flip;this.ph=Math.random()*9;this.idle=(o.still||RM)?0:1;this.nextBlink=rnd(800,3000);this.blinkT=-1;this.base='open';
    this.p=Object.assign({},POSE);this.moves=0;
    {
      const el=document.createElementNS('http://www.w3.org/2000/svg','svg');el.setAttribute('class','rig '+kind);el.setAttribute('aria-hidden','true');
      if(kind==='ham'){this.d=RA.PETS[key];const s=this.d.scale||1,w=248/s;this.vb=[-w/2+4,-(226/s),w,w];el.innerHTML=RA.hamster(key);this.scale=s;}
      else{const b=RA.BOSS[key]||RA.MON[key];const[x,y,w,h]=RA.BOSS_VB(key).split(' ').map(Number);this.vb=[x,y,w,h];const id='b'+Math.floor(Math.random()*1e9);el.innerHTML=`<ellipse data-p="shadow" cx="${b.ax||0}" cy="3" rx="${b.w*.42}" ry="${Math.max(12,b.w*.05)}" fill="#050310" opacity=".42"/><g data-p="body"><g data-p="parts">${b.art(s=>id+s)}</g></g>`;}
      el.setAttribute('viewBox',this.vb.join(' '));this.el=el;this.collect();
      if(kind==='mon')this.lids=[...el.querySelectorAll('[data-p^="eye"]')].map(n=>[n,n.getAttribute('transform')||'']);
      if(kind==='ham'){this.setBack();this.setFace();this.wear(o.gear);if(this.d.rar==='l')this.addAura();else if(this.d.rar==='e')this.addMotes();}
      RA.ensureDefs();
    }
    ALL.add(this);this.update(0);if(!o.still)kick();
  }
  moving(){return TW.some(w=>w.o===this.p);}
  collect(){this.P={};this.el.querySelectorAll('[data-p]').forEach(n=>{this.P[n.getAttribute('data-p')]=n;});}
  box(s){return this.el.querySelector(`[data-slot="${s}"]`);}
  setBack(){
    const d=this.d,P=this.P;
    if(d.back){const b=RA.BACKS[d.back];P.back.innerHTML=b(d.backC);this.collect();}
    if(d.eyes==='wink'){P.eyeB.setAttribute('display','none');P.eyesOpen.insertAdjacentHTML('beforeend',`<path d="M26,-100Q37,-114 48,-100" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`);}
    if(d.eyes==='happy')this.base='joy';
    if(d.eyes==='angry')this.p.brow=13;
    if(d.eyes==='star')this.p.brow=0;
    this.face(this.base);
  }
  setFace(){
    const d=this.d,f=d.face;if(!f)return;
    if(f==='mask')this.box('faceIn').innerHTML=RA.FACE.mask();
    else if(f==='scarf')this.P.chain.insertAdjacentHTML('beforebegin',`<g>${RA.FACE.scarf(d.faceC||'#2FB8C8')}</g>`);
    else this.box('faceOut').innerHTML=RA.FACE[f]();
  }
  /* gear: {weapon:'knight',hat:'miner',...}, an empty slot shows the pet's own piece */
  wear(gear){
    const w=RA.wearAll(this.key,gear),P=this.P;this.gear=gear||null;
    const hat=w.hat||{art:'',ears:true};this.box('hat').innerHTML=hat.art;const ears=hat.ears!==false;P.earF.setAttribute('display',ears?'inline':'none');P.earB.setAttribute('display',ears?'inline':'none');
    const ar=w.armor||{art:''};this.box('armor').innerHTML=ar.art;
    P.shoulderTop.innerHTML=ar.shoulder?RA.shoulderArt(ar.shoulder):'';
    P.skirt.innerHTML=ar.skirt?`<path d="${RA.SKIRT}" fill="${ar.skirt}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`:'';
    this.capeOn=!!(ar.cape||this.d.cape);const c=P.cape;c.setAttribute('fill',this.capeOn?(ar.cape||this.d.cape):'none');c.setAttribute('stroke',this.capeOn?INK:'none');c.setAttribute('stroke-width','3');c.setAttribute('stroke-linejoin','round');
    const wp=w.weapon;this.box('weapon').innerHTML=wp?wp.art:'';this.tool=wp||{len:40,rest:[-30,60],kind:'cast'};this.toolKind=wp?(wp.kind||(wp.len>=104&&!wp.rest?'cast':'melee')):'cast';
    const ch=w.charm;this.box('charm').innerHTML=ch?ch.art:'';P.chain.innerHTML=ch?RA.chainPath(ch.chain||'#FFCB4F'):'';
    this.box('off').innerHTML=w.off?w.off.art:'';
    this.rest();Object.assign(this.p,this.restP);this.collect();
    if(this.P.over&&!this.P.over.isConnected)this.P.body.appendChild(this.P.over);
    RA.ensureDefs();
  }
  rest(){const r=this.tool&&this.tool.rest||[-58,90];this.restP={armF:r[0],wF:r[1],armB:-24,wB:8,lean:0,sx:1,sy:1,head:0,headY:0,legF:0,legB:0,legFy:0,legBy:0,ear:0,brow:this.d&&this.d.eyes==='angry'?13:0};return this.restP;}
  addAura(){
    const key=this.key,col={thor:['#FFD94D','#FFF6BE','gGlowY'],king:['#FFCB4F','#FFF2C8','gGlowY'],sandman:['#F06BAE','#E6CDFF','gGlowP'],poseidon:['#2FD6E8','#D9F8FF','gGlowC'],squeektoshi:['#FFCB4F','#FFF2C8','gGlowY']}[key]||['#FFD94D','#FFF6BE','gGlowY'];
    this.P.aura.innerHTML=`<ellipse cx="4" cy="2" rx="122" ry="26" fill="url(#${col[2]})"/><ellipse data-a="1" cx="4" cy="2" rx="98" ry="19" fill="none" stroke="${col[0]}" stroke-width="2.6" stroke-dasharray="14 9" opacity=".9"/><ellipse data-a="2" cx="4" cy="2" rx="74" ry="13" fill="none" stroke="${col[1]}" stroke-width="1.8" stroke-dasharray="5 7" opacity=".85"/>`;
    this.rings=[...this.P.aura.querySelectorAll('[data-a]')];
    const over=document.createElementNS('http://www.w3.org/2000/svg','g');over.setAttribute('data-p','over');this.P.body.appendChild(over);this.P.over=over;
    if(key==='thor'){over.innerHTML=`<path fill="none" stroke="#FFF6A8" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><path fill="none" stroke="#7FD4FF" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path fill="none" stroke="#FFF6A8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;this.arcs=[...over.children];this.arcAt=0;}
    else{over.innerHTML=[0,1,2,3].map(()=>`<path d="M0,-8L3,-3L8,0L3,3L0,8L-3,3L-8,0L-3,-3Z" fill="${col[1]}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`).join('');this.motes=[...over.children];this.moteR=[92,-70,30];}
  }
  addMotes(){
    const c=this.d.motes||ELC[this.d.el]||'#FFF6C9',over=document.createElementNS('http://www.w3.org/2000/svg','g');over.setAttribute('data-p','over');this.P.body.appendChild(over);this.P.over=over;
    over.innerHTML=[0,1,2].map(()=>`<path d="M0,-8L5,0L0,8L-5,0Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join('');this.motes=[...over.children];this.onTool=this.d.motes?true:false;this.moteR=[76,-90,24];
  }
  face(s){if(this.kind!=='ham'&&this.kind!=='boss')return;const P=this.P;if(!P.eyesOpen)return;P.eyesOpen.setAttribute('display',s==='open'?'inline':'none');P.eyesHurt.setAttribute('display',s==='hurt'?'inline':'none');P.eyesJoy.setAttribute('display',s==='joy'?'inline':'none');}
  mouth(o){const P=this.P;if(!P.mouthC)return;P.mouthC.setAttribute('display',o?'none':'inline');P.mouthO.setAttribute('display',o?'inline':'none');}
  /* screen positions */
  rect(){return this.el.parentNode.getBoundingClientRect();}
  k(){const r=this.rect();return Math.min(r.width/this.vb[2],r.height/this.vb[3]);}
  vp(lx,ly){
    const r=this.rect(),p=this.p,k=this.k(),ox=(r.width-this.vb[2]*k)/2,oy=(r.height-this.vb[3]*k)/2,cx=lx*p.sx,cy=ly*p.sy,a=rad(p.lean),dx=cx,dy=cy+30,rx=dx*Math.cos(a)-dy*Math.sin(a),ry=-30+dx*Math.sin(a)+dy*Math.cos(a);
    const x=ox+(rx-this.vb[0])*k;return {x:r.left+p.x+(this.flip?r.width-x:x),y:r.top+oy+p.y+(ry-p.hop-this.vb[1])*k};
  }
  hand(){const p=this.p,a=rad(p.armF);return [-20-Math.sin(a)*31,-56+Math.cos(a)*31];}
  tip(extra=0){if(this.kind!=='ham')return this.center();const p=this.p,[hx,hy]=this.hand(),w=rad(p.armF+p.wF+(this.tool&&this.tool.aim||0)),len=(this.tool&&this.tool.len||50)+extra;return this.vp(hx+Math.sin(w)*len,hy-Math.cos(w)*len);}
  center(){if(this.kind==='ham')return this.vp(2,-74);const b=RA.BOSS[this.key]||RA.MON[this.key];return this.vp(b.ax||0,-b.h*.45);}
  /* one frame */
  update(t){
    const p=this.p,el=this.el,br=Math.sin(t*.0024+this.ph)*this.idle;
    const X=p.x+p.kx,tf=(X||p.y||this.flip)?`translate(${f2(X)}px,${f2(p.y)}px)${this.flip?' scaleX(-1)':''}`:'';if(tf!==this.tf){el.style.transform=tf;this.tf=tf;}
    const fl=p.flash,cd=p.cold;const fv=cd>.02?`saturate(${f2(1-.7*cd)}) brightness(${f2(1+.25*cd)}) hue-rotate(${f2(170*cd)}deg)`:(fl>.02?`brightness(${f2(1+fl*1.5)}) saturate(${f2(1-fl*.5)})`:'');if(fv!==this.fv){el.style.filter=fv;this.fv=fv;}
    const op=p.alpha<.995?String(f2(p.alpha)):'';if(op!==this.op){el.style.opacity=op;this.op=op;}
    const P=this.P;
    P.body.setAttribute('transform',`translate(0,${f2(-p.hop)}) rotate(${f2(p.lean+p.kl)} 0 -30) scale(${f2(p.sx*(1-p.kq*.05)-br*.008)},${f2(p.sy*(1+p.kq*.04)+br*.012)})`);
    if(P.shadow){const k=clamp(1-p.hop/320,.4,1);P.shadow.setAttribute('transform',`scale(${f2(k)},${f2(k)})`);}
    if(this.kind==='ham')this.upHam(t,br);else if(this.kind==='mon')this.upMon(t,br);else{const f=BOSS_UP[this.key];if(f)f(this,P,p,t,br);}
  }
  blink(t){if(t>this.nextBlink){this.blinkT=t;this.nextBlink=t+rnd(1800,4600);}const b=this.blinkT<0?0:(t-this.blinkT);return b>0&&b<130?.1:1;}
  /* each monster lists how its parts move: r turns about x,y, w spins about x,y, x and y slide, s scales about x,y, o fades */
  upMon(t){
    const p=this.p,P=this.P,m=RA.MON[this.key];
    for(const[n,k,x,y,amp,sp,ph,at]of m.mv||[]){const N=P[n];if(!N)continue;const w=Math.sin(t*sp+ph+this.ph)*amp*this.idle+p.a*(at||0);
      if(k==='r')N.setAttribute('transform',`rotate(${f2(w)} ${x} ${y})`);
      else if(k==='w')N.setAttribute('transform',`rotate(${f2((this.idle?t*sp*57:0)+p.a*(at||0))} ${x} ${y})`);
      else if(k==='y')N.setAttribute('transform',`translate(0,${f2(w)})`);
      else if(k==='x')N.setAttribute('transform',`translate(${f2(w)},0)`);
      else if(k==='s')N.setAttribute('transform',`translate(${x},${y}) scale(${f2(1+w)}) translate(${-x},${-y})`);
      else if(k==='o')N.setAttribute('opacity',f2(clamp(.5+w,0,1)));}
    if(this.lids.length){const s=this.blink(t);for(const[n,b]of this.lids)n.setAttribute('transform',`${b} scale(1,${s})`);}
  }
  upHam(t,br){
    const p=this.p,P=this.P,sw=Math.sin(t*.0018+this.ph)*this.idle;
    P.head.setAttribute('transform',`translate(0,${f2(p.headY+br*1.3)}) rotate(${f2(p.head+sw*1.3)} 4 -66)`);
    const af=f2(p.armF+br*1.8);
    P.armF.setAttribute('transform',`translate(-20,-56) rotate(${af})`);
    P.wF.setAttribute('transform',`translate(-20,-56) rotate(${af}) translate(0,31) rotate(${f2(p.wF)})`);
    P.armB.setAttribute('transform',`translate(26,-58) rotate(${f2(p.armB-br*1.4)})`);
    const a=rad(p.armB);P.off.setAttribute('transform',`translate(${f2(26-Math.sin(a)*28)},${f2(-58+Math.cos(a)*28)}) rotate(${f2(p.wB)})`);
    P.legF.setAttribute('transform',`translate(0,${f2(-p.legFy)}) rotate(${f2(p.legF)} -16 -12)`);
    P.legB.setAttribute('transform',`translate(0,${f2(-p.legBy)}) rotate(${f2(p.legB)} 22 -12)`);
    P.tail.setAttribute('transform',`rotate(${f2(Math.sin(t*.006+this.ph)*7*this.idle)} -36 -28)`);
    P.charm.setAttribute('transform',`translate(27,-52) rotate(${f2(sw*6+p.lean*.9)})`);
    const twitch=Math.sin(t*.0011+this.ph)>.96?Math.sin(t*.03)*9:0;
    P.earF.setAttribute('transform',`rotate(${f2(p.ear+twitch)} -30 -132)`);P.earB.setAttribute('transform',`rotate(${f2(-p.ear-twitch*.6)} 40 -134)`);
    const s=this.blink(t);
    P.eyeF.setAttribute('transform',`translate(-10,-104) scale(1,${s})`);if(!this.d||this.d.eyes!=='wink')P.eyeB.setAttribute('transform',`translate(37,-104) scale(1,${s})`);
    P.browF.setAttribute('transform',`rotate(${f2(p.brow)} -11 -128) translate(0,${f2(p.brow>0?p.brow*.3:0)})`);P.browB.setAttribute('transform',`rotate(${f2(-p.brow)} 39 -128) translate(0,${f2(p.brow>0?p.brow*.3:0)})`);
    if(P.plume)P.plume.setAttribute('transform',`rotate(${f2(sw*4-p.lean*.9)} 2 -160)`);
    if(P.wheel)P.wheel.setAttribute('transform',`rotate(${f2(t*.02+p.a*200)} 6 -82)`);
    if(this.capeOn){const w1=Math.sin(t*.0032+this.ph)*7*this.idle-p.lean*1.2,w2=Math.sin(t*.0026+this.ph+1)*11*this.idle-p.lean*2;P.cape.setAttribute('d',`M-30,-72C-52,-54 ${f2(-74+w1)},-28 ${f2(-86+w2)},3C-58,${f2(10+w1*.3)} -20,${f2(7-w1*.3)} 12,2C6,-22 14,-50 28,-72Z`);}
    if(this.rings){this.rings[0].setAttribute('stroke-dashoffset',f2(t*.035));this.rings[1].setAttribute('stroke-dashoffset',f2(-t*.05));}
    if(this.motes){const[rx,cy,ry]=this.moteR;const[hx,hy]=this.hand(),w=rad(p.armF+p.wF);const mx=this.onTool?hx+Math.sin(w)*118:4,my=this.onTool?hy-Math.cos(w)*118:cy;this.motes.forEach((n,i)=>{const a=t*.0016+i*6.283/this.motes.length;n.setAttribute('transform',`translate(${f2(mx+Math.cos(a)*(this.onTool?38:rx))},${f2(my+Math.sin(a)*(this.onTool?15:ry))}) rotate(${f2(a*40)}) scale(${f2(.75+Math.sin(a)*.25)})`);});}
    if(this.arcs&&t>this.arcAt){this.arcAt=t+rnd(55,110);const[hx,hy]=this.hand(),w=rad(p.armF+p.wF);const cx=hx+Math.sin(w)*100,cy=hy-Math.cos(w)*100;this.arcs.forEach(n=>{if(Math.random()<.34){n.setAttribute('d','');return;}const a=rnd(0,6.28),r0=rnd(24,40);let x=cx+Math.cos(a)*r0,y=cy+Math.sin(a)*r0*.8,d=`M${f2(x)},${f2(y)}`;for(let k=0;k<4;k++){x+=Math.cos(a+rnd(-1,1))*rnd(8,17);y+=Math.sin(a+rnd(-1,1))*rnd(8,17);d+=`L${f2(x)},${f2(y)}`;}n.setAttribute('d',d);});}
  }
}
/* how each boss moves its parts. p.a is the attack amount from 0 to 1 */
const rot=(n,a,x,y)=>{if(n)n.setAttribute('transform',`rotate(${f2(a)} ${x} ${y})`);};
const BOSS_UP={
  neighbor_cat(A,P,p,t,br){
    const sw=Math.sin(t*.0017+A.ph)*A.idle;
    rot(P.back,p.wig+br*.35,-80,-40);
    P.head.setAttribute('transform',`translate(0,${f2(p.headY+br*1.6)}) rotate(${f2(p.head+sw*1.2)} -100 -100)`);
    P.collar.setAttribute('transform',`translate(0,${f2((p.headY+br*1.6)*.7)}) rotate(${f2(p.head*.6)} -100 -100)`);
    rot(P.bell,sw*7+p.lean*1.6,-110,-82);rot(P.legF,p.legF,-96,-92);rot(P.legB,p.legB,-34,-92);
    P.legFC.setAttribute('opacity',f2(p.claws));P.legBC.setAttribute('opacity',f2(p.claws));
    const a=Math.sin(t*.0024+A.ph)*p.tailA*A.idle+p.tail,b=Math.sin(t*.0024+A.ph+1.1)*p.tailA*A.idle;
    const d=`M146,-74C${f2(196+a*12)},-74 ${f2(214+a*26)},${f2(-132+b*8)} ${f2(204+a*42)},${f2(-204+b*18)}C${f2(198+a*48)},${f2(-234+b*20)} ${f2(176+a*60)},${f2(-244+b*22)} ${f2(162+a*66)},${f2(-226+b*20)}`;
    P.tailI.setAttribute('d',d);P.tailF.setAttribute('d',d);P.tailS.setAttribute('d',d);
    P.tailI.setAttribute('stroke-width',f2(36+p.puff*26));P.tailF.setAttribute('stroke-width',f2(28+p.puff*26));P.tailS.setAttribute('stroke-width',f2(28+p.puff*26));
    const s=A.blink(t);P.eyeF.setAttribute('transform',`translate(-70,-172) scale(1,${s})`);P.eyeB.setAttribute('transform',`translate(-150,-172) scale(1,${s})`);
    P.pupF.setAttribute('rx',f2(5+p.pupil*14));P.pupB.setAttribute('rx',f2(4+p.pupil*12));
    const lo=(p.lid-.3)*34;P.lidF.setAttribute('transform',`translate(0,${f2(lo)})`);P.lidB.setAttribute('transform',`translate(0,${f2(lo)})`);
    const tw2=Math.sin(t*.0009+A.ph)>.97?Math.sin(t*.04)*7:0;rot(P.earF,p.ear+tw2,-50,-226);rot(P.earB,-p.ear,-176,-226);
    P.spikes.setAttribute('opacity',f2(p.spikes));P.spikes.setAttribute('transform',`translate(${f2((p.spikes-1)*-8)},${f2((1-p.spikes)*26)})`);
  },
  alarm_clock(A,P,p,t){const sh=Math.sin(t*.09)*p.a,h=t*.012;rot(P.bellL,sh*16,-60,-222);rot(P.bellR,-sh*16,60,-222);rot(P.clapper,Math.sin(t*.14)*p.a*38,0,-236);rot(P.minute,h+p.a*400,0,-126);rot(P.hour,h/12+p.a*80,0,-126);rot(P.legL,Math.sin(t*.05)*p.a*7,-54,-46);rot(P.legR,-Math.sin(t*.05)*p.a*7,54,-46);},
  giant_vacuum(A,P,p,t,br){rot(P.hose,Math.sin(t*.0022+A.ph)*2.2*A.idle-p.a*10,-76,-150);rot(P.nozzle,p.a*-14,-166,-46);},
  thief_squirrel(A,P,p,t,br){rot(P.tail,Math.sin(t*.0034+A.ph)*5*A.idle+p.a*16,56,-60);rot(P.bag,Math.sin(t*.002+A.ph)*1.6*A.idle-p.a*22,-116,-4);P.head.setAttribute('transform',`translate(0,${f2(br*1.8)})`);},
  rug_puller(A,P,p,t,br){rot(P.armR,Math.sin(t*.003+A.ph)*3*A.idle-p.a*16,70,-132);rot(P.armL,p.a*26,-70,-132);P.head.setAttribute('transform',`translate(0,${f2(br*1.6)})`);const w=Math.sin(t*.004+A.ph)*5*(A.idle+p.a*2);P.rugP.setAttribute('d',`M-190,-44C-120,${f2(-52+w)} -60,${f2(-38-w)} 0,-44C60,${f2(-52-w)} 120,${f2(-38+w)} 190,-44L190,0L-190,0Z`);if(p.a>.02)P.rug.setAttribute('transform',`translate(${f2(-p.a*42)},0)`);else P.rug.removeAttribute('transform');},
  broken_faucet(A,P,p,t,br){rot(P.handle,Math.sin(t*.002+A.ph)*5*A.idle+p.a*62,-10,-270);P.water.setAttribute('transform',`translate(114,-90) scale(${f2(1+p.a*.5+Math.sin(t*.012)*.03)},${f2(1+p.a*.14)}) translate(-114,90)`);},
  dumping_whale(A,P,p,t,br){rot(P.tail,Math.sin(t*.0028+A.ph)*5*A.idle-p.a*16,120,-80);rot(P.fin,Math.sin(t*.003+A.ph)*5*A.idle+p.a*20,-20,-60);rot(P.crown,p.a*-5,-82,-196);P.candles.setAttribute('transform',`translate(0,${f2(p.a*22+Math.sin(t*.004)*3*A.idle)})`);},
  overloaded_charger(A,P,p,t,br){const on=Math.sin(t*.03)>0;P.zaps.setAttribute('opacity',on||p.a>.1?'1':'.25');P.led.setAttribute('opacity',f2(.4+.6*Math.abs(Math.sin(t*.008))));rot(P.cord,Math.sin(t*.003+A.ph)*3*A.idle,0,-40);},
  reorg_ghost(A,P,p,t,br){for(let i=0;i<4;i++){const n=P['blk'+i];if(!n)continue;const q=Math.sin(t*.0024+i*1.7)*10*A.idle,w=Math.cos(t*.0019+i)*6*A.idle;n.setAttribute('transform',`translate(${f2(w+(p.a*(i%2?-1:1)*-40))},${f2(q)})`);}const h=Math.sin(t*.0022+A.ph)*7*A.idle;P.body.setAttribute('transform',`translate(0,${f2(-p.hop-h-8)}) rotate(${f2(p.lean)} 0 -30) scale(${f2(p.sx)},${f2(p.sy)})`);const w=Math.sin(t*.005+A.ph)*5;P.sheetP.setAttribute('d',`M-100,-20V-168C-100,-268 100,-268 100,-168V-20L68,${f2(-52+w)}L34,-20L0,${f2(-52-w)}L-34,-20L-68,${f2(-52+w)}Z`);P.zaps.setAttribute('opacity',Math.sin(t*.02)>0?'1':'.3');},
  cage_hand(A,P,p,t,br){const c=p.a*44;[['f1',-82,-140,2],['f2',-30,-140,1],['f3',24,-140,-1],['f4',74,-140,-2]].forEach(([n,x,y,s],i)=>{P[n].setAttribute('transform',`translate(0,${f2(Math.sin(t*.003+i*1.1)*4*A.idle+c)}) rotate(${f2(Math.sin(t*.0024+i)*s*.6*A.idle)} ${x} ${y})`);});rot(P.thumb,Math.sin(t*.0026)*3*A.idle-p.a*24,92,-96);},
};
/* EFFECTS drawn through the same canvas as every skill. Coordinates are screen pixels */
const fn=(life,draw,o)=>FX.add(Object.assign({k:'fn',fn:draw,life,x:0,y:0,fade:1},o||{}));
function jagPts(a,b,n=9,amp=.11){const pts=[[a.x,a.y]],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;for(let i=1;i<n;i++){const k=i/n,o=rnd(-1,1)*len*amp*(1-Math.abs(k-.5));pts.push([a.x+dx*k+nx*o,a.y+dy*k+ny*o]);}pts.push([b.x,b.y]);return pts;}
const curve=p=>{if(p.length<3)return p;const o=[p[0]];for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1];o.push({x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25},{x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75});}o.push(p[p.length-1]);return o;};
function strokePts(g,pts,c,w){g.lineJoin='round';g.lineCap='round';g.strokeStyle=c;g.lineWidth=w;g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();}
const E2={
  bolt(a,b,c='#FFE97A',ms=280,w=6,o){let pts=null,at=0;fn(ms,(g,u)=>{at--;if(at<=0||!pts){at=3;pts=jagPts(a,b);}g.save();g.globalCompositeOperation='lighter';const al=u<.7?1:1-(u-.7)/.3;g.globalAlpha=.34*al;strokePts(g,pts,c,w*3.2);g.globalAlpha=al;strokePts(g,pts,c,w);strokePts(g,pts,'#fff',w*.42);g.restore();},o);},
  slash(x,y,len,ang,c='#fff',ms=240,w=13,o){fn(ms,(g,u)=>{const e=EASE.out(Math.min(1,u*2.5)),q=w*(1-u);g.save();g.translate(x,y);g.rotate(ang);g.globalCompositeOperation='lighter';g.fillStyle=c;g.beginPath();g.moveTo(-len*e,0);g.quadraticCurveTo(0,-q,len*e,0);g.quadraticCurveTo(0,q,-len*e,0);g.fill();g.fillStyle='#fff';g.beginPath();g.moveTo(-len*e*.8,0);g.quadraticCurveTo(0,-q*.4,len*e*.8,0);g.quadraticCurveTo(0,q*.4,-len*e*.8,0);g.fill();g.restore();},o);},
  /* a ribbon that follows the weapon */
  trail(actor,c,ms=260){const pts=[],base=[];fn(ms,(g,u)=>{if(u<.7&&actor.el.isConnected){pts.push(actor.tip());base.push(actor.vp(...actor.hand()));}if(pts.length<2)return;const P=curve(curve(pts)),Q=curve(curve(base)),n=P.length,fade=u<.65?1:1-(u-.65)/.35;g.save();g.globalCompositeOperation='lighter';for(let i=1;i<n;i++){const k=i/n,a=P[i-1],b=P[i],d=Q[i-1],e=Q[i];g.globalAlpha=fade*k*k*.95;g.fillStyle=c;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(lerp(b.x,e.x,.42),lerp(b.y,e.y,.42));g.lineTo(lerp(a.x,d.x,.42),lerp(a.y,d.y,.42));g.closePath();g.fill();}g.globalAlpha=fade;g.strokeStyle='#fff';g.lineWidth=2.6;g.lineCap='round';g.beginPath();P.forEach((a,i)=>i?g.lineTo(a.x,a.y):g.moveTo(a.x,a.y));g.stroke();g.restore();});},
  /* hexes on a shield light up in a wave from where it was hit */
  domeWave(cx,cy,R,px,py,power=1,c=[170,235,255]){const s=Math.max(9,R/5.4),hex=[];for(let q=-7;q<=7;q++)for(let r=-7;r<=7;r++){const x=s*1.732*(q+r/2),y=s*1.5*r;if(Math.hypot(x,y)<R+s)hex.push([cx+x,cy+y]);}
    fn(560,(g,u,it)=>{g.save();g.beginPath();g.arc(cx,cy,R,0,6.283);g.clip();g.globalCompositeOperation='lighter';const front=u*R*2.4;for(const[x,y]of hex){const d=Math.hypot(x-px,y-py),band=Math.max(0,1-Math.abs(d-front)/(R*.42)),e=band*(1-u)*1.2*power;if(e<.03)continue;g.beginPath();for(let i=0;i<6;i++){const a=i/6*6.283+.5236;const hx=x+Math.cos(a)*(s-1.4),hy=y+Math.sin(a)*(s-1.4);i?g.lineTo(hx,hy):g.moveTo(hx,hy);}g.closePath();g.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${clamp(e*1.6,0,1)})`;g.lineWidth=1.8;g.stroke();if(e>.2){g.fillStyle=`rgba(150,225,255,${clamp((e-.15)*.7,0,.7)})`;g.fill();}}g.restore();g.save();g.globalCompositeOperation='lighter';g.globalAlpha=(1-u)*.75;g.strokeStyle='#DFF6FF';g.lineWidth=2+4*(1-u);g.beginPath();g.arc(cx,cy,R,0,6.283);g.stroke();g.restore();});},
  cracks(cx,cy,R,px,py){const list=[];for(let i=0;i<8;i++){let a=Math.atan2(cy-py,cx-px)+rnd(-1.2,1.2),x=px,y=py;const pts=[[x,y]];for(let j=0;j<5;j++){a+=rnd(-.6,.6);const l=rnd(R*.13,R*.32);x+=Math.cos(a)*l;y+=Math.sin(a)*l;pts.push([x,y]);}list.push(pts);}fn(240,(g,u)=>{g.save();g.globalAlpha=1;for(const pts of list){const n=Math.max(2,Math.ceil(pts.length*Math.min(1,u*3)));strokePts(g,pts.slice(0,n),'rgba(255,255,255,.95)',2.6);}g.restore();});},
  shatter(cx,cy,R){for(let j=0,m=Math.round(44*FX.qm());j<m;j++){const a=rnd(0,6.283),d=rnd(.45,1)*R,v=rnd(110,500);FX.add({k:'p',shape:j%3?'shard':'dot',x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,ay:560,drag:.8,life:rnd(500,1000),size:rnd(4,12),c:j%2?'#BEEBFF':'#7FD4FF',rot:a,vr:rnd(-11,11)});}FX.ring({x:cx,y:cy},'#DFF6FF',R*.6,R*2.2,14,600);FX.ring({x:cx,y:cy},'#7FD4FF',R*.3,R*1.6,9,420);FX.burst(cx,cy,'#fff',18,520,'spark',6,340);},
  orb(x,y,R,col=['rgba(235,252,255,.95)','rgba(110,215,250,.92)','rgba(22,92,190,.94)'],glow='rgba(60,190,255,.42)'){const o={x,y,R,el:0,on:true,ph:0};
    const it=fn(4000,(g,u,p)=>{if(!o.on){p.t=p.life;return;}o.ph+=.08;const r0=o.R;if(r0<1)return;const N=36;const path=()=>{g.beginPath();for(let i=0;i<=N;i++){const a=i/N*6.283,w=1+.055*Math.sin(a*3+o.ph*2)+.035*Math.sin(a*5-o.ph*3),rr=r0*w;i?g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):g.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();};g.save();g.globalAlpha=1;g.globalCompositeOperation='lighter';const gl=g.createRadialGradient(x,y,r0*.6,x,y,r0*1.7);gl.addColorStop(0,o.el>.5?'rgba(255,230,120,.5)':glow);gl.addColorStop(1,'rgba(60,190,255,0)');g.fillStyle=gl;g.beginPath();g.arc(x,y,r0*1.7,0,6.283);g.fill();g.globalCompositeOperation='source-over';path();const f=g.createRadialGradient(x-r0*.35,y-r0*.4,r0*.1,x,y,r0*1.05);f.addColorStop(0,col[0]);f.addColorStop(.35,col[1]);f.addColorStop(1,col[2]);g.fillStyle=f;g.fill();g.strokeStyle=INK;g.lineWidth=2.8;g.stroke();g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.ellipse(x-r0*.36,y-r0*.46,r0*.26,r0*.15,-.6,0,6.283);g.fill();if(o.el>0){g.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const a=rnd(0,6.28);strokePts(g,jagPts({x:x+Math.cos(a)*r0*.3,y:y+Math.sin(a)*r0*.3},{x:x+Math.cos(a)*r0*1.3,y:y+Math.sin(a)*r0*1.3},5),'#FFF0A0',2.6);}}g.restore();});
    return o;},
  wave(x0,x1,y,h0,ms,stops=['rgba(190,240,255,.95)','rgba(70,175,240,.9)','rgba(18,70,170,.88)']){fn(ms,(g,u,p)=>{const e=EASE.inOut(u),x=lerp(x0,x1,e),dir=x1>=x0?1:-1,h=lerp(.3,1,Math.sin(Math.min(1,u*1.2)*3.1416))*h0;const gr=g.createLinearGradient(0,y-h,0,y+10);gr.addColorStop(0,stops[0]);gr.addColorStop(.45,stops[1]);gr.addColorStop(1,stops[2]);g.save();g.fillStyle=gr;g.globalAlpha=u>.84?(1-u)/.16:1;const N=26,top=[];for(let i=0;i<=N;i++){const k=i/N,xx=lerp(x0-20*dir,x+50*dir,k),env=k<.78?Math.pow(k/.78,1.5):Math.pow(Math.cos((k-.78)/.22*1.5708),.7);top.push([xx,y-env*h*(1+.06*Math.sin(i*1.3+p.t*.02))]);}g.beginPath();g.moveTo(x0-20*dir,y+12);for(const q of top)g.lineTo(q[0],q[1]);g.lineTo(x+50*dir,y+12);g.closePath();g.fill();g.strokeStyle=INK;g.lineWidth=2.6;g.stroke();g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=4;g.lineCap='round';g.beginPath();for(let i=9;i<=22;i++)i===9?g.moveTo(top[i][0],top[i][1]+5):g.lineTo(top[i][0],top[i][1]+5);g.stroke();g.restore();});},
  cloud(x,y,R,c1,c2,ms=900){const puffs=[...Array(9)].map(()=>({a:rnd(0,6.28),d:rnd(.1,.9),r:rnd(.4,.8),s:rnd(.5,1.2)}));fn(ms,(g,u)=>{const al=(u<.2?u/.2:u>.65?1-(u-.65)/.35:1)*.78;g.save();for(const q of puffs){const px=x+Math.cos(q.a+u*q.s)*q.d*R*(.6+u*.6),py=y+Math.sin(q.a+u*q.s)*q.d*R*.6,pr=q.r*R*(.5+u*.5);const gr=g.createRadialGradient(px,py,0,px,py,pr);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.globalAlpha=al;g.fillStyle=gr;g.beginPath();g.arc(px,py,pr,0,6.283);g.fill();}g.restore();});},
};
/* THE TEN ELEMENT REACTIONS. Every reaction plays once in full per battle, later ones are shorter */
const center=(a,b,t=.5)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t)});
const REACT_FX={
  'spark+water':async(c)=>{const o=E2.orb(c.m.x,c.m.y,1);await tw(o,{R:c.orb},c.t*.3,'back');c.fire(o);o.el=1;E2.bolt(c.A,c.m,'#FFE97A',220,5);await nap(c.t*.12);FX.ring(c.m,'#FFF0A0',20,c.orb*3,12,420);FX.burst(c.m.x,c.m.y,'#8FE4FF',16,460,'drop',5,560,520);o.on=false;E2.wave(c.A.x,c.T.x+70*c.dir,c.T.y+c.h*.42,Math.min(c.h*.95,Math.abs(c.T.x-c.A.x)*.55),c.t*.5);for(let i=0;i<3;i++){E2.bolt(c.m,{x:lerp(c.m.x,c.T.x,(i+1)/3),y:c.T.y+rnd(-30,30)},'#FFE97A',200,4,{delay:i*70});}await nap(c.t*.26);E2.bolt({x:c.T.x,y:c.T.y-280},c.T,'#FFE97A',300,10);},
  'spark+steel':async(c)=>{FX.shot(c.Q,c.T,'shard',{c:'#D5DCEC',size:18,ms:c.t*.26});await nap(c.t*.26);E2.bolt(c.A,c.T,'#FFE97A',300,7);FX.ring(c.T,'#D5DCEC',10,c.R*1.5,8,320);c.others.forEach((o,i)=>E2.bolt(c.T,o,'#FFE97A',260,5,{delay:90+i*80}));FX.burst(c.T.x,c.T.y,'#FFF0A0',14,360,'spark',6,360);},
  'seed+spark':async(c)=>{for(let i=0;i<6;i++)FX.shot(c.Q,{x:c.T.x+rnd(-40,40),y:c.T.y+rnd(-30,30)},'leaf',{c:'#D9B46A',size:9,ms:c.t*.24,arc:30,delay:i*26});await nap(c.t*.34);E2.bolt(c.A,c.T,'#FFE97A',220,5);for(let i=0;i<Math.round(16*FX.qm());i++)FX.add({k:'p',shape:'drop',x:c.T.x+rnd(-c.R,c.R),y:c.T.y+rnd(-c.R*.6,c.R*.6),vx:rnd(-16,16),vy:rnd(-150,-60),life:rnd(400,760),size:rnd(7,15),c:i%2?'#FF8A3C':'#FFD24D',delay:rnd(0,200),fade:.5});FX.ring(c.T,'#F8A838',10,c.R*1.5,10,380,0,1);},
  'dream+spark':async(c)=>{FX.ring(c.T,'#F06BAE',c.R*1.6,10,6,c.t*.3);FX.shot(c.Q,c.T,'moon',{c:'#FFD2E6',size:14,ms:c.t*.3,spin:9});await nap(c.t*.3);E2.bolt(c.A,c.T,'#FFE97A',260,7);FX.ring(c.T,'#FFE14D',10,c.R*2,12,380);FX.ring(c.T,'#F06BAE',10,c.R*1.5,8,340,50);FX.burst(c.T.x,c.T.y,'#FFE14D',14,520,'spark',7,360);c.push(30);},
  'seed+water':async(c)=>{const o=E2.orb(c.m.x,c.m.y,1);await tw(o,{R:c.orb*.8},c.t*.26,'back');o.on=false;FX.burst(c.m.x,c.m.y,'#8FE4FF',14,340,'drop',5,500,520);await nap(c.t*.08);for(let i=0;i<Math.round(14*FX.qm());i++){const x=c.T.x+rnd(-c.R,c.R);FX.add({k:'p',shape:'leaf',x,y:c.T.y+c.h*.4,vx:rnd(-20,20),vy:rnd(-220,-120),ay:120,life:rnd(480,820),size:rnd(7,13),c:i%2?'#4CCB7F':'#8FE8B0',rot:rnd(-.5,.5),vr:rnd(-2,2),delay:rnd(0,160),fade:.6});}FX.ring(c.T,'#35D07F',10,c.R*1.4,8,360);c.allyHeal();},
  'steel+water':async(c)=>{const o=E2.orb(c.m.x,c.m.y,1);await tw(o,{R:c.orb*.7},c.t*.24,'back');o.on=false;for(let i=0;i<8;i++)FX.shot(c.m,{x:c.T.x+rnd(-40,40),y:c.T.y+rnd(-40,30)},'drop',{c:'#9FE0C0',size:8,ms:c.t*.2,delay:i*16,arc:20});await nap(c.t*.26);FX.shot(c.A,c.T,'gear',{c:'#A8BAFF',size:16,ms:c.t*.16,spin:18});await nap(c.t*.14);FX.ring(c.T,'#C9743F',10,c.R*1.5,10,380,0,1);for(let i=0;i<Math.round(12*FX.qm());i++)FX.add({k:'p',shape:'drop',x:c.T.x+rnd(-c.R*.8,c.R*.8),y:c.T.y+rnd(-c.R*.5,c.R*.2),vx:rnd(-10,10),vy:rnd(40,110),ay:360,life:rnd(500,900),size:rnd(4,8),c:i%2?'#C9743F':'#8A5A3A',delay:rnd(0,240),fade:.6});},
  'dream+water':async(c)=>{E2.cloud(c.T.x,c.T.y,c.R*1.7,'rgba(240,160,220,.75)','rgba(120,190,240,0)',c.t*1.1);E2.cloud(c.m.x,c.m.y,c.R,'rgba(150,220,250,.6)','rgba(240,160,220,0)',c.t*.6);await nap(c.t*.3);FX.ring(c.T,'#BFEFFF',10,c.R*1.6,6,420);FX.burst(c.T.x,c.T.y,'#FFD2E6',10,200,'bubble',6,620,-60);},
  'seed+steel':async(c)=>{const gear=(x,y,s)=>FX.add({k:'p',shape:'gear',x,y,vx:(c.T.x-x)*2,vy:(c.T.y-y)*2,life:c.t*.5,size:s,c:'#D5DCEC',rot:0,vr:s>20?16:-16,fade:.85});gear(c.A.x,c.A.y,24);gear(c.Q.x,c.Q.y,20);await nap(c.t*.34);E2.slash(c.T.x,c.T.y,c.R*1.5,-.7,'#E0E6F4',240,15);E2.slash(c.T.x,c.T.y,c.R*1.5,.7,'#E0E6F4',240,15,{delay:70});FX.burst(c.T.x,c.T.y,'#D9B46A',14,360,'leaf',6,500,300);FX.burst(c.T.x,c.T.y,'#E8344A',12,300,'drop',5,640,520);},
  'dream+seed':async(c)=>{for(let i=0;i<Math.round(16*FX.qm());i++){const a=rnd(0,6.28),r=rnd(20,c.R*1.5);FX.add({k:'p',shape:i%3?'leaf':'heart',x:c.T.x+Math.cos(a)*r,y:c.T.y+Math.sin(a)*r*.7,vx:rnd(-30,30),vy:rnd(-90,-30),life:rnd(620,1000),size:rnd(7,12),c:i%2?'#F7B6DA':'#8FE8B0',rot:rnd(-1,1),vr:rnd(-2,2),delay:rnd(0,240),fade:.6});}E2.cloud(c.T.x,c.T.y,c.R*1.3,'rgba(255,190,225,.55)','rgba(190,240,200,0)',c.t*.9);await nap(c.t*.3);c.team(p=>{FX.ring(p,'#FFC94D',8,44,5,360);FX.rise(p,'up',{n:3,c:'#FFC94D',size:7});});},
  'dream+steel':async(c)=>{const x=c.T.x,y=c.T.y;E2.cloud(x,y-c.R*.6,c.R*1.5,'rgba(70,40,110,.8)','rgba(40,20,70,0)',c.t*.8);const it={y:y-300};fn(c.t*.34,(g,u)=>{const e=u*u,ay=lerp(y-300,y-c.R*.1,e);g.save();g.globalAlpha=1;g.fillStyle='#5A6080';g.strokeStyle=INK;g.lineWidth=3;g.beginPath();g.moveTo(x-46,ay-34);g.lineTo(x+46,ay-34);g.quadraticCurveTo(x+40,ay-6,x+20,ay);g.lineTo(x+20,ay+14);g.lineTo(x+36,ay+30);g.lineTo(x-36,ay+30);g.lineTo(x-20,ay+14);g.lineTo(x-20,ay);g.quadraticCurveTo(x-40,ay-6,x-46,ay-34);g.closePath();g.fill();g.stroke();g.restore();});await nap(c.t*.34);FX.ring(c.T,'#A8BAFF',10,c.R*1.8,12,360);FX.burst(x,y,'#F06BAE',10,320,'star',8,520);c.flash('#2A1B3D',.3);},
};
/* the stage this module can talk to */
const reg=new Map();
function clear(){reg.clear();TW.length=0;frozen=0;epoch++;}
function get(id){return reg.get(id);}
/* a pet or an enemy inside its battle box */
function mount(u,box,gear){
  let a;
  if(u.side==='p')a=new Actor('ham',u.ref,{gear});
  else if(u.pet)a=new Actor('ham',u.ref,{gear:u.look,flip:true});
  else a=new Actor(RA.BOSS[u.ref]?'boss':'mon',u.ref);
  box.insertBefore(a.el,box.firstChild);a.id=u.id;a.side=u.side;reg.set(u.id,a);return a;
}
const hop=async(a,h,ms)=>{await tw(a.p,{hop:h},ms*.5,'out');await tw(a.p,{hop:0},ms*.5,'in');};
const unitOf=a=>a.el.closest('.unit');
function raise(a,z=6){const u=unitOf(a);if(u){if(a.z0==null)a.z0=u.style.zIndex;u.style.zIndex=z;}}
function lower(a){const u=unitOf(a);if(u&&a.z0!=null){u.style.zIndex=a.z0;a.z0=null;}}
/* where to stand to reach someone */
function reach(a,t,gap){const r=a.rect(),q=t.rect(),dir=q.left+q.width/2>r.left+r.width/2?1:-1,tx=q.left+q.width/2-dir*(gap||q.width*.5+r.width*.2);return {x:tx-(r.left+r.width/2),y:(q.top+q.height*.62)-(r.top+r.height*.62),dir};}
/* a pet runs in and swings what it holds. Resolves at the moment of the hit */
async function strike(a,t,c='#DFF0FF'){
  a.away=true;raise(a);const to=reach(a,t);
  await tw(a.p,{lean:-7,sx:1.1,sy:.88,armF:-158,wF:44,head:-5,brow:14,ear:-9,legF:-10},110);
  await Promise.all([tw(a.p,{x:to.x,y:to.y,lean:13,sx:.95,sy:1.05},180,'inOut'),hop(a,46,180)]);
  E2.trail(a,c,240);a.mouth(true);
  await tw(a.p,{armF:-16,wF:138,lean:17,head:7},72,'in');
  freeze(55);
}
async function castUp(a){await tw(a.p,{armF:-130,wF:142,lean:-4,head:-5,brow:8,sy:1.05,sx:.97},140,'back');}
async function castFire(a){await tw(a.p,{armF:-100,wF:165,lean:6,sx:1.05,sy:.97},70);}
async function shoot(a){const f=a.tool&&a.tool.fire;await tw(a.p,Object.assign({armF:-92,lean:-5,sx:1.06,sy:.95},f?{wF:f}:{}),120);await tw(a.p,{lean:7,sx:.97,sy:1.04},60);}
async function back(a,ms=230){
  if(!a||!a.el.isConnected)return;
  /* the fallen stay down and a monster winding up keeps its pose, they only walk home */
  const keep=a.p.dead||a.p.charging,rest=keep?{}:a.kind==='ham'?a.rest():{lean:0,sx:1,sy:1,head:0,headY:0,legF:0,legB:0,wig:0,claws:0,pupil:.1,lid:.3,ear:0,puff:0,tail:0,tailA:1,a:0};
  a.mouth(false);if(!a.p.dead)a.face(a.base);
  const far=Math.abs(a.p.x)+Math.abs(a.p.y)>6;
  const run=Promise.all([tw(a.p,Object.assign({x:0,y:0},rest),ms,'inOut'),far?hop(a,26,ms):null]);a.homing=run;
  await run;
  if(a.homing===run){a.homing=null;a.away=false;lower(a);}
}
function backAll(except){for(const a of reg.values())if(a.away&&a.id!==except)back(a);}
/* everyone is home before the next turn is planned */
async function settle(){const w=[];for(const a of reg.values()){if(a.away||a.guard){a.guard=false;w.push(back(a));}else if(a.homing)w.push(a.homing);}await Promise.all(w);for(const a of reg.values())if(a.el.isConnected){try{a.update(now);}catch(err){}}}
/* Guard: braced from the start of the turn until it wears off */
function guardUp(a){if(!a||a.kind!=='ham'||a.p.dead)return;a.guard=true;a.homing=null;tw(a.p,{sy:.84,sx:1.12,armF:-104,wF:166,armB:-106,lean:-5,head:-6,brow:18,ear:-14,legF:-6},170,'back');}
/* something lands */
function hurt(a,o={}){
  if(!a)return;const p=a.p;tw(p,{flash:1},20,'lin').then(()=>tw(p,{flash:0},210));
  if(a.kind==='ham'){a.face('hurt');setTimeout(()=>{if(a.el.isConnected&&!p.dead)a.face(a.base);},380/spd());}
  const dir=a.side==='p'?-1:1,k=o.knock==null?(a.side==='p'?8:6):o.knock;
  tw(p,{kx:dir*k,kl:a.flip?-7:dir*(a.kind==='boss'?2:7),kq:1},60).then(()=>tw(p,{kx:0,kl:0,kq:0},220,'back'));
}
function shieldHit(a,impact){const c=a.center(),R=a.rect().width*.62;E2.domeWave(c.x,c.y,R,impact.x,impact.y);FX.ring(impact,'#DFF6FF',4,R*.6,5,260);FX.burst(impact.x,impact.y,'#FFE9A0',10,340,'spark',6,300);const d=unitOf(a)&&unitOf(a).querySelector('.dome');if(d&&d.animate&&!RM)d.animate([{opacity:1,filter:'brightness(2.2)'},{opacity:1,filter:'brightness(1)'}],{duration:320/spd()});tw(a.p,{kq:.6},50).then(()=>tw(a.p,{kq:0},160,'back'));}
function shieldBreak(a,impact){const c=a.center(),R=a.rect().width*.62;E2.cracks(c.x,c.y,R,impact.x,impact.y);E2.domeWave(c.x,c.y,R,impact.x,impact.y,1.2);freeze(120);setTimeout(()=>{E2.shatter(c.x,c.y,R);},60/spd());hurt(a,{knock:a.side==='p'?16:10});}
/* boss and monster moves */
async function foeMelee(a,t){
  a.away=true;raise(a);const to=reach(a,t,t.rect().width*.5+a.rect().width*.34);
  if(a.key==='neighbor_cat'){await tw(a.p,{sy:.84,sx:1.1,wig:0,headY:14,lean:3},100);a.mouth(true);await Promise.all([tw(a.p,{x:to.x,y:to.y,lean:-9,sx:1.1,sy:.94,legF:62,legB:48,claws:1,headY:-8,tail:-.9},230,'inOut'),hop(a,86,230)]);await tw(a.p,{sx:1,sy:1,legF:10,legB:8},50);}
  else{await tw(a.p,{sy:.86,sx:1.08,a:.5},100);a.mouth(true);await Promise.all([tw(a.p,{x:to.x,y:to.y,lean:a.side==='e'?-8:8,sx:1.06,sy:.96,a:1},190,'inOut'),hop(a,a.kind==='boss'?40:30,190)]);}
  freeze(45);
}
async function foeCast(a){a.mouth(true);await tw(a.p,{sy:1.06,sx:.96,a:1,lean:a.kind==='mon'?-3:0},140,'back');await nap(60);}
function foeCalm(a){a.mouth(false);tw(a.p,{a:0,sy:1,sx:1,lean:0},200);}
function charge(a){
  if(!a)return;
  if(a.key==='neighbor_cat'){tw(a.p,{sy:.92,sx:1.05,head:-4,headY:10,pupil:1,lid:.02,tailA:.2,ear:-10},180);let n=0;const w=()=>{if(!a.el.isConnected||!a.p.charging||n++>60){tw(a.p,{wig:0},120);return;}tw(a.p,{wig:n%2?-5:4,tail:n%2?.7:-.7},105,'inOut').then(w);};a.p.charging=1;w();}
  else{a.p.charging=1;tw(a.p,{a:.6,sy:.94,sx:1.04},200);}
}
function chargeEnd(a){if(!a)return;a.p.charging=0;if(a.key==='neighbor_cat')tw(a.p,{sy:1,sx:1,head:0,headY:0,pupil:.1,lid:.3,tailA:1,ear:0,tail:0,wig:0},220);else tw(a.p,{a:0,sy:1,sx:1},200);}
async function fall(a){if(!a)return;a.p.dead=1;if(a.kind==='ham')a.face('hurt');await tw(a.p,{lean:a.side==='p'||a.flip?-70:70,sy:.86,sx:1.1},240,'in');}
function revive(a){if(!a)return;a.p.dead=0;a.away=false;a.guard=false;a.face(a.base);lower(a);tw(a.p,Object.assign({x:0,y:0,hop:0,sy:1,sx:1,lean:0},a.kind==='ham'?a.rest():{}),240,'back');}
/* the two pets act together when a reaction goes off */
async function react(e,c){
  const a=c.attacker,q=c.partner,key=[e.a,e.b].sort().join('+'),f=REACT_FX[key];
  if(!c.T)return;const t=c.first?1200:640,T=c.T,A=a?a.tip():T,Q=q?q.tip():A,m=center(A,T,.62),orb=Math.min(c.R,Math.max(34,innerWidth*.05));
  m.y=Math.min(A.y,T.y)-Math.max(18,orb*.5);
  if(q&&q!==a){q.away=true;q.homing=null;raise(q,6);const r=q.rect(),to={x:c.dir*Math.min(r.width*.9,Math.abs(T.x-r.left)*.3),y:0};Promise.all([tw(q.p,{x:to.x,y:to.y},c.first?200:120,'inOut'),hop(q,c.first?30:16,c.first?200:120)]);tw(q.p,{armF:-150,wF:158,lean:-3},c.first?170:100,'back');q.mouth(true);}
  if(a&&a.kind==='ham'&&a.p.x===0&&!a.p.dead){a.away=true;a.homing=null;tw(a.p,{armF:-120,wF:150,lean:4},120,'back');}
  if(f){try{await f({A,Q,T,m,R:c.R,orb,h:c.h,t,dir:c.dir,others:c.others,fire:()=>{},push:n=>{if(c.target)tw(c.target.p,{kx:c.dir*n},120).then(()=>tw(c.target.p,{kx:0},260,'back'));},allyHeal:c.allyHeal,team:c.team,flash:c.flash});}catch(err){}}
  if(q&&q!==a){q.face('joy');a&&a.kind==='ham'&&a.face('joy');setTimeout(()=>{if(q.el.isConnected)q.face(q.base);if(a&&a.el.isConnected&&a.kind==='ham')a.face(a.base);},460/spd());back(q,260);}
}
/* pets outside a battle: the Team screen and the pet sheet */
function liveInto(box,key,gear,o={}){const a=new Actor('ham',key,Object.assign({gear},o));box.innerHTML='';box.appendChild(a.el);return a;}
return {Actor,tw,nap,freeze,clear,get,mount,hop,strike,castUp,castFire,shoot,back,backAll,settle,guardUp,hurt,shieldHit,shieldBreak,foeMelee,foeCast,foeCalm,charge,chargeEnd,fall,revive,react,liveInto,E2,kick,reg};
})();
