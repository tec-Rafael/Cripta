function createAdventure(pawn, changeWorld) {
  const ui = createAdventureDialog();
  const home = MapGenerator.generateHome();
  let adventuring = false;
  let character = 'pawn';

  function enter(map, isAdventure) {
    adventuring = isAdventure;
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
  function clickableBuilding(map, canvas, event, requireReach = true) {
    if (!map || ui.open || document.querySelector('dialog[open]') || !canvas.worldToScreen || map.encounter?.hp===0) return null;
    const rect=canvas.getBoundingClientRect();
    const x=(event.clientX-rect.left)*canvas.width/rect.width;
    const y=(event.clientY-rect.top)*canvas.height/rect.height;
    return [map.house,map.tower,...(map.name==='Lar'?map.decorations.filter(item=>item.kind==='house'&&item.model==='House3'):[])].filter(item=>{
      const base={x:item.x+1,y:item.y+.72};
      const point=canvas.worldToScreen(base);
      const height=item.kind==='tower'?3:2;
      return Math.abs(x-point.x)<=64 && y>=point.y-(height+.72)*64 && y<=point.y+.28*64 &&
        (!requireReach || Math.hypot(pawn.x-base.x,pawn.y-base.y)<=2 && visible(map,pawn,base));
    }).sort((a,b)=>b.y-a.y)[0];
  }
  function interact(map, canvas, event) {
    const door=clickableBuilding(map,canvas,event);
    if (!door) return false;
    if(!adventuring&&door.model==='House3'&&homeInventory.equipped==='Axe')return false;
    pawn.pause();
    if(map.encounter?.enemies.length){
      const n=map.encounter.enemies.length;
      notifyBattle(`Derrote ${n===1?'o último inimigo':`os ${n} inimigos restantes`} para ${door.kind==='house'?'voltar ao Lar':'avançar'}.`);
      return true;
    }
    if(!adventuring&&door.model==='House3'){homeInventory.stop();warehouse.open(door);return true;}
    if (!adventuring && door.kind === 'house') {
      homeConstruction.open(map);
    } else if (door.kind === 'house') {
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
      ui.showMap(() => {
        ui.show('Escolha seu personagem', true, startAdventure, () => {});
      }, () => {});
    }
    return true;
  }
  return {start, interact, clickableBuilding, get paused() { return ui.open; }};
}
