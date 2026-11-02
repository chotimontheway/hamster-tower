/* GAME CONTENT */
const ELS={
  seed:{n:'Seed',c:'#35D07F',stage:'#DDF5E4',beats:'dream'},
  dream:{n:'Dream',c:'#F06BAE',stage:'#F6E3F2',beats:'spark'},
  spark:{n:'Spark',c:'#FFC94D',stage:'#FFF2CC',beats:'water'},
  water:{n:'Water',c:'#2FD6E8',stage:'#DCF4FA',beats:'steel'},
  steel:{n:'Steel',c:'#A8BAFF',stage:'#E6EAF6',beats:'seed'},
};
const RARS={n:{n:'Common',c:'#A9B2C6',m:1,sell:40},r:{n:'Rare',c:'#6FAEFF',m:1.15,sell:120},e:{n:'Epic',c:'#C99BFF',m:1.32,sell:400},l:{n:'Legendary',c:'#FFC94D',m:1.55,sell:1500}};
const RAR_ORDER=['n','r','e','l'];
const ROLES={
  fighter:{n:'Fighter',hp:120,atk:30,def:14,spd:100,crit:6,melee:1},
  tank:{n:'Tank',hp:175,atk:19,def:26,spd:86,crit:4,melee:1},
  ranger:{n:'Ranger',hp:92,atk:33,def:10,spd:112,crit:12},
  mage:{n:'Mage',hp:88,atk:35,def:9,spd:104,crit:6},
  support:{n:'Support',hp:108,atk:21,def:14,spd:108,crit:4},
  assassin:{n:'Assassin',hp:86,atk:37,def:9,spd:124,crit:16},
};
const BRANCHES={
  fighter:[['cyclone','Cyclone','Basic attacks splash 40% to other enemies.'],['endurance','Endurance','+20% HP, 10% of damage dealt heals you.']],
  tank:[['ironwall','Iron Wall','+25% Armor.'],['counter','Counter','Attackers always take 30% of your Bite back.']],
  ranger:[['sniper','Sniper','+12% crit, +20% crit damage.'],['volley','Volley','Basic attacks fire 2 shots at 65% each.']],
  mage:[['tempest','Tempest','Attacks on all enemies are 20% stronger.'],['sigil','Sigil','Element reactions are 40% stronger.']],
  support:[['medic','Medic','Healing and shields are 30% stronger.'],['cheer','Cheer','The team starts each battle with +12% Bite.']],
  assassin:[['finisher','Finisher','Deals 40% more to enemies below 35% HP.'],['stealth','Stealth','Starts each battle with Dodge and +8 Speed.']],
};
const STS={
  shield:{n:'Shield',short:'Shield',c:'#A8BAFF',good:1,d:'Absorbs damage before HP is lost.'},
  taunt:{n:'Taunt',short:'Taunt',c:'#FF8FA3',good:1,d:'Enemy single-target attacks must aim here.'},
  dodge:{n:'Dodge',short:'Dodge',c:'#F2F2F4',good:1,d:'Fully avoids the next attack.'},
  atkUp:{n:'Bite Up',short:'+Bite',c:'#F8A838',good:1,d:'Raises Bite.'},
  defUp:{n:'Armor Up',short:'+Arm',c:'#A8BAFF',good:1,d:'Raises Armor.'},
  spdUp:{n:'Haste',short:'+Spd',c:'#8FE8B0',good:1,round:1,d:'Raises Speed, so this unit acts earlier next turn.'},
  critUp:{n:'Focus',short:'+Crit',c:'#FFE27A',good:1,d:'Raises crit chance.'},
  regen:{n:'Regen',short:'Regen',c:'#35D07F',good:1,d:'Heals at the start of each of its actions.'},
  thorns:{n:'Thorns',short:'Thorn',c:'#A8BAFF',good:1,d:'Reflects damage when hit.'},
  vamp:{n:'Lifesteal',short:'Leech',c:'#F0506E',good:1,d:'Part of the damage dealt becomes HP.'},
  poison:{n:'Poison',short:'Poison',c:'#35D07F',bad:1,d:'Loses HP at the start of each of its actions, ignoring shields.'},
  burn:{n:'Burn',short:'Burn',c:'#F8A838',bad:1,d:'Loses HP at the start of each of its actions, ignoring shields.'},
  bleed:{n:'Bleed',short:'Bleed',c:'#F0506E',bad:1,d:'Loses extra HP every time it is hit.'},
  rust:{n:'Rust',short:'Rust',c:'#F08A28',bad:1,d:'Takes 25% more damage.'},
  defDown:{n:'Armor Break',short:'-Arm',c:'#C4CEE4',bad:1,d:'Lowers Armor.'},
  weak:{n:'Weak',short:'Weak',c:'#9A9AA8',bad:1,d:'Deals 25% less damage.'},
  slow:{n:'Slow',short:'Slow',c:'#8FC8FF',bad:1,round:1,d:'Lowers Speed, so this unit acts later next turn.'},
  static:{n:'Static',short:'Static',c:'#FFC94D',bad:1,stack:1,d:'At 5 stacks it discharges: loses HP and is Stunned.'},
  drowsy:{n:'Drowsy',short:'Drowsy',c:'#F06BAE',bad:1,d:'30% chance to doze off and lose its action.'},
  sleep:{n:'Asleep',short:'Asleep',c:'#C99BFF',bad:1,d:'Loses its actions until hit or until the effect ends.'},
  stun:{n:'Stun',short:'Stun',c:'#FFE27A',bad:1,d:'Loses its next action, then is immune to crowd control for 2 actions.'},
  freeze:{n:'Frozen',short:'Frozen',c:'#BFEFFF',bad:1,d:'Loses its next action. The first hit on it is 30% stronger.'},
  silence:{n:'Silence',short:'Mute',c:'#C9C3DE',bad:1,d:'Can only use basic attacks. Cancels a charging enemy move.'},
  marked:{n:'Marked',short:'Mark',c:'#FF8FA3',bad:1,d:'The next hit on this target is a guaranteed crit.'},
  blind:{n:'Blind',short:'Blind',c:'#C9C3DE',bad:1,d:'Its next single-target attack misses.'},
  bomb:{n:'Bomb',short:'Bomb',c:'#F0506E',bad:1,d:'Explodes when the timer runs out.'},
};
/* element reactions: dmg is the multiplier, fx is the extra effect */
const REACT={
  'spark+water':{n:'Water Shock',d:'60% stronger and chains 40% to nearby enemies.',dmg:1.6,fx:'chain',v:.4},
  'seed+water':{n:'Sprout',d:'Heals the ally with the least HP.',dmg:1,fx:'healLow',v:.7},
  'steel+water':{n:'Corrosion',d:'The target takes 25% more damage for 2 actions.',dmg:1.1,fx:'rust',v:2},
  'dream+water':{n:'Mist',d:'The target misses its next attack.',dmg:1.1,fx:'blind',v:1},
  'spark+steel':{n:'Conduction',d:'Lightning jumps to 2 targets at 50% damage.',dmg:1.15,fx:'chain',v:.5},
  'seed+spark':{n:'Husk Fire',d:'The target burns for 3 actions.',dmg:1.15,fx:'burn',v:.35},
  'dream+spark':{n:'Rude Awakening',d:'The target is pushed to the end of the turn order.',dmg:1.15,fx:'push',v:.45},
  'seed+steel':{n:'Seed Grinder',d:'Causes heavy Bleed for 3 actions.',dmg:1.2,fx:'bleed',v:.3},
  'dream+seed':{n:'Dreamy Seed Scent',d:'The whole team gains 20 Rage.',dmg:1.1,fx:'nrg',v:20},
  'dream+steel':{n:'Iron Nightmare',d:'The target is Stunned for one action.',dmg:1.1,fx:'stun',v:1},
};
const rk=(a,b)=>[a,b].sort().join('+');
/* WEATHER: w is the on-screen effect */
const RULES=[
  {id:'clear',n:'Clear Skies',d:'Nothing special.',w:'calm'},
  {id:'rain',n:'Downpour',d:'Water is 30% stronger.',el:'water',w:'rain'},
  {id:'sun',n:'Scorching Sun',d:'Seed is 30% stronger.',el:'seed',w:'sun'},
  {id:'night',n:'Deep Night',d:'Dream is 30% stronger.',el:'dream',w:'night'},
  {id:'storm',n:'Thunderstorm',d:'Spark is 30% stronger.',el:'spark',w:'storm'},
  {id:'forge',n:'Hot Forge',d:'Steel is 30% stronger.',el:'steel',w:'forge'},
  {id:'wind',n:'Strong Wind',d:'The first three units to act each turn deal 15% more damage.',lead:.15,w:'wind'},
  {id:'noise',n:'Signal Noise',d:'Element reactions are 50% stronger.',react:.5,w:'glitch'},
  {id:'still',n:'Dead Calm',d:'Nobody can land a critical hit.',nocrit:1,w:'still'},
  {id:'snow',n:'Snowfall',d:'Every hit has a 15% chance to apply Slow for 1 turn.',snow:.15,w:'snow'},
  {id:'fog',n:'Thick Fog',d:'Single-target attacks on both sides have a 10% chance to miss.',fog:.1,w:'fog'},
  {id:'dust',n:'Sawdust Storm',d:'Healing and shields are 30% weaker.',heal:.7,w:'dust'},
  {id:'bloom',n:'Full Bloom',d:'Healing and shields are 30% stronger.',heal:1.3,w:'petal'},
  {id:'moon',n:'Full Moon',d:'Rage builds 50% faster.',nrg:1.5,w:'moon'},
  {id:'meteor',n:'Meteor Shower',d:'Both sides gain 15% crit chance.',crit:15,w:'meteor'},
];
const MAP_NAMES=['Night Bedroom','Hamster Cage','WHEELY Wheel','Crawl Tube','Midnight Kitchen','Balcony','Chestnut Forest','Server Room','Sawdust Burrow','Bathtub','Work Desk','Fridge','Bookshelf','Gear Workshop','Rooftop','Toy Beach','Pillow Castle','Trading Floor'];
const TONE_NAMES=['daytime','sunset','night','dreamy purple','early morning'];
const RESON=[
  {id:'same',n:'Mono Element',d:'Attacks are 15% stronger, but there are no reactions.'},
  {id:'diff',n:'Triple Element',d:'All reactions are 20% stronger.'},
  {id:'std',n:'Standard Lineup',d:'With a Tank and a Support the team gains 10% HP.'},
];
const TRIOS=[
  {ids:['knight','icemage','gunner'],n:'Lightning Storm',d:'The team deals 10% more damage.',dmg:.1},
  {ids:['miner','engineer','electrician'],n:'Worksite',d:'Earn 20% more coins.',coin:.2},
  {ids:['nurse','chef','farmer'],n:'The Farm',d:'Healing is 25% stronger.',heal:.25},
  {ids:['king','knight','blade'],n:'Royal Guard',d:'The team gains 12% HP.',hp:.12},
  {ids:['shade','samurai','pirate'],n:'Shadow Crew',d:'The team gains 10% crit chance.',crit:10},
  {ids:['wizard','singer','dozer'],n:'Long Dream',d:'Drowsy has a 50% chance to doze off.',drowsy:.5},
];
const SETS={
  miner:{n:'Miner',p2:'+10% coins.',p4:'+15% Bite.'},
  knight:{n:'Knight',p2:'+15% Armor.',p4:'Starts each battle with a big shield.'},
  wizard:{n:'Wizard',p2:'+15% Rage.',p4:'Element reactions are 30% stronger.'},
  hunter:{n:'Hunter',p2:'+8% crit chance.',p4:'+25% crit damage.'},
  nurse:{n:'Nurse',p2:'Healing is 15% stronger.',p4:'Heals 5% HP at the start of each action.'},
  thunder:{n:'Thunder',p2:'+8 Speed.',p4:'Rage skills are 25% stronger.'},
};
const SLOTS={weapon:{n:'Weapon',stat:'Bite'},armor:{n:'Armor',stat:'HP'},hat:{n:'Hat',stat:'Armor'},charm:{n:'Charm',stat:'Crit'}};
const SLOT_VAL={n:6,r:12,e:20,l:32};
/* CHESTS: a,b is the coin range; gear is the chance of an item, rars its rarity weights; pet is the chance of a pet */
const CHESTS=[
  {n:'Wood Chest',a:15,b:40,gear:.1,rars:[100,0,0,0],pet:0},
  {n:'Bronze Chest',a:50,b:110,gear:.2,rars:[80,20,0,0],pet:0},
  {n:'Silver Chest',a:150,b:300,gear:.35,rars:[50,45,5,0],pet:.005},
  {n:'Gold Chest',a:450,b:850,gear:.55,rars:[15,60,23,2],pet:.02},
  {n:'Diamond Chest',a:1300,b:2500,gear:.8,rars:[0,40,50,10],pet:.06},
];
const CHEST_BANDS=[[1,20,[80,17,3,0,0]],[21,50,[66,26,7,1,0]],[51,100,[50,32,14,3.5,.5]],[101,200,[34,36,21,7,2]],[201,500,[20,32,30,14,4]],[501,1e9,[10,26,33,23,8]]];
const BAG_COST=500;
const BAG_RATES=[['item','n',62],['item','r',24],['item','e',3],['item','l',.3],['pet','n',7],['pet','r',3],['pet','e',.6],['pet','l',.1]];
const PITY_E=60,PITY_L=300;
/* merge success rates for +1 to +5 */
const MERGE_RATE=[.92,.72,.52,.36,.22];
/* FOOD: fill is the fullness it gives, w its weight among foods of the same rarity, d how it must be served in real life.
   Every food is named safe in at least one published hamster care guide, see the README. */
