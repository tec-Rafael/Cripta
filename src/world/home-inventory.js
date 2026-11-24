// Yield follows the visible deposit size; trees retain their existing yield.
function harvestYield(node){
  if(node.kind==='gold')return node.variant%2===0?3:2;
  if(node.kind==='rock')return Math.min(3,Math.max(1,node.variant||1));
  return 1;
}

// Persisted timestamps let airborne resources settle naturally across page reloads.
function resourceDropMotion(drop, now) {
  const still={x:drop.x,y:drop.y,hop:0,tilt:0,pop:1,settled:true};
  if(!Number.isFinite(drop.fromX)||!Number.isFinite(drop.fromY)||!Number.isFinite(drop.bornAt))return still;
  const t=Math.max(0,Math.min(1,(now-drop.bornAt-(drop.delay||0))/800));
  if(t>=1)return still;
  const launch=Math.min(1,t/.68),travel=1-(1-launch)**2;
  const bounce=Math.max(0,(t-.68)/.32);
  return {x:drop.fromX+(drop.x-drop.fromX)*travel,y:drop.fromY+(drop.y-drop.fromY)*travel,
    hop:t<.68?4*launch*(1-launch)*28:Math.abs(Math.sin(bounce*Math.PI*2))*(1-bounce)*9,
    tilt:Math.sin(launch*Math.PI)*.22*Math.sign(drop.x-drop.fromX||1),
    pop:Math.min(1,.35+launch*2),settled:false};
}

