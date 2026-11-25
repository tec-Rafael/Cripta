function createWarehouseStorage(storage=localStorage){
 const key='cripta.home.warehouses.v1',kinds=['wood','stone','gold','coins'];let stores={};
 try{const saved=JSON.parse(storage.getItem(key));if(saved&&typeof saved==='object')for(const [id,values] of Object.entries(saved)){
  if(!/^House3:\d+,\d+$/.test(id))continue;
  stores[id]=Object.fromEntries(kinds.map(kind=>[kind,Number.isSafeInteger(values?.[kind])?Math.max(0,Math.min(20,values[kind])):0]));
 }}catch{}
 const id=house=>'House3:'+house.x+','+house.y;
 function get(house){return stores[id(house)]??={wood:0,stone:0,gold:0,coins:0};}
 function save(){try{storage.setItem(key,JSON.stringify(stores));}catch{}}
 return {get,hasItems:house=>Object.values(get(house)).some(n=>n>0),transfer(house,kind,direction,amount,inventory,wallet){
  if(!kinds.includes(kind)||!['deposit','withdraw'].includes(direction)||!Number.isSafeInteger(amount)||amount<1||amount>20)return false;
  const stock=get(house),carried=kind==='coins'?wallet.coins:inventory.resources[kind];
  if(direction==='deposit'&&(carried<amount||stock[kind]+amount>20)||direction==='withdraw'&&stock[kind]<amount)return false;
  const cost={wood:0,stone:0,gold:0};if(kind!=='coins')cost[kind]=amount;
  if(direction==='deposit'){
   if(kind==='coins')wallet.change(-amount);else if(!inventory.spend(cost))return false;
   stock[kind]+=amount;
  }else{
   if(kind==='coins')wallet.change(amount);else inventory.refund(cost);
   stock[kind]-=amount;
  }
  save();return true;
 }};
}

function createWarehouse(inventory,pawn,wallet){
 const storage=createWarehouseStorage(),panel=document.getElementById('warehouse-dialog');
 const $=id=>document.getElementById('wh-'+id);
 const materials={wood:{name:'Madeira',src:'assets/tiny-swords/Terrain/Resources/Wood/Wood Resource/Wood Resource.png'},stone:{name:'Pedra',src:'assets/tiny-swords/Terrain/Decorations/Rocks/Rock1.png'},gold:{name:'Minério de ouro',src:'assets/ui/gold-small.png'},coins:{name:'Moedas de ouro',src:'assets/ui/gold-coin.png'}};
 let house=null,selected='wood',quantity=1;
 for(const [kind,item] of Object.entries(materials)){
  const button=document.createElement('button');button.className='slot';button.dataset.kind=kind;button.type='button';
  button.innerHTML=`<img src="${item.src}" alt=""><b></b>`;button.onclick=()=>{selected=kind;quantity=1;render();};$('slots').append(button);
  const cell=document.createElement('div');cell.dataset.kind=kind;cell.innerHTML=`<img src="${item.src}" alt="${item.name}"><b></b>`;$('bag').append(cell);
 }
 function render(message){
  if(!house)return;
  const stock=storage.get(house),bag={...inventory.resources,coins:wallet.coins};
  for(const button of $('slots').children){const kind=button.dataset.kind;button.querySelector('b').textContent=stock[kind]+'/20';button.setAttribute('aria-pressed',String(selected===kind));button.setAttribute('aria-label',materials[kind].name+': '+stock[kind]+' de 20');}
  for(const cell of $('bag').children)cell.querySelector('b').textContent=bag[cell.dataset.kind];
  $('material').textContent=materials[selected].name;$('balance').textContent=`Com você: ${bag[selected]} · Guardado: ${stock[selected]}/20`;
  $('quantity').textContent=quantity;$('less').disabled=quantity<=1;$('more').disabled=quantity>=20;
  for(const button of panel.querySelectorAll('[data-direction]'))button.disabled=button.dataset.direction==='deposit'?bag[selected]<quantity||stock[selected]+quantity>20:stock[selected]<quantity;
  $('status').textContent=message||'Os materiais guardados permanecem após a morte.';
 }
 for(const button of panel.querySelectorAll('[data-direction]'))button.onclick=()=>{
  const success=storage.transfer(house,selected,button.dataset.direction,quantity,inventory,wallet);
  render(success?`${quantity} ${materials[selected].name.toLowerCase()} ${button.dataset.direction==='deposit'?'guardado(s)':'retirado(s)'}.`:'Não foi possível transferir essa quantidade.');
 };
 $('less').onclick=()=>{quantity=Math.max(1,quantity-1);render();};$('more').onclick=()=>{quantity=Math.min(20,quantity+1);render();};
 $('close').onclick=()=>panel.close();
 return {get opened(){return panel.open;},hasItems:storage.hasItems,open(building){house=building;quantity=1;selected='wood';inventory.stop();pawn.pause();render();if(!panel.open)panel.showModal();}};
}
