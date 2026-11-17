function createControls(canvas) {
  const keys = new Set();
  const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  let touch = null;

  const joystick = document.querySelector('#joystick');
  const knob = joystick.querySelector('i');
  const vectors = { KeyW: [0,-1], KeyA: [-1,0], KeyS: [0,1], KeyD: [1,0] };

  function release() {
    touch = null;
    knob.style.transform = '';
  }
  function stop() {
    shifts.clear();
    keys.clear();
    release();
  }
  const shifts = new Set();
  const sprint = document.querySelector('#sprint');
  let sprintEnabled = false;
  sprint.addEventListener('click', () => {
    sprintEnabled = !sprintEnabled;
    sprint.classList.toggle('active', sprintEnabled);
    sprint.setAttribute('aria-pressed', String(sprintEnabled));
  });
  window.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') shifts.add(event.code);
    if (!movementKeys.includes(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    keys.add(event.code);
  });
  window.addEventListener('keyup', event => { keys.delete(event.code); shifts.delete(event.code); });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  function aim(event) {
    if (event.pointerId !== touch?.id) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch.direction = [0, 0];
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 7) {
      touch.direction = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    }
    const travel = Math.min(joystick.clientWidth * .25, Math.hypot(dx, dy));
    knob.style.transform = `translate(${touch.direction[0]*travel}px, ${touch.direction[1]*travel}px)`;
  }
  for (const area of [canvas, joystick]) {
    area.addEventListener('pointerdown', event => {
      if (area === canvas && (canvas.isPlacingBuilding?.() || canvas.pickHarvestTree?.(event))) return;
      if (touch || event.button !== 0 || (area === canvas && event.pointerType === 'mouse')) return;
      const rect = joystick.getBoundingClientRect();
      touch = { id: event.pointerId,
        x: area === canvas ? event.clientX : rect.left + rect.width / 2,
        y: area === canvas ? event.clientY : rect.top + rect.height / 2 };
      area.setPointerCapture(event.pointerId);
      aim(event);
    });
    area.addEventListener('pointermove', aim);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      area.addEventListener(type, event => { if (event.pointerId === touch?.id) release(); });
    }
  }

  return {
    stop,
    get direction() { if(canvas.isPositioningBuilding?.())return [0,0];return touch?.direction ?? vectors[Array.from(keys).pop()] ?? [0,0]; },
    get sprinting() { return shifts.size > 0 || sprintEnabled; },
  };
}
