const combatClasses = {
  knight: {hp:12, damage:6, range:1, interval:.4, impact:.18},
  lancer: {hp:14, damage:5, range:2, interval:.45, impact:.07},
  monk: {hp:9, damage:7, range:4, interval:1.3, impact:.65},
  archer: {hp:14, damage:4, range:6, interval:.7, impact:.44},
};
const hammerGnome = {xp:30, hp:9, damage:4, sight:8, reach:.9, speed:2, windup:.25, impact:.1, tolerance:.2, rest:.6};
const enemyTypes={gnome:hammerGnome,yellowGnome:{xp:45,hp:8,damage:3,sight:10,reach:4,speed:1.8,windup:.55,impact:.1,tolerance:0,rest:.7,radius:.6},bear:{xp:250,hp:90,damage:8,sight:12,reach:1.5,speed:1.2,patrolSpeed:.65,windup:.4,impact:.07,tolerance:.25,rest:.45}};
function scaledClass(id,level){const base=combatClasses[id];return {...base,hp:Math.round(base.hp*(1+.12*(level-1))),damage:Math.round(base.damage*(1+.08*(level-1)))};}
const encounterSize = {min:4,max:6};
const gap = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function visible(map,a,b) {
  const steps = Math.ceil(gap(a,b)*8);
  let x=Math.floor(a.x), y=Math.floor(a.y);
  for (let i=1;i<=steps;i++) {
    const nx=Math.floor(a.x+(b.x-a.x)*i/steps), ny=Math.floor(a.y+(b.y-a.y)*i/steps);
    if (nx!==x && !connectedEdge(map,x,y,nx,y)) return false;
    if (ny!==y && !connectedEdge(map,nx,y,nx,ny)) return false;
    x=nx; y=ny;
  }
  return true;
}

// Build only the component connected to the house. Test solid props along
// each edge once; moving sheep are checked again during actual movement.
function encounterRoutes(map) {
  const size=map.land.length, key=(x,y)=>Math.floor(y)*size+Math.floor(x);
  const point=k=>({x:k%size+.5,y:Math.floor(k/size)+.5});
  const graph=new Map(), root=key(map.spawn.x,map.spawn.y), queue=[root];
  const staticMap={...map,sheep:[],decorations:[]};
  const byCell=new Map();
  for (const item of map.decorations) {
    if (!['house','tower','rock','tree','gold'].includes(item.kind)) continue;
    for(let dy=item.kind==='house'?-Math.ceil(getBuildingModel(item.model).height/64):-1;dy<=1;dy++) for(let dx=-1;dx<=(item.kind==='house'?getBuildingModel(item.model).width/64:2);dx++) {
      const k=key(item.x+dx,item.y+dy);
      if(!byCell.has(k)) byCell.set(k,[]);
      byCell.get(k).push(item);
    }
  }
  graph.set(root,[]);
  for(let i=0;i<queue.length;i++){
    const k=queue[i], a=point(k);
    staticMap.decorations=byCell.get(k)||[];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=a.x+dx,y=a.y+dy;
      if(!map.surface[Math.floor(y)]?.[Math.floor(x)]) continue;
      const n=key(x,y);
      if(graph.get(k).includes(n)) continue;
      let prev=a, clear=true;
      for(let j=1;j<=5;j++){
        const next={x:a.x+dx*j/5,y:a.y+dy*j/5};
        if(!canStand(staticMap,prev,next.x,next.y)){clear=false;break;}
        prev=next;
      }
      if(!clear) continue;
      if(!graph.has(n)){graph.set(n,[]);queue.push(n);}
      graph.get(k).push(n);graph.get(n).push(k);
    }
  }
  function nextStep(start,goal){
    if(start===goal) return start;
    const visit=[start],first=new Map([[start,start]]);
    for(let i=0;i<visit.length;i++) for(const n of graph.get(visit[i])||[]){
      if(first.has(n))continue;
      const step=i===0?n:first.get(visit[i]);
      if(n===goal)return step;
      first.set(n,step);visit.push(n);
    }
    return start;
  }
  function nearest(pointToReach){
    const cell=key(pointToReach.x,pointToReach.y);
    if(graph.has(cell))return cell;
    let nearestCell=null, distance=Infinity;
    for(const candidate of graph.keys()){
      const d=gap(point(candidate),pointToReach);
      if(d<distance){distance=d;nearestCell=candidate;}
    }
    return nearestCell;
  }
  return {key,point,graph,nextStep,nearest};
}

