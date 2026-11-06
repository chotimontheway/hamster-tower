/* SQK: the SQK Chest bought with SQK, and the SQK that boss floors pay. The wallet sends every transaction itself and this page only
   prepares them: an approval and the purchase, or a claim the server signed. The server gives the chest once the purchase has a few
   blocks on top of it, see lib/sqk.js and contracts/src/HamsterTowerSQK.sol. Loaded before ui.js, so nothing here runs on load */
const SK={shop:null,shopAt:0,me:null,meAt:0,step:null,left:0,eth:null,loading:null,scanned:false,bal:null,balW:null,balAt:0,balLoading:false};
const SK_SEL={approve:'0x095ea7b3',allowance:'0xdd62ed3e',balanceOf:'0x70a08231',buyChest:'0x4e192548',claim:'0x5eddd157'};
const SK_PENDING='hamster-tower-sqk-buy',SK_WEI=10n**12n;
const skH=v=>BigInt(v).toString(16).padStart(64,'0');
const skA=a=>String(a).toLowerCase().replace(/^0x/,'').padStart(64,'0');
const skWait=ms=>new Promise(r=>setTimeout(r,ms));
/* SQK from base units, 10^-18, as text with up to 2 decimals */
function skFmt(wei){
  const c=(BigInt(wei||0)+5000000000000000n)/10000000000000000n,f=(c%100n).toString().padStart(2,'0').replace(/0+$/,'');
  return (c/100n).toLocaleString('en-US')+(f?'.'+f:'');
}
const skEarned=()=>BigInt(sqkOf(G).earned)*SK_WEI;
const skOwed=()=>{const o=skEarned()-BigInt(SK.me?SK.me.claimed:0);return o>0n?o:0n;};
/* a purchase waiting for the chain survives a reload, so its chest is never lost */
const skPending=()=>{try{const v=JSON.parse(localStorage.getItem(SK_PENDING)||'null');return v&&v.w===(PLAYER&&PLAYER.wallet)&&/^0x[0-9a-f]{64}$/.test(v.h)?v.h:null;}catch(e){return null;}};
const skSetPending=h=>{try{if(h)localStorage.setItem(SK_PENDING,JSON.stringify({h,w:PLAYER.wallet}));else localStorage.removeItem(SK_PENDING);}catch(e){}};

/* the shop as everyone sees it, and this wallet's part, read again after half a minute */
async function skLoad(force){
  if(SK.loading)return SK.loading;
  const wal=PLAYER&&PLAYER.wallet,fresh=SK.shop&&Date.now()-SK.shopAt<30000&&(!wal||!SK.shop.on||(SK.me&&Date.now()-SK.meAt<30000));
  if(fresh&&!force)return;
  SK.loading=(async()=>{
    try{SK.shop=await api('/api/sqk');}catch(e){SK.shop={on:false,down:true};}
    SK.shopAt=Date.now();
    if(SK.shop.on&&wal){let me=null;try{me=await api('/api/sqk/me');}catch(e){}if(PLAYER&&PLAYER.wallet===wal){SK.me=me;SK.meAt=Date.now();}}
  })().finally(()=>{SK.loading=null;});
  await SK.loading;
  /* bought on the chain but not in this save yet, for example the page closed while it waited */
  if(SK.me&&SK.me.bought&&!SK.me.counted&&!SK.step&&!skPending()&&!SK.scanned){SK.scanned=true;skRun(skScan);}
}
/* the Shop and the Inventory ask for fresh numbers when they draw, and draw again once they arrive */
function skNeed(){
  if(!SK.loading&&(!SK.shop||Date.now()-SK.shopAt>30000||(PLAYER&&PLAYER.wallet&&SK.shop.on&&(!SK.me||Date.now()-SK.meAt>30000))))skLoad().then(()=>{if((UI.view==='shop'||UI.view==='items')&&!SP)render();});
  skResume();
}
/* a purchase still waiting from before a reload is picked up after the current drawing, wherever the player is */
function skResume(){
  const h=skPending();
  if(h&&!SK.step&&!SK.resume&&PLAYER&&PLAYER.wallet){SK.resume=true;setTimeout(()=>{SK.resume=false;skRun(()=>skCredit(h));},0);}
}

/* BALANCE: the SQK the signed in wallet holds, shown in the top bar. The server reads it from the token, so no wallet app is needed.
   It is read again after half a minute when the page draws, and at once after a purchase or a claim */
