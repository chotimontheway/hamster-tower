/* QUESTS: today's list, its progress and the milestones paid come with the save (G.quests, G.tp). Social quests, the time to the next list
   and whether this player may get SQK come from /api/quests. The dev wallet also gets a screen to write social quests.
   Loaded before ui.js: only the listener below runs on load, everything else runs later */
const QK={data:null,at:0,loading:false,admin:null,edit:null,del:null,open:{}};
/* a new player in this tab starts with nothing of the last one's quests, social list or admin screen */
function questReset(){Object.assign(QK,{data:null,at:0,loading:false,admin:null,edit:null,del:null,open:{}});Object.assign(QW,{pub:null,me:null,at:0,loading:false});Object.assign(AL,{init:false,on:false,arena:true,quests:true,busy:false,why:''});UI.qtab='daily';}
/* WEEKLY TP BOARD: this week's board and the player's place, read when its tab opens and again after half a minute, see lib/tpweek.js */
const QW={pub:null,me:null,at:0,loading:false};
/* today's list. The server's day counts: a list it sent is today's until its own midnight, even when this device's clock is a little off */
const qToday=()=>{
  const q=G&&G.quests;if(!q||!Array.isArray(q.list))return null;
  const d=QK.data,sent=d&&d.state&&d.state.quests;
  if(sent&&sent.day===q.day&&d.reset>0)return Date.now()-QK.at<d.reset*1000?q:null;
  return q.day===dayKey(Date.now())?q:null;
};
function qMs(q){const n=q.list.length,ms=questMs(n),tps=questMsTp(n,questBand(q.top).tp);return ms.map((need,i)=>({i,need,tp:tps[i],last:i===ms.length-1}));}
function questClaimable(){const q=qToday();if(!q)return false;const done=q.list.filter(questDone).length;return q.list.some(x=>questDone(x)&&!x.paid)||qMs(q).some(m=>done>=m.need&&!q.got.includes(m.i));}
async function loadQuests(force){
  if(QK.loading||(!force&&QK.data&&Date.now()-QK.at<30000))return;
  QK.loading=true;
  const who=PLAYER&&PLAYER.id;
  try{const j=await api('/api/quests');if(!PLAYER||PLAYER.id!==who)return;if(j.state)applyState(j.state);QK.data=j;QK.at=Date.now();}
  catch(e){if(PLAYER&&PLAYER.id===who)fail(e);}
  finally{QK.loading=false;}
  if((UI.view==='quests'||UI.view==='qadmin')&&!SP)render();
}
const QTXT={floor:x=>`Clear floor ${x.f}`,boss:x=>`Beat the boss of floor ${x.f}`,climb:()=>'Clear a new floor',wins:x=>`Win ${x.n} battles in the tower`,arena:()=>'Fight in the Arena Tower',daily:()=>'Play the Daily Challenge',sweep:()=>'Use the Daily Sweep',chests:x=>`Open ${x.n} chests`,wheel:x=>x.n>1?`Run the wheel ${x.n} times`:'Run the wheel once',bag:()=>'Open a blind bag'};
const questText=x=>(QTXT[x.k]||(()=>x.k))(x);
const QHINT={floor:'A floor you cleared, a replay counts',boss:'A replay counts',climb:'The next floor up',wins:'Any floor, replays count',arena:'Open while the real hamster runs. A lost fight counts too',daily:'One try counts, won or lost',sweep:'On the Tower screen, once a day',chests:'From your inventory',wheel:'Feed a hamster to 100%, then run',bag:'In the Shop'};
function questArt(x){
  if(x.k==='floor'||x.k==='boss'){const n=FLOORS[x.f-1];return n?artOf(n.enemies[0]):'nav_tower';}
  return {climb:'nav_tower',wins:'win_pet',arena:'arena',daily:'chest_3',sweep:'chest_1',chests:'chest_2',wheel:'wheel_big',bag:'bag'}[x.k]||'nav_quest';
}
function questGo(x){
  if(x.k==='floor'||x.k==='boss')return `data-act="sheet" data-type="floor" data-f="${x.f}"`;
  if(x.k==='climb')return `data-act="sheet" data-type="floor" data-f="${Math.min(G.top+1,FLOORS.length)}"`;
  return {arena:'data-act="nav" data-v="arena"',chests:'data-act="to-chests"',wheel:'data-act="nav" data-v="team"',bag:'data-act="nav" data-v="shop"'}[x.k]||'data-act="nav" data-v="tower"';
}
const resetIn=()=>{const s=QK.data?Math.max(0,QK.data.reset-Math.floor((Date.now()-QK.at)/1000)):0;return Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m';};

/* SCREEN */
/* four parts side by side, on one line even on a small phone: today's quests, the social quests on X, the weekly TP board and the achievements */
const QTABS=[['daily','Daily'],['social','Social'],['week','Weekly'],['ach','Achievements']];
/* a social quest opened on X and not done yet waits to be checked and claimed */
const socialClaimable=()=>{const d=QK.data;if(!G||!d||!d.socialOn||!Array.isArray(d.social))return false;const sd=(G.quests&&G.quests.sd)||[];return d.social.some(s=>!sd.includes(s.id)&&openedAt(s.id)>0);};
function viewQuests(){
  const tab=UI.qtab||'daily',dot=k=>(k==='daily'?questClaimable():k==='social'?socialClaimable():k==='ach'?achClaimable():!!(QW.me&&QW.me.unclaimed))?'<i class="dot" aria-hidden="true"></i>':'';
  const head=`<div class="head-row"><h1>Quests</h1><span class="tp-pill num" title="Tower Points">${pic('tp','')}${fmt(G.tp||0)} TP</span></div>
    <div class="tabs q-tabs" role="group" aria-label="Quest sections">${QTABS.map(([k,l])=>`<button class="chipb${tab===k?' on':''}" data-act="q-tab" data-k="${k}"${tab===k?' aria-pressed="true"':' aria-pressed="false"'}>${l}${dot(k)}</button>`).join('')}</div>`;
  if(tab==='week')return head+questWeek();
  if(tab==='ach')return head+questAch();
  if(!QK.data||Date.now()-QK.at>30000)loadQuests();
  const d=QK.data;
  if(tab==='social')return head+(d?questSocial(d)+(d.dev?'<div class="btns"><button class="btn ghost" data-act="q-admin">Manage social quests</button></div>':''):'<section class="box"><p class="note">Loading social quests...</p></section>');
  const q=qToday();
  if(!q)return head+'<section class="box"><p class="note">Loading today\'s quests...</p></section>';
  return head+questDaily(q,d)+alertsBox();
}
/* ALERTS: a message from the browser when the Arena opens and a reminder of unclaimed daily quests, see lib/alerts.js and client/sw.js.
   Asked for only when the player presses the button, and the box says what it needs when this browser cannot do it */
const AL={init:false,on:false,arena:true,quests:true,busy:false,why:''};
const alertsOk=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const alertsIos=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const alertsHome=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){return false;}};
const keyBytes=t=>{const p=t.replace(/-/g,'+').replace(/_/g,'/'),b=atob(p+'='.repeat((4-p.length%4)%4));return Uint8Array.from(b,c=>c.charCodeAt(0));};
const alertsHelp=p=>p==='denied'?'Notifications are blocked for this site. Click the icon left of the address (the lock or settings icon), set Notifications to Allow, then press the button again.':'Your browser did not show the question. Click the bell or lock icon in the address bar, choose Allow for Notifications, then press the button again.';
async function alertsSub(){const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;return {reg,sub:await reg.pushManager.getSubscription()};}
/* what this browser already has, read once when the box first shows */
async function alertsLoad(){
  if(AL.init||!alertsOk())return;AL.init=true;
  try{
    const {sub}=await alertsSub();
    if(sub&&Notification.permission==='granted'){const j=await api('/api/push/status',{endpoint:sub.endpoint});if(j.on){AL.on=true;AL.arena=j.arena;AL.quests=j.quests;}}
  }catch(e){}
  if(UI.view==='quests'&&UI.qtab==='daily'&&!SP)render();
}
function alertsBox(){
  if(!alertsOk())return alertsIos()&&!alertsHome()?`<section class="box al-box"><div class="head-row">${pic('bell','','al-bell')}<h2 style="flex:1 1 auto">Alerts</h2></div><p class="note">To get alerts on an iPhone, press Share, choose Add to Home Screen, then open Hamster Tower from the new icon.</p></section>`:'';
  alertsLoad();
  const tg=(k,t)=>`<button class="chipb${AL[k]?' on':''}" data-act="al-pref" data-k="${k}" aria-pressed="${AL[k]}">${t}</button>`;
  return `<section class="box al-box"><div class="head-row">${pic('bell','','al-bell')}<h2 style="flex:1 1 auto">Alerts</h2><span class="pill">${AL.on?'On':'Off'}</span></div>
    <p class="note">Get a message when the Arena opens, and a reminder of unclaimed daily quests in the evening. Free, and you can turn them off any time.</p>
    ${AL.on?`<div class="tabs">${tg('arena','Arena opens')}${tg('quests','Quest reminder')}</div><div class="btns"><button class="btn ghost" data-act="al-off"${AL.busy?' disabled':''}>Turn off alerts</button></div>`
    :`<div class="btns"><button class="btn" data-act="al-on"${AL.busy?' disabled':''}>Turn on alerts</button></div>`}
    ${AL.why?`<p class="note al-why">${esc(AL.why)}</p>`:''}</section>`;
}
function questDaily(q,d){
  const band=questBand(q.top),ms=qMs(q),done=q.list.filter(questDone).length,sqk=!!(d&&d.sqk&&band.sqk),n=q.list.length;
  const next=QUEST_BANDS.find(b=>b.from>q.top);
  const track=ms.map(m=>{
    const got=q.got.includes(m.i),ready=done>=m.need&&!got;
    return `<div class="qm${got?' got':ready?' ready':''}" style="--at:${(m.need/n)*100}%">
      <span class="qm-gem">${pic(m.last?'chest_4':'tp','')}</span>
      <b class="num">+${fmt(m.tp)} TP${m.last&&sqk?' + SQK':''}</b>
      ${got?'<span class="qm-ok">Claimed</span>':ready?`<button class="btn sm" data-act="q-claim" data-i="${m.i}">Claim</button>`:`<small class="num">${m.need} quest${m.need>1?'s':''}</small>`}
    </div>`;}).join('');
  const cards=q.list.map((x,i)=>{
    const ok=questDone(x),w=Math.round(x.have/x.n*100);
    return `<div class="qcard${ok?' done':''}${ok&&!x.paid?' ready':''}" style="animation-delay:${i*50}ms">
      <span class="qc-pic">${picL(questArt(x),'')}</span>
      <span class="qc-tx"><b>${questText(x)}</b><small>${QHINT[x.k]||''}</small><span class="qbar" aria-hidden="true"><i style="width:${w}%"></i></span><small class="num">${x.have} of ${x.n}</small></span>
      <span class="qc-side"><em class="num">+${fmt(x.tp)} TP</em>${ok?(x.paid?'<span class="qc-ok">Claimed</span>':`<button class="btn sm" data-act="q-take" data-i="${i}">Claim</button>`):`<button class="btn sm" ${questGo(x)}>Go</button>${q.swap?'':`<button class="chipb" data-act="q-swap" data-i="${i}" title="Trade this quest for another kind, once a day">Swap</button>`}`}</span>
    </div>`;}).join('');
  const more=next?`Reach floor ${next.from} for ${next.n} quests a day at ${next.tp} TP each${next.sqk&&!band.sqk?', and SQK at the last milestone':''}.`:'You get the most quests and TP there are.';
  return `<section class="box qd">
    <div class="head-row"><h2 style="flex:1 1 auto">Daily quests</h2><span class="pill num">New list in ${resetIn()}</span></div>
    <div class="qtrack" aria-label="Milestones"><span class="qline"><i style="width:${(done/n)*100}%"></i></span>${track}</div>
    <div class="qlist">${cards}</div>
    <p class="note">${n} quests today at floor ${q.top}. ${more} ${band.sqk?(d&&d.sqk?'The last milestone also pays a little SQK.':PLAYER&&PLAYER.dev?'A dev wallet earns no SQK here, DEV_SQK is off.':PLAYER&&PLAYER.wallet?'SQK opens once the SQK contract is set.':'Sign in with a wallet to get SQK at the last milestone.'):`SQK at the last milestone starts at floor ${QUEST_BANDS.find(b=>b.sqk).from}, for wallets.`} ${q.swap?'You used today\'s swap.':'You can swap one unfinished quest a day.'}</p>
  </section>`;
}
/* the link a quest opens: X's own pages for following, liking, reposting, replying and posting */
function socialLink(s){
  const id=(/status\/(\d+)/.exec(s.url)||[])[1],name=(/x\.com\/([A-Za-z0-9_]{1,15})/.exec(s.url)||[])[1];
  if(s.kind==='follow'&&name)return 'https://x.com/intent/follow?screen_name='+name;
  if(s.kind==='like'&&id)return 'https://x.com/intent/like?tweet_id='+id;
  if(s.kind==='repost'&&id)return 'https://x.com/intent/retweet?tweet_id='+id;
  if(s.kind==='comment'&&id)return 'https://x.com/intent/tweet?in_reply_to='+id;
  return 'https://x.com/intent/tweet?text='+encodeURIComponent(s.need.join(' ')+' '+SITE_URL);
}
const openedAt=id=>QK.open[id]||(G.quests&&G.quests.so&&G.quests.so[id])||0;
/* until the server opens social quests, their place only says what is coming */
function questSoon(){
  return `<section class="box qsoc qsoon">
    <div class="qsoon-in">${pic('x_logo','','qsoon-x')}
      <div><span class="qsoon-tag">Coming soon</span><h2>Social quests</h2>
      <p>Follow, like, repost, reply and post on X to earn Tower Points, with a chance of a little SQK.</p></div>
    </div>
  </section>`;
}
function questSocial(d){
  if(!d)return '';
  if(!d.socialOn)return questSoon();
  const list=d.social,Q=G.quests||{},sd=Q.sd||[],sqk=!!d.sqk,xa=d.x&&/^[A-Za-z0-9_]{1,15}$/.test(d.x.username||'')?d.x:null;
  /* the account the checks read, connected through X's own sign in */
  const link=xa?`<div class="qx-link on"><span>${pic('x_logo','')}Connected as <b>@${esc(xa.username)}</b></span><button class="chipb" data-act="x-off">Disconnect</button></div>`
    :`<div class="qx-link"><p>Connect your X account so the game can see your follows, likes, reposts, replies and posts. It only reads, it never posts for you.</p><button class="btn sm" data-act="x-on"${d.xReady?'':' disabled'}>${d.xReady?'Connect X':'Connecting X is not set up yet'}</button></div>`;
  const cards=list.map((s,i)=>{
    const done=sd.includes(s.id),opened=openedAt(s.id),wait=opened?Math.max(0,6000-(Date.now()-opened)):0;
    if(wait)setTimeout(()=>{if(UI.view==='quests'&&!SP)render();},wait+50);
    const act=done?'<span class="qc-ok">Done</span>':!opened?`<a class="btn sm" href="${esc(socialLink(s))}" target="_blank" rel="noopener noreferrer" data-act="q-open" data-id="${s.id}">Open on X</a>`:
      `<button class="btn sm" data-act="q-done" data-id="${s.id}"${wait||!xa?' disabled':''}>${wait?'Wait a moment':xa?'Check and claim':'Connect X first'}</button><a class="chipb" href="${esc(socialLink(s))}" target="_blank" rel="noopener noreferrer">Open again</a>`;
    return `<div class="scard${done?' done':''}" style="animation-delay:${i*50}ms">
      <span class="sc-pic">${pic('x_logo','')}</span>
      <span class="sc-tx"><span class="sc-kind k-${s.kind}">${SOCIAL_KINDS[s.kind]?SOCIAL_KINDS[s.kind].n:s.kind}</span><b>${esc(s.title)}</b>${s.need.length?`<small>Include ${esc(s.need.join(' '))}</small>`:''}</span>
      <span class="sc-rw"><em class="num">+${fmt(s.tp)} TP</em>${sqk&&s.sqkP>0?`<small class="num">${Math.round(s.sqkP*100)}% chance of SQK</small>`:''}</span>
      <div class="sc-act">${act}</div>
    </div>`;}).join('');
  return `<section class="box qsoc">
    <div class="head-row"><h2 style="flex:1 1 auto">Social quests</h2>${pic('x_logo','','qs-x')}</div>
    ${link}
    ${list.length?`<div class="slist">${cards}</div>`:'<p class="note">No social quests right now. New ones appear here.</p>'}
    <p class="note">Open a quest on X, do it, then come back and claim. The game reads your connected X account to see it, so it must be done from that account.</p>
  </section>`;
}

