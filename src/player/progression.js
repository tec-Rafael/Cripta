/* Persistent player progression, independent of worlds and combat classes. */
function createProgression({storage, key='cripta.player.xp.v1'}={}) {
  if (!storage) { try { storage = localStorage; } catch {} }
  const MAX_XP = 1000000000;
  let totalXP = 0;
  try {
    const saved = JSON.parse(storage?.getItem(key));
    if (saved?.version === 1 && Number.isSafeInteger(saved.totalXP) && saved.totalXP >= 0 && saved.totalXP <= MAX_XP)
      totalXP = saved.totalXP;
  } catch {}
  function state() {
    // XP spent before level n+1: 25*n*(n+3). Correct around floating-point boundaries.
    let completed = Math.floor((Math.sqrt(9 + totalXP / 6.25) - 3) / 2);
    const spent = n => 25 * n * (n + 3);
    while (spent(completed + 1) <= totalXP) completed++;
    while (spent(completed) > totalXP) completed--;
    return {level: completed + 1, xp: totalXP - spent(completed), required: 100 + completed * 50, totalXP};
  }
  return {
    get state() { return state(); },
    add(amount) {
      if (!Number.isSafeInteger(amount) || amount <= 0) return state();
      totalXP = Math.min(MAX_XP, totalXP + amount);
      try { storage?.setItem(key, JSON.stringify({version: 1, totalXP})); } catch {}
      return state();
    }
  };
}