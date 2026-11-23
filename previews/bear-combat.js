// Uses production combat, sprites and controls, without initializing save systems.
(async()=>{
 const el=id=>document.getElementById(id),canvas=el('world');
 const pawn=createPawn(createControls(canvas));let map,draw,last=null,tap=null;
 const status=el('status'),guard=el('guard');
 // Production asset paths are relative to the project root.

 try{
  const images=await loadImages();
  draw=createScene(canvas,images,matchMedia('(prefers-reduced-motion: reduce)'));
  function reset(){
   pawn.pause();map=MapGenerator.generateHome();const n=MapGenerator.size;
   const mask=value=>Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>typeof value==='function'?value(x,y):value));
   map.land=map.surface=map.dry=mask((x,y)=>x>0&&y>0&&x<n-1&&y<n-1);
   map.heights=mask(0);map.pools=map.raised=map.paths=mask(false);map.layers=[];map.stairs=[];map.decorations=[];map.sheep=[];map.name='Aventura';
   map.spawn={x:25.5,y:25.5};map.house={x:1,y:1};map.tower={x:45,y:45};
   pawn.setCharacter(el('class').value);pawn.spawn(map);
   map.encounter=createEncounter(map,pawn,el('class').value,()=>{},{level:5,boss:true});
   const bear=map.encounter.enemies[0];if(!bear)throw Error('Não foi possível preparar o urso.');
   bear.x=pawn.x+4;bear.y=pawn.y;
   map.encounter.enemies.slice(1).forEach((enemy,i)=>{enemy.x=pawn.x+5+i;enemy.y=pawn.y+(i-1)*2;});
   guard.hidden=el('class').value!=='knight';
   el('stats').textContent='Seu dano: '+map.encounter.stats.damage+' · Urso: '+bear.config.hp+' PV · dano '+bear.config.damage;
   el('bear-hp').max=bear.config.hp;
  }
  const attack=()=>{if(map?.encounter.hp>0)map.encounter.attack([...map.encounter.enemies].sort((a,b)=>Math.hypot(a.x-pawn.x,a.y-pawn.y)-Math.hypot(b.x-pawn.x,b.y-pawn.y))[0]);};
  el('restart').onclick=reset;el('class').onchange=reset;
  guard.onpointerdown=e=>{guard.setPointerCapture(e.pointerId);map.encounter.setGuard(true);};
  for(const name of ['onpointerup','onpointercancel','onlostpointercapture'])guard[name]=()=>map?.encounter.setGuard(false);
  window.addEventListener('keydown',e=>{if(e.target.matches('select,input'))return;if(e.code==='KeyJ')attack();if(e.code==='Space'){e.preventDefault();map?.encounter.setGuard(true);}});
  window.addEventListener('keyup',e=>{if(e.code==='Space')map?.encounter.setGuard(false);});
  window.addEventListener('blur',()=>{map?.encounter.setGuard(false);tap=null;});
  canvas.addEventListener('pointerdown',e=>{tap={id:e.pointerId,x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{if(tap?.id===e.pointerId&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<12)attack();tap=null;});
  canvas.addEventListener('pointercancel',()=>{tap=null;});
  enablePinchZoom(canvas,()=>{tap=null;pawn.pause();});
  reset();
  function frame(time){
   const dt=last===null?0:Math.min(.05,(time-last)/1000);last=time;
   const e=map.encounter;if(e.hp>0&&e.enemies.length)pawn.update(map,dt);else pawn.pause();e.update(dt);
   el('hero-hp').max=e.stats.hp;el('hero-hp').value=e.hp;el('hero-value').textContent=e.hp+'/'+e.stats.hp;
   const hp=Math.max(0,e.enemies.find(enemy=>enemy.kind==='bear')?.hp||0);el('bear-hp').value=hp;el('bear-value').textContent=hp+'/'+el('bear-hp').max;
   status.textContent=!e.hp?'Você foi derrotado. Reinicie para testar novamente.':!e.enemies.length?'Urso e gnomos derrotados!':'Teste de combate em andamento';
   for(const kind of ['gnome','yellowGnome','bear']){const count=e.enemies.filter(enemy=>enemy.kind===kind).length;const row=el('remaining-'+kind);row.hidden=!count;row.querySelector('b').textContent=count;}
   draw(map,pawn,time);requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
 }catch(error){status.textContent=error.message;}
})();