function skBal(force){
  const wal=PLAYER&&PLAYER.wallet;
  if(!wal||SK.balLoading||(!force&&SK.balW===wal&&Date.now()-SK.balAt<30000))return;
  SK.balLoading=true;SK.balAt=Date.now();
  api('/api/sqk/balance').then(j=>{if(PLAYER&&PLAYER.wallet===wal&&j.balance!=null){SK.bal=j.balance;SK.balW=wal;}}).catch(()=>{})
    .finally(()=>{SK.balLoading=false;const el=document.getElementById('top-sqk');if(el){el.innerHTML=sqkPill();fitTop();}});
}
/* a narrow phone gets a short number, rounded down, at most four figures: 9.87, 98.7, 987, 3.4k, 123k, 1.2M. The title keeps the whole amount */
function skShort(wei){
  const n=Number(BigInt(wei)/10n**14n)/1e4,dn=(x,d)=>Math.floor(x*10**d)/10**d;
  if(innerWidth>560)return skFmt(wei);
  return n<10?String(dn(n,2)):n<100?String(dn(n,1)):n<1e3?String(Math.floor(n)):n<1e4?dn(n/1e3,1)+'k':n<1e6?Math.floor(n/1e3)+'k':dn(n/1e6,1)+'M';
}
function sqkPill(){
  if(!PLAYER||!PLAYER.wallet||SK.bal==null||SK.balW!==PLAYER.wallet)return '';
  return `<span class="pill num top-sqk" title="SQK in your wallet: ${skFmt(SK.bal)}">${skShort(SK.bal)} SQK</span>`;
}

