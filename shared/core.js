/* GAME LOGIC: no DOM, runs the same in the browser and on the server */
function seedOf(str){
  let a=1779033703,b=3144134277,c=1013904242,d=2773480762;
  for(let i=0;i<str.length;i++){const k=str.charCodeAt(i);a=b^Math.imul(a^k,597399067);b=c^Math.imul(b^k,2869860233);c=d^Math.imul(c^k,951274213);d=a^Math.imul(d^k,2716044179);}
  a=Math.imul(c^(a>>>18),597399067);b=Math.imul(d^(b>>>22),2869860233);c=Math.imul(a^(c>>>17),951274213);d=Math.imul(b^(d>>>19),2716044179);
  return [(a^b^c^d)>>>0,(b^a)>>>0,(c^a)>>>0,(d^a)>>>0];
}
function rnd(s){const a=s[0]|0,b=s[1]|0,c=s[2]|0,d=s[3]|0;const t=(((a+b)|0)+d)|0;s[3]=(d+1)|0;s[0]=b^(b>>>9);s[1]=(c+(c<<3))|0;const r=(c<<21)|(c>>>11);s[2]=(r+t)|0;return (t>>>0)/4294967296;}
const pick=(arr,s)=>arr[Math.floor(rnd(s)*arr.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TUNE={eHp:2.1,eAtk:2.7,bHp:2.0,bAtk:2.5,fl:.095,foodA:14,foodP:1.25,xpA:.5,xpB:.3,lvGrow:.1,plusGrow:.3,replayCoin:.3,replayChest:.7,hardFrom:30,hardTo:200,elUp:.4,elDown:.35,heavy:2,bossK:.1,bossH:.03,bossW:.3,up:.25,upFrom:50,upP:1.2,catchUp:3,brace:.4};
/* how much the upper tower demands: nothing up to floor 30, in full from floor 200 */
const hardAt=f=>clamp((f-TUNE.hardFrom)/(TUNE.hardTo-TUNE.hardFrom),0,1);
const elRight=h=>1.4+TUNE.elUp*h;
const elWrong=h=>.75-TUNE.elDown*h;
const floorType=w=>w>=600?'zoomies':w<300?'sleepy':'normal';
const TYPE_NAME={sleepy:'Easy',normal:'Normal',zoomies:'Zoomies'};
const matchup=(a,d)=>{if(!a||!d)return 0;if(ELS[a].beats===d)return 1;if(ELS[d].beats===a)return -1;return 0;};
/* TOWER */
function buildFloors(rounds){
  const t1=BOSS_LIST.filter(b=>b.tier===1),t2=BOSS_LIST.filter(b=>b.tier===2),wx=RULES.filter(r=>r.id!=='clear');
  return rounds.map((r,i)=>{
    const floor=i+1,type=floorType(r.work),s=seedOf(r.hash+':floor'),isBoss=floor%10===0;
    let enemies;
    if(isBoss){
      const odd=(floor/10)%2===1,list=odd?t1:t2,b=list[Math.floor((floor-(odd?10:20))/20)%list.length];
      enemies=[b.id,...b.minions];
    }else{
      const n=floor<=2?1:floor<=5?2:3,got=[];
      for(let k=0;k<n;k++){
        const x=rnd(s);let tier=floor<=8?1:floor<=20?(x<.6?1:2):floor<=40?(x<.25?1:x<.85?2:3):(x<.6?2:3);
        if(type==='zoomies'&&floor>4&&k===0)tier=Math.min(3,tier+1);
        let pool=MONS_LIST.filter(m=>m.tier===tier&&!got.includes(m.id));
        got.push(pick(pool,s).id);
      }
      enemies=got;
    }
    const rule=rnd(s)<.6?pick(wx,s).id:'clear';
    const ms=seedOf(r.hash+':map');
    const map={t:Math.floor(rnd(ms)*MAP_NAMES.length),tone:Math.floor(rnd(ms)*TONE_NAMES.length)};
    return {floor,round:r.round,work:r.work,blocks:r.blocks,hash:r.hash,t:r.t,gap:r.gap,type,boss:isBoss,enemies,rule,map,nap:i>0&&r.gap>=6};
  });
}
/* SAVE DATA AND PET STATS */
const newPet=lv=>({lv:lv||1,star:1,branch:null,gear:{},xp:0,full:0});
function newSave(seed){
  return {v:4,coins:0,top:0,team:['blade'],owned:{blade:newPet()},items:[],foods:{},presets:[],chests:[0,0,0,0,0],uid:1,pityE:0,pityL:0,bags:0,sweepDay:null,gifts:{},sqk:{},tp:0,quests:{},battles:0,wins:0,rs:seedOf('save:'+seed)};
}
/* SQUEEK PETS: the save keeps each one's traits and level as the server last read them from the chain, and the pet list is filled from that */
const isSq=id=>typeof id==='string'&&/^sq\d{1,4}$/.test(id);
const sqSame=(a,b)=>!!a&&!!b&&a.pal===b.pal&&a.body===b.body&&a.eye===b.eye&&a.ill===b.ill;
function addSqueek(id,t,lv){const k='sq'+(+id),cur=PETS[k];if(!cur||!cur.sq||cur.sq.lv!==lv||!sqSame(cur.sq.t,t))PETS[k]=squeekDef(+id,t,lv);return k;}
function useSqueeks(G){if(G&&G.owned)for(const k of Object.keys(G.owned)){const o=G.owned[k];if(isSq(k)&&o&&o.sq&&o.sq.t)addSqueek(k.slice(2),o.sq.t,o.sq.lv);}}
/* a battle ticket carries its Squeeks' traits, so any server can play the next turn */
function ensureSqueeks(B){for(const u of B.units)if(u.sq)addSqueek(u.sq.id,u.sq.t,u.sq.lv);}
const sqUsable=(G,id)=>!isSq(id)||!!(G.owned[id]&&G.owned[id].sq&&!G.owned[id].sq.gone);
/* a team is 1 to 3 different owned pets, with at most SQ_MAX Squeeks that still belong to the player */
function teamProblem(G,t){
  if(!Array.isArray(t)||t.length<1||t.length>3||new Set(t).size!==t.length)return 'A team needs 1 to 3 different pets';
  for(const id of t){
    if(typeof id!=='string'||!Object.prototype.hasOwnProperty.call(G.owned,id))return 'You do not own this pet';
    if(!sqUsable(G,id))return 'This Squeek has left your wallet';
  }
  if(t.filter(isSq).length>SQ_MAX)return 'Only one Squeek can be in a team';
  return null;
}
const itemVal=it=>SLOT_VAL[it.rar]*(1+TUNE.plusGrow*it.plus);
const itemByUid=(G,uid)=>G.items.find(i=>i.uid===uid);
function setCounts(G,o){const c={};for(const s of Object.keys(o.gear)){const it=itemByUid(G,o.gear[s]);if(it)c[it.set]=(c[it.set]||0)+1;}return c;}
function petStats(G,id){
  const p=PETS[id],o=G.owned[id],r=ROLES[p.role],k=RARS[p.rar].m*(1+TUNE.lvGrow*(o.lv-1))*(1+(p.sq?SQ_STAR:.12)*(o.star-1));
  const mods={nrg:1,heal:1,react:0,aoe:0,low:0,lifesteal:0,thorns:0,coin:0,ult:0,startShield:0,turnHeal:0,splash:0,dbl:false,teamAtk:0,startDodge:0,critDmg:50};
  let hp=r.hp*k,atk=r.atk*k,def=r.def*k,spd=r.spd+p.off+(o.lv-1)*.2+(o.star-1),crit=r.crit;
  for(const s of Object.keys(o.gear)){const it=itemByUid(G,o.gear[s]);if(!it)continue;const v=itemVal(it);
    if(s==='weapon')atk*=1+v/100;if(s==='armor')hp*=1+v/100;if(s==='hat')def*=1+v/100;if(s==='charm'){crit+=v*.5;spd+=v*.2;}}
  const c=setCounts(G,o);
  if(c.miner>=2)mods.coin+=.1;if(c.miner>=4)atk*=1.2;
  if(c.knight>=2)def*=1.15;if(c.knight>=4){mods.startShield=3;mods.brace=.4;}
  if(c.wizard>=2)mods.nrg*=1.15;if(c.wizard>=4){mods.react+=1;mods.reactNrg=20;}
  if(c.hunter>=2)crit+=8;if(c.hunter>=4){mods.critDmg+=60;mods.sure=true;}
  if(c.nurse>=2)mods.heal*=1.15;if(c.nurse>=4){mods.turnHeal=.06;mods.clean=true;}
  if(c.thunder>=2)spd+=8;if(c.thunder>=4){mods.ult+=.5;mods.nrgStart=30;mods.grounded=true;}
  switch(o.branch){
    case 'cyclone':mods.splash=.4;break;case 'endurance':hp*=1.2;mods.lifesteal=.1;break;
    case 'ironwall':def*=1.25;break;case 'counter':mods.thorns=.3;break;
    case 'sniper':crit+=12;mods.critDmg+=20;break;case 'volley':mods.dbl=true;break;
    case 'tempest':mods.aoe=.2;break;case 'sigil':mods.react+=.4;break;
    case 'medic':mods.heal*=1.3;break;case 'cheer':mods.teamAtk=12;break;
    case 'finisher':mods.low=.4;break;case 'stealth':mods.startDodge=1;spd+=8;break;
  }
  return {hp:Math.round(hp),atk:Math.round(atk),def:Math.round(def),spd:Math.round(spd),crit:Math.round(crit*10)/10,mods};
}
const petPower=st=>Math.round(st.hp/4+st.atk*2+st.def*1.5+st.spd/4);
function teamResonance(team){
  const out=[];if(!team.length)return out;
  const els=team.map(id=>PETS[id].el),roles=team.map(id=>PETS[id].role),uniq=new Set(els).size;
  if(team.length===3&&uniq===1)out.push(RESON[0]);
  if(team.length===3&&uniq===3)out.push(RESON[1]);
  if(roles.includes('tank')&&roles.includes('support'))out.push(RESON[2]);
  for(const t of TRIOS)if(t.ids.every(x=>team.includes(x)))out.push(Object.assign({trio:1},t));
  return out;
}
/* BATTLE: each turn the player picks skills for the whole team, then every unit acts once in Speed order */
const other=s=>s==='p'?'e':'p';
const alive=(B,side)=>B.units.filter(u=>u.side===side&&u.alive);
const uById=(B,id)=>B.units.find(u=>u.id===id);
const hpPct=u=>u.hp/u.hpMax;
const minBy=(a,f)=>a.reduce((m,x)=>f(x)<f(m)?x:m,a[0]);
const maxBy=(a,f)=>a.reduce((m,x)=>f(x)>f(m)?x:m,a[0]);
const healMul=B=>B.rule&&B.rule.heal?B.rule.heal:1;
function effSpd(u){let s=u.spd;if(u.st.spdUp)s*=1+u.st.spdUp.v/100;if(u.st.slow)s*=1-u.st.slow.v/100;return s;}
function snapshot(B){
  return {t:'snap',round:B.round,order:B.over?[]:B.queue.slice(),us:B.units.map(u=>({id:u.id,hp:Math.max(0,Math.round(u.hp)),hpMax:u.hpMax,sh:u.st.shield?Math.round(u.st.shield.v):0,nrg:u.nrg,alive:u.alive,mark:u.mark,charging:u.charging?u.charging.n:null,spd:Math.round(effSpd(u)),st:Object.keys(u.st).filter(k=>STS[k]&&k!=='shield').map(k=>({k,v:u.st[k].v,t:u.st[k].t}))}))};
}
const typeK=t=>t==='zoomies'?1.12:t==='sleepy'?.9:1;
/* floors are drawn by chance from the round hash, so some draws are far harder than their number says. dg is how hard an enemy measured in simulations.
   A strong draw comes down at once. A weak draw only goes up slowly with height, a boss a little faster. Below floor 30 a floor can only get easier */
function floorScale(node){
  const f=node.floor;if(node.daily||f<=10)return 1;
  const list=node.boss?[node.enemies[0]]:node.enemies,d=Math.pow(list.reduce((a,id)=>a*(MONS[id].dg||1),1),1/list.length);
  const upper=f>=TUNE.hardFrom,boss=node.boss&&upper,capped=Math.min(1,1/(d*typeK(node.type)))*(node.boss&&!upper?.9:1);
  const even=d>1?(upper?1/d:capped):capped*Math.pow(1/d,boss?Math.max(TUNE.bossW,hardAt(f)):hardAt(f));
  return even*(boss?1+TUNE.bossK*clamp((f-TUNE.hardFrom)/70,0,1)+TUNE.bossH*hardAt(f):1)*(1+TUNE.up*Math.pow(Math.max(0,f-TUNE.upFrom)/100,TUNE.upP));
}
function makeEnemy(m,idx,node){
  const f=node.floor,early=f<=2?1:f<=12?1.15:f<=30?1.15-.15*(f-12)/18:1,k=(1+TUNE.fl*(f-1))*early*typeK(node.type)*floorScale(node),bt=m.boss?(m.tier===2?.82:1.15):1,bh=(m.boss?TUNE.bHp:TUNE.eHp)*bt,ba=(m.boss?TUNE.bAtk:TUNE.eAtk)*(m.boss?(m.tier===2?.9:1.05):1);
  const mn=node.boss&&idx>0,hp=Math.round(m.hp*bh*k*(mn?.65:1));
  const u={id:'e'+idx,side:'e',ref:m.id,n:m.n,el:m.el,boss:!!m.boss,role:null,hp,hpMax:hp,atk:Math.round(m.atk*ba*k*(mn?.75:1)),def:Math.round((6+m.def*6)*k),spd:Math.round(88+m.spd*4+f*.12),crit:0,nrg:0,cds:{},st:{},mark:null,alive:true,turn:0,phase:0,hitLast:false,charging:null,revived:false,hist:[hp,hp],mods:{nrg:1,heal:1,react:0,aoe:0,low:0,lifesteal:0,thorns:0,coin:0,ult:0,critDmg:50}};
  if(m.taunt)u.st.taunt={t:m.taunt};
  if(m.thorns)u.mods.thorns=m.thorns;
  return u;
}
function roundOrder(B){
  const list=B.units.filter(u=>u.alive);
  list.forEach(u=>{u.tie=rnd(B.rng);u.key=effSpd(u)+(u.side==='e'&&!u.pet&&MONS[u.ref].first?1000:0)-(u.charging&&B.hf>=TUNE.hardFrom?1e5:0);});
  list.sort((a,b)=>b.key-a.key||a.tie-b.tie);
  return list.map(u=>u.id);
}
function newRound(B,ev){
  for(const u of B.units){if(!u.alive)continue;for(const k of Object.keys(u.st)){if(!STS[k]||!STS[k].round)continue;const s=u.st[k];if(s.fresh){delete s.fresh;continue;}s.t--;if(s.t<=0)delete u.st[k];}}
  for(const u of B.units){for(const k of Object.keys(u.cds))if(u.cds[k]>0)u.cds[k]--;}
  B.round++;B.actIndex=0;
  if(B.round>12){alive(B,'e').forEach(u=>{u.st.atkUp={v:(u.st.atkUp?u.st.atkUp.v:0)+18,t:99};});ev.push({t:'note',text:'The battle drags on and the enemies grow furious'});}
  B.queue=roundOrder(B);
  ev.push({t:'round',n:B.round});ev.push(snapshot(B));
}
const sqInfo=id=>{const s=PETS[id]&&PETS[id].sq;return s?{id:s.id,t:s.t,lv:s.lv}:null;};
function startBattle(G,node,floors,opts){
  opts=opts||{};
  useSqueeks(G);
  const B={node:{floor:node.floor,round:node.round,work:node.work,type:node.type,boss:node.boss,hash:node.hash},hf:node.daily||node.arena?0:node.floor,h:node.daily||node.arena?0:hardAt(node.floor),units:[],round:0,queue:[],actIndex:0,over:null,rule:node.rule?RULES.find(r=>r.id===node.rule):null,rng:seedOf(opts.seed||(node.hash+':b:'+G.battles+':'+(opts.salt||''))),coinBonus:0,noReactP:false,reactP:0,dmgP:0,drowsyP:.3,first:node.floor>G.top,sandbox:!!opts.sandbox};
  const res=teamResonance(G.team);
  let hpBonus=0,critBonus=0,dmgBonus=0;
  for(const r of res){
    if(r.id==='same'){B.noReactP=true;dmgBonus+=.15;}
    if(r.id==='diff')B.reactP+=.2;
    if(r.id==='std')hpBonus+=.1;
    if(r.trio){if(r.dmg)dmgBonus+=r.dmg;if(r.coin)B.coinBonus+=r.coin;if(r.hp)hpBonus+=r.hp;if(r.crit)critBonus+=r.crit;if(r.drowsy)B.drowsyP=r.drowsy;}
  }
  B.dmgP=dmgBonus;B.res=res.map(r=>r.n);
  G.team.forEach((id,i)=>{
    const st=petStats(G,id),hp=Math.round(st.hp*(1+hpBonus));
    B.coinBonus+=st.mods.coin;
    const healT=res.find(r=>r.trio&&r.heal);if(healT)st.mods.heal*=1+healT.heal;
    const u={id:'p'+i,side:'p',ref:id,n:PETS[id].n,el:PETS[id].el,role:PETS[id].role,boss:false,hp,hpMax:hp,atk:st.atk,def:st.def,spd:st.spd,crit:st.crit+critBonus,nrg:st.mods.nrgStart||0,cds:{},st:{},mark:null,alive:true,turn:0,phase:0,hitLast:false,charging:null,mods:st.mods};
    const sq=sqInfo(id);if(sq)u.sq=sq;
    B.units.push(u);
  });
  if(opts.foe)addFoeTeam(B,opts.foe);
  else node.enemies.forEach((mid,i)=>B.units.push(makeEnemy(MONS[mid],i,node)));
  for(const u of B.units){
    if(u.mods.startShield)u.st.shield={v:u.def*u.mods.startShield,t:2};
    if(u.mods.startDodge)u.st.dodge={v:1,t:3};
  }
  for(const side of ['p','e']){
    const cheer=alive(B,side).filter(u=>u.mods.teamAtk).length;
    if(cheer)alive(B,side).forEach(u=>{u.st.atkUp={v:12*cheer,t:3};});
  }
  const ev=[];newRound(B,ev);
  return {B,ev,init:ev[ev.length-1]};
}
/* the Arena: another team stands on the enemy side, with its own team bonuses */
function addFoeTeam(B,F){
  useSqueeks(F);
  const res=teamResonance(F.team);
  let hpBonus=0,critBonus=0;B.dmgE=0;B.reactE=0;B.noReactE=false;
  for(const r of res){
    if(r.id==='same'){B.noReactE=true;B.dmgE+=.15;}
    if(r.id==='diff')B.reactE+=.2;
    if(r.id==='std')hpBonus+=.1;
    if(r.trio){if(r.dmg)B.dmgE+=r.dmg;if(r.hp)hpBonus+=r.hp;if(r.crit)critBonus+=r.crit;}
  }
  F.team.forEach((id,i)=>{
    const st=petStats(F,id),hp=Math.round(st.hp*(1+hpBonus)),o=F.owned[id],look={};
    const healT=res.find(r=>r.trio&&r.heal);if(healT)st.mods.heal*=1+healT.heal;
    for(const s of Object.keys(o.gear)){const it=itemByUid(F,o.gear[s]);if(it)look[s]=it.set;}
    const u={id:'e'+i,side:'e',pet:true,look,star:o.star,ref:id,n:PETS[id].n,el:PETS[id].el,role:PETS[id].role,boss:false,hp,hpMax:hp,atk:st.atk,def:st.def,spd:st.spd,crit:st.crit+critBonus,nrg:st.mods.nrgStart||0,cds:{},st:{},mark:null,alive:true,turn:0,phase:0,hitLast:false,charging:null,hist:[hp,hp],mods:st.mods};
    const sq=sqInfo(id);if(sq)u.sq=sq;
    B.units.push(u);
  });
}
function checkOver(B){
  if(B.over)return;
  if(!alive(B,'e').length)B.over='win';else if(!alive(B,'p').length)B.over='lose';
}
function kill(B,t,ev){
  if(t.hp>0||!t.alive)return;
  const m=t.side==='e'?MONS[t.ref]:null;
  if(m&&m.revive&&!t.revived){t.revived=true;t.hp=Math.round(t.hpMax*m.revive);t.st={};t.mark=null;ev.push({t:'revive',who:t.id,name:'Proxy Upgrade',hp:t.hp});return;}
  t.hp=0;t.alive=false;t.st={};t.mark=null;t.charging=null;
  B.queue=B.queue.filter(x=>x!==t.id);
  ev.push({t:'dead',who:t.id});
  if(m&&m.boom){const f=alive(B,'p');if(f.length){const x=f.find(u=>u.st.taunt)||f[0],d=Math.round(t.atk*m.boom);ev.push({t:'boom',who:t.id,to:x.id});hurt(B,null,x,d,ev,{key:'bomb'});}}
  checkOver(B);
}
/* apply damage, shields first */
function hurt(B,a,t,val,ev,info){
  if(!t.alive)return 0;
  let d=Math.max(1,Math.round(val));const raw=d;
  if(!(info&&info.pierceShield)&&t.st.shield){const ab=Math.min(t.st.shield.v,d);t.st.shield.v-=ab;d-=ab;if(t.st.shield.v<=0)delete t.st.shield;}
  t.hp-=d;t.hitLast=true;
  if(t.side==='p'||t.pet)gainNrg(B,t,7);
  ev.push(Object.assign({t:'dmg',to:t.id,val:raw,lost:d,hp:Math.max(0,t.hp),sh:t.st.shield?Math.round(t.st.shield.v):0},info||{}));
  if(t.hp<=0)kill(B,t,ev);
  return d;
}
function gainNrg(B,t,base){if(!t.alive)return;t.nrg=Math.min(100,t.nrg+Math.round(base*t.mods.nrg*(B.rule&&B.rule.nrg||1)));}
function atkOf(u){let a=u.atk;if(u.st.atkUp)a*=1+u.st.atkUp.v/100;return a;}
function defOf(u){let d=u.def;if(u.st.defUp)d*=1+u.st.defUp.v/100;if(u.st.defDown)d*=1-u.st.defDown.v/100;return d;}
function calcHit(B,a,t,pow,el,o,meta){
  const atk=atkOf(a);let def=defOf(t);if(o.pierce)def*=1-o.pierce;
  let v=pow*atk*atk/(atk+def);
  const eff=matchup(el,t.el);if(eff>0)v*=elRight(B.h);else if(eff<0)v*=elWrong(B.h);
  if(meta&&meta.heavy){v*=1+TUNE.heavy*B.h;if(t.mods.brace)v*=1-t.mods.brace;}
  if(t.st.braced)v*=TUNE.brace;
  if(a.st.weak)v*=.75;if(t.st.rust)v*=1.25;
  if(t.st.freeze&&t.st.freeze.v){v*=1.3;t.st.freeze.v=0;}
  if(B.rule&&B.rule.el&&B.rule.el===el)v*=1.3;
  if(B.rule&&B.rule.lead&&B.actIndex<=3)v*=1+B.rule.lead;
  v*=1+(a.side==='p'?B.dmgP:(B.dmgE||0));
  if(o.low)v*=1+(1-hpPct(a));
  if(a.mods.low&&hpPct(t)<.35)v*=1+a.mods.low;
  if(meta&&meta.ult)v*=1+a.mods.ult;
  if(meta&&meta.aoe)v*=1+a.mods.aoe;
  return {v,eff};
}
function singleHit(B,a,t,pow,o,el,ev,meta){
  if(!t.alive||!a.alive)return;
  if(!a.mods.sure){
    if(a.st.blind&&!(meta&&meta.aoe)){delete a.st.blind;ev.push({t:'miss',to:t.id,why:'Miss'});return;}
    if(t.st.dodge){t.st.dodge.v--;if(t.st.dodge.v<=0)delete t.st.dodge;ev.push({t:'miss',to:t.id,why:'Dodge'});return;}
    if(t.side==='e'&&!t.pet&&MONS[t.ref].fly&&rnd(B.rng)<.15){ev.push({t:'miss',to:t.id,why:'Dodge'});return;}
    if(B.rule&&B.rule.fog&&!(meta&&meta.aoe)&&rnd(B.rng)<B.rule.fog){ev.push({t:'miss',to:t.id,why:'Miss'});return;}
  }
  let critRate=a.crit+(a.st.critUp?a.st.critUp.v:0)+(B.rule&&B.rule.crit?B.rule.crit:0);
  let crit=!(B.rule&&B.rule.nocrit)&&rnd(B.rng)<critRate/100;
  if(t.st.marked){crit=!(B.rule&&B.rule.nocrit);delete t.st.marked;}
  const r=calcHit(B,a,t,pow,el,o,meta);let val=r.v*(crit?1+a.mods.critDmg/100:1);
  let react=null,boost=1;
  if(el){
    if(t.mark&&t.mark!==el){
      if(a.side==='p'?B.noReactP:B.noReactE)t.mark=el;
      else{react=REACT[rk(el,t.mark)];const pair=[t.mark,el];t.mark=null;boost=1+a.mods.react+(a.side==='p'?B.reactP:(B.reactE||0))+(B.rule&&B.rule.react?B.rule.react:0);if(o.reactX)boost*=o.reactX;val*=1+(react.dmg-1)*boost;react=Object.assign({pair},react);}
    }else t.mark=el;
  }
  const lost=hurt(B,a,t,val,ev,{crit,eff:r.eff,el,by:a.id});
  if(t.alive&&t.st.sleep){delete t.st.sleep;ev.push({t:'note',text:t.n+' wakes up'});}
  if(react){ev.push({t:'react',name:react.n,a:react.pair[0],b:react.pair[1],to:t.id,side:a.side});reactFx(B,a,t,react,boost,val,ev);if(a.mods.reactNrg)gainNrg(B,a,a.mods.reactNrg);}
  const steal=(a.mods.lifesteal||0)+(a.st.vamp?a.st.vamp.v/100:0);
  if(steal&&lost>0&&a.alive)healU(B,a,a,lost*steal,ev,true);
  if(o.drain&&lost>0&&a.alive)healU(B,a,a,lost*o.drain,ev,true);
  if(meta&&meta.splash&&!B.over){alive(B,t.side).filter(x=>x!==t).forEach(x=>hurt(B,a,x,val*meta.splash,ev,{el,by:a.id,splash:1}));}
  if(t.alive&&t.st.bleed)hurt(B,a,t,t.st.bleed.v,ev,{key:'bleed',pierceShield:1});
  if(t.alive&&B.rule&&B.rule.snow&&rnd(B.rng)<B.rule.snow)putSt(B,a,t,'slow',25,1,ev);
  const th=(t.mods.thorns?t.atk*t.mods.thorns:0)+(t.st.thorns?t.st.thorns.v:0)+(t.st.spikes?t.st.spikes.v:0);
  if(th>0&&a.alive&&!B.over)hurt(B,t,a,th,ev,{key:'thorns',pierceShield:1});
}
function reactFx(B,a,t,r,boost,val,ev){
  switch(r.fx){
    case 'chain':alive(B,t.side).filter(x=>x!==t).slice(0,2).forEach(x=>hurt(B,a,x,val*r.v*boost,ev,{el:'spark',by:a.id,chain:1}));break;
    case 'healLow':{const l=alive(B,a.side);if(l.length)healU(B,a,minBy(l,hpPct),atkOf(a)*r.v*boost,ev);break;}
    case 'rust':if(t.alive)putSt(B,a,t,'rust',25,r.v,ev);break;
    case 'blind':if(t.alive)putSt(B,a,t,'blind',1,r.v,ev);break;
    case 'burn':if(t.alive)putSt(B,a,t,'burn',r.v*boost,3,ev);break;
    case 'push':pushUnit(B,t,r.v*boost,ev);break;
    case 'bleed':if(t.alive)putSt(B,a,t,'bleed',r.v*boost,3,ev);break;
    case 'nrg':alive(B,a.side).forEach(x=>{if(x.side==='p'||x.pet)x.nrg=Math.min(100,x.nrg+Math.round(r.v*boost));});ev.push({t:'nrg',side:a.side});break;
    case 'stun':if(t.alive)putSt(B,a,t,'stun',1,1,ev);break;
  }
}
function pushUnit(B,t,v,ev){
  if(!t.alive)return;
  const i=B.queue.indexOf(t.id);
  if(i>=0&&i<B.queue.length-1){B.queue.splice(i,1);B.queue.push(t.id);}
  else t.st.slow={v:Math.round(clamp(v,.1,.8)*100),t:1,fresh:1};
  ev.push({t:'push',to:t.id});
}
function healU(B,a,t,val,ev,raw){
  if(!t.alive)return;
  const v=Math.min(Math.round(val*(raw?1:a.mods.heal*healMul(B))),t.hpMax-t.hp);
  if(v>0){t.hp+=v;ev.push({t:'heal',to:t.id,val:v,hp:t.hp});}
}
const CTRL={stun:1,freeze:1,sleep:1};
/* Silence always stops a charge, Stun, Freeze and Sleep only in the upper tower */
const breaksCharge=(B,k)=>k==='silence'||(CTRL[k]&&B.hf>=TUNE.hardFrom);
const stopCharge=(t,ev)=>{if(t.charging){t.charging=null;ev.push({t:'note',text:t.n+' had its charge interrupted'});}};
/* control on a skill or Rage skill always lands on a charging enemy, a basic attack keeps its chance */
const sureOn=(B,t,k,meta)=>t.charging&&!meta.basic&&breaksCharge(B,k);
function putSt(B,a,t,k,v,dur,ev){
  if(!t.alive)return;
  if(t.mods.clean&&(k==='poison'||k==='burn'||k==='bleed'))return;
  if(CTRL[k]){if(t.st.guard)return ev.push({t:'note',text:t.n+' just recovered and resists crowd control'});t.st[k]={v:1,t:dur};}
  else if(['poison','burn','bleed','regen','thorns','spikes'].includes(k)){const val=v*atkOf(a)*(k==='spikes'?.3+.7*B.h:1);const s=t.st[k];t.st[k]={v:(s?s.v:0)+val,t:Math.max(s?s.t:0,dur)};}
  else if(k==='atkUp'||k==='defUp'){const s=t.st[k];t.st[k]={v:dur>=9&&s?s.v+v:Math.max(s?s.v:0,v),t:Math.max(s?s.t:0,dur)};}
  else{const s=t.st[k];t.st[k]={v:Math.max(s&&typeof s.v==='number'?s.v:0,v),t:Math.max(s?s.t||0:0,dur)};}
  if(STS[k]&&STS[k].round)t.st[k].fresh=1;
  else if(t.id===B.turnOf&&!CTRL[k])t.st[k].fresh=1;
  if(breaksCharge(B,k))stopCharge(t,ev);
  ev.push({t:'st',to:t.id,key:k});
}
function addStatic(B,a,t,n,ev){
  if(!t.alive||t.mods.grounded)return;
  const cur=(t.st.static?t.st.static.v:0)+n;
  if(cur>=5){delete t.st.static;ev.push({t:'discharge',to:t.id});hurt(B,a,t,atkOf(a)*1.2,ev,{el:'spark',pierceShield:1});if(t.alive&&!t.st.guard){t.st.stun={v:1,t:1};if(breaksCharge(B,'stun'))stopCharge(t,ev);}return;}
  t.st.static={v:cur};ev.push({t:'st',to:t.id,key:'static'});
}
function runOps(B,u,ops,targets,el,ev,meta){
  meta=meta||{};
  for(const op of ops){
    if(B.over||!u.alive)return;
    switch(op[0]){
      case 'dmg':{
        const o=op[2]||{};let pow=op[1],hits=o.hits||1;
        if(meta.dbl){pow*=.65;hits*=2;}
        for(const t of targets){
          for(let i=0;i<hits&&!B.over;i++)singleHit(B,u,t,pow,o,el,ev,meta);
          if(o.bounce&&!B.over){alive(B,t.side).filter(x=>x!==t).slice(0,o.bounce).forEach(x=>singleHit(B,u,x,pow*.7,{},el,ev,{}));}
        }
        break;}
      case 'heal':targets.forEach(t=>healU(B,u,t,atkOf(u)*op[1],ev));break;
      case 'shield':targets.forEach(t=>{if(!t.alive)return;const v=(op[2]==='atk'?atkOf(u):u.def*1.6)*op[1]*u.mods.heal*healMul(B);const s=t.st.shield;t.st.shield={v:(s?s.v:0)+v,t:2};if(t.id===B.turnOf)t.st.shield.fresh=1;ev.push({t:'st',to:t.id,key:'shield',sh:Math.round(t.st.shield.v)});});break;
      case 'st':targets.forEach(t=>{if(t.alive&&(!op[4]||sureOn(B,t,op[1],meta)||rnd(B.rng)<op[4]))putSt(B,u,t,op[1],op[2],op[3],ev);});break;
      case 'me':putSt(B,u,u,op[1],op[2],op[3],ev);break;
      case 'team':alive(B,u.side).forEach(t=>putSt(B,u,t,op[1],op[2],op[3],ev));break;
      case 'nrg':(op[2]==='team'?alive(B,u.side):[u]).forEach(t=>gainNrg(B,t,op[1]));break;
      case 'static':targets.forEach(t=>addStatic(B,u,t,op[1],ev));break;
      case 'push':targets.forEach(t=>pushUnit(B,t,op[1],ev));break;
      case 'cleanse':targets.forEach(t=>{for(const k of Object.keys(t.st))if(STS[k]&&STS[k].bad)delete t.st[k];ev.push({t:'note',text:'Cleansed '+t.n});});break;
      case 'taunt':putSt(B,u,u,'taunt',1,op[1],ev);break;
      case 'extra':{const ids=alive(B,u.side).filter(t=>t!==u).map(t=>t.id).filter(id=>B.queue.includes(id));B.queue=[...ids,...B.queue.filter(id=>!ids.includes(id))];ev.push({t:'note',text:'Allies who have not acted go next'});break;}
      case 'coin':B.coinBonus+=op[1];ev.push({t:'note',text:'More coins this battle'});break;
      case 'bomb':targets.forEach(t=>{if(t.alive){const s=t.st.bomb;t.st.bomb={v:(s?s.v:0)+atkOf(u)*op[1],t:op[2]};ev.push({t:'st',to:t.id,key:'bomb'});}});break;
      case 'execute':targets.forEach(t=>{if(!t.alive)return;if(hpPct(t)<op[1]){ev.push({t:'note',text:'Eternal Sleep: '+t.n+' will not wake up'});hurt(B,u,t,t.hp+(t.st.shield?t.st.shield.v:0),ev,{el,by:u.id,crit:true});}else singleHit(B,u,t,op[2],{},el,ev,meta);});break;
      case 'healTeam':alive(B,u.side).forEach(t=>healU(B,u,t,atkOf(u)*op[1],ev));break;
      case 'healLowOp':{const l=alive(B,u.side);if(l.length)healU(B,u,minBy(l,hpPct),atkOf(u)*op[1],ev);break;}
      case 'revive':B.units.filter(t=>t.side===u.side&&!t.alive).slice(0,1).forEach(t=>{t.alive=true;t.hp=Math.round(t.hpMax*op[1]);ev.push({t:'revive',who:t.id,name:'Revived',hp:t.hp});});break;
      case 'swap':{const e=B.units.filter(x=>x.side===other(u.side)&&x.alive);if(e.length>1){const i=B.units.indexOf(e[0]),j=B.units.indexOf(e[1]);B.units[i]=e[1];B.units[j]=e[0];ev.push({t:'swap'});}break;}
      case 'stunChance':targets.forEach(t=>{if(t.alive&&(sureOn(B,t,'stun',meta)||rnd(B.rng)<op[1]))putSt(B,u,t,'stun',1,1,ev);});break;
      case 'break':targets.forEach(t=>{if(t.alive)stopCharge(t,ev);});break;
      case 'guard':ev.push({t:'st',to:u.id,key:'braced'});break;
      case 'wheelBuff':{const w=B.node.work;alive(B,u.side).forEach(t=>{putSt(B,u,t,'atkUp',Math.round(15+w/25),2,ev);healU(B,u,t,atkOf(u)*(.6+w/1000),ev);});break;}
      case 'wheelHit':targets.forEach(t=>singleHit(B,u,t,1.1+B.node.work/500,{},el,ev,meta));break;
      case 'drain':targets.forEach(t=>{t.nrg=Math.max(0,t.nrg-op[1]);ev.push({t:'note',text:t.n+' loses '+op[1]+' Rage'});});break;
      case 'drainAll':alive(B,other(u.side)).forEach(t=>{t.nrg=Math.max(0,t.nrg-op[1]);});ev.push({t:'note',text:'The team loses '+op[1]+' Rage'});break;
      case 'strip':targets.forEach(t=>{if(t.st.shield){delete t.st.shield;ev.push({t:'note',text:t.n+'\'s shield was sucked away'});}});break;
      case 'stripAll':alive(B,other(u.side)).forEach(t=>delete t.st.shield);ev.push({t:'note',text:'All team shields were sucked away'});break;
      case 'rug':alive(B,other(u.side)).forEach(t=>{for(const k of Object.keys(t.st))if(STS[k]&&STS[k].good)delete t.st[k];});ev.push({t:'note',text:'Rug pulled: every buff is gone'});break;
      case 'gift':alive(B,other(u.side)).forEach(t=>{healU(B,u,t,atkOf(u)*op[1],ev);t.st.atkUp={v:op[2],t:3};});ev.push({t:'note',text:'1000% gains: the team heals and gains Bite'});break;
      case 'reorg':{const v=clamp(u.hist[0]-u.hp,0,Math.round(u.hpMax*.25));if(v>0){u.hp+=v;ev.push({t:'heal',to:u.id,val:v,hp:u.hp});}ev.push({t:'note',text:'Reorg: the last two blocks are erased'});break;}
      case 'clear':B.units.forEach(t=>{t.st={};t.mark=null;});ev.push({t:'note',text:'Fresh bedding: all effects are gone'});break;
      case 'suicide':u.hp=0;kill(B,u,ev);break;
      case 'selfStun':u.st.stun={v:1,t:1,fresh:1};ev.push({t:'note',text:u.n+' has a full bag and stands still for one action'});break;
    }
  }
}
/* ACTIONS */
function beginTurn(B,u,ev){
  B.turnOf=u.id;u.turn++;B.actIndex++;
  for(const k of ['poison','burn']){
    if(u.st[k]){hurt(B,null,u,u.st[k].v,ev,{key:k,pierceShield:1});if(!u.alive||B.over)return false;}
  }
  if(u.st.bomb){u.st.bomb.t--;if(u.st.bomb.t<=0){const v=u.st.bomb.v;delete u.st.bomb;ev.push({t:'boom',who:u.id,to:u.id});hurt(B,null,u,v,ev,{key:'bomb'});if(!u.alive||B.over)return false;}}
  if(u.st.regen)healU(B,u,u,u.st.regen.v,ev,true);
  if(u.mods.turnHeal)healU(B,u,u,u.hpMax*u.mods.turnHeal,ev,true);
  if(u.side==='e'&&!u.pet&&MONS[u.ref].regen)healU(B,u,u,u.atk*MONS[u.ref].regen,ev,true);
  for(const k of ['stun','freeze','sleep']){
    if(u.st[k]){
      const name=STS[k].n;
      if(k!=='sleep'||u.st[k].t<=1)delete u.st[k];else u.st[k].t--;
      u.st.guard={t:2,fresh:1};
      ev.push({t:'skip',who:u.id,why:name});return false;
    }
  }
  if(u.st.drowsy&&rnd(B.rng)<B.drowsyP){ev.push({t:'skip',who:u.id,why:'Dozed off'});return false;}
  return true;
}
function endTurn(B,u){
  for(const k of Object.keys(u.st)){
    if(k==='bomb'||(STS[k]&&STS[k].round))continue;
    const s=u.st[k];if(s.t===undefined)continue;
    if(s.fresh){delete s.fresh;continue;}
    s.t--;if(s.t<=0)delete u.st[k];
  }
  u.hitLast=false;u.hist=u.hist?[u.hist[1],u.hp]:u.hist;
}
function phaseCheck(B,u,ev){
  const ph=(MONS[u.ref].phases)||[];
  while(u.phase<ph.length&&hpPct(u)<=ph[u.phase].below){const p=ph[u.phase];u.phase++;ev.push({t:'phase',who:u.id,text:p.say});runOps(B,u,p.ops||[],[u],u.el,ev,{});}
}
function whenOK(B,u,m,turn){
  if(m.from&&B.hf<m.from)return false;
  if(m.cd&&(u.cds[m.n]||0)>0)return false;
  if(m.phase&&u.phase<m.phase)return false;
  const w=m.when;if(!w)return true;
  const foes=alive(B,other(u.side)),allies=alive(B,u.side);
  switch(w){
    case 'selfLow50':return hpPct(u)<.5;case 'selfLow40':return hpPct(u)<.4;
    case 'hitLast':return u.hitLast;case 'notHit':return !u.hitLast;
    case 'anyNoPoison':return foes.some(x=>!x.st.poison);case 'anyNrg60':return foes.some(x=>x.nrg>=60);
    case 'allyLow40':return allies.some(x=>hpPct(x)<.4);case 'allyLow50':return allies.some(x=>hpPct(x)<.5);case 'allyLow60':return allies.some(x=>hpPct(x)<.6);
    case 'noDodge':return !u.st.dodge;case 'turn2':return turn===2;case 'turn2on':return turn>=2;case 'turn3':return turn>=3;
    case 'anyShield':return foes.some(x=>x.st.shield);case 'every6':return turn%6===0;
    default:if(w.startsWith('cycle3:'))return turn%3===+w.slice(7);return true;
  }
}
function pickMove(B,u,turn){const ms=MONS[u.ref].moves;if(u.st.silence)return ms[ms.length-1];return ms.find(m=>whenOK(B,u,m,turn))||ms[ms.length-1];}
function peekMove(B,u){if(u.pet)return PETS[u.ref].skills[foePick(B,u)];if(MONS[u.ref].hidden)return null;if(u.charging)return u.charging;return pickMove(B,u,u.turn+1);}
function aiTargets(B,u,code){
  const foes=alive(B,other(u.side)),allies=alive(B,u.side);
  const tn=foes.find(x=>x.st.taunt),one=t=>[tn||t];
  switch(code){
    case 'self':return [u];case 'allyLow':return [minBy(allies,hpPct)];case 'allies':return allies;case 'pfoes':return foes;
    case 'pfront':return one(foes[0]);case 'pback':return one(foes[foes.length-1]);case 'low':return one(minBy(foes,hpPct));
    case 'strong':return one(maxBy(foes,x=>x.atk));case 'support':return one(foes.find(x=>x.role==='support')||foes[foes.length-1]);
    case 'lowDef':return one(minBy(foes,x=>x.def));case 'full':return one(maxBy(foes,x=>x.nrg));
    case 'noPoison':return one(foes.find(x=>!x.st.poison)||foes[0]);case 'nearStatic':return one(maxBy(foes,x=>x.st.static?x.st.static.v:0));
    case 'shielded':return one(foes.find(x=>x.st.shield)||foes[0]);case 'rand':return one(pick(foes,B.rng));
    case 'rand3':return [0,1,2].map(()=>tn||pick(foes,B.rng));
    default:return one(foes[0]);
  }
}
const previewAim=(B,u,m)=>u.pet?(['self','allies','allyLow','rand2','rand3'].includes(m.tgt)?null:pTargets(B,u,m,foeTarget(B,u)).map(x=>x.id)):(m.tgt==='rand'||m.tgt==='rand3'||m.tgt==='self'||m.tgt==='allyLow'||m.tgt==='allies')?null:aiTargets(B,u,m.tgt).map(x=>x.id);
function autoFx(m,el){
  if(m.fx)return m.fx;
  const has=k=>m.ops.some(o=>o[0]===k),aoe=m.tgt==='pfoes';
  if(has('dmg'))return (aoe?'mAoe_':m.tgt==='pfront'||m.tgt==='low'||m.tgt==='lowDef'?'mBite_':'mShot_')+el;
  if(has('heal'))return 'mHeal';
  if(has('shield'))return 'mShield';
  if(m.tgt==='self')return 'mBuff';
  return aoe?'mCurseAll':'mCurse';
}
/* a pet on the enemy side. Nothing here is random, so the next move it shows is the move it makes. Its Rage skill when full, its skill when that helps right now, otherwise a basic attack */
function foePick(B,u){
  const list=PETS[u.ref].skills,al=alive(B,u.side);
  const helps=sk=>{
    const has=k=>sk.ops.some(o=>o[0]===k);
    if(has('dmg')||has('wheelHit')||has('execute')||has('bomb')||has('static')||has('stunChance'))return true;
    if(has('revive'))return B.units.some(x=>x.side===u.side&&!x.alive);
    if(has('heal')||has('healTeam')||has('healLowOp'))return al.some(x=>hpPct(x)<.7);
    if(has('shield'))return sk.tgt==='self'?!u.st.shield:al.some(x=>!x.st.shield);
    if(has('cleanse'))return al.some(x=>Object.keys(x.st).some(k=>STS[k]&&STS[k].bad));
    return true;
  };
  for(const i of [2,1])if(canUseU(u,list[i])&&helps(list[i]))return i;
  return 0;
}
/* a mark that sets off a reaction first, then the element it beats, then whoever is weakest */
function foeTarget(B,u){
  const worth=t=>(t.mark&&t.mark!==u.el&&!B.noReactE?3:0)+matchup(u.el,t.el)*2+(1-hpPct(t))*2;
  return maxBy(alive(B,other(u.side)),worth).id;
}
function enemyAct(B,u,ev){
  if(u.pet)return petAct(B,u,{i:foePick(B,u),target:foeTarget(B,u)},ev);
  phaseCheck(B,u,ev);if(B.over||!u.alive)return;
  let m=u.charging;
  if(!m){
    m=pickMove(B,u,u.turn);
    if(m.charge){u.charging=m;ev.push({t:'charge',who:u.id,name:m.charge,next:m.n});if(m.cd)u.cds[m.n]=m.cd+1;return;}
  }else u.charging=null;
  if(m.cd&&!m.charge)u.cds[m.n]=m.cd+1;
  const tg=aiTargets(B,u,m.tgt);
  ev.push({t:'use',who:u.id,name:m.n,el:u.el,fx:autoFx(m,u.el),melee:m.tgt==='pfront'||m.tgt==='low'||m.tgt==='lowDef',self:m.tgt==='self'||m.tgt==='allyLow',aoe:m.tgt==='pfoes',targets:tg.map(x=>x.id)});
  runOps(B,u,m.ops,tg,u.el,ev,{aoe:m.tgt==='pfoes',heavy:m.charge||m.heavy});
}
const canUseU=(u,s)=>s.kind==='basic'||s.kind==='guard'||(!u.st.silence&&(s.kind==='ult'?u.nrg>=100:!(u.cds[s.n]>0)));
function canPick(B,id,i){const u=uById(B,id);return !!u&&u.alive&&canUseU(u,PETS[u.ref].skills[i]);}
function pTargets(B,u,sk,chosen){
  const foes=alive(B,other(u.side)),allies=alive(B,u.side),tn=foes.find(x=>x.st.taunt);
  switch(sk.tgt){
    case 'self':return [u];case 'allies':return allies;case 'allyLow':return [minBy(allies,hpPct)];case 'foes':return foes;
    case 'front':return [tn||foes[0]];case 'back':return [tn||foes[foes.length-1]];case 'low':return [tn||minBy(foes,hpPct)];
    case 'rand2':return [0,1].map(()=>pick(foes,B.rng));case 'rand3':return [0,1,2].map(()=>pick(foes,B.rng));
    default:{const c=chosen&&uById(B,chosen);return [tn||(c&&c.alive&&c.side!==u.side?c:foes[0])];}
  }
}
function previewPetAim(B,id,i,chosen){
  const u=uById(B,id),sk=PETS[u.ref].skills[i];
  if(sk.tgt==='self'||sk.tgt==='allies'||sk.tgt==='allyLow'||sk.tgt==='rand2'||sk.tgt==='rand3')return null;
  return pTargets(B,u,sk,chosen).map(x=>x.id);
}
function petAct(B,u,pl,ev){
  const list=PETS[u.ref].skills;let i=pl?pl.i:0;
  if(!canUseU(u,list[i])){if(i!==0)ev.push({t:'note',text:u.n+' cannot use '+list[i].n+' and attacks instead'});i=0;}
  const sk=list[i],targets=pTargets(B,u,sk,pl&&pl.target);
  ev.push({t:'use',who:u.id,name:sk.n,el:u.el,kind:sk.kind,fx:sk.fx,melee:!!ROLES[u.role].melee&&['front','low','foe'].includes(sk.tgt),self:['self','allies','allyLow'].includes(sk.tgt),aoe:sk.tgt==='foes',targets:targets.map(x=>x.id)});
  if(sk.cd)u.cds[sk.n]=sk.cd+1;
  const meta={basic:sk.kind==='basic',ult:sk.kind==='ult',aoe:sk.tgt==='foes',splash:sk.kind==='basic'&&u.mods.splash?u.mods.splash:0,dbl:sk.kind==='basic'&&u.mods.dbl};
  if(sk.kind==='ult')u.nrg=0;
  runOps(B,u,sk.ops,targets,u.el,ev,meta);
  if(sk.kind!=='ult'&&u.alive)gainNrg(B,u,sk.kind==='basic'?22:sk.kind==='guard'?20:14);
}
/* run a whole turn with the player's choices: plan={p0:{i,target},...} */
function runRound(B,plan){
  const ev=[];if(B.over)return ev;
  ensureSqueeks(B);
  plan=plan||{};
  /* Guard holds from the start of the turn, whoever acts first */
  for(const u of alive(B,'p')){const pl=plan[u.id],sk=pl&&PETS[u.ref].skills[pl.i];if(sk&&sk.kind==='guard')u.st.braced={v:1,t:1};}
  while(B.queue.length&&!B.over){
    const id=B.queue.shift(),u=uById(B,id);
    if(!u||!u.alive)continue;
    ev.push({t:'turn',who:id});
    const ok=beginTurn(B,u,ev);checkOver(B);if(B.over)break;
    if(!u.alive)continue;
    if(ok){if(u.side==='p')petAct(B,u,plan[id],ev);else enemyAct(B,u,ev);}
    checkOver(B);if(B.over)break;
    if(u.alive)endTurn(B,u);
    ev.push(snapshot(B));
  }
  if(!B.over)newRound(B,ev);else ev.push(snapshot(B));
  return ev;
}
/* REWARDS AND ECONOMY */
function bandRates(floor){return CHEST_BANDS.find(b=>floor>=b[0]&&floor<=b[1])[2];}
function rollTier(floor,s,plus){const r=bandRates(floor);let x=rnd(s)*100,t=0;for(let i=0;i<r.length;i++){if(x<r[i]){t=i;break;}x-=r[i];t=i;}return Math.min(4,t+(plus||0));}
/* gifts: clearing floor 2 gives the second pet for floor 3, clearing floor 4 gives the third pet for floor 5. The rest bring every element in before the elements start to matter */
const GIFTS=[[2,'dozer'],[4,'archer'],[8,'sailor'],[18,'sparky'],[28,'farmer']];
const baseCoin=(f,boss)=>Math.round((25+8*f)*(boss?3:1));
function finishWin(G,B,floors){
  const f=B.node.floor,first=f>G.top,s=G.rs,mult=1+B.coinBonus;const res={first,chests:[],coins:0,gift:null,treasure:null};
  res.coins=Math.round(baseCoin(f,B.node.boss&&first)*(first?1:TUNE.replayCoin)*mult);
  const plus=(B.node.type==='zoomies'?1:0)+(B.node.boss?1:0);
  const nChest=first?2+(B.node.boss?1:0)+(B.node.type==='zoomies'?1:0):(rnd(s)<TUNE.replayChest?1:0);
  for(let i=0;i<nChest;i++){let t=rollTier(f,s,first?plus:(B.node.type==='zoomies'?1:0));if(!first&&t>0)t--;res.chests.push(t);G.chests[t]++;}
  if(first){
    G.top=f;
    const nx=floors[f];
    if(nx&&nx.nap){const t=rollTier(f+1,s,2);res.treasure={tier:t,hours:Math.round(nx.gap/6*10)/10};G.chests[t]++;}
  }
  /* one per win, so a player who passed a gift's floor before it existed gets it on the next win */
  const due=GIFTS.find(([n,id])=>G.top>=n&&!G.gifts[id]);
  if(due){
    const gift=due[1];
    G.gifts[gift]=1;res.gift=gift;
    if(!G.owned[gift])G.owned[gift]=newPet();
    else if(G.owned[gift].star<5){G.owned[gift].star++;res.giftStar=true;}
    if(G.team.length<3&&!G.team.includes(gift))G.team.push(gift);
  }
  G.coins+=res.coins;G.wins++;
  return res;
}
function dayKey(ms){return new Date(ms).toISOString().slice(0,10);}
function canSweep(G,ms){return G.top>0&&G.sweepDay!==dayKey(ms);}
function doSweep(G,floors,ms){
  if(!canSweep(G,ms))return null;
  G.sweepDay=dayKey(ms);
  const s=G.rs,counts=[0,0,0,0,0];let base=0;
  for(let f=1;f<=G.top;f++){
    const n=floors[f-1];base+=baseCoin(f,n.boss)*.25;
    if(rnd(s)<.25){const t=rollTier(f,s,n.type==='zoomies'?1:0);counts[t]++;G.chests[t]++;}
  }
  const total=Math.round(base);G.coins+=total;
  return {floors:G.top,coins:total,counts};
}
/* DAILY CHALLENGE: everyone borrows the same team, so the score does not depend on chests or levels. The server picks the team and the fight, see lib/daily.js */
const DAILY_TRIES=3,LIVE_BONUS=.2,LIVE_MINUTES=30;
/* the top of the board when a day ends. Food bags are the kind that suits the team's lowest level */
const DAILY_PRIZES=[{to:1,chest:4,bags:3,food:10},{to:3,chest:3,bags:2,food:6},{to:10,chest:2,bags:1,food:3}];
const dailyPrize=rank=>DAILY_PRIZES.find(p=>rank<=p.to)||null;
/* WEEKLY TP BOARD: the Tower Points a player claims from Monday 00:00 UTC to the next Monday. A week is named by its Monday. The top 10
   wallets of a finished week are paid like the Daily Challenge, with n chests of the given kind, see lib/tpweek.js */
const WEEK_PRIZES=[{to:1,chest:4,n:2,bags:5,food:15},{to:3,chest:4,n:1,bags:3,food:10},{to:10,chest:3,n:1,bags:2,food:6}];
const weekPrize=rank=>WEEK_PRIZES.find(p=>rank<=p.to)||null;
function weekKey(ms){const d=new Date(ms),back=(d.getUTCDay()+6)%7;return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-back)).toISOString().slice(0,10);}
const weekEnd=key=>Date.parse(key+'T00:00:00Z')+7*864e5;
function dailyG(ch){
  const owned={};ch.team.forEach(id=>{owned[id]=Object.assign(newPet(ch.lv),{star:ch.star});});
  return {team:ch.team,owned,items:[],battles:0,top:1e9};
}
/* ARENA TOWER: a second tower where every floor is held by a team. Beat a floor above you and you trade places. Every pet fights at one level, stars and gear still count. The server keeps who stands where, see lib/arena.js */
/* It opens waitMin minutes after he starts running and closes waitMin minutes after he stops. Only a page can read the wheel, so the clock runs there. The chain is the server's own check: it stays open holdMin minutes after the newest round with work ends, because the next round reaches the chain that late. pace is his wheel passages a second while running, measured on 3,817 passages */
const ARENA={floors:100,tries:5,reach:3,lv:30,unlock:5,lowPow:900,topPow:5000,waitMin:5,holdMin:15,pace:1.03};
/* what a page learns from one reading of the wheel. w: running, at (seconds), total (work so far on this contract), anchor ({work,end}, what is settled), blocks ({at,th}, the passage that finished each unsettled block). c: what the server has read from the chain: work, then end, from and last of the newest run. m: this page's memory of the run, updated here */
function arenaRead(w,c,m){
  const wait=ARENA.waitMin*60,pace=ARENA.pace,known=w.total!==null&&w.total!==undefined;
  /* what is settled can reach further than what the server has read so far */
  const ax=w.anchor&&w.anchor.work>c.work?w.anchor:null,next=ax&&c.end&&ax.end-c.end===600,start=ax?ax.end-(ax.work-c.work)/pace:0;
  const chain=ax?{work:ax.work,end:ax.end,last:next?c.end+(ax.work-c.work)/pace:ax.end,from:next?c.from:start}:c;
  /* every moment the wheel is known to have turned, oldest first */
  const pts=[];
  if(m.last)pts.push({at:m.last,th:m.seen||0});
  const cp=chain.end&&(!m.last||chain.work>(m.seen||0))?{at:chain.end,th:chain.work}:null;
  if(cp)pts.push(cp);
  for(const b of w.blocks||[])if(!pts.length||b.th>pts[pts.length-1].th)pts.push(b);
  if(w.running&&known&&(!pts.length||w.at>pts[pts.length-1].at))pts.push({at:w.at,th:Math.max(w.total,pts.length?pts[pts.length-1].th:0)});
  /* work with no time on it: since the last reading it is dated by his pace, on a new page it only counts if it is too much to be a few turns */
  const top=pts.length?pts[pts.length-1]:null,grew=known&&!w.running&&!(w.blocks||[]).length&&w.total>(top?top.th:0)&&(m.at?true:w.total-chain.work>30);
  if(grew)pts.push({at:m.at&&top?Math.min(w.at,top.at+(w.total-top.th)/pace):w.at,th:w.total});
  if(!pts.length){m.at=w.at;return m;}
  /* the latest stretch with no quiet spell as long as the wait inside it */
  let i=pts.length-1;while(i>0&&pts[i].at-pts[i-1].at<=wait)i--;
  const head=pts[i],tail=pts[pts.length-1],gone=i>0?pts[i-1].th:chain.work,first=head.at-Math.max(0,head.th-gone-1)/pace;
  m.from=i>0?first:(m.from||(head.th===chain.work&&chain.from)||first);
  const fresh=!m.at;
  /* the work in the last round dates his stop only when nothing came after it. It cannot say when in the round he ran, so whether a new run began above goes by the end of the round */
  m.last=Math.max(m.last||0,w.running?w.at:tail===cp?Math.min(w.at,chain.last||chain.end):Math.min(w.at,tail.at+(known?Math.max(0,w.total-tail.th):0)/pace));
  /* a page that just arrived and only has the chain to go by cannot say when he began, so it never counts down to a run that may be long over */
  if(fresh&&!w.running&&!(w.blocks||[]).length&&m.last-m.from>=30)m.from=Math.min(m.from,m.last-wait);
  m.at=w.at;m.running=!!w.running;
  m.seen=Math.max(m.seen||0,known?w.total:0,chain.work);
  return m;
}
/* what the Arena is doing at this second. A pause under half a minute is still running, and a few turns of the wheel are not a run */
function arenaState(m,now){
  const wait=ARENA.waitMin*60;
  if(!m.from)return {s:'rest',left:0};
  const running=(!!m.running&&now-m.at<60)||now-m.last<30,last=m.running&&now-m.at<60?Math.max(now,m.last):m.last;
  if(now-last>=wait||(!running&&last-m.from<30))return {s:'rest',left:0};
  if(now-m.from<wait)return {s:'wait',left:m.from+wait-now};
  return running?{s:'open',left:0}:{s:'closing',left:last+wait-now};
}
/* one chest for the floor held when a day ends, if the player fought that day */
const ARENA_PRIZES=[{from:100,chest:4},{from:85,chest:3},{from:60,chest:2},{from:30,chest:1},{from:10,chest:0}];
const arenaPrize=f=>ARENA_PRIZES.find(p=>f>=p.from)||null;
/* a team as it stands right now, apart from the save, so selling gear later changes nothing */
function teamSnapshot(G){
  return {team:G.team.map(id=>{const o=G.owned[id],out={id,star:o.star,branch:o.branch||null,gear:Object.keys(o.gear).map(s=>{const it=itemByUid(G,o.gear[s]);return it?[s,it.set,it.rar,it.plus]:null;}).filter(Boolean)};if(o.sq)out.sq={t:o.sq.t,lv:o.sq.lv};return out;})};
}
function snapshotG(d){
  const owned={},items=[];let uid=1;
  for(const t of d.team){const gear={};for(const g of t.gear||[]){items.push({uid,set:g[1],slot:g[0],rar:g[2],plus:g[3]});gear[g[0]]=uid++;}owned[t.id]=Object.assign(newPet(t.lv||ARENA.lv),{star:t.star,branch:t.branch||null,gear},t.sq&&isSq(t.id)?{sq:{t:t.sq.t,lv:t.sq.lv}}:{});}
  const F={team:d.team.map(t=>t.id),owned,items,battles:0,top:1e9};
  useSqueeks(F);
  return F;
}
const arenaG=G=>snapshotG(teamSnapshot(G));
const teamPower=F=>F.team.reduce((a,id)=>a+petPower(petStats(F,id)),0);
/* floors nobody holds yet have a team of their own. It depends on the floor alone, so the page and the server always see the same one */
const BOT_A=['Sleepy','Grumpy','Chubby','Lazy','Sneaky','Dizzy','Hungry','Fluffy','Tiny','Loud'],BOT_B=['Seed Hoarders','Wheel Gang','Cheek Crew','Sawdust Club','Tunnel Rats','Night Shift','Nap Squad','Carrot Thieves','Pellet Party','Cage Kings'];
const BOT_SET={tank:'knight',support:'nurse',mage:'wizard',assassin:'hunter',ranger:'hunter',fighter:'miner'};
const BOT_GEAR=[[0,'n',0],[2,'n',0],[4,'n',0],[4,'r',0],[4,'r',1],[4,'r',2],[4,'e',0],[4,'e',1],[4,'e',2],[4,'e',3],[4,'e',4],[4,'e',5],[4,'l',0],[4,'l',1],[4,'l',2],[4,'l',3],[4,'l',4],[4,'l',5]];
const BOT_MEMO={};
function arenaBot(f){
  if(BOT_MEMO[f])return BOT_MEMO[f];
  const s=seedOf('arena-bot:'+f),k=(f-1)/(ARENA.floors-1),want=ARENA.lowPow*Math.pow(ARENA.topPow/ARENA.lowPow,f/ARENA.floors),lv=Math.round(18+12*Math.min(1,f/18));
  const rars=k<.15?['n']:k<.35?['n','r']:k<.6?['r','e']:k<.85?['r','e','l']:['e','l'];
  const from=test=>{const a=PETS_LIST.filter(p=>rars.includes(p.rar)&&test(p));return a.length?a:PETS_LIST.filter(test);};
  const front=pick(from(p=>p.role==='tank'||p.role==='fighter'),s);
  const a=pick(from(p=>p.id!==front.id&&p.role!=='tank'),s);
  const b=pick(from(p=>p.id!==front.id&&p.id!==a.id&&p.role!=='tank'&&(a.role!=='support'||p.role!=='support')),s);
  let best=null;
  for(let star=1;star<=5;star++)for(const [pieces,rar,plus] of BOT_GEAR){
    const d={bot:true,name:BOT_A[f%10]+' '+BOT_B[Math.floor(f/10)%10],team:[front,a,b].map(p=>({id:p.id,star,lv,branch:null,gear:['weapon','armor','hat','charm'].slice(0,pieces).map(sl=>[sl,BOT_SET[p.role],rar,plus])}))};
    const off=Math.abs(teamPower(snapshotG(d))-want);
    if(!best||off<best.off)best={d,off};
  }
  return BOT_MEMO[f]=best.d;
}
function arenaNode(f){
  const s=seedOf('arena-map:'+f),wx=RULES.filter(r=>r.id!=='clear');
  return {floor:f,arena:true,round:0,work:450,blocks:43,type:'normal',boss:false,hash:'0xarena'+f,t:0,gap:0,enemies:[],rule:rnd(s)<.5?pick(wx,s).id:'clear',map:{t:Math.floor(rnd(s)*MAP_NAMES.length),tone:Math.floor(rnd(s)*TONE_NAMES.length)}};
}
/* the floors a player may attack */
const arenaTargets=mine=>{const out=[];for(let f=mine+1;f<=Math.min(ARENA.floors,mine+ARENA.reach);f++)out.push(f);return out;};
function grantPet(G,rar){
  const s=G.rs;let list=PETS_LIST.filter(p=>p.rar===rar);
  if(G.bags===1){const fresh=list.filter(p=>!G.owned[p.id]);if(fresh.length)list=fresh;}
  const p=pick(list,s),o=G.owned[p.id];
  if(!o){G.owned[p.id]=newPet();return {kind:'pet',id:p.id,rar,fresh:true};}
  if(o.star<5){o.star++;return {kind:'pet',id:p.id,rar,star:o.star};}
  G.coins+=1000;return {kind:'pet',id:p.id,rar,refund:1000};
}
function newItem(G,rar){
  const s=G.rs,it={uid:G.uid++,set:pick(Object.keys(SETS),s),slot:pick(Object.keys(SLOTS),s),rar,plus:0};
  G.items.push(it);return it;
}
/* a chosen pet for coins, so the pet a floor asks for is never only a matter of luck. Epic and Legendary pets stay in bags and chests */
const ADOPT={n:1000,r:3000};
function adopt(G,id){
  const p=PETS[id],cost=p&&ADOPT[p.rar];
  if(!cost||G.owned[id]||G.coins<cost)return false;
  G.coins-=cost;G.owned[id]=newPet();
  if(G.team.length<3)G.team.push(id);
  return true;
}
/* saved teams: the pets and what each one wears, so changing team for a floor takes one tap */
const PRESETS=6;
const savedUids=G=>new Set((G.presets||[]).flatMap(s=>s?Object.values(s.gear).flatMap(g=>Object.values(g)):[]));
function savePreset(G,i){G.presets=G.presets||[];G.presets[i]={team:G.team.slice(),gear:Object.fromEntries(G.team.map(id=>[id,Object.assign({},G.owned[id].gear)]))};}
function usePreset(G,i){
  const s=G.presets&&G.presets[i],team=(s?s.team.filter(id=>G.owned[id]&&sqUsable(G,id)):[]).filter((id,k,a)=>!isSq(id)||a.filter(isSq).indexOf(id)<SQ_MAX);
  if(!team.length)return false;
  G.team=team;
  for(const id of team)for(const slot of Object.keys(SLOTS)){
    const uid=(s.gear[id]||{})[slot];
    if(!uid)unequip(G,id,slot);
    else if(itemByUid(G,uid))equip(G,id,uid);
  }
  return true;
}
function rollBag(s){let x=rnd(s)*100;for(const r of BAG_RATES){if(x<r[2])return r;x-=r[2];}return BAG_RATES[0];}
function openBag(G){
  if(G.coins<BAG_COST)return null;
  G.coins-=BAG_COST;G.bags++;G.pityE++;G.pityL++;
  let r=rollBag(G.rs);
  if(G.bags===1)r=['pet','n',0];
  if(G.pityL>=PITY_L&&r[1]!=='l')r=['item','l',0];
  else if(G.pityE>=PITY_E&&r[1]!=='e'&&r[1]!=='l')r=['item','e',0];
  if(r[1]==='l'){G.pityL=0;G.pityE=0;}else if(r[1]==='e')G.pityE=0;
  if(r[0]==='pet')return grantPet(G,r[1]);
  return {kind:'item',rar:r[1],item:newItem(G,r[1])};
}
function openChest(G,t){
  if(!(G.chests[t]>0))return null;
  G.chests[t]--;
  const c=CHESTS[t],s=G.rs,coins=c.a+Math.floor(rnd(s)*(c.b-c.a+1)),out={kind:'chest',tier:t,coins,rar:'n'};
  G.coins+=coins;
  if(c.pet&&rnd(s)<c.pet){const x=rnd(s),rar=x<.6?'r':x<.92?'e':'l';out.pet=grantPet(G,rar);out.rar=rar;}
  else if(rnd(s)<c.gear){let x=rnd(s)*100,rar='n';for(let i=0;i<4;i++){if(x<c.rars[i]){rar=RAR_ORDER[i];break;}x-=c.rars[i];}out.item=newItem(G,rar);out.rar=rar;}
  return out;
}
const chestTotal=G=>G.chests.reduce((a,b)=>a+b,0);
/* SQK: chests bought with SQK and pouches from boss floors. box is the SQK Chests not opened yet, days the UTC days whose purchase
   was already counted, pouch the floor of each pouch not opened yet, boss the highest boss floor that paid one, earned every SQK
   the pouches gave, in millionths. Whether a purchase happened and what was paid out live on the chain, see lib/sqk.js */
