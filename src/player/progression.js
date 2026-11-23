/* Persistent player progression, independent of worlds and combat classes. */
function createProgression({storage, key='cripta.player.xp.v1'}={}) {
  if (!storage) { try { storage = localStorage; } catch {} }
  const MAX_XP = 1000000000;
  let totalXP = 0, checkpoint = 1;
  try {
    const saved = JSON.parse(storage?.getItem(key));
    if (saved?.version === 1 && Number.isSafeInteger(saved.totalXP) && saved.totalXP >= 0 && saved.totalXP <= MAX_XP)
      totalXP = saved.totalXP;
    if(saved?.version===1 && Number.isSafeInteger(saved.checkpoint) && saved.checkpoint>=5 && saved.checkpoint%5===0 && saved.checkpoint<=100)checkpoint=saved.checkpoint;
  } catch {}
  totalXP=Math.max(totalXP,25*(checkpoint-1)*(checkpoint+2));
  function save(){try{storage?.setItem(key,JSON.stringify({version:1,totalXP,checkpoint}));}catch{}}
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
    get checkpoint(){return checkpoint;},
    defeatBoss(level){if(level===checkpoint+5 || checkpoint===1 && level===5){checkpoint=level;totalXP=Math.max(totalXP,25*(level-1)*(level+2));save();}return state();},
    die(){totalXP=25*(checkpoint-1)*(checkpoint+2);save();return state();},
    add(amount) {
      if (!Number.isSafeInteger(amount) || amount <= 0) return state();
      totalXP = Math.min(MAX_XP, totalXP + amount);
      save();
      return state();
    }
  };
}