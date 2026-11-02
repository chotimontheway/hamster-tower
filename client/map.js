/* MAPS: each floor is painted once onto a canvas from its round hash, 18 kinds x 5 tones with seeded props, never redrawn per frame */
const MAP_TONES=[null,'#FFC9A0','#7078CC','#C8A8F0','#B8F0D8'];
function drawMap(cv,node,scale){
  const W=960,H=540,sc=scale||1;cv.width=Math.round(W*sc);cv.height=Math.round(H*sc);
  const c=cv.getContext('2d',{alpha:false});c.setTransform(sc,0,0,sc,0,0);
  const s=seedOf(node.hash+':mapdetail'),r=()=>rnd(s),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),rc=a=>a[Math.floor(r()*a.length)];
  const R=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const RR=(x,y,w,h,q,col)=>{c.fillStyle=col;c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,q);else c.rect(x,y,w,h);c.fill();};
  const CI=(x,y,q,col)=>{c.fillStyle=col;c.beginPath();c.arc(x,y,q,0,6.283);c.fill();};
  const EL=(x,y,a,b,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,a,b,0,0,6.283);c.fill();};
  const PG=(pts,col)=>{c.fillStyle=col;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();};
  const LN=(x1,y1,x2,y2,col,w)=>{c.strokeStyle=col;c.lineWidth=w||2;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
  const RING=(x,y,q,col,w)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(x,y,q,0,6.283);c.stroke();};
  const VG=(y0,y1,a,b)=>{const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(0,y0,W,y1-y0);};
  const GEAR=(x,y,q,col,hole)=>{c.fillStyle=col;c.beginPath();const n=Math.max(8,Math.round(q/6))*2;for(let i=0;i<n;i++){const a=i/n*6.283,rr=i%2?q:q*.8;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();CI(x,y,q*.3,hole);};
  const floorLines=(y,col,n)=>{for(let i=0;i<=n;i++){const u=i/n;LN(W/2+(u-.5)*W*.9,y,W/2+(u-.5)*W*2.1,H,col,3);}};
  const THEMES=[
    ()=>{/* night bedroom */
      VG(0,370,'#262B5C','#343A78');
      const wx=ri(90,700);R(wx,60,180,190,'#16204A');R(wx+8,68,164,174,'#1D2C66');CI(wx+ri(50,130),ri(100,170),30,'#FFE9A8');for(let i=0;i<8;i++)CI(wx+ri(14,166),ri(74,236),1.6,'#FFF6C9');LN(wx+90,60,wx+90,250,'#16204A',6);LN(wx,155,wx+180,155,'#16204A',6);
      R(wx-22,48,28,214,'#7B3F6A');R(wx+174,48,28,214,'#7B3F6A');
      RING(480,230,190,'#3A4285',20);for(let i=0;i<6;i++){const a=i/6*3.1416;LN(480-Math.cos(a)*186,230-Math.sin(a)*186,480+Math.cos(a)*186,230+Math.sin(a)*186,'#333A78',6);}
      RR(ri(760,830),290,150,80,12,'#5A4A8E');RR(ri(40,70),300,110,70,10,'#3F3A70');
      R(0,370,W,170,'#463A70');R(0,370,W,14,'#5A4C88');floorLines(384,'#3A2F5E',10);
    },
    ()=>{/* hamster cage */
      VG(0,380,'#E9D9B8','#D8C39A');
      for(let i=0;i<26;i++)LN(i*40+8,0,i*40+8,380,'#A89A82',5);LN(0,44,W,44,'#A89A82',8);LN(0,330,W,330,'#A89A82',6);
      const bx=ri(120,760);RR(bx,70,46,150,14,'#BFE9F5');R(bx+18,220,10,40,'#8A96B0');RR(bx-4,60,54,20,6,'#F0506E');
      c.strokeStyle='#F2A94E';c.lineWidth=46;c.beginPath();c.moveTo(ri(0,60),240);c.quadraticCurveTo(300,ri(60,140),ri(560,700),200);c.stroke();
      VG(380,H,'#C99B62','#A87A48');for(let i=0;i<200;i++){const x=ri(0,W),y=ri(382,H),w=ri(8,20);c.save();c.translate(x,y);c.rotate(r()*3);R(-w/2,-1.5,w,3,rc(['#E8C88A','#D9B070','#B88A52']));c.restore();}
    },
    ()=>{/* WHEELY wheel */
      VG(0,H,'#17182E','#23264A');
      const q=rc(['#FFC94D','#2FD6E8','#F06BAE']);RING(480,240,250,'#3C4066',34);RING(480,240,250,q,4);for(let i=0;i<8;i++){const a=i/8*3.1416;LN(480-Math.cos(a)*246,240-Math.sin(a)*246,480+Math.cos(a)*246,240+Math.sin(a)*246,'#2E3154',10);}CI(480,240,44,'#3C4066');CI(480,240,16,q);
      for(let i=0;i<24;i++){const a=i/24*6.283;CI(480+Math.cos(a)*250,240+Math.sin(a)*250,4,r()<.6?q:'#4A4E78');}
      R(0,390,W,150,'#2A2C4C');for(let i=0;i<16;i++)R(i*64,390,4,150,'#1E2038');R(0,390,W,6,q);
      c.fillStyle='rgba(255,255,255,.08)';c.font='800 58px sans-serif';c.textAlign='center';c.fillText('WHEELY9000',480,500);
    },
    ()=>{/* crawl tube */
      const col=rc([['#F2A94E','#E08A34'],['#5B9DFA','#3F7BD8'],['#35B06E','#2A8F58'],['#F06BAE','#C94F8E']]);
      R(0,0,W,H,col[1]);for(let i=0;i<9;i++){const u=i/9,rx=620*(1-u)+60,ry=420*(1-u)+40;EL(480,250,rx,ry,i%2?col[0]:col[1]);}EL(480,250,50,34,'#1A1630');
      for(let i=0;i<12;i++){const a=r()*6.283;CI(480+Math.cos(a)*ri(120,420),250+Math.sin(a)*ri(90,250),ri(3,8),'rgba(255,255,255,.28)');}
      PG([[0,H],[W,H],[W,410],[760,380],[200,380],[0,410]],'rgba(20,14,44,.26)');
    },
    ()=>{/* kitchen */
      R(0,0,W,380,'#CDE3E0');for(let y=0;y<380;y+=44)for(let x=(y/44%2)*30;x<W;x+=60)R(x,y,58,42,'#DDEEEA');
      R(0,150,W,14,'#A9744F');const n=ri(5,9);for(let i=0;i<n;i++){const x=40+i*(880/n),h=ri(40,84),col=rc(['#F2A94E','#F06BAE','#5B9DFA','#35B06E','#FFC94D']);RR(x,150-h,46,h,8,col);R(x+6,150-h-10,34,12,'#7A4A2E');}
      RR(ri(620,760),190,190,190,10,'#E6EAF6');R(ri(630,760),260,170,3,'#B4BED6');RR(ri(60,240),220,180,160,8,'#5D5D74');CI(150,300,40,'#2E2A44');
      VG(380,H,'#8A5A3A','#6B4228');for(let i=0;i<12;i++)LN(i*90,380,i*90-40,H,'#5A3A22',3);R(0,376,W,10,'#A9744F');
    },
    ()=>{/* balcony */
      VG(0,330,'#8FD0F0','#CDEBF7');CI(ri(120,840),ri(50,110),36,'#FFF3B8');
      for(let i=0;i<4;i++){const x=ri(0,900),y=ri(30,130);EL(x,y,70,20,'#fff');EL(x+40,y-10,44,20,'#fff');}
      for(let i=0;i<14;i++){const h=ri(40,150);R(i*72,330-h,66,h,rc(['#A8B8CC','#93A5BC','#B9C7D8']));}
      for(let i=0;i<ri(3,5);i++){const x=ri(30,880),h=ri(50,120);R(x+18,330-h-30,6,h,'#3FA66A');EL(x+21,330-h-40,30,22,rc(['#35B06E','#4CCB7F']));CI(x+21,330-h-44,10,rc(['#F06BAE','#FFC94D','#fff']));PG([[x,330-30],[x+42,330-30],[x+34,330],[x+8,330]],'#C9743F');}
      R(0,330,W,8,'#6B4A2E');for(let i=0;i<40;i++)R(i*25,338,6,50,'#6B4A2E');R(0,386,W,8,'#6B4A2E');
      VG(394,H,'#C9B49A','#A8917A');for(let i=0;i<9;i++)LN(i*120,394,i*120-60,H,'#94806A',3);
    },
    ()=>{/* chestnut forest */
      VG(0,380,'#BFE8C8','#7FCB9A');
      for(let i=0;i<7;i++){const x=ri(20,940),h=ri(180,340),w=ri(14,24);R(x,380-h,w,h,'#3FA66A');for(let k=0;k<3;k++)EL(x+(k%2?46:-30),380-h+50+k*60,40,14,'#35B06E');const fy=380-h;for(let a=0;a<12;a++){const t=a/12*6.283;EL(x+w/2+Math.cos(t)*46,fy+Math.sin(t)*46,20,20,'#FFC94D');}CI(x+w/2,fy,34,'#6B4228');for(let k=0;k<14;k++){const t=r()*6.283,q=r()*28;CI(x+w/2+Math.cos(t)*q,fy+Math.sin(t)*q,2.4,'#3A2410');}}
      for(let i=0;i<5;i++){const x=ri(0,900);LN(x,0,x,ri(60,160),'#7A5232',3);EL(x,ri(70,170),11,16,'#8A5A3A');}
      VG(380,H,'#5FB070','#3F8F58');for(let i=0;i<70;i++){const x=ri(0,W),y=ri(384,H);PG([[x-5,y],[x,y-ri(10,24)],[x+5,y]],rc(['#6FC47F','#3F8F58','#8FD09A']));}
    },
    ()=>{/* server room */
      VG(0,H,'#0F1730','#1A2444');
      const cols=ri(6,8),w=W/cols;for(let i=0;i<cols;i++){const x=i*w+8;R(x,40,w-16,330,'#1E2A4E');R(x,40,w-16,8,'#2E3D6A');for(let y=60;y<360;y+=24){R(x+8,y,w-32,16,'#141D3A');for(let k=0;k<5;k++){if(r()<.75)CI(x+16+k*14,y+8,2.4,rc(['#35D07F','#2FD6E8','#FFC94D','#F0506E']));}}}
      for(let i=0;i<5;i++){c.strokeStyle=rc(['#F0506E','#2FD6E8','#FFC94D']);c.lineWidth=3;c.beginPath();const x=ri(0,800);c.moveTo(x,0);c.bezierCurveTo(x+60,70,x+160,10,x+ri(200,300),ri(20,60));c.stroke();}
      R(0,370,W,170,'#232F56');for(let i=0;i<14;i++)R(i*70,370,3,170,'#17203E');for(let y=400;y<H;y+=46)R(0,y,W,3,'#17203E');
    },
    ()=>{/* sawdust burrow */
      R(0,0,W,H,'#4A3322');for(let i=0;i<5;i++)R(0,i*76,W,70,['#5A3E28','#523724','#5E432C','#4E3522','#583C26'][i]);
      for(let i=0;i<ri(3,5);i++){const x=ri(80,880),y=ri(70,270);EL(x,y,ri(60,96),ri(40,60),'#1E140C');EL(x,y+6,ri(40,70),ri(26,40),'#2A1C10');}
      for(let i=0;i<7;i++){c.strokeStyle='#7A5232';c.lineWidth=ri(4,9);c.beginPath();const x=ri(0,W);c.moveTo(x,0);c.bezierCurveTo(x+ri(-60,60),80,x+ri(-80,80),130,x+ri(-100,100),ri(160,250));c.stroke();}
      for(let i=0;i<ri(5,9);i++){const x=ri(10,950),y=ri(300,370);R(x-3,y,6,16,'#E8D8B8');EL(x,y,14,9,rc(['#7FE3A8','#8FD8FF','#F7B6DA']));CI(x,y,20,'rgba(127,227,168,.1)');}
      VG(380,H,'#6B4A2E','#4A3120');for(let i=0;i<40;i++)EL(ri(0,W),ri(390,H),ri(8,26),ri(5,12),rc(['#7A7068','#5C5048','#8A7E72']));
    },
    ()=>{/* bathtub */
      R(0,0,W,350,'#BDE8E8');for(let y=0;y<350;y+=58)for(let x=0;x<W;x+=58)R(x+1,y+1,56,56,(x+y)%116?'#CFF0EE':'#DFF7F4');
      for(let i=0;i<18;i++){const q=ri(6,24);c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=2.4;c.beginPath();c.arc(ri(0,W),ri(20,330),q,0,6.283);c.stroke();}
      RR(ri(90,720),250,90,70,30,'#FFD95E');CI(ri(120,740),226,0,'#000');
      R(0,350,W,190,'#EEF6FA');R(0,350,W,14,'#fff');VG(364,H,'#7FD8EE','#4FB6DC');for(let i=0;i<30;i++)EL(ri(0,W),ri(370,H),ri(14,50),3,'rgba(255,255,255,.4)');
      const dx=ri(60,840);EL(dx,392,44,24,'#FFD95E');CI(dx+24,368,20,'#FFD95E');PG([[dx+42,366],[dx+60,370],[dx+42,376]],'#F8A838');CI(dx+30,362,3,'#2A1B3D');
    },
    ()=>{/* work desk */
      VG(0,330,'#3A4470','#4E5A8E');
      const mx=ri(200,560);RR(mx,40,360,240,14,'#1B1E34');R(mx+14,54,332,212,'#0F2438');let y=200;for(let i=0;i<26;i++){const ny=y+ri(-26,26);LN(mx+24+i*12,y,mx+36+i*12,ny,'#35D07F',3);y=Math.max(70,Math.min(250,ny));}R(mx+150,280,60,40,'#23264A');
      for(let i=0;i<ri(3,6);i++){const x=ri(20,920),yy=ri(40,250);c.save();c.translate(x,yy);c.rotate((r()-.5)*.3);R(-30,-30,60,60,rc(['#FFE27A','#F7B6DA','#A8EEDC']));c.restore();}
      VG(330,H,'#B88355','#94643C');for(let i=0;i<8;i++)LN(0,350+i*28,W,350+i*28,'#A87548',2);
      for(let i=0;i<14;i++)RR(30+i*66,480,58,44,8,'#E6EAF6');for(let i=0;i<14;i++)R(36+i*66,516,46,6,'#B4BED6');
      const cx=ri(40,840);RR(cx,300,74,70,8,rc(['#F0506E','#5B9DFA','#35B06E']));RING(cx+84,335,16,'#E6EAF6',7);
    },
    ()=>{/* fridge */
      VG(0,H,'#DDF4FF','#AEDFF5');R(0,0,W,24,'#fff');CI(480,0,150,'rgba(255,255,255,.5)');
      for(const y of [130,250,370]){R(0,y,W,10,'#F4FBFF');R(0,y+10,W,5,'#8FC8E4');}
      for(const y of [130,250]){let x=ri(10,60);while(x<880){const w=ri(50,110),h=ri(40,86);RR(x,y-h,w,h,6,rc(['#F7B6DA','#FFE27A','#A8EEDC','#BFD0FF','#FFC9A0','#fff']));R(x+6,y-h+8,w-12,6,'rgba(0,0,0,.08)');x+=w+ri(8,36);}}
      for(let i=0;i<50;i++)CI(ri(0,W),ri(0,H),ri(1,3),'rgba(255,255,255,.8)');
      VG(385,H,'#C6E9F8','#96CFE8');
    },
    ()=>{/* bookshelf */
      R(0,0,W,380,'#5A3A22');for(const y of [110,240,370]){R(0,y,W,14,'#8A5A3A');let x=6;while(x<W){const w=ri(16,38),h=ri(62,100);R(x,y-h,w,h,rc(['#B8324B','#3A5FB8','#3FA66A','#D9A92E','#7B4FC9','#C9743F','#2FB8C8']));R(x+3,y-h+10,w-6,4,'rgba(255,255,255,.4)');x+=w+(r()<.1?ri(10,24):2);}}
      const lx=ri(100,800);LN(lx,10,lx+50,380,'#A9744F',10);LN(lx+70,10,lx+120,380,'#A9744F',10);for(let i=1;i<8;i++)LN(lx+i*6.5,i*46,lx+70+i*6.5,i*46,'#A9744F',8);
      VG(380,H,'#8A3D52','#6A2E40');for(let i=0;i<30;i++)CI(ri(0,W),ri(390,H),ri(2,4),'rgba(255,220,180,.3)');
    },
    ()=>{/* gear workshop */
      VG(0,380,'#3F4560','#555C7E');
      for(let i=0;i<ri(5,8);i++)GEAR(ri(40,920),ri(50,300),ri(40,110),rc(['#6B7298','#7A82A8','#5F6688','#B8863A']),'#3F4560');
      for(let i=0;i<3;i++){const y=ri(30,320);R(0,y,W,16,'#7A5A3A');for(let k=0;k<12;k++)R(k*84,y-3,12,22,'#5A4228');}
      for(let i=0;i<ri(2,4);i++){const x=ri(40,900);for(let k=0;k<5;k++)CI(x+ri(-16,16),340-k*34,12+k*5,'rgba(255,255,255,.14)');}
      R(0,380,W,160,'#3A3E58');for(let i=0;i<10;i++)for(let k=0;k<3;k++){R(i*100+6,390+k*52,88,44,'#454A68');CI(i*100+12,396+k*52,2.4,'#6B7298');CI(i*100+88,396+k*52,2.4,'#6B7298');}
    },
    ()=>{/* rooftop */
      VG(0,360,'#141A40','#3A3070');for(let i=0;i<70;i++)CI(ri(0,W),ri(0,300),r()*1.8+.4,'#fff');CI(ri(100,860),ri(50,120),34,'#FFE9A8');
      let x=0;while(x<W){const w=ri(40,96),h=ri(70,220);R(x,360-h,w,h,rc(['#1E2250','#262A5C','#1A1E48']));for(let yy=360-h+10;yy<350;yy+=20)for(let xx=x+8;xx<x+w-10;xx+=16)if(r()<.4)R(xx,yy,8,10,'#FFC94D');x+=w+ri(0,8);}
      const ax=ri(60,860);LN(ax,360,ax,190,'#8A96B0',5);LN(ax-40,220,ax+40,220,'#8A96B0',4);LN(ax-26,250,ax+26,250,'#8A96B0',4);CI(ax,188,5,'#F0506E');
      VG(360,H,'#7A3F42','#5A2C30');for(let y=372;y<H;y+=30)for(let k=(y%60?0:40);k<W;k+=80)EL(k,y,44,16,'#6A3438');
    },
    ()=>{/* toy beach */
      VG(0,250,'#7FD0F5','#CDEFFA');CI(ri(100,860),70,40,'#FFF3B8');for(let i=0;i<3;i++){const qx=ri(0,860);EL(qx,ri(40,120),70,18,'#fff');}
      VG(250,340,'#2FB8D8','#5FD6E8');for(let i=0;i<9;i++)EL(ri(0,W),ri(258,334),ri(30,70),2.5,'rgba(255,255,255,.7)');
      VG(340,H,'#F5DE93','#E0BE70');for(let i=0;i<90;i++)CI(ri(0,W),ri(345,H),1.6,'#C9A458');
      const ux=ri(90,820);LN(ux,190,ux+10,390,'#8A5A3A',8);for(let i=0;i<6;i++)PG([[ux,180],[ux-120+i*40,250],[ux-80+i*40,250]],i%2?'#F0506E':'#FFF6E5');
      const bx=ri(80,850);PG([[bx,410],[bx+60,410],[bx+50,460],[bx+10,460]],rc(['#5B9DFA','#F06BAE','#FFC94D']));
      for(let i=0;i<ri(2,4);i++){const qx=ri(30,920),qy=ri(420,520);for(let a=0;a<5;a++){const t=a/5*6.283-1.57;PG([[qx,qy],[qx+Math.cos(t)*18,qy+Math.sin(t)*18],[qx+Math.cos(t+.5)*6,qy+Math.sin(t+.5)*6]],'#F0806E');}}
    },
    ()=>{/* pillow castle */
      VG(0,380,'#C8B4F0','#F2D2EE');for(let i=0;i<30;i++)CI(ri(0,W),ri(0,230),r()*1.8+.5,'#fff');CI(ri(120,840),ri(60,130),38,'#FFF3B8');CI(ri(120,840),ri(60,130),30,'rgba(255,255,255,.2)');
      for(let i=0;i<4;i++){const x=ri(0,860),y=ri(50,190);EL(x,y,80,24,'#fff');EL(x+50,y-14,50,24,'#fff');EL(x-40,y-8,40,18,'#fff');}
      for(let i=0;i<7;i++){const x=ri(0,880),w=ri(120,220),h=ri(70,140),y=380-h;RR(x,y,w,h,36,rc(['#F7D7EE','#D8C8FA','#FFE2C8','#CFF0E0']));CI(x+6,y+6,6,'#F06BAE');CI(x+w-6,y+6,6,'#F06BAE');}
      VG(380,H,'#E8B8DC','#C894C4');for(let i=0;i<6;i++){c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=7;c.beginPath();c.moveTo(0,400+i*24);c.bezierCurveTo(300,380+i*24,600,430+i*24,W,396+i*24);c.stroke();}
    },
    ()=>{/* trading floor */
      VG(0,H,'#0E1226','#1A2040');for(let i=0;i<9;i++)LN(0,i*44,W,i*44,'#20284C',2);for(let i=0;i<18;i++)LN(i*56,0,i*56,380,'#20284C',2);
      let y=ri(150,240);const n=30,w=W/n;for(let i=0;i<n;i++){const d=ri(-46,46),o=y,cl=Math.max(50,Math.min(330,y+d)),col=cl<o?'#35D07F':'#F0506E';const top=Math.min(o,cl),h=Math.max(5,Math.abs(cl-o));LN(i*w+w/2,top-ri(4,20),i*w+w/2,top+h+ri(4,20),col,2.4);R(i*w+4,top,w-8,h,col);y=cl;}
      R(0,350,W,30,'#0A0E20');c.font='700 18px monospace';c.textAlign='left';let tx=10;const syms=['SQK','WHEEL','HASH','NAP','ZOOM','SEED'];for(let i=0;i<8;i++){const up=r()<.5;c.fillStyle=up?'#35D07F':'#F0506E';const t=rc(syms)+(up?' +':' ')+(up?'':'-')+ri(1,99)+'%';c.fillText(t,tx,372);tx+=124;}
      VG(380,H,'#1A2040','#232A52');for(let i=0;i<7;i++)EL(ri(0,W),ri(400,H),ri(40,130),5,'rgba(255,255,255,.05)');
    },
  ];
  (THEMES[node.map.t]||THEMES[0])();
  const tone=MAP_TONES[node.map.tone];
  if(tone){c.globalCompositeOperation='multiply';c.fillStyle=tone;c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';}
  const g=c.createLinearGradient(0,380,0,H);g.addColorStop(0,'rgba(15,12,32,0)');g.addColorStop(1,'rgba(15,12,32,.38)');c.fillStyle=g;c.fillRect(0,380,W,H-380);
}
