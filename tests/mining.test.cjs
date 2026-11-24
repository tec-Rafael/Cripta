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