function sqkOf(G){
  const q=G.sqk&&typeof G.sqk==='object'?G.sqk:(G.sqk={});
  q.box=Math.max(0,q.box|0);q.days=Array.isArray(q.days)?q.days:[];q.pouch=Array.isArray(q.pouch)?q.pouch:[];q.boss=Math.max(0,q.boss|0);q.earned=Math.max(0,Math.floor(+q.earned||0));
  return q;
}
const wPick=(w,s)=>{let x=rnd(s)*w.reduce((a,b)=>a+b,0);for(let i=0;i<w.length;i++){if(x<w[i])return i;x-=w[i];}return w.length-1;};
const nIn=(r,s)=>r[0]+Math.floor(rnd(s)*(r[1]-r[0]+1));
/* a purchase is counted once, by the UTC day it was made, since the contract sells one a day to each wallet */
function creditSqkChest(G,day){
  const q=sqkOf(G);
  if(q.days.includes(day))return false;
  q.days.push(day);if(q.days.length>120)q.days=q.days.slice(-120);
  q.box++;
  return true;
}
/* the most items one SQK Chest can add, so it only opens with room for all of them */
const sqkChestRoom=()=>SQK_CHEST.gear.n[1]+SQK_CHEST.bags.n[1];
function openSqkChest(G){
  const q=sqkOf(G);if(!(q.box>0))return null;
  q.box--;lifeAdd(G,'sqkbox',1);
  const s=G.rs,C=SQK_CHEST,out={kind:'sqk',chests:[0,0,0,0,0],food:[],bags:[],gear:[],pet:null};
  for(let i=nIn(C.chests.n,s);i>0;i--){const t=wPick(C.chests.w,s);out.chests[t]++;G.chests[t]++;}
  const low=Math.min(...G.team.map(id=>G.owned[id].lv)),tier=Math.max(0,FOOD_BAGS.findIndex(b=>low>=b.a&&(!b.b||low<b.b)));
  out.foodBag=tier;
  for(let i=nIn(C.food.n,s);i>0;i--){G.coins+=FOOD_BAGS[tier].cost;out.food.push(openFoodBag(G,tier));}
  for(let i=nIn(C.bags.n,s);i>0;i--){G.coins+=BAG_COST;out.bags.push(openBag(G));}
  for(let i=nIn(C.gear.n,s);i>0;i--){const rar=RAR_ORDER[wPick(C.gear.w,s)];out.gear.push({kind:'item',rar,item:newItem(G,rar)});}
  if(rnd(s)<C.pet.p)out.pet=grantPet(G,RAR_ORDER[wPick(C.pet.w,s)]);
  return out;
}
const pouchBand=f=>{let b=null;for(const x of SQK_POUCH.bands)if(f>=x.from)b=x;return b;};
/* every boss floor cleared since the last pouch, oldest first. A wallet that cleared them before pouches existed gets them on its next win */
function grantPouches(G){
  const q=sqkOf(G),got=[],top=Math.floor(G.top/10)*10;
  for(let f=Math.floor(q.boss/10)*10+10;f<=top;f+=10)if(pouchBand(f)){q.pouch.push(f);got.push(f);}
  q.boss=Math.max(q.boss,top);
  return got;
}
/* a pouch from a higher floor pays more, luck picks how much */
function rollPouch(f,s){
  const b=pouchBand(f);if(!b)return null;
  const k=wPick(SQK_POUCH.luck.map(l=>l[1]),s),L=SQK_POUCH.luck[k];
  return {k,amount:Math.round((b.a+(b.b-b.a)*L[0])*SQK_UNIT)};
}
function openPouch(G){
  const q=sqkOf(G);if(!q.pouch.length)return null;
  const f=q.pouch.shift(),r=rollPouch(f,G.rs);
  lifeAdd(G,'pouch',1);
  if(!r)return {kind:'pouch',floor:f,luck:0,amount:0};
  q.earned+=r.amount;
  return {kind:'pouch',floor:f,luck:r.k,amount:r.amount};
}
/* SQK as text, up to 2 decimals */
const sqkText=u=>{const v=Math.round(u/SQK_UNIT*100)/100;return v.toLocaleString('en-US',{maximumFractionDigits:2});};
/* QUESTS: the day's list sits in the save with its progress. The server makes it from the player's id and the day, so it is the same however
   often it is made. got holds the milestones paid, swap whether today's swap is used, sd the social quests done, so when each was opened. The X account lives in x_accounts, see lib/xapi.js */
