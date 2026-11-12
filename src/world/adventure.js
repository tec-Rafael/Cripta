function createAdventure(pawn, changeWorld) {
  const ui = createAdventureDialog();
  const home = MapGenerator.generateHome();
  let adventuring = false;
  let character = 'pawn';
  let blockedDoor = null;

  function enter(map, isAdventure) {
    adventuring = isAdventure;
    blockedDoor = null;
    const activeCharacter = isAdventure ? character : 'pawn';
    pawn.setCharacter(activeCharacter);
    showCharacterBanner(activeCharacter);
    map.name = isAdventure ? 'Aventura' : 'Lar';
    changeWorld(map);
  }
  function close() { ui.close(); }
  function startAdventure(selected) {
    character = selected;
    close();
    enter(MapGenerator.generate(), true);
  }
  function start() { enter(home, false); }
  function update(map) {
    if (ui.open) return;
    const doors = adventuring ? [map.house, map.tower] : [map.tower];
    const distance = item => Math.hypot(pawn.x-item.x-1, pawn.y-item.y-.72);
    if (blockedDoor && distance(blockedDoor) > .95) blockedDoor = null;
    const door = doors.find(item => item !== blockedDoor &&
      Math.abs(pawn.x-item.x-1) < .34 && Math.abs(pawn.y-item.y-.72) < .23);
    if (!door) return;
    blockedDoor = door;
    pawn.pause();
    if(map.encounter?.enemies.length){
      const n=map.encounter.enemies.length;
      notifyBattle(`Derrote ${n===1?'o último inimigo':`os ${n} inimigos restantes`} para ${door.kind==='house'?'voltar ao Lar':'avançar'}.`);
      return;
    }
    if (door.kind === 'house') {
      ui.show('Retornar ao seu lar?', false, () => {
        close();
        enter(home, false);
      }, () => {});
    } else if (adventuring) {
      ui.show('Deseja avançar para outro mundo?', false, () => {
        close();
        enter(MapGenerator.generate(), true);
      }, () => {});
    } else {
      ui.show('Deseja iniciar a aventura?', false, () => {
        ui.show('Escolha seu personagem', true, startAdventure, () => {});
      }, () => {});
    }
  }
  return {start, update, get paused() { return ui.open; }};
}
