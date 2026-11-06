/* SQUEEK PETS ON SCREEN: a Squeek is drawn from the dots of its own on-chain picture, which the server keeps as plain numbers. Every Squeek shares one body,
   so each part (head, ears, arms, legs, torso, face) is painted once into a picture, and the game's own motion code moves it like any pet.
   Its face turns towards the enemy, and hats, armor, charms and weapons are placed on its body. Nothing from the picture ever becomes markup */
const SQ=(()=>{
  const P=395.4,CXc=12544/P,FOOT=21150/P,U=3.7,INK=RA.INK,FILL='#0B0A13',OUT=.75;
  const ART={},LOADING=new Map(),MARK={},PORT={},PIMG={},WANT=new Set();
  let timer=0,onLoad=null,big=false;
  const f2=n=>Math.round(n*100)/100,rad=d=>d*Math.PI/180;
  const fa=o=>1-(1-.13*o)*(1-.3*o)*(1-o);
  const R=(cx,cy)=>[(cx-CXc)*U,(cy-FOOT)*U];
  /* joints in the game's units, the feet stand on 0 */
  const PIV={neck:R(31.7,34.5),sF:R(44.5,36.5),sB:R(19,36.5),hipL:R(27.5,49.5),hipR:R(36,49.5),earL:R(20.5,21.5),earR:R(43,21.5)};
  /* the face turns towards the enemy: eyes and muzzle sit 2 dots towards it and the head leans a little */
  const ARM=8.5*U,GAZE=2*U,LEAN=2.5;
  /* where hamster gear sits on a Squeek: the hamster head and torso boxes mapped onto the Squeek's own */
  const HAT_T='translate(-0.85,-116.5) scale(1,.955) translate(-7,103.5)';
  const ARMOR_T='translate(-0.9,-40) scale(.9,.77) translate(-3,37.5)';
  const CHAIN_T='translate(-16,-4)';
  /* the hurt and happy faces are the X Expression and Happy Arcs eyes of real Squeeks */
  const FACES={hurt:[[15310,8987],[14520,9778],[10568,8987],[9778,9778],[14125,10173],[15706,10173],[9382,10173],[10963,10173],[15310,9778],[14915,9382],[10568,9778],[10173,9382],[14520,8987],[14125,8592],[9778,8987],[9382,8592],[15706,8592],[10963,8592]],joy:[[15706,9778],[10963,9778],[15310,9382],[14915,8987],[10568,9382],[10173,8987],[14520,9382],[14125,9778],[9778,9382],[9382,9778]]};
  const CIRCLE='M0-7A7 7 0 1 1 0 7A7 7 0 1 1 0-7Z';
  const pathCache=new Map();
  function glyph(a,g){const k=a.id+':'+g;let p=pathCache.get(k);if(!p){const d=g==='_o'?CIRCLE:a.glyphs[g];const nums=(String(d).match(/-?\d+(?:\.\d+)?/g)||['7']).map(Number);p={p:new Path2D(d),r:Math.max(...nums.map(Math.abs))};pathCache.set(k,p);}return p;}
  /* small pictures get bigger dots and more glow so the colours still read at battle size, big ones stay close to the real picture */
  const look=pc=>pc>=12?{glow:.16,e:1}:{glow:.36,e:1.16};
  const canAdd=typeof Path2D!=='undefined'&&typeof Path2D.prototype.addPath==='function'&&typeof DOMMatrix==='function';
  function paint(a,dots,cells,pc,edge,dx){
    dx=dx||0;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const grow=(x,y,r)=>{x0=Math.min(x0,x-r);x1=Math.max(x1,x+r);y0=Math.min(y0,y-r);y1=Math.max(y1,y+r);};
    for(let i=0;i<cells.length;i+=2)grow(cells[i],cells[i+1],2);
    for(const d of dots)grow(d[0]/P,d[1]/P,1.3);
    if(x0>x1)return null;
    const L=look(pc),cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil((x1-x0)*pc));cv.height=Math.max(1,Math.ceil((y1-y0)*pc));
    const g=cv.getContext('2d');g.scale(pc,pc);g.translate(-x0,-y0);
    const disc=(list,r)=>{g.beginPath();for(let i=0;i<list.length;i+=2){g.moveTo(list[i]+r,list[i+1]);g.arc(list[i],list[i+1],r,0,6.2832);}};
    if(cells.length){
      /* the outline only where the body meets the outside, so parts join without seams */
      const out=[];for(let i=0;i<cells.length;i+=2)if(edge(cells[i],cells[i+1]))out.push(cells[i],cells[i+1]);
      g.fillStyle=INK;disc(out,1+OUT);g.fill();
      g.fillStyle=FILL;disc(cells,1);g.fill();
      /* glow: dots of one colour and strength share one fill, painted on its own layer and laid on the body once */
      const gv=document.createElement('canvas');gv.width=cv.width;gv.height=cv.height;const gg=gv.getContext('2d');gg.scale(pc,pc);gg.translate(-x0,-y0);
      const glow=new Map();
      for(const d of dots){const al=Math.round(Math.min(1,L.glow*fa(d[3])*Math.sqrt(glyph(a,d[2]).r/14.5))*20)/20;if(al<=0)continue;const k=d[4]+'|'+al;let b=glow.get(k);if(!b){b={c:d[4],al,p:new Path2D()};glow.set(k,b);}const x=d[0]/P+dx,y=d[1]/P;b.p.moveTo(x+1.05,y);b.p.arc(x,y,1.05,0,6.2832);}
      for(const b of glow.values()){gg.globalAlpha=b.al;gg.fillStyle=a.cols[b.c];gg.fill(b.p);}
      g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-atop';g.drawImage(gv,0,0);g.restore();
    }
    const s=16*L.e/P,batch=new Map();
    for(const d of dots){
      const x=d[0]/P+dx,y=d[1]/P,col=d[4]<0?'#FFFFFF':a.cols[d[4]];
      if(!canAdd){g.save();g.translate(x,y);g.scale(s,s);g.globalAlpha=fa(d[3]);g.fillStyle=col;g.fill(glyph(a,d[2]).p);g.restore();continue;}
      const k=d[2]+'|'+d[3]+'|'+d[4];let b=batch.get(k);if(!b){b={o:d[3],col,p:new Path2D()};batch.set(k,b);}
      b.p.addPath(glyph(a,d[2]).p,new DOMMatrix([s,0,0,s,x,y]));
    }
    for(const b of batch.values()){g.globalAlpha=fa(b.o);g.fillStyle=b.col;g.fill(b.p);}
    g.globalAlpha=1;
    const [rx,ry]=R(x0,y0);
    return {cv,x:rx,y:ry,w:(x1-x0)*U,h:(y1-y0)*U};
  }
  const img=q=>q?`<image href="${q.cv.toDataURL()}" x="${f2(q.x)}" y="${f2(q.y)}" width="${f2(q.w)}" height="${f2(q.h)}" preserveAspectRatio="none"/>`:'';
  function edgeOf(a){
    if(!a.inside){a.inside=new Set();for(const k in a.shape){const s=a.shape[k];for(let i=0;i<s.length;i+=2)a.inside.add(s[i]*64+s[i+1]);}}
    return (x,y)=>{for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if(!a.inside.has((x+i)*64+(y+j)))return true;return false;};
  }
  const eyeMid=ds=>ds.length?(ds.reduce((s,d)=>s+d[1],0)/ds.length/P-FOOT)*U:0;
  /* the markup of one Squeek for the motion code. Parts carry the names the hamster rig uses, so poses, gear slots and faces all work */
  function build(id,pc){
    const a=ART[id];
    if(!a)return stand(id);
    const edge=edgeOf(a),part=n=>img(paint(a,a.parts[n]||[],a.shape[n]||[],pc,edge));
    const eL=a.eyes.filter(d=>d[0]/P<CXc),eR=a.eyes.filter(d=>d[0]/P>=CXc);
    const white=pts=>pts.map(q=>[q[0],q[1],'_o',1,-1]);
    a.eyeY=[eyeMid(eL),eyeMid(eR)];
    const col=(PETS['sq'+id]&&PETS['sq'+id].sq&&PETS['sq'+id].sq.col)||'#FF7AD9';
    const g=`${id}_${pc}`;
    /* a Squeek stands in its own light, more than a Legendary: a beam behind it, two LED rings turning opposite ways, lit pixels circling it and rising from its feet */
    return `<defs><radialGradient id="sqg${g}"><stop offset="0" stop-color="${col}" stop-opacity=".7"/><stop offset=".55" stop-color="${col}" stop-opacity=".25"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient><linearGradient id="sqp${g}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${col}" stop-opacity=".55"/><stop offset=".6" stop-color="${col}" stop-opacity=".12"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <g data-p="aura"><rect data-a="p" x="-62" y="-196" width="124" height="198" rx="40" fill="url(#sqp${g})" opacity=".5"/><ellipse cx="0" cy="1" rx="92" ry="20" fill="url(#sqg${g})"/><ellipse data-a="1" cx="0" cy="1" rx="74" ry="14" fill="none" stroke="${col}" stroke-width="3.4" stroke-dasharray="2 9" stroke-linecap="round"/><ellipse data-a="2" cx="0" cy="1" rx="56" ry="10" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-dasharray="1.5 7" stroke-linecap="round" opacity=".85"/></g>
    <ellipse data-p="shadow" cx="0" cy="1" rx="58" ry="10" fill="#050310" opacity=".42"/>
    <g data-p="body"><g data-p="parts">
     <g data-p="back"></g><path data-p="cape" d="" fill="none"/><g data-p="tail"></g>
     <g data-p="armB">${part('armL')}</g>
     <g data-p="legB">${part('legR')}</g>
     <g data-p="torso">${part('torso')}<g transform="${ARMOR_T}"><g data-slot="armor"></g></g></g>
     <g transform="${ARMOR_T}"><g data-p="skirt"></g></g>
     <g data-p="legF">${part('legL')}</g>
     <g transform="${CHAIN_T}"><g data-p="chain"></g></g>
     <g data-p="off"><g data-slot="off"></g></g>
     <g data-p="head">
       <g data-p="earB">${part('earR')}</g><g data-p="earF">${part('earL')}</g>
       ${part('head')}
       <g data-p="face" transform="translate(${f2(GAZE)},0)">${img(paint(a,a.parts.face||[],[],pc,edge))}</g>
       <g transform="translate(${f2(GAZE)},0)"><g data-p="eyesOpen"><g data-p="eyeF">${img(paint(a,eR,[],pc,edge))}</g><g data-p="eyeB">${img(paint(a,eL,[],pc,edge))}</g></g>
       <g data-p="eyesHurt" display="none">${img(paint(a,white(FACES.hurt),[],pc,edge))}</g>
       <g data-p="eyesJoy" display="none">${img(paint(a,white(FACES.joy),[],pc,edge))}</g></g>
       <path data-p="browF" d=""/><path data-p="browB" d=""/>
       <g data-p="mouthC"></g><g data-p="mouthO" display="none"></g>
       <g data-slot="faceIn"></g><g data-slot="faceOut"></g>
       <g transform="${HAT_T}"><g data-slot="hat"></g></g>
     </g>
     <g data-p="armF">${part('armR')}<g transform="translate(${f2(PIV.sF[0])},${f2(PIV.sF[1])})"><g data-p="shoulderTop"></g></g></g>
     <g data-p="wF"><g data-slot="weapon"></g></g>
     <g data-p="charm"><g data-slot="charm"></g></g>
    </g></g>
    <g data-sq="fx">${[0,1,2,3,4,5,6,7].map(i=>`<rect data-m="${i}" x="-3.5" y="-3.5" width="7" height="7" rx="1.5" fill="${i%3?col:'#FFFFFF'}" stroke="${INK}" stroke-width="1.2" transform="translate(${f2(Math.cos(i*.785)*76)},${f2(-82+Math.sin(i*.785)*22)})"/>`).join('')}${[0,1,2,3,4,5].map(i=>`<rect data-u="${i}" x="-2.5" y="-2.5" width="5" height="5" fill="${i%2?'#FFFFFF':col}" opacity="0" transform="translate(${[-40,26,-12,44,-30,8][i]},0)"/>`).join('')}</g>`;
  }
  /* until its dots arrive a Squeek stands as a plain dark body in its own colour */
  function stand(id){
    const col=(PETS['sq'+id]&&PETS['sq'+id].sq&&PETS['sq'+id].sq.col)||'#FF7AD9';
    return `<g data-p="aura"></g><ellipse data-p="shadow" cx="0" cy="1" rx="58" ry="10" fill="#050310" opacity=".42"/><g data-p="body"><g data-p="parts"><g data-p="back"></g><path data-p="cape" d="" fill="none"/><g data-p="tail"></g><g data-p="armB"><rect x="-52" y="-66" width="22" height="44" rx="10" fill="${FILL}" stroke="${col}" stroke-width="3"/></g><g data-p="legB"><rect x="4" y="-22" width="26" height="22" rx="8" fill="${FILL}" stroke="${col}" stroke-width="3"/></g><g data-p="torso"><rect x="-42" y="-72" width="84" height="56" rx="14" fill="${FILL}" stroke="${col}" stroke-width="3"/><g data-slot="armor"></g></g><g data-p="skirt"></g><g data-p="legF"><rect x="-30" y="-22" width="26" height="22" rx="8" fill="${FILL}" stroke="${col}" stroke-width="3"/></g><g data-p="chain"></g><g data-p="off"><g data-slot="off"></g></g><g data-p="head"><g data-p="earB"><circle cx="50" cy="-150" r="14" fill="${FILL}" stroke="${col}" stroke-width="3"/></g><g data-p="earF"><circle cx="-50" cy="-150" r="14" fill="${FILL}" stroke="${col}" stroke-width="3"/></g><rect x="-60" y="-160" width="120" height="92" rx="40" fill="${FILL}" stroke="${col}" stroke-width="3"/><g data-p="eyesOpen"><g data-p="eyeF"><rect x="16" y="-118" width="6" height="12" fill="#fff"/></g><g data-p="eyeB"><rect x="-14" y="-118" width="6" height="12" fill="#fff"/></g></g><g data-p="eyesHurt" display="none"></g><g data-p="eyesJoy" display="none"></g><path data-p="browF" d=""/><path data-p="browB" d=""/><g data-p="mouthC"></g><g data-p="mouthO" display="none"></g><g data-slot="faceIn"></g><g data-slot="faceOut"></g><g transform="${HAT_T}"><g data-slot="hat"></g></g></g><g data-p="armF"><rect x="30" y="-66" width="22" height="44" rx="10" fill="${FILL}" stroke="${col}" stroke-width="3"/><g data-p="shoulderTop"></g></g><g data-p="wF"><g data-slot="weapon"></g></g><g data-p="charm"><g data-slot="charm"></g></g></g></g>`;
  }
  /* big rigs (pet page) and battle rigs are painted at different sizes. The key is the pet id, so a size is picked from the box it goes in */
  function markup(key,big){
    const id=+key.slice(2),pc=big?14:9,k=id+':'+pc+':'+(ART[id]?1:0);
    if(!MARK[k])MARK[k]=build(id,pc);
    return MARK[k];
  }
  /* a still picture of the whole Squeek, for every place that shows a pet as an image */
  function portrait(id){
    if(PORT[id])return PORT[id];
    const a=ART[id];if(!a)return null;
    const edge=edgeOf(a),pc=6,order=['armL','legR','torso','legL','earR','earL','head','armR'];
    const layers=order.map(n=>paint(a,a.parts[n]||[],a.shape[n]||[],pc,edge)).concat([paint(a,a.parts.face||[],[],pc,edge,GAZE/U),paint(a,a.eyes,[],pc,edge,GAZE/U)]).filter(Boolean);
    const xs=layers.map(l=>l.x),ys=layers.map(l=>l.y),x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...layers.map(l=>l.x+l.w)),y1=Math.max(...layers.map(l=>l.y+l.h));
    const k=pc/U,side=Math.max(x1-x0,y1-y0)+12,cv=document.createElement('canvas');cv.width=cv.height=Math.ceil(side*k);
    const g=cv.getContext('2d'),ox=(side-(x1-x0))/2-x0,oy=(side-(y1-y0))/2-y0;
    for(const l of layers)g.drawImage(l.cv,(l.x+ox)*k,(l.y+oy)*k,l.w*k,l.h*k);
    PIMG[id]=cv;
    return PORT[id]=cv.toDataURL();
  }
  const placeholder=id=>{const col=(PETS['sq'+id]&&PETS['sq'+id].sq&&PETS['sq'+id].sq.col)||'#FF7AD9';return 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="26" y="40" width="48" height="44" rx="12" fill="#0B0A13" stroke="${col}" stroke-width="4"/><rect x="20" y="12" width="60" height="44" rx="20" fill="#0B0A13" stroke="${col}" stroke-width="4"/><rect x="40" y="30" width="5" height="10" fill="#fff"/><rect x="56" y="30" width="5" height="10" fill="#fff"/></svg>`);};
  function picUri(id){want(id);return portrait(id)||placeholder(id);}
  /* dots are fetched in small groups and kept for the visit */
  function want(id){id=+id;if(!id||ART[id]||LOADING.has(id))return;WANT.add(id);if(!timer)timer=setTimeout(flush,30);}
  function flush(){timer=0;const ids=[...WANT];WANT.clear();if(ids.length)load(ids).then(()=>{if(onLoad)onLoad(ids);});}
  async function load(ids){
    const need=[...new Set(ids.map(Number))].filter(id=>id&&!ART[id]);
    const waits=need.filter(id=>LOADING.has(id)).map(id=>LOADING.get(id));
    const fresh=need.filter(id=>!LOADING.has(id));
    for(let i=0;i<fresh.length;i+=12){
      const part=fresh.slice(i,i+12);
      const p=api('/api/squeek/art?ids='+part.join(',')).then(j=>{for(const [k,v] of Object.entries(j.art||{})){v.id=+k;ART[+k]=v;}}).catch(()=>{}).finally(()=>part.forEach(id=>LOADING.delete(id)));
      part.forEach(id=>LOADING.set(id,p));waits.push(p);
    }
    await Promise.all(waits);
  }
  const ready=id=>!!ART[+id];
  /* the real picture for the pet page, shown only in an img tag */
  const realPic=id=>api('/api/squeek/pic?id='+(+id)).then(j=>j&&typeof j.svg==='string'&&/^[A-Za-z0-9+/=]+$/.test(j.svg)?'data:image/svg+xml;base64,'+j.svg:null).catch(()=>null);
  return {markup,portrait,picUri,load,want,ready,realPic,art:id=>ART[+id],pimg:id=>{portrait(id);return PIMG[id]||null;},PIV,ARM,GAZE,LEAN,onLoad:f=>{onLoad=f;},setBig:v=>{big=!!v;},isBig:()=>big};
})();
/* the hamster rig hands Squeek ids to SQ. A rig placed in a big box, like the pet page, gets the sharper painting */
(()=>{
  const orig=RA.hamster;
  RA.hamster=k=>isSq(k)?SQ.markup(k,SQ.isBig()):orig(k);
  /* the motion code looks a pet up in the drawing list first: a Squeek gets an entry with no pieces of its own, so gear is all it wears */
  const reg=k=>{if(!isSq(k))return;const p=PETS[k],sq={id:+k.slice(2),col:p&&p.sq?p.sq.col:'#FF7AD9'},cur=RA.PETS[k];if(!cur||cur.sq.col!==sq.col)RA.PETS[k]={n:p?p.n:'Squeek',el:p?p.el:'steel',rar:'s',noTool:true,sq};};
  const into=MOT.liveInto,mount=MOT.mount;
  MOT.liveInto=(box,key,gear,o)=>{reg(key);SQ.setBig(!!box&&box.getBoundingClientRect().width>=130);try{return into(box,key,gear,o);}finally{SQ.setBig(false);}};
  MOT.mount=(u,box,gear)=>{reg(u.ref);return mount(u,box,gear);};
  const A=MOT.Actor.prototype,baseUp=A.upHam,baseHand=A.hand,f2=n=>Math.round(n*100)/100,rad=d=>d*Math.PI/180;
  const {PIV,ARM,LEAN}=SQ;
  A.hand=function(){if(!this.d||!this.d.sq)return baseHand.call(this);const p=this.p,R0=this.restP||{armF:-58},a=rad(p.armF-R0.armF);return [PIV.sF[0]-Math.sin(a)*ARM,PIV.sF[1]+Math.cos(a)*ARM];};
  /* the same pose numbers as a hamster, only the joints sit where a Squeek's are. Arm angles count from its resting pose, so a Squeek at rest looks like its picture */
  A.upHam=function(t,br){
    if(!this.d||!this.d.sq)return baseUp.call(this,t,br);
    const p=this.p,Q=this.P,R0=this.restP||{armF:-58,armB:-24},sw=Math.sin(t*.0018+this.ph)*this.idle;
    Q.head.setAttribute('transform',`translate(0,${f2(p.headY+br*1.6)}) rotate(${f2(LEAN+p.head+sw*1.2)} ${f2(PIV.neck[0])} ${f2(PIV.neck[1])})`);
    const af=p.armF-R0.armF+br*2,ab=-(p.armB-R0.armB)-br*1.6;
    Q.armF.setAttribute('transform',`rotate(${f2(af)} ${f2(PIV.sF[0])} ${f2(PIV.sF[1])})`);
    Q.armB.setAttribute('transform',`rotate(${f2(ab)} ${f2(PIV.sB[0])} ${f2(PIV.sB[1])})`);
    const h=this.hand();Q.wF.setAttribute('transform',`translate(${f2(h[0])},${f2(h[1])}) rotate(${f2(p.armF+p.wF)})`);
    const b=rad(ab);Q.off.setAttribute('transform',`translate(${f2(PIV.sB[0]-Math.sin(b)*ARM)},${f2(PIV.sB[1]+Math.cos(b)*ARM)}) rotate(${f2(p.wB)})`);
    Q.legF.setAttribute('transform',`translate(0,${f2(-p.legFy)}) rotate(${f2(p.legF)} ${f2(PIV.hipL[0])} ${f2(PIV.hipL[1])})`);
    Q.legB.setAttribute('transform',`translate(0,${f2(-p.legBy)}) rotate(${f2(p.legB)} ${f2(PIV.hipR[0])} ${f2(PIV.hipR[1])})`);
    Q.charm.setAttribute('transform',`translate(11,-56) rotate(${f2(sw*6+p.lean*.9)})`);
    const tw=Math.sin(t*.0011+this.ph)>.96?Math.sin(t*.03)*9:0;
    Q.earF.setAttribute('transform',`rotate(${f2(-(p.ear+tw))} ${f2(PIV.earL[0])} ${f2(PIV.earL[1])})`);
    Q.earB.setAttribute('transform',`rotate(${f2(p.ear+tw*.6)} ${f2(PIV.earR[0])} ${f2(PIV.earR[1])})`);
    const s=this.blink(t),a=SQ.art(this.d.sq.id),ey=a&&a.eyeY?a.eyeY:[-112,-112];
    Q.eyeF.setAttribute('transform',`translate(0,${f2(ey[1]*(1-s))}) scale(1,${s})`);
    Q.eyeB.setAttribute('transform',`translate(0,${f2(ey[0]*(1-s))}) scale(1,${s})`);
    if(this.capeOn){const w1=Math.sin(t*.0032+this.ph)*6*this.idle-p.lean*1.2,w2=Math.sin(t*.0026+this.ph+1)*9*this.idle-p.lean*2;Q.cape.setAttribute('d',`M-36,-70C-50,-44 ${f2(-58+w1)},-18 ${f2(-64+w2)},3L${f2(64+w2)},3C${f2(58+w1)},-18 50,-44 36,-70Z`);}
    /* its light moves: rings turn, the beam breathes, pixels circle it and rise from its feet */
    const S=this.sqFx||(this.sqFx={r1:this.el.querySelector('[data-a="1"]'),r2:this.el.querySelector('[data-a="2"]'),pl:this.el.querySelector('[data-a="p"]'),m:[...this.el.querySelectorAll('[data-m]')],u:[...this.el.querySelectorAll('[data-u]')]});
    const go=this.idle?t:0,X=[-40,26,-12,44,-30,8];
    if(S.r1)S.r1.setAttribute('stroke-dashoffset',f2(go*.03));
    if(S.r2)S.r2.setAttribute('stroke-dashoffset',f2(-go*.045));
    if(S.pl)S.pl.setAttribute('opacity',f2(.38+.22*Math.sin(go*.003)));
    S.m.forEach((n,i)=>{const a=go*.0011+i*.785,y=Math.sin(a);n.setAttribute('transform',`translate(${f2(Math.cos(a)*76)},${f2(-82-p.hop*.3+y*22)}) rotate(${f2(go*.12+i*20)})`);n.setAttribute('opacity',f2(.45+.55*(y+1)/2));});
    S.u.forEach((n,i)=>{const k=((go*.00032)+i/6)%1;n.setAttribute('transform',`translate(${X[i]},${f2(-k*176)})`);n.setAttribute('opacity',this.idle?f2(Math.sin(k*Math.PI)*.95):'0');});
  };
})();