/* ADMIN: only the dev wallet, the server checks it on every call */
async function loadAdmin(){
  try{QK.admin=await api('/api/admin/social');}catch(e){QK.admin={err:e.message||'Could not load'};}
  if(UI.view==='qadmin'&&!SP)render();
}
const qaBlank=()=>({id:null,kind:'like',title:'',url:'',need:'',tp:SOCIAL_KINDS.like.tp,sqkP:SOCIAL_SQK.p,sqkMax:SOCIAL_SQK.max,starts:null,ends:null,active:true});
const dtIn=t=>{if(!t)return '';const d=new Date(t*1000),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;};
function viewQAdmin(){
  if(!PLAYER||!PLAYER.dev)return '<section class="box"><h1>Not allowed</h1><p>Only the dev wallet can open this screen.</p></section>';
  if(!QK.admin){loadAdmin();return '<div class="head-row"><h1>Social quests</h1></div><section class="box"><p class="note">Loading...</p></section>';}
  if(QK.admin.err)return `<div class="head-row"><h1>Social quests</h1></div><section class="box"><p>${esc(QK.admin.err)}</p></section>`;
  const e=QK.edit||(QK.edit=qaBlank()),A=QK.admin,kinds=Object.keys(SOCIAL_KINDS);
  const form=`<section class="box qa-form"><h2>${e.id?'Edit quest #'+e.id:'New social quest'}</h2>
    <div class="qa-grid">
      <label>Task<select id="qa-kind">${kinds.map(k=>`<option value="${k}"${k===e.kind?' selected':''}>${SOCIAL_KINDS[k].n}</option>`).join('')}</select></label>
      <label class="wide">Title players see<input id="qa-title" maxlength="90" value="${esc(e.title)}" placeholder="Like our newest post"></label>
      <label class="wide">${e.kind==='follow'?'X account to follow, @name or its link':e.kind==='post'?'Link (not needed for a post)':'Link of the post on X'}<input id="qa-url" value="${esc(e.url)}" placeholder="${e.kind==='follow'?'@yourname':'https://x.com/name/status/123'}"${e.kind==='post'?' disabled':''}></label>
      <label class="wide">Tags and hashtags the post must carry${e.kind==='post'?'':' (posts only)'}<input id="qa-need" value="${esc(e.need)}" placeholder="@yourname #HamsterTower"${e.kind==='post'?'':' disabled'}></label>
      <label>Tower Points<input id="qa-tp" type="number" min="0" max="1000" value="${e.tp}"></label>
      <label>SQK chance, %<input id="qa-p" type="number" min="0" max="100" value="${Math.round(e.sqkP*100)}"></label>
      <label>Most SQK<input id="qa-max" type="number" min="0" max="100" step="0.1" value="${e.sqkMax}"></label>
      <label>Starts, optional<input id="qa-starts" type="datetime-local" value="${dtIn(e.starts)}"></label>
      <label>Ends, optional<input id="qa-ends" type="datetime-local" value="${dtIn(e.ends)}"></label>
      <label class="qa-check"><input id="qa-active" type="checkbox"${e.active?' checked':''}> Live on the site</label>
    </div>
    <div class="btns"><button class="btn" data-act="qa-save">${e.id?'Save changes':'Add quest'}</button><button class="btn ghost" data-act="qa-new">${e.id?'Cancel':'Clear'}</button></div>
    <p class="note">The SQK chance is rolled for each player who claims. A guest never gets SQK, and a dev wallet only where DEV_SQK allows it. The SQK comes from the reward pool, so it waits for a claim like a pouch.</p>
  </section>`;
  const now=Date.now()/1000,stateOf=x=>!x.active?['off','Paused']:x.ends&&x.ends<=now?['off','Ended']:x.starts&&x.starts>now?['soon','Starts '+TIME_STR(x.starts)]:['live','Live'];
  const rows=A.quests.map(x=>{const st=stateOf(x);return `<div class="qa-row${st[0]==='off'?' off':''}">
      <span class="sc-kind k-${x.kind}">${SOCIAL_KINDS[x.kind]?SOCIAL_KINDS[x.kind].n:x.kind}</span>
      <span class="qa-tx"><b>${esc(x.title)} <i class="qa-st ${st[0]}">${st[1]}</i></b><small class="num">#${x.id}, ${fmt(x.tp)} TP, ${Math.round(x.sqkP*100)}% of up to ${x.sqkMax} SQK, done ${fmt(x.done)} times${x.ends?', ends '+TIME_STR(x.ends):''}</small>${x.url?`<a class="num" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a>`:''}${x.need.length?`<small>${esc(x.need.join(' '))}</small>`:''}</span>
      <span class="qa-btns"><button class="chipb" data-act="qa-edit" data-id="${x.id}">Edit</button><button class="chipb" data-act="qa-toggle" data-id="${x.id}">${x.active?'Pause':'Resume'}</button><button class="chipb${QK.del===x.id?' warn':''}" data-act="qa-del" data-id="${x.id}">${QK.del===x.id?'Tap again to delete':'Delete'}</button></span>
    </div>`;}).join('');
  const recent=A.recent.map(r=>`<div class="qa-rec"><span class="num">#${r.quest}</span><span class="num qa-who">${esc(r.who)}</span><span class="num">+${fmt(r.tp)} TP${r.sqk?' +'+sqkText(r.sqk)+' SQK':''}</span>${r.proof?`<a href="${esc(r.proof)}" target="_blank" rel="noopener noreferrer">Post</a>`:'<span></span>'}<small class="num">${TIME_STR(r.at)}</small></div>`).join('');
  return `<div class="head-row"><h1>Social quests</h1><button class="chipb" data-act="q-back">Back to Quests</button></div>
    ${A.socialOn?'':'<p class="qa-off">Players see Coming soon for now. Quests written here wait, and show once SOCIAL_QUESTS=1 is set on the server.</p>'}
    ${form}
    <section class="box"><h2>All quests (${A.quests.length})</h2>${rows?`<div class="qa-list">${rows}</div>`:'<p class="note">None yet.</p>'}</section>
    <section class="box"><h2>Latest claims</h2>${recent?`<div class="qa-recent">${recent}</div>`:'<p class="note">Nobody claimed a social quest yet.</p>'}</section>`;
}
function qaRead(){
  const v=id=>{const el=$('#'+id);return el?el.value:'';},when=s=>s?Math.floor(new Date(s).getTime()/1000):null;
  return {kind:v('qa-kind'),title:v('qa-title'),url:v('qa-url'),need:v('qa-need'),tp:Number(v('qa-tp')),sqkP:Number(v('qa-p'))/100,sqkMax:Number(v('qa-max')),starts:when(v('qa-starts')),ends:when(v('qa-ends')),active:!!($('#qa-active')&&$('#qa-active').checked)};
}
/* a new task fills in its usual TP, and keeps what was typed so far */
document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='qa-kind'&&QK.edit){const keep=qaRead();Object.assign(QK.edit,keep,{kind:e.target.value,tp:SOCIAL_KINDS[e.target.value].tp});render();}
});