/* WALLET: the one this game is signed in with, on the chain the contract lives on */
async function skEth(){
  const me=PLAYER.wallet,list=walletList();
  const has=async p=>{try{const a=await p.request({method:'eth_accounts'});return Array.isArray(a)&&a.some(x=>String(x).toLowerCase()===me);}catch(e){return false;}};
  const ask=async p=>{const a=await p.request({method:'eth_requestAccounts'});if(Array.isArray(a)&&a.some(x=>String(x).toLowerCase()===me))return p;throw new Error(`Switch your wallet to ${me}, the wallet this game is signed in with`);};
  if(SK.eth&&await has(SK.eth))return SK.eth;
  for(const w of list)if(await has(w.provider))return SK.eth=w.provider;
  const named=list.find(w=>PREF.wallet&&(w.info.rdns||w.info.name)===PREF.wallet)||(list.length===1?list[0]:null);
  if(named)return SK.eth=await ask(named.provider);
  throw new Error(list.length?`Open the wallet that holds ${me} and connect it to this site, then try again`:'No wallet found in this browser');
}
async function skChain(eth,id){
  const want='0x'+Number(id).toString(16),now=async()=>String(await eth.request({method:'eth_chainId'})).toLowerCase();
  if(await now()===want)return;
  try{await eth.request({method:'wallet_switchEthereumChain',params:[{chainId:want}]});}
  catch(e){
    if(!(e&&e.code===4902&&Number(id)===11155111))throw e;
    await eth.request({method:'wallet_addEthereumChain',params:[{chainId:want,chainName:'Sepolia',nativeCurrency:{name:'Sepolia ETH',symbol:'ETH',decimals:18},rpcUrls:['https://ethereum-sepolia-rpc.publicnode.com'],blockExplorerUrls:['https://sepolia.etherscan.io']}]});
  }
  if(await now()!==want)throw new Error('Switch your wallet to Sepolia, then try again');
}
const skCall=(eth,to,data)=>eth.request({method:'eth_call',params:[{to,data},'latest']});
/* why the contract or the token would refuse, from the error a dry run gives */
const SK_ERR={'0x589bfff7':'The SQK Chest is not on sale right now','0x972407cb':'The price just changed, please try again','0x3922235c':'You already bought today\'s SQK Chest. The next one goes on sale at 00:00 UTC','0x1309a563':'The SQK contract is paused right now','0x203d82d8':'This claim expired, please claim again','0x5cd5d233':'This claim was not signed for this wallet, please claim again','0x969bf728':'Nothing to claim yet','0xe888ac36':'This claim is more than one claim may pay, please claim again','0x91130a4c':'Today\'s SQK rewards are all paid out, please try again after 00:00 UTC','0xe450d38c':'This wallet does not hold enough SQK','0xfb8f41b2':'The SQK approval is too small, please try again'};
function skRevert(e){
  const hex=x=>typeof x==='string'&&/^0x[0-9a-f]{8}/i.test(x)?x:null;
  const d=e&&(hex(e.data)||hex(e.data&&e.data.data)||hex(e.error&&e.error.data)||hex(e.data&&e.data.originalError&&e.data.originalError.data)||(/0x[0-9a-f]{8}/i.exec(String(e.message))||[])[0]);
  return d?SK_ERR[d.slice(0,10).toLowerCase()]||null:null;
}
/* a public node of the contract's chain, for when a wallet cannot estimate. Sepolia raised the gas of new state in 2026 and not every wallet follows yet */
const SK_RPC={11155111:['https://ethereum-sepolia-rpc.publicnode.com','https://sepolia.gateway.tenderly.co']};
async function skPub(method,params){
  let last;
  for(const u of SK_RPC[SK.shop&&SK.shop.chain]||[]){
    try{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const j=await r.json();if(j.error)throw Object.assign(new Error(j.error.message||'RPC error'),{data:j.error.data});return j.result;}
    catch(e){last=e;if(e.data)throw e;}
  }
  throw last||new Error('No node answered');
}
/* the gas a transaction needs: the higher of the wallet's estimate and a public node's, plus a margin. A sure failure is reported before the wallet opens */
async function skSend(eth,to,data){
  const p={from:PLAYER.wallet,to,data};
  let w=null,n=null,err=null;
  try{w=BigInt(await eth.request({method:'eth_estimateGas',params:[p]}));}catch(e){err=e;}
  try{n=BigInt(await skPub('eth_estimateGas',[p]));}catch(e){const why=skRevert(e);if(why)throw new Error(why);}
  if(w===null&&n===null){const why=skRevert(err);if(why)throw new Error(why);}
  const g=w===null?n:n===null?w:(w>n?w:n);
  if(g!==null)p.gas='0x'+(g*12n/10n).toString(16);
  return eth.request({method:'eth_sendTransaction',params:[p]});
}
async function skReceipt(eth,hash){
  for(let i=0;i<150;i++){
    const r=await eth.request({method:'eth_getTransactionReceipt',params:[hash]}).catch(()=>null);
    if(r&&r.blockNumber)return r;
    await skWait(2500);
  }
  throw new Error('The transaction is taking long, check your wallet and try again');
}
function skEncClaim(total,deadline,sig){
  const s=String(sig).replace(/^0x/,''),pad=s.padEnd(Math.ceil(s.length/64)*64,'0');
  return SK_SEL.claim+skH(total)+skH(deadline)+skH(96)+skH(s.length/2)+pad;
}
const skErr=e=>e&&e.code===4001?new Error('Cancelled in your wallet'):e&&e.code===-32002?new Error('Your wallet already has a request waiting, open it to answer'):e;
/* a purchase can wait minutes for the chain, so it runs on its own and never locks the rest of the game */
function skRun(f){if(SK.step)return;f().catch(e=>{SK.step=null;render();fail(skErr(e));});}

