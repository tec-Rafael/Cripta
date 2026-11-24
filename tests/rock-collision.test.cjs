const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('large rock contact follows its base on every side; mined rock is passable',()=>{
 const c=vm.createContext({});
 vm.runInContext(fs.readFileSync('src/world/collisions.js','utf8'),c);
 const rock={kind:'rock',variant:4,x:5,y:5};
 const map={surface:Array.from({length:12},()=>Array(12).fill(true)),heights:Array.from({length:12},()=>Array(12).fill(0)),stairs:[],sheep:[],decorations:[rock]};
 function stands(x,y){return c.canStand(map,{x,y},x,y);}
 assert.equal(stands(5.5,4.9),true,'behind the stone');
 assert.equal(stands(5.5,5.06),false,'back contact');
 assert.equal(stands(5.5,5.6),true,'in front without invisible wall');
 assert.equal(stands(5.5,5.4),false,'front contact');
 for(const x of [4.8,6.2])assert.equal(stands(x,5.24),true,'outside lateral edges');
 for(const x of [5,6])assert.equal(stands(x,5.24),false,'inside lateral edges');
 assert.equal(stands(5,5.49),true,'rounded corner');
 rock.felled=true;assert.equal(stands(5.5,5.24),true);
});