function questOf(G){
  const q=G.quests&&typeof G.quests==='object'?G.quests:(G.quests={});
  if(!Array.isArray(q.list))q.list=[];if(!Array.isArray(q.got))q.got=[];if(!Array.isArray(q.sd))q.sd=[];if(!q.so||typeof q.so!=='object')q.so={};
  /* life counts what a player did since Patch 1.1, for achievements: Arena fights, Daily tries, sweeps, chests, wheel runs, bags, quests
     claimed, days with the last milestone claimed, gear merges that worked, social quests, SQK Chests and pouches, weeks in the top 10 or first */
  if(!q.life||typeof q.life!=='object'||Array.isArray(q.life))q.life={};
  q.swap=q.swap|0;
  return q;
}
const lifeAdd=(G,k,n)=>{const l=questOf(G).life;l[k]=Math.max(0,Math.floor(+l[k]||0))+Math.max(0,Math.floor(+n||0));};
const questBand=top=>{let i=0;QUEST_BANDS.forEach((b,k)=>{if(top>=b.from)i=k;});return Object.assign({i},QUEST_BANDS[i]);};
/* how many finished quests each milestone needs: one, half and all of them */
const questMs=n=>[...new Set([1,Math.ceil(n/2),n])];
const questMsTp=(n,tp)=>{const ms=questMs(n);return ms.map((m,k)=>tp*(k===ms.length-1?QUEST_MS[2]:k===0?QUEST_MS[0]:QUEST_MS[1]));};
const questDone=x=>x.have>=x.n;
function makeQuest(k,top,band,s,list){
  const d=QUEST_KINDS[k],x={k,n:d.need?d.need[band.i<2?0:band.i<4?1:2]:1,have:0,tp:band.tp*d.x},taken=list.map(y=>y.f).filter(Boolean);
  if(k==='floor'){const lo=Math.max(1,top-12);let f=lo;for(let t=0;t<24;t++){f=lo+Math.floor(rnd(s)*(top-lo+1));if(!taken.includes(f))break;}x.f=f;}
  if(k==='boss'){let f=10;for(let t=0;t<12;t++){f=10*(1+Math.floor(rnd(s)*Math.floor(top/10)));if(!taken.includes(f))break;}x.f=f;}
  return x;
}
const questKinds=(top,max)=>Object.keys(QUEST_KINDS).filter(k=>top>=QUEST_KINDS[k].from&&(k!=='climb'||top<max));
/* different kinds, except that a player past floor 6 may be asked to clear two old floors */
function newQuests(top,max,seed){
  const s=seedOf('quest:'+seed),band=questBand(top),keys=questKinds(top,max),list=[];
  for(let g=0;g<80&&list.length<band.n;g++){
    const k=keys[wPick(keys.map(x=>QUEST_KINDS[x].w),s)],same=list.filter(x=>x.k===k).length;
    if(same&&!(k==='floor'&&same<2&&top>=6))continue;
    list.push(makeQuest(k,top,band,s,list));
  }
  return list;
}
/* ctx is the day, the seed (the player's id and the day) and max, the floors the tower has */
function ensureQuests(G,ctx){
  const q=questOf(G);
  if(q.day!==ctx.day){q.day=ctx.day;q.top=G.top;q.list=newQuests(G.top,ctx.max,ctx.seed);q.got=[];q.swap=0;}
  return q;
}
/* something happened that a quest may count. Returns the quests it finished, whose TP waits for the player to claim it */
function questOn(G,ctx,ev){
  const q=ensureQuests(G,ctx),fin=[];
  if(ev.k!=='win')lifeAdd(G,ev.k,ev.n||1);
  for(const x of q.list){
    if(questDone(x))continue;
    const was=x.have;
    if(ev.k==='win'){
      if((x.k==='floor'||x.k==='boss')&&ev.f===x.f)x.have=1;
      if(x.k==='climb'&&ev.first)x.have=1;
      if(x.k==='wins')x.have++;
    }else if(ev.k===x.k)x.have+=ev.n||1;
    x.have=Math.min(x.n,x.have);
    if(x.have!==was&&questDone(x))fin.push(x);
  }
  return fin;
}
/* a finished quest pays its own TP once, when the player claims it on the Quests screen. The milestones pay on top */
function claimQuestTp(G,ctx,i){
  const q=ensureQuests(G,ctx),x=q.list[i];
  if(!x||!questDone(x)||x.paid)return null;
  x.paid=1;G.tp=(G.tp||0)+(x.tp||0);lifeAdd(G,'quest',1);
  return {q:i,tp:x.tp||0};
}
/* a milestone pays once. sqk says whether this player may get SQK, which a guest or a dev wallet may not */
function claimQuest(G,ctx,i,sqk){
  const q=ensureQuests(G,ctx),ms=questMs(q.list.length),done=q.list.filter(questDone).length;
  if(!(i>=0&&i<ms.length)||q.got.includes(i)||done<ms[i])return null;
  const band=questBand(q.top),tp=questMsTp(q.list.length,band.tp)[i];
  let amount=0;
  if(i===ms.length-1&&band.sqk&&sqk){const L=SQK_POUCH.luck[wPick(SQK_POUCH.luck.map(l=>l[1]),G.rs)];amount=Math.round((band.sqk[0]+(band.sqk[1]-band.sqk[0])*L[0])*SQK_UNIT);sqkOf(G).earned+=amount;}
  G.tp=(G.tp||0)+tp;q.got.push(i);
  if(i===ms.length-1)lifeAdd(G,'days',1);
  return {i,tp,sqk:amount};
}
/* one quest a day may be traded for another kind, for example an Arena quest on a day the Arena never opens */
function swapQuest(G,ctx,i){
  const q=ensureQuests(G,ctx),x=q.list[i];
  if(!x||q.swap>=1||questDone(x))return null;
  const floors=q.list.filter(y=>y.k==='floor').length,keys=questKinds(q.top,ctx.max).filter(k=>k!==x.k&&(!q.list.some(y=>y.k===k)||(k==='floor'&&floors<2&&q.top>=6)));
  if(!keys.length)return null;
  const s=seedOf('quest-swap:'+ctx.seed+':'+i),k=keys[wPick(keys.map(z=>QUEST_KINDS[z].w),s)];
  q.list[i]=makeQuest(k,q.top,questBand(q.top),s,q.list.filter((y,j)=>j!==i));
  q.swap=1;
  return q.list[i];
}
/* a social quest pays its TP, and with its chance some SQK */
function socialReward(G,quest,sqk){
  const q=questOf(G);let amount=0;
  if(sqk&&quest.sqkP>0&&rnd(G.rs)<quest.sqkP)amount=Math.round(Math.round(quest.sqkMax*(.2+.8*rnd(G.rs))*100)/100*SQK_UNIT);
  if(amount)sqkOf(G).earned+=amount;
  G.tp=(G.tp||0)+quest.tp;q.sd.push(quest.id);delete q.so[quest.id];lifeAdd(G,'social',1);
  return {tp:quest.tp,sqk:amount};
}
/* ACHIEVEMENTS: what each one counts, read from the save, see ACHS in shared/data.js. The ids already paid sit in gifts.ach */
const achNeed=a=>a.v||(a.k==='rar'?PETS_LIST.filter(p=>p.rar===a.m).length:PETS_LIST.length);
/* what the goals read from a save, worked out once for the whole list in one pass over the items: the pets, the best plus of a piece
   of each rarity or better, and the full sets each pet wears. A full set is all 4 pieces of one set; it is also a full set of a rarity
   when all 4 are of that rarity */
