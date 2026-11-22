const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../src/ui/fullscreen.js'), 'utf8');
function setup(request) {
  const handlers = new Map();
  const document = {documentElement:{requestFullscreen:request},
    addEventListener:(type,fn)=>handlers.set(type,fn),
    removeEventListener:type=>handlers.delete(type)};
  vm.runInNewContext(code,{document});
  return {handlers,document};
}
test('first touch requests fullscreen once, leaving manual exit possible',()=>{
  let calls=0;const {handlers}=setup(()=>{calls++;return Promise.resolve();});
  assert.equal(calls,0);
  handlers.get('pointerup')({type:'pointerup',button:0,isTrusted:true});
  assert.equal(calls,1);assert.equal(handlers.size,0);
});
test('keyboard entry ignores Escape, shortcuts and synthetic events',()=>{
  let calls=0;const {handlers}=setup(()=>calls++);
  const key=handlers.get('keydown');
  key({type:'keydown',key:'Escape',isTrusted:true});
  key({type:'keydown',key:'w',isTrusted:false});
  key({type:'keydown',key:'r',ctrlKey:true,isTrusted:true});
  assert.equal(calls,0);
  key({type:'keydown',key:'w',isTrusted:true});assert.equal(calls,1);
});
test('unsupported or blocked fullscreen leaves gameplay available',async()=>{
  assert.equal(setup(undefined).handlers.size,0);
  const {handlers}=setup(()=>Promise.reject(new Error('Denied')));
  assert.doesNotThrow(()=>handlers.get('pointerup')({type:'pointerup',button:0,isTrusted:true}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(handlers.size,0);
});
