function createPawn(controls) {
  const player = { x: 0, y: 0, facing: 1, motion: 'idle', elapsed: 0 };
  let heading = {x:1,y:0};
  let route=null;
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
    if(map.construction?.job?.phase==='building'){player.motion='idle';return;}
    let direction=map.construction?.job?.phase==='walking'?[0,0]:controls.direction;
    if(route){
      while(route.length&&Math.hypot(player.x-route[0].x,player.y-route[0].y)<.04)route.shift();
      const target=route[0];
      direction=target?(Math.abs(target.x-player.x)>.04?[Math.sign(target.x-player.x),0]:[0,Math.sign(target.y-player.y)]):[0,0];
    }
    const [dx, dy] = direction;
    const sprinting=map.construction?.job?.phase==='walking'||controls.sprinting;
    const stride = (map.encounter?.guarding ? 1 : sprinting ? 3.8 : 2.1) * Math.min(dt, .05);
    let moving = false;
    if (dx || dy) {
      heading = {x:dx,y:dy};
      if (dx) player.facing = dx;
      let travel = route?.[0]?Math.min(stride,dx?Math.abs(route[0].x-player.x):Math.abs(route[0].y-player.y)):stride;
      if (!canStand(map, player, player.x + dx*travel, player.y + dy*travel)) {
        // Stop at contact even when a running step would overshoot the edge.
        let blocked = travel;
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
    const motion = moving ? (sprinting ? 'run' : 'walk') : 'idle';
    player.elapsed = motion === player.motion ? player.elapsed + dt : 0;
    player.motion = motion;
  }

  function elevation(map) {
    const x = Math.floor(player.x), y = Math.floor(player.y);
    return 64 * mountainHeight(map,x,y,player.x-x);
  }

  return {
    update,
    follow(points){controls.stop();route=points;},
    draw(ctx, images, map, margin, tile) { drawPawn(ctx, images, player, elevation(map), margin, tile,map.encounter,map.homeInventory,map.construction); },
    get facing(){return player.facing;},
    face(direction){if(direction)player.facing=Math.sign(direction);},
    get character(){return player.character;},
    get heading(){return heading;},
    setCharacter(character) { player.character = character; },
    pause() { controls.stop(); player.motion = 'idle'; player.elapsed = 0; },
    get x() { return player.x; },
    get y() { return player.y; },
    depth(map) { return player.y - elevation(map) / 64; },
    spawn(map) {
      route=null;heading={x:1,y:0};
      controls.stop();
      Object.assign(player, { ...map.spawn, facing: 1, motion: 'idle', elapsed: 0 });
    },
  };
}