function achCtx(G){
  const own=Object.keys(G.owned||{}),pets=own.filter(id=>!isSq(id)),worn=new Map(),top=RAR_ORDER.map(()=>-1);
  for(const id of own){const g=G.owned[id].gear||{};for(const s of Object.keys(g))worn.set(g[s],null);}
  for(const it of G.items||[]){const r=RAR_ORDER.indexOf(it.rar);if(r>=0&&(it.plus|0)>top[r])top[r]=it.plus|0;if(worn.has(it.uid))worn.set(it.uid,it);}
  for(let r=top.length-2;r>=0;r--)top[r]=Math.max(top[r],top[r+1]);
  const sets=own.map(id=>{
    const c={},g=G.owned[id].gear||{};
    for(const s of Object.keys(g)){const it=worn.get(g[s]);if(!it)continue;c[it.set]=(c[it.set]||0)+1;c[it.set+'|'+it.rar]=(c[it.set+'|'+it.rar]||0)+1;}
    const full=Object.keys(c).filter(k=>c[k]>=4);
    return {any:full.some(k=>!k.includes('|')),rar:full.filter(k=>k.includes('|')).map(k=>k.split('|')[1])};
  });
  return {own,pets,sets,top};
}
function achHave(G,a,X){
  const {own,pets,sets,top}=X||achCtx(G),O=id=>G.owned[id];
  switch(a.k){
    case 'top':return G.top|0;
    case 'tp':return Math.floor(+G.tp||0);
    case 'pets':return pets.length;
    case 'rar':return pets.filter(id=>PETS[id]&&PETS[id].rar===a.m).length;
    /* a Squeek's stars are its merge level on the chain, so they are not counted here */
    case 'star':return pets.reduce((m,id)=>Math.max(m,O(id).star|0),0);
    case 'stars':return pets.filter(id=>(O(id).star|0)>=a.m).length;
    case 'lv':return own.reduce((m,id)=>Math.max(m,O(id).lv|0),0);
    case 'lvs':return own.filter(id=>(O(id).lv|0)>=a.m).length;
    /* one piece of gear of rarity m or better, at +p or more */
    case 'gear':return top[Math.max(0,RAR_ORDER.indexOf(a.m))]>=(a.p|0)?1:0;
    case 'set4':return sets.filter(s=>a.m?s.rar.includes(a.m):s.any).length;
    case 'wins':return G.wins|0;
    case 'sq':return own.some(id=>isSq(id)&&sqUsable(G,id))?1:0;
    default:return Math.floor(+questOf(G).life[a.k]||0);
  }
}
const achGot=G=>{const g=G.gifts&&typeof G.gifts==='object'?G.gifts:(G.gifts={});if(!Array.isArray(g.ach))g.ach=[];return g.ach;};
const achList=G=>{const X=achCtx(G),got=achGot(G);return ACHS.map(a=>{const need=achNeed(a),have=achHave(G,a,X);return {id:a.id,have:Math.min(have,need),need,done:have>=need,got:got.includes(a.id)};});};
function claimAch(G,id){
  const a=ACHS.find(x=>x.id===id);if(!a)return null;
  const got=achGot(G);if(got.includes(id)||achHave(G,a)<achNeed(a))return null;
  const n=a.r.n||1;got.push(id);G.coins+=a.r.coins||0;G.chests[a.r.chest]+=n;
  return {id,coins:a.r.coins||0,chest:a.r.chest,n};
}
const equippedUids=G=>new Set(Object.values(G.owned).flatMap(o=>Object.values(o.gear)));
function itemName(it){return SETS[it.set].n+' '+SLOTS[it.slot].n+(it.plus?' +'+it.plus:'');}
function equip(G,petId,uid){const it=itemByUid(G,uid);if(!it)return;for(const o of Object.values(G.owned)){if(o.gear[it.slot]===uid)delete o.gear[it.slot];}G.owned[petId].gear[it.slot]=uid;}
function unequip(G,petId,slot){delete G.owned[petId].gear[slot];}
/* MERGE: main item plus 2 items of the same set, slot and rarity. On failure the 2 materials are lost, the main item stays */
const mergeChance=it=>MERGE_RATE[it.plus]||0;
function sameItems(G,it){const eq=equippedUids(G),kept=savedUids(G);return G.items.filter(x=>x.uid!==it.uid&&x.set===it.set&&x.slot===it.slot&&x.rar===it.rar&&!eq.has(x.uid)&&!kept.has(x.uid)).sort((a,b)=>a.plus-b.plus);}
function canMerge(G,it){return it.plus<5&&sameItems(G,it).length>=2;}
function tryMerge(G,uid){
  const it=itemByUid(G,uid);if(!it||!canMerge(G,it))return null;
  const two=sameItems(G,it).slice(0,2).map(x=>x.uid),chance=mergeChance(it);
  G.items=G.items.filter(x=>!two.includes(x.uid));
  const ok=rnd(G.rs)<chance;if(ok){it.plus++;lifeAdd(G,'merge',1);}
  return {ok,plus:it.plus,chance,uid};
}
function mergeAll(G){
  let okN=0,failN=0;const eq=equippedUids(G);
  const groups={};
  for(const it of G.items){const k=it.set+'|'+it.slot+'|'+it.rar;(groups[k]=groups[k]||[]).push(it);}
  for(const k of Object.keys(groups)){
    const main=groups[k].slice().sort((a,b)=>(eq.has(b.uid)?1:0)-(eq.has(a.uid)?1:0)||b.plus-a.plus)[0];
    let guard=0;
    while(canMerge(G,main)&&guard++<200){const r=tryMerge(G,main.uid);if(r.ok)okN++;else failN++;}
  }
  return {okN,failN};
}
function sellPreview(G,rars){const eq=equippedUids(G),kept=savedUids(G);const list=G.items.filter(i=>rars.includes(i.rar)&&!eq.has(i.uid)&&!kept.has(i.uid));return {list,coins:list.reduce((a,i)=>a+RARS[i.rar].sell*(1+i.plus),0)};}
function sellAll(G,rars){const p=sellPreview(G,rars),set=new Set(p.list.map(i=>i.uid));G.items=G.items.filter(i=>!set.has(i.uid));G.coins+=p.coins;return p;}
/* LEVELS: coins buy food bags, food fills a hamster, a hamster at 100% runs the wheel for random XP.
   A bigger hamster has a bigger stomach and each level takes a few more runs, so levels cost more and more food */
