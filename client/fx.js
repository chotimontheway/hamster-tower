/* SKILL EFFECTS: one full-screen overlay canvas that only runs while effects are alive, with a particle cap and automatic quality reduction */
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const FX=(()=>{
  let cv=null,ctx=null,ps=[],ts=[],raf=0,last=0,clock=0,W=0,H=0,speedFn=()=>1,onLevel=null,busy=false;
  const Q={level:2,manual:false,acc:0,n:0,bad:0};
  const MAXP=[30,90,180];
  const rand=(a,b)=>a+Math.random()*(b-a);
  const qm=()=>[.35,.65,1][Q.level];
  function fit(){if(!cv)return;const s=Math.min(window.devicePixelRatio||1,Q.level===2?1.5:1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*s);cv.height=Math.round(H*s);ctx.setTransform(s,0,0,s,0,0);}
  function init(el,sp,cb){cv=el;ctx=cv.getContext('2d');speedFn=sp||speedFn;onLevel=cb;fit();addEventListener('resize',fit,{passive:true});}
  /* an effect may add particles while the loop draws it: the loop picks them up itself, it must never start a second copy */
  function kick(){if(!raf&&!busy&&cv){last=0;raf=requestAnimationFrame(loop);}}
  function add(p){if(RM||!cv||(p.k!=='fn'&&ps.length>=MAXP[Q.level]))return null;p.t=-(p.delay||0);ps.push(p);kick();return p;}
  function after(ms,fn){ts.push({at:clock+ms,fn});kick();}
  function clear(){ps=[];ts=[];if(ctx)ctx.clearRect(0,0,W,H);}
  function setLevel(l,manual){Q.level=l;Q.manual=!!manual;Q.bad=0;fit();if(onLevel)onLevel(l);}
  function loop(now){
    raf=0;busy=true;
    try{
    const real=last?now-last:16;last=now;
    if(!Q.manual){Q.acc+=real;Q.n++;if(Q.n>=30){const avg=Q.acc/Q.n;Q.acc=0;Q.n=0;if(avg>30){Q.bad++;if(Q.bad>=2&&Q.level>0)setLevel(Q.level-1);}else Q.bad=0;}}
    const dt=Math.min(50,real)*speedFn();clock+=dt;
    for(let i=ts.length-1;i>=0;i--){if(ts[i].at<=clock){const f=ts[i].fn;ts.splice(i,1);f();}}
    ctx.clearRect(0,0,W,H);
    for(let i=ps.length-1;i>=0;i--){const p=ps[i];p.t+=dt;if(p.t<0)continue;if(p.t>=p.life){ps.splice(i,1);continue;}step(p,dt);draw(p);}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    }finally{busy=false;}
    if(ps.length||ts.length)raf=requestAnimationFrame(loop);else ctx.clearRect(0,0,W,H);
  }
  function step(p,dt){
    if(p.k!=='p')return;
    const s=dt/1000;p.vx+=(p.ax||0)*s;p.vy+=(p.ay||0)*s;if(p.drag){p.vx*=1-p.drag*s;p.vy*=1-p.drag*s;}p.x+=p.vx*s;p.y+=p.vy*s;if(p.vr)p.rot=(p.rot||0)+p.vr*s;
  }
  const INK='#2A1B3D';
  /* small shapes drawn around the origin */
  const SHP={
    dot:(g,s,c)=>{g.fillStyle=c;g.beginPath();g.arc(0,0,s,0,6.283);g.fill();},
    spark:(g,s,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,-s);g.quadraticCurveTo(0,0,s,0);g.quadraticCurveTo(0,0,0,s);g.quadraticCurveTo(0,0,-s,0);g.quadraticCurveTo(0,0,0,-s);g.fill();},
    leaf:(g,s,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(-s,0);g.quadraticCurveTo(0,-s,s,0);g.quadraticCurveTo(0,s,-s,0);g.fill();},
    bubble:(g,s,c)=>{g.strokeStyle=c;g.lineWidth=Math.max(1.5,s*.22);g.beginPath();g.arc(0,0,s,0,6.283);g.stroke();g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.arc(-s*.35,-s*.35,s*.22,0,6.283);g.fill();},
    drop:(g,s,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,-s);g.quadraticCurveTo(s,s*.2,0,s);g.quadraticCurveTo(-s,s*.2,0,-s);g.fill();},
    z:(g,s,c)=>{g.fillStyle=c;g.font=`800 ${s*2}px "Baloo 2",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('z',0,0);},
    note:(g,s,c)=>{g.fillStyle=c;g.font=`800 ${s*2}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('♪',0,0);},
    heart:(g,s,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,s);g.bezierCurveTo(-s*1.5,-s*.2,-s*.6,-s*1.2,0,-s*.3);g.bezierCurveTo(s*.6,-s*1.2,s*1.5,-s*.2,0,s);g.fill();},
    plus:(g,s,c)=>{g.fillStyle=c;const w=s*.42;g.fillRect(-w,-s,w*2,s*2);g.fillRect(-s,-w,s*2,w*2);},
    up:(g,s,c)=>{g.strokeStyle=c;g.lineWidth=s*.45;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(-s,s*.5);g.lineTo(0,-s*.5);g.lineTo(s,s*.5);g.stroke();},
    arrow:(g,s,c)=>{g.strokeStyle='#8A5A3A';g.lineWidth=s*.22;g.beginPath();g.moveTo(-s*1.6,0);g.lineTo(s,0);g.stroke();g.fillStyle=c;g.beginPath();g.moveTo(s*1.7,0);g.lineTo(s*.7,-s*.5);g.lineTo(s*.7,s*.5);g.fill();g.fillStyle='#F0506E';g.fillRect(-s*1.7,-s*.35,s*.5,s*.7);},
    shard:(g,s,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(s*1.4,0);g.lineTo(-s*.4,-s*.55);g.lineTo(-s,0);g.lineTo(-s*.4,s*.55);g.fill();},
    rock:(g,s,c)=>{g.fillStyle=c;g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.moveTo(-s,s*.3);g.lineTo(-s*.5,-s*.7);g.lineTo(s*.5,-s*.8);g.lineTo(s,s*.1);g.lineTo(s*.4,s*.8);g.lineTo(-s*.5,s*.8);g.closePath();g.fill();g.stroke();},
    coin:(g,s,c)=>{g.fillStyle=c||'#FFC94D';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(0,0,s,0,6.283);g.fill();g.stroke();g.strokeStyle='#C98A22';g.lineWidth=1.5;g.beginPath();g.arc(0,0,s*.55,0,6.283);g.stroke();},
    sheep:(g,s)=>{g.fillStyle='#fff';g.strokeStyle=INK;g.lineWidth=2.4;g.beginPath();[[0,0,1],[-.8,.1,.7],[.8,.1,.7],[-.4,-.6,.65],[.4,-.6,.65]].forEach(([x,y,r])=>{g.moveTo(x*s+r*s,y*s);g.arc(x*s,y*s,r*s,0,6.283);});g.stroke();g.fill();g.fillStyle='#F59DB5';g.beginPath();g.ellipse(0,s*.25,s*.55,s*.5,0,0,6.283);g.fill();g.stroke();g.fillStyle=INK;g.beginPath();g.arc(-s*.2,s*.15,s*.09,0,6.283);g.arc(s*.2,s*.15,s*.09,0,6.283);g.fill();},
    card:(g,s)=>{g.fillStyle='#FFF6E5';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.rect(-s*.7,-s,s*1.4,s*2);g.fill();g.stroke();g.fillStyle='#F0506E';g.beginPath();g.moveTo(0,-s*.45);g.lineTo(s*.35,0);g.lineTo(0,s*.45);g.lineTo(-s*.35,0);g.fill();},
    bomb:(g,s)=>{g.fillStyle='#3A3550';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.arc(0,0,s,0,6.283);g.fill();g.stroke();g.strokeStyle='#A9744F';g.lineWidth=2.4;g.beginPath();g.moveTo(s*.5,-s*.8);g.quadraticCurveTo(s,-s*1.5,s*1.3,-s*1.2);g.stroke();g.fillStyle='#FFC94D';g.beginPath();g.arc(s*1.35,-s*1.2,s*.3,0,6.283);g.fill();},
    flask:(g,s,c)=>{g.fillStyle=c||'#35D0E0';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.moveTo(-s*.3,-s);g.lineTo(s*.3,-s);g.lineTo(s*.3,-s*.3);g.lineTo(s,s*.8);g.lineTo(-s,s*.8);g.lineTo(-s*.3,-s*.3);g.closePath();g.fill();g.stroke();},
    pillow:(g,s)=>{g.fillStyle='#F6D8EE';g.strokeStyle=INK;g.lineWidth=2.2;g.beginPath();g.moveTo(-s,-s*.7);g.quadraticCurveTo(0,-s*.4,s,-s*.7);g.quadraticCurveTo(s*.7,0,s,s*.7);g.quadraticCurveTo(0,s*.4,-s,s*.7);g.quadraticCurveTo(-s*.7,0,-s,-s*.7);g.fill();g.stroke();},
    feather:(g,s)=>{g.fillStyle='#FFF';g.strokeStyle='#C9C3DE';g.lineWidth=1;g.beginPath();g.moveTo(-s,s*.3);g.quadraticCurveTo(0,-s*.9,s,-s*.2);g.quadraticCurveTo(0,s*.5,-s,s*.3);g.fill();g.stroke();},
    gear:(g,s,c)=>{g.fillStyle=c||'#A8BAFF';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();for(let i=0;i<16;i++){const a=i/16*6.283,r=i%2?s:s*.72;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.stroke();g.fillStyle=INK;g.beginPath();g.arc(0,0,s*.25,0,6.283);g.fill();},
    wrench:(g,s)=>{g.strokeStyle='#D5DCEC';g.lineWidth=s*.45;g.lineCap='round';g.beginPath();g.moveTo(-s,0);g.lineTo(s*.6,0);g.stroke();g.lineWidth=s*.3;g.beginPath();g.arc(s,0,s*.4,.8,5.5);g.stroke();},
    star:(g,s,c)=>{g.fillStyle=c||'#D5DCEC';g.strokeStyle=INK;g.lineWidth=1.8;g.beginPath();for(let i=0;i<8;i++){const a=i/8*6.283,r=i%2?s*.35:s;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.stroke();},
    anchor:(g,s)=>{g.strokeStyle='#5A6A88';g.lineWidth=s*.3;g.lineCap='round';g.beginPath();g.moveTo(0,-s);g.lineTo(0,s);g.moveTo(-s*.7,s*.3);g.quadraticCurveTo(0,s*1.3,s*.7,s*.3);g.moveTo(-s*.45,-s*.45);g.lineTo(s*.45,-s*.45);g.stroke();},
    snow:(g,s,c)=>{g.strokeStyle=c||'#E8FAFF';g.lineWidth=Math.max(1.4,s*.25);g.lineCap='round';g.beginPath();for(let i=0;i<3;i++){const a=i/3*3.1416;g.moveTo(-Math.cos(a)*s,-Math.sin(a)*s);g.lineTo(Math.cos(a)*s,Math.sin(a)*s);}g.stroke();},
    moon:(g,s,c)=>{g.fillStyle=c||'#FFE27A';g.beginPath();g.arc(0,0,s,.5,5.8);g.quadraticCurveTo(s*.2,0,Math.cos(.5)*s,Math.sin(.5)*s);g.fill();},
    candle:(g,s,c)=>{g.fillStyle=c;g.fillRect(-s*.35,-s,s*.7,s*2);g.fillRect(-s*.07,-s*1.5,s*.14,s*3);},
    block:(g,s,c)=>{g.fillStyle=c;g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.rect(-s,-s,s*2,s*2);g.fill();g.stroke();},
    shield:(g,s,c)=>{g.fillStyle=c||'#5B7CFA';g.strokeStyle=INK;g.lineWidth=2;g.beginPath();g.moveTo(-s,-s*.8);g.quadraticCurveTo(0,-s*1.1,s,-s*.8);g.lineTo(s,0);g.quadraticCurveTo(s*.8,s*.8,0,s*1.2);g.quadraticCurveTo(-s*.8,s*.8,-s,0);g.closePath();g.fill();g.stroke();},
  };
  function alphaOf(p,u){const f=p.fade===undefined?.55:p.fade;let a=p.a===undefined?1:p.a;if(u>f)a*=1-(u-f)/(1-f);if(p.fin&&u<p.fin)a*=u/p.fin;return a;}
  function draw(p){
    const g=ctx,u=p.t/p.life;
    g.globalAlpha=Math.max(0,alphaOf(p,u));
    switch(p.k){
      case 'p':{const s=p.size*(1+(p.grow||0)*u);g.save();g.translate(p.x,p.y);if(p.rot)g.rotate(p.rot);(SHP[p.shape]||SHP.dot)(g,s,p.c);g.restore();break;}
      case 'shot':{const e=p.ease==='in'?u*u:u;const x=p.x+(p.x2-p.x)*e,y=p.y+(p.y2-p.y)*e-(p.arc||0)*4*e*(1-e);const dx=p.x2-p.x,dy=(p.y2-p.y)-(p.arc||0)*4*(1-2*e);g.save();g.translate(x,y);g.rotate(p.spin?u*p.spin:Math.atan2(dy,dx));(SHP[p.shape]||SHP.dot)(g,p.size,p.c);g.restore();break;}
      case 'arc':{const pr=Math.min(1,u/.5),a1=p.a0+p.sw*pr,a0=p.a0+p.sw*Math.max(0,pr-.55);g.strokeStyle=p.c;g.lineCap='round';g.lineWidth=p.w*(1-u*.7);g.beginPath();g.arc(p.x,p.y,p.r,Math.min(a0,a1),Math.max(a0,a1));g.stroke();g.strokeStyle='#fff';g.lineWidth=p.w*.3*(1-u*.7);g.stroke();break;}
      case 'ring':{const r=p.r0+(p.r1-p.r0)*(1-(1-u)*(1-u));g.strokeStyle=p.c;g.lineWidth=p.w*(1-u*.6);g.beginPath();g.arc(p.x,p.y,Math.max(.1,r),0,6.283);g.stroke();if(p.fill){g.globalAlpha*=.22;g.fillStyle=p.c;g.fill();}break;}
      case 'line':{const pr=p.grow?Math.min(1,u/.3):1,x=p.x+(p.x2-p.x)*pr,y=p.y+(p.y2-p.y)*pr;g.lineCap='round';g.strokeStyle=p.c;g.lineWidth=p.w*(1-u*.7);g.beginPath();g.moveTo(p.x,p.y);g.lineTo(x,y);g.stroke();g.strokeStyle='#fff';g.lineWidth=p.w*.3*(1-u*.7);g.stroke();break;}
      case 'bolt':{g.lineJoin='round';g.lineCap='round';g.strokeStyle=p.c;g.lineWidth=p.w;g.beginPath();p.pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();g.strokeStyle='#fff';g.lineWidth=p.w*.38;g.stroke();break;}
      case 'wave':{const x=p.x+(p.x2-p.x)*u,top=p.y-p.h;g.fillStyle=p.c;g.beginPath();g.moveTo(x-p.w,p.y);for(let i=0;i<=6;i++){const q=i/6;g.lineTo(x-p.w+p.w*2*q,top+Math.sin(q*6+u*10)*p.h*.14+(1-Math.sin(q*3.14))*p.h*.5);}g.lineTo(x+p.w,p.y);g.closePath();g.fill();break;}
      case 'pillar':{g.fillStyle=p.c;g.fillRect(p.x-p.w/2*(1-u*.5),p.y-p.h,p.w*(1-u*.5),p.h);g.fillStyle='#fff';g.fillRect(p.x-p.w/6,p.y-p.h,p.w/3,p.h);break;}
      case 'rect':{g.fillStyle=p.c;g.fillRect(p.x,p.y,p.w,p.h);break;}
      case 'fn':{try{p.fn(g,u,p);}catch(e){p.t=p.life;}break;}
    }
  }
  /* building blocks */
  const n=v=>Math.max(1,Math.round(v*qm()));
  function burst(x,y,c,cnt,spd,shape,size,life,g,delay){for(let i=0,m=n(cnt);i<m;i++){const a=rand(0,6.283),v=rand(spd*.4,spd);add({k:'p',shape:shape||'spark',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,ay:g||0,drag:1.6,life:rand((life||420)*.7,life||420),size:rand((size||6)*.6,(size||6)*1.15),c,rot:rand(0,6.283),vr:rand(-6,6),delay});}}
  function ring(t,c,r0,r1,w,life,delay,fill){add({k:'ring',x:t.x,y:t.y,c,r0,r1,w:w||5,life:life||360,delay,fill,fade:.3});}
  function arc(t,c,o){o=o||{};add({k:'arc',x:t.x+(o.dx||0),y:t.y+(o.dy||0),c,r:o.r||54,w:o.w||11,a0:o.a0===undefined?-2.2:o.a0,sw:o.sw||2.6,life:o.life||300,delay:o.delay,fade:.5});}
  function line(a,b,c,w,life,delay,grow){add({k:'line',x:a.x,y:a.y,x2:b.x,y2:b.y,c,w:w||6,life:life||260,delay,grow,fade:.35});}
  function bolt(a,b,c,w,life,delay){const pts=[[a.x,a.y]],m=7;for(let i=1;i<m;i++){const u=i/m;pts.push([a.x+(b.x-a.x)*u+rand(-16,16),a.y+(b.y-a.y)*u+rand(-16,16)]);}pts.push([b.x,b.y]);add({k:'bolt',pts,c:c||'#FFE27A',w:w||5,life:life||220,delay,fade:.3});}
  function shot(a,b,shape,o){o=o||{};add({k:'shot',x:a.x,y:a.y,x2:b.x,y2:b.y,shape,c:o.c,size:o.size||9,life:o.ms||180,arc:o.arc,spin:o.spin,ease:o.ease,delay:o.delay,fade:.92});if(o.trail&&Q.level>0){const m=o.trail;for(let i=1;i<=m;i++){const u=i/(m+1);add({k:'p',shape:o.tshape||'dot',x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u-(o.arc||0)*4*u*(1-u),vx:0,vy:0,life:220,size:o.tsize||3,c:o.tc||o.c||'#fff',delay:(o.delay||0)+(o.ms||180)*u});}}}
  function fall(t,shape,o){o=o||{};const h=o.h||Math.min(320,t.y+40);add({k:'shot',x:t.x+(o.dx||0)+(o.xo||0),y:t.y-h,x2:t.x+(o.dx||0),y2:t.y+(o.dy||0),shape,c:o.c,size:o.size||10,life:o.ms||220,ease:'in',delay:o.delay,fade:.95,spin:o.spin});}
  function rise(t,shape,o){o=o||{};for(let i=0,m=n(o.n||6);i<m;i++){add({k:'p',shape,x:t.x+rand(-(o.w||34),o.w||34),y:t.y+rand(-6,o.h||24),vx:rand(-10,10),vy:rand(-(o.v||90),-(o.v||90)*.5),life:rand(600,o.life||860),size:rand((o.size||7)*.7,(o.size||7)*1.15),c:o.c,rot:o.turn?rand(-.5,.5):0,vr:o.turn?rand(-1,1):0,delay:rand(0,o.spread||220)+(o.delay||0),fin:.12,fade:.5});}}
  function wave(T,c,dir,o){o=o||{};const xs=T.map(t=>t.x),ys=T.map(t=>t.y),x0=Math.min(...xs)-140,x1=Math.max(...xs)+140,y=Math.max(...ys)+60,h=o.h||140,w=o.w||130;add({k:'wave',x:dir>0?x0:x1,x2:dir>0?x1:x0,y,h,w,c,a:o.a||.72,life:o.ms||520,delay:o.delay,fade:.7});}
  function pillar(t,c,w,h,life,delay){add({k:'pillar',x:t.x,y:t.y+30,c,w:w||70,h:h||(t.y+30),a:.62,life:life||560,delay,fin:.15,fade:.55});}
  const sky=t=>({x:t.x+rand(-30,30),y:Math.max(0,t.y-300)});
  const each=(T,f)=>T.forEach(f);
  const dir=(A,T)=>(T[0]&&T[0].x<A.x)?-1:1;
  const WH='#F4F7FF',GD='#FFC94D',GN='#35D07F',PK='#F06BAE',BL='#2FD6E8',YL='#FFE27A',RD='#F0506E',PU='#C99BFF',IC='#BFEFFF';
  /* per-skill effects: each returns the delay in ms until the hit lands */
  const P={
    slash:(A,T)=>{each(T,t=>{arc(t,WH,{delay:120});burst(t.x,t.y,'#fff',6,190,'spark',6,340,0,170);});return 180;},
    slash2:(A,T)=>{each(T,t=>{arc(t,WH,{delay:100,a0:-2.4});arc(t,'#D5DCEC',{delay:190,a0:-.6,sw:-2.6});burst(t.x,t.y,'#fff',10,230,'spark',7,380,0,220);});return 240;},
    whirl:(A,T)=>{each(T,t=>{for(let i=0;i<3;i++)arc(t,WH,{r:46+i*10,w:8,a0:i*2.1,sw:4.4,life:440,delay:60+i*70});burst(t.x,t.y,'#fff',8,200,'spark',6,420,0,240);});return 280;},
    bash:(A,T)=>{each(T,t=>{ring(t,'#A8BAFF',10,62,8,300,150);burst(t.x,t.y,YL,8,220,'spark',8,380,0,160);add({k:'p',shape:'shield',x:t.x,y:t.y,vx:0,vy:-30,life:320,size:18,delay:130,fade:.4});});return 180;},
    guard:(A)=>{ring(A,'#A8BAFF',30,72,7,520,0,1);rise(A,'shield',{n:5,size:10,w:40,v:70});return 240;},
    dome:(A,T)=>{each(T,t=>{ring(t,'#8FB4FF',20,78,8,620,0,1);rise(t,'spark',{n:6,c:'#E6EEFF',w:44,size:6});});return 300;},
    pick:(A,T)=>{each(T,t=>{arc(t,'#D5DCEC',{delay:120,w:9,r:48});burst(t.x,t.y+10,'#8A6A4A',8,240,'rock',5,520,700,170);});return 180;},
    goldvein:(A,T)=>{each(T,t=>{arc(t,'#D5DCEC',{delay:120});burst(t.x,t.y,GD,12,300,'coin',6,760,800,170);ring(t,GD,8,60,6,320,170);});return 200;},
    rockfall:(A,T)=>{each(T,t=>{for(let i=0;i<5;i++)fall(t,'rock',{c:'#8A7A6A',size:rand(9,15),dx:rand(-46,46),dy:rand(-14,20),delay:i*70,ms:230});burst(t.x,t.y+20,'#B8A88A',12,220,'dot',5,520,200,300);});return 340;},
    wrench:(A,T)=>{each(T,t=>{shot(A,t,'wrench',{size:13,ms:210,spin:14});burst(t.x,t.y,YL,5,170,'spark',6,300,0,210);});return 210;},
    gearup:(A,T)=>{each(T,t=>{rise(t,'gear',{n:4,c:'#A8BAFF',size:9,w:36,v:80,turn:1});ring(t,'#A8BAFF',14,56,5,420,60);});return 240;},
    repair:(A,T)=>{each(T,t=>{rise(t,'plus',{n:6,c:GN,size:7});rise(t,'gear',{n:2,c:'#A8BAFF',size:8,turn:1});ring(t,'#8FB4FF',16,62,6,480,80,1);});return 280;},
    axe:(A,T)=>{each(T,t=>{arc(t,'#E0E6F4',{delay:130,w:16,r:60,a0:-2.6,sw:3,life:320});ring(t,'#fff',10,50,5,240,190);burst(t.x,t.y,'#fff',7,220,'spark',8,340,0,190);});return 200;},
    axe2:(A,T)=>{each(T,t=>{arc(t,'#E0E6F4',{delay:100,w:16,r:60,a0:-2.6,sw:3});arc(t,'#E0E6F4',{delay:220,w:16,r:60,a0:-.4,sw:-3});burst(t.x,t.y,RD,10,240,'drop',6,520,500,240);});return 260;},
    rage:(A,T)=>{ring(A,RD,20,80,9,480,0,1);rise(A,'up',{n:6,c:RD,size:9});each(T,t=>{arc(t,RD,{delay:300,w:20,r:70,a0:-2.8,sw:3.4,life:340});ring(t,GD,10,76,8,320,360);burst(t.x,t.y,GD,14,300,'spark',9,420,0,360);});return 380;},
    quick:(A,T)=>{each(T,t=>{line({x:t.x-50,y:t.y-30},{x:t.x+50,y:t.y+30},WH,5,170,90,1);line({x:t.x+50,y:t.y-30},{x:t.x-50,y:t.y+30},WH,5,170,160,1);burst(t.x,t.y,'#fff',5,170,'spark',5,280,0,170);});return 190;},
    iaido:(A,T)=>{each(T,t=>{line({x:t.x-130,y:t.y-8},{x:t.x+130,y:t.y+8},'#fff',7,240,180,1);burst(t.x,t.y,'#fff',12,320,'spark',6,360,0,300);ring(t,RD,8,70,5,300,300);});return 320;},
    bladestorm:(A,T)=>{each(T,t=>{for(let i=0;i<5;i++)line({x:t.x+rand(-60,60),y:t.y-60},{x:t.x+rand(-60,60),y:t.y+60},WH,4,170,i*60,1);burst(t.x,t.y,'#fff',8,220,'spark',6,340,0,200);});return 280;},
    scepter:(A,T)=>{each(T,t=>{ring(t,GD,8,50,6,300,110);burst(t.x,t.y,GD,8,220,'star',7,420,0,120);});return 160;},
    royal:(A,T)=>{each(T,t=>{rise(t,'up',{n:5,c:GD,size:8});rise(t,'spark',{n:4,c:YL,size:7});});ring(A,GD,20,90,6,560);return 260;},
    crown:(A,T)=>{ring(A,GD,20,120,8,640,0,1);each(T,t=>{ring(t,'#8FB4FF',16,62,6,520,120,1);rise(t,'up',{n:5,c:'#8FE8B0',size:8,delay:100});rise(t,'spark',{n:5,c:GD,size:8});});return 320;},
    arrow:(A,T)=>{each(T,t=>{shot(A,t,'arrow',{c:'#D5DCEC',size:11,ms:190});burst(t.x,t.y,'#fff',4,150,'spark',5,260,0,190);});return 190;},
    arrowpoison:(A,T)=>{each(T,t=>{shot(A,t,'arrow',{c:GN,size:12,ms:200,trail:4,tc:GN});burst(t.x,t.y,GN,6,130,'bubble',5,520,-80,200);});return 200;},
    arrowrain:(A,T)=>{each(T,t=>{for(let i=0;i<6;i++)add({k:'shot',x:t.x+rand(-70,70)-60,y:t.y-260,x2:t.x+rand(-50,50),y2:t.y+rand(-20,24),shape:'arrow',c:'#D5DCEC',size:10,life:220,ease:'in',delay:i*55,fade:.95});burst(t.x,t.y,GN,6,120,'bubble',5,520,-70,330);});return 340;},
    fork:(A,T)=>{each(T,t=>{[-14,0,14].forEach((o,i)=>line({x:t.x-60,y:t.y+o},{x:t.x+30,y:t.y+o},'#D5DCEC',4,190,110+i*20,1));burst(t.x,t.y,'#B7E08A',6,170,'leaf',6,420,120,170);});return 180;},
    sprout:(A)=>{rise(A,'leaf',{n:9,c:GN,size:8,turn:1,w:44});ring(A,GN,16,66,6,520,0,1);return 220;},
    harvest:(A,T)=>{each(T,t=>{arc(t,GD,{w:15,r:66,a0:-2.8,sw:3.4,delay:60,life:380});burst(t.x,t.y,'#D9A92E',10,220,'leaf',6,560,300,170);});return 220;},
    pat:(A,T)=>{each(T,t=>{shot(A,t,'heart',{c:RD,size:9,ms:200});ring(t,'#FFB3C1',6,36,4,240,200);});rise(A,'heart',{n:2,c:'#FF8FA3',size:6});return 200;},
    bandage:(A,T)=>{each(T,t=>{rise(t,'plus',{n:7,c:GN,size:8});rise(t,'heart',{n:3,c:'#FF8FA3',size:7});ring(t,GN,10,54,5,420,0,1);});return 240;},
    emergency:(A,T)=>{each(T,t=>{rise(t,'plus',{n:9,c:GN,size:9});ring(t,'#fff',10,66,6,480,60);ring(t,GN,8,56,5,480,0,1);});return 300;},
    pan:(A,T)=>{each(T,t=>{shot(A,t,'coin',{c:'#5D5D74',size:13,ms:190,spin:12});ring(t,'#fff',8,48,6,240,190);burst(t.x,t.y-16,YL,6,130,'star',6,520,120,190);});return 190;},
    snack:(A,T)=>{each(T,t=>{rise(t,'leaf',{n:4,c:'#D9A92E',size:7,turn:1});rise(t,'up',{n:3,c:'#F8A838',size:8});});return 240;},
    feast:(A,T)=>{each(T,t=>{rise(t,'heart',{n:3,c:'#FF8FA3',size:8});rise(t,'plus',{n:4,c:GN,size:7});rise(t,'up',{n:4,c:'#F8A838',size:8});ring(t,'#F8A838',10,60,6,520,40,1);});return 300;},
    pebble:(A,T)=>{each(T,t=>{shot(A,t,'dot',{c:'#D9C7A8',size:7,ms:170,trail:3,tc:'#D9C7A8'});burst(t.x,t.y,'#fff',4,140,'spark',5,240,0,170);});return 170;},
    ricochet:(A,T)=>{const t0=T[0];if(t0){shot(A,t0,'dot',{c:'#D9C7A8',size:8,ms:170});const list=BOUNCE(t0);let prev=t0,d=170;list.forEach(q=>{shot(prev,q,'dot',{c:'#D9C7A8',size:8,ms:140,delay:d,arc:30});burst(q.x,q.y,'#fff',4,130,'spark',5,240,0,d+140);prev=q;d+=140;});}return 170;},
    blastshot:(A,T)=>{each(T,(t,i)=>{const d=i*70;shot(A,t,'dot',{c:'#F8A838',size:8,ms:190,delay:d,trail:3,tc:'#F8A838'});ring(t,'#F8A838',6,62,8,320,d+190,1);burst(t.x,t.y,'#F8A838',10,240,'dot',4,420,0,d+190);});return 260;},
    spore:(A,T)=>{each(T,t=>{for(let i=0;i<4;i++)shot({x:A.x,y:A.y-10},{x:t.x+rand(-16,16),y:t.y+rand(-16,16)},'dot',{c:'#A8E89A',size:5,ms:300,delay:i*50,arc:26});burst(t.x,t.y,GN,6,70,'dot',4,600,-30,340);});return 320;},
    thornfield:(A,T)=>{each(T,t=>{for(let i=0;i<6;i++)add({k:'p',shape:'shard',x:t.x+rand(-54,54),y:t.y+50,vx:0,vy:-260,drag:4,life:420,size:12,c:'#3FA66A',rot:-1.57,delay:i*40,fade:.6});burst(t.x,t.y,GN,5,70,'bubble',5,560,-60,260);});return 260;},
    forest:(A,T)=>{each(T,t=>{for(let i=0;i<8;i++)add({k:'p',shape:'leaf',x:t.x+rand(-100,100),y:t.y-rand(70,180),vx:rand(30,120),vy:rand(90,180),life:rand(420,700),size:rand(7,12),c:i%2?GN:'#7FE3A8',rot:rand(0,6),vr:rand(-6,6),delay:i*30});ring(t,GN,14,70,6,420,180);});rise(A,'spark',{n:5,c:'#8FE8B0'});return 320;},
    gnaw:(A,T)=>{each(T,t=>{shot(A,t,'leaf',{c:'#D9A92E',size:9,ms:180,spin:10});burst(t.x,t.y,'#D9A92E',6,170,'dot',4,380,300,180);});return 180;},
    wheelspin:(A,T,c,who)=>{
      const C=wheelAt(who,A),Rw=rimOf(who,70);spinUp(who,5,900);
      rimFire(C,Rw,780,1);ring(C,GD,Rw*.92,Rw*1.75,7,540);ring(C,'#FFF3B8',Rw,Rw*1.45,3,420,90);
      each(T,(t,i)=>{const at=190+i*70,far=Math.hypot(t.x-C.x,t.y-C.y)>Rw;if(!far){rise(C,'plus',{n:4,c:GN,size:8,w:Rw*.9,h:Rw*.5,delay:at});rise(C,'up',{n:4,c:GD,size:8,w:Rw*.9,h:Rw*.5,delay:at});return;}const a=Math.atan2(t.y-C.y,t.x-C.x),on=at+300;shot({x:C.x+Math.cos(a)*Rw,y:C.y+Math.sin(a)*Rw},t,'spark',{c:GD,size:13,ms:300,arc:58,delay:at,trail:5,tc:YL,tsize:4});ring(t,GD,10,66,6,440,on,1);ring(t,GN,8,50,4,380,on+50);rise(t,'plus',{n:4,c:GN,size:8,delay:on-120});rise(t,'up',{n:4,c:GD,size:8,delay:on-120});});
      return 380;
    },
    /* the wheel winds up behind him before it flies */
    goldcharge:(A,T,c,who)=>{
      const C=wheelAt(who,A),Rw=rimOf(who,70);spinUp(who,8,640,'in');
      rimFire(C,Rw,700,1.6);ring(C,GD,Rw*1.9,Rw*1.02,6,520);ring(C,'#FFF3B8',Rw*1.6,Rw,3,440,90);
      for(let i=0,m=n(14);i<m;i++){const a=rand(0,6.283),r=Rw*rand(1.3,2.1);add({k:'shot',x:C.x+Math.cos(a)*r,y:C.y+Math.sin(a)*r,x2:C.x+Math.cos(a)*Rw,y2:C.y+Math.sin(a)*Rw,shape:i%3?'spark':'coin',c:i%2?GD:'#FFF3B8',size:rand(5,9),life:rand(300,460),delay:i*24,ease:'in',fade:.9});}
      return 0;
    },
    goldwheel:(A,T,c,who)=>{
      const C=wheelAt(who,A),last=T[T.length-1]||C,dx=(T[0]?T[0].x:C.x+1)-C.x,d=dx>=0?1:-1,R=Math.max(44,Math.min(96,innerWidth*.062)),GROW=140,FIRST=210,NEXT=165;
      const stops=[{x:C.x,y:C.y,at:GROW}];
      T.forEach((t,i)=>stops.push({x:t.x,y:t.y,at:GROW+FIRST+i*NEXT}));
      stops.push({x:last.x+d*Math.max(innerWidth*.34,300),y:last.y-40,at:GROW+FIRST+(T.length-1)*NEXT+300});
      const life=stops[stops.length-1].at+60,tail=[];let roll=0,lastX=C.x,lastY=C.y;
      const place=ms=>{if(ms<=stops[0].at)return {x:C.x,y:C.y,k:clampU(ms/GROW)};for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i];if(ms<=b.at){const u=(ms-a.at)/(b.at-a.at),hop=i===1?0:Math.min(70,Math.hypot(b.x-a.x,b.y-a.y)*.22);return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u-hop*4*u*(1-u),k:1};}}return {x:stops[stops.length-1].x,y:stops[stops.length-1].y,k:1};};
      FLASH(GD,.34,220);
      add({k:'fn',life,x:0,y:0,fade:1,fn:(g,u,p)=>{
        const ms=u*life,q=place(ms);
        roll+=Math.hypot(q.x-lastX,q.y-lastY)/R*d+(ms<GROW?.5*d:0);lastX=q.x;lastY=q.y;
        tail.push({x:q.x,y:q.y});if(tail.length>16)tail.shift();
        if(ms>GROW&&tail.length>2){g.save();g.globalCompositeOperation='lighter';for(let i=1;i<tail.length;i++){const k=i/tail.length,a=tail[i-1],b=tail[i],w=R*.92*k,nx=-(b.y-a.y),ny=b.x-a.x,len=Math.hypot(nx,ny)||1;g.globalAlpha=k*k*.62;g.fillStyle=k>.55?'#FFD76A':'#FF9A3C';g.beginPath();g.moveTo(a.x+nx/len*w,a.y+ny/len*w);g.lineTo(b.x+nx/len*w,b.y+ny/len*w);g.lineTo(b.x-nx/len*w,b.y-ny/len*w);g.lineTo(a.x-nx/len*w,a.y-ny/len*w);g.closePath();g.fill();}g.restore();
          if(Q.level>0)add({k:'p',shape:'spark',x:q.x+rand(-R*.5,R*.5),y:q.y+R*.6,vx:-d*rand(40,220),vy:rand(-210,-30),ay:520,drag:.6,life:rand(240,480),size:rand(4,8),c:Math.random()<.5?GD:'#FFF3B8',rot:rand(0,6.283),vr:rand(-8,8)});}
        g.globalAlpha=1;wheelArt(g,q.x,q.y,R*(q.k<1?.25+.75*q.k:1),roll,1);
      }});
      T.forEach((t,i)=>{const at=GROW+FIRST+i*NEXT,R2=Math.min(150,R*1.8);ring(t,GD,10,R2,11,430,at,1);ring(t,'#fff',8,R2*.72,5,300,at+30);burst(t.x,t.y,'#FFF3B8',12,380,'spark',8,420,0,at);burst(t.x,t.y,GD,12,430,'coin',7,860,900,at);});
      each([last],t=>{const at=GROW+FIRST+(T.length-1)*NEXT+90;for(let i=0,m=n(14);i<m;i++)add({k:'p',shape:'coin',x:t.x+rand(-170,170),y:Math.max(0,t.y-rand(180,320)),vx:rand(-30,30),vy:rand(40,160),ay:760,life:rand(620,1000),size:rand(6,10),c:GD,rot:rand(0,6.283),vr:rand(-9,9),delay:at+rand(0,300),fade:.8});});
      return GROW+FIRST;
    },
    pillow:(A,T)=>{each(T,t=>{shot(A,t,'pillow',{size:15,ms:290,arc:60,spin:6});burst(t.x,t.y,'#fff',7,120,'feather',7,700,60,290);});return 290;},
    yawn:(A,T)=>{each(T,t=>{for(let i=0;i<3;i++)shot({x:A.x,y:A.y-20},{x:t.x,y:t.y-20},'z',{c:PU,size:10+i*2,ms:340,delay:i*70,arc:16});});return 320;},
    sleepall:(A,T)=>{each(T,t=>{rise(t,'z',{n:5,c:PU,size:10,w:30});});rise(A,'heart',{n:4,c:'#FF8FA3',size:7,w:80});return 300;},
    moonbeam:(A,T)=>{each(T,t=>{line({x:A.x,y:A.y-14},t,'#F7B6DA',10,300,60,1);burst(t.x,t.y,'#fff',5,130,'spark',6,360,0,160);});return 180;},
    sheeprain:(A,T)=>{each(T,t=>{for(let i=0;i<2;i++)fall(t,'sheep',{size:15,dx:rand(-36,36),dy:rand(-16,10),delay:i*110,ms:260});burst(t.x,t.y+10,'#fff',5,120,'dot',4,320,0,300);});return 300;},
    stampede:(A,T)=>{const y=Math.max(...T.map(t=>t.y))+6,x1=Math.max(...T.map(t=>t.x))+170;for(let i=0;i<7;i++)add({k:'shot',x:A.x,y:y+rand(-70,26),x2:x1,y2:y+rand(-70,26),shape:'sheep',size:rand(15,21),life:560,delay:i*60,fade:.9});each(T,(t,i)=>{burst(t.x,t.y,'#fff',7,190,'dot',5,360,0,260+i*50);});return 340;},
    shadowstab:(A,T)=>{each(T,t=>{[-16,0,16].forEach((o,i)=>line({x:t.x-34+o,y:t.y-40},{x:t.x+22+o,y:t.y+40},'#5A2F78',6,190,100+i*30,1));burst(t.x,t.y,'#7B4FC9',6,160,'dot',4,300,0,160);});return 180;},
    shuriken:(A,T)=>{each(T,t=>{shot(A,t,'star',{c:'#D5DCEC',size:13,ms:220,spin:22,trail:3,tc:'#7B4FC9'});burst(t.x,t.y,RD,6,180,'drop',5,420,400,220);});return 220;},
    assassinate:(A,T)=>{DIM(.4);each(T,t=>{line({x:t.x-80,y:t.y-70},{x:t.x+80,y:t.y+70},'#fff',7,240,170,1);line({x:t.x+80,y:t.y-70},{x:t.x-80,y:t.y+70},'#fff',7,240,250,1);burst(t.x,t.y,'#7B4FC9',12,300,'dot',5,420,0,270);});return 300;},
    note:(A,T)=>{each(T,t=>{for(let i=0;i<3;i++)shot({x:A.x,y:A.y-14},{x:t.x+rand(-14,14),y:t.y-14},'note',{c:PK,size:10,ms:280,delay:i*60,arc:rand(8,24)});});return 280;},
    lullaby:(A,T)=>{each(T,t=>{rise(t,'note',{n:4,c:PK,size:10,w:34});rise(t,'z',{n:3,c:PU,size:9,w:30,delay:120});});return 300;},
    ballad:(A,T)=>{ring(A,PK,20,150,7,700);ring(A,PK,20,150,7,700,160);each(T,t=>{rise(t,'note',{n:5,c:PK,size:11,w:36});rise(t,'z',{n:5,c:PU,size:11,w:36,delay:180});});return 420;},
    moonray:(A,T)=>{each(T,t=>{line(sky(t),t,'#FFF3B8',11,300,40,1);burst(t.x,t.y,'#fff',5,120,'spark',6,340,0,130);});return 150;},
    pray:(A,T)=>{each(T,t=>{line(sky(t),t,'#FFF3B8',16,420,0,1);rise(t,'plus',{n:6,c:GN,size:7});});rise(A,'moon',{n:2,c:YL,size:8});return 240;},
    resurrect:(A,T)=>{each(T,t=>{pillar(t,'#FFF3B8',62);rise(t,'feather',{n:6,size:8,w:40,turn:1});rise(t,'plus',{n:3,c:GN,size:7});});return 360;},
    scythe:(A,T)=>{each(T,t=>{arc(t,PU,{w:13,r:68,a0:-2.9,sw:3.5,delay:60,life:320});burst(t.x,t.y,'#7B4FC9',6,170,'dot',4,320,0,150);});return 170;},
    deathlull:(A,T)=>{wave(T,'rgba(90,47,120,.6)',dir(A,T),{h:120,ms:460});each(T,t=>{rise(t,'z',{n:4,c:PU,size:10,w:30,delay:200});});return 260;},
    reaper:(A,T)=>{DIM(.5);each(T,t=>{arc(t,'#E8D8FF',{w:24,r:90,a0:-3.1,sw:4,delay:220,life:440});ring(t,PU,12,96,9,400,380);burst(t.x,t.y,'#7B4FC9',14,320,'dot',6,480,0,380);});return 420;},
    zap:(A,T)=>{each(T,t=>{bolt({x:A.x,y:A.y-14},t,YL,4,190,30);burst(t.x,t.y,YL,5,150,'spark',6,280,0,60);});return 90;},
    zap2:(A,T)=>{each(T,(t,i)=>{bolt({x:A.x,y:A.y-14},t,YL,4,190,30+i*80);burst(t.x,t.y,YL,5,150,'spark',6,280,0,60+i*80);});return 170;},
    thunderlet:(A,T)=>{each(T,(t,i)=>{bolt(sky(t),t,YL,6,240,i*80);ring(t,YL,6,54,5,280,i*80+30);burst(t.x,t.y,YL,6,170,'spark',6,300,0,i*80+30);});return 240;},
    burst:(A,T)=>{each(T,(t,i)=>{line({x:A.x,y:A.y-8},{x:t.x+rand(-10,10),y:t.y+rand(-10,10)},'#8FB4FF',3,110,i*70);burst(t.x,t.y,YL,3,120,'spark',5,200,0,i*70+60);});return 200;},
    railgun:(A,T)=>{each(T,t=>{ring(A,'#8FB4FF',30,6,4,180);const dx=t.x-A.x,dy=t.y-A.y;line({x:A.x,y:A.y-6},{x:t.x+dx*.5,y:t.y+dy*.5},'#8FB4FF',15,300,180);ring(t,'#fff',8,74,8,320,190);burst(t.x,t.y,YL,10,300,'spark',7,340,0,190);});return 210;},
    overload:(A,T)=>{ring(A,YL,16,80,6,300,0,1);each(T,(t,i)=>{bolt({x:A.x,y:A.y-10},t,YL,6,260,160+i*60);bolt(sky(t),t,'#8FB4FF',4,220,200+i*60);burst(t.x,t.y,YL,8,220,'spark',7,340,0,190+i*60);});return 280;},
    wrenchzap:(A,T)=>{each(T,t=>{arc(t,'#D5DCEC',{delay:110,r:46});bolt({x:t.x-50,y:t.y-30},t,YL,3,170,160);bolt({x:t.x+50,y:t.y-30},t,YL,3,170,190);});return 180;},
    battery:(A)=>{ring(A,YL,18,76,7,560,0,1);for(let i=0;i<5;i++){const a=i/5*6.283;bolt({x:A.x+Math.cos(a)*80,y:A.y+Math.sin(a)*80},A,YL,3,200,i*60);}return 260;},
    breaker:(A,T)=>{FLASH('#FFE27A',.4,160);each(T,(t,i)=>{bolt(sky(t),t,YL,8,300,120+i*60);ring(t,YL,8,70,7,340,160+i*60);burst(t.x,t.y,YL,8,230,'spark',7,360,0,160+i*60);});return 260;},
    card:(A,T)=>{each(T,t=>{shot(A,t,'card',{size:11,ms:210,spin:16});burst(t.x,t.y,'#fff',4,130,'spark',5,240,0,210);});return 210;},
    vanish:(A,T)=>{burst(A.x,A.y,'#C9C3DE',12,120,'dot',8,520,-60);each(T,t=>{shot(A,t,'card',{size:11,ms:210,spin:16,delay:80});});return 280;},
    magicshow:(A,T)=>{each(T,t=>{for(let i=0;i<4;i++)shot(A,{x:t.x+rand(-30,30),y:t.y+rand(-30,30)},'card',{size:10,ms:260,spin:18,delay:i*60});burst(t.x,t.y,GD,10,240,'star',7,560,60,300);ring(t,PK,10,70,6,360,300);});return 330;},
    cracker:(A,T)=>{each(T,t=>{shot(A,t,'dot',{c:RD,size:6,ms:250,arc:50,trail:3,tc:YL});burst(t.x,t.y,GD,9,220,'spark',6,340,0,250);ring(t,'#F8A838',6,44,5,240,250);});return 250;},
    timebomb:(A,T)=>{each(T,t=>{shot(A,t,'bomb',{size:12,ms:320,arc:70,spin:5});ring(t,RD,50,14,4,320,320);});return 320;},
    cluster:(A,T)=>{each(T,(t,i)=>{const d=i*90;shot(A,t,'bomb',{size:11,ms:300,arc:80,delay:d,spin:5});ring(t,'#F8A838',8,68,9,340,d+300,1);burst(t.x,t.y,'#F8A838',10,260,'dot',5,440,0,d+300);});return 340;},
    hammer:(A,T)=>{each(T,t=>{ring(t,YL,8,68,8,300,170);burst(t.x,t.y+10,YL,8,230,'spark',7,340,0,170);bolt({x:t.x,y:t.y-90},t,YL,4,160,150);});return 190;},
    lightning:(A,T)=>{FLASH('#FFF6C9',.3,120);each(T,t=>{bolt(sky(t),t,YL,10,300,50);bolt(sky(t),t,'#8FB4FF',5,240,90);ring(t,YL,8,84,9,360,70);burst(t.x,t.y,YL,12,300,'spark',8,380,0,70);});return 110;},
    thor:(A,T)=>{FLASH('#FFF6C9',.45,200);each(T,(t,i)=>{bolt(sky(t),t,YL,11,340,160+i*50);ring(t,YL,8,96,10,380,190+i*50,1);burst(t.x,t.y,YL,12,320,'spark',8,420,0,190+i*50);});return 300;},
    anchor:(A,T)=>{each(T,t=>{shot(A,t,'anchor',{size:18,ms:230,arc:30,spin:7});burst(t.x,t.y,BL,8,190,'drop',5,440,500,230);});return 230;},
    anchorslam:(A,T)=>{each(T,t=>{fall(t,'anchor',{size:26,ms:260,spin:2});ring(t,BL,10,84,9,360,260);burst(t.x,t.y+10,BL,12,280,'drop',6,520,700,260);});return 270;},
    bigwave:(A,T)=>{wave(T,'rgba(47,214,232,.7)',dir(A,T),{h:150});each(T,(t,i)=>{burst(t.x,t.y,'#BFEFFF',8,210,'drop',5,500,500,180+i*80);});return 260;},
    saber:(A,T)=>{each(T,t=>{arc(t,'#EEF2FB',{w:10,r:62,a0:-1,sw:-2.6,delay:90});burst(t.x,t.y,BL,5,170,'drop',5,360,300,160);});return 180;},
    plunder:(A,T)=>{each(T,t=>{arc(t,'#EEF2FB',{w:10,r:58,delay:80});burst(t.x,t.y,GD,10,270,'coin',6,700,800,150);});return 170;},
    cannon:(A,T)=>{each(T,(t,i)=>{const d=i*90;shot(A,t,'dot',{c:'#3A3550',size:10,ms:290,arc:70,delay:d,trail:3,tc:'#C9C3DE',tsize:5});ring(t,'#F8A838',8,74,10,340,d+290,1);burst(t.x,t.y,'#C9C3DE',8,220,'dot',7,500,-40,d+290);});return 340;},
    flask:(A,T)=>{each(T,t=>{shot(A,t,'flask',{c:'#7FE3A8',size:10,ms:270,arc:60,spin:8});burst(t.x,t.y,GN,8,170,'bubble',5,480,-60,270);});return 270;},
    potion:(A,T)=>{each(T,t=>{shot(A,t,'flask',{c:BL,size:10,ms:260,arc:60,spin:8});burst(t.x,t.y,BL,6,160,'bubble',5,420,-50,260);});return 260;},
    flaskboom:(A,T)=>{each(T,(t,i)=>{const d=i*70;shot(A,t,'flask',{c:'#F8A838',size:11,ms:270,arc:70,spin:8,delay:d});ring(t,'#F08A28',8,66,8,340,d+270,1);burst(t.x,t.y,'#F08A28',8,200,'bubble',6,520,-40,d+270);});return 320;},
    harpoon:(A,T)=>{each(T,t=>{shot(A,t,'shard',{c:'#D5DCEC',size:14,ms:170,trail:3,tc:'#8A96B0'});burst(t.x,t.y,BL,5,170,'drop',5,360,300,170);});return 170;},
    bubbleguard:(A)=>{rise(A,'bubble',{n:10,c:BL,size:8,w:50,v:60});ring(A,BL,20,70,6,520,0,1);return 240;},
    oxygen:(A,T)=>{each(T,t=>{rise(t,'bubble',{n:7,c:BL,size:7,w:40,v:70});ring(t,'#8FB4FF',14,62,6,480,50,1);});return 280;},
    iceray:(A,T)=>{each(T,t=>{line({x:A.x,y:A.y-12},t,IC,9,280,50,1);burst(t.x,t.y,IC,7,170,'snow',6,460,60,150);});return 170;},
    icerain:(A,T)=>{each(T,t=>{for(let i=0;i<5;i++)fall(t,'shard',{c:IC,size:11,dx:rand(-50,50),dy:rand(-16,18),delay:i*60,ms:210,spin:0});burst(t.x,t.y,IC,5,130,'snow',5,420,50,300);});return 300;},
    blizzard:(A,T)=>{FLASH('#DCF4FA',.28,180);each(T,t=>{for(let i=0;i<7;i++)add({k:'p',shape:'snow',x:t.x+rand(-110,110),y:t.y-rand(60,190),vx:rand(70,170),vy:rand(90,190),life:rand(420,680),size:rand(5,10),c:'#fff',vr:rand(-4,4),delay:i*30});ring(t,IC,12,80,8,420,240,1);for(let i=0;i<4;i++)add({k:'p',shape:'shard',x:t.x+rand(-30,30),y:t.y+30,vx:rand(-90,90),vy:rand(-210,-110),ay:380,life:520,size:9,c:IC,rot:-1.57,vr:rand(-4,4),delay:260});});return 330;},
    trident:(A,T)=>{each(T,t=>{[-16,0,16].forEach((o,i)=>line({x:t.x-70,y:t.y+o},{x:t.x+36,y:t.y+o},GD,5,200,100+i*20,1));burst(t.x,t.y,BL,7,200,'drop',5,420,400,170);});return 180;},
    whirlpool:(A,T)=>{each(T,t=>{for(let i=0;i<10;i++){const a=i/10*6.283;add({k:'shot',x:t.x+Math.cos(a)*70,y:t.y+Math.sin(a)*40,x2:t.x,y2:t.y,shape:'drop',c:BL,size:6,life:360,delay:i*24,fade:.9});}ring(t,BL,60,10,6,420,20);});return 330;},
    tsunami:(A,T)=>{FLASH('#2FD6E8',.22,180);wave(T,'rgba(47,150,232,.75)',dir(A,T),{h:230,w:190,ms:620,delay:80});wave(T,'rgba(47,214,232,.55)',dir(A,T),{h:170,w:170,ms:620,delay:180});each(T,(t,i)=>{burst(t.x,t.y,'#BFEFFF',10,260,'drop',6,520,600,300+i*70);});return 380;},
    /* monster moves */
    mBoom:(A,T)=>{FLASH('#FFC94D',.3,70);each(T,t=>{shot(A,t,'dot',{c:'#FFF4D6',size:14,ms:180,arc:50});ring(t,'#F8A838',10,90,11,380,180,1);burst(t.x,t.y,'#F8A838',14,320,'dot',6,500,0,180);});return 200;},
    mDump:(A,T)=>{each(T,t=>{for(let i=0;i<3;i++)fall(t,'candle',{c:RD,size:26,dx:(i-1)*34,delay:i*60,ms:240});ring(t,RD,10,84,9,360,300);burst(t.x,t.y,BL,10,260,'drop',6,500,600,300);});return 320;},
    mVacuum:(A,T)=>{each(T,t=>{for(let i=0;i<8;i++)shot({x:t.x+rand(-34,34),y:t.y+rand(-34,34)},A,'dot',{c:'#C9C3DE',size:4,ms:320,delay:i*30,ease:'in'});});ring(A,'#C9C3DE',70,10,5,380);return 260;},
    mBell:(A,T)=>{for(let i=0;i<3;i++)ring(A,GD,18,240,6,520,i*120);each(T,t=>{burst(t.x,t.y-20,YL,5,110,'note',9,600,-40,240);});return 300;},
    mFlood:(A,T)=>{wave(T,'rgba(47,214,232,.72)',dir(A,T),{h:190,w:180,ms:600});each(T,(t,i)=>{burst(t.x,t.y,'#BFEFFF',8,220,'drop',5,500,500,240+i*70);});return 320;},
    mGift:(A,T)=>{each(T,t=>{for(let i=0;i<5;i++)fall(t,'coin',{size:8,dx:rand(-40,40),delay:i*60,ms:240});rise(t,'up',{n:4,c:GN,size:8,delay:120});});return 300;},
    mRug:(A,T)=>{each(T,t=>{add({k:'rect',x:t.x-110,y:t.y+34,w:220,h:20,c:'#C93B5A',a:.9,life:360,fade:.6});burst(t.x,t.y,'#fff',6,190,'spark',6,340,0,160);});FLASH('#F0506E',.22,120);return 240;},
    mCandle:(A,T)=>{each(T,t=>{for(let i=0;i<3;i++)fall(t,'candle',{c:RD,size:17,dx:(i-1)*26,delay:i*60,ms:200});});return 260;},
    mReorg:(A)=>{for(let i=0;i<6;i++){const a=i/6*6.283;add({k:'shot',x:A.x+Math.cos(a)*110,y:A.y+Math.sin(a)*90,x2:A.x,y2:A.y,shape:'block',c:i%2?GD:'#A8BAFF',size:9,life:420,delay:i*40,fade:.9});}ring(A,'#A8BAFF',80,12,5,480);return 320;},
    mClean:(A,T)=>{FLASH('#F2E2B8',.3,100);each(T,t=>{burst(t.x,t.y,'#D9B98A',14,240,'dot',4,600,240,60);});return 220;},
    mHeal:(A,T)=>{(T.length?T:[A]).forEach(t=>{rise(t,'plus',{n:6,c:GN,size:7});ring(t,GN,10,54,5,420,0,1);});return 220;},
    mShield:(A,T)=>{(T.length?T:[A]).forEach(t=>{ring(t,'#8FB4FF',16,62,7,480,0,1);rise(t,'spark',{n:4,c:'#E6EEFF'});});return 220;},
    mBuff:(A)=>{ring(A,RD,14,64,6,420,0,1);rise(A,'up',{n:5,c:RD,size:8});return 200;},
    mCurse:(A,T)=>{each(T,t=>{shot(A,t,'dot',{c:PU,size:7,ms:260,arc:30,trail:3,tc:PU});burst(t.x,t.y,PU,6,110,'dot',4,520,-40,260);});return 260;},
    mCurseAll:(A,T)=>{each(T,t=>{burst(t.x,t.y,PU,9,110,'dot',4,620,-50,60);ring(t,PU,10,54,4,420,40);});return 200;},
  };
  /* element defaults for monsters */
  const EL={seed:{c:GN,s:'leaf'},dream:{c:PK,s:'moon'},spark:{c:YL,s:'spark'},water:{c:BL,s:'drop'},steel:{c:'#D5DCEC',s:'shard'}};
  ['seed','dream','spark','water','steel'].forEach(k=>{
    const e=EL[k];
    P['mBite_'+k]=(A,T)=>{each(T,t=>{[-14,14].forEach((o,i)=>arc({x:t.x+o,y:t.y},e.c,{r:38,w:8,a0:i?-.5:-2.6,sw:i?-2:2,delay:110+i*50,life:220}));burst(t.x,t.y,e.c,6,180,e.s,6,380,160,170);});return 190;};
    P['mShot_'+k]=(A,T)=>{each(T,t=>{shot(A,t,e.s,{c:e.c,size:11,ms:210,spin:9,trail:3,tc:e.c});burst(t.x,t.y,e.c,6,160,e.s,6,340,0,210);});return 210;};
    P['mAoe_'+k]=(A,T)=>{ring(A,e.c,14,74,6,300,0,1);each(T,(t,i)=>{const d=120+i*70;shot(A,t,e.s,{c:e.c,size:12,ms:220,delay:d-80,spin:7});ring(t,e.c,8,58,6,320,d+140);burst(t.x,t.y,e.c,7,190,e.s,6,380,0,d+140);});return 300;};
  });
  /* where Squeektoshi's wheel is on screen */
  function wheelAt(who,A){return who&&who.kind==='ham'?who.vp(6,-82):A;}
  function spinUp(who,turns,ms,e){if(who&&who.P&&who.P.wheel&&typeof MOT!=='undefined')MOT.tw(who.p,{a:who.p.a+turns},ms,e||'out');}
  const clampU=v=>Math.max(0,Math.min(1,v));
  function rimOf(who,d){return who&&who.kind==='ham'?118*who.k():d;}
  /* a wheel at full speed: bright arcs race round the rim and sparks fly off it */
  function rimFire(C,R,life,power){
    add({k:'fn',life,x:0,y:0,fade:1,fn:(g,u)=>{
      const al=u<.15?u/.15:u>.7?(1-u)/.3:1,spin=u*life*.015*power;
      g.save();g.translate(C.x,C.y);g.globalCompositeOperation='lighter';g.lineCap='round';
      for(let i=0;i<3;i++){const a=spin+i*2.094,sw=1.2;g.globalAlpha=al*.42;g.strokeStyle='#FFB52E';g.lineWidth=R*.2;g.beginPath();g.arc(0,0,R,a,a+sw);g.stroke();g.globalAlpha=al;g.strokeStyle='#FFF3B8';g.lineWidth=R*.07;g.beginPath();g.arc(0,0,R,a+.3,a+sw);g.stroke();}
      g.restore();
    }});
    for(let j=0,m=n(20*power);j<m;j++){const a=rand(0,6.283),v=rand(220,520);add({k:'p',shape:j%3?'spark':'dot',x:C.x+Math.cos(a)*R,y:C.y+Math.sin(a)*R,vx:-Math.sin(a)*v,vy:Math.cos(a)*v,ay:420,drag:1.2,life:rand(280,620),size:rand(3,7),c:j%2?GD:'#FFF3B8',rot:a,vr:rand(-9,9),delay:rand(0,life*.7)});}
  }
  /* the wheel as a weapon: a gold rim with studs, eight spokes and a hub with a gem */
  function wheelArt(g,x,y,R,rot,glow){
    g.save();g.translate(x,y);
    if(glow){g.globalCompositeOperation='lighter';const h=g.createRadialGradient(0,0,R*.3,0,0,R*1.95);h.addColorStop(0,'rgba(255,205,80,.62)');h.addColorStop(1,'rgba(255,170,40,0)');g.fillStyle=h;g.beginPath();g.arc(0,0,R*1.95,0,6.283);g.fill();g.globalCompositeOperation='source-over';}
    g.rotate(rot);
    const metal=g.createLinearGradient(-R,-R,R,R);metal.addColorStop(0,'#FFF6C4');metal.addColorStop(.42,'#FFC94D');metal.addColorStop(1,'#B9741A');
    g.lineJoin='round';
    for(let i=0;i<8;i++){g.save();g.rotate(i/8*6.283);g.fillStyle=metal;g.strokeStyle=INK;g.lineWidth=Math.max(1.6,R*.04);g.beginPath();g.moveTo(-R*.085,-R*.2);g.lineTo(R*.085,-R*.2);g.lineTo(R*.055,-R*.84);g.lineTo(-R*.055,-R*.84);g.closePath();g.fill();g.stroke();g.restore();}
    g.strokeStyle=INK;g.lineWidth=R*.27;g.beginPath();g.arc(0,0,R*.88,0,6.283);g.stroke();
    g.strokeStyle=metal;g.lineWidth=R*.19;g.beginPath();g.arc(0,0,R*.88,0,6.283);g.stroke();
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=R*.035;g.beginPath();g.arc(0,0,R*.93,-2.6,-1.2);g.stroke();
    for(let i=0;i<12;i++){const a=i/12*6.283;g.fillStyle=i%2?'#FFF3B8':'#8A5216';g.strokeStyle=INK;g.lineWidth=Math.max(1,R*.018);g.beginPath();g.arc(Math.cos(a)*R*.88,Math.sin(a)*R*.88,R*.052,0,6.283);g.fill();g.stroke();}
    g.fillStyle=metal;g.strokeStyle=INK;g.lineWidth=Math.max(2,R*.05);g.beginPath();g.arc(0,0,R*.25,0,6.283);g.fill();g.stroke();
    const gem=g.createRadialGradient(-R*.04,-R*.05,R*.01,0,0,R*.15);gem.addColorStop(0,'#FFFFFF');gem.addColorStop(.45,'#7FE3A8');gem.addColorStop(1,'#1D9A5C');g.fillStyle=gem;g.beginPath();for(let i=0;i<6;i++){const a=i/6*6.283;g.lineTo(Math.cos(a)*R*.14,Math.sin(a)*R*.14);}g.closePath();g.fill();g.stroke();
    g.restore();
  }
  let BOUNCE=()=>[],DIM=()=>{},FLASH=()=>{};
  function hooks(h){if(h.bounce)BOUNCE=h.bounce;if(h.dim)DIM=h.dim;if(h.flash)FLASH=h.flash;}
  function play(name,A,T,c,who){const f=P[name];if(!f||RM)return 160;try{return f(A,T,c,who);}catch(e){return 160;}}
  function hit(t,c){if(RM)return;burst(t.x,t.y,c||'#fff',4,150,'spark',5,240);}
  return {init,add,after,clear,play,hit,hooks,burst,ring,rise,bolt,arc,shot,setLevel,Q,qm,names:()=>Object.keys(P)};
})();

