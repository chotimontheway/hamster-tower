/* MAPS: each floor is painted once onto a canvas from its round hash, 18 kinds x 5 tones with seeded props, never redrawn per frame. Every kind has a far layer, a middle layer, a lit floor to fight on and its own light. */
const MAP_TONES=[null,'#FFD2AE','#8088D8','#CDB2F2','#C2F2DE'];
function drawMap(cv,node,scale){
  const W=960,H=540,sc=scale||1;cv.width=Math.round(W*sc);cv.height=Math.round(H*sc);
  const c=cv.getContext('2d',{alpha:false});c.setTransform(sc,0,0,sc,0,0);
  const s=seedOf(node.hash+':mapdetail'),r=()=>rnd(s),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),rc=a=>a[Math.floor(r()*a.length)];
  const OL='rgba(24,16,48,.72)';
  const R=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const RR=(x,y,w,h,q,col,ol)=>{c.fillStyle=col;c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,q);else c.rect(x,y,w,h);c.fill();if(ol){c.strokeStyle=OL;c.lineWidth=ol;c.stroke();}};
  const CI=(x,y,q,col,ol)=>{c.fillStyle=col;c.beginPath();c.arc(x,y,q,0,6.283);c.fill();if(ol){c.strokeStyle=OL;c.lineWidth=ol;c.stroke();}};
  const EL=(x,y,a,b,col,ol)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,a,b,0,0,6.283);c.fill();if(ol){c.strokeStyle=OL;c.lineWidth=ol;c.stroke();}};
  const PG=(pts,col,ol)=>{c.fillStyle=col;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();if(ol){c.strokeStyle=OL;c.lineWidth=ol;c.lineJoin='round';c.stroke();}};
  const LN=(x1,y1,x2,y2,col,w)=>{c.strokeStyle=col;c.lineWidth=w||2;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
  const RING=(x,y,q,col,w)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(x,y,q,0,6.283);c.stroke();};
  const LG=(x0,y0,x1,y1,stops)=>{const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((q,i)=>g.addColorStop(stops.length>1?i/(stops.length-1):0,q));return g;};
  const VG=(y0,y1,...cols)=>{c.fillStyle=LG(0,y0,0,y1,cols);c.fillRect(0,y0,W,y1-y0);};
  const GLOW=(x,y,q,col,a=1)=>{const g=c.createRadialGradient(x,y,0,x,y,q);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.save();c.globalCompositeOperation='lighter';c.globalAlpha=a;c.fillStyle=g;c.fillRect(x-q,y-q,q*2,q*2);c.restore();};
  const SHAFT=(x,w0,w1,y1,col,a=.2)=>{c.save();c.globalCompositeOperation='lighter';c.globalAlpha=a;c.fillStyle=LG(0,0,0,y1,[col,'rgba(0,0,0,0)']);c.beginPath();c.moveTo(x-w0/2,0);c.lineTo(x+w0/2,0);c.lineTo(x+w1/2,y1);c.lineTo(x-w1/2,y1);c.closePath();c.fill();c.restore();};
  const GEAR=(x,y,q,col,hole,rim)=>{c.fillStyle=col;c.beginPath();const n=Math.max(8,Math.round(q/6))*2;for(let i=0;i<n;i++){const a=i/n*6.283,rr=i%2?q:q*.82;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();c.strokeStyle=OL;c.lineWidth=3;c.stroke();if(rim)RING(x,y,q*.62,rim,q*.1);CI(x,y,q*.3,hole,2.5);};
  const floorLines=(y,col,n,w=2.4)=>{for(let i=0;i<=n;i++){const u=i/n;LN(W/2+(u-.5)*W*.8,y,W/2+(u-.5)*W*2.3,H,col,w);}};
  const planks=(y,col,n)=>{for(let k=1;k<n;k++){const q=k/n,yy=y+(H-y)*q*q;LN(0,yy,W,yy,col,1.6+q*2);}};
  const CLOUD=(x,y,q,col)=>{EL(x,y,q*1.1,q*.34,col);CI(x-q*.5,y-q*.16,q*.34,col);CI(x+q*.1,y-q*.3,q*.44,col);CI(x+q*.62,y-q*.1,q*.3,col);};
  const LEAFBALL=(x,y,q,a,b)=>{for(let i=0;i<9;i++){const u=r()*6.283,d=r()*q*.72;CI(x+Math.cos(u)*d,y+Math.sin(u)*d*.72,q*(.34+r()*.22),i%2?a:b);}};
  const THEMES=[
    ()=>{/* night bedroom */
      VG(0,380,'#1E2150','#2E2F6E','#3A3A7C');
      for(let y=20;y<370;y+=58)for(let x=(y%116?0:40);x<W;x+=80){CI(x,y,3,'rgba(255,255,255,.05)');}
      const wx=ri(150,560);
      GLOW(wx+110,150,330,'rgba(150,170,255,.36)');
      RR(wx-10,44,240,226,6,'#2B1F4E',4);c.fillStyle=LG(0,54,0,260,['#0F1C50','#21367A','#3C4F96']);c.fillRect(wx,54,220,206);
      const mx=wx+ri(60,160),my=ri(100,160);GLOW(mx,my,130,'rgba(255,238,180,.6)');CI(mx,my,32,'#FFF1C2');CI(mx-11,my-9,7,'#EAD9A0');CI(mx+12,my+10,9,'#EAD9A0');
      for(let i=0;i<16;i++)CI(wx+ri(8,212),ri(60,250),r()*1.5+.5,'#FFF6C9');
      LN(wx+110,54,wx+110,260,'#2B1F4E',7);LN(wx,158,wx+220,158,'#2B1F4E',7);
      PG([[wx-34,36],[wx+26,36],[wx+6,280],[wx-46,286]],LG(wx-40,0,wx+20,0,['#8E4A78','#6A3560']),3);PG([[wx+254,36],[wx+194,36],[wx+214,280],[wx+266,286]],LG(wx+200,0,wx+260,0,['#6A3560','#8E4A78']),3);RR(wx-46,28,312,14,6,'#C9A06A',3);
      SHAFT(wx+110,200,420,520,'rgba(170,190,255,.5)',.16);
      const bx=rc([28,690]);RR(bx,262,250,120,16,'#3A2F6E',4);RR(bx+8,236,70,60,16,'#EFE6FF',3);c.fillStyle=LG(0,276,0,380,['#5B4FB0','#3E3488']);c.beginPath();c.moveTo(bx+60,282);c.bezierCurveTo(bx+120,262,bx+190,276,bx+250,282);c.lineTo(bx+250,380);c.lineTo(bx+60,380);c.closePath();c.fill();c.strokeStyle=OL;c.lineWidth=3;c.stroke();
      const lx=bx<400?ri(320,470):ri(520,640);RR(lx,330,76,50,5,'#5A3B6E',3);R(lx+34,296,8,36,'#2A1B3D');GLOW(lx+38,282,110,'rgba(255,190,110,.6)');PG([[lx+16,296],[lx+60,296],[lx+50,262],[lx+26,262]],'#FFD99A',3);
      c.fillStyle=LG(0,380,0,H,['#5A3F66','#3C2A50']);c.fillRect(0,380,W,160);planks(380,'rgba(20,12,40,.5)',7);floorLines(380,'rgba(20,12,40,.3)',12,2);R(0,376,W,8,'#7A5E86');
      EL(480,462,300,58,'rgba(120,70,130,.55)',3);EL(480,462,240,44,'rgba(170,110,170,.35)');
    },
    ()=>{/* hamster cage */
      VG(0,380,'#F4E6C4','#E9D5A8','#D8BF8C');GLOW(760,70,420,'rgba(255,245,190,.6)');
      RR(70,70,220,180,6,'rgba(255,255,255,.28)');RR(640,40,250,120,6,'rgba(255,255,255,.2)');
      const tx=ri(40,120);c.lineCap='round';c.strokeStyle=OL;c.lineWidth=64;c.beginPath();c.moveTo(tx,250);c.bezierCurveTo(260,ri(60,120),520,ri(60,140),ri(690,860),210);c.stroke();c.strokeStyle=LG(0,110,0,250,['#FFC873','#E89A3A']);c.lineWidth=56;c.stroke();c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=7;c.beginPath();c.moveTo(tx+6,232);c.bezierCurveTo(262,ri(50,104),520,ri(50,124),ri(680,850),194);c.stroke();
      const bx=ri(150,700);LN(bx+24,0,bx+24,70,'#8A96B0',6);RR(bx,70,50,160,16,'rgba(190,235,245,.85)',3);RR(bx+6,130,38,94,10,'rgba(90,190,230,.8)');RR(bx-4,62,58,22,7,'#F0506E',3);R(bx+20,230,10,44,'#8A96B0');CI(bx+25,278,6,'#D5DCEC',2.4);
      const wx=rc([620,760]);RING(wx,300,74,OL,14);RING(wx,300,74,'#F06BAE',9);for(let i=0;i<8;i++){const a=i/8*6.283;LN(wx,300,wx+Math.cos(a)*72,300+Math.sin(a)*72,'#B4BED6',4);}CI(wx,300,10,'#D5DCEC',2.5);PG([[wx-8,300],[wx+8,300],[wx+46,390],[wx-46,390]],'rgba(120,130,160,.55)');
      for(let i=0;i<25;i++)LN(i*40+12,0,i*40+12,380,i%2?'rgba(120,108,90,.65)':'rgba(140,128,108,.6)',5);LN(0,40,W,40,'#8F8268',9);LN(0,336,W,336,'#8F8268',7);
      c.fillStyle=LG(0,380,0,H,['#D9AC6E','#B0824C']);c.fillRect(0,380,W,160);for(let i=0;i<340;i++){const x=ri(0,W),y=ri(382,H),w=ri(8,22);c.save();c.translate(x,y);c.rotate(r()*3);R(-w/2,-1.6,w,3.2,rc(['#F2D59A','#E2BE80','#C49658','#A97F48']));c.restore();}
      const fx=rc([120,780]);EL(fx,410,70,18,'#7A5A88',3);EL(fx,404,62,13,'#C9B8E0');for(let i=0;i<16;i++)CI(fx+ri(-46,46),404+ri(-8,6),3,rc(['#3A2E25','#F2D59A','#8FBF5A']));
      EL(480,470,320,60,'rgba(255,235,190,.3)');
    },
    ()=>{/* WHEELY wheel */
      VG(0,H,'#0F0F26','#1A1B3C','#26284E');const q=rc(['#FFC94D','#2FD6E8','#F06BAE']);
      for(let i=0;i<5;i++)SHAFT(120+i*180,20,190,430,q,.1);
      GLOW(480,240,380,q,.26);
      PG([[300,390],[360,240],[396,240],[352,390]],'#3A3E66',3);PG([[660,390],[600,240],[564,240],[608,390]],'#3A3E66',3);
      RING(480,226,236,OL,44);RING(480,226,236,'#3C4066',36);RING(480,226,236,q,5);RING(480,226,180,'#2E3154',10);
      for(let i=0;i<12;i++){const a=i/12*6.283;LN(480+Math.cos(a)*44,226+Math.sin(a)*44,480+Math.cos(a)*232,226+Math.sin(a)*232,'#2E3154',11);LN(480+Math.cos(a)*44,226+Math.sin(a)*44,480+Math.cos(a)*232,226+Math.sin(a)*232,'rgba(255,255,255,.08)',3);}
      for(let i=0;i<36;i++){const a=i/36*6.283;GLOW(480+Math.cos(a)*236,226+Math.sin(a)*236,12,q,.5);CI(480+Math.cos(a)*236,226+Math.sin(a)*236,3.4,r()<.7?'#FFF6DC':'#4A4E78');}
      CI(480,226,48,'#3C4066',3);CI(480,226,18,q,3);
      c.fillStyle=LG(0,390,0,H,['#34365C','#1C1E3C']);c.fillRect(0,390,W,150);for(let i=0;i<14;i++)LN(i*74,390,(i-7)*140+480,H,'rgba(0,0,0,.28)',3);R(0,390,W,6,q);GLOW(480,392,300,q,.3);
      c.fillStyle='rgba(255,255,255,.1)';c.font='800 62px sans-serif';c.textAlign='center';c.fillText('WHEELY9000',480,500);EL(480,480,330,50,'rgba(255,255,255,.05)');
    },
    ()=>{/* crawl tube */
      const col=rc([['#FFC873','#F2A94E','#D6862F'],['#8FBEFF','#5B9DFA','#3A74D0'],['#7FE0A8','#35B06E','#23864E'],['#FF9BCB','#F06BAE','#C2488A']]);
      R(0,0,W,H,col[2]);
      for(let i=0;i<11;i++){const u=i/11,rx=720*(1-u)+60,ry=480*(1-u)+40;EL(480,246,rx,ry,i%2?col[1]:col[2]);EL(480,246-ry*.82,rx*.5,ry*.1,'rgba(255,255,255,.14)');}
      GLOW(480,246,140,'rgba(255,255,255,.65)');EL(480,246,52,36,'#FFF6DC');
      for(let i=0;i<9;i++){const a=r()*6.283,q=ri(160,430);CI(480+Math.cos(a)*q,246+Math.sin(a)*q*.7,ri(4,10),'rgba(255,255,255,.3)');}
      for(let i=0;i<3;i++){const u=.2+i*.22,rx=720*(1-u)+60,ry=480*(1-u)+40;c.save();c.translate(480,246);c.scale(1,ry/rx);c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=5*(1-u)+2;c.beginPath();c.arc(0,0,rx,3.5,5.4);c.stroke();c.restore();}
      c.fillStyle=LG(0,370,0,H,['rgba(20,14,44,.05)','rgba(20,14,44,.45)']);c.beginPath();c.moveTo(0,H);c.lineTo(W,H);c.lineTo(W,420);c.quadraticCurveTo(480,330,0,420);c.closePath();c.fill();
      EL(480,470,320,56,'rgba(255,255,255,.14)');
    },
    ()=>{/* kitchen */
      c.fillStyle=LG(0,0,0,380,['#D6EDE8','#BEDCD6']);c.fillRect(0,0,W,380);
      for(let y=0;y<380;y+=46)for(let x=(y/46%2)*32;x<W;x+=64){RR(x+1,y+1,62,44,3,(x+y)%128?'#E4F4F0':'#D8ECE8');}
      const wx=ri(360,600);RR(wx,26,190,130,6,'#FFF',4);c.fillStyle=LG(0,32,0,150,['#7CC8EE','#CFEFFC']);c.fillRect(wx+7,33,176,116);CLOUD(wx+70,86,34,'#fff');LN(wx+95,33,wx+95,150,'#E6E6E6',5);GLOW(wx+95,90,240,'rgba(255,255,230,.2)');SHAFT(wx+95,170,420,500,'rgba(255,250,220,.6)',.12);
      R(0,168,W,14,'#A9744F');R(0,182,W,5,'rgba(0,0,0,.2)');const n=ri(5,8);for(let i=0;i<n;i++){const x=30+i*(310/n),h=ri(44,88),q=rc(['#F2A94E','#F06BAE','#5B9DFA','#35B06E','#FFC94D']);RR(x,168-h,44,h,9,q,3);R(x+6,168-h-11,32,13,'#7A4A2E');R(x+10,168-h+10,8,h-20,'rgba(255,255,255,.3)');}
      const sx=ri(620,720);RR(sx,196,210,184,10,'#E8ECF6',4);R(sx,262,210,5,'#B4BED6');RR(sx+22,282,166,82,6,'#2E2A44',3);GLOW(sx+105,324,70,'rgba(255,120,60,.55)');for(let i=0;i<4;i++)CI(sx+40+i*44,226,13,'#2E2A44',2);
      RR(sx+60,136,90,62,10,'#F0506E',4);R(sx+50,146,14,10,'#7A1F3D');R(sx+146,146,14,10,'#7A1F3D');for(let i=0;i<5;i++)CI(sx+90+ri(-16,20),120-i*18,10+i*4,'rgba(255,255,255,.2)');
      RR(40,226,230,154,8,'#7E6A58',4);R(40,226,230,12,'#C2AE96');R(150,238,4,142,'rgba(0,0,0,.28)');CI(136,300,5,'#E0C48A');CI(168,300,5,'#E0C48A');
      c.fillStyle=LG(0,380,0,H,['#7E5A3C','#54381F']);c.fillRect(0,380,W,160);const m=9;for(let k=0;k<5;k++){const y0=380+k*32,y1=y0+32;for(let i=-4;i<m+4;i++){if((i+k)%2)continue;const x0=480+(i-m/2)*(100+k*26),x1=480+(i+1-m/2)*(100+k*26),x2=480+(i+1-m/2)*(126+k*26),x3=480+(i-m/2)*(126+k*26);PG([[x0,y0],[x1,y0],[x2,y1],[x3,y1]],'rgba(255,235,200,.14)');}}R(0,376,W,8,'#A9744F');EL(480,466,330,54,'rgba(255,240,200,.14)');
    },
    ()=>{/* balcony */
      VG(0,340,'#74C3EE','#A8DFF6','#E6F6FB');const sx=ri(120,840);GLOW(sx,70,300,'rgba(255,250,200,.9)');CI(sx,70,38,'#FFF7CE');
      for(let i=0;i<5;i++)CLOUD(ri(0,920),ri(40,170),ri(40,86),'rgba(255,255,255,.9)');
      for(let i=0;i<16;i++){const h=ri(60,180),x=i*64-8;R(x,340-h,60,h,rc(['#A9BCD2','#96ABC4','#BCCADA']));for(let y=340-h+10;y<330;y+=18)for(let q=x+8;q<x+52;q+=14)R(q,y,8,10,r()<.5?'rgba(255,255,255,.55)':'rgba(70,90,130,.4)');}
      for(let i=0;i<12;i++){const h=ri(30,80),x=i*84-6;R(x,340-h,78,h,rc(['#8499B4','#7A8FAC']));}
      for(let i=0;i<ri(3,5);i++){const x=ri(30,880),h=ri(46,110);LN(x+21,306,x+21,306-h,'#3FA66A',6);LEAFBALL(x+21,306-h-12,30,'#35B06E','#4CCB7F');CI(x+21,306-h-16,9,rc(['#F06BAE','#FFC94D','#fff']),2);PG([[x,304],[x+42,304],[x+34,342],[x+8,342]],'#C9743F',3);R(x-2,300,46,8,'#E08A52');}
      LN(40,60,920,110,'rgba(90,90,110,.7)',3);for(let i=0;i<5;i++){const x=120+i*160,y=64+i*9;PG([[x,y],[x+70,y+4],[x+64,y+70],[x+8,y+66]],rc(['#F7B6DA','#FFF6E0','#BFD0FF','#FFE27A']),2.5);}
      R(0,334,W,12,'#7A5232');for(let i=0;i<40;i++){RR(i*25,346,7,50,2,'#6B4A2E');}R(0,392,W,10,'#7A5232');
      c.fillStyle=LG(0,402,0,H,['#D5C0A6','#A8917A']);c.fillRect(0,402,W,138);planks(402,'rgba(90,70,50,.4)',6);floorLines(402,'rgba(90,70,50,.3)',10,2);EL(480,470,330,50,'rgba(255,250,220,.3)');
    },
    ()=>{/* chestnut forest */
      VG(0,380,'#FFE4A8','#CDEBB8','#8FD19E');GLOW(ri(300,660),60,430,'rgba(255,240,170,.85)');
      for(let i=0;i<10;i++){const x=ri(0,W);R(x,120,ri(14,26),270,'rgba(120,150,110,.45)');LEAFBALL(x+10,120,70,'rgba(120,180,120,.55)','rgba(150,200,130,.55)');}
      for(let i=0;i<5;i++){SHAFT(ri(60,900),40,150,430,'rgba(255,245,190,.9)',.13);}
      for(let i=0;i<6;i++){const x=i*170+ri(-30,50),w=ri(26,40);c.fillStyle=LG(x,0,x+w,0,['#8A5E3A','#5E3E24']);c.fillRect(x,60,w,330);c.strokeStyle=OL;c.lineWidth=3;c.strokeRect(x,60,w,330);LN(x+w*.4,120,x+w*.4,300,'rgba(30,18,10,.4)',3);LN(x+w*.7,180,x+w*.7,360,'rgba(30,18,10,.3)',3);LEAFBALL(x+w/2,60,110,'#3FA66A','#57C07E');LEAFBALL(x+w/2+40,100,70,'#2F9360','#4CB877');
        for(let k=0;k<3;k++){const bx=x+ri(-70,90),by=ri(40,130);LN(bx,by-20,bx,by,'#5E3E24',2);for(let a=0;a<12;a++){const t=a/12*6.283;LN(bx,by,bx+Math.cos(t)*16,by+Math.sin(t)*16,'#C9A23E',2);}CI(bx,by,9,'#7A4A24',2.4);CI(bx-3,by-3,2.4,'#C9926A');}}
      c.fillStyle=LG(0,380,0,H,['#6FBE7A','#3C8A54']);c.fillRect(0,380,W,160);for(let i=0;i<130;i++){const x=ri(0,W),y=ri(384,H),h=ri(8,20);PG([[x-4,y],[x,y-h],[x+4,y]],rc(['#7FD08C','#4B9C60','#9BE0A4','#3C8A54']));}
      for(let i=0;i<7;i++){const x=ri(0,W),y=ri(394,H-12);EL(x,y,ri(16,34),ri(6,11),'#6E6A62',2.4);EL(x-4,y-2,ri(8,16),ri(3,5),'#8E8A82');}
      for(let i=0;i<5;i++){const x=ri(10,950),y=ri(400,H-10);R(x-3,y-12,6,12,'#F2EAD8');EL(x,y-14,12,8,rc(['#F06BAE','#FFC94D','#fff']),2);}EL(480,472,330,52,'rgba(240,255,190,.28)');
    },
    ()=>{/* server room */
      VG(0,H,'#0A1026','#121C3C','#1A264A');const cols=ri(6,7),w=W/cols;
      GLOW(480,180,430,'rgba(60,150,255,.3)');
      for(let i=0;i<cols;i++){const x=i*w+6;c.fillStyle=LG(x,0,x+w,0,['#25335C','#16203F']);c.fillRect(x,30,w-12,350);c.strokeStyle=OL;c.lineWidth=3;c.strokeRect(x,30,w-12,350);R(x,30,w-12,8,'#3A4C80');for(let y=50;y<370;y+=26){R(x+8,y,w-28,18,'#0F1730');R(x+8,y+16,w-28,2,'rgba(255,255,255,.08)');for(let k=0;k<6;k++){if(r()<.78){const col=rc(['#35D07F','#2FD6E8','#FFC94D','#F0506E']);CI(x+18+k*14,y+9,2.4,col);GLOW(x+18+k*14,y+9,7,col,.5);}}}}
      for(let i=0;i<6;i++){c.strokeStyle=rc(['#F0506E','#2FD6E8','#FFC94D','#35D07F']);c.lineWidth=4;c.lineCap='round';c.beginPath();const x=ri(0,800);c.moveTo(x,0);c.bezierCurveTo(x+60,70,x+160,10,x+ri(200,300),ri(20,70));c.stroke();}
      c.fillStyle=LG(0,380,0,H,['#27335E','#141C3A']);c.fillRect(0,380,W,160);floorLines(380,'rgba(90,130,220,.28)',14,2);planks(380,'rgba(90,130,220,.22)',7);for(let i=0;i<cols;i++)R(i*w+10,384,w-20,42,'rgba(80,140,255,.07)');GLOW(480,470,340,'rgba(70,160,255,.22)');
    },
    ()=>{/* sawdust burrow */
      R(0,0,W,H,'#2E1E12');for(let i=0;i<6;i++){c.fillStyle=['#46301E','#3E2A1A','#4A3420','#3A2717','#46301E','#3E2A1A'][i];c.beginPath();c.moveTo(0,i*72);for(let x=0;x<=W;x+=60)c.lineTo(x,i*72+Math.sin(x*.012+i)*14+r()*6);c.lineTo(W,i*72+90);c.lineTo(0,i*72+90);c.closePath();c.fill();}
      const hx=ri(200,760);SHAFT(hx,110,300,500,'rgba(255,235,170,.8)',.3);GLOW(hx,0,240,'rgba(255,240,190,.8)');EL(hx,0,90,34,'#FFF3C4');
      for(let i=0;i<ri(3,4);i++){const x=ri(60,890),y=ri(90,290),a=ri(70,110),b=ri(50,70);EL(x,y,a+8,b+8,'#5A3F28');EL(x,y,a,b,'#160D07');GLOW(x,y+20,a,'rgba(255,170,90,.12)');}
      for(let i=0;i<10;i++){c.strokeStyle=rc(['#6E4A2C','#7E5A36','#5E3E24']);c.lineWidth=ri(4,10);c.lineCap='round';c.beginPath();const x=ri(0,W);c.moveTo(x,0);c.bezierCurveTo(x+ri(-60,60),80,x+ri(-80,80),130,x+ri(-100,100),ri(150,260));c.stroke();}
      for(let i=0;i<ri(8,13);i++){const x=ri(10,950),y=ri(310,376),col=rc(['#7FE3A8','#8FD8FF','#F7B6DA']),q=ri(9,17);GLOW(x,y-4,q*3.4,col,.55);R(x-3,y,6,q*1.2,'#E8D8B8');EL(x,y,q,q*.62,col,2.4);CI(x-q*.3,y-2,1.8,'#fff');}
      c.fillStyle=LG(0,380,0,H,['#7E5A38','#4A3120']);c.fillRect(0,380,W,160);for(let i=0;i<200;i++){const x=ri(0,W),y=ri(384,H),w=ri(6,16);c.save();c.translate(x,y);c.rotate(r()*3);R(-w/2,-1,w,2,rc(['#B08A5A','#8E6A44','#6E4A2C']));c.restore();}for(let i=0;i<22;i++){const x=ri(0,W),y=ri(392,H-6);EL(x,y,ri(8,24),ri(4,10),rc(['#7A7068','#5C5048','#8A7E72']),2);}EL(480,472,320,52,'rgba(255,220,150,.16)');
    },
    ()=>{/* bathtub */
      c.fillStyle=LG(0,0,0,350,['#BDEBEA','#A8DEE0']);c.fillRect(0,0,W,350);for(let y=0;y<350;y+=58)for(let x=0;x<W;x+=58){RR(x+2,y+2,54,54,4,(x+y)%116?'#CFF2EF':'#E0F8F5');R(x+6,y+6,44,3,'rgba(255,255,255,.5)');}
      GLOW(ri(180,780),40,380,'rgba(255,255,240,.6)');
      const fx=ri(60,190);RR(fx,70,44,120,8,'#D5DCEC',3);RR(fx-10,180,90,24,8,'#C4CEE4',3);RR(fx+66,186,16,34,4,'#B4BED6',3);CI(fx+22,60,18,'#F0506E',3);R(fx+4,56,36,8,'#F0506E');for(let i=0;i<5;i++){EL(fx+76,236+i*22,4,8,'#8FE4F5');}
      R(0,300,W,70,'#F4F9FC');R(0,300,W,12,'#FFF');R(0,354,W,16,'#D0E2EA');
      for(let i=0;i<30;i++){const q=ri(6,28),x=ri(0,W),y=ri(20,320);c.save();c.globalAlpha=.8;c.strokeStyle='#fff';c.lineWidth=2.6;c.beginPath();c.arc(x,y,q,0,6.283);c.stroke();c.fillStyle='rgba(255,255,255,.12)';c.fill();c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.arc(x-q*.35,y-q*.35,q*.2,0,6.283);c.fill();c.restore();}
      c.fillStyle=LG(0,368,0,H,['#7FDCEF','#3FA8D4']);c.fillRect(0,368,W,172);for(let i=0;i<40;i++){EL(ri(0,W),ri(376,H),ri(16,64),3,'rgba(255,255,255,.34)');}for(let i=0;i<7;i++){const x=ri(0,W);c.save();c.globalAlpha=.8;for(let k=0;k<5;k++)CI(x+ri(-40,40),ri(374,396),ri(10,22),'rgba(255,255,255,.75)');c.restore();}
      const dx=ri(60,860);EL(dx,404,48,26,'#FFD95E',3);CI(dx+26,376,22,'#FFD95E',3);PG([[dx+46,372],[dx+66,377],[dx+46,384]],'#F8A838',2.5);CI(dx+32,370,3.4,'#2A1B3D');CI(dx+33,369,1,'#fff');EL(dx-12,398,18,10,'#F8C93A');EL(480,472,330,50,'rgba(255,255,255,.14)');
    },
    ()=>{/* work desk */
      VG(0,330,'#2E3662','#3E4878','#525E92');GLOW(ri(40,180),60,380,'rgba(255,205,130,.42)');
      RR(10,60,150,250,6,'#5A3A22',3);for(const y of [110,190,270]){R(10,y,150,8,'#8A5A3A');let x=18;while(x<148){const w=ri(10,20),h=ri(34,62);R(x,y-h,w,h,rc(['#B8324B','#3A5FB8','#3FA66A','#D9A92E','#7B4FC9']));x+=w+2;}}
      const mx=ri(240,500);RR(mx-8,24,404,262,16,'#10121F',4);RR(mx,34,388,232,8,'#0E2236');GLOW(mx+194,150,270,'rgba(60,210,160,.2)');for(let i=0;i<9;i++)LN(mx+8,54+i*24,mx+380,54+i*24,'rgba(120,200,190,.12)',1.5);let y=200;for(let i=0;i<30;i++){const ny=y+ri(-24,24),col=ny<y?'#35D07F':'#F0506E';R(mx+14+i*12,Math.min(y,ny),8,Math.max(4,Math.abs(ny-y)),col);LN(mx+18+i*12,Math.min(y,ny)-ri(3,14),mx+18+i*12,Math.max(y,ny)+ri(3,14),col,1.6);y=Math.max(60,Math.min(250,ny));}
      R(mx+160,286,70,34,'#23264A');RR(mx+120,316,150,14,6,'#1B1E34',3);
      for(let i=0;i<ri(4,7);i++){const x=ri(180,920),yy=ri(30,270);if(x>mx-30&&x<mx+410)continue;c.save();c.translate(x,yy);c.rotate((r()-.5)*.3);PG([[-30,-30],[30,-30],[30,30],[-30,30]],rc(['#FFE27A','#F7B6DA','#A8EEDC']),2.5);LN(-20,-12,20,-12,'rgba(0,0,0,.25)',2);LN(-20,0,14,0,'rgba(0,0,0,.25)',2);c.restore();}
      c.fillStyle=LG(0,330,0,H,['#C48F5E','#8A5C36']);c.fillRect(0,330,W,210);for(let i=0;i<9;i++){c.strokeStyle='rgba(90,55,25,.35)';c.lineWidth=2;c.beginPath();c.moveTo(0,346+i*22);c.bezierCurveTo(300,340+i*22,620,354+i*22,W,344+i*22);c.stroke();}
      const cx=ri(40,120);RR(cx,300,78,74,10,rc(['#F0506E','#5B9DFA','#35B06E']),3);RING(cx+88,336,17,OL,10);RING(cx+88,336,17,'#E6EAF6',6);EL(cx+39,304,34,8,'#3A2416',2);
      for(let i=0;i<14;i++){RR(50+i*62,492,54,40,7,'#E6EAF6',2.5);R(56+i*62,524,42,4,'#B4BED6');}EL(480,430,320,40,'rgba(255,220,160,.18)');
    },
    ()=>{/* fridge */
      VG(0,H,'#E6F8FF','#C6ECFA','#A4DCF2');GLOW(480,0,460,'rgba(255,255,255,.95)');R(0,0,W,20,'#fff');R(120,0,720,12,'#FFF8D0');
      for(const y of [140,262,384]){R(0,y,W,11,'#F7FCFF');R(0,y+11,W,6,'rgba(120,190,225,.8)');}
      for(const y of [140,262]){let x=ri(10,60);while(x<880){const w=ri(52,112),h=ri(48,94),kind=ri(0,3),col=rc(['#F7B6DA','#FFE27A','#A8EEDC','#BFD0FF','#FFC9A0','#FFFFFF']);if(kind===0){RR(x,y-h,w,h,8,col,3);R(x+6,y-h+10,w-12,8,'rgba(0,0,0,.08)');R(x+6,y-h+6,6,h-12,'rgba(255,255,255,.55)');}else if(kind===1){RR(x+w*.3,y-h,w*.4,h*.28,4,'#fff',3);RR(x+6,y-h*.74,w-12,h*.74,10,col,3);R(x+12,y-h*.6,6,h*.5,'rgba(255,255,255,.6)');}else if(kind===2){EL(x+w/2,y-h*.4,w*.48,h*.4,col,3);EL(x+w*.35,y-h*.5,w*.1,h*.08,'rgba(255,255,255,.7)');LN(x+w/2,y-h*.8,x+w/2+6,y-h*.95,'#4CAF50',4);}else{RR(x,y-h*.6,w,h*.6,6,'#fff',3);R(x,y-h*.6,w,12,col);}x+=w+ri(8,34);}}
      for(let i=0;i<70;i++)CI(ri(0,W),ri(0,H),ri(1,3),'rgba(255,255,255,.9)');for(let i=0;i<10;i++){const x=ri(0,W);LN(x,ri(0,60),x,ri(60,150),'rgba(255,255,255,.55)',2);}
      c.fillStyle=LG(0,395,0,H,['#D8F2FB','#A4D8EE']);c.fillRect(0,395,W,145);floorLines(395,'rgba(120,190,225,.4)',10,2);EL(480,472,330,50,'rgba(255,255,255,.4)');
    },
    ()=>{/* bookshelf */
      c.fillStyle=LG(0,0,0,380,['#3E2616','#5E3C22']);c.fillRect(0,0,W,380);GLOW(ri(200,760),130,420,'rgba(255,190,110,.42)');
      for(const y of [110,240,370]){R(0,y,W,16,'#8A5A3A');R(0,y+16,W,5,'rgba(0,0,0,.35)');let x=6;while(x<W){if(r()<.08){const q=ri(30,60);c.save();c.translate(x+q/2,y);c.rotate(.28);RR(-11,-92,22,92,3,rc(['#B8324B','#3A5FB8','#3FA66A']),2.5);c.restore();x+=q;continue;}const w=ri(18,42),h=ri(66,104),col=rc(['#B8324B','#3A5FB8','#3FA66A','#D9A92E','#7B4FC9','#C9743F','#2FB8C8']);c.fillStyle=LG(x,0,x+w,0,[col,'rgba(0,0,0,.4)']);RR(x,y-h,w,h,2,col,2.2);R(x,y-h,w,h,'rgba(0,0,0,0)');R(x+w*.7,y-h,w*.3,h,'rgba(0,0,0,.2)');R(x+3,y-h+12,w-6,4,'rgba(255,240,190,.55)');R(x+3,y-h+22,w-6,2,'rgba(255,240,190,.4)');x+=w+2;}}
      const lx=ri(90,780);LN(lx,6,lx+56,384,'#A9744F',11);LN(lx+78,6,lx+134,384,'#A9744F',11);for(let i=1;i<8;i++)LN(lx+i*7,i*48,lx+78+i*7,i*48,'#C48F5E',8);
      c.fillStyle=LG(0,380,0,H,['#7E3448','#4E1E30']);c.fillRect(0,380,W,160);EL(480,464,350,62,'#A84A5E',3);EL(480,464,300,50,'#C2C0A8');EL(480,464,270,44,'#8E3A50');for(let i=0;i<40;i++)CI(ri(0,W),ri(0,370),ri(1,2),'rgba(255,225,170,.5)');
      for(let i=0;i<3;i++){const x=ri(30,870);RR(x,396+i*30,ri(70,110),18,3,rc(['#B8324B','#3A5FB8','#D9A92E']),2.5);}
    },
    ()=>{/* gear workshop */
      VG(0,380,'#2E3350','#40466A','#565C80');GLOW(ri(120,840),320,330,'rgba(255,130,50,.55)');
      for(let i=0;i<ri(6,9);i++){GEAR(ri(40,920),ri(40,300),ri(46,120),rc(['#5F6688','#6E7598','#555C7E','#B8863A']),'#2E3350','rgba(255,255,255,.1)');}
      for(let i=0;i<3;i++){const y=ri(20,300);c.fillStyle=LG(0,y,0,y+18,['#A07A50','#5E4428']);c.fillRect(0,y,W,18);for(let k=0;k<13;k++){RR(k*78,y-4,14,26,3,'#4A3620',2);CI(k*78+7,y+9,2,'#D0B890');}}
      const fx=ri(620,760);RR(fx,186,220,194,10,'#3A3E58',4);RR(fx+30,246,160,110,8,'#14101F',3);c.fillStyle=LG(0,256,0,350,['#FFD65E','#F06B2A']);c.fillRect(fx+38,254,144,94);GLOW(fx+110,300,170,'rgba(255,150,60,.8)');for(let i=0;i<5;i++)LN(fx+48+i*30,246,fx+48+i*30,356,'#14101F',7);R(fx+60,120,70,70,'#3A3E58');for(let k=0;k<5;k++)CI(fx+95+ri(-16,16),110-k*22,12+k*6,'rgba(255,255,255,.15)');
      for(let i=0;i<ri(2,3);i++){const x=ri(40,520);R(x,0,26,300,'#6E7598');R(x+4,0,6,300,'rgba(255,255,255,.2)');for(let k=0;k<4;k++)RR(x-5,40+k*70,36,12,3,'#8E96B8',2);}
      c.fillStyle=LG(0,380,0,H,['#454A68','#23263E']);c.fillRect(0,380,W,160);for(let i=0;i<10;i++)for(let k=0;k<3;k++){const px=i*100+6,py=392+k*50;RR(px,py,88,42,3,'rgba(120,128,165,.3)',1.6);CI(px+6,py+6,2.4,'#8E96B8');CI(px+82,py+6,2.4,'#8E96B8');CI(px+6,py+36,2.4,'#8E96B8');CI(px+82,py+36,2.4,'#8E96B8');}GLOW(fx+110,410,230,'rgba(255,130,50,.34)');EL(480,470,320,50,'rgba(255,220,180,.09)');
    },
    ()=>{/* rooftop */
      VG(0,360,'#0C1038','#1E1E5C','#4A2E7E','#8A4A84');for(let i=0;i<110;i++)CI(ri(0,W),ri(0,290),r()*1.6+.4,'rgba(255,255,255,.9)');const mx=ri(100,860),my=ri(50,120);GLOW(mx,my,240,'rgba(255,235,170,.55)');CI(mx,my,38,'#FFF0BE');CI(mx-12,my-8,8,'#E2CF96');CI(mx+13,my+11,10,'#E2CF96');
      for(let i=0;i<4;i++)CLOUD(ri(0,900),ri(60,210),ri(50,100),'rgba(120,110,200,.26)');
      let x=-10;while(x<W){const w=ri(46,104),h=ri(90,240);c.fillStyle=LG(0,360-h,0,360,['#1A1E54','#2E2A6C']);c.fillRect(x,360-h,w,h);R(x,360-h,w,3,'rgba(255,255,255,.1)');for(let yy=360-h+10;yy<350;yy+=20)for(let xx=x+8;xx<x+w-10;xx+=16)if(r()<.42){R(xx,yy,8,11,rc(['#FFC94D','#FFE28A','#8FD8FF']));}x+=w+ri(0,10);}
      GLOW(480,360,520,'rgba(255,160,120,.2)');
      const ax=ri(60,860);LN(ax,372,ax,176,'#8A96B0',6);LN(ax-44,212,ax+44,212,'#8A96B0',4);LN(ax-30,244,ax+30,244,'#8A96B0',4);CI(ax,172,6,'#F0506E');GLOW(ax,172,28,'#F0506E',.9);
      const tx=ax<480?ri(620,780):ri(90,260);RR(tx,250,96,110,8,'#7A5A3E',3);for(let i=0;i<4;i++)LN(tx,270+i*24,tx+96,270+i*24,'#3E2C1E',3);PG([[tx-8,252],[tx+48,214],[tx+104,252]],'#5E4430',3);LN(tx+12,362,tx+12,390,'#3E2C1E',7);LN(tx+84,362,tx+84,390,'#3E2C1E',7);
      c.fillStyle=LG(0,372,0,H,['#8A4A4C','#4E2830']);c.fillRect(0,372,W,168);for(let y=384;y<H;y+=28){for(let k=(y%56?-40:0);k<W+80;k+=80){c.fillStyle='rgba(60,25,30,.5)';c.beginPath();c.arc(k+40,y,42,0,3.1416);c.fill();c.fillStyle='rgba(180,100,90,.26)';c.beginPath();c.arc(k+40,y-3,38,3.1416,6.283);c.fill();}}R(0,368,W,8,'#C2806E');EL(480,472,330,48,'rgba(255,200,170,.16)');
    },
    ()=>{/* toy beach */
      VG(0,250,'#5FC2F2','#A2E0F8','#E6F8FC');const sx=ri(100,860);GLOW(sx,70,300,'rgba(255,250,190,.95)');CI(sx,70,42,'#FFF6C0');for(let i=0;i<4;i++)CLOUD(ri(0,860),ri(30,130),ri(44,90),'#FFFFFF');
      c.fillStyle=LG(0,240,0,340,['#1FA6D2','#49CBE2','#7FE2E8']);c.fillRect(0,240,W,100);for(let i=0;i<16;i++)EL(ri(0,W),ri(248,334),ri(30,84),2.6,'rgba(255,255,255,.72)');
      const bx=ri(120,760);PG([[bx,240],[bx+42,196],[bx+92,240]],'#FFF',3);PG([[bx+42,196],[bx+42,240],[bx+86,240]],'#F0506E',3);LN(bx+42,240,bx+42,190,'#8A5A3A',3);EL(bx+42,246,62,8,'#C2804E',2.5);
      R(0,332,W,16,'rgba(255,255,255,.65)');c.fillStyle=LG(0,340,0,H,['#FBE9A8','#E9CB7E','#D2AC60']);c.fillRect(0,340,W,200);for(let i=0;i<200;i++)CI(ri(0,W),ri(346,H),r()*1.6+.6,rc(['#C9A458','#F7E2A0','#B08C44']));for(let i=0;i<4;i++){c.strokeStyle='rgba(200,160,90,.5)';c.lineWidth=3;c.beginPath();const y=ri(370,500);c.moveTo(0,y);c.bezierCurveTo(300,y-14,620,y+16,W,y-4);c.stroke();}
      const ux=ri(80,320);LN(ux,186,ux+14,402,'#8A5A3A',9);const cols=['#F0506E','#FFF6E5'];for(let i=0;i<6;i++)PG([[ux,160],[ux-140+i*46,244],[ux-94+i*46,244]],cols[i%2],2.6);PG([[ux-140,244],[ux+136,244],[ux+128,252],[ux-132,252]],'rgba(0,0,0,.14)');EL(ux+14,406,70,12,'rgba(120,80,30,.3)');
      const px=ri(640,840);PG([[px,430],[px+70,430],[px+58,490],[px+12,490]],rc(['#5B9DFA','#F06BAE','#FFC94D']),3);c.strokeStyle=OL;c.lineWidth=5;c.beginPath();c.arc(px+35,430,30,3.14,6.28);c.stroke();EL(px+35,430,35,8,'rgba(255,255,255,.4)',2);
      for(let i=0;i<ri(3,5);i++){const qx=ri(30,920),qy=ri(420,520);c.fillStyle='#F0806E';c.strokeStyle=OL;c.lineWidth=2;c.beginPath();for(let a=0;a<10;a++){const t=a/10*6.283-1.57,q=a%2?7:19;c.lineTo(qx+Math.cos(t)*q,qy+Math.sin(t)*q);}c.closePath();c.fill();c.stroke();}
      EL(480,470,320,50,'rgba(255,250,210,.3)');
    },
    ()=>{/* pillow castle */
      VG(0,380,'#A898EC','#D2BCF4','#FBDCEE');for(let i=0;i<40;i++)CI(ri(0,W),ri(0,240),r()*1.8+.5,'#fff');const mx=ri(120,840),my=ri(60,130);GLOW(mx,my,240,'rgba(255,250,210,.9)');CI(mx,my,40,'#FFF7CC');
      for(let i=0;i<6;i++)CLOUD(ri(0,880),ri(40,210),ri(50,100),'rgba(255,255,255,.92)');
      const cx=ri(300,660);const castle=(x,w,h,col)=>{RR(x,380-h,w,h,24,col,3);RR(x+w*.12,380-h-22,w*.76,38,16,col,3);CI(x+6,380-h+8,6,'#F06BAE',2);CI(x+w-6,380-h+8,6,'#F06BAE',2);R(x+w*.14,380-h+24,6,h*.6,'rgba(255,255,255,.4)');};
      castle(cx-170,110,170,'#F7D7EE');castle(cx+60,110,170,'#F7D7EE');castle(cx-90,180,234,'#E2D2FA');PG([[cx-60,146],[cx,70],[cx+60,146]],'#F06BAE',3);LN(cx,70,cx,36,'#6B4A8E',4);PG([[cx,36],[cx+40,48],[cx,60]],'#FFC94D',3);RR(cx-26,300,52,80,26,'#8E6AC8',3);CI(cx-52,250,12,'#FFF6C0',2.5);CI(cx+52,250,12,'#FFF6C0',2.5);
      for(let i=0;i<8;i++){const x=ri(0,880),w=ri(120,220),h=ri(60,120),y=384-h;if(x>cx-200&&x<cx+120)continue;RR(x,y,w,h,34,rc(['#F7D7EE','#D8C8FA','#FFE2C8','#CFF0E0']),3);CI(x+6,y+6,6,'#F06BAE',2);CI(x+w-6,y+6,6,'#F06BAE',2);R(x+16,y+14,w-32,6,'rgba(255,255,255,.5)');}
      c.fillStyle=LG(0,380,0,H,['#EFC0E2','#C894C4']);c.fillRect(0,380,W,160);for(let i=0;i<7;i++){c.strokeStyle='rgba(255,255,255,.34)';c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(0,398+i*24);c.bezierCurveTo(300,380+i*24,600,428+i*24,W,396+i*24);c.stroke();}for(let i=0;i<26;i++)CI(ri(0,W),ri(390,H),ri(2,4),'rgba(255,255,255,.55)');EL(480,472,330,50,'rgba(255,240,250,.3)');
    },
    ()=>{/* trading floor */
      VG(0,H,'#090C1E','#111634','#1A2146');GLOW(480,190,500,'rgba(60,120,255,.2)');
      RR(70,26,820,300,10,'#0A0E20',4);for(let i=0;i<9;i++)LN(82,50+i*32,878,50+i*32,'rgba(120,140,220,.14)',1.6);for(let i=0;i<18;i++)LN(90+i*46,36,90+i*46,316,'rgba(120,140,220,.1)',1.6);
      let y=ri(150,240);const n=36,w=790/n;for(let i=0;i<n;i++){const d=ri(-40,40),o=y,cl=Math.max(50,Math.min(300,y+d)),col=cl<o?'#35D07F':'#F0506E';const top=Math.min(o,cl),h=Math.max(5,Math.abs(cl-o));LN(86+i*w+w/2,top-ri(4,20),86+i*w+w/2,top+h+ri(4,20),col,2.2);R(86+i*w+3,top,w-6,h,col);y=cl;}
      GLOW(480,170,320,'rgba(70,220,150,.1)');R(0,330,W,34,'#050814');R(0,330,W,3,'#2E3A78');c.font='700 18px monospace';c.textAlign='left';let tx=10;const syms=['SQK','WHEEL','HASH','NAP','ZOOM','SEED'];for(let i=0;i<8;i++){const up=r()<.5;c.fillStyle=up?'#35D07F':'#F0506E';c.fillText(rc(syms)+(up?' +':' -')+ri(1,99)+'%',tx,354);tx+=124;}
      for(let i=0;i<6;i++){const x=20+i*160;RR(x,366,130,26,4,'#232A52',3);RR(x+24,330,82,38,4,'#0E2236',2.5);R(x+30,336,70,26,rc(['rgba(53,208,127,.4)','rgba(240,80,110,.4)','rgba(47,214,232,.4)']));}
      c.fillStyle=LG(0,392,0,H,['#1F2750','#0C1028']);c.fillRect(0,392,W,148);floorLines(392,'rgba(110,130,230,.24)',14,2);planks(392,'rgba(110,130,230,.18)',6);GLOW(480,470,340,'rgba(90,120,255,.2)');for(let i=0;i<10;i++)EL(ri(0,W),ri(404,H),ri(40,130),4,'rgba(255,255,255,.04)');
    },
  ];
  (THEMES[node.map.t]||THEMES[0])();
  const tone=MAP_TONES[node.map.tone];
  if(tone){c.globalCompositeOperation='multiply';c.fillStyle=tone;c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';}
  /* one finish for every map: dark corners and a darker bottom, so the fighters stand out */
  const v=c.createRadialGradient(W/2,H*.52,H*.42,W/2,H*.52,H*1.05);v.addColorStop(0,'rgba(10,8,28,0)');v.addColorStop(1,'rgba(10,8,28,.5)');c.fillStyle=v;c.fillRect(0,0,W,H);
  const g=c.createLinearGradient(0,400,0,H);g.addColorStop(0,'rgba(15,12,32,0)');g.addColorStop(1,'rgba(15,12,32,.34)');c.fillStyle=g;c.fillRect(0,400,W,H-400);
}