function createEncounter(map,pawn,id,reward,{onDefeat=()=>{},level=1,boss=false}={}){
  const routes=encounterRoutes(map), stats=scaledClass(id,level), enemies=[], coins=[], effects=[];
  const sites=[...routes.graph.keys()].map(routes.point).filter(p=>gap(p,map.spawn)>8 &&
    [map.house,map.tower].every(b=>Math.hypot(p.x-b.x-1,p.y-b.y-.72)>2) &&
    canStand(map,p,p.x,p.y) &&
    !map.stairs.some(s=>s.x===Math.floor(p.x)&&s.y===Math.floor(p.y)));
  const count=boss?4:3+Math.min(level,20)+Math.floor(Math.random()*3);
  while(enemies.length<count && sites.length){
    if(boss&&enemies.length)sites.sort((a,b)=>gap(a,enemies[0])-gap(b,enemies[0]));
    const p=sites.splice(Math.floor(Math.random()*(boss&&enemies.length?Math.min(8,sites.length):sites.length)),1)[0];
    const kind=boss?(enemies.length===0?'bear':enemies.length===3?'yellowGnome':'gnome'):level>=3&&(enemies.length===0||Math.random()<.35)?'yellowGnome':'gnome';
    const base=enemyTypes[kind],config={...base,xp:Math.round(base.xp*(1+.10*(level-1))),hp:Math.round(base.hp*(1+.10*(level-1))),damage:Math.round(base.damage*(1+.06*(level-1)))};
    enemies.push({...p,kind,config,hp:config.hp,phase:'patrol',timer:0,facing:1,clock:0});
  }
  let hp=stats.hp, cooldown=0, swing=null, guard=false;
  let deathTime=0;
  function attack(selected){
    if(cooldown>0||guard||hp<=0)return 'busy';
    const ranged=id==='archer'||id==='monk';
    if(ranged&&(!selected||!enemies.includes(selected)||selected.hp<=0))return 'select';
    if(selected&&gap(selected,pawn)>stats.range+.25)return 'range';
    if(selected&&!visible(map,pawn,selected))return 'blocked';
    const target=enemies.filter(e=>e.hp>0&&(!selected||selected===e)&&gap(e,pawn)<=stats.range+.25&&visible(map,pawn,e))
      .sort((a,b)=>gap(a,pawn)-gap(b,pawn))[0];
    if((id==='archer'||id==='monk')&&!target)return;
    const aim=target?{x:target.x-pawn.x,y:target.y-pawn.y}:pawn.heading;
    const length=Math.hypot(aim.x,aim.y)||1;
    swing={time:0,target,dx:aim.x/length,dy:aim.y/length,mark:target&&{x:target.x,y:target.y},hit:false};
    cooldown=stats.interval;
    return 'started';
  }
  function impact(){
    const {dx,dy,mark}=swing;
    if(id==='archer'){
      if(swing.target?.hp>0)effects.push({kind:'arrow',x:pawn.x,y:pawn.y,target:swing.target,age:0,left:.65,start:{x:pawn.x,y:pawn.y}});return;
    }
    if(id==='monk'){
      const target=swing.target;
      if(target?.hp>0&&visible(map,pawn,target)&&gap(pawn,target)<=stats.range+.2){
        effects.push({kind:'pulse',x:target.x,y:target.y,left:.35});
        target.hp-=stats.damage;
      }
      return;
    }
    const hits=enemies.filter(e=>{
      const x=e.x-pawn.x,y=e.y-pawn.y;
      if(gap(e,pawn)>stats.range+(id==='lancer'?0:.2)||!visible(map,pawn,e))return false;
      if(id==='monk')return mark&&gap(e,mark)<.5;
      return x*dx+y*dy>=0 && Math.abs(x*dy-y*dx)<(id==='knight'?.7:.36);
    }).sort((a,b)=>gap(a,pawn)-gap(b,pawn));
    for(const e of hits)e.hp-=stats.damage;
  }
  function update(dt){
    if(hp<=0){
      deathTime+=dt;
      for(let i=effects.length-1;i>=0;i--){
        effects[i].left-=dt;
        if(effects[i].left<=0)effects.splice(i,1);
      }
      return;
    }
    cooldown=Math.max(0,cooldown-dt);
    if(swing){
      swing.time+=dt;
      if(!swing.hit&&swing.time>=stats.impact){impact();swing.hit=true;}
      if(!cooldown)swing=null;
    }
    for(let i=effects.length-1;i>=0;i--){
      const f=effects[i];
      if(f.kind==='enemyShot'){
        f.age+=dt;f.left-=dt;const t=Math.min(1,f.age/(f.duration||.55));f.x=f.start.x+(f.target.x-f.start.x)*t;f.y=f.start.y+(f.target.y-f.start.y)*t;
        if(f.left<=0&&gap(pawn,f.target)<=f.radius&&visible(map,f.start,pawn)){const blocked=guard&&((f.start.x-pawn.x)*pawn.heading.x+(f.start.y-pawn.y)*pawn.heading.y)>0;if(!blocked)hp=Math.max(0,hp-f.damage);}
      }else if(f.kind==='arrow'){
        f.age+=dt;f.left-=dt;
        const t=Math.min(1,f.age/.65),target=f.target;
        f.x=f.start.x+(target.x-f.start.x)*t;
        f.y=f.start.y+(target.y-f.start.y)*t;
        f.arc=4*t*(1-t)*100;
        f.angle=Math.atan2((target.y-f.start.y)*64-400*(1-2*t),(target.x-f.start.x)*64);
        if(f.left<=0&&target.hp>0&&visible(map,f.start,target))target.hp-=stats.damage;
      }else f.left-=dt;
      if(f.left<=0)effects.splice(i,1);
    }
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i], config=e.config;
      if(e.hp<=0){
        effects.push({kind:'dust',x:e.x,y:e.y,left:.8,duration:.8});
        const landings=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:e.x+dx*.75,y:e.y+dy*.75}))
          .filter(point=>canStand(map,e,point.x,point.y)&&visible(map,e,point));
        const landing=landings[Math.floor(Math.random()*landings.length)]||{x:e.x,y:e.y};
        coins.push({kind:'coin',...landing,fromX:e.x,fromY:e.y,bornAt:Date.now(),age:0});
        enemies.splice(i,1);
        onDefeat({kind:e.kind,xp:config.xp,bossLevel:e.kind==='bear'?5:null});continue;
      }
      e.clock+=dt;e.timer-=dt;e.moving=false;
      if(e.phase==='strike'){
        // Track during anticipation, then commit to the final hammer swing.
        if(e.clock-dt < config.windup){
          const distance=gap(e,pawn);
          if(distance>0){e.dx=(pawn.x-e.x)/distance;e.dy=(pawn.y-e.y)/distance;}
          e.facing=Math.sign(e.dx)||e.facing;
        }
        if(e.timer<=0){
          const x=pawn.x-e.x,y=pawn.y-e.y;
          const blocked=guard && x*pawn.heading.x+y*pawn.heading.y<=0;
          if(e.kind==='yellowGnome'){
            if(gap(e,pawn)<=config.reach && visible(map,e,pawn)){
              const start={x:e.x+e.facing*.4,y:e.y},target={x:pawn.x,y:pawn.y};
              const duration=Math.max(.12,gap(start,target)/12);
              effects.push({kind:'enemyShot',...start,start,target,left:duration,duration,age:0,damage:config.damage,radius:config.radius});
            }
          }
          else if(!blocked&&gap(e,pawn)<=config.reach+config.tolerance&&x*e.dx+y*e.dy>=0&&visible(map,e,pawn))
            hp=Math.max(0,hp-config.damage);
          e.phase='recover';e.timer=config.rest;e.clock=0;
        }
        continue;
      }
      if(e.phase==='recover'&&e.timer>0)continue;
      const dist=gap(e,pawn);
      // Once alerted, track the player throughout the detection radius even behind obstacles.
      const sees=dist<=config.sight&&(e.alerted||visible(map,e,pawn));
      if(sees)e.alerted=true;
      if(sees&&dist<=config.reach&&visible(map,e,pawn)){
        e.dx=(pawn.x-e.x)/(dist||1);e.dy=(pawn.y-e.y)/(dist||1);
        e.facing=Math.sign(e.dx)||e.facing;e.phase='strike';e.timer=config.windup+config.impact;e.clock=0;e.waypoint=null;continue;
      }
      if(sees)e.goal=routes.nearest(pawn);
      const current=routes.key(e.x,e.y);
      if(e.goal===current&&!sees){e.goal=null;e.alerted=false;}
      e.phase=sees||e.goal!=null?'chase':'patrol';
      if(!e.waypoint){
        const neighbors=routes.graph.get(current)||[];
        if(e.phase==='patrol'&&e.timer>0)continue;
        const step=e.goal!=null?routes.nextStep(current,e.goal):neighbors[Math.floor(Math.random()*neighbors.length)];
        if(step===undefined)continue;
        const center=routes.point(current);
        // Return to the route center before turning, avoiding diagonal corner collisions.
        e.waypoint=gap(e,center)>.05?center:
          sees&&current===e.goal?{x:pawn.x,y:pawn.y}:routes.point(step);
        if(step===current&&!sees)e.goal=null;
      }
      const d=gap(e,e.waypoint), travel=Math.min(d,dt*(e.phase==='chase'?config.speed:(config.patrolSpeed||1)));
      const x=e.x+(e.waypoint.x-e.x)*travel/(d||1),y=e.y+(e.waypoint.y-e.y)*travel/(d||1);
      if(canStand(map,e,x,y)){
        e.moving=travel>0;e.facing=Math.sign(x-e.x)||e.facing;e.x=x;e.y=y;
        if(travel===d){e.waypoint=null;e.timer=Math.random()*.7;}
      }else {e.waypoint=null;e.timer=.25;}
    }
    if(hp<=0){
      swing=null;guard=false;
      effects.push({kind:'dust',x:pawn.x,y:pawn.y,left:.8,duration:.8});
      return;
    }
    for(let i=coins.length-1;i>=0;i--){
      const coin=coins[i];coin.age+=dt;
      if(resourceDropMotion(coin,Date.now()).settled&&gap(coin,pawn)<.8&&visible(map,coin,pawn)){coins.splice(i,1);reward();}
    }
  }
  return {enemies,coins,effects,attack,update,stats,id,get deathTime(){return deathTime;},get hp(){return hp;},get swing(){return swing;},
    levelUp(level){const next=scaledClass(id,level),gain=next.hp-stats.hp;Object.assign(stats,next);if(hp>0)hp=Math.min(stats.hp,hp+Math.max(0,gain));},get guarding(){return guard;},setGuard(value){guard=id==='knight'&&value&&!swing;}};
}
