function createHomeInventory(canvas, pawn) {
  const storageKey = 'cripta.home.inventory.v1';
  const regrowAfter = 60 * 60 * 1000;
  const swingDuration = .6;
  const impactTime = .25;
  const panel = document.querySelector('#home-inventory');
  const slots = panel.querySelector('.inventory-slots');
  const toggle = panel.querySelector('.inventory-toggle');
  const resourcePath = 'assets/tiny-swords/Terrain/Resources/';
  const tools = ['Martelo', 'Machado', 'Faca', 'Picareta'];
  let state = {trees: {}, drops: [], wood: 0, gold: 0, order: []};
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
      state.order = [...new Set((Array.isArray(saved.order) ? saved.order : []).filter(kind => ['wood','gold'].includes(kind)))];
      for (const kind of ['wood','gold']) if (state[kind] > 0 && !state.order.includes(kind)) state.order.push(kind);
      state.trees = {};
      for (const [id, tree] of Object.entries(saved.trees || {})) {
        if (/^(gold:)?\d+,\d+$/.test(id) && Number.isInteger(tree?.hits) && tree.hits >= 1 && tree.hits <= 5 &&
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
  function treeId(tree) { return (tree.kind === 'gold' ? 'gold:' : '') + tree.x + ',' + tree.y; }
  function trunk(tree) {
    return {x: tree.x + .5, y: tree.y + (tree.kind === 'gold' ? .55 : tree.variant <= 2 ? .92 : .71)};
  }
  function stop() {
    target = null;
    swing = null;
    pointerId = null;
  }
  function drawSlots() {
    for (const [index, button] of [...slots.children].entries()) {
      const resource = state.order[index-4];
      const count = resource ? state[resource] : 0;
      button.classList.toggle('selected', index === selected);
      button.setAttribute('aria-pressed', String(index === selected));
      button.setAttribute('aria-label', tools[index] || (count ? (resource === 'gold' ? 'Ouro, ' : 'Madeira, ') + count : 'Espaço vazio'));
      const image = button.querySelector('img');
      image.hidden = index >= 4 && !count;
      if (count) image.src = resourcePath + (resource === 'gold' ? 'Gold/Gold Resource/Gold_Resource.png' : 'Wood/Wood Resource/Wood Resource.png');
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
    toggle.setAttribute('aria-label', collapsed ? 'Abrir inventÃ¡rio' : 'Recolher inventÃ¡rio');
  });
  panel.classList.add('collapsed');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir inventário');
  drawSlots();

  function refresh() {
    const now = Date.now();
    let changed = false;
    for (const tree of map.decorations.filter(item => ['tree','gold'].includes(item.kind))) {
      const id = treeId(tree), record = state.trees[id];
      if (record?.cutAt && now - record.cutAt >= regrowAfter) {
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
      refresh();
      drawSlots();
    }
  }
  function available(tree) {
    if (!map || !tree || tree.felled || (tree.kind === 'gold' ? selected !== 3 : selected !== 1 || map.name !== 'Lar')) return false;
    const base = trunk(tree);
    const col = Math.floor(pawn.x), row = Math.floor(pawn.y);
    return Math.hypot(pawn.x-base.x, pawn.y-base.y) <= 1 &&
      !map.stairs.some(stair => stair.x === col && stair.y === row) &&
      map.heights[row]?.[col] === (tree.hill || 0) && visible(map, pawn, base);
  }
  function pickTree(event) {
    if (!map || ![1,3].includes(selected) || !canvas.worldToScreen || document.querySelector('dialog[open]')) return null;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX-bounds.left)*canvas.width/bounds.width;
    const y = (event.clientY-bounds.top)*canvas.height/bounds.height;
    return map.decorations.filter(item => item.kind === (selected === 3 ? 'gold' : 'tree') && !item.felled)
      .map(tree => {
        const point = canvas.worldToScreen(trunk(tree));
        return {tree, distance: Math.hypot(x-point.x, (y-point.y+(tree.kind === 'gold' ? 12 : 48))*.6)};
      }).filter(hit => hit.distance < 48).sort((a,b) => a.distance-b.distance)[0]?.tree || null;
  }
  canvas.pickHarvestTree = pickTree;
  function begin(tree) {
    if (!available(tree)) return;
    pawn.pause();
    target = tree;
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
    const tree = map.decorations.filter(item => ['tree','gold'].includes(item.kind) && available(item))
      .filter(item => {
        const base = trunk(item);
        return (base.x-pawn.x)*pawn.heading.x + (base.y-pawn.y)*pawn.heading.y >= 0;
      }).sort((a,b) => Math.hypot(trunk(a).x-pawn.x,trunk(a).y-pawn.y) - Math.hypot(trunk(b).x-pawn.x,trunk(b).y-pawn.y))[0];
    begin(tree);
  });
  window.addEventListener('keyup', event => { if (event.code === 'KeyJ') stop(); });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  function adjacentDrop(node) {
    const level = node.hill || 0;
    const cells = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => ({x:node.x+dx+.5,y:node.y+dy+.5}));
    const free = cells.filter(cell => {
      const x=Math.floor(cell.x), y=Math.floor(cell.y);
      return map.surface[y]?.[x] && map.heights[y][x] === level &&
        !map.stairs.some(stair => stair.x === x && stair.y === y) &&
        canStand(map,cell,cell.x,cell.y) && visible(map,trunk(node),cell);
    });
    return free[Math.floor(Math.random()*free.length)];
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
      if (!swing) swing = {time:0, hit:false, kind:target.kind, dx:Math.sign(trunk(target).x-pawn.x) || pawn.heading.x || 1};
      swing.time += dt;
      if (!swing.hit && swing.time >= impactTime) {
        swing.hit = true;
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
          state.drops.push({id:id+':'+record.cutAt, ...landing, kind:target.kind === 'gold' ? 'goldDrop' : 'wood', hill:target.hill || 0, bornAt:record.cutAt});
          map.homeEffects.push({kind:'dust', ...base, left:.8, duration:.8});
          target = null;
        }
        save();
      }
      if (swing.time >= swingDuration) swing = null;
    } else if (swing) {
      swing.time += dt;
      if (swing.time >= swingDuration) swing = null;
    }
    const before = state.drops.length;
    state.drops = state.drops.filter(drop => {
      if (Date.now()-drop.bornAt < 500 || Math.hypot(pawn.x-drop.x,pawn.y-drop.y) > .65 ||
          map.heights[Math.floor(pawn.y)]?.[Math.floor(pawn.x)] !== (drop.hill || 0) || !visible(map,pawn,drop)) return true;
      const kind = drop.kind === 'goldDrop' ? 'gold' : 'wood';
      if (!state.order.includes(kind)) state.order.push(kind);
      state[kind]++;
      return false;
    });
    if (before !== state.drops.length) { save(); drawSlots(); }
  }
  const api = {attach, update, stop, get swing(){return swing;}, get duration(){return swingDuration;},
    get equipped(){
      return ['Hammer','Axe','Knife','Pickaxe'][selected] || (state.order[selected-4] === 'gold' && state.gold > 0 ? 'Gold' : state.order[selected-4] === 'wood' && state.wood > 0 ? 'Wood' : '');
    }, get drops(){return state.drops;}};
  return api;
}