const stomach=lv=>Math.round((60+TUNE.foodA*Math.pow(lv-1,TUNE.foodP))/5)*5;
const runXp=lv=>100+10*(lv-1);
const xpNeed=lv=>Math.round(runXp(lv)*(TUNE.xpA+TUNE.xpB*Math.sqrt(lv))/5)*5;
const luckAvg=RUN_LUCK.reduce((a,l)=>a+l.x*l.p/100,0);
/* the chance in percent of one food from one bag */
function foodRate(b,f){
  const i=RAR_ORDER.indexOf(f.rar),w=FOODS_LIST.filter(x=>x.rar===f.rar).reduce((a,x)=>a+x.w,0);
  return b.rars[i]*f.w/w;
}
function rollFood(s,b){
  let x=rnd(s)*100,rar=RAR_ORDER[0];
  for(let i=0;i<4;i++){if(x<b.rars[i]){rar=RAR_ORDER[i];break;}x-=b.rars[i];}
  const list=FOODS_LIST.filter(f=>f.rar===rar);
  let y=rnd(s)*list.reduce((a,f)=>a+f.w,0);
  for(const f of list){if(y<f.w)return f;y-=f.w;}
  return list[0];
}
function openFoodBag(G,t){
  const b=FOOD_BAGS[t];if(G.coins<b.cost)return null;
  G.coins-=b.cost;
  const f=rollFood(G.rs,b);
  G.foods[f.id]=(G.foods[f.id]||0)+1;
  return {kind:'food',id:f.id,rar:f.rar};
}
function eatFood(G,o,f,k){
  G.foods[f.id]-=k;if(G.foods[f.id]<=0)delete G.foods[f.id];
  o.full=Math.min(stomach(o.lv),o.full+f.fill*k);
}
/* feed one kind of food, stops as soon as the hamster is full */
function feedPet(G,id,fid,n){
  const o=G.owned[id],f=FOODS[fid],cap=stomach(o.lv),k=Math.min(n,G.foods[fid]||0,Math.ceil((cap-o.full)/f.fill));
  if(k<=0)return 0;
  eatFood(G,o,f,k);
  return k;
}
/* which foods fill this hamster with the least waste: the biggest that fit, then the smallest that tops it up, unless it wastes too much */
function feedPlan(foods,full,cap){
  const plan=[];let need=cap-full;
  const list=FOODS_LIST.filter(f=>foods[f.id]>0).sort((a,b)=>b.fill-a.fill),left={};
  for(const f of list){
    const k=Math.min(foods[f.id],Math.floor(need/f.fill));
    left[f.id]=foods[f.id]-k;
    if(k>0){plan.push([f.id,k]);need-=f.fill*k;}
  }
  if(need>0){
    const f=list.slice().reverse().find(x=>left[x.id]>0&&x.fill>=need&&x.fill-need<=Math.max(cap,x.fill)/2);
    if(f){const had=plan.find(p=>p[0]===f.id);if(had)had[1]++;else plan.push([f.id,1]);need=0;}
  }
  return {plan,fills:need<=0,count:plan.reduce((a,p)=>a+p[1],0)};
}
function autoFeed(G,id){
  const o=G.owned[id],p=feedPlan(G.foods,o.full,stomach(o.lv));
  for(const [fid,k] of p.plan)eatFood(G,o,FOODS[fid],k);
  return p.count;
}
/* a hamster below your strongest gains more XP from a run, so raising the right pets for a floor does not cost what the first team did */
const catchUp=(G,o)=>{const top=Object.values(G.owned).reduce((a,p)=>Math.max(a,p.lv),1);return 1+TUNE.catchUp*(top-o.lv)/top;};
function rollLuck(s){let x=rnd(s)*100;for(let i=0;i<RUN_LUCK.length;i++){if(x<RUN_LUCK[i].p)return i;x-=RUN_LUCK[i].p;}return 1;}
function runWheel(G,id){
  const o=G.owned[id],lv0=o.lv;
  if(o.full<stomach(o.lv))return null;
  const luck=rollLuck(G.rs),xp=Math.round(runXp(o.lv)*RUN_LUCK[luck].x*(.9+rnd(G.rs)*.2)*catchUp(G,o));
  o.full=0;o.xp+=xp;
  while(o.xp>=xpNeed(o.lv)){o.xp-=xpNeed(o.lv);o.lv++;}
  return {luck,xp,lv0,lv:o.lv};
}
/* use all the food in one go: feed to full and run, again and again */
function trainAll(G,id,max){
  const o=G.owned[id],out={runs:0,xp:0,lv0:o.lv,lv:o.lv,foods:0,best:0};
  while(out.runs<max){
    if(o.full<stomach(o.lv))out.foods+=autoFeed(G,id);
    const r=runWheel(G,id);if(!r)break;
    out.runs++;out.xp+=r.xp;out.lv=r.lv;if(RUN_LUCK[r.luck].x>RUN_LUCK[out.best].x)out.best=r.luck;
  }
  return out;
}
