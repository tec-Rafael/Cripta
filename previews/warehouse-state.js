function createWarehousePreview(){
 const kinds=['wood','stone','gold','coins'];
 let bag,stores,active;
 function reset(){bag={wood:42,stone:28,gold:35,coins:100};stores=[{wood:8,stone:0,gold:4,coins:12},{wood:0,stone:10,gold:0,coins:0}];active=0;}
 reset();
 return {reset,get bag(){return bag;},get stores(){return stores;},get active(){return active;},select(index){if(index===0||index===1)active=index;},die(){for(const kind of kinds)bag[kind]=0;},transfer(kind,direction,requested){
  if(!kinds.includes(kind)||!['deposit','withdraw'].includes(direction))return 0;
  const source=direction==='deposit'?bag:stores[active],target=direction==='deposit'?stores[active]:bag;
  const room=direction==='deposit'?20-target[kind]:Infinity;
  const amount=Math.min(source[kind],room,requested==='all'?Infinity:Number.isSafeInteger(requested)&&requested>0?requested:0);
  source[kind]-=amount;target[kind]+=amount;return amount;
 }};
}
if(typeof module!=='undefined')module.exports={createWarehousePreview};
