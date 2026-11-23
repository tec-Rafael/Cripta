// Only touches on the world participate; HUD controls retain their own gestures.
function enablePinchZoom(canvas, cancelActions) {
  const touches = new Map();
  let initialDistance=0, initialZoom=1, pinching=false;
  canvas.viewZoom=1;
  const clampZoom=value=>Math.max(.25,Math.min(1,value));
  // Wheel and pinch control the same camera scale, never the page or HUD.
  canvas.addEventListener('wheel',event=>{
    if(document.querySelector('dialog[open]'))return;
    event.preventDefault();
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);
    canvas.viewZoom=clampZoom(canvas.viewZoom*Math.exp(-delta*.0015));
  },{passive:false});
  // Prevent page-level pinch from scaling HUD/menu elements, including Safari gestures.
  document.addEventListener('touchmove',event=>{
    if(event.touches.length>1)event.preventDefault();
  },{passive:false});
  for(const type of ['gesturestart','gesturechange'])document.addEventListener(type,event=>{
    event.preventDefault();
  },{passive:false});
  const distance=()=>{const [a,b]=[...touches.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
  function block(event){event.preventDefault();event.stopImmediatePropagation();}
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(touches.size>=2){
      if(!pinching){initialDistance=Math.max(1,distance());initialZoom=canvas.viewZoom;pinching=true;canvas.pinching=true;cancelActions();}
      canvas.setPointerCapture(event.pointerId);block(event);
    }
  },true);
  canvas.addEventListener('pointermove',event=>{
    if(!touches.has(event.pointerId))return;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(!pinching)return;
    if(touches.size>=2)canvas.viewZoom=clampZoom(initialZoom*distance()/initialDistance);
    block(event);
  },true);
  function end(event){
    if(!touches.has(event.pointerId))return;
    touches.delete(event.pointerId);
    if(pinching){block(event);if(!touches.size){pinching=false;canvas.pinching=false;}}
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end,true);
  window.addEventListener('blur',()=>{touches.clear();pinching=false;canvas.pinching=false;});
}
