// Fullscreen requires a user gesture; never trap the player after they exit.
(() => {
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!request || document.fullscreenEnabled === false) return;
  const events = ['pointerup', 'keydown'];
  function enter(event) {
    if (!event.isTrusted || event.type === 'keydown' &&
        (event.key === 'Escape' || event.repeat || event.ctrlKey || event.altKey || event.metaKey)) return;
    if (event.type === 'pointerup' && event.button !== 0) return;
    for (const type of events) document.removeEventListener(type, enter, true);
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const result = request.call(root);
      // Unsupported devices and browser restrictions keep the normal full-viewport layout.
      if (result?.catch) result.catch(() => {});
    } catch {}
  }
  for (const type of events) document.addEventListener(type, enter, true);
})();