/* WEATHER: its own canvas inside the battle stage, runs at 30 FPS, particle count follows the quality level */
const WX=(()=>{
  let cv=null,g=null,kind=null,raf=0,last=0,ps=[],W=0,H=0,flashEl=null,nextFlash=0,bolt=null,glitch=[],fogImg=null;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const COUNT={rain:70,storm:80,snow:46,sun:16,night:26,forge:26,wind:20,glitch:0,still:12,fog:5,dust:34,petal:22,moon:16,meteor:10,calm:10};
  function fit(){if(!cv)return;const r=cv.getBoundingClientRect();W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));cv.width=W;cv.height=H;}
  function seed(){
    const n=Math.round((COUNT[kind]||0)*[0,.55,1][FX.Q.level]);ps=[];
    for(let i=0;i<n;i++)ps.push({x:rand(0,W),y:rand(0,H),s:rand(.6,1.4),p:rand(0,6.28),r:rand(0,6.28)});
  }
  function makeFog(){const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d'),gr=x.createRadialGradient(100,100,10,100,100,100);gr.addColorStop(0,'rgba(235,240,250,.55)');gr.addColorStop(1,'rgba(235,240,250,0)');x.fillStyle=gr;x.fillRect(0,0,200,200);return c;}
  function start(canvas,flash,w){
    stop();if(RM)return;
    cv=canvas;g=cv.getContext('2d');flashEl=flash;kind=w;fit();seed();nextFlash=performance.now()+rand(1200,3000);
    if(kind==='fog'&&!fogImg)fogImg=makeFog();
    raf=requestAnimationFrame(loop);
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;kind=null;ps=[];bolt=null;}
  function loop(now){
    raf=requestAnimationFrame(loop);
    if(now-last<33)return;
    const dt=Math.min(.1,(now-last)/1000);last=now;
    if(document.hidden||FX.Q.level===0){g.clearRect(0,0,W,H);return;}
    g.clearRect(0,0,W,H);
    DRAW[kind]&&DRAW[kind](dt,now);
    g.globalAlpha=1;
  }
  function wrap(p,m){if(p.x<-m)p.x=W+m;if(p.x>W+m)p.x=-m;if(p.y>H+m){p.y=-m;p.x=rand(0,W);}if(p.y<-m)p.y=H+m;}
  function dots(c,a,r,f){g.globalAlpha=a;g.fillStyle=c;g.beginPath();for(const p of ps){f&&f(p);const q=r*p.s;g.moveTo(p.x+q,p.y);g.arc(p.x,p.y,q,0,6.283);}g.fill();}
  function rainDraw(dt,c,a){g.globalAlpha=a;g.strokeStyle=c;g.lineWidth=1.4;g.beginPath();for(const p of ps){p.x-=130*dt*p.s;p.y+=760*dt*p.s;wrap(p,20);g.moveTo(p.x,p.y);g.lineTo(p.x+3.6*p.s,p.y-20*p.s);}g.stroke();}
  const DRAW={
    rain:dt=>rainDraw(dt,'#BFE6FF',.6),
    storm:(dt,now)=>{rainDraw(dt,'#D8E8FF',.65);
      if(now>nextFlash){nextFlash=now+rand(1800,4800);const x=rand(W*.15,W*.85);const pts=[[x,0]];let y=0,cx=x;while(y<H*.72){y+=rand(26,58);cx+=rand(-34,34);pts.push([cx,y]);}bolt={pts,until:now+150};if(flashEl&&flashEl.animate)flashEl.animate([{opacity:.5},{opacity:0}],{duration:280});}
      if(bolt&&now<bolt.until){g.globalAlpha=.95;g.strokeStyle='#FFF6C9';g.lineWidth=3.4;g.beginPath();bolt.pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.stroke();}},
    snow:dt=>dots('#fff',.85,2.3,p=>{p.p+=dt;p.x+=Math.sin(p.p)*22*dt;p.y+=48*dt*p.s;wrap(p,6);}),
    sun:dt=>dots('#FFF3B8',.6,2.2,p=>{p.p+=dt*.8;p.x+=Math.sin(p.p)*8*dt;p.y-=9*dt*p.s;wrap(p,6);}),
    night:(dt,now)=>{for(const a of [.25,.55,.9]){g.globalAlpha=a;g.fillStyle='#fff';g.beginPath();ps.forEach((p,i)=>{if(Math.floor((now/900+p.p)%3)===[.25,.55,.9].indexOf(a)){const y=p.y*.55;g.moveTo(p.x+1.5,y);g.arc(p.x,y,1.5*p.s,0,6.283);}});g.fill();}},
    forge:dt=>dots('#FFA64D',.85,2,p=>{p.p+=dt*2;p.x+=Math.sin(p.p)*16*dt;p.y-=70*dt*p.s;wrap(p,6);}),
    wind:dt=>{g.globalAlpha=.5;g.strokeStyle='#E8F0FF';g.lineWidth=1.5;g.beginPath();ps.forEach((p,i)=>{p.x+=(420+160*p.s)*dt;p.y+=Math.sin(p.p+=dt*2)*10*dt;wrap(p,50);if(i%4){g.moveTo(p.x,p.y);g.lineTo(p.x-34*p.s,p.y);}});g.stroke();g.globalAlpha=.9;g.fillStyle='#8FD08F';ps.forEach((p,i)=>{if(!(i%4)){g.save();g.translate(p.x,p.y);g.rotate(p.p*2);g.beginPath();g.ellipse(0,0,6,3,0,0,6.283);g.fill();g.restore();}});},
    glitch:(dt,now)=>{if(Math.random()<.2||!glitch.length){glitch=[];const n=Math.floor(rand(0,5));for(let i=0;i<n;i++)glitch.push([rand(0,W-60),rand(0,H),rand(30,W*.4),rand(1,5),Math.random()<.5?'#2FD6E8':'#F06BAE']);}g.globalAlpha=.42;glitch.forEach(b=>{g.fillStyle=b[4];g.fillRect(b[0],b[1],b[2],b[3]);});},
    still:dt=>dots('#E8E4F4',.28,1.8,p=>{p.p+=dt*.4;p.x+=Math.sin(p.p)*3*dt;p.y-=2*dt;wrap(p,4);}),
    fog:dt=>{if(!fogImg)return;for(const p of ps){p.x+=18*dt*p.s;wrap(p,180);const d=240*p.s+120;g.globalAlpha=.62;g.drawImage(fogImg,p.x-d/2,p.y-d/2,d,d*.6);}},
    dust:dt=>dots('#C9A878',.55,1.7,p=>{p.p+=dt;p.x+=(60+Math.sin(p.p)*30)*dt*p.s;p.y+=Math.cos(p.p)*12*dt;wrap(p,5);}),
    petal:dt=>{g.globalAlpha=.9;g.fillStyle='#F7B6D2';ps.forEach(p=>{p.p+=dt*2;p.x+=(26+Math.sin(p.p)*24)*dt;p.y+=46*dt*p.s;wrap(p,8);g.save();g.translate(p.x,p.y);g.rotate(p.p);g.beginPath();g.ellipse(0,0,5*p.s,3*p.s,0,0,6.283);g.fill();g.restore();});},
    moon:(dt,now)=>dots('#FFF3B8',.8,1.9,p=>{p.p+=dt*1.2;p.y-=6*dt;p.x+=Math.sin(p.p)*5*dt;wrap(p,4);}),
    meteor:(dt,now)=>{dots('#fff',.5,1.2,p=>{p.y=p.r*H*.1+(p.y%(H*.5));});g.globalAlpha=.95;g.strokeStyle='#FFF6C9';g.lineWidth=2.2;g.beginPath();ps.slice(0,3).forEach(p=>{p.q=(p.q||rand(0,W));p.h=(p.h===undefined?rand(-80,H*.4):p.h);p.q+=360*dt;p.h+=210*dt;if(p.q>W+80||p.h>H*.8){p.q=rand(-120,W*.6);p.h=rand(-90,20);}g.moveTo(p.q,p.h);g.lineTo(p.q-46,p.h-27);});g.stroke();},
    calm:(dt,now)=>dots('#FFF3B8',.5,2,p=>{p.p+=dt*.9;p.x+=Math.cos(p.p)*12*dt;p.y+=Math.sin(p.p*1.3)*10*dt;wrap(p,5);}),
  };
  return {start,stop,fit,reseed:()=>{if(kind)seed();}};
})();
