const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(kind,variant,saved={wood:10,gold:5}){
 const handlers={},data=new Map([['cripta.home.inventory.v1',JSON.stringify(saved)]]);
 function element(){return {children:[],classList:{add(){},toggle(){}},setAttribute(){},addEventListener(type,fn){this[type]=fn;},append(...children){this.children.push(...children)},querySelector(tag){return this.children[tag==='img'?0:1]}};}
 const slots=element(),toggle=element(),panel=element();panel.querySelector=s=>s.includes('slots')?slots:toggle;
 let now=10000;
 const c=vm.createContext({console,Date:class extends Date{static now(){return now;}},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},document:{querySelector:s=>s==='#home-inventory'?panel:null,createElement:element,addEventListener(){}},window:{addEventListener:(t,f)=>handlers[t]=f},canStand:()=>true,visible:()=>true});
 for(const file of ['world/buildings','world/collisions','world/home-inventory'])vm.runInContext(fs.readFileSync('src/'+file+'.js','utf8'),c);
 c.canStand=()=>true;
 const pawn={x:2.5,y:kind==='rock'&&variant>=3?3:3.2,heading:{x:0,y:-1},facing:1,pause(){},face(){}};
 const map={name:'Lar',surface:Array.from({length:10},()=>Array(10).fill(true)),heights:Array.from({length:10},()=>Array(10).fill(0)),paths:Array.from({length:10},()=>Array(10).fill(false)),stairs:[],decorations:[{kind,variant,x:2,y:2}],sheep:[]};
 const api=c.createHomeInventory({addEventListener(){}},pawn);api.attach(map);slots.children[3].click();
 return {c,api,map,pawn,data,handlers,tick(ms){now+=ms;}};
}
for(const [kind,variant,resource,count] of [['rock',1,'stone',1],['rock',4,'stone',3],['gold',1,'gold',2],['gold',2,'gold',3]]){
 test(`${kind} variant ${variant}: five hits, ${count} drops, collection and saved state`,()=>{
  const s=setup(kind,variant),before=s.api.resources[resource];
  s.handlers.keydown({code:'KeyJ'});
  for(let i=0;i<49;i++)s.api.update(.05);
  assert.equal(s.api.drops.length,0);
  for(let i=0;i<8;i++)s.api.update(.05);
  assert.equal(s.api.drops.length,count);assert.equal(s.map.decorations[0].felled,true);
  s.tick(2000);Object.assign(s.pawn,s.api.drops[0]);s.api.update(.05);
  assert.equal(s.api.resources[resource],before+count);
  const saved=JSON.parse(s.data.get('cripta.home.inventory.v1'));
  assert.equal(saved[resource],before+count);
  const restored=setup(kind,variant,saved);assert.equal(restored.map.decorations[0].felled,true);
  restored.tick(3600001);restored.api.update(1);assert.equal(restored.map.decorations[0].felled,false);
 });
}
test('stone is required, spent and refunded; old saves start with zero stone',()=>{
 const s=setup('rock',1);assert.equal(s.api.resources.stone,0);
 const cost={wood:2,gold:1,stone:5};assert.equal(s.api.spend(cost),false);
 s.api.refund({wood:0,gold:0,stone:5});assert.equal(s.api.spend(cost),true);assert.equal(s.api.resources.stone,0);
 s.api.refund(cost);assert.equal(s.api.resources.stone,5);assert.equal(s.api.resources.wood,10);
});
test('stone drops stay hidden before launch and land without a jump',()=>{
 const {c}=setup('rock',4);
 const drop={kind:'stoneDrop',x:3,y:2,fromX:2,fromY:2,bornAt:1000,delay:150};
 assert.equal(c.resourceDropMotion(drop,1100).pop,0);
 const before=c.resourceDropMotion(drop,2049),after=c.resourceDropMotion(drop,2050);
 assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.001);
 assert.ok(before.hop<.001);assert.equal(after.settled,true);
});
test('generated maps have varied mineable rocks and no small ground stones',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('src/world/map-generator.js','utf8'),c);
 const rocks=vm.runInContext("MapGenerator.generateHome().decorations.filter(item=>item.kind==='rock')",c);
 assert.ok(rocks.length>0);assert.ok(rocks.every(rock=>rock.variant>=3));
 assert.equal(new Set(rocks.map(rock=>rock.variant)).size,2);
});
test('demolition caps each material at three drops and preserves full amounts across reload and collection',()=>{
 const s=setup('rock',4),house={kind:'house',model:'Castle',x:3,y:3};
 const materials=s.c.demolitionReturns('Castle');
 assert.equal(materials.wood,26);assert.equal(materials.stone,13);
 s.api.dropSalvage(house,materials);
 assert.equal(s.api.drops.length,6);
 for(const [kind,total] of [['wood',26],['stoneDrop',13]]){
  const drops=s.api.drops.filter(drop=>drop.kind===kind);assert.equal(drops.length,3);
  assert.equal(drops.reduce((sum,drop)=>sum+drop.amount,0),total);
 }
 const saved=JSON.parse(s.data.get('cripta.home.inventory.v1'));
 const restored=setup('rock',4,saved);restored.tick(3000);
 for(const drop of [...restored.api.drops]){Object.assign(restored.pawn,drop);restored.api.update(.05);}
 assert.equal(restored.api.drops.length,0);
 assert.equal(restored.api.resources.wood,36);assert.equal(restored.api.resources.stone,13);assert.equal(restored.api.resources.gold,5);
 restored.api.update(.05);assert.equal(restored.api.resources.wood,36);
});
test('small demolition returns produce only the required number of visible items',()=>{
 const s=setup('rock',4);const amounts=s.c.demolitionReturns('House1');
 s.api.dropSalvage({kind:'house',model:'House1',x:3,y:3},amounts);
 assert.equal(amounts.wood,3);assert.equal(amounts.stone,1);
 assert.equal(s.api.drops.length,4);
});
test('death clears carried materials while preserving resource depletion and drops',()=>{
 const s=setup('rock',4,{wood:50,gold:30,stone:20,trees:{'rock:2,2':{hits:2,cutAt:0}}});
 s.api.clearCarried();assert.equal(s.api.resources.wood,0);assert.equal(s.api.resources.gold,0);assert.equal(s.api.resources.stone,0);
 const saved=JSON.parse(s.data.get('cripta.home.inventory.v1'));assert.equal(saved.trees['rock:2,2'].hits,2);
});
