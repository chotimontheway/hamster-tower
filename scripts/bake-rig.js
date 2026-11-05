/* Runs inside the baking page. Turns a pet, boss, piece of gear, bag or chest into one svg string, so lists show the same drawings as the battle. */
(function(){
const wrap=(inner,vb)=>{const[,,w,h]=vb.split(' ').map(Number);return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w*2}" height="${h*2}"><defs>${RA.inlineDefs()}</defs>${inner}</svg>`;};
const hold=document.createElement('div');hold.style.cssText='position:absolute;left:0;top:0;width:512px;height:512px;visibility:hidden';document.body.appendChild(hold);
function actorSvg(kind,key,o){
  const box=document.createElement('div');box.style.cssText='position:absolute;inset:0';hold.appendChild(box);
  const a=new MOT.Actor(kind,key,Object.assign({still:true},o||{}));box.appendChild(a.el);
  if(o&&o.face)a.face(o.face);
  a.update(18000);
  const vb=kind!=='boss'?roomFor(a):a.vb.join(' '),inner=a.el.innerHTML;box.remove();
  return wrap(inner,vb);
}
/* a long weapon or a big wheel reaches past the usual frame, which a live pet can do but a picture cannot. The feet stay on the bottom edge */
function roomFor(a){
  const[x,y,w,h]=a.vb,au=a.P.aura;if(au)au.setAttribute('display','none');
  const b=a.el.getBBox();if(au)au.removeAttribute('display');
  const pad=6,x0=Math.min(x,b.x-pad),x1=Math.max(x+w,b.x+b.width+pad),y0=Math.min(y,b.y-pad),y1=Math.max(y+h,b.y+b.height+pad),side=Math.max(x1-x0,y1-y0);
  return `${(x0+x1)/2-side/2} ${y1-side} ${side} ${side}`;
}
function fitted(inner,pad){
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('width','400');s.setAttribute('height','400');s.innerHTML=`<defs>${RA.inlineDefs()}</defs><g>${inner}</g>`;hold.appendChild(s);
  const b=s.querySelector('g').getBBox(),m=Math.max(b.width,b.height),q=m*(pad||.08)+4,side=m+q*2;s.remove();
  return wrap(inner,`${b.x+b.width/2-side/2} ${b.y+b.height/2-side/2} ${side} ${side}`);
}
const CHEST={chest_1:['#7A4E2E','#6E6E86','#C9743F',0,1],chest_2:['#C9743F','#E8C07A','#F2C14E',0,1],chest_3:['#7C88A8','#E0E6F4','#5B9DFA',0,0],chest_4:['#D9A92E','#FFF2B0','#F0506E',1,0],chest_5:['#3A8FD8','#D9F8FF','#F06BAE',1,0]};
/* the game's icon: Squeektoshi close up in his wheel, with the tower behind him, so it still reads at the size of a browser tab */
function logoSvg(led){
  const box=document.createElement('div');box.style.cssText='position:absolute;inset:0';hold.appendChild(box);
  const a=new MOT.Actor('ham','squeektoshi',{still:true});box.appendChild(a.el);
  a.P.back.innerHTML='';a.P.aura.innerHTML='';if(a.P.over)a.P.over.remove();
  a.update(18000);
  const ham=a.el.innerHTML;box.remove();
  const R=108,I=RA.INK,big=`<g transform="translate(-4,150) scale(1.44)">${ham}<ellipse cx="-10" cy="-104" rx="15" ry="17" fill="#0A0614"/><ellipse cx="37" cy="-104" rx="15" ry="17" fill="#0A0614"/><path d="M-10,-116Q-9,-105 2,-104Q-9,-103 -10,-92Q-11,-103 -22,-104Q-11,-105 -10,-116ZM37,-116Q38,-105 49,-104Q38,-103 37,-92Q36,-103 25,-104Q36,-105 37,-116Z" fill="#FFE27A"/></g>`,turn=n=>[...Array(n).keys()].map(i=>i*360/n);
  const spoke=turn(8).map(d=>`<path d="M0,0L0,${-R}" transform="rotate(${d})" stroke="${I}" stroke-width="10"/><path d="M0,0L0,${-R}" transform="rotate(${d})" stroke="#E0A02C" stroke-width="5"/>`).join('');
  const win=(x,y)=>`<rect x="${x}" y="${y}" width="10" height="13" rx="2" fill="#FFE27A" stroke="${I}" stroke-width="2.6"/>`;
  const tower=`<g transform="translate(-68,20) scale(.74)"><path d="M-27,-76H27V130H-27Z" fill="${RA.G('#6C5FA8')}" stroke="${I}" stroke-width="4.6"/><path d="M-38,-72L0,-140L38,-72Z" fill="${RA.G('#F0506E')}" stroke="${I}" stroke-width="4.6" stroke-linejoin="round"/><path d="M-32,-36H32M-32,4H32" stroke="${I}" stroke-width="4.6"/>${win(-22,-62)}${win(5,-62)}${win(-22,-24)}${win(5,-24)}${win(-22,16)}${win(5,16)}</g>`;
  const sky=`<circle r="${R}" fill="url(#logoSky)"/><circle cx="10" cy="-86" r="13" fill="#FFF0B8" stroke="${I}" stroke-width="2.4"/><path d="M-30,-92l1.6,4 4,1.6 -4,1.6 -1.6,4 -1.6,-4 -4,-1.6 4,-1.6Z M50,-88l1.6,4 4,1.6 -4,1.6 -1.6,4 -1.6,-4 -4,-1.6 4,-1.6Z" fill="#FFF6C9"/>`;
  const inner=`<defs>${RA.lg('logoRing',['#FFF6BE','#FFCB4F','#C98A1E'])}<radialGradient id="logoSky" cx=".5" cy=".3" r=".85"><stop offset="0" stop-color="#5B4BB4"/><stop offset=".6" stop-color="#34297A"/><stop offset="1" stop-color="#1C1548"/></radialGradient><clipPath id="logoC"><circle r="${R}"/></clipPath></defs>
    <g clip-path="url(#logoC)">${led?`<circle r="${R}" fill="#000"/>${big}`:`${sky}${spoke}${tower}<g transform="translate(12,114) scale(1.12)">${ham}</g>`}</g>
    <circle r="${R+2}" fill="none" stroke="${I}" stroke-width="13"/><circle r="${R+2}" fill="none" stroke="#C4CEE4" stroke-width="6"/>
    ${turn(20).map(d=>`<path d="M0,${-(R+3)}V${-(R+18)}" transform="rotate(${d})" stroke="${I}" stroke-width="6.4"/><path d="M0,${-(R+3)}V${-(R+18)}" transform="rotate(${d})" stroke="#FFF6E5" stroke-width="2.8"/>`).join('')}
    <circle r="${R+21}" fill="none" stroke="${I}" stroke-width="19"/><circle r="${R+21}" fill="none" stroke="url(#logoRing)" stroke-width="11"/>
    <path d="M-104,-82C-86,-104 -60,-120 -30,-127" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="4.4" stroke-linecap="round"/>`;
  return wrap(inner,'-140 -140 280 280');
}
/* the Arena's own sign: a small tower with two crossed swords in front of it */
function arenaIcon(){
  const I=RA.INK,win=(x,y)=>`<rect x="${x}" y="${y}" width="16" height="20" rx="3" fill="#FFE27A" stroke="${I}" stroke-width="3.4"/>`;
  const sword=(a,c)=>`<g transform="rotate(${a} 0 -62)"><path d="M-10,-200L0,-222L10,-200L10,-82L-10,-82Z" fill="url(#gSteel)" stroke="${I}" stroke-width="4.4" stroke-linejoin="round"/><path d="M0,-212V-86" stroke="#fff" stroke-opacity=".8" stroke-width="3.4" stroke-linecap="round"/><path d="M-30,-84H30Q34,-84 34,-76Q34,-70 30,-70H-30Q-34,-70 -34,-76Q-34,-84 -30,-84Z" fill="url(#gGold)" stroke="${I}" stroke-width="4.4"/><rect x="-7" y="-70" width="14" height="30" rx="3" fill="${c}" stroke="${I}" stroke-width="4"/><circle cy="-34" r="9" fill="url(#gGold)" stroke="${I}" stroke-width="4"/></g>`;
  const inner=`<ellipse cx="0" cy="104" rx="104" ry="14" fill="#050310" opacity=".4"/>
    ${RA.inked('M-62,-46H62L72,100H-72Z',RA.G('#7A6CB8'),5)}
    <path d="M-70,-30H70M-71,20H71" stroke="${I}" stroke-width="5"/>
    ${win(-40,-20)}${win(-8,-20)}${win(24,-20)}${win(-40,32)}${win(24,32)}
    <path d="M-18,100V66Q0,48 18,66V100Z" fill="#5A3820" stroke="${I}" stroke-width="4.4"/>
    ${RA.inked('M-80,-44L0,-138L80,-44Z',RA.G('#F0506E'),5)}
    <path d="M0,-138V-168" stroke="${I}" stroke-width="5"/><path d="M0,-168L34,-156L0,-144Z" fill="url(#gGold)" stroke="${I}" stroke-width="4" stroke-linejoin="round"/>
    <g transform="translate(0,60)">${sword(-48,'#3F73E6')}${sword(48,'#E8344F')}</g>`;
  return wrap(inner,'-130 -180 260 300'.replace('300','300'));
}
/* the two hamsters in the night scene, placed in the old drawing's box */
window.sceneRig=k=>{
  const box=document.createElement('div');box.style.cssText='position:absolute;inset:0';hold.appendChild(box);
  const a=new MOT.Actor('ham',k==='wheel'?'squeektoshi':'blade',{still:true});box.appendChild(a.el);
  if(k==='wheel'){a.P.back.innerHTML='';a.P.aura.innerHTML='';if(a.P.over)a.P.over.remove();Object.assign(a.p,{lean:8,legF:30,legB:-26,legFy:7,armF:-104,armB:-58});}
  else{a.box('weapon').innerHTML='';a.face('joy');}
  a.update(18000);
  const inner=a.el.innerHTML;box.remove();
  return `<g transform="translate(60,116) scale(.74)">${inner}</g>`;
};
window.logoSvg=logoSvg;
window.rigSvg=id=>{
  if(id==='scene'||id.startsWith('bg_')){const s=artSvg(id);return s.replace(/<svg[^>]*>/,m=>m+`<defs>${RA.inlineDefs()}</defs>`);}
  if(id==='logo'||id==='wheel_big')return logoSvg();
  if(id==='arena')return arenaIcon();
  if(id.startsWith('pet_')&&RA.PETS[id.slice(4)])return actorSvg('ham',id.slice(4));
  if(id.startsWith('boss_')&&RA.BOSS[id.slice(5)])return actorSvg('boss',id.slice(5));
  if(id.startsWith('mon_')&&RA.MON[id.slice(4)])return actorSvg('mon',id.slice(4));
  if(id.startsWith('g_')&&RA.GEAR[id.slice(2)])return fitted(RA.gearIcon(id.slice(2)));
  if(id==='bag')return wrap(RA.blindBag(),'-124 -136 248 248');
  if(id==='fbag_snack')return wrap(RA.snackBag(),'-124 -116 248 248');
  if(id==='fbag_picnic')return wrap(RA.picnicBag(),'-124 -116 248 248');
  if(id==='fbag_feast')return wrap(RA.feastBag(),'-124 -136 248 248');
  if(CHEST[id])return wrap(RA.chestArt(...CHEST[id]),'-124 -134 248 248');
  if(id==='nav_team')return actorSvg('ham','blade');
  if(id==='win_pet')return actorSvg('ham','blade',{face:'joy'});
  if(id==='hurt_pet')return actorSvg('ham','blade',{face:'hurt'});
  return null;
};
})();