async function loadWeek(force){
  if(QW.loading||(!force&&QW.pub&&Date.now()-QW.at<30000))return;
  QW.loading=true;
  const who=PLAYER&&PLAYER.id;
  try{
    /* the week in the address means the CDN never keeps last week's board past Monday */
    const [pub,me]=await Promise.all([api('/api/tpweek?w='+weekKey(Date.now())),api('/api/tpweek/me')]);
    if(!PLAYER||PLAYER.id!==who)return;
    QW.pub=pub;QW.me=me;QW.at=Date.now();
    if(me.unclaimed)await claimWeek();
  }catch(e){if(PLAYER&&PLAYER.id===who)fail(e);}
  finally{QW.loading=false;}
  if(UI.view==='quests'&&UI.qtab==='week'&&!SP)render();
}
/* a finished week pays its top 10 wallets the next time they open the game, the sheet waits like the Daily Challenge's */
async function weekCheck(){
  const who=PLAYER&&PLAYER.id;if(!who)return;
  try{const me=await api('/api/tpweek/me');if(!PLAYER||PLAYER.id!==who)return;QW.me=me;if(me.unclaimed)await claimWeek();}catch(e){}
}
async function claimWeek(){
  const j=await api('/api/tpweek/claim',{});
  if(j.state)applyState(j.state);
  if(QW.me)QW.me.unclaimed=false;
  if(j.prizes&&j.prizes.length){UI.prizesWaiting=(UI.prizesWaiting||[]).concat(j.prizes.map(p=>Object.assign({week:p.week},p)));showPrizes();}
  else if(j.state&&!UI.sheet&&!BT&&!SP)render();
}
const weekLeft=ends=>{const s=Math.max(0,ends-Math.floor(Date.now()/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600);return d?`${d}d ${h}h`:`${h}h ${Math.floor(s%3600/60)}m`;};
const weekDay=k=>new Date(k+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const prizeText=p=>`${p.n>1?p.n+' '+CHESTS[p.chest].n+'s':'1 '+CHESTS[p.chest].n}, ${p.bags} blind bags, ${p.food} food bags`;
function questWeek(){
  if(!QW.pub||Date.now()-QW.at>30000)loadWeek();
  const p=QW.pub,m=QW.me;
  if(!p)return '<section class="box"><p class="note">Loading the weekly board...</p></section>';
  const me=m?`<div class="wk-me"><span class="wk-tp">${pic('tp','')}<b class="num">${fmt(m.tp)} TP</b> this week</span><span class="num">${m.dev?'A dev wallet is not ranked':m.rank?`Rank ${fmt(m.rank)}${m.wallet?'':', sign in with a wallet to be paid'}`:'Claim quest TP to get on the board'}</span></div>`:'';
  const rows=p.top.map((r,i)=>`<li class="${PLAYER&&r.id===PLAYER.id?'me':''}"><b class="num">${i+1}</b>${rankName(r,'w'+i)}<span class="rk-floor num">${fmt(r.tp)} TP</span></li>`).join('');
  const won=p.last&&p.last.winners&&p.last.winners.length?`<section class="box"><h2>Last week's winners</h2><p class="note">The week of ${weekDay(p.last.week)}. These wallets were paid.</p>
    <ol class="rank">${p.last.winners.map((r,i)=>`<li class="${PLAYER&&r.id===PLAYER.id?'me':''}"><b class="num">${i+1}</b>${rankName(r,'l'+i)}<span class="rk-floor num">${fmt(r.tp)} TP</span></li>`).join('')}</ol></section>`:'';
  return `<section class="box wk">
    <div class="head-row"><h2 style="flex:1 1 auto">Weekly TP board</h2><span class="pill num">Resets in ${weekLeft(p.ends)}</span></div>
    <p class="note">Every Tower Point you claim from a quest or a milestone this week counts. The board starts over every Monday at 00:00 UTC.</p>
    ${me}
    ${rows?`<ol class="rank">${rows}</ol>`:'<p class="empty-note">Nobody has claimed TP this week yet. Claim yours to lead.</p>'}
    ${p.total>p.top.length?`<p class="note num">${fmt(p.total)} players on the board this week.</p>`:''}
  </section>
  <section class="box"><h2>Weekly rewards</h2>
    <ul class="wk-prizes">${p.prizes.map((x,i)=>`<li><b class="num">${i===0?'Rank 1':`Ranks ${p.prizes[i-1].to+1} to ${x.to}`}</b><span>${prizeText(x)}</span></li>`).join('')}</ul>
    <p class="note">Only wallets are paid: a guest on the board is skipped and the next wallet moves up. The rewards arrive the next time you open the game after the week ends.</p></section>
  ${won}`;
}
/* ACHIEVEMENTS: goals that last, read from the save with the same code as the server, see ACHS in shared/data.js */
const achClaimable=()=>!!G&&achList(G).some(a=>a.done&&!a.got);
function questAch(){
  const L=achList(G),S={},order=s=>s.done&&!s.got?0:s.got?2:1;
  ACHS.forEach((a,i)=>{S[a.id]=L[i];});
  const card=a=>{const s=S[a.id];return `<div class="ach${s.got?' got':s.done?' ready':''}"><span class="ach-pic">${picL(a.art,'')}</span>
    <span class="ach-tx"><b>${a.n}</b><small>${a.d}</small>${s.got?'':`<span class="qbar" aria-hidden="true"><i style="width:${Math.round(s.have/s.need*100)}%"></i></span><small class="num">${fmt(s.have)} of ${fmt(s.need)}</small>`}</span>
    <span class="ach-side"><em class="num">${fmt(a.r.coins)} coins, ${a.r.n>1?a.r.n+' '+CHESTS[a.r.chest].n+'s':CHESTS[a.r.chest].n}</em>${s.got?'<span class="qc-ok">Claimed</span>':s.done?`<button class="btn sm" data-act="ach-claim" data-id="${a.id}">Claim</button>`:''}</span></div>`;};
  /* in each group: ready to claim first, then the goals still open in the order they come, the claimed ones last */
  const groups=ACH_GROUPS.map(g=>{
    const list=ACHS.filter(a=>g.k.includes(a.k)).sort((x,y)=>order(S[x.id])-order(S[y.id]));
    return `<div class="ach-g"><div class="sec-t">${g.n} <small class="num">${list.filter(a=>S[a.id].got).length} of ${list.length}</small></div><div class="ach-list">${list.map(card).join('')}</div></div>`;
  }).join('');
  const ready=L.filter(s=>s.done&&!s.got).length;
  return `<section class="box">
    <div class="head-row"><h2 style="flex:1 1 auto">Achievements</h2><span class="pill num">${L.filter(x=>x.got).length} of ${ACHS.length}</span></div>
    <p class="note">Goals that last, each paid once. Your badges show on your profile. Floors, wins, pets, gear and Tower Points count from the start, everything else from Patch 1.1 on.${ready?` <b class="num">${ready} ready to claim.</b>`:''}</p>
    ${groups}</section>`;
}
function questBurst(t,color){if(!t)return;const b=t.getBoundingClientRect();FX.burst(b.left+b.width/2,b.top+b.height/2,color||'#FFE27A',16,260,'star',8,700);}
const QUEST_ACT={
  async 'al-on'(){
    if(AL.busy)return;AL.busy=true;AL.why='';render();
    try{
      /* a site that was blocked before gets no question at all, and a browser may hide the question behind a bell in the address bar: say where to allow it */
      const was=Notification.permission,got=was==='granted'?was:await Notification.requestPermission();
      if(got!=='granted'){AL.why=alertsHelp(got);toast(AL.why);return;}
      const {reg,sub}=await alertsSub(),key=(await api('/api/push/key')).key;
      const s=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(key)});
      const j=await api('/api/push/subscribe',Object.assign(s.toJSON(),{arena:AL.arena,quests:AL.quests}));
      AL.on=true;AL.arena=j.arena;AL.quests=j.quests;SND.play('levelup');toast('Alerts are on');
    }catch(e){AL.why='This browser could not turn alerts on. '+(e&&e.message?e.message:'');}
    finally{AL.busy=false;render();}
  },
  async 'al-off'(){
    if(AL.busy)return;AL.busy=true;render();
    try{const {sub}=await alertsSub();if(sub){await api('/api/push/unsubscribe',{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe();}AL.on=false;AL.why='';toast('Alerts are off');}
    catch(e){AL.why='Could not turn alerts off, please try again.';}
    finally{AL.busy=false;render();}
  },
  async 'al-pref'(d){
    const k=d.k==='arena'?'arena':'quests',was=AL[k];AL[k]=!was;render();
    try{const {sub}=await alertsSub();if(!sub)throw new Error('none');await api('/api/push/prefs',{endpoint:sub.endpoint,arena:AL.arena,quests:AL.quests});}
    catch(e){AL[k]=was;render();fail(e);}
  },
  'q-tab'(d){UI.qtab=d.k;render();window.scrollTo(0,0);if(d.k==='week')return loadWeek(true);},
  async 'q-claim'(d,t){
    const j=await api('/api/quests/claim',{i:+d.i});
    if(j.state)applyState(j.state);
    SND.play('levelup');questBurst(t,'#C99BFF');
    toast(`+${fmt(j.got.tp)} Tower Points${j.got.sqk?`, +${sqkText(j.got.sqk)} SQK to claim in your inventory`:''}`);
    render();
  },
  async 'q-take'(d,t){
    const j=await api('/api/quests/take',{i:+d.i});
    if(j.state)applyState(j.state);
    SND.play('levelup');questBurst(t,'#C99BFF');
    toast(`+${fmt(j.got.tp)} Tower Points`);
    render();
  },
  async 'q-swap'(d){const j=await api('/api/quests/swap',{i:+d.i});if(j.state)applyState(j.state);SND.play('clink');render();toast(`New quest: ${questText(j.swapped)}`);},
  'q-open'(d){
    const id=+d.id;if(!QK.open[id])QK.open[id]=Date.now();
    api('/api/quests/open',{id}).then(j=>{if(j.state)applyState(j.state);}).catch(()=>{});
    setTimeout(()=>{if(UI.view==='quests'&&!SP)render();},80);
  },
  async 'q-done'(d,t){
    const j=await api('/api/quests/social',{id:+d.id});
    if(j.state)applyState(j.state);
    SND.play('levelup');questBurst(t);
    toast(`+${fmt(j.got.tp)} Tower Points${j.got.sqk?`, +${sqkText(j.got.sqk)} SQK to claim in your inventory`:''}`);
    render();
  },
  /* X's own sign in page, it sends the player back here with the account connected */
  async 'x-on'(){const j=await api('/api/x/connect',{});if(j.url&&/^https?:\/\//.test(j.url))location.href=j.url;},
  async 'x-off'(){await api('/api/x/disconnect',{});await loadQuests(true);toast('X account disconnected');},
  'q-admin'(){UI.view='qadmin';QK.admin=null;QK.edit=null;QK.del=null;render();window.scrollTo(0,0);},
  'q-back'(){UI.view='quests';render();window.scrollTo(0,0);return loadQuests(true);},
  async 'qa-save'(){
    const body={quest:qaRead()};if(QK.edit&&QK.edit.id)body.id=QK.edit.id;
    QK.admin=await api('/api/admin/social',body);QK.edit=null;QK.data=null;SND.play('clink');render();window.scrollTo(0,0);toast(body.id?'Quest saved':'Quest added, it is live for players');
  },
  'qa-new'(){QK.edit=qaBlank();render();},
  'qa-edit'(d){const x=QK.admin.quests.find(y=>y.id===+d.id);if(!x)return;QK.edit=Object.assign({},x,{need:x.need.join(' ')});render();window.scrollTo(0,0);},
  async 'qa-toggle'(d){QK.admin=await api('/api/admin/social',{op:'toggle',id:+d.id});QK.data=null;render();},
  async 'qa-del'(d){
    const id=+d.id;
    if(QK.del!==id){QK.del=id;render();setTimeout(()=>{if(QK.del===id){QK.del=null;if(UI.view==='qadmin')render();}},3000);return;}
    QK.del=null;QK.admin=await api('/api/admin/social',{op:'delete',id});QK.data=null;render();toast('Quest deleted');
  },
};
