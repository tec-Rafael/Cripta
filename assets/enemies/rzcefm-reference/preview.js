/* Isolated comparison: creates its own map and never opens or changes game saves. */
window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('#world');
  const status = document.querySelector('#status');
  const button = document.querySelector('#pause');
  const tools = document.querySelectorAll('[data-tool]');
  let selected = 'Strike';
  const shot={range:3,radius:.35};
  for(const [id,key] of [['shot-range','range'],['shot-radius','radius']]){
    const input=document.getElementById(id);
    input.oninput=()=>{shot[key]=Number(input.value);document.getElementById(key+'-value').textContent=input.value;};
  }
  const zoomControl = document.querySelector('#zoom');
  let zoom = 3;
  zoomControl.onchange = () => { zoom = Number(zoomControl.value); };
  const load = path => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar: ' + path));
    image.src = path;
  });
  try {
    const images = await loadImages();
    [images.gnomeIdle, images.gnomeRun, images.gnomeStrike] = await Promise.all(
      ['Idle', 'Run', 'Strike'].map(name => load('assets/enemies/rzcefm-reference/' + name + '.png'))
    );
    const toolSheets = {Idle: images.gnomeIdle, Run: images.gnomeRun, Strike: images.gnomeStrike};
    const names = {Idle: 'Repouso', Run: 'Corrida', Strike: 'Ataque'};
    function select(tool) {
      selected = tool;
      for (const item of tools) item.setAttribute('aria-pressed', String(item.dataset.tool === tool));
    }
    for (const item of tools) item.onclick = () => select(item.dataset.tool);
    window.addEventListener('keydown', event => {
      const tool = ['Idle', 'Run', 'Strike'][Number(event.key) - 1];
      if (tool) { event.preventDefault(); select(tool); }
    });
    select('Strike');
    const map = MapGenerator.generateHome();
    map.dry = map.land.map((row, y) => row.map((cell, x) => cell && !map.pools[y][x]));
    // Use a flat clearing so both sprites stand on exactly the same ground plane.
    const size = MapGenerator.size;
    let center = null;
    for (let y = 5; y < size - 5 && !center; y++) for (let x = 5; x < size - 5; x++) {
      let free = true;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) {
        if (!map.surface[y + dy]?.[x + dx] || map.heights[y + dy]?.[x + dx] || map.pools[y + dy]?.[x + dx]) free = false;
      }
      if (free) { center = {x: x + .5, y: y + .5}; break; }
    }
    center ||= map.spawn;
    map.decorations = map.decorations.filter(item => Math.abs(item.x - center.x) > 3 || Math.abs(item.y - center.y) > 2);
    map.sheep = map.sheep.filter(item => Math.hypot(item.x - center.x, item.y - center.y) > 3);
    let elapsed = 0, last = null, playing = true;
    const pawn = {
      x: center.x, y: center.y, depth() { return this.y; },
      draw(ctx, unused, world, margin, tile) {
        const ground = margin + this.y * tile;
        const progress = (elapsed % 8000) / 8000;
        const direction = selected === 'Run' && progress >= .5 ? -1 : 1;
        const distance = progress < .5 ? -2 + progress * 8 : 6 - progress * 8;
        const actorX = margin + (this.x + (selected === 'Run' ? distance * .65 : 0)) * tile;
        if(selected==='Strike'){
          const targetX=actorX+shot.range*tile;
          const phase=elapsed%1200, impact=phase>=1100;
          ctx.save();
          ctx.strokeStyle=impact?'#ff7657':'#ffe4a0';ctx.fillStyle=impact?'#ef734866':'#ffe4a022';ctx.lineWidth=2;
          ctx.setLineDash([6,7]);ctx.beginPath();ctx.moveTo(actorX,ground);ctx.lineTo(targetX,ground);ctx.stroke();ctx.setLineDash([]);
          ctx.beginPath();ctx.ellipse(targetX,ground,shot.radius*tile,shot.radius*tile,0,0,Math.PI*2);ctx.fill();ctx.stroke();
          ctx.textAlign='center';ctx.font='bold 13px Georgia';ctx.fillStyle='#fff2d0';ctx.strokeStyle='#193e40';ctx.lineWidth=3;
          const caption=impact?'Impacto':shot.range+' quadrados';ctx.strokeText(caption,targetX,ground+shot.radius*tile+20);ctx.fillText(caption,targetX,ground+shot.radius*tile+20);
          ctx.restore();
        }
        const image = toolSheets[selected];
        const size = image.height;
        const frame = Math.floor(elapsed / 100) % (image.width / size);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(actorX), Math.round(ground + 11));
        ctx.scale(direction * zoom, zoom);
        ctx.drawImage(image, frame * size, 0, size, size, -size/2, -134-(size-192)/2, size, size);
        ctx.restore();
        ctx.save();
        ctx.textAlign = 'center'; ctx.font = 'bold 15px Georgia';
        ctx.lineWidth = 4; ctx.strokeStyle = '#193e40'; ctx.fillStyle = '#fff2d0';
        ctx.strokeText(names[selected], actorX, ground + 40);
        ctx.fillText(names[selected], actorX, ground + 40);
        ctx.restore();
      }
    };
    const draw = createScene(canvas, images, {matches: false});
    button.onclick = () => { playing = !playing; button.textContent = playing ? 'Pausar' : 'Continuar'; button.setAttribute('aria-pressed', String(!playing)); };
    status.textContent = '';
    function tick(time) {
      if (last !== null && playing) elapsed += Math.min(100, time - last);
      last = time;
      draw(map, pawn, elapsed);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } catch (error) { status.textContent = error.message; button.disabled = true; }
});

