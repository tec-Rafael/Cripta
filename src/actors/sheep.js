function moveSheep(map, pawn, dt) {
  for (const animal of map.sheep) {
    const direction = animal.facing ?? (animal.x <= animal.origin ? 1 : -1);
    animal.facing = direction;
    animal.walking = false;
    if (animal.wait > 0) { animal.wait -= dt; continue; }
    const next = Math.max(animal.origin, Math.min(animal.origin + 2, animal.x + direction * animal.speed * dt));
    const site=map.construction?.job?.site;
    const buildings=map.decorations.filter(item=>['house','tower'].includes(item.kind));
    if(site)buildings.push(site);
    const blocked=buildings.some(item=>{
      const box=item.kind==='tower'?{left:item.x+.34,right:item.x+1.69,top:item.y+.06,bottom:item.y+.57}:houseFootprint(item);
      return next+.72>box.left&&next+.28<box.right&&animal.y+.43>box.top&&animal.y+.23<box.bottom;
    });
    if (blocked || touchesSheep(pawn.x, pawn.y, next, animal.y)) {
      animal.facing = -direction;
      animal.wait = .4;
      continue;
    }
    animal.x = next;
    animal.walking = true;
    if (next === animal.origin || next === animal.origin + 2) {
      animal.facing = -direction;
      animal.wait = .7;
    }
  }
}
