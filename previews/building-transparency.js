// Isolated visual prototype: no save data or gameplay collision changes.
(async()=>{
 const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
 const status=document.querySelector('#status'),select=document.querySelector('#model'),pause=document.querySelector('#pause');
 const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível carregar '+src));img.src='../assets/tiny-swords/'+src;});
 try{
  const ids=['Monastery','House1','Tower','Castle'];
  const sheets=await Promise.all(ids.map(id=>load('Buildings/Blue Buildings/'+id+'.png')));
  const run=await load('Units/Blue Units/Pawn/Pawn_Run.png');
  const grass=await load('Terrain/Tileset/Tilemap_color1.png');
  let elapsed=0,last=null,playing=true,opacity=1;
  pause.onclick=()=>{playing=!playing;pause.textContent=playing?'Pausar':'Continuar';};
  function tick(time){
   const dt=last===null?0:Math.min(.05,(time-last)/1000);last=time;if(playing)elapsed+=dt;
   const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;
   if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#47aba9';ctx.fillRect(0,0,w,h);
   const scale=Math.min(w/600,(h-130)/440);ctx.translate(w/2,(h-130)/2);ctx.scale(scale,scale);ctx.translate(-300,-220);
   for(let y=-64;y<520;y+=64)for(let x=-64;x<700;x+=64)ctx.drawImage(grass,64,64,64,64,x,y,64,64);
   const model=getBuildingModel(select.value),left=300-model.width/2,bottom=360,top=bottom-model.height;
   const t=(elapsed%12)/12;
   // Walk around the footprint, crossing behind the roof and then across the front.
   const points=[[left-75,280],[left-75,150],[left+model.width+75,150],[left+model.width+75,390],[left-75,390],[left-75,280]];
   const segment=Math.min(4,Math.floor(t*5)),u=t*5-segment,a=points[segment],b=points[segment+1];
   const px=a[0]+(b[0]-a[0])*u,py=a[1]+(b[1]-a[1])*u,behind=py<bottom-20;
   const covered=behind&&px+23>left+12&&px-23<left+model.width-12&&py>top&&py-65<bottom;
   const target=covered?.4:1;if(playing)opacity+=(target-opacity)*(1-Math.exp(-dt*12));
   const drawPawn=()=>{const size=run.height,frame=Math.floor(elapsed*10)%(run.width/size);ctx.save();ctx.translate(px,py);ctx.scale(b[0]<a[0]?-1:1,1);ctx.drawImage(run,frame*size,0,size,size,-size/2,-size/2-27,size,size);ctx.restore();};
   if(behind)drawPawn();ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(sheets[ids.indexOf(select.value)],left,top,model.width,model.height);ctx.restore();if(!behind)drawPawn();
   status.textContent=covered?'Construção semitransparente · Pawn visível atrás':'Construção opaca · Pawn fora da cobertura';
   requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
 }catch(error){status.textContent=error.message;}
})();
