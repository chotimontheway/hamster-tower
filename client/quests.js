/* QUESTS: today's list, its progress and the milestones paid come with the save (G.quests, G.tp). Social quests, the time to the next list
   and whether this player may get SQK come from /api/quests. The dev wallet also gets a screen to write social quests.
   Loaded before ui.js: only the listener below runs on load, everything else runs later */
const QK={data:null,at:0,loading:false,admin:null,edit:null,del:null,open:{}};
/* a new player in this tab starts with nothing of the last one's quests, social list or admin screen */
function questReset(){Object.assign(QK,{data:null,at:0,loading:false,admin:null,edit:null,del:null,open:{}});}
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
function viewQuests(){
  if(!QK.data||Date.now()-QK.at>30000)loadQuests();
  const q=qToday(),d=QK.data;
  const head=`<div class="head-row"><h1>Quests</h1><span class="tp-pill num" title="Tower Points">${pic('tp','')}${fmt(G.tp||0)} TP</span></div>`;
  if(!q)return head+'<section class="box"><p class="note">Loading today\'s quests...</p></section>';
  return head+questDaily(q,d)+questSocial(d)+(d&&d.dev?'<div class="btns"><button class="btn ghost" data-act="q-admin">Manage social quests</button></div>':'');
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

function questBurst(t,color){if(!t)return;const b=t.getBoundingClientRect();FX.burst(b.left+b.width/2,b.top+b.height/2,color||'#FFE27A',16,260,'star',8,700);}
const QUEST_ACT={
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
