const pawnAnimations = {
  idle: {sprite:'pawnIdle', fps:10},
  walk: {sprite:'pawnRun', fps:8},
  run:  {sprite:'pawnRun', fps:15},
};

function drawPawn(ctx, images, player, lift, margin, tile, encounter, inventory, construction) {
  const clip = pawnAnimations[player.motion];
  const suffix = player.motion === 'idle' ? 'Idle' : 'Run';
  const building=construction?.job?.phase==='building';
  const chopping=building?{kind:'building',time:construction.job.elapsed % .6,dx:player.facing}:inventory?.swing;
  const swing=chopping || encounter?.swing;
  let action=suffix;
  if(encounter?.guarding) action='Guard';
  if(chopping) action=building?'Build':chopping.kind==='stump'?'Dig':chopping.kind === 'gold' ? 'Mine' : 'Chop';
  else if(swing) action=player.character==='lancer' && Math.abs(swing.dy)>Math.abs(swing.dx)
    ? (swing.dy<0?'Up':'Down') : 'Attack';
  const equipped = inventory && !swing ? inventory.equipped : '';
  const image = images[(player.character || 'pawn') + action + equipped];
  const size = image.height;
  const frames=image.width/size;
  const frame = swing ? Math.min(frames-1,Math.floor(swing.time/(chopping ? (building ? .6 : inventory.duration) : encounter.stats.interval)*frames)) :
    Math.floor(player.elapsed * clip.fps) % frames;
  ctx.save();
  ctx.translate(Math.round(margin + player.x * tile), Math.round(margin + player.y * tile - lift));
  ctx.scale((swing && Math.sign(swing.dx)) || player.facing, 1);
  ctx.drawImage(image, frame * size, 0, size, size, -size/2, -size/2-27, size, size);
  ctx.restore();
}
