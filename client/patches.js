/* PATCH NOTES: what each update changed, newest first. The big items of a patch lead as cards that stand out, smaller changes follow
   in a plain list and fixes come last, quietly. A patch the player has not seen yet lights a dot on the Codex tab and puts a card on
   the Tower screen, until the Patch notes page is opened. To add a patch, put a new entry at the top of PATCHES. Loaded before ui.js */
const PATCHES=[
  {v:'1.2',date:'2026-11-08',title:'Alerts and an easier first fight',
    big:[
      {art:'bell',t:'Alerts',d:'Get a message when the Arena opens and a reminder of unclaimed daily quests in the evening. Turn them on in Quests, on the Daily part. On an iPhone, add the game to the Home Screen first.'},
      {art:'nav_tower',t:'An easier first fight',d:'New players now start with one clear card and a single button into floor 1, and the rest of the Tower screen shows up after the first clear.'},
    ],
    more:[],
    fixes:[]},
  {v:'1.1',date:'2026-11-07',title:'Weekly board, achievements and quests on X',
    big:[
      {art:'tp',t:'Weekly TP board',d:'Every Tower Point you claim from a quest or a milestone counts on a board that starts over each Monday at 00:00 UTC. The top 10 wallets of the week get chests, blind bags and food bags. In Quests.'},
      {art:'win_pet',t:'Achievements',d:'86 goals that last the whole climb, from your first wins to floor 500, every pet at 5 stars and a full Legendary set. Each one pays coins and chests once, and your badges show on your profile. In Quests.'},
      {art:'x_logo',t:'Social quests on X',d:'Connect your X account and earn Tower Points for following, liking, reposting, replying and posting. The game only reads your account and never posts for you. In Quests, on the Social tab next to Daily.'},
    ],
    more:[
      'Your Squeeks are checked by themselves when you sign in with a wallet, so a new Squeek or a new merge level shows up without pressing anything.',
      'Follow Hamster Tower on X from the start screen or the top bar.',
    ],
    fixes:[]},
  {v:'1.0',date:'2026-11-06',title:'Squeeks, SQK and Quests',
    big:[
      {art:'squeek',t:'Squeek pets',d:'Bring your Squeek NFTs into the tower. A Squeek in your wallet or deposited in Staking fights as a pet, drawn from its own on-chain picture. Its traits pick its element, role and skills, and each merge level counts as a star. One Squeek per team. Find them in Team.'},
      {art:'chest_sqk',t:'SQK Chest',d:'A new chest bought with SQK, one a day for each wallet. It holds 4 to 6 chests, 6 to 10 food bags, 1 to 3 blind bags, 3 to 5 pieces of Rare or better gear and a pet. Half of every price is burned, the other half goes to the game\'s treasury. In the Shop.'},
      {art:'nav_quest',t:'Quests',d:'A new Quests tab with daily quests picked for the floor you have reached. Claim each finished quest for Tower Points, then claim the milestones for more. From floor 30 the last milestone also pays a little SQK.'},
      {art:'pouch_sqk',t:'SQK pouches',d:'Every boss floor you clear with a wallet gives an SQK pouch, and higher floors give more. Boss floors you cleared before this patch count too. Open them in Items and claim the SQK to your wallet.'},
    ],
    more:[
      'Your SQK balance shows in the top bar when you sign in with a wallet.',
      'In the Arena, a Squeek defends a floor only while its owner still holds it.',
      'Social quests on X are coming soon.',
      'Patch notes live here in the Codex. A dot on the Codex tab shows when there is a new one.',
    ],
    fixes:[]},
];
const PATCH_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const patchDate=s=>{const [y,m,d]=s.split('-').map(Number);return d+' '+PATCH_MONTHS[m-1]+' '+y;};
const patchNew=()=>PATCHES.length>0&&PREF.patchSeen!==PATCHES[0].v;
function patchSeen(){if(patchNew()){PREF.patchSeen=PATCHES[0].v;savePref();}}
/* the Tower screen tells about a patch the player has not read yet */
function patchCard(){
  if(!patchNew())return '';
  const p=PATCHES[0];
  return `<section class="sweep pn-card">${pic('nav_codex','')}<div><p class="eyebrow">New update</p><h2>Patch ${p.v}: ${p.title}</h2><p>${p.big.map(x=>x.t).join(', ')} and more.</p></div><button class="btn" data-act="to-patch">See what is new</button></section>`;
}
function patchBlock(p,i){
  const head=`<div class="pn-head"><span class="pn-v num">Patch ${p.v}</span><span class="pn-date num">${patchDate(p.date)}</span></div><h2 class="pn-title">${p.title}</h2>`;
  const big=p.big.length?`<div class="pn-big">${p.big.map((x,k)=>`<div class="pn-hi" style="animation-delay:${k*60}ms">${pic(x.art,'')}<div><b>${x.t}</b><p>${x.d}</p></div></div>`).join('')}</div>`:'';
  const more=p.more.length?`<div class="sec-t">Also in this patch</div><ul class="pn-more">${p.more.map(x=>`<li>${x}</li>`).join('')}</ul>`:'';
  const fixes=p.fixes.length?`<div class="pn-fix-t">Fixes</div><ul class="pn-fix">${p.fixes.map(x=>`<li>${x}</li>`).join('')}</ul>`:'';
  const body=head+big+more+fixes;
  /* the newest patch is open, older ones fold away */
  return i===0?`<section class="box pn">${body}</section>`:`<details class="box pn pn-old"><summary><span class="pn-v num">Patch ${p.v}</span><span class="pn-date num">${patchDate(p.date)}</span><span class="pn-st">${p.title}</span></summary>${big+more+fixes}</details>`;
}
function codexPatches(){
  patchSeen();
  return `<p class="note">What changed in each update of Hamster Tower, newest first.</p>${PATCHES.map(patchBlock).join('')}`;
}
