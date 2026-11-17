// Test the ground line of each fence piece, including the width of its posts.
function fenceTouchesMountain(map, from, to) {
  const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)*16));
  for(let i=0;i<=steps;i++){
    const x=from.x+(to.x-from.x)*i/steps,y=from.y+(to.y-from.y)*i/steps;
    for(const dx of [-.08,.08])for(const dy of [-.08,.08])
      if((map.heights[Math.floor(y+dy)]?.[Math.floor(x+dx)]||0)>0)return true;
  }
  return false;
}

function createScene(canvas, images, reducedMotion) {
  const SIZE = MapGenerator.size;
  const TILE = 64;
  const MARGIN = 64;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const inside = (mask, x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && mask[y][x];

  function drawSprite(kind, frame, frameWidth, frameHeight, x, y, width, height) {
    ctx.drawImage(images[kind], frame * frameWidth, 0, frameWidth, frameHeight, x, y, width, height);
  }

  function terrain(mask, image, view, elevated = false, ramps = []) {
    for (let y = view.top; y < view.bottom; y++) {
      for (let x = view.left; x < view.right; x++) {
        if (!inside(mask, x, y)) continue;
        const ramp = elevated && ramps.find(s=>s.x===x && s.y===y);
        if (ramp) {
          continue;
        }
        const north = inside(mask, x, y - 1), south = inside(mask, x, y + 1);
        const west = inside(mask, x - 1, y), east = inside(mask, x + 1, y);
        const sx = !west && !east ? 192 : !west ? 0 : !east ? 128 : 64;
        // Left atlas block is shoreline grass; the right block is rocky mountain.
        const sourceX = elevated ? 320 + sx : sx;
        // Row 192 is capped on both sides vertically. Use it only for
        // isolated rows; a connected southern edge uses the open-top row 128.
        const sy = !north && !south ? 192 : !north ? 0 : !south ? 128 : 64;
        const dx = MARGIN + x * TILE, dy = MARGIN + y * TILE;
        if (elevated) {
          // Bottom-row cliff tiles include the rounded stone foot and ground seam.
          const wallX = 320 + sx;
          if (!south) {
            ctx.drawImage(image, wallX, 320, 64, 64, dx, dy, 64, 64);
          }
          // Continue the rock along exposed sides, including concave corners.
          if (!west) {
            ctx.drawImage(image, 320, 256, 16, 64, dx, dy-32, 16, 64);
            ctx.drawImage(image, 320, 320, 16, 64, dx, dy, 16, 64);
          }
          if (!east) {
            ctx.drawImage(image, 496, 256, 16, 64, dx+48, dy-32, 16, 64);
            ctx.drawImage(image, 496, 320, 16, 64, dx+48, dy, 16, 64);
          }
        }
        ctx.drawImage(image, sourceX, sy, 64, 64, dx, dy - (elevated ? 64 : 0), 64, 64);
      }
    }
  }

  function drawStair(mask, stair) {
    if (!inside(mask, stair.x, stair.y)) return;
    const x = MARGIN + stair.x * TILE;
    const y = MARGIN + stair.y * TILE;
    const top = y - TILE;
    const entersFromLeft = stair.dx > 0;
    const sourceX = entersFromLeft ? 0 : 192;

    // The north tile ends one level above the ramp. Its exposed face
    // occupies the upper half of the sprite; the lower half has its own rock.
    if (inside(mask, stair.x, stair.y-1)) {
      const west = inside(mask, stair.x-1, stair.y-1);
      const east = inside(mask, stair.x+1, stair.y-1);
      const column = west ? (east ? 1 : 2) : (east ? 0 : 3);
      ctx.drawImage(images.moss, 320 + column*TILE, 320, TILE, TILE, x, top, TILE, TILE);
    }

    ctx.drawImage(images.moss, sourceX, 256, TILE, TILE * 2, x, top, TILE, TILE * 2);
  }

  let placementCamera=null;
  function draw(map, pawn, time) {
    const tick = reducedMotion.matches ? 0 : Math.floor(time / 100);
    // Keep sprites legible on phones; pan across the world instead of shrinking it.
    const zoom = Math.max(.95, Math.min(1.45, canvas.clientHeight / 710));
    const w = Math.max(1, Math.round(canvas.clientWidth / zoom));
    const h = Math.max(1, Math.round(canvas.clientHeight / zoom));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h; ctx.imageSmoothingEnabled = false;
    }
    const world = SIZE * TILE + MARGIN * 2;
    const offset = (feet, span) => span >= world ? (world - span) / 2 :
      Math.max(0, Math.min(world - span, MARGIN + feet*TILE - span/2));
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let cameraX = Math.round(offset(pawn.x,w)), cameraY = Math.round(offset(pawn.depth(map),h));
    const placing=map.construction?.job?.phase==='placing';
    if(placing){
      if(!placementCamera||!canvas.touchPlacement)placementCamera={x:cameraX,y:cameraY,targetX:cameraX,targetY:cameraY};
      placementCamera.x+=(placementCamera.targetX-placementCamera.x)*.22;
      placementCamera.y+=(placementCamera.targetY-placementCamera.y)*.22;
      cameraX=Math.round(placementCamera.x);cameraY=Math.round(placementCamera.y);
    }else{placementCamera=null;canvas.touchPlacement=false;}
    canvas.placementPointer=()=>{
      const bounds=canvas.getBoundingClientRect();
      return {clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2};
    };
    canvas.panPlacement=(dx,dy)=>{
      if(!placing)return;
      const bounds=canvas.getBoundingClientRect();
      placementCamera.targetX=Math.max(0,Math.min(Math.max(0,world-w),placementCamera.targetX-dx*w/bounds.width*.55));
      placementCamera.targetY=Math.max(0,Math.min(Math.max(0,world-h),placementCamera.targetY-dy*h/bounds.height*.55));
    };
    canvas.worldToScreen=point=>{
      const x=Math.floor(point.x),y=Math.floor(point.y);
      return {x:MARGIN+point.x*TILE-cameraX,y:MARGIN+(point.y-mountainHeight(map,x,y,point.x-x))*TILE-cameraY};
    };
    canvas.screenToWorld=point=>({x:(point.x+cameraX-MARGIN)/TILE,y:(point.y+cameraY-MARGIN)/TILE});
    ctx.translate(-cameraX, -cameraY);
    // Include sprites rooted outside the viewport (canopies, roofs and foam).
    const view = {
      left: Math.max(0, Math.floor((cameraX-MARGIN)/TILE)-2),
      top: Math.max(0, Math.floor((cameraY-MARGIN)/TILE)-2),
      right: Math.min(SIZE, Math.ceil((cameraX+w-MARGIN)/TILE)+2),
      bottom: Math.min(SIZE, Math.ceil((cameraY+h-MARGIN)/TILE)+3+map.layers.length),
    };
    ctx.strokeStyle = '#c0f0dc32';
    ctx.lineWidth = 2;
    for (let i = 0; i < 60; i++) {
      const x = (i * 173 + 21) % world;
      const y = (i * 317 + 40) % world;
      if (inside(map.surface, Math.floor((x-MARGIN)/TILE), Math.floor((y-MARGIN)/TILE))) continue;
      const sway = Math.sin(tick * .13 + i) * 4;
      ctx.beginPath(); ctx.moveTo(x+sway,y); ctx.lineTo(x+9+sway,y-3); ctx.lineTo(x+15+sway,y-3); ctx.stroke();
    }
    // Foam is drawn under the shore so only its outer rim remains visible.
    for (let y = view.top; y < view.bottom; y++) for (let x = view.left; x < view.right; x++) {
      if (inside(map.surface, x, y) && [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => !inside(map.surface,x+dx,y+dy))) {
        drawSprite('foam', tick % 16, 192, 192, MARGIN+x*TILE-64, MARGIN+y*TILE-64, 192, 192);
      }
    }
    terrain(map.surface, images.wet, view);
    const dry = map.dry;
    terrain(dry, images.terrain, view);
    // Soft patches of a second grass palette enrich open spaces.
    for (let y = view.top; y < view.bottom; y++) for (let x = view.left; x < view.right; x++) {
      if (!dry[y][x] || map.raised[y][x] || map.paths[y][x]) continue;
      if ([[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy]) => inside(dry,x+dx,y+dy))) {
        const variation = Math.sin(x*.7+y*.9+map.theme);
        if (variation > .2) ctx.drawImage(images.grass,64,64,64,64,MARGIN+x*TILE,MARGIN+y*TILE,64,64);
      }
    }
    const encounter=map.encounter;
    const fighters=encounter?[...encounter.coins.map(coin=>({...coin,...resourceDropMotion(coin,Date.now())})),...encounter.enemies,...encounter.effects]:
      [...(map.homeInventory?.drops || []).map(drop=>({...drop,...resourceDropMotion(drop,Date.now()),kind:drop.kind || 'wood'})),...(map.homeEffects || [])];
    const actors = [...map.decorations, ...map.sheep, ...fighters, ...(encounter?.hp===0?[]:[pawn])].filter(item =>
      item.x >= view.left && item.x < view.right && item.y >= view.top && item.y < view.bottom);
    // Gold occludes actors only behind its footprint (.55 center - .24 depth).
    const work=map.construction?.job;
    if(work?.site&&['walking','building'].includes(work.phase))
      actors.push({kind:'worksiteFence',x:work.site.x,y:work.site.y+1,hill:0,site:work.site});
    // Use the feet for depth on every frame, including all demolition swings.
    const base = item => item === pawn || fighters.includes(item) ? item.y :
      item.y + ({tree:item.variant <= 2 ? .92 : .71, house:.68, tower:.57, sheep:.33, bush:.05, gold:.31, worksiteFence:.25}[item.kind] ?? .55);
    const level = item => item === pawn || fighters.includes(item)
      ? map.heights[Math.floor(item.y)]?.[Math.floor(item.x)] || 0
      : item.hill || 0;
    actors.sort((a,b) => Math.floor(base(a)) - Math.floor(base(b)) ||
      level(a) - level(b) || base(a) - base(b));
    const ramps = map.layers.map((_,index) =>
      map.stairs.filter(s => map.heights[s.y][s.x] === index+1));
    let nextActor = 0;
    for (let row = view.top; row < view.bottom; row++) {
      const strip = {...view, top:row, bottom:row+1};
      function drawResidents(height) {
        // Paint the incline before actors on either landing, including
        // the frame before their feet cross into the ramp's tile.
        if (ramps[height]) {
          ctx.save();
          ctx.translate(0,-height*TILE);
          for (const ramp of ramps[height]) {
            if (ramp.y === row && ramp.x >= view.left && ramp.x < view.right)
              drawStair(map.layers[height], ramp);
          }
          ctx.restore();
        }
        while (nextActor < actors.length && Math.floor(base(actors[nextActor])) === row &&
               level(actors[nextActor]) === height) {
          drawActor(actors[nextActor++]);
        }
      }
      drawResidents(0);
      for (const [index, layer] of map.layers.entries()) {
        ctx.save();
        ctx.translate(0,-index*TILE);
        terrain(layer, images.moss, strip, true, ramps[index]);
        ctx.restore();
        drawResidents(index+1);
      }
    }
    function drawWorksiteFence(site){
      const x=MARGIN+site.x*TILE,y=MARGIN+site.y*TILE;
      // Enclose the house's ground footprint, not the tall roof sprite.
      const width=2*TILE,depth=TILE,margin=12;
      const left=x-margin,right=x+width+margin,back=y-margin,front=y+depth+margin;
      const entrance=x+width/2,opening=48;
      const clear=(ax,ay,bx=ax,by=ay)=>!fenceTouchesMountain(map,
        {x:(ax-MARGIN)/TILE,y:(ay-MARGIN)/TILE},{x:(bx-MARGIN)/TILE,y:(by-MARGIN)/TILE});
      const horizontal=(from,to,base)=>{
        const length=to-from,segments=Math.max(1,Math.ceil(length/48));
        for(let i=0;i<segments;i++){
          const start=Math.round(from+i*length/segments),end=Math.round(from+(i+1)*length/segments);
          if(!clear(start-4,base,end+4,base))continue;
          // Keep all rail pieces the same height and join them at their posts.
          ctx.drawImage(images.fenceHorizontal,start-8,base-44,end-start+16,44);
        }
      };
      const vertical=(px,from,to)=>{
        const segments=Math.max(1,Math.ceil((to-from)/48));
        for(let i=0;i<segments;i++){
          const start=Math.round(from+i*(to-from)/segments),end=Math.round(from+(i+1)*(to-from)/segments);
          if(clear(px,start,px,end))ctx.drawImage(images.fenceVertical,px-8,start-24,16,end-start+24);
        }
      };
      horizontal(left,right,back);
      vertical(left,back,front);vertical(right,back,front);
      horizontal(left,entrance-opening/2,front);
      horizontal(entrance+opening/2,right,front);
      // Open leaves fold inward, leaving the approach at the center of the house clear.
      vertical(entrance-opening/2,front-28,front);
      vertical(entrance+opening/2,front-28,front);
      for(const px of [left,entrance-opening/2,entrance+opening/2,right])
        if(clear(px,front))ctx.drawImage(images.fencePost,px-8,front-31,16,31);
    }
    function drawActor(item) {
      if(item.kind==='worksiteFence'){drawWorksiteFence(item.site);return;}
      if (item === pawn) { pawn.draw(ctx, images, map, MARGIN, TILE); return; }
      if(fighters.includes(item)){
        const col=Math.floor(item.x),row=Math.floor(item.y);
        const lift=mountainHeight(map,col,row,item.x-col);
        ctx.save();ctx.translate(MARGIN+item.x*TILE,MARGIN+(item.y-lift)*TILE);
        if(item.kind==='gnome'){
          if(encounter.selected===item){
            ctx.strokeStyle='#ffe28a';ctx.lineWidth=2;
            ctx.beginPath();ctx.ellipse(0,0,19,8,0,0,Math.PI*2);ctx.stroke();
          }
          const attacking=item.phase==='strike'||(item.phase==='recover'&&item.clock<.08);
          const sheet=images[attacking?'gnomeStrike':item.moving?'gnomeRun':'gnomeIdle'];
          const size=sheet.height, frames=sheet.width/size;
          // Reserve the final frames for the faster downswing and show contact on impact.
          const progress=item.phase==='recover'?1:item.clock<hammerGnome.windup
            ? .6*item.clock/hammerGnome.windup
            : .6+.4*(item.clock-hammerGnome.windup)/hammerGnome.impact;
          const frame=attacking?Math.min(frames-1,Math.floor(progress*frames)):Math.floor(item.clock*9)%frames;
          ctx.scale(item.facing,1);ctx.drawImage(sheet,frame*size,0,size,size,-size/2,-size/2-27,size,size);
          ctx.fillStyle='#321e23';ctx.fillRect(-17,-62,34,5);
          ctx.fillStyle='#df7157';ctx.fillRect(-16,-61,32*item.hp/hammerGnome.hp,3);
        }else if(item.kind==='goldDrop'||item.kind==='wood'){
          ctx.translate(0,-(item.hop||0));ctx.rotate(item.tilt||0);
          ctx.scale(item.pop??1,item.pop??1);
          if(item.kind==='goldDrop')ctx.drawImage(images.goldDrop,-12,-18,24,24);
          else ctx.drawImage(images.wood,-24,-32,48,48);
        }else if(item.kind==='coin'){
          ctx.translate(0,-(item.hop||0));ctx.rotate(item.tilt||0);
          ctx.scale(item.pop??1,item.pop??1);
          ctx.drawImage(images.coin,-20,-30,40,40);
        }else if(item.kind==='dust'){
          const sheet=images.dust,size=sheet.height,frames=sheet.width/size;
          const frame=Math.min(frames-1,Math.floor((1-item.left/item.duration)*frames));
          ctx.drawImage(sheet,frame*size,0,size,size,-48,-64,96,96);
        }else if(item.kind==='arrow'){
          ctx.translate(0,-(item.arc||0));ctx.rotate(item.angle||0);ctx.drawImage(images.arrow,-32,-32,64,64);
        }else{
          const sheet=images.monkEffect,size=sheet.height;
          const frame=Math.min(sheet.width/size-1,Math.floor((.35-item.left)/.35*sheet.width/size));
          ctx.drawImage(sheet,frame*size,0,size,size,-size/2,-size/2,size,size);
        }
        ctx.restore();return;
      }
      const x = MARGIN + item.x * TILE, y = MARGIN + item.y * TILE - (item.hill || 0)*TILE;
      if (item.kind === 'tree' && item.felled) ctx.drawImage(images['stump'+item.variant],x-40,y-112,144,192);
      if (item.kind === 'tree' && !item.felled) drawSprite('tree'+item.variant, (tick+item.phase)%8, images['tree'+item.variant].width/8, images['tree'+item.variant].height, x-40,y-112,144,192);
      if (item.kind === 'bush') drawSprite('bush'+item.variant, (tick+item.phase)%8, 128,128,x-16,y-32,96,96);
      if (item.kind === 'sheep') {
        ctx.save(); ctx.translate(x+32,y); ctx.scale(item.facing,1);
        drawSprite(item.walking ? 'sheepMove' : 'sheep',(tick+item.phase)%(item.walking ? 4 : 6),128,128,-48,-32,96,96);
        ctx.restore();
      }
      if (item.kind === 'tower') ctx.drawImage(images.tower,x,y-192,128,256);
      if (item.kind === 'house') ctx.drawImage(images[item.color?'house'+item.color:map.name==='Lar'?'houseBlack':'house'],x,y-128,128,192);
      if (item.kind === 'gold' && !item.felled) {
        const variant = item.variant % 2 === 0 ? 6 : 5;
        const crop = variant === 6 ? {x:17,y:17,width:92,height:81} : {x:28,y:20,width:74,height:80};
        const width = Math.round(crop.width*.875), height = Math.round(crop.height*.875);
        ctx.drawImage(images['goldStone'+variant],crop.x,crop.y,crop.width,crop.height,
          x+32-width/2,y+35-height,width,height);
      }
      if (item.kind === 'rock') ctx.drawImage(images.rock,x,y,64,64);
      if (item.kind === 'waterRock') drawSprite('waterRock',(tick+item.phase)%16,64,64,x,y,64,64);
    }
    const construction=map.construction;
    if(construction?.job){
      const job=construction.job,site=job.site||construction.preview;
      if(site){
        const x=MARGIN+site.x*TILE,y=MARGIN+(site.y-2)*TILE;
        if(job.phase==='placing'){
          // Preview and worksite share the same rear fence and house origin.
          const groundY=MARGIN+site.y*TILE,margin=12;
          ctx.save();
          ctx.globalAlpha=.35;
          ctx.drawImage(images['house'+job.color],x,y,128,192);
          ctx.globalAlpha=.85;drawWorksiteFence(site);
          ctx.fillStyle=site.valid?'#90d99a33':'#e25b5b55';
          ctx.fillRect(x-margin,groundY-margin,2*TILE+2*margin,TILE+2*margin);
          ctx.drawImage(images.constructionMarker,x-margin,groundY-margin,2*TILE+2*margin,TILE+2*margin);
          ctx.restore();
        }else if(job.phase==='building'){
          const sheet=images.dust,size=sheet.height,frames=sheet.width/size;
          for(let i=0;i<4;i++){
            const frame=Math.floor((job.elapsed*12+i*3)%frames);
            ctx.drawImage(sheet,frame*size,0,size,size,x-16+(i%2)*48,y+48+Math.floor(i/2)*48,128,128);
          }
        }

      }
    }
    ctx.globalAlpha = .8;
    for (let i = 0; i < 3; i++) {
      const drift = reducedMotion.matches ? 0 : time * .007;
      const x = ((i*370+drift) % 1300)-350;
      ctx.drawImage(images.cloud,x,70+i*270,288,128);
    }
    ctx.globalAlpha = 1;
  }

  return draw;
}
