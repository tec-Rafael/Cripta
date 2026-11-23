/* Isolated comparison: creates its own map and never opens or changes game saves. */
window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('#world');
  const status = document.querySelector('#status');
  const button = document.querySelector('#pause');
  const tools = document.querySelectorAll('[data-tool]');
  let selected = 'Shovel';
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
    const [images, shovel, hammer] = await Promise.all([
      loadImages(),
      load('assets/tools/pawn-shovel/knife-base/Pawn_Run Shovel.png'),
      load('assets/tiny-swords/Units/Blue Units/Pawn/Pawn_Idle Hammer.png')
    ]);
    const toolSheets = {Shovel: shovel};
    for (const tool of ['Hammer', 'Axe', 'Knife', 'Pickaxe']) {
      toolSheets[tool] = await load('assets/tiny-swords/Units/Blue Units/Pawn/Pawn_Run ' + tool + '.png');
    }
    const names = {Hammer: 'Martelo', Axe: 'Machado', Knife: 'Faca', Pickaxe: 'Picareta', Shovel: 'Pá'};
    function select(tool) {
      selected = tool;
      for (const item of tools) item.setAttribute('aria-pressed', String(item.dataset.tool === tool));
    }
    for (const item of tools) item.onclick = () => select(item.dataset.tool);
    window.addEventListener('keydown', event => {
      const tool = ['Hammer', 'Axe', 'Knife', 'Pickaxe', 'Shovel'][Number(event.key) - 1];
      if (tool) { event.preventDefault(); select(tool); }
    });
    select('Shovel');
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
        const direction = progress < .5 ? 1 : -1;
        const distance = progress < .5 ? -2 + progress * 8 : 6 - progress * 8;
        const actorX = margin + (this.x + distance * .65) * tile;
        const image = toolSheets[selected];
        const frame = Math.floor(elapsed / 125) % (image.width / 192);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(actorX), Math.round(ground + 11));
        ctx.scale(direction * zoom, zoom);
        ctx.drawImage(image, frame * 192, 0, 192, 192, -96, -134, 192, 192);
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