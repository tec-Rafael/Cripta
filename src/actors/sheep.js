function moveSheep(map, pawn, dt) {
  for (const animal of map.sheep) {
    const direction = animal.facing ?? (animal.x <= animal.origin ? 1 : -1);
    animal.facing = direction;
    animal.walking = false;
    if (animal.wait > 0) { animal.wait -= dt; continue; }
    const next = Math.max(animal.origin, Math.min(animal.origin + 2, animal.x + direction * animal.speed * dt));
    if (touchesSheep(pawn.x, pawn.y, next, animal.y)) {
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
