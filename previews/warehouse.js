const demo=createWarehousePreview();
const materials={wood:{name:'Madeira',src:'../assets/tiny-swords/Terrain/Resources/Wood/Wood Resource/Wood Resource.png'},stone:{name:'Pedra',src:'../assets/tiny-swords/Terrain/Decorations/Rocks/Rock1.png'},gold:{name:'Minério de ouro',src:'../assets/ui/gold-small.png'},coins:{name:'Moedas de ouro',src:'../assets/ui/gold-coin.png'}};
const $=id=>document.getElementById(id),panel=$('panel');let selected='wood';
for(const [kind,item] of Object.entries(materials)){
 const button=document.createElement('button');button.className='slot';button.dataset.kind=kind;
 button.innerHTML=`<img src="${item.src}" alt=""><b></b>`;button.onclick=()=>{selected=kind;render();};$('slots').append(button);
 const cell=document.createElement('div');cell.dataset.kind=kind;cell.innerHTML=`<img src="${item.src}" alt="${item.name}"><b></b>`;$('bag').append(cell);
}
function render(message){
 $('warehouse').value=String(demo.active);$('title').textContent='Armazém '+(demo.active===0?'Azul':'Vermelho');
 $('open').querySelector('img').src=`../assets/tiny-swords/Buildings/${demo.active===0?'Blue':'Red'} Buildings/House3.png`;
 for(const button of $('slots').children){const kind=button.dataset.kind,count=demo.stores[demo.active][kind];button.querySelector('b').textContent=count+'/20';button.setAttribute('aria-label',materials[kind].name+': '+count+' de 20');button.setAttribute('aria-pressed',String(kind===selected));}
 for(const cell of $('bag').children)cell.querySelector('b').textContent=demo.bag[cell.dataset.kind];
 $('material').textContent=materials[selected].name;$('balance').textContent=`Com você: ${demo.bag[selected]} · Guardado: ${demo.stores[demo.active][selected]}/20`;
 for(const button of document.querySelectorAll('[data-direction]'))button.disabled=button.dataset.direction==='deposit'?demo.bag[selected]===0||demo.stores[demo.active][selected]>=20:demo.stores[demo.active][selected]===0;
 $('status').textContent=message||'Os materiais guardados permanecem após a morte.';
}
for(const button of document.querySelectorAll('[data-direction]'))button.onclick=()=>{
 const n=demo.transfer(selected,button.dataset.direction,button.dataset.amount==='all'?'all':1);
 render(`${n} ${materials[selected].name.toLowerCase()} ${button.dataset.direction==='deposit'?'guardado(s)':'retirado(s)'}.`);
};
function death(){demo.die();render('Morte simulada: inventário zerado. Os dois armazéns conservaram seus materiais.');}
$('death').onclick=$('panel-death').onclick=death;
$('reset').onclick=()=>{demo.reset();selected='wood';render('Teste reiniciado.');panel.showModal();};
$('warehouse').onchange=event=>{demo.select(Number(event.target.value));render();};
$('panel-switch').onclick=()=>{demo.select(1-demo.active);render();};
$('open').onclick=()=>panel.showModal();$('close').onclick=()=>panel.close();
render();panel.showModal();
