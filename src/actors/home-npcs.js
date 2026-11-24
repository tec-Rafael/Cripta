/* Residents belong to completed buildings. Their ambient actions never spend resources. */
const homeNpcRoles = {House1:'pawn',House2:'pawn',House3:'pawn',Monastery:'monk',Archery:'archer',Barracks:'lancer',Castle:'knight'};

function npcStepClear(map, actor, target) {
  const distance=Math.hypot(target.x-actor.x,target.y-actor.y);
  const steps=Math.max(1,Math.ceil(distance/.15));
  let previous={x:actor.x,y:actor.y};
  for(let i=1;i<=steps;i++) {
    const next={x:actor.x+(target.x-actor.x)*i/steps,y:actor.y+(target.y-actor.y)*i/steps};
    if(!canStand(map,previous,next.x,next.y))return false;
    const site=map.construction?.job?.site;
    if(site){const box=houseFootprint({...site,model:map.construction.job.model});
      if(next.x>box.left-.2&&next.x<box.right+.2&&next.y>box.top-.2&&next.y<box.bottom+.2)return false;
    }
    previous=next;
  }
  return true;
}

function npcSpawn(map, house) {
  const entrance=buildingEntrance(house,house.model);
  for(let radius=0;radius<=5;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
    if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
    const point={x:Math.floor(entrance.x)+dx+.5,y:Math.floor(entrance.y)+dy+.5};
    if(canStand(map,point,point.x,point.y))return point;
  }
  return null;
}

// Explore the reachable map in small batches to keep movement and input responsive.
function* npcChooseRoute(map, npc) {
  const start={x:Math.floor(npc.x)+.5,y:Math.floor(npc.y)+.5};
  if(!npcStepClear(map,npc,start))return [];
  const queue=[{...start,parent:-1}],seen=new Set([start.x+','+start.y]);
  for(let i=0;i<queue.length;i++) {
    if(i>0&&i%32===0)yield;
    const current=queue[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next={x:current.x+dx,y:current.y+dy,parent:i},key=next.x+','+next.y;
      if(seen.has(key)||!map.surface[Math.floor(next.y)]?.[Math.floor(next.x)])continue;
      seen.add(key);
      if(npcStepClear(map,current,next))queue.push(next);
    }
  }
  if(queue.length<2)return [];
  // Favor a visit near scenery, otherwise choose any reachable point.
  const scenic=queue.map((point,index)=>({point,index})).filter(({point,index})=>index>0&&map.decorations.some(item=>
    !item.felled&&['tree','gold','rock'].includes(item.kind)&&Math.hypot(point.x-item.x-.5,point.y-item.y-.5)<1.6));
  let index=scenic.length&&Math.random()<.5?scenic[Math.floor(Math.random()*scenic.length)].index:1+Math.floor(Math.random()*(queue.length-1));
  const path=[];
  while(index>=0){const point=queue[index];path.unshift({x:point.x,y:point.y});index=point.parent;}
  return path;
}

function updateHomeNpcs(map, player, dt) {
  if(map.name!=='Lar'){map.npcs=[];return;}
  const houses=map.decorations.filter(item=>item.kind==='house'&&(item.color||'Black')!=='Black'&&!item.removed&&homeNpcRoles[item.model||'House1']);
  map.npcs=(map.npcs||[]).filter(npc=>houses.includes(npc.home));
  for(const house of houses) {
    if(map.npcs.some(npc=>npc.home===house))continue;
    const point=npcSpawn(map,house);
    if(!point)continue;
    map.npcs.push({kind:'npc',home:house,role:homeNpcRoles[house.model||'House1'],color:house.color||'Black',...point,origin:point,
      facing:1,motion:'idle',elapsed:0,wait:1+Math.random()*4,route:[],speed:1.2,greet:0});
  }
  let plannedThisFrame=false;
  for(const npc of map.npcs) {
    npc.elapsed+=dt;npc.greet=Math.max(0,npc.greet-dt);
    if(Math.hypot(player.x-npc.x,player.y-npc.y)<1.3&&npc.greet===0){
      npc.wait=1.2;npc.greet=7;npc.facing=Math.sign(player.x-npc.x)||npc.facing;
    }
    npc.motion='idle';
    if(npc.wait>0){npc.wait-=dt;continue;}
    if(!npc.route.length){
      if(plannedThisFrame)continue;
      plannedThisFrame=true;
      npc.plan??=npcChooseRoute(map,npc);
      const result=npc.plan.next();
      if(!result.done)continue;
      npc.plan=null;npc.route=result.value;npc.speed=Math.random()<.3?2.5:1.2;
      if(!npc.route.length){npc.wait=2;continue;}
    }
    const target=npc.route[0],dx=target.x-npc.x,dy=target.y-npc.y;
    if(Math.hypot(dx,dy)<.025){npc.route.shift();if(!npc.route.length)npc.wait=2+Math.random()*4;continue;}
    const horizontal=Math.abs(dx)>.02,step=Math.min(npc.speed*Math.min(dt,.05),Math.abs(horizontal?dx:dy));
    const next={x:npc.x+(horizontal?Math.sign(dx)*step:0),y:npc.y+(horizontal?0:Math.sign(dy)*step)};
    const occupied=map.npcs.some(other=>other!==npc&&Math.hypot(next.x-other.x,next.y-other.y)<.35)||Math.hypot(next.x-player.x,next.y-player.y)<.35;
    if(occupied||!npcStepClear(map,npc,next)){npc.route=[];npc.wait=.5+Math.random();continue;}
    npc.x=next.x;npc.y=next.y;if(horizontal)npc.facing=Math.sign(dx);
    npc.motion=npc.speed>2?'run':'walk';
  }
}

function drawHomeNpc(ctx,images,map,npc,margin,tile) {
  const image=images['npc'+npc.color+npc.role+(npc.motion==='idle'?'Idle':'Run')];
  if(!image)return;
  const size=image.height,frames=Math.floor(image.width/size);
  const frame=Math.floor(npc.elapsed*(npc.motion==='run'?15:npc.motion==='walk'?8:10))%frames;
  const x=Math.floor(npc.x),y=Math.floor(npc.y),lift=tile*mountainHeight(map,x,y,npc.x-x);
  ctx.save();ctx.translate(Math.round(margin+npc.x*tile),Math.round(margin+npc.y*tile-lift));ctx.scale(npc.facing,1);
  ctx.drawImage(image,frame*size,0,size,size,-size/2,-size/2-27,size,size);ctx.restore();
}
