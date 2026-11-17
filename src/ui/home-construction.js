function createHomeConstruction(inventory, pawn, wallet) {
  const dialog=document.getElementById('home-menu');
  const root=document.getElementById('home-menu-root');
  const catalog=document.getElementById('construction-catalog');
  const title=document.getElementById('home-menu-title');
  const status=document.getElementById('construction-status');
  const options=document.getElementById('house-options');
  const storageKey='cripta.home.buildings.v1';
  const cost={coins:20,wood:10,gold:5};
  const colors={Blue:'Azul',Red:'Vermelha',Purple:'Roxa',Yellow:'Amarela'};
  let map=null, buildings=[];
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(Array.isArray(saved)) buildings=saved.filter(b=>colors[b.color] && Number.isInteger(b.x) &&
      Number.isInteger(b.y) && b.x>2 && b.y>2 && b.x<46 && b.y<46)
      .map(b=>({kind:'house',x:b.x,y:b.y,color:b.color,hill:0,demolitionHits:Number.isInteger(b.demolitionHits)?Math.max(0,Math.min(9,b.demolitionHits)):0}));
  } catch {}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(buildings));}catch{}}
  function showCatalog(show){
    dialog.classList.toggle('catalog-open',show);
    root.hidden=show;catalog.hidden=!show;title.textContent=show?'Construção':'Lar';status.textContent='';
    if(show)refresh();
  }
  function refresh(){
    const resources=inventory.resources;
    for(const button of options.querySelectorAll('.build-house')) {
      button.disabled=wallet.coins<cost.coins || resources.wood<cost.wood || resources.gold<cost.gold;
    }
    status.textContent='';
  }
  const jobKey='cripta.home.construction-job.v1';
  let job=null,hover=null,routes=null,saveIn=0,repathIn=0,lastPosition=null;
  try {
    const saved=JSON.parse(localStorage.getItem(jobKey));
    if(saved&&colors[saved.color]){
      const site=saved.site;
      job={color:saved.color,phase:'placing',elapsed:Number.isFinite(saved.elapsed)?Math.max(0,Math.min(15,saved.elapsed)):0};
      if(site&&Number.isInteger(site.x)&&Number.isInteger(site.y)&&site.x>=2&&site.x<=46&&site.y>=3&&site.y<=46)
        Object.assign(job,{site:{x:site.x,y:site.y},phase:'walking'});
    }
  } catch {}
  function saveJob(){try{localStorage.setItem(jobKey,JSON.stringify(job));}catch{}}
  function freeSite(site){
    if(!map||!site)return false;
    const {x,y}=site;
    if(x<2||y<3||x>46||y>46)return false;
    for(let dy=-2;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
      if(!map.surface[y+dy]?.[x+dx]||map.heights[y+dy][x+dx]!==0||
        map.stairs.some(s=>s.x===x+dx&&s.y===y+dy))return false;
    }
    if(map.decorations.some(item=>item.x>=x-1&&item.x<=x+2&&item.y>=y-2&&item.y<=y+1))return false;
    if(map.sheep.some(item=>item.x>=x-.5&&item.x<=x+2&&item.y>=y-2&&item.y<=y+1))return false;
    return !inventory.drops.some(item=>item.x>=x&&item.x<=x+2&&item.y>=y-2&&item.y<=y+1);
  }
  function routeTo(site){
    const goal=routes.key(site.x+1,site.y+1.5);
    if(!routes.graph.has(goal))return null;
    // Connect the actual feet to the route using collision-tested cardinal segments.
    const candidates=[...routes.graph.keys()].sort((a,b)=>Math.hypot(routes.point(a).x-pawn.x,routes.point(a).y-pawn.y)-Math.hypot(routes.point(b).x-pawn.x,routes.point(b).y-pawn.y)).slice(0,24);
    let current=null,path=null;
    for(const candidate of candidates){
      const point=routes.point(candidate);
      for(const corner of [{x:point.x,y:pawn.y},{x:pawn.x,y:point.y}]){
        let previous={x:pawn.x,y:pawn.y},clear=true;
        for(const end of [corner,point]){
          const start={...previous},steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.y-start.y)*16));
          for(let i=1;i<=steps;i++){
            const next={x:start.x+(end.x-start.x)*i/steps,y:start.y+(end.y-start.y)*i/steps};
            if(!canStand(map,previous,next.x,next.y)){clear=false;break;}previous=next;
          }
          if(!clear)break;
        }
        if(clear){current=candidate;path=[corner,point];break;}
      }
      if(path)break;
    }
    if(!path)return null;
    const queue=[current],parents=new Map([[current,null]]);
    for(let i=0;i<queue.length&&!parents.has(goal);i++)for(const next of routes.graph.get(queue[i])||[]){
      if(parents.has(next))continue;
      parents.set(next,queue[i]);queue.push(next);
    }
    if(!parents.has(goal))return null;
    const steps=[];
    for(let node=goal;node!==current;node=parents.get(node))steps.push(routes.point(node));
    path.push(...steps.reverse());
    path.push({x:site.x+1,y:site.y+1.5});
    return path;
  }
  function build(color){
    if(!map||job)return;
    refresh();
    if(wallet.coins<cost.coins||inventory.resources.wood<cost.wood||inventory.resources.gold<cost.gold)return;
    if(!inventory.spend(cost))return;
    wallet.spend(cost.coins);
    job={color,phase:'placing',elapsed:0};hover=null;saveJob();
    routes=encounterRoutes(map);inventory.stop();pawn.pause();dialog.close();
    const site={x:Math.max(2,Math.min(46,Math.floor(pawn.x)+2)),y:Math.max(3,Math.min(46,Math.floor(pawn.y)))};
    hover={...site,valid:freeSite(site)&&Boolean(routeTo(site))};
  }
  function point(event,canvas){
    const rect=canvas.getBoundingClientRect();
    const world=canvas.screenToWorld({x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height});
    return {x:Math.floor(world.x)-1,y:Math.floor(world.y-(canvas.touchPlacement ? .5 : 0))};
  }
  function aim(event,canvas){
    if(job?.phase!=='placing'||!canvas.screenToWorld)return;
    const site=point(event,canvas);
    if(hover?.x===site.x&&hover?.y===site.y)return;
    hover={...site,valid:freeSite(site)&&Boolean(routeTo(site))};
  }
  function select(event,canvas,selectedSite){
    if(!job)return false;
    if(job.phase!=='placing')return true;
    if(selectedSite){hover={...selectedSite,valid:freeSite(selectedSite)&&Boolean(routeTo(selectedSite))};}
    else aim(event,canvas);
    if(!hover?.valid)return true;
    job.site={x:hover.x,y:hover.y};job.phase='walking';saveJob();
    pawn.follow(routeTo(job.site));lastPosition={x:pawn.x,y:pawn.y};repathIn=1;return true;
  }
  function update(dt){
    if(!job||!map)return;
    inventory.stop();
    if(job.phase==='walking'){
      const target={x:job.site.x+1,y:job.site.y+1.5};
      if(Math.hypot(pawn.x-target.x,pawn.y-target.y)<.08){
        pawn.follow(null);pawn.pause();job.phase='building';saveJob();
      } else {
        repathIn-=dt;
        if(repathIn<=0){
          if(!lastPosition||Math.hypot(pawn.x-lastPosition.x,pawn.y-lastPosition.y)<.05)pawn.follow(routeTo(job.site));
          lastPosition={x:pawn.x,y:pawn.y};repathIn=1;
        }
      }
    } else if(job.phase==='building'){
      job.elapsed+=dt;saveIn-=dt;
      if(saveIn<=0){saveJob();saveIn=1;}
      if(job.elapsed>=15){
        const house={kind:'house',...job.site,color:job.color,hill:0};
        buildings.push(house);map.decorations.push(house);save();
        job=null;hover=null;saveJob();pawn.pause();
      }
    }
  }
  for(const [color,label] of Object.entries(colors)){
    const card=document.createElement('article');card.className='house-plan';
    card.innerHTML=`<img class="house-preview" src="assets/tiny-swords/Buildings/${color} Buildings/House1.png" alt="Casa ${label.toLowerCase()}">
      <div class="construction-cost construction-ribbon" aria-label="Custo: 20 moedas, 10 madeiras e 5 minérios de ouro">
        <span><img src="assets/ui/gold-coin.png" alt="Moedas">20</span>
        <span><img src="assets/tiny-swords/Terrain/Resources/Wood/Wood Resource/Wood Resource.png" alt="Madeira">10</span>
        <span><img src="assets/ui/gold-small.png" alt="Minério de ouro">5</span>
      </div><button class="wood-action build-house" type="button" aria-label="Construir casa ${label.toLowerCase()}">Construir</button>`;
    card.querySelector('button').onclick=()=>build(color);options.append(card);
  }
  document.getElementById('open-construction').onclick=()=>showCatalog(true);
  document.getElementById('construction-back').onclick=()=>showCatalog(false);
  dialog.querySelector('.home-menu-close').onclick=()=>dialog.close();
  const api={
    update,aim,select,freeSite,
    cancel(){
      if(!job)return;
      job=null;hover=null;routes=null;lastPosition=null;
      pawn.follow(null);pawn.pause();inventory.stop();
      inventory.refund(cost);wallet.refund(cost.coins);saveJob();
    },
    hitHouse(house){
      if(!map||job||!buildings.includes(house))return false;
      house.demolitionHits=(house.demolitionHits||0)+1;
      if(house.demolitionHits<10){save();return false;}
      buildings=buildings.filter(item=>item!==house);
      map.decorations=map.decorations.filter(item=>item!==house);
      map.homeEffects.push({kind:'dust',x:house.x+1,y:house.y+.72,left:.8,duration:.8});
      const recovered=Math.floor(cost.wood/3);
      inventory.dropWood(house,recovered);
      save();
      return true;
    },
    get job(){return job;},get preview(){return hover;},
    attach(next){
      map=next.name==='Lar'?next:null;
      if(map){map.construction=api;routes=encounterRoutes(map);if(job?.site){job.phase='walking';pawn.follow(routeTo(job.site));}}
      if(map)for(const b of buildings){
        map.decorations=map.decorations.filter(item=>item.kind!=='bush'||item.x<b.x||item.x>b.x+1||item.y<b.y-1||item.y>b.y+1);
        if(!map.decorations.includes(b))map.decorations.push(b);
      }
    },
    open(next){if(next!==map||job)return;pawn.pause();inventory.stop();showCatalog(false);dialog.showModal();},
    get opened(){return dialog.open;}
  };
  return api;
}
