async function loadImages() {
  const ASSETS = 'assets/tiny-swords/';
  const images = {};
  const sources = {
    constructionFence:'../fences/wooden-fence-sheet-v1.png',
    pawnBuild:'Units/Blue Units/Pawn/Pawn_Interact Hammer.png',
    constructionMarker:'UI Elements/UI Elements/Cursors/Cursor_04.png',
    pawnMine:'Units/Blue Units/Pawn/Pawn_Interact Pickaxe.png',
    goldStone5:'Terrain/Resources/Gold/Gold Stones/Gold Stone 5.png',
    goldStone6:'Terrain/Resources/Gold/Gold Stones/Gold Stone 6.png',
    goldDrop:'../ui/gold-small.png',
    pawnChop:'Units/Blue Units/Pawn/Pawn_Interact Axe.png',
    wood:'Terrain/Resources/Wood/Wood Resource/Wood Resource.png',
    dust:'Particle FX/Dust_01.png',
    coin:'../ui/gold-coin.png',
    gnomeIdle:'../gnome/Idle.png',
    gnomeRun:'../gnome/Run.png',
    gnomeStrike:'../gnome/Strike.png',
    knightAttack:'Units/Blue Units/Warrior/Warrior_Attack1.png',
    knightGuard:'Units/Blue Units/Warrior/Warrior_Guard.png',
    lancerAttack:'Units/Blue Units/Lancer/Lancer_Right_Attack.png',
    lancerUp:'Units/Blue Units/Lancer/Lancer_Up_Attack.png',
    lancerDown:'Units/Blue Units/Lancer/Lancer_Down_Attack.png',
    monkAttack:'Units/Blue Units/Monk/Heal.png',
    monkEffect:'Units/Blue Units/Monk/Heal_Effect.png',
    archerAttack:'Units/Blue Units/Archer/Archer_Shoot.png',
    arrow:'Units/Blue Units/Archer/Arrow.png',
    pawnIdle: 'Units/Blue Units/Pawn/Pawn_Idle.png',
    pawnRun: 'Units/Blue Units/Pawn/Pawn_Run.png',
    terrain: 'Terrain/Tileset/Tilemap_color1.png',
    wet: 'Terrain/Tileset/Tilemap_color5.png',
    grass: 'Terrain/Tileset/Tilemap_color2.png',
    moss: 'Terrain/Tileset/Tilemap_color4.png',
    foam: 'Terrain/Tileset/Water Foam.png',
    water: 'Terrain/Tileset/Water Background color.png',
    tree: 'Terrain/Resources/Wood/Trees/Tree1.png',
    bush: 'Terrain/Decorations/Bushes/Bushe1.png',
    rock: 'Terrain/Decorations/Rocks/Rock1.png',
    waterRock: 'Terrain/Decorations/Rocks in the Water/Water Rocks_01.png',
    sheep: 'Terrain/Resources/Meat/Sheep/Sheep_Idle.png',
    sheepMove: 'Terrain/Resources/Meat/Sheep/Sheep_Move.png',
    tower: 'Buildings/Black Buildings/Tower.png',
    house: 'Buildings/Blue Buildings/House1.png',
    houseBlack: 'Buildings/Black Buildings/House1.png',
    cloud: 'Terrain/Decorations/Clouds/Clouds_01.png',
  };
  for (const color of ['Blue','Red','Purple','Yellow']) sources['house'+color]='Buildings/'+color+' Buildings/House1.png';
  for (const [name, folder] of Object.entries({
    knight:'Warrior/Warrior_', archer:'Archer/Archer_', monk:'Monk/', lancer:'Lancer/Lancer_',
  })) {
    sources[name+'Idle'] = 'Units/Blue Units/'+folder+'Idle.png';
    sources[name+'Run'] = 'Units/Blue Units/'+folder+'Run.png';
  }
  for (const tool of ['Hammer','Axe','Knife','Pickaxe','Wood','Gold']) {
    sources['pawnIdle'+tool] = 'Units/Blue Units/Pawn/Pawn_Idle '+tool+'.png';
    sources['pawnRun'+tool] = 'Units/Blue Units/Pawn/Pawn_Run '+tool+'.png';
  }
  for (let variant = 1; variant <= 4; variant++) {
    sources['stump'+variant] = 'Terrain/Resources/Wood/Trees/Stump '+variant+'.png';
    sources['tree'+variant] = `Terrain/Resources/Wood/Trees/Tree${variant}.png`;
    sources['bush'+variant] = `Terrain/Decorations/Bushes/Bushe${variant}.png`;
  }
  await Promise.all(Object.entries(sources).map(([key, path]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images[key] = image; resolve(); };
    image.onerror = () => reject(new Error(`Não foi possível carregar ${path}`));
    image.src = ASSETS + path;
  })));
  return images;
}