function createHomeInventory(canvas, pawn, {storageKey='cripta.home.inventory.v1'}={}) {
  const regrowAfter = 60 * 60 * 1000;
  const swingDuration = .6;
  const impactTime = .25;
  const panel = document.querySelector('#home-inventory');
  const slots = panel.querySelector('.inventory-slots');
  const toggle = panel.querySelector('.inventory-toggle');
  const resourcePath = 'assets/tiny-swords/Terrain/Resources/';
  const tools = ['Martelo', 'Machado', 'Faca', 'Picareta'];
  let state = {trees: {}, drops: [], wood: 0, gold: 0, stone: 0, order: [], goldPositions: {}, removedTrees: {}, stumpHits: {}};
  let map = null;
  let selected = 0;
  let target = null;
  let swing = null;
  let pointerId = null;
  let refreshIn = 0;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || typeof saved !== 'object') return;
      state.wood = Number.isSafeInteger(saved.wood) && saved.wood >= 0 ? saved.wood : 0;
      state.gold = Number.isSafeInteger(saved.gold) && saved.gold >= 0 ? saved.gold : 0;
      state.stone = Number.isSafeInteger(saved.stone) && saved.stone >= 0 ? saved.stone : 0;
      state.order = [...new Set((Array.isArray(saved.order) ? saved.order : []).filter(kind => ['wood','gold','stone'].includes(kind)))];
      for (const kind of ['wood','gold','stone']) if (state[kind] > 0 && !state.order.includes(kind)) state.order.push(kind);
      state.goldPositions = {};
      for (const [id, point] of Object.entries(saved.goldPositions || {})) {
        if (/^(gold|rock):\d+,\d+$/.test(id) && Number.isInteger(point?.x) && Number.isInteger(point?.y) &&
            point.x > 0 && point.y > 0 && point.x < 49 && point.y < 49)
          state.goldPositions[id] = {x:point.x,y:point.y};
      }
      for(const [id,value] of Object.entries(saved.removedTrees||{}))if(/^\d+,\d+$/.test(id)&&value===true)state.removedTrees[id]=true;
      for(const [id,value] of Object.entries(saved.stumpHits||{}))if(/^\d+,\d+$/.test(id)&&Number.isInteger(value)&&value>0&&value<3)state.stumpHits[id]=value;
      state.trees = {};
      for (const [id, tree] of Object.entries(saved.trees || {})) {
        if (/^((gold|rock):)?\d+,\d+$/.test(id) && Number.isInteger(tree?.hits) && tree.hits >= 1 && tree.hits <= 5 &&
            Number.isFinite(tree.cutAt) && tree.cutAt >= 0) state.trees[id] = tree;
      }
      state.drops = (Array.isArray(saved.drops) ? saved.drops : []).filter(drop =>
        typeof drop.id === 'string' && Number.isFinite(drop.x) && Number.isFinite(drop.y) &&
        drop.x >= 0 && drop.y >= 0 && drop.x < 50 && drop.y < 50);
    } catch {}
  }
  load();

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }
  function treeId(tree) { return tree.resourceId || (['gold','rock'].includes(tree.kind) ? tree.kind+':' : '') + tree.x + ',' + tree.y; }
  function trunk(tree) {
    if(tree.kind==='house')return {x:tree.x+getBuildingModel(tree.model).width/128,y:tree.y+.72};
    return {x: tree.x + .5, y: tree.y + (['gold','rock'].includes(tree.kind) ? .55 : tree.variant <= 2 ? .92 : .71)};
  }
  function attackPoint(item){
    if(item.kind!=='house')return trunk(item);
    const box=houseFootprint(item);
    return {x:Math.max(box.left,Math.min(box.right,pawn.x)),y:Math.max(box.top,Math.min(box.bottom,pawn.y))};
  }
  function stop() {
    target = null;
    swing = null;
    pointerId = null;
  }
  function drawSlots() {
    for (const [index, button] of [...slots.children].entries()) {
      const resource = state.order[index-tools.length];
      const count = resource ? state[resource] : 0;
      button.classList.toggle('selected', index === selected);
      button.setAttribute('aria-pressed', String(index === selected));
      button.setAttribute('aria-label', tools[index] || (count ? (resource === 'gold' ? 'Ouro, ' : resource === 'stone' ? 'Pedra, ' : 'Madeira, ') + count : 'Espaço vazio'));
      const image = button.querySelector('img');
      image.hidden = index >= tools.length && !count;
      image.classList.toggle('gold-item', resource === 'gold' && count > 0);
      if (count) image.src = resource === 'gold' ? 'assets/ui/gold-small.png' : resource === 'stone' ? 'assets/ui/stone-drop.png' : resourcePath + 'Wood/Wood Resource/Wood Resource.png';
      button.querySelector('b').textContent = count || '';
    }
  }
  for (let index = 0; index < 8; index++) {
    const button = document.createElement('button');
    button.type = 'button';
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    image.src = resourcePath + (index < 4 ? 'Tools/Tool_0' + (index + 1) + '.png' : 'Wood/Wood Resource/Wood Resource.png');
    button.append(image, document.createElement('b'));
    button.addEventListener('click', () => { selected = index; stop(); drawSlots(); });
    slots.append(button);
  }
  toggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Abrir inventário' : 'Recolher inventário');
  });
  panel.classList.add('collapsed');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir inventário');
  drawSlots();

  function relocateGold(node) {
    const candidates = [];
    for (let y=1; y<map.surface.length-1; y++) for (let x=1; x<map.surface[y].length-1; x++) {
      if (x===node.x && y===node.y || Math.hypot(pawn.x-x-.5,pawn.y-y-.55)<2) continue;
      const site=map.construction?.job?.site;
      if(site&&x>site.x-2&&x<site.x+getBuildingModel(map.construction.job.model).width/64+2&&Math.abs(site.y-y)<4)continue;
      // Leave flat approaches open and avoid paths, doors and other resources.
      let clear = true;
      for (let dy=-1; dy<=1 && clear; dy++) for (let dx=-1; dx<=1; dx++) {
        if (!map.surface[y+dy]?.[x+dx] || map.heights[y+dy][x+dx]!==0 ||
            map.paths[y]?.[x] || map.stairs.some(s=>s.x===x+dx && s.y===y+dy)) {
          clear=false; break;
        }
      }
      if (!clear || map.decorations.some(item=>item!==node && item.kind!=='bush' && Math.abs(item.x-x)<(['house','tower'].includes(item.kind)?3:1.5) && Math.abs(item.y-y)<(['house','tower'].includes(item.kind)?3:1.5))) continue;
      if (state.drops.some(drop=>Math.hypot(drop.x-x-.5,drop.y-y-.5)<1.5)) continue;
      const point={x:x+.5,y:y+.55};
      if (canStand(map,point,point.x,point.y)) candidates.push({x,y});
    }
    if (!candidates.length) return false;
    const position=candidates[Math.floor(Math.random()*candidates.length)];
    state.goldPositions[treeId(node)]=position;
    Object.assign(node,position,{hill:0});
    return true;
  }
  function refresh() {
    const now = Date.now();
    let changed = false;
    for (const tree of map.decorations.filter(item => ['tree','gold','rock'].includes(item.kind))) {
      const id = treeId(tree), record = state.trees[id];
      if(tree.kind==='tree'&&state.removedTrees[id]){tree.removed=true;tree.felled=true;continue;}
      if (record?.cutAt && now - record.cutAt >= regrowAfter) {
        if (['gold','rock'].includes(tree.kind) && !relocateGold(tree)) continue;
        delete state.trees[id];
        changed = true;
      }
      tree.felled = Boolean(state.trees[id]?.cutAt);
    }
    if (changed) save();
  }
  function attach(next) {
    stop();
    map = next.name === 'Lar' ? next : null;
    panel.hidden = !map;
    next.homeInventory = map ? api : null;
    if (map) {
      map.homeEffects = [];
      for (const node of map.decorations.filter(item=>['gold','rock'].includes(item.kind))) {
        node.resourceId=treeId(node);
        const position=state.goldPositions[node.resourceId];
        if (position) Object.assign(node,position,{hill:0});
        node.felled=Boolean(state.trees[node.resourceId]?.cutAt);
      }
      refresh();
      drawSlots();
    }
  }
  function available(tree) {
    if(!tree||!(['tree','gold','rock'].includes(tree.kind)||tree.kind==='house'&&tree.color))return false;
    if (!map || map.construction?.job || tree.removed) return false;
    if(tree.felled||(['gold','rock'].includes(tree.kind)?selected!==3:selected!==1))return false;
    const base = attackPoint(tree);
    const col = Math.floor(pawn.x), row = Math.floor(pawn.y);
    return Math.hypot(pawn.x-base.x, pawn.y-base.y) <= 1 &&
      !map.stairs.some(stair => stair.x === col && stair.y === row) &&
      map.heights[row]?.[col] === (tree.hill || 0) && visible(map, pawn, base);
  }
  function pickTree(event) {
    if (!map || map.construction?.job || ![1,3].includes(selected) || !canvas.worldToScreen || document.querySelector('dialog[open]')) return null;
    // Touch harvesting targets the nearest reachable resource, wherever the screen is pressed.
    if (event.pointerType === 'touch') {
      return map.decorations.filter(available)
        .sort((a,b) => Math.hypot(trunk(a).x-pawn.x,trunk(a).y-pawn.y) -
          Math.hypot(trunk(b).x-pawn.x,trunk(b).y-pawn.y))[0] || null;
    }
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX-bounds.left)*canvas.width/bounds.width;
    const y = (event.clientY-bounds.top)*canvas.height/bounds.height;
    return map.decorations.filter(available)
      .map(tree => {
        const point = canvas.worldToScreen(trunk(tree));
        // Accept clicks on the complete house, including its roof when approaching from behind.
        if(tree.kind==='house'&&Math.abs(x-point.x)<=getBuildingModel(tree.model).width/2&&y>=point.y-(getBuildingModel(tree.model).height-17)&&y<=point.y+.28*64)
          return {tree,distance:0};
        return {tree, distance: Math.hypot(x-point.x, (y-point.y+(['gold','rock'].includes(tree.kind) ? 12 : 48))*.6)};
      }).filter(hit => hit.distance < 48).sort((a,b) => a.distance-b.distance)[0]?.tree || null;
  }
  canvas.pickHarvestTree = pickTree;
  function begin(tree) {
    if (!available(tree)) return;
    pawn.pause();
    target = tree;
    if(tree.kind==='house'){
      pawn.face(Math.sign(attackPoint(tree).x-pawn.x)||pawn.facing||1);
    }
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointerId !== null) return;
    const tree = pickTree(event);
    if (!available(tree)) return;
    begin(tree);
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, event => { if (event.pointerId === pointerId) stop(); });
  }
  window.addEventListener('keydown', event => {
    if (!map || document.querySelector('dialog[open]') || event.ctrlKey || event.altKey || event.metaKey) return;
    if (/^Digit[1-8]$/.test(event.code)) {
      selected = Number(event.code.slice(-1))-1;
      stop(); drawSlots();
    }
    if (event.code !== 'KeyJ' || event.repeat) return;
    const tree = map.decorations.filter(item => ['tree','gold','rock','house'].includes(item.kind) && available(item))
      .filter(item => {
        const base = attackPoint(item);
        return (base.x-pawn.x)*pawn.heading.x + (base.y-pawn.y)*pawn.heading.y >= 0;
      }).sort((a,b) => Math.hypot(trunk(a).x-pawn.x,trunk(a).y-pawn.y) - Math.hypot(trunk(b).x-pawn.x,trunk(b).y-pawn.y))[0];
    begin(tree);
  });
  window.addEventListener('keyup', event => { if (event.code === 'KeyJ') stop(); });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  function adjacentDrop(node) {
    const level = node.hill || 0;
    const base = trunk(node);
    const cells = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => ({x:base.x+dx*.75,y:base.y+dy*.75}));
    const free = cells.filter(cell => {
      const x=Math.floor(cell.x), y=Math.floor(cell.y);
      return map.surface[y]?.[x] && map.heights[y][x] === level &&
        !map.stairs.some(stair => stair.x === x && stair.y === y) &&
        canStand(map,cell,cell.x,cell.y) && visible(map,trunk(node),cell);
    });
    // Prefer the side opposite the player while keeping the drop close to the resource.
    return free.sort((a,b) => Math.hypot(b.x-pawn.x,b.y-pawn.y) - Math.hypot(a.x-pawn.x,a.y-pawn.y))[0];
  }
  function update(dt) {
    if (!map) return;
    refreshIn -= dt;
    if (refreshIn <= 0) { refresh(); refreshIn = 1; }
    for (let index = map.homeEffects.length-1; index >= 0; index--) {
      map.homeEffects[index].left -= dt;
      if (map.homeEffects[index].left <= 0) map.homeEffects.splice(index,1);
    }
    if (target && !available(target)) stop();
    if (target) {
      if (!swing) swing = {time:0, hit:false, kind:target.kind, target, dx:Math.sign(attackPoint(target).x-pawn.x) || pawn.facing || pawn.heading.x || 1};
      swing.time += dt;
      if (!swing.hit && swing.time >= impactTime) {
        swing.hit = true;
        if(target.kind==='house'){
          if(map.construction.hitHouse(target))target=null;
        }else{
          const id = treeId(target);
          const record = state.trees[id] || {hits:0, cutAt:0};
          const landing = record.hits === 4 ? adjacentDrop(target) : null;
          if (record.hits === 4 && !landing) { stop(); return; }
          record.hits++;
          state.trees[id] = record;
          if (record.hits === 5) {
            record.cutAt = Date.now();
            target.felled = true;
            const base = trunk(target);
            const amount=harvestYield(target);
            for(let i=0;i<amount;i++)state.drops.push({id:id+':'+record.cutAt+':'+i, ...landing,
              kind:target.kind === 'gold' ? 'goldDrop' : target.kind === 'rock' ? 'stoneDrop' : 'wood',
              fromX:base.x,fromY:base.y, hill:target.hill || 0, bornAt:record.cutAt,delay:i*100});
            map.homeEffects.push({kind:'dust', ...base, left:.8, duration:.8});
            target = null;
          }
          save();
        }
      }
      if (swing.time >= swingDuration) {
        // Start the next held swing immediately: no idle frame or depth-order flicker.
        swing = target ? {...swing,time:swing.time % swingDuration,hit:false} : null;
      }
    } else if (swing) {
      swing.time += dt;
      if (swing.time >= swingDuration) swing = null;
    }
    const before = state.drops.length;
    state.drops = state.drops.filter(drop => {
      if(!resourceDropMotion(drop,Date.now()).settled)return true;
      if (Date.now()-drop.bornAt < 500 || Math.hypot(pawn.x-drop.x,pawn.y-drop.y) > .65 ||
          map.heights[Math.floor(pawn.y)]?.[Math.floor(pawn.x)] !== (drop.hill || 0) || !visible(map,pawn,drop)) return true;
      const kind = drop.kind === 'goldDrop' ? 'gold' : drop.kind === 'stoneDrop' ? 'stone' : 'wood';
      if (!state.order.includes(kind)) state.order.push(kind);
      state[kind]++;
      return false;
    });
    if (before !== state.drops.length) { save(); drawSlots(); }
  }
  const api = {attach, update, stop,
    dropWood(node,amount){
      if(!map||!Number.isSafeInteger(amount)||amount<=0)return;
      const base=trunk(node),level=node.hill||0,bornAt=Date.now();
      const candidates=[];
      for(const radius of [.75,1.1,1.5])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const point={x:base.x+dx*radius,y:base.y+dy*radius};
        const x=Math.floor(point.x),y=Math.floor(point.y);
        if(map.surface[y]?.[x]&&map.heights[y][x]===level&&
          !map.stairs.some(stair=>stair.x===x&&stair.y===y)&&
          canStand(map,point,point.x,point.y)&&visible(map,base,point))candidates.push(point);
      }
      candidates.sort((a,b)=>Math.hypot(a.x-base.x,a.y-base.y)-Math.hypot(b.x-base.x,b.y-base.y)||
        Math.hypot(b.x-pawn.x,b.y-pawn.y)-Math.hypot(a.x-pawn.x,a.y-pawn.y));
      const chosen=[];
      for(const point of candidates)if(chosen.every(other=>Math.hypot(point.x-other.x,point.y-other.y)>.4))chosen.push(point);
      for(let i=0;i<amount;i++){
        const point=chosen[i%chosen.length]||{x:pawn.x,y:pawn.y};
        state.drops.push({id:'house-wood:'+node.x+','+node.y+':'+bornAt+':'+i,...point,kind:'wood',hill:level,bornAt,fromX:base.x,fromY:base.y,delay:i*70});
      }
      save();
    },
    refund(cost){
      state.wood+=cost.wood;state.gold+=cost.gold;state.stone+=cost.stone||0;
      for(const kind of ['wood','gold','stone'])if(state[kind]>0&&!state.order.includes(kind))state.order.push(kind);
      save();drawSlots();
    },
    get resources(){return {wood:state.wood,gold:state.gold,stone:state.stone};},
    spend(cost){
      if (!map || state.wood<cost.wood || state.gold<cost.gold || state.stone<(cost.stone||0)) return false;
      state.wood-=cost.wood;state.gold-=cost.gold;state.stone-=cost.stone||0;save();drawSlots();return true;
    }, get swing(){return swing;}, get duration(){return swingDuration;},
    get equipped(){
      return ['Hammer','Axe','Knife','Pickaxe'][selected] || (state.order[selected-tools.length] === 'gold' && state.gold > 0 ? 'Gold' : state.order[selected-tools.length] === 'wood' && state.wood > 0 ? 'Wood' : '');
    }, get drops(){return state.drops;}};
  return api;
}
