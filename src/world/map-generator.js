/* One continuous 50 x 50 landscape, with randomized coast and elevation. */
const MapGenerator = (() => {
  const size = 50;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const mask = () => Array.from({ length: size }, () => Array(size).fill(false));
  const has = (grid, x, y) => Boolean(grid[y]?.[x]);

  function generate(random = Math.random, { distantTower = true } = {}) {
    const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
    const land = mask(), wet = mask(), raised = mask(), paths = mask(), pools = mask();
    const stairs = [];
    const mountains = [];
    const theme = integer(0, 3);
    const shore = [];
    let left = integer(1, 2), right = integer(size-4, size-2);
    // Wide overlapping rows keep the mainland continuous.
    for (let y = 0; y < size; y++) {
      left = Math.max(0, Math.min(4, left + integer(-1, 1)));
      right = Math.max(size-5, Math.min(size-1, right + integer(-1, 1)));
      const taper = y === 0 || y === size - 1 ? integer(1, 2) : 0;
      shore.push({ left: left + taper, right: right - taper });
      for (let x = left + taper; x <= right - taper; x++) land[y][x] = true;
    }
    // Flooded grass forms a shelf against the same mainland.
    const floodedSide = random() > .5 ? 'left' : 'right';
    for (let y = 1; y < size - 1; y++) {
      const edge = shore[y][floodedSide];
      const outward = floodedSide === 'left' ? -1 : 1;
      for (let step = 0; step <= (random() > .45 ? 1 : 0); step++) {
        const x = edge + outward * step;
        if (x < 0 || x >= size) continue;
        wet[y][x] = true;
        land[y][x] = false;
      }
    }
    const reserved = mask();
    // Open tracks join every stair landing to the same north-south trail.
    const trailX = 7;
    for (let y = 2; y < size-1; y++) paths[y][trailX] = true;
    const tracks = [14, 30, 46];
    for (const y of tracks) {
      for (let x = trailX; x <= size-7; x++) paths[y][x] = true;
    }
    for (const track of tracks) {
      for (const sector of [8, 20, 32]) {
        if (random() < .16 && sector !== 20) continue;
        const left = sector + integer(1, 3);
        const top = track - integer(9, 12);
        const width = integer(4, 7), height = integer(4, 7);
        const shape = integer(0, 3);
        const mirrored = random() < .5;
        for (let row = 0; row < height; row++) {
          let inset = 0, trim = 0;
          if (shape === 0 && row < height / 2) inset = 2;
          if (shape === 1) inset = Math.floor(row / 2);
          if (shape === 2 && (row === 0 || row === height-1)) inset = trim = 1;
          if (shape === 3 && row >= height / 2) { inset = 1; trim = 1; }
          if (mirrored) [inset, trim] = [trim, inset];
          for (let x = left + inset; x < left + width - trim; x++) {
            raised[top + row][x] = true;
          }
        }
        const bottom = top + height - 1;
        const entrances = [];
        for (let y=top; y<=bottom; y++) for (let x=left; x<left+width; x++) {
          if (!raised[y][x] || raised[y+1][x]) continue;
          for (const dx of [-1,1]) {
            if (raised[y][x+dx] && !raised[y][x-dx]) entrances.push({x,y,dx});
          }
        }
        const lowest = Math.max(...entrances.map(s=>s.y));
        const corners = entrances.filter(s=>s.y===lowest);
        const ramp = corners[integer(0,corners.length-1)];
        stairs.push(ramp);
        mountains.push({left, top, width, height, ramp});
        for (let x=left-1;x<=left+width;x++) paths[ramp.y][x]=true;
        for (let y=top-1;y<=track;y++) for(let x=left-1;x<=left+width;x++) {
          if (!raised[y][x]) paths[y][x]=true;
        }
      }
    }
    const homeTrack = tracks[integer(0, tracks.length-1)];
    const house = {kind:'house', x:integer(10,39), y:homeTrack+1};
    const spawn = {x:house.x+1, y:house.y+1.5};
    for (let y=house.y-1; y<=house.y+1; y++) {
      for (let x=house.x-1; x<=house.x+2; x++) reserved[y][x] = true;
    }
    const tower = {kind:'tower', x:house.x < 25 ? house.x+5 : house.x-5, y:house.y};
    if (distantTower) {
      const sites = [];
      for (let y=3; y<size-3; y++) for (let x=5; x<size-4; x++) {
        if (Math.hypot(x-house.x, y-house.y) < 24) continue;
        let clear = true;
        for (let row=y-2; row<=y+1; row++) {
          for (let col=x-1; col<=x+2; col++) {
            if (!land[row][col] || raised[row][col]) clear = false;
          }
        }
        if (clear) sites.push({x,y});
      }
      Object.assign(tower, sites[integer(0,sites.length-1)]);
    }
    for (let y=tower.y-2; y<=tower.y+1; y++) {
      for (let x=tower.x-1; x<=tower.x+2; x++) reserved[y][x] = true;
    }
    // Find a ground-level approach to an existing trail before adding pools.
    function connectDoor(building) {
      const start = [building.x+1, building.y+1];
      const queue = [start], parents = new Map([[start.join(','), null]]);
      for (let index=0; index<queue.length; index++) {
        const [x,y] = queue[index];
        if (paths[y][x]) {
          let cell = [x,y];
          while (cell) {
            paths[cell[1]][cell[0]] = true;
            cell = parents.get(cell.join(','));
          }
          return;
        }
        for (const [dx,dy] of directions) {
          const nx=x+dx, ny=y+dy, key=nx+','+ny;
          if (!has(land,nx,ny) || has(raised,nx,ny) || parents.has(key)) continue;
          // Join each doorway from outside the building footprint.
          if ([house,tower].some(b => ny===b.y && nx>=b.x && nx<=b.x+1)) continue;
          parents.set(key,[x,y]);
          queue.push([nx,ny]);
        }
      }
    }
    connectDoor(house);
    connectDoor(tower);
    const targetPools = integer(22, 40);
    let poolCount = 0;
    for (let attempt=0; attempt<500 && poolCount<targetPools; attempt++) {
      const x = integer(2,size-4), y = integer(2,size-4);
      const cells = [[x,y]];
      if (random()<.72) cells.push([x+1,y]);
      if (random()<.52) cells.push([x,y+1]);
      if (random()<.32) cells.push([x+1,y+1], [x+1,y]);
      if (!cells.every(([cx,cy]) => [[0,0], ...directions].every(([dx,dy]) => {
        const col = cx+dx, row = cy+dy;
        return land[row][col] && !raised[row][col] && !reserved[row][col] &&
          !paths[row][col] && !pools[row][col];
      }))) continue;
      for (const [col,row] of cells) pools[row][col] = true;
      poolCount++;
    }
    const surface = land.map((row,y) => row.map((cell,x) => (cell || wet[y][x]) && !pools[y][x]));
    const sheep = [];
    const lanes = [];
    for (let y = 2; y < size - 1; y++) for (let x = 2; x < size - 4; x++) {
      lanes.push({x,y});
    }
    const flockSize = integer(30, 46);
    while (lanes.length && sheep.length < flockSize) {
      const {x,y} = lanes.splice(integer(0, lanes.length - 1), 1)[0];
      if (![x,x+1,x+2].every(col => land[y][col] && surface[y][col] && !raised[y][col] && !paths[y][col] && !reserved[y][col])) continue;
      for (let col=x; col<=x+2; col++) reserved[y][col] = true;
      sheep.push({kind:'sheep', x,y, origin:x, phase:integer(0,15), speed:.38+random()*.22});
    }
    const decorations = [house, tower];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const phase = integer(0, 15);
        if (!surface[y][x]) {
          if (random() < .14) decorations.push({ x, y, kind: 'waterRock', phase });
          continue;
        }
        if (paths[y][x] || reserved[y][x]) continue;
        const chance = random();
        const interior = directions.every(([dx, dy]) => has(surface, x + dx, y + dy));
        let kind = null;
        if (wet[y][x]) { if (chance < .3) kind = 'bush'; }
        else if (interior && chance < .17) kind = 'tree';
        else if (chance < .36) kind = 'bush';
        else if (chance < .46) kind = 'rock';

        if (kind) decorations.push({ x, y, kind, phase, hill: raised[y][x], variant: integer(1, 4) });
      }
    }
    const heights = raised.map(row => row.map(Number));
    const layers = [raised];
    for (const {left, top, width, height, ramp} of mountains) {
      let entrance = ramp;
      for (let level = 2; random() < .78; level++) {
        const cells = [];
        for (let y = top+1; y < top+height-1; y++) {
          for (let x = left+1; x < left+width-1; x++) {
            // Keep a walkable ledge around this terrace and a clear ramp exit below.
            if (y === entrance.y && x === entrance.x + entrance.dx) continue;
            if ([-1,0,1].every(dy => [-1,0,1].every(dx =>
              heights[y+dy][x+dx] === level-1))) cells.push({x,y});
          }
        }
        if (!cells.length) break;
        const footprint = new Set(cells.map(({x,y}) => y*size+x));
        const hasCell = (x,y) => footprint.has(y*size+x);
        const ramps = [];
        for (const {x,y} of cells) {
          if (hasCell(x,y+1)) continue;
          for (const dx of [-1,1]) {
            if (hasCell(x+dx,y) && !hasCell(x-dx,y) &&
                !(x-dx === entrance.x && y === entrance.y)) ramps.push({x,y,dx});
          }
        }
        if (!ramps.length) break;
        entrance = ramps[integer(0,ramps.length-1)];
        stairs.push(entrance);
        const layer = layers[level-1] ?? (layers[level-1] = mask());
        for (const {x,y} of cells) {
          layer[y][x] = true;
          heights[y][x] = level;
        }
      }
    }
    const clearLandings = new Set(stairs.flatMap(({x,y,dx}) =>
      [-1,0,1].map(step => y*size+x+step*dx)));
    const scenery = decorations.filter(item => {
      if (!['tree','rock','bush'].includes(item.kind)) return true;
      if (clearLandings.has(item.y*size+item.x)) return false;
      const level = heights[item.y][item.x];
      // Solid props need room for a player to walk around their base on a ledge.
      if (level && item.kind !== 'bush' && directions.some(([dx,dy]) =>
        heights[item.y+dy]?.[item.x+dx] !== level)) return false;
      return true;
    });
    for (const item of scenery) if (item.hill) item.hill = heights[item.y][item.x];
    // Convert existing clear rock sites without changing the stable home's seed.
    for (const item of scenery) {
      if (item.kind === 'rock' && (item.x*17+item.y*31)%5 === 0) item.kind = 'gold';
    }
    return { land, wet, raised, heights, layers, pools, paths, surface, stairs, decorations:scenery, sheep, spawn, house, tower, theme };
  }
  function generateHome() {
    // A stable seed keeps the same landscape, house and tower after a reload.
    let state = 0x43524950;
    return generate(() => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    }, {distantTower:false});
  }
  return { generate, generateHome, size };
})();