const FOODS_LIST=[
  {id:'romaine',n:'Romaine Leaf',rar:'n',fill:8,w:12,d:'Romaine only, never iceberg.'},
  {id:'cucumber',n:'Cucumber Slice',rar:'n',fill:9,w:14,d:'A thin washed slice.'},
  {id:'cress',n:'Cress Sprouts',rar:'n',fill:9,w:8,d:'A small washed pinch.'},
  {id:'parsley',n:'Parsley Sprig',rar:'n',fill:10,w:9,d:'A small washed sprig.'},
  {id:'basil',n:'Basil Leaf',rar:'n',fill:10,w:9,d:'A small washed leaf.'},
  {id:'coriander',n:'Coriander Sprig',rar:'n',fill:11,w:8,d:'A small washed sprig.'},
  {id:'sage',n:'Sage Leaf',rar:'n',fill:11,w:6,d:'A small washed leaf.'},
  {id:'chicory',n:'Chicory Leaf',rar:'n',fill:12,w:7,d:'A small washed piece.'},
  {id:'dandelion',n:'Dandelion Greens',rar:'n',fill:13,w:8,d:'Clean greens, never from a sprayed lawn.'},
  {id:'spinach',n:'Spinach Leaf',rar:'n',fill:14,w:8,d:'A small washed leaf.'},
  {id:'kale',n:'Curly Kale',rar:'n',fill:15,w:7,d:'A small washed piece.'},
  {id:'cabbage',n:'Cabbage Leaf',rar:'n',fill:16,w:7,d:'A small washed piece.'},
  {id:'zucchini',n:'Zucchini Slice',rar:'n',fill:17,w:6,d:'A small washed slice.'},
  {id:'hay',n:'Timothy Hay',rar:'n',fill:20,w:5,d:'Clean, fresh and free of dust.'},
  {id:'pepper',n:'Sweet Pepper',rar:'r',fill:35,w:12,d:'Sweet peppers only, never spicy ones.'},
  {id:'asparagus',n:'Asparagus Tip',rar:'r',fill:38,w:9,d:'A small piece.'},
  {id:'beans',n:'Green Beans',rar:'r',fill:40,w:11,d:'Raw or lightly cooked, plain.'},
  {id:'cauliflower',n:'Cauliflower Floret',rar:'r',fill:44,w:11,d:'Floret only, no leaves.'},
  {id:'broccoli',n:'Broccoli Floret',rar:'r',fill:48,w:11,d:'A small washed piece.'},
  {id:'sprout',n:'Brussels Sprout',rar:'r',fill:52,w:8,d:'A small piece.'},
  {id:'peas',n:'Garden Peas',rar:'r',fill:58,w:9,d:'A small amount.'},
  {id:'carrot',n:'Carrot Stick',rar:'r',fill:62,w:10,d:'An occasional treat, carrots are sugary.'},
  {id:'parsnip',n:'Parsnip Cube',rar:'r',fill:66,w:6,d:'Raw or cooked, plain.'},
  {id:'sweetpotato',n:'Sweet Potato Cube',rar:'r',fill:75,w:6,d:'Sweet potato only, regular potato is unsafe.'},
  {id:'watermelon',n:'Watermelon Cube',rar:'e',fill:150,w:10,d:'A tiny piece, no rind or seeds.'},
  {id:'cantaloupe',n:'Cantaloupe Cube',rar:'e',fill:160,w:9,d:'A tiny piece, no rind or seeds.'},
  {id:'strawberry',n:'Strawberry',rar:'e',fill:170,w:10,d:'A tiny washed piece.'},
  {id:'blueberry',n:'Blueberry',rar:'e',fill:180,w:10,d:'A tiny washed piece.'},
  {id:'blackberry',n:'Blackberry',rar:'e',fill:190,w:8,d:'A tiny washed piece.'},
  {id:'apple',n:'Apple Slice',rar:'e',fill:200,w:10,d:'Seeds removed, they are toxic.'},
  {id:'pear',n:'Pear Slice',rar:'e',fill:210,w:8,d:'Seeds removed, they are toxic.'},
  {id:'peach',n:'Peach Slice',rar:'e',fill:220,w:7,d:'Pit removed, it is toxic.'},
  {id:'mango',n:'Mango Cube',rar:'e',fill:240,w:6,d:'A tiny piece, no pit.'},
  {id:'banana',n:'Banana Slice',rar:'e',fill:260,w:7,d:'A tiny piece, bananas are sugary.'},
  {id:'oats',n:'Rolled Oats',rar:'e',fill:280,w:6,d:'Rolled flakes, whole oats can hurt cheek pouches.'},
  {id:'millet',n:'Millet Spray',rar:'e',fill:300,w:5,d:'A small treat, not a meal.'},
  {id:'block',n:'Rodent Block',rar:'l',fill:1000,w:10,d:'The real staple diet. Everything else is a treat.'},
  {id:'pumpkinseed',n:'Pumpkin Seeds',rar:'l',fill:1100,w:8,d:'Plain and unsalted, an occasional treat.'},
  {id:'sunflower',n:'Sunflower Seeds',rar:'l',fill:1200,w:8,d:'Plain and unsalted, an occasional treat.'},
  {id:'tofu',n:'Tofu Cube',rar:'l',fill:1300,w:7,d:'Plain, a very small amount.'},
  {id:'mealworm',n:'Dried Mealworm',rar:'l',fill:1500,w:6,d:'Dried, one or two at a time.'},
  {id:'egg',n:'Boiled Egg',rar:'l',fill:1700,w:5,d:'Plain, a very small amount.'},
  {id:'chicken',n:'Plain Chicken',rar:'l',fill:2000,w:4,d:'Cooked and unseasoned, a very small amount.'},
];
const FOODS=Object.fromEntries(FOODS_LIST.map(f=>[f.id,f]));
/* rars are the chances of each rarity in RAR_ORDER order; a to b is the pet level the bag suits, b 0 means no upper limit */
const FOOD_BAGS=[
  {id:'snack',n:'Snack Bag',cost:20,rars:[85,13,2,0],a:1,b:12},
  {id:'picnic',n:'Picnic Basket',cost:150,rars:[8,54,33,5],a:12,b:40},
  {id:'feast',n:'Feast Crate',cost:900,rars:[0,0,30,70],a:40,b:0},
];
/* WHEEL RUN: x multiplies the XP of a normal run, p is the chance in percent */
const RUN_LUCK=[
  {n:'Got Distracted',x:.6,p:14,d:'stopped to clean its whiskers'},
  {n:'Steady Jog',x:1,p:52,d:'kept a steady pace'},
  {n:'Good Pace',x:1.4,p:24,d:'found its rhythm'},
  {n:'Zoomies',x:2.2,p:9,d:'got the zoomies'},
  {n:'Legendary Sprint',x:4,p:1,d:'nearly launched the wheel off its stand'},
];
/* skill operation helpers */
const D=(p,o)=>['dmg',p,o||{}],H=p=>['heal',p],SH=(p,by)=>['shield',p,by||'def'],ST=(k,v,t,ch)=>['st',k,v,t,ch],ME=(k,v,t)=>['me',k,v,t],TM=(k,v,t)=>['team',k,v,t],NR=(v,w)=>['nrg',v,w||'me'];
const pet=(id,n,el,role,rar,b,s,u)=>{
  let h=0;for(let i=0;i<id.length;i++)h+=id.charCodeAt(i);
  return {id,n,el,role,rar,off:h%11-5,skills:[{n:b[0],tgt:b[1],cd:0,ops:b[2],fx:b[3],kind:'basic'},{n:s[0],tgt:s[1],cd:s[2],ops:s[3],fx:s[4],kind:'skill'},{n:u[0],tgt:u[1],cd:0,ops:u[2],fx:u[3],kind:'ult'}]};
};
const PETS_LIST=[
 pet('blade','Little Blade','steel','fighter','n',['Slash','front',[D(1),ST('bleed',.12,2,.3),NR(10)],'slash'],['Rookie Slash','front',2,[D(1.6),NR(15)],'slash2'],['Blade Whirl','foes',[D(1.25),ST('bleed',.18,2)],'whirl']),
 pet('knight','Chubby Knight','steel','tank','r',['Shield Bash','front',[D(.85),ST('stun',1,1,.15)],'bash'],['Steel Guard','self',3,[ME('taunt',1,2),ME('defUp',40,2),SH(1.2)],'guard'],['Iron Wall','allies',[SH(2.4),['taunt',2]],'dome']),
 pet('miner','Miner','steel','fighter','r',['Pick','front',[D(1),ST('defDown',15,2,.35)],'pick'],['Gold Vein','front',3,[D(1.8),['coin',.15]],'goldvein'],['Cave-In','foes',[D(1.35),ST('rust',25,2),ST('slow',20,1)],'rockfall']),
 pet('engineer','Gear Engineer','steel','support','r',['Wrench','foe',[D(.75),ST('slow',15,1,.4)],'wrench'],['Tighten Up','allies',3,[TM('defUp',35,2),TM('spdUp',10,2)],'gearup'],['Emergency Repair','allies',[H(1.2),SH(1.2,'atk')],'repair']),
 pet('viking','Horned Warrior','steel','fighter','e',['Chop','front',[D(1.1),ST('defDown',12,2,.3)],'axe'],['Cleave','front',2,[D(1.5,{low:1}),ST('bleed',.2,2)],'axe2'],['Horned Rage','front',[ME('atkUp',50,3),ME('vamp',20,3),D(2.2)],'rage']),
 pet('samurai','One-Seed Samurai','steel','assassin','e',['Quick Cut','low',[D(1.05),ME('critUp',10,1)],'quick'],['Single Strike','low',3,[D(2.3,{pierce:.35})],'iaido'],['Thousand Blades','foes',[D(.95,{hits:2}),ST('bleed',.15,2)],'bladestorm']),
 pet('king','Big Cheek King','steel','tank','l',['Golden Scepter','front',[D(.95),ST('weak',1,1,.3)],'scepter'],['Royal Command','allies',3,[TM('atkUp',28,2),['taunt',1]],'royal'],["King's Decree",'allies',[['extra'],SH(1.6),TM('spdUp',25,2)],'crown']),

 pet('archer','Seed Forest Archer','seed','ranger','n',['Arrow Shot','foe',[D(1),ST('marked',1,2,.15)],'arrow'],['Seed Arrow','foe',2,[D(1.2),ST('poison',.32,3)],'arrowpoison'],['Arrow Rain','foes',[D(1.1),ST('poison',.2,2)],'arrowrain']),
 pet('farmer','Corn Farmer','seed','tank','n',['Pitchfork','front',[D(.85),ST('slow',15,1,.3)],'fork'],['Fertilize','self',3,[ME('regen',.7,3),['taunt',1]],'sprout'],['Harvest','foes',[D(1),['healTeam',.6]],'harvest']),
 pet('nurse','Chestnut Nurse','seed','support','r',['Gentle Tap','foe',[D(.65),ME('regen',.15,1)],'pat'],['Bandage','allyLow',2,[H(1.7),['cleanse']],'bandage'],['Emergency Care','allies',[H(1.5),TM('regen',.25,2)],'emergency']),
 pet('chef','Chubby Chef','seed','support','r',['Pan Smack','foe',[D(.85),ST('stun',1,1,.12)],'pan'],['Light Snack','allies',3,[TM('atkUp',30,2)],'snack'],['Grand Feast','allies',[H(1),TM('atkUp',40,2),NR(15,'team')],'feast']),
 pet('hunter','Slingshot Hunter','seed','ranger','r',['Pebble Shot','foe',[D(1),ST('slow',12,1,.3)],'pebble'],['Ricochet','foe',2,[D(1,{bounce:2})],'ricochet'],['Blast Shot','foes',[D(1.4),ST('burn',.2,2)],'blastshot']),
 pet('druid','Mushroom Druid','seed','mage','e',['Spore','foe',[D(1),ST('poison',.12,2)],'spore'],['Thorn Field','foes',3,[D(.6),ST('poison',.26,3),ST('slow',15,1)],'thornfield'],['Forest Spirit','foes',[D(1.25),TM('regen',.45,2)],'forest']),
 pet('squeektoshi','Squeektoshi','seed','support','l',['Seed Nibble','foe',[D(.85),ME('regen',.2,1)],'gnaw'],['Real Spin','allies',3,[['wheelBuff']],'wheelspin'],['Golden Wheel','foes',[['wheelHit'],NR(30,'team')],'goldwheel']),

 pet('dozer','Little Dozer','dream','support','n',['Pillow Smack','foe',[D(.75),ST('drowsy',1,1,.2)],'pillow'],['Contagious Yawn','foe',2,[D(.45),ST('drowsy',1,2)],'yawn'],['Group Nap','foes',[ST('drowsy',1,2),['healTeam',.7]],'sleepall']),
 pet('wizard','Yawning Wizard','dream','mage','r',['Dream Ray','foe',[D(1),ST('drowsy',1,1,.15)],'moonbeam'],['Sheep Rain','foes',2,[D(.8),ST('drowsy',1,1,.25)],'sheeprain'],['Giant Sheep Stampede','foes',[D(1.6),ST('drowsy',1,1)],'stampede']),
 pet('shade','Night Shade','dream','assassin','r',['Shadow Knife','foe',[D(1.1),ST('marked',1,1,.15)],'shadowstab'],['Throwing Star','back',2,[D(1.6),ST('bleed',.22,2)],'shuriken'],['Assassinate','low',[D(3),ME('dodge',1,2)],'assassinate']),
 pet('singer','Lullaby Singer','dream','support','e',['Low Note','foe',[D(.75),ST('weak',1,1,.2)],'note'],['Lullaby','foes',3,[ST('drowsy',1,2),ST('slow',15,1)],'lullaby'],['Sleepy Ballad','foes',[ST('sleep',1,2),NR(20,'team')],'ballad']),
 pet('priest','Moon Priest','dream','support','e',['Moonlight','foe',[D(.75),ST('blind',1,1,.15)],'moonray'],['Prayer','allyLow',2,[H(1.6),ME('regen',.2,2)],'pray'],['Resurrection','allies',[['revive',.5],H(.8)],'resurrect']),
 pet('sandman','Sandman','dream','assassin','l',["Reaper's Swing",'foe',[D(1.2),ME('vamp',15,1)],'scythe'],['Death Lullaby','foes',3,[D(.95),ST('drowsy',1,1),ST('silence',1,1,.3)],'deathlull'],['Eternal Sleep','foe',[['execute',.25,2.8]],'reaper']),

 pet('sparky','Little Sparky','spark','mage','n',['Zap','foe',[D(1),['static',1]],'zap'],['Double Zap','rand2',2,[D(.9),['static',2]],'zap2'],['Little Thunder','foes',[D(1.3),['static',1]],'thunderlet']),
 pet('gunner','Volt Gunner','spark','ranger','r',['Rapid Fire','rand3',[D(.45),['static',1]],'burst'],['Railshot','foe',2,[D(1.7,{reactX:2})],'railgun'],['Overload','foes',[D(1.5),['static',2]],'overload']),
 pet('electrician','Electrician','spark','tank','r',['Wrench Zap','front',[D(.85),['static',1]],'wrenchzap'],['Battery Shield','self',3,[ME('taunt',1,2),ME('thorns',.45,2),SH(1.1)],'battery'],['Main Breaker','foes',[D(1),['static',3],ST('slow',20,1)],'breaker']),
 pet('magician','Magician','spark','mage','e',['Playing Card','foe',[D(1.05),ST('marked',1,1,.2)],'card'],['Vanish','foe',3,[D(.85),ME('dodge',1,2),['swap']],'vanish'],['Grand Illusion','foes',[D(1.5),ST('blind',1,1),ST('silence',1,1,.3)],'magicshow']),
 pet('bomber','Bomber','spark','ranger','e',['Firecracker','foe',[D(1.05),ST('burn',.1,2,.35)],'cracker'],['Time Bomb','foe',3,[['bomb',3,2]],'timebomb'],['Cluster Bomb','foes',[D(1.2),['bomb',1,1]],'cluster']),
 pet('thor','Chubby Thunder God','spark','fighter','l',['Hammer','front',[D(1.15),['static',1]],'hammer'],['Lightning Strike','foe',2,[D(1.8),['static',2]],'lightning'],['Thunder Hammer','foes',[D(1.9),['stunChance',.5]],'thor']),

 pet('sailor','Little Sailor','water','fighter','n',['Anchor','front',[D(1),ST('slow',15,1,.3)],'anchor'],['Anchor Slam','front',2,[D(1.4),['push',.4]],'anchorslam'],['Big Wave','foes',[D(1.2),['push',.2],ST('slow',15,1)],'bigwave']),
 pet('pirate','One-Eyed Pirate','water','assassin','r',['Saber Slash','foe',[D(1.1),ST('bleed',.12,2,.25)],'saber'],['Coin Grab','low',2,[D(1.6),['coin',.15]],'plunder'],['Cannon Fire','foes',[D(1.5),ST('defDown',15,2)],'cannon']),
 pet('alchemist','Alchemist','water','support','r',['Flask Toss','foe',[D(.75),ST('poison',.12,2,.4)],'flask'],['Strange Potion','foe',2,[D(.6),['healLowOp',1]],'potion'],['Flask Blast','foes',[D(1.1),ST('rust',25,2),TM('regen',.35,2)],'flaskboom']),
 pet('diver','Diver','water','tank','r',['Harpoon','front',[D(.85),ST('bleed',.12,2,.25)],'harpoon'],['Pressure','self',3,[ME('taunt',1,2),ME('defUp',55,2)],'bubbleguard'],['Oxygen Tank','allies',[SH(2.1),H(.5)],'oxygen']),
 pet('icemage','Ice Mage','water','mage','e',['Ice Ray','foe',[D(1.05),ST('slow',20,1,.4)],'iceray'],['Ice Rain','foes',2,[D(.85),ST('slow',15,1)],'icerain'],['Blizzard','foes',[D(1.6),ST('freeze',1,1,.4)],'blizzard']),
 pet('poseidon','Trident God','water','fighter','l',['Trident Thrust','front',[D(1.15),ST('defDown',15,2,.4)],'trident'],['Whirlpool','foes',2,[D(1),ST('rust',25,2),ST('slow',15,1)],'whirlpool'],['Tsunami','foes',[D(1.85),['push',.6]],'tsunami']),
];
const PETS=Object.fromEntries(PETS_LIST.map(p=>[p.id,p]));
/* MONSTERS: moves are in priority order, the first one whose condition passes is used, the last move is the basic attack */
const mv=(n,tgt,ops,o)=>Object.assign({n,tgt,ops},o||{});
const mon=(id,n,el,tier,hp,atk,def,spd,moves,o,ai)=>Object.assign({id,n,el,tier,hp,atk,def,spd,moves,ai},o||{});
const MONS_LIST=[
 mon('grumpy_sprout','Grumpy Sprout','seed',1,30,5,0,4,[mv('Sunbathe','self',[H(1.5)],{when:'selfLow50',cd:3}),mv('Leaf Whip','pfront',[D(1)])],{},'Sunbathes to heal when below 50% HP.'),
 mon('husk_bug','Husk Bug','seed',1,26,5,3,3,[mv('Shell Up','self',[SH(1.8,'atk')],{when:'hitLast',cd:2}),mv('Ram','pfront',[D(1)])],{},'Shells up right after taking a hit.'),
 mon('corn_worm','Corn Worm','seed',1,28,5,0,5,[mv('Spit Poison','noPoison',[D(.5),ST('poison',.3,3)],{when:'anyNoPoison',cd:1}),mv('Gnaw','pfront',[D(1.1)])],{},'Spits poison at pets that are not poisoned yet.'),
 mon('popcorn','Popcorn Kernel','seed',2,26,7,0,2,[mv('Pop!','low',[D(3),['suicide']],{when:'turn3',fx:'mBoom'}),mv('Heat Up','self',[SH(.8,'atk')])],{},'Counts 2 actions, then explodes on the weakest pet.'),
 mon('strangle_vine','Strangle Vine','seed',2,44,6,1,3,[mv('Bind','full',[D(.6),['drain',30],ST('slow',20,1)],{when:'anyNrg60',cd:2}),mv('Squeeze','pfront',[D(1.3)])],{},'Binds pets close to full Rage and Slows them.'),
 mon('spotted_shroom','Spotted Shroom','seed',3,60,8,0,3,[mv('Regrow','allyLow',[H(1.6)],{when:'allyLow40',cd:3}),mv('Spore Burst','pfoes',[ST('poison',.26,3)],{cd:3}),mv('Cap Slam','pfront',[D(1.2)])],{},'Regrows weak allies, otherwise spreads Poison.'),
 mon('counting_sheep','Counting Sheep','dream',1,32,4,0,4,[mv('Three Sheep','pfront',[D(.7,{hits:3})],{when:'turn3'}),mv('Two Sheep','pfront',[D(.75,{hits:2})],{when:'turn2'}),mv('One Sheep','pfront',[D(.9)])],{},'Hits more times the longer the fight goes on.'),
 mon('ghost_pillow','Ghost Pillow','dream',1,30,5,0,3,[mv('Softly','allyLow',[H(1.5)],{when:'allyLow60',cd:2}),mv('Soft Lullaby','strong',[ST('drowsy',1,2)],{cd:3}),mv('Smother','pfront',[D(1.1)])],{},'Softly heals its weakest ally.'),
 mon('yawning_bat','Yawning Bat','dream',2,38,7,0,8,[mv('Contagious Yawn','strong',[ST('drowsy',1,2)],{cd:3}),mv('Draining Bite','lowDef',[D(1,{drain:.7})])],{fly:1},'Drains the pet with the lowest Armor.'),
 mon('insomniac_owl','Insomniac Owl','dream',2,46,8,0,9,[mv('Stare Down','self',[ME('atkUp',30,3)],{cd:4}),mv('Dive','pback',[D(1.4)])],{fly:1},'Flies over the front row to hit the back row.'),
 mon('fud_cloud','FUD Cloud','dream',2,40,5,0,5,[mv('Rumor','strong',[ST('weak',1,2),ST('silence',1,1)],{cd:3}),mv('Panic','pfoes',[ST('rust',25,2)],{cd:3}),mv('Anxiety Rain','rand3',[D(.6)])],{hidden:1},'Gives no warning. Makes the strongest pet Weak and Silenced.'),
 mon('shadow_cat','Shadow Cat','dream',3,58,11,0,10,[mv('Stalk','self',[ME('dodge',1,2),SH(.9,'atk')],{when:'noDodge',cd:2}),mv('Pounce','low',[D(1.7)])],{},'Stalks until its dodge is gone, then pounces.'),
 mon('stray_plug','Stray Plug','spark',1,28,5,0,6,[mv('Prick','nearStatic',[D(.7),['static',2]],{cd:1}),mv('Zap','pfront',[D(1.1)])],{},'Pricks the pet closest to 5 Static.'),
 mon('hv_firefly','High Voltage Firefly','spark',1,22,5,0,9,[mv('Flash','self',[ME('dodge',1,2)],{when:'noDodge',cd:2}),mv('Sting','rand',[D(1.2),['static',1]])],{fly:1},'Flashes to dodge first, then stings.'),
 mon('swollen_battery','Swollen Battery','spark',2,38,7,1,3,[mv('Swell','self',[ME('atkUp',30,3)],{cd:3}),mv('Leak Current','pfront',[D(.8),['static',2]])],{boom:.8},'Explodes on the tank when it dies.'),
 mon('faulty_sensor','Faulty Sensor','spark',2,42,8,0,5,[mv('Reset','self',[H(1.5)],{when:'selfLow40',cd:3}),mv('Interference','rand',[ST('drowsy',1,2),['static',1]],{cd:2}),mv('Miscount','rand',[D(1.3)])],{hidden:1},'Random attacks, Resets below 40% HP.'),
 mon('gas_balloon','Gas Balloon','spark',2,34,6,0,6,[mv('Fee Spike','full',[['drain',40]],{when:'anyNrg60',cd:2}),mv('Fee Blast','pfront',[D(1.3)])],{},'Spikes fees right when a pet is about to use a big skill.'),
 mon('shock_coil','Shock Coil','spark',3,56,7,0,6,[mv('Charge Up','self',[SH(1.3,'atk'),ME('atkUp',20,2)],{cd:3}),mv('Chain Shock','lowDef',[D(.55,{hits:4}),['static',1]])],{},'Shocks the pet with the lowest Armor many times.'),
 mon('lost_goldfish','Lost Goldfish','water',1,26,4,0,4,[mv('Bubble','allyLow',[SH(1.3,'atk')],{when:'allyLow60',cd:2}),mv('Flop','pfront',[D(1.1)])],{},'Bubbles protect its weakest ally.'),
 mon('leaky_bottle','Leaky Bottle','water',1,30,5,0,2,[mv('Rusty Drip','pfront',[D(.45),ST('rust',25,2)],{cd:2}),mv('Splash','rand',[D(1.2)])],{},'Applies Rust first so the whole group hits harder.'),
 mon('slimy_snail','Slimy Snail','water',2,40,5,4,1,[mv('Retreat','self',[SH(2,'atk')],{when:'hitLast',cd:2}),mv('Slime','pfront',[D(.85),ST('slow',25,1)])],{regen:.25},'Retreats when hit. Its slime Slows pets.'),
 mon('slick_soap','Slick Soap','water',2,34,7,0,8,[mv('Slip','self',[ME('dodge',1,2)],{when:'anyNrg60',cd:2}),mv('Foam','pfront',[D(.45),ST('rust',25,2),ST('blind',1,1)],{cd:3}),mv('Smack','rand',[D(1.3)])],{},'Slips away when a pet is about to use a big skill.'),
 mon('damp_moss','Damp Moss','water',2,52,4,0,1,[mv('Spread','self',[ME('atkUp',35,9),H(.5)],{cd:2}),mv('Cover','pfront',[D(1)])],{},'Grows stronger the longer it lives.'),
 mon('whale','Whale','water',3,74,8,2,1,[mv('Dump','pfront',[D(2.2)],{cd:3,charge:'Deep Breath',fx:'mDump'}),mv('Swell','pfoes',[D(.6),ST('slow',15,1)])],{},'Takes a Deep Breath for one action, then Dumps for huge damage.'),
 mon('biting_gear','Biting Gear','steel',1,30,4,1,4,[mv('Spin Up','self',[ME('atkUp',25,3)],{when:'notHit',cd:3}),mv('Grind','pfront',[D(.85,{hits:2})])],{},'Spins up when nobody threatens it.'),
 mon('clothespin','Clothespin','steel',1,26,6,0,5,[mv('Clamp','support',[D(1.1),ST('bleed',.25,3)],{cd:1}),mv('Open Jaws','self',[SH(.9,'atk')])],{},'Clamps the support pet first.'),
 mon('sniper_bot','Sniper Bot','steel',2,32,9,0,12,[mv('Watch Mempool','self',[ME('dodge',1,2)],{when:'noDodge',cd:3}),mv('Front-Run','low',[D(1.25),ST('marked',1,1,.3)])],{first:1},'Always acts first and aims at the weakest pet.'),
 mon('walking_cage','Walking Cage','steel',2,44,7,3,3,[mv('Reinforce','allyLow',[SH(1.6,'atk')],{when:'allyLow50',cd:3}),mv('Slam Shut','pfront',[D(1.2)])],{thorns:.25,taunt:2},'Stands in front to protect allies and has thorns.'),
 mon('robot_vacuum','Robot Vacuum','steel',3,66,9,2,3,[mv('Armor Suck','shielded',[['strip'],D(.8)],{when:'anyShield',cd:2,fx:'mVacuum'}),mv('Return to Dock','self',[H(1.5),SH(.8,'atk')],{when:'selfLow40',cd:4}),mv('Wall Bash','pfront',[D(1.4),ST('defDown',15,2)])],{},'Sucks away the shield of any pet that just raised one.'),
 mon('fake_contract','Fake Contract','steel',3,46,8,0,6,[mv('Request Approval','strong',[ST('rust',25,2),ST('silence',1,1)],{cd:3}),mv('Drain','full',[D(1.4),['drain',30]])],{revive:.4},'Comes back once, then drains your Rage.'),
];
const boss=(id,n,el,tier,hp,atk,def,spd,minions,moves,o,mech)=>Object.assign({id,n,el,tier,hp,atk,def,spd,minions,moves,boss:1,mech},o||{});
const BOSS_LIST=[
 boss('alarm_clock','Alarm Clock','steel',1,130,9,1,4,['biting_gear','clothespin'],[mv('Ring','pfoes',[D(.6),ST('stun',1,1)],{cd:3,charge:'Tick Tock',fx:'mBell'}),mv('Repeat Alarm','pfront',[D(.6,{hits:3})])],{phases:[{below:.5,say:'Snooze for 5 more minutes!',ops:[H(1.2)]}]},'Rings every few turns, which can Stun the whole team.'),
 boss('thief_squirrel','Thief Squirrel','seed',1,115,8,0,11,['corn_worm','grumpy_sprout'],[mv('Stuff Cheeks','self',[H(1.5),SH(1.2,'atk')],{when:'selfLow50',cd:4}),mv('Shell Toss','pfoes',[D(.5),ST('poison',.2,2)],{cd:2}),mv('Snatch','low',[D(1,{drain:1})])],{phases:[{below:.4,say:'The squirrel starts dodging!',ops:[ME('dodge',1,2)]}]},'Snatch drains HP, Stuff Cheeks heals and raises a shield.'),
 boss('broken_faucet','Broken Faucet','water',1,140,7,1,2,['lost_goldfish','leaky_bottle'],[mv('Flood','pfoes',[D(1.3),ST('slow',20,1)],{cd:4,charge:'Water Rising',fx:'mFlood'}),mv('Rising Water','self',[ME('atkUp',20,9)],{cd:2}),mv('Spray','pfront',[D(1.2)])],{},'The longer it runs, the higher the water and the harder the Flood.'),
 boss('overloaded_charger','Overloaded Charger','spark',1,120,8,0,6,['stray_plug','hv_firefly'],[mv('Short Circuit','pfoes',[D(.7),['static',2]],{cd:3}),mv('Leak Current','nearStatic',[D(1),['static',1]])],{phases:[{below:.4,say:'Overload! Voltage spikes.',ops:[ME('atkUp',45,9)]}]},'Spreads Static on the whole team and overloads below 40% HP.'),
 boss('neighbor_cat',"Neighbor's Cat",'dream',1,125,11,0,12,['ghost_pillow','yawning_bat'],[mv('Stalk','self',[ME('dodge',1,2)],{when:'noDodge',cd:3}),mv('Toy With','strong',[D(.6),ST('drowsy',1,2)],{cd:3}),mv('Pounce','low',[D(1.5),ST('bleed',.3,2)])],{phases:[{below:.5,say:'Cat eyes glow in the dark.',ops:[ME('atkUp',30,9)]}]},'Stalks to dodge attacks, then Pounces on the weakest pet.'),
 boss('giant_vacuum','Giant Vacuum','steel',2,210,11,2,3,['robot_vacuum','biting_gear'],[mv('Bag Full','self',[['selfStun']],{when:'every6'}),mv('Suck','pfoes',[['stripAll'],D(.7),['drainAll',20]],{cd:3,fx:'mVacuum'}),mv('Dust Blast','pfoes',[ST('weak',1,2),ST('blind',1,1)],{cd:4}),mv('Ram','pfront',[D(1.4)])],{},'Sucks away shields and Rage, and stalls every few turns when its bag is full.'),
 boss('rug_puller','Rug Puller','dream',2,170,12,0,7,['fud_cloud','fake_contract'],[mv('1000% Gains','pfoes',[['gift',.8,20]],{when:'cycle3:1',fx:'mGift'}),mv('Lock Liquidity','self',[SH(2,'atk')],{when:'cycle3:2'}),mv('Rug Pull','pfoes',[['rug'],D(1.2),ST('stun',1,1)],{when:'cycle3:0',fx:'mRug'})],{},'Gives the team gains, then Rug Pulls away every buff.'),
 boss('dumping_whale','Dumping Whale','water',2,260,10,3,1,['slick_soap','slimy_snail'],[mv('Price Slide','pfoes',[D(.5),ST('rust',25,2),ST('weak',1,1)],{when:'cycle3:1',fx:'mCandle'}),mv('Dump','pfront',[D(2)],{when:'cycle3:2',fx:'mDump'}),mv('Inhale Liquidity','self',[H(1.2),SH(1.4,'atk')],{when:'cycle3:0'})],{},'The most HP in the tower. Slow, but hits very hard.'),
 boss('reorg_ghost','Reorg Ghost','spark',2,180,11,0,9,['faulty_sensor','swollen_battery'],[mv('Fork','rand3',[D(.6),['static',1]],{when:'cycle3:1'}),mv('Chain Lightning','low',[D(1.6)],{when:'cycle3:2'}),mv('Reorg','self',[['reorg']],{when:'cycle3:0',fx:'mReorg'})],{},'Reorg erases two blocks: its HP returns to where it was 2 actions ago.'),
 boss('cage_hand','Cage Cleaning Hand','seed',2,240,11,1,5,['spotted_shroom','strangle_vine'],[mv('Change Bedding','pfoes',[['clear']],{cd:5,fx:'mClean'}),mv('Pick Up','strong',[D(1.2),ST('stun',1,1)],{cd:3}),mv('Close Lid','rand',[D(.55,{hits:5})],{cd:2,phase:1}),mv('Flick','pfront',[D(1.7)])],{phases:[{below:.66,say:'The hand loses patience.',ops:[]},{below:.33,say:'Cleaning time is over!',ops:[ME('atkUp',40,9)]}]},'Has 3 phases. Change Bedding removes all effects on both sides.'),
];
const MONS=Object.fromEntries([...MONS_LIST,...BOSS_LIST].map(m=>[m.id,m]));
/* SKILL TEXT: generated from the ops so it always matches the real numbers */
const TGT_P={foe:'one enemy',front:'the front enemy',foes:'all enemies',self:'self',allyLow:'the weakest ally',allies:'the whole team',low:'the weakest enemy',back:'the back enemy',rand2:'2 random enemies',rand3:'random enemies with 3 shots'};
const TGT_E={pfront:'the front pet',pback:'the back pet',pfoes:'your whole team',low:'the weakest pet',strong:'the strongest pet',support:'the support pet',lowDef:'the lowest Armor pet',full:'the pet with the most Rage',noPoison:'a pet without Poison',nearStatic:'the pet with the most Static',shielded:'a shielded pet',rand:'a random pet',rand3:'random pets',self:'self',allyLow:'its weakest ally',allies:'its whole group'};
const stTxt=(k,v,t)=>{
  const s=STS[k],pct=(k==='atkUp'||k==='defUp'||k==='spdUp'||k==='slow'||k==='defDown'||k==='critUp'||k==='vamp')?(k==='slow'||k==='defDown'?'-':'+')+v+'% ':'';
  return pct+s.n+(t&&t<9?` for ${t} action${t>1?'s':''}`:'');
};
function describeOps(ops,tgtLabel){
  const out=[];
  for(const o of ops){
    switch(o[0]){
      case 'dmg':{const x=o[2]||{};let s=`Hit ${tgtLabel} for ${Math.round(o[1]*100)}%`;if(x.hits)s+=` x${x.hits}`;if(x.pierce)s+=`, ignoring ${x.pierce*100}% Armor`;if(x.low)s+=', stronger at low HP';if(x.bounce)s+=`, bouncing to ${x.bounce} more`;if(x.drain)s+=`, draining ${x.drain*100}% as HP`;if(x.reactX)s+=', reactions are twice as strong';out.push(s);break;}
      case 'heal':out.push(`Heal ${tgtLabel}`);break;
      case 'shield':out.push(`Shield ${tgtLabel}`);break;
      case 'st':out.push((o[4]?Math.round(o[4]*100)+'% chance to apply ':'Apply ')+stTxt(o[1],o[2],o[3]));break;
      case 'me':out.push('Gain '+stTxt(o[1],o[2],o[3]));break;
      case 'team':out.push('Team gains '+stTxt(o[1],o[2],o[3]));break;
      case 'nrg':out.push((o[2]==='team'?'Team gains':'Gain')+` ${o[1]} Rage`);break;
      case 'static':out.push(`Add ${o[1]} Static`);break;
      case 'push':out.push('Push the target to the end of the turn order');break;
      case 'cleanse':out.push('Remove negative effects');break;
      case 'taunt':out.push(`Taunt for ${o[1]} action${o[1]>1?'s':''}`);break;
      case 'extra':out.push('Allies who have not acted go next');break;
      case 'coin':out.push(`${o[1]*100}% more coins this battle`);break;
      case 'bomb':out.push(`Plant a ${Math.round(o[1]*100)}% bomb that explodes after ${o[2]} of the target's actions`);break;
      case 'execute':out.push(`Instantly defeat an enemy below ${o[1]*100}% HP, otherwise hit for ${Math.round(o[2]*100)}%`);break;
      case 'healTeam':out.push('Heal the whole team');break;
      case 'healLowOp':out.push('Heal the weakest ally');break;
      case 'revive':out.push(`Revive a fallen ally with ${o[1]*100}% HP`);break;
      case 'swap':out.push('Swap the first two enemies');break;
      case 'stunChance':out.push(`${o[1]*100}% chance to Stun`);break;
      case 'wheelBuff':out.push('Team heals and gains Bite, stronger with this round\'s work');break;
      case 'wheelHit':out.push(`Hit ${tgtLabel}, stronger with this round's work`);break;
      case 'drain':out.push(`Drain ${o[1]} Rage from the target`);break;
      case 'drainAll':out.push(`Your team loses ${o[1]} Rage`);break;
      case 'strip':out.push('Remove the target\'s shield');break;
      case 'stripAll':out.push('Remove all your shields');break;
      case 'rug':out.push('Remove every buff from your team');break;
      case 'gift':out.push('Heal your team and raise its Bite');break;
      case 'reorg':out.push('HP returns to where it was 2 actions ago');break;
      case 'clear':out.push('Remove all effects from both sides');break;
      case 'suicide':out.push('Explodes after this move');break;
      case 'selfStun':out.push('Stands still for one action');break;
    }
  }
  return out.join('. ')+'.';
}
const skillDesc=s=>describeOps(s.ops,TGT_P[s.tgt]||'the target');
const moveDesc=m=>describeOps(m.ops,TGT_E[m.tgt]||'the target');