async function skBuy(){
  if(!PLAYER||!PLAYER.wallet){ACT.wallet();return;}
  SK.step='load';render();
  await skLoad(true);
  const sh=SK.shop;
  if(!sh||!sh.on)throw new Error('The SQK Chest is not open yet');
  const price=BigInt(sh.price||0);
  if(!price||sh.paused)throw new Error('The SQK Chest is not on sale right now');
  if(SK.me&&SK.me.bought)throw new Error('You already bought today\'s SQK Chest. The next one goes on sale at 00:00 UTC');
  SK.step='wallet';render();
  const eth=await skEth();await skChain(eth,sh.chain);
  const bal=BigInt(await skCall(eth,sh.token,SK_SEL.balanceOf+skA(PLAYER.wallet)));
  if(bal<price)throw new Error(`An SQK Chest costs ${skFmt(price)} SQK and this wallet holds ${skFmt(bal)} SQK`);
  const al=BigInt(await skCall(eth,sh.token,SK_SEL.allowance+skA(PLAYER.wallet)+skA(sh.contract)));
  if(al<price){
    SK.step='approve';render();
    const h=await skSend(eth,sh.token,SK_SEL.approve+skA(sh.contract)+skH(price));
    SK.step='approving';render();
    if((await skReceipt(eth,h)).status!=='0x1')throw new Error('The approval failed on the chain, nothing was spent');
  }
  SK.step='buy';render();
  const h=await skSend(eth,sh.contract,SK_SEL.buyChest+skH(price));
  skSetPending(h);
  SK.step=null;
  await skCredit(h);
}
/* the server gives the chest once the purchase has enough blocks on top. A refusal ends the wait, a slow chain does not */
async function skCredit(h){
  SK.step='wait';SK.left=SK.shop&&SK.shop.confirmations||3;render();
  try{
    for(let i=0;i<150;i++){
      let j=null;
      try{j=await api('/api/sqk/credit',{tx:h});}
      /* a refusal about the purchase itself ends it. A lost session keeps it for the next sign in */
      catch(e){if(e.status&&e.status<500&&e.status!==429){if(e.status!==401)skSetPending(null);throw e;}}
      if(j){
        if(j.state)applyState(j.state);
        if(!j.waiting){
          skSetPending(null);SK.step=null;SK.meAt=0;skBal(true);render();
          SND.play('levelup');toast(j.fresh?'Your SQK Chest is in your inventory':'This purchase was already counted');
          skLoad(true).then(()=>{if(!SP)render();});
          return;
        }
        SK.left=j.left;render();
      }
      await skWait(4000);
    }
    throw new Error('Your purchase is still confirming. It will be counted when you open the Shop again');
  }finally{if(SK.step==='wait'){SK.step=null;render();}}
}
async function skScan(){
  SK.step='scan';render();
  try{
    const j=await api('/api/sqk/scan',{});
    if(j.state)applyState(j.state);
    if(j.found)toast(`Found ${j.found} SQK Chest${j.found>1?'s':''} you bought, it is in your inventory`);
  }finally{SK.step=null;SK.meAt=0;render();}
}
async function skClaim(){
  if(!PLAYER||!PLAYER.wallet){ACT.wallet();return;}
  SK.step='sign';render();
  const t=await api('/api/sqk/claim',{});
  const eth=await skEth();await skChain(eth,t.chain);
  SK.step='claim';render();
  const h=await skSend(eth,t.contract,skEncClaim(t.total,t.deadline,t.sig));
  SK.step='claiming';render();
  if((await skReceipt(eth,h)).status!=='0x1')throw new Error('The claim failed on the chain and nothing was paid, please try again');
  SK.step=null;SK.meAt=0;skBal(true);await skLoad(true);render();
  SND.play('coins');toast(`${skFmt(t.amount)} SQK sent to your wallet${BigInt(t.rest)>0n?'. The rest can be claimed later':''}`);
}

