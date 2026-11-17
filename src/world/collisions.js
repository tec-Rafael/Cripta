// Solid outline includes the roof so the worker cannot stand underneath it.
function houseFootprint(item){
  return {left:item.x,right:item.x+2,top:item.y-.8,bottom:item.y+.68};
}

/* Positions use fractions of a map cell. The feet determine the occupied cell. */
// Contact areas use tile coordinates, measured at the base of each sprite.
const feet = { x: .10, y: .045 };
function touchesSheep(px, py, sheepX, sheepY) {
  return Math.abs(px - sheepX - .5) < .22 + feet.x &&
         Math.abs(py - sheepY - .33) < .10 + feet.y;
}

// Height at a point on one tile, in units of one cliff sprite (64 pixels).
// Sampling either side of a shared edge distinguishes a landing from a wall.
function mountainHeight(map, x, y, localX) {
  const level = map.heights[y][x];
  if (!level) return 0;
  const ramp = map.stairs.find(s => s.x === x && s.y === y);
  return ramp ? level - 1 + (ramp.dx > 0 ? localX : 1-localX) : level;
}

function connectedEdge(map, x, y, nx, ny) {
  if (!map.surface[ny]?.[nx] || !map.surface[y]?.[x]) return false;
  if (ny !== y) {
    // A ramp's long sides are banks, even beside another inclined tile.
    if (map.stairs.some(s => s.x === x && (s.y === y || s.y === ny))) return false;
    return map.heights[y][x] === map.heights[ny][nx];
  }
  const edge = nx > x ? 1 : 0;
  return mountainHeight(map,x,y,edge) === mountainHeight(map,nx,ny,1-edge);
}

function canStand(map, player, px, py) {
  const cx = Math.floor(player.x), cy = Math.floor(player.y);
  const col = Math.floor(px), row = Math.floor(py);
  // Ease into the wider ramp corridor from either landing.
  let margin = 0;
  let rampRelief = 0;
  let landingEase = 0;
  if (map.heights[row]?.[col] || [-1,0,1].some(dy =>
    [-1,0,1].some(dx => map.heights[row+dy]?.[col+dx]))) {
    margin = 10/64;
    for (const ramp of map.stairs) {
      // Carry the narrower footprint around the corner onto the landing.
      const endDistance = Math.min(Math.abs(px-ramp.x), Math.abs(px-ramp.x-1));
      const rowDistance = Math.max(ramp.y-py, py-ramp.y-1, 0);
      const distanceToEnd = Math.max(endDistance,rowDistance-.25);
      if (distanceToEnd < .5) {
        landingEase = Math.max(landingEase, 1-distanceToEnd*2);
      }
      if (ramp.y !== row) continue;
      const distance = Math.max(ramp.x-px-feet.x, px-(ramp.x+1)-feet.x, 0);
      if (distance < .5) rampRelief = Math.max(rampRelief, margin*(1-2*distance));
    }
  }
  const halfWidth = feet.x + margin - landingEase*(feet.x+margin-2/64);
  const halfDepth = feet.y + margin - Math.max(rampRelief,landingEase*margin);
  // Check the footprint, including its corners, against water and cliff edges.
  for (const ox of [-halfWidth, halfWidth]) for (const oy of [-halfDepth, halfDepth]) {
    const x = Math.floor(px + ox), y = Math.floor(py + oy);
    if (!map.surface[y]?.[x]) return false;
    if (x===cx && y===cy) continue;
    if (x !== cx && !connectedEdge(map,cx,cy,x,cy)) return false;
    if (y !== cy && !connectedEdge(map,cx,cy,cx,y)) return false;
    if (x !== cx && y !== cy &&
        (!connectedEdge(map,x,cy,x,y) || !connectedEdge(map,cx,y,x,y))) return false;
  }
  const onHill = map.heights[Math.floor(py)][Math.floor(px)];
  if (!onHill && map.sheep.some(s => touchesSheep(px, py, s.x, s.y))) return false;
  return !map.decorations.some(item => {
    if(item.felled) return false;
    if ((item.hill || 0) !== onHill) return false;
    if(item.kind==='house'){
      const box=houseFootprint(item);
      return px+feet.x>box.left&&px-feet.x<box.right&&py+feet.y>box.top&&py-feet.y<box.bottom;
    }
    if (item.kind === 'tower')
      return px + feet.x > item.x + .34 && px - feet.x < item.x + 1.69 &&
             py + feet.y > item.y + .06 && py - feet.y < item.y + .57;
    if (item.kind !== 'tree' && item.kind !== 'rock' && item.kind !== 'gold') return false;
    const tree = item.kind === 'tree';
    const base = tree ? (item.variant <= 2 ? .92 : .71) : .55;
    const halfWidth = tree ? [.17,.15,.11,.09][item.variant-1] : item.kind === 'gold' ? (item.variant % 2 === 0 ? .55 : .45) : .28;
    return Math.abs(px - item.x - .5) < halfWidth + feet.x &&
           Math.abs(py - item.y - base) < (tree ? .07 : item.kind === 'gold' ? .24 : .20) + feet.y;
  });
}
