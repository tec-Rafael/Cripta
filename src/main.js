const canvas = document.querySelector('#world');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const SIZE = MapGenerator.size;
let drawScene;
let map;
const pawn = createPawn(createControls(canvas));
const homeInventory = createHomeInventory(canvas, pawn);
let iteration = 0;
let previousFrame = 0;
const el=id=>document.getElementById(id);
let wallet=0, noticeTimer;
try {wallet=Math.max(0,parseInt(localStorage.getItem('cripta.coins'),10)||0);}catch{}
function collectCoin(){
  wallet++;el('wallet').textContent=wallet;
  try{localStorage.setItem('cripta.coins',String(wallet));}catch{}
}
function notifyBattle(text){
  clearTimeout(noticeTimer);el('battle-notice').textContent=text;el('battle-notice').hidden=false;
  noticeTimer=setTimeout(()=>{el('battle-notice').hidden=true;},3500);
}
function syncBattle(){
  const e=map.encounter;
  el('home-level').hidden=!!e;el('life').hidden=!e;
  el('remaining').hidden=!e;el('battle-buttons').hidden=e?.id!=='knight';
  el('guard').hidden=e?.id!=='knight';el('wallet').textContent=wallet;
  if(e){
    const bar=el('life').querySelector('[role="progressbar"]');
    bar.setAttribute('aria-valuemax',e.stats.hp);bar.setAttribute('aria-valuenow',e.hp);
    bar.style.setProperty('--health',e.hp/e.stats.hp*100+'%');
    el('life').querySelector('b').textContent=e.hp+' / '+e.stats.hp;
    el('remaining').querySelector('b').textContent=e.enemies.length;
  }
}
function canFight(){return map?.encounter&&!document.querySelector('dialog[open]');}
let selectedEnemy=null;
function attackSelected(){
  if(!canFight())return;
  map.encounter.attack(selectedEnemy);
}
let attackPointer=null;
let hoverPointer=null;
canvas.addEventListener('pointerleave',()=>{hoverPointer=null;canvas.classList.remove('building-clickable');});
canvas.addEventListener('pointerdown',event=>{
  if(event.button===0)attackPointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
});
canvas.addEventListener('pointermove',event=>{
  if(event.pointerType==='mouse')hoverPointer={clientX:event.clientX,clientY:event.clientY};
  if(attackPointer?.id===event.pointerId&&Math.hypot(event.clientX-attackPointer.x,event.clientY-attackPointer.y)>8)
    attackPointer.moved=true;
});
canvas.addEventListener('pointercancel',()=>{attackPointer=null;});
canvas.addEventListener('pointerup',event=>{
  const tap=attackPointer;
  attackPointer=null;
  if(!tap||tap.id!==event.pointerId||tap.moved)return;
  if(adventure.interact(map,canvas,event))return;
  if(!canFight()||!canvas.worldToScreen)return;
  const rect=canvas.getBoundingClientRect();
  const x=(event.clientX-rect.left)*canvas.width/rect.width;
  const y=(event.clientY-rect.top)*canvas.height/rect.height;
  const hit=map.encounter.enemies.map(enemy=>{
    const p=canvas.worldToScreen(enemy);
    return {enemy,distance:Math.hypot(x-p.x,y-p.y+25)};
  }).filter(h=>h.distance<42).sort((a,b)=>a.distance-b.distance)[0];
  if(hit){
    selectedEnemy=hit.enemy;
    map.encounter.selected=selectedEnemy;
    attackSelected();
  }else if(!['archer','monk'].includes(map.encounter.id))attackSelected();
});
el('guard').onpointerdown=e=>{if(canFight()&&map.encounter.id==='knight'){el('guard').setPointerCapture(e.pointerId);map.encounter.setGuard(true);}};
function releaseGuard(){map?.encounter?.setGuard(false);}
el('guard').onlostpointercapture=releaseGuard;
window.addEventListener('blur',releaseGuard);
window.addEventListener('keydown',e=>{
  if(!canFight()||e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.code==='KeyJ')attackSelected();
  if(e.code==='Space'&&map.encounter.id==='knight'){e.preventDefault();map.encounter.setGuard(true);}
});
window.addEventListener('keyup',e=>{if(e.code==='Space')releaseGuard();});
el('controls-toggle').onclick=()=>{
  const help=el('controls-help');
  help.hidden=!help.hidden;
  el('controls-toggle').setAttribute('aria-expanded',String(!help.hidden));
};
el('settings').onclick=()=>{homeInventory.stop();pawn.pause();releaseGuard();el('preferences').showModal();};
function changeWorld(next) {
  selectedEnemy=null;
  attackPointer=null;
  map = next;
  map.dry = map.land.map((row,y) => row.map((cell,x) => cell && !map.pools[y][x]));
  pawn.spawn(map);
  map.encounter=map.name==='Aventura'?createEncounter(map,pawn,pawn.character,collectCoin):null;
  homeConstruction.attach(map);
  homeInventory.attach(map);
  el('battle-notice').hidden=true;syncBattle();
  iteration++;
  document.querySelector('#announcement').textContent = `${map.name}. Cenário de ${SIZE} por ${SIZE} casas.`;
  canvas.dataset.generation = iteration;
  canvas.animate([{ opacity: .3, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: reducedMotion.matches ? 0 : 450, easing: 'ease-out' });
}

const homeConstruction = createHomeConstruction(homeInventory, pawn, {
  get coins(){return wallet;},
  spend(amount){
    if(wallet<amount)return false;
    wallet-=amount;el('wallet').textContent=wallet;
    try{localStorage.setItem('cripta.coins',String(wallet));}catch{}
    return true;
  }
});
const adventure = createAdventure(pawn, changeWorld);
el('game-over').addEventListener('cancel',event=>event.preventDefault());
el('retry').onclick=()=>{
  wallet=0;
  try{localStorage.setItem('cripta.coins','0');}catch{}
  el('game-over').close();
  adventure.start();
};

function render(time) {
  requestAnimationFrame(render);
  if (!map || time - previousFrame < 1000 / 40) return;
  const dt = Math.min(.05, (time - previousFrame) / 1000);
  if (!adventure.paused && !el('preferences').open && !el('game-over').open && !homeConstruction.opened) {
    homeInventory.update(dt);
    if(map.encounter?.hp!==0)pawn.update(map, dt);
    moveSheep(map, pawn, dt);
    if(map.encounter){
      const e=map.encounter, hp=e.hp, count=e.enemies.length;
      e.update(dt);
      if(hp!==e.hp||count!==e.enemies.length)syncBattle();
      if(!e.hp && e.deathTime>=.8){
        pawn.pause();
        el('game-over').showModal();
      }
    }
  }
  if(document.querySelector('dialog[open]'))homeInventory.stop();
  previousFrame = time;
  drawScene(map, pawn, time);
  canvas.classList.toggle('building-clickable',Boolean(hoverPointer&&adventure.clickableBuilding(map,canvas,hoverPointer)));
}

async function start() {
  try {
    drawScene = createScene(canvas, await loadImages(), {get matches(){return reducedMotion.matches||el('quiet-world').checked;}});
    document.querySelector('#loading').hidden = true;
    adventure.start();
    requestAnimationFrame(render);
  } catch (error) { document.querySelector('#loading').textContent = error.message; }
}
start();