/* OPENING: the SQK Chest shakes, lights up and pours out everything at once. Pouches show the SQK they gave */
function skReveal(title,art,body,best){
  $('#overlay').innerHTML=`<div class="spin sqk-open" role="dialog" aria-modal="true"><h2>${title}</h2><div class="spin-body" id="spbody"><div class="quick sqk-q">${pic(art,'')}</div></div><div class="btns" id="spbtns"><button class="btn ghost" data-act="spin-skip">Skip</button></div></div>`;
  SP={forge:true,done:false,anims:[],fin:()=>{
    if(!SP||SP.done)return;SP.done=true;
    $('#spbody').innerHTML=body;
    $('#spbtns').innerHTML='<button class="btn" data-act="spin-close">Done</button>';
    const b=$('#spbody').getBoundingClientRect(),c={x:b.left+b.width/2,y:b.top+Math.min(b.height/2,180)};
    SND.play('rev_'+best);
    FX.ring(c,'#FF7AD9',20,240,10,760);FX.ring(c,'#5BE7FF',10,180,8,620);
    FX.burst(c.x,c.y,best==='l'?'#FFC94D':'#FF7AD9',28,420,'star',10,900,80);
  }};
  const q=$('.sqk-q img');
  SND.play('shake');
  if(q&&q.animate&&!RM&&!PREF.fastOpen){
    const a=q.animate([{transform:'rotate(0) scale(1)',filter:'brightness(1)'},{transform:'rotate(-8deg) scale(1.06)'},{transform:'rotate(8deg) scale(1.12)'},{transform:'rotate(-7deg) scale(1.18)'},{transform:'rotate(6deg) scale(1.24)'},{transform:'rotate(0) scale(1.34)',filter:'brightness(1.8)'}],{duration:900,easing:'ease-in'});
    const run=SP;SP.anims.push(a);a.onfinish=()=>{if(SP===run)SP.fin();};
    setTimeout(()=>{if(SP===run)SP.fin();},1100);
  }else SP.fin();
}
function skChestCard(t,n,i){
  const rar=['n','n','r','e','l'][t];
  return `<div class="rv r-${rar}" style="animation-delay:${Math.min(i,12)*50}ms"><span class="i-pic">${picL('chest_'+(t+1),CHESTS[t].n)}</span><b>${CHESTS[t].n}</b><em class="num">x${n}</em></div>`;
}
async function skOpenChest(){
  const j=await action('sqkchest');
  const r=j.results&&j.results[0];if(!r){render();return;}
  const foods={};r.food.forEach(f=>{foods[f.id]=(foods[f.id]||0)+1;});
  const rarOf=x=>x.kind==='pet'?PETS[x.id].rar:x.item.rar,byRar=(a,b)=>RAR_ORDER.indexOf(rarOf(b))-RAR_ORDER.indexOf(rarOf(a));
  /* what the chest itself promises, then what its blind bags gave with their usual odds, so a Common from a bag is never mistaken for the chest's gear */
  const own=[...(r.pet?[r.pet]:[]),...r.gear].sort(byRar),bags=r.bags.slice().sort(byRar);
  const best=[...own,...bags].reduce((m,x)=>RAR_ORDER.indexOf(rarOf(x))>RAR_ORDER.indexOf(m)?rarOf(x):m,r.chests[4]?'l':r.chests[3]?'e':'r');
  let i=0;
  const chests=r.chests.map((n,t)=>n?skChestCard(t,n,i++):'').filter(Boolean).join('');
  const nb=r.chests.reduce((a,b)=>a+b,0),s=n=>n>1?'s':'';
  const body=`<div class="sum sqk-sum">
    <div class="sec-t">${nb} chest${s(nb)} for your inventory</div><div class="reveal">${chests}</div>
    <div class="sec-t">${r.pet?'A pet and ':''}${r.gear.length} piece${s(r.gear.length)} of gear</div><div class="reveal">${own.map(x=>revealCard(x,i++)).join('')}</div>
    <div class="sec-t">${r.bags.length} blind bag${s(r.bags.length)}, opened</div><div class="reveal">${bags.map(x=>revealCard(x,i++)).join('')}</div>
    <div class="sec-t">${r.food.length} ${FOOD_BAGS[r.foodBag].n}${s(r.food.length)}</div><div class="reveal">${Object.keys(foods).map(id=>revealCard({kind:'food',id,k:foods[id]},i++)).join('')}</div></div>`;
  skReveal('Opening an SQK Chest','chest_sqk',body,best);
}
async function skOpenPouch(all){
  const j=await action('pouch',all?{all:true}:{n:1});
  const res=j.results||[];if(!res.length){render();return;}
  const total=res.reduce((a,x)=>a+x.amount,0),top=Math.max(...res.map(x=>x.luck)),best=['n','r','e','l'][top]||'n';
  const rows=res.length>1?`<div class="sqk-pl">${res.map(x=>`<div class="sqk-pr l${x.luck}"><span>Floor ${x.floor}</span><b>${SQK_POUCH.luck[x.luck][2]}</b><em class="num">+${sqkText(x.amount)} SQK</em></div>`).join('')}</div>`:`<p class="sqk-luck l${res[0].luck}">${SQK_POUCH.luck[res[0].luck][2]}, from floor ${res[0].floor}</p>`;
  const body=`<div class="sum"><div class="big-coin num sqk-amt">+${sqkText(total)} SQK</div>${rows}<p class="note">Claim it from the Inventory to send it to your wallet.</p></div>`;
  skReveal(res.length>1?`Opening ${res.length} SQK pouches`:'Opening an SQK pouch','pouch_sqk',body,best);
}

