/* Isolated comparison: creates its own map and never opens or changes game saves. */
window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('#world');
  const status = document.querySelector('#status');
  const button = document.querySelector('#pause');
  const load = path => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar: ' + path));
    image.src = path;
  });
  try {
    const [images, shovel, hammer] = await Promise.all([
      loadImages(),
      load('assets/tools/pawn-shovel/idle-v4/Pawn_Idle_Shovel-sheet.png'),
      load('assets/tiny-swords/Units/Blue Units/Pawn/Pawn_Idle Hammer.png')
    ]);
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
        const gap = Math.min(1.25, Math.max(.8, canvas.width / tile / 5));
        const shovelX = margin + (this.x - gap) * tile;
        const hammerX = margin + (this.x + gap) * tile;
        const sf = Math.floor(elapsed / 220) % 4;
        const hf = Math.floor(elapsed / 100) % (hammer.width / 192);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(shovel, (sf % 2) * 640, Math.floor(sf / 2) * 640, 640, 640, Math.round(shovelX - 45), Math.round(ground - 69), 89, 89);
        ctx.drawImage(hammer, hf * 192, 0, 192, 192, Math.round(hammerX - 96), Math.round(ground - 123), 192, 192);
        ctx.textAlign = 'center'; ctx.font = 'bold 15px Georgia';
        ctx.lineWidth = 4; ctx.strokeStyle = '#193e40'; ctx.fillStyle = '#fff2d0';
        for (const [x, text] of [[shovelX, 'Pá'], [hammerX, 'Martelo original']]) {
          ctx.strokeText(text, x, ground + 40); ctx.fillText(text, x, ground + 40);
        }
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