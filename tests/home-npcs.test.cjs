const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function setup(){
 const ctx=vm.createContext({});
 for(const file of ['world/buildings','world/collisions','world/map-generator','actors/home-npcs'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),ctx);
 return ctx;
}
test('one resident per completed building, matching class and color; demolition and adventure remove residents',()=>{
 const c=setup();
 vm.runInContext(`
 const grid=()=>Array.from({length:50},()=>Array(50).fill(1));
 const map={name:'Lar',surface:grid(),heights:grid().map(row=>row.map(()=>0)),stairs:[],sheep:[],decorations:[]};
 const models=['House1','House2','House3','Monastery','Archery','Barracks','Castle'];
 models.forEach((model,i)=>map.decorations.push({kind:'house',model,color:['Blue','Red','Purple','Yellow'][i%4],x:5+i*5,y:12}));
 map.decorations.unshift({kind:'house',x:2,y:10},{kind:'house',color:'Black',x:2,y:15});
 const player={x:2,y:2};
 updateHomeNpcs(map,player,.05);updateHomeNpcs(map,player,.05);
 globalThis.result=map.npcs.map(n=>[n.role,n.color]);
 map.decorations.pop();updateHomeNpcs(map,player,.05);globalThis.after=map.npcs.length;
 map.name='Aventura';updateHomeNpcs(map,player,.05);globalThis.away=map.npcs.length;
 `,c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.result)),[['pawn','Blue'],['pawn','Red'],['pawn','Purple'],['monk','Yellow'],['archer','Blue'],['lancer','Red'],['knight','Purple']]);
 assert.equal(c.after,6);assert.equal(c.away,0);
});
test('home residents move without crossing scenery or cliffs',()=>{
 const c=setup();
 vm.runInContext(`
 const map=MapGenerator.generateHome();map.name='Lar';const player=map.spawn;
 updateHomeNpcs(map,player,.05);globalThis.initialCount=map.npcs.length;
 map.house.color='Blue';
 updateHomeNpcs(map,player,.05);globalThis.count=map.npcs.length;
 const start={x:map.npcs[0].x,y:map.npcs[0].y};globalThis.moved=false;globalThis.valid=true;
 for(let i=0;i<1200;i++){
  updateHomeNpcs(map,player,.05);
  for(const n of map.npcs){if(!canStand(map,n,n.x,n.y))globalThis.valid=false;if(Math.hypot(n.x-start.x,n.y-start.y)>.2)globalThis.moved=true;}
 }
 `,c);
 assert.equal(c.initialCount,0);assert.equal(c.count,1);assert.equal(c.valid,true);assert.equal(c.moved,true);
});
test('all loaded sprite paths exist, including Black Pawn and NPC variants',async()=>{
 const sources=[];
 const c=setup();c.Image=class{set src(value){sources.push(value);assert.ok(fs.existsSync(path.join(root,value)),value);this.onload();}};
 vm.runInContext(fs.readFileSync(path.join(root,'src/assets.js'),'utf8'),c);
 await c.loadImages();
 assert.ok(sources.some(p=>p.includes('Black Units/Pawn/Pawn_Idle Axe.png')));
 assert.equal(sources.filter(p=>/Units\/(Black|Blue|Red|Purple|Yellow) Units\/(Pawn\/Pawn_|Warrior\/Warrior_|Archer\/Archer_|Monk\/|Lancer\/Lancer_)(Idle|Run)\.png$/.test(p)).length,60);
});

test('roaming reaches beyond the former home radius and plans in batches',()=>{
 const c=setup();
 vm.runInContext(`
 Math.random=()=>.99999;
 const map={surface:Array.from({length:30},()=>Array(30).fill(1)),heights:Array.from({length:30},()=>Array(30).fill(0)),stairs:[],sheep:[],decorations:[]};
 const npc={x:1.5,y:1.5,origin:{x:1.5,y:1.5}};
 const plan=npcChooseRoute(map,npc);let result,batches=0;
 do{result=plan.next();batches++;}while(!result.done);
 globalThis.batches=batches;globalThis.destination=result.value.at(-1);
 globalThis.valid=result.value.every((point,i,path)=>i===0||npcStepClear(map,path[i-1],point));
 `,c);
 assert.ok(c.batches>1);assert.ok(Math.hypot(c.destination.x-1.5,c.destination.y-1.5)>20);assert.equal(c.valid,true);
});