/* SCREENS */
function skStepText(){
  const n=SK.left;
  return {load:'Checking the shop...',wallet:'Check your wallet...',approve:'Approve the SQK in your wallet',approving:'Waiting for the approval on the chain...',buy:'Confirm the purchase in your wallet',wait:`Waiting for the chain, ${n} more block${n===1?'':'s'}...`,scan:'Looking for your purchase on the chain...',sign:'Preparing your claim...',claim:'Confirm the claim in your wallet',claiming:'Waiting for the chain...'}[SK.step]||'';
}
const skParts=()=>{const C=SQK_CHEST;return [`${C.chests.n[0]} to ${C.chests.n[1]} chests, ${dec(C.chests.w[4]*100/C.chests.w.reduce((a,b)=>a+b,0))}% each to be Diamond`,`${C.food.n[0]} to ${C.food.n[1]} food bags`,`${C.bags.n[0]} to ${C.bags.n[1]} blind bags`,`${C.gear.n[0]} to ${C.gear.n[1]} pieces of Rare or better gear`,C.pet.p>=1?'A pet, Rare or better':`A ${pct(C.pet.p)} chance of a pet`];};
function sqkShopCard(){
  skNeed();
  const sh=SK.shop;
  if(sh&&!sh.on)return '';
  const price=sh&&sh.on?BigInt(sh.price||0):0n,wal=PLAYER&&PLAYER.wallet,bought=SK.me&&SK.me.bought,step=SK.step&&SK.step!=='sign'&&SK.step!=='claim'&&SK.step!=='claiming';
  const btn=!sh?'<button class="btn big sqk-b" disabled>Loading...</button>':!wal?'<button class="btn big sqk-b" data-act="wallet">Sign in with a wallet to buy</button>':!price||sh.paused?'<button class="btn big sqk-b" disabled>Not on sale right now</button>':bought?`<button class="btn big sqk-b" disabled>Bought today, next in ${timeToReset()}</button>`:`<button class="btn big sqk-b" data-act="sqk-buy"${SK.step?' disabled':''}>Buy with SQK</button>`;
  return `<section class="sqk-hero">
    <span class="sqk-glow" aria-hidden="true"></span>${pic('chest_sqk','SQK Chest','sqk-pic')}
    <div class="sqk-tx"><span class="sqk-tag">Bought with SQK, one a day</span><h2>SQK Chest</h2>
      <ul class="sqk-list">${skParts().map(x=>`<li>${x}</li>`).join('')}</ul>
      <div class="sqk-price num">${price?skFmt(price)+' SQK':'Price not set yet'}</div>
      <div class="btns">${btn}<button class="chipb" data-act="sheet" data-type="sqk">Odds and rules</button></div>
      ${step?`<p class="sqk-step" role="status">${skStepText()}</p>`:''}
      <p class="note">Half of every price is burned on the SQK token and the other half goes to the game's treasury. You pay on Sepolia from your own wallet, plus a small gas fee.</p></div>
  </section>`;
}
function sqkInvBox(){
  skNeed();
  const q=sqkOf(G),sh=SK.shop,on=sh&&sh.on,owed=skOwed(),claimed=SK.me?BigInt(SK.me.claimed):0n,earned=skEarned();
  if(!on&&!q.box&&!q.pouch.length&&!q.earned)return '';
  const step=SK.step==='sign'||SK.step==='claim'||SK.step==='claiming';
  const wal=PLAYER&&PLAYER.wallet;
  return `<section class="box sqk-box"><div class="head-row"><h2 style="flex:1 1 auto">SQK</h2><button class="chipb" data-act="sheet" data-type="sqk">Odds and rules</button></div>
    <div class="sqk-rows">
      <div class="sqk-row${q.box?'':' empty'}">${pic('chest_sqk','SQK Chest')}<span class="sqk-rt"><b>SQK Chest</b><small class="num">x${q.box}</small></span><button class="btn sm" data-act="sqk-open"${q.box?'':' disabled'}>Open</button></div>
      <div class="sqk-row${q.pouch.length?'':' empty'}">${pic('pouch_sqk','SQK pouch')}<span class="sqk-rt"><b>SQK pouch</b><small class="num">x${q.pouch.length}</small></span><button class="btn sm" data-act="pouch-open"${q.pouch.length?'':' disabled'}>Open</button>${q.pouch.length>1?'<button class="btn ghost sm" data-act="pouch-open" data-all="1">Open all</button>':''}</div>
    </div>
    <div class="sqk-earn"><div class="num"><span>Earned</span><b>${skFmt(earned)} SQK</b></div><div class="num"><span>Sent to your wallet</span><b>${SK.me?skFmt(claimed)+' SQK':'...'}</b></div>
      ${wal&&on?`<button class="btn sqk-b" data-act="sqk-claim"${owed>0n&&!SK.step?'':' disabled'}>${owed>0n?'Claim '+skFmt(owed)+' SQK':'Nothing to claim'}</button>`:''}</div>
    ${step?`<p class="sqk-step" role="status">${skStepText()}</p>`:''}
    <p class="note">${wal?'Every boss floor you clear for the first time gives an SQK pouch.':'Sign in with a wallet to earn SQK: every boss floor cleared for the first time gives an SQK pouch.'} Higher floors give more. A claim is paid from the game's reward pool on Sepolia, you pay the gas.</p>
  </section>`;
}
function sheetSqk(){
  const C=SQK_CHEST,P=SQK_POUCH,share=(w,i)=>dec(w[i]*100/w.reduce((a,b)=>a+b,0))+'%';
  const tiers=C.chests.w.map((w,t)=>w?`${CHESTS[t].n.replace(' Chest','')} ${share(C.chests.w,t)}`:'').filter(Boolean).join(', ');
  const rar=w=>w.map((x,i)=>x?`${RARS[RAR_ORDER[i]].n} ${share(w,i)}`:'').filter(Boolean).join(', ');
  const bands=P.bands.map((b,i)=>{const to=P.bands[i+1]?P.bands[i+1].from-10:null;return `<tr><td class="num">${to?b.from+' to '+to:b.from+'+'}</td>${P.luck.map(l=>`<td class="num">${sqkText(Math.round((b.a+(b.b-b.a)*l[0])*SQK_UNIT))}</td>`).join('')}</tr>`;}).join('');
  return `<h2>SQK Chest and SQK pouches</h2>
    <div class="sec-t">What one SQK Chest holds</div>
    <div class="tbl sqk-tbl"><table><tbody>
      <tr><td>Chests</td><td>${C.chests.n[0]} to ${C.chests.n[1]}, each one ${tiers}</td></tr>
      <tr><td>Food bags</td><td>${C.food.n[0]} to ${C.food.n[1]}, the kind that suits your team's lowest level, opened at once</td></tr>
      <tr><td>Blind bags</td><td>${C.bags.n[0]} to ${C.bags.n[1]}, opened at once with the usual odds, they count toward the guarantees</td></tr>
      <tr><td>Gear</td><td>${C.gear.n[0]} to ${C.gear.n[1]} pieces, each one ${rar(C.gear.w)}</td></tr>
      <tr><td>Pet</td><td>${C.pet.p>=1?'Always one':pct(C.pet.p)+' chance'}, ${rar(C.pet.w)}. A pet you own gains a star</td></tr>
    </tbody></table></div>
    <ul class="how"><li>One SQK Chest a UTC day for each wallet. The contract refuses a second one the same day.</li>
      <li>Half of every price is burned on the SQK token, the other half goes to the game's treasury. Both happen in the same transaction, anyone can see it on the chain.</li>
      <li>The chest reaches your inventory once the purchase has ${SK.shop&&SK.shop.confirmations||3} blocks on the chain, usually within a minute.</li>
      <li>Coins can never be bought. The SQK Chest is the only thing sold for SQK.</li></ul>
    <div class="sec-t">SQK pouches from boss floors</div>
    <p class="note">A wallet gets one pouch for every boss floor it clears for the first time, every 10th floor. A pouch opens into SQK, and the higher the floor the more it holds:</p>
    <div class="tbl sqk-bands"><table><thead><tr><th>Floor</th>${P.luck.map(l=>`<th>${l[2]}<br>${l[1]}%</th>`).join('')}</tr></thead><tbody>${bands}</tbody></table></div>
    <ul class="how"><li>The SQK waits in the game until you claim it. A claim is paid from the game's reward pool on Sepolia, and you pay the gas.</li>
      <li>The pool pays at most ${SK.shop&&SK.shop.on?skFmt(SK.shop.maxClaim)+' SQK in one claim and '+skFmt(SK.shop.leftToday)+' SQK more today for everyone':'a set amount a claim and a day'}. What is left waits for a later claim.</li>
      <li>Guests get no pouches. A guest who signs in with a wallet gets the pouches for the boss floors it already cleared.</li></ul>
    ${SK.shop&&SK.shop.on?`<p class="note">Contract <span class="num">${SK.shop.contract}</span>, treasury <span class="num">${SK.shop.treasury}</span>, SQK token <span class="num">${SK.shop.token}</span>.</p>`:''}`;
}
const SQK_ACT={
  'sqk-buy'(){skRun(skBuy);},
  'sqk-claim'(){skRun(skClaim);},
  'sqk-scan'(){skRun(skScan);},
  'sqk-open'(){return skOpenChest();},
  'pouch-open'(d){return skOpenPouch(d.all==='1');},
};
