async function loadImages() {
  const ASSETS = 'assets/tiny-swords/';
  const images = {};
  const sources = {
    yellowIdle:'../enemies/rzcefm-reference/Idle.png',yellowRun:'../enemies/rzcefm-reference/Run.png',yellowStrike:'../enemies/rzcefm-reference/Strike.png',
    bearIdle:'../enemies/mbqmms-reference/Idle.png',bearRun:'../enemies/mbqmms-reference/Run.png',bearStrike:'../enemies/mbqmms-reference/Strike.png',
    fenceHorizontal:'../fences/fence-v4-horizontal.png',
    fenceVertical:'../fences/fence-v4-vertical.png',
    fencePost:'../fences/fence-v4-post.png',
    pawnBuild:'Units/Black Units/Pawn/Pawn_Interact Hammer.png',
    constructionMarker:'UI Elements/UI Elements/Cursors/Cursor_04.png',
    pawnMine:'Units/Black Units/Pawn/Pawn_Interact Pickaxe.png',
    goldStone5:'Terrain/Resources/Gold/Gold Stones/Gold Stone 5.png',
    goldStone6:'Terrain/Resources/Gold/Gold Stones/Gold Stone 6.png',
    goldDrop:'../ui/gold-small.png',
    stoneDrop:'../ui/stone-drop.png',
    stoneDepositLarge:'../ui/stone-deposit-large.png',
    pawnChop:'Units/Black Units/Pawn/Pawn_Interact Axe.png',
    wood:'Terrain/Resources/Wood/Wood Resource/Wood Resource.png',
    dust:'Particle FX/Dust_01.png',
    coin:'../ui/gold-coin.png',
    gnomePortrait:'../gnome/reference-extract/Badge.png',
    gnomeIdle:'../gnome/reference-extract/Idle.png',
    gnomeRun:'../gnome/reference-extract/Run.png',
    gnomeStrike:'../gnome/reference-extract/Strike-Combat.png',
    knightAttack:'Units/Blue Units/Warrior/Warrior_Attack1.png',
    knightGuard:'Units/Blue Units/Warrior/Warrior_Guard.png',
    lancerAttack:'Units/Blue Units/Lancer/Lancer_Right_Attack.png',
    lancerUp:'Units/Blue Units/Lancer/Lancer_Up_Attack.png',
    lancerDown:'Units/Blue Units/Lancer/Lancer_Down_Attack.png',
    monkAttack:'Units/Blue Units/Monk/Heal.png',
    monkEffect:'Units/Blue Units/Monk/Heal_Effect.png',
    archerAttack:'Units/Blue Units/Archer/Archer_Shoot.png',
    arrow:'Units/Blue Units/Archer/Arrow.png',
    pawnIdle: 'Units/Black Units/Pawn/Pawn_Idle.png',
    pawnRun: 'Units/Black Units/Pawn/Pawn_Run.png',
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
  for(const model of Object.keys(buildingModels))for(const color of ['Blue','Red','Purple','Yellow'])
    sources['building'+model+color]='Buildings/'+color+' Buildings/'+model+'.png';
  for (const [name, folder] of Object.entries({
    knight:'Warrior/Warrior_', archer:'Archer/Archer_', monk:'Monk/', lancer:'Lancer/Lancer_',
  })) {
    sources[name+'Idle'] = 'Units/Blue Units/'+folder+'Idle.png';
    sources[name+'Run'] = 'Units/Blue Units/'+folder+'Run.png';
  }
  for (const tool of ['Hammer','Axe','Knife','Pickaxe','Wood','Gold']) {
    sources['pawnIdle'+tool] = 'Units/Black Units/Pawn/Pawn_Idle '+tool+'.png';
    sources['pawnRun'+tool] = 'Units/Black Units/Pawn/Pawn_Run '+tool+'.png';
  }
  for (let variant = 1; variant <= 4; variant++) {
    sources['stump'+variant] = 'Terrain/Resources/Wood/Trees/Stump '+variant+'.png';
    sources['tree'+variant] = `Terrain/Resources/Wood/Trees/Tree${variant}.png`;
    sources['bush'+variant] = `Terrain/Decorations/Bushes/Bushe${variant}.png`;
  }
  for (const color of ['Black','Blue','Red','Purple','Yellow']) {
    for (const [role, folder] of Object.entries({pawn:'Pawn/Pawn_',knight:'Warrior/Warrior_',archer:'Archer/Archer_',monk:'Monk/',lancer:'Lancer/Lancer_'})) {
      for (const action of ['Idle','Run']) sources['npc'+color+role+action]='Units/'+color+' Units/'+folder+action+'.png';
    }
  }
  await Promise.all(Object.entries(sources).map(([key, path]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { images[key] = image; resolve(); };
    image.onerror = () => reject(new Error(`Não foi possível carregar ${path}`));
    image.src = ASSETS + path;
  })));
  return images;
}
