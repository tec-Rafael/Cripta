function createPawn(controls) {
  const player = { x: 0, y: 0, facing: 1, motion: 'idle', elapsed: 0 };
  let heading = {x:1,y:0};
  function update(map, dt) {
    const encounter=map.encounter;
    if(map.homeInventory?.swing){
      player.motion='idle';player.elapsed=0;return;
    }
    if(encounter?.swing && ['knight','lancer'].includes(encounter.id)){
      player.motion='idle';
      player.elapsed=0;
      return;
    }
    // The most recently held key wins. Releasing it restores the previous key.
    const [dx, dy] = controls.direction;
    const stride = (map.encounter?.guarding ? 1 : controls.sprinting ? 3.8 : 2.1) * Math.min(dt, .05);
    let moving = false;
    if (dx || dy) {
      heading = {x:dx,y:dy};
      if (dx) player.facing = dx;
      let travel = stride;
      if (!canStand(map, player, player.x + dx*stride, player.y + dy*stride)) {
        // Stop at contact even when a running step would overshoot the edge.
        let blocked = stride;
        travel = 0;
        while ((blocked-travel)*64 > .25) {
          const middle = (travel+blocked)/2;
          if (canStand(map,player,player.x+dx*middle,player.y+dy*middle)) travel = middle;
          else blocked = middle;
        }
      }
      player.x += dx*travel;
      player.y += dy*travel;
      moving = travel > 0;
    }
    const motion = moving ? (controls.sprinting ? 'run' : 'walk') : 'idle';
    player.elapsed = motion === player.motion ? player.elapsed + dt : 0;
    player.motion = motion;
  }

  function elevation(map) {
    const x = Math.floor(player.x), y = Math.floor(player.y);
    return 64 * mountainHeight(map,x,y,player.x-x);
  }

  return {
    update,
    draw(ctx, images, map, margin, tile) { drawPawn(ctx, images, player, elevation(map), margin, tile,map.encounter,map.homeInventory); },
    get character(){return player.character;},
    get heading(){return heading;},
    setCharacter(character) { player.character = character; },
    pause() { controls.stop(); player.motion = 'idle'; player.elapsed = 0; },
    get x() { return player.x; },
    get y() { return player.y; },
    depth(map) { return player.y - elevation(map) / 64; },
    spawn(map) {
      heading={x:1,y:0};
      controls.stop();
      Object.assign(player, { ...map.spawn, facing: 1, motion: 'idle', elapsed: 0 });
    },
  };
}
