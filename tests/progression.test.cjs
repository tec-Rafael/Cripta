const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'src/player/progression.js'), 'utf8');
function setup(saved) {
  let value = saved;
  const storage = {getItem: () => value, setItem: (key, next) => { value = next; }};
  const context = vm.createContext({});
  vm.runInContext(code, context);
  const create = () => context.createProgression({storage});
  return {create, storage};
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
test('XP levels up at the boundary and retains overflow across multiple levels', () => {
  const {create} = setup(); const progress = create();
  assert.deepEqual(plain(progress.state), {level:1,xp:0,required:100,totalXP:0});
  progress.add(80); assert.equal(progress.state.level, 1);
  progress.add(20); assert.deepEqual(plain(progress.state), {level:2,xp:0,required:150,totalXP:100});
  progress.add(170); assert.deepEqual(plain(progress.state), {level:3,xp:20,required:200,totalXP:270});
  progress.add(430); assert.deepEqual(plain(progress.state), {level:5,xp:0,required:300,totalXP:700});
  assert.deepEqual(plain(create().state), plain(progress.state));
});
test('invalid storage and XP awards cannot corrupt progress', () => {
  for (const saved of ['oops', '{"version":1,"totalXP":-10}', '{"version":1,"totalXP":1e99}', '{"version":2,"totalXP":100}']) {
    assert.equal(setup(saved).create().state.totalXP, 0);
  }
  const p = setup().create();
  for (const value of [-20, 0, 1.2, NaN, Infinity, '20']) p.add(value);
  assert.equal(p.state.totalXP, 0);
  const context = vm.createContext({}); vm.runInContext(code, context);
  const noStorage = context.createProgression({storage:{getItem(){throw Error('blocked')},setItem(){throw Error('quota')}}});
  noStorage.add(100); assert.equal(noStorage.state.level, 2);
});
test('large awards stay bounded with a valid current-level remainder', () => {
  const p = setup().create(); p.add(Number.MAX_SAFE_INTEGER);
  assert.equal(p.state.totalXP, 1000000000);
  assert.ok(p.state.xp >= 0 && p.state.xp < p.state.required);
});
test('a dead enemy grants scaled XP once, before collecting its coin', () => {
  const context = vm.createContext({Math, Date, connectedEdge:()=>true, resourceDropMotion:()=>({settled:false})});
  vm.runInContext(code, context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/world/encounter.js'),'utf8'), context);
  const result = vm.runInContext(`(() => {
    const p=createProgression(), reward=[];
    encounterRoutes=()=>({graph:new Map([[0,[]]]),point:()=>({x:12,y:12})});
    canStand=()=>true;
    const map={spawn:{x:1,y:1},house:{x:1,y:1},tower:{x:20,y:20},stairs:[]};
    const pawn={x:1,y:1,heading:{x:1,y:0}};
    const encounter=createEncounter(map,pawn,'knight',()=>reward.push('coin'),{onDefeat:enemy=>p.add(enemy.xp)});
    encounter.enemies[0].hp=0;
    encounter.update(.01);encounter.update(.01);
    return {xp:p.state.totalXP, enemies:encounter.enemies.length, coins:encounter.coins.length, collected:reward.length};
  })()`, context);
  assert.deepEqual(plain(result), {xp:30,enemies:0,coins:1,collected:0});
});
test('HUD keeps the same XP and level when switching between adventure and home', () => {
  function element() {
    const children = new Map();
    return {hidden:false,textContent:'',attrs:{},values:{},
      setAttribute(key,value){this.attrs[key]=String(value);},
      style:{setProperty(key,value){this[key]=value;}},
      querySelector(selector){if(!children.has(selector))children.set(selector,element());return children.get(selector);}
    };
  }
  const nodes = new Map(), el = id => {if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
  const context=vm.createContext({el,wallet:12,map:{encounter:{id:'archer',stats:{hp:14},hp:10,enemies:[{},{}]}}});
  vm.runInContext(code,context);
  vm.runInContext('const progression=createProgression();progression.add(120);',context);
  const main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
  vm.runInContext(main.slice(main.indexOf('function syncBattle()'),main.indexOf('function canFight()')),context);
  vm.runInContext('syncBattle()',context);
  assert.equal(el('player-level').attrs['aria-label'],'Nível 2');
  assert.equal(el('player-level').textContent,2);
  assert.equal(el('life').hidden,false);
  assert.equal(el('vitals').attrs['data-world'],'adventure');
  assert.equal(el('experience').querySelector('span').textContent,'20 / 150 XP');
  assert.equal(el('experience').attrs['aria-valuenow'],'20');
  vm.runInContext('map={encounter:null};syncBattle()',context);
  assert.equal(el('player-level').textContent,2);
  assert.equal(el('life').hidden,true);
  assert.equal(el('vitals').attrs['data-world'],'home');
  assert.equal(el('player-level').attrs['aria-label'],'Nível 2');

  assert.equal(el('experience').querySelector('span').textContent,'20 / 150 XP');
});
test('death resets coins and unprotected XP but preserves home inventory', () => {
  const saved=new Map([['cripta.coins','80'],['cripta.home.inventory.v1','{"wood":10,"gold":5}']]);
  const storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
  const label={textContent:'80'};
  const context=vm.createContext({localStorage:storage,wallet:80,el:()=>label});
  vm.runInContext(code,context);
  vm.runInContext('const progression=createProgression();progression.add(270);',context);
  const main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
  vm.runInContext(main.slice(main.indexOf('function clearCoinsOnDeath()'),main.indexOf("el('retry').onclick")),context);
  vm.runInContext('clearCoinsOnDeath()',context);
  assert.equal(context.wallet,0);
  assert.equal(saved.get('cripta.coins'),'0');
  assert.equal(label.textContent,0);
  assert.equal(saved.get('cripta.home.inventory.v1'),'{"wood":10,"gold":5}');
  assert.deepEqual(plain(vm.runInContext('createProgression().state',context)),{level:1,xp:0,required:100,totalXP:0});
});

 test('boss checkpoint survives reload and subsequent deaths',()=>{
  const {create}=setup();const p=create();p.add(700);p.die();assert.equal(p.state.level,1);
  p.add(700);p.defeatBoss(5);p.add(100);const reloaded=create();assert.equal(reloaded.checkpoint,5);
  reloaded.die();assert.equal(reloaded.state.level,5);assert.equal(reloaded.state.xp,0);
  reloaded.defeatBoss(15);assert.equal(reloaded.checkpoint,5);
  reloaded.defeatBoss(10);reloaded.die();assert.equal(reloaded.state.level,10);
 });
 test('encounters scale by level, introduce yellow enemies at three and spawn one boss',()=>{
 const context=vm.createContext({Math,Date,canStand:()=>true});
 vm.runInContext(fs.readFileSync(path.join(root,'src/world/encounter.js'),'utf8'),context);
 const result=vm.runInContext(`(()=>{
 encounterRoutes=()=>({graph:new Map(Array.from({length:20},(_,i)=>[i,[]])),point:i=>({x:12+i,y:12})});
 const map={spawn:{x:1,y:1},house:{x:1,y:1},tower:{x:45,y:45},stairs:[]};
 const pawn={x:1,y:1};
 const a=createEncounter(map,pawn,'knight',()=>{},{level:1});
 const b=createEncounter(map,pawn,'knight',()=>{},{level:3});
 const boss=createEncounter(map,pawn,'knight',()=>{},{level:5,boss:true});
 return {low:a.enemies.every(e=>e.kind==='gnome'),yellow:b.enemies.some(e=>e.kind==='yellowGnome'),hp:b.stats.hp,damage:b.stats.damage,boss:boss.enemies.map(e=>e.kind),count:b.enemies.length};
 })()`,context);
 assert(result.low);assert(result.yellow);assert.equal(result.hp,12);assert.equal(result.damage,6);assert.deepEqual(plain(result.boss),['bear','gnome','gnome','yellowGnome']);assert(result.count>=6&&result.count<=8);
 });

test('ranged impact respects radius and knight shield; class upgrades preserve missing health',()=>{
 const context=vm.createContext({Math,Date,canStand:()=>true,connectedEdge:()=>true});
 vm.runInContext(fs.readFileSync(path.join(root,'src/world/encounter.js'),'utf8'),context);
 const result=vm.runInContext(`(()=>{
 encounterRoutes=()=>({graph:new Map(),point:()=>({x:12,y:12})});
 const map={spawn:{x:1,y:1},house:{x:1,y:1},tower:{x:20,y:20},stairs:[]};
 const pawn={x:2,y:2,heading:{x:1,y:0}};
 const e=createEncounter(map,pawn,'knight',()=>{});
 const shot=()=>({kind:'enemyShot',x:4,y:2,start:{x:4,y:2},target:{x:2,y:2},left:.01,age:0,damage:3,radius:.6});
 e.setGuard(true);e.effects.push(shot());e.update(.02);const guarded=e.hp;
 e.setGuard(false);e.effects.push(shot());e.update(.02);const hit=e.hp;
 e.effects.push(shot());pawn.y=3;e.update(.02);const missed=e.hp;
 e.levelUp(3);return {guarded,hit,missed,upgraded:e.hp,max:e.stats.hp};
 })()`,context);
 assert.deepEqual(plain(result),{guarded:10,hit:7,missed:7,upgraded:9,max:12});
});
