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
    const blocked=buildings.some(item=>next+.72>item.x+.34&&next+.28<item.x+1.69&&
      animal.y+.43>item.y+.06&&animal.y+.23<item.y+.57);
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
