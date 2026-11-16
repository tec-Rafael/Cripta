function createHomeConstruction(inventory, pawn, wallet) {
  const dialog=document.getElementById('home-menu');
  const root=document.getElementById('home-menu-root');
  const catalog=document.getElementById('construction-catalog');
  const title=document.getElementById('home-menu-title');
  const status=document.getElementById('construction-status');
  const options=document.getElementById('house-options');
  const storageKey='cripta.home.buildings.v1';
  const cost={coins:20,wood:10,gold:5};
  const colors={Blue:'Azul',Red:'Vermelha',Purple:'Roxa',Yellow:'Amarela'};
  let map=null, buildings=[];
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(Array.isArray(saved)) buildings=saved.filter(b=>colors[b.color] && Number.isInteger(b.x) &&
      Number.isInteger(b.y) && b.x>2 && b.y>2 && b.x<46 && b.y<46)
      .map(b=>({kind:'house',x:b.x,y:b.y,color:b.color,hill:0}));
  } catch {}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(buildings));}catch{}}
  function showCatalog(show){
    root.hidden=show;catalog.hidden=!show;title.textContent=show?'Construção':'Lar';status.textContent='';
    if(show)refresh();
  }
  function refresh(){
    const resources=inventory.resources;
    for(const button of options.querySelectorAll('.build-house')) {
      button.disabled=wallet.coins<cost.coins || resources.wood<cost.wood || resources.gold<cost.gold;
    }
    status.textContent=`Você possui ${wallet.coins} moedas, ${resources.wood} madeiras e ${resources.gold} minérios de ouro.`;
  }
  function findSite(){
    const sites=[];
    for(let y=3;y<46;y++)for(let x=3;x<46;x++){
      let free=true;
      // Reserve the roof, footprint and a clear approach to the front door.
      for(let dy=-1;dy<=1 && free;dy++)for(let dx=0;dx<=1;dx++){
        if(!map.surface[y+dy]?.[x+dx] || map.heights[y+dy][x+dx]!==0 || map.paths[y+dy]?.[x+dx] ||
          map.stairs.some(s=>s.x===x+dx&&s.y===y+dy)){free=false;break;}
      }
      if(!free || Math.hypot(pawn.x-x-1,pawn.y-y-.72)<2)continue;
      if(map.decorations.some(item=>item.kind!=='bush' && item.x>=x-1&&item.x<=x+2&&item.y>=y-2&&item.y<=y+2))continue;
      if(inventory.drops.some(item=>item.x>=x-1&&item.x<=x+2&&item.y>=y-2&&item.y<=y+2))continue;
      sites.push({x,y});
    }
    sites.sort((a,b)=>Math.hypot(a.x-map.house.x,a.y-map.house.y)-Math.hypot(b.x-map.house.x,b.y-map.house.y));
    return sites[0];
  }
  function build(color){
    if(!map || map.name!=='Lar')return;
    refresh();
    const resources=inventory.resources;
    if(wallet.coins<cost.coins||resources.wood<cost.wood||resources.gold<cost.gold)return;
    const site=findSite();
    if(!site){status.textContent='Não há espaço livre suficiente para outra casa.';return;}
    if(!inventory.spend(cost))return;
    wallet.spend(cost.coins);
    const house={kind:'house',...site,color,hill:0};
    map.decorations=map.decorations.filter(item=>item.kind!=='bush'||item.x<site.x||item.x>site.x+1||item.y<site.y-1||item.y>site.y+1);
    buildings.push(house);map.decorations.push(house);save();refresh();
    status.textContent=`Casa ${colors[color].toLowerCase()} construída! Os recursos foram descontados.`;
  }
  for(const [color,label] of Object.entries(colors)){
    const card=document.createElement('article');card.className='house-plan';
    card.innerHTML=`<h3>Casa ${label}</h3><img class="house-preview" src="assets/tiny-swords/Buildings/${color} Buildings/House1.png" alt="Casa ${label.toLowerCase()}">
      <div class="construction-cost construction-ribbon" aria-label="Custo: 20 moedas, 10 madeiras e 5 minérios de ouro">
        <span><img src="assets/ui/gold-coin.png" alt="Moedas">20</span>
        <span><img src="assets/tiny-swords/Terrain/Resources/Wood/Wood Resource/Wood Resource.png" alt="Madeira">10</span>
        <span><img src="assets/ui/gold-small.png" alt="Minério de ouro">5</span>
      </div><button class="wood-action build-house" type="button">Construir</button>`;
    card.querySelector('button').onclick=()=>build(color);options.append(card);
  }
  document.getElementById('open-construction').onclick=()=>showCatalog(true);
  document.getElementById('construction-back').onclick=()=>showCatalog(false);
  dialog.querySelector('.home-menu-close').onclick=()=>dialog.close();
  return {
    attach(next){
      map=next.name==='Lar'?next:null;
      if(map)for(const b of buildings){
        map.decorations=map.decorations.filter(item=>item.kind!=='bush'||item.x<b.x||item.x>b.x+1||item.y<b.y-1||item.y>b.y+1);
        if(!map.decorations.includes(b))map.decorations.push(b);
      }
    },
    open(next){if(next!==map)return;pawn.pause();inventory.stop();showCatalog(false);dialog.showModal();},
    get opened(){return dialog.open;}
  };
}
