const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function gestureView(view,bounds,rect,from,to,factor=1){
 const extent=Math.max(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ)+12,oldZoom=view.zoom||1,zoom=clamp(oldZoom*factor,1,4);
 const axis=(key,min,max,size,origin,a,b)=>clamp((view[key]||0)+((a-origin)/size-.5)*extent/oldZoom-((b-origin)/size-.5)*extent/zoom,min,max);
 return {...view,zoom,x:axis('x',bounds.minX,bounds.maxX,rect.width,rect.left,from.x,to.x),z:axis('z',bounds.minZ,bounds.maxZ,rect.height,rect.top,from.y,to.y)};
}
export function bindTouchMap(map){
 const points=new Map(),canvas=map.canvas;let start=null,moved=false;
 const midpoint=values=>({x:values.reduce((s,p)=>s+p.x,0)/values.length,y:values.reduce((s,p)=>s+p.y,0)/values.length});
 const separation=values=>values.length===2?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0;
 const reset=()=>{points.clear();start=null;moved=false;};
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||points.size>=2)return;e.preventDefault();map.ignoreTouchClickUntil=performance.now()+1000;map.input.source='touch';points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size===1){start={x:e.clientX,y:e.clientY};moved=false;}else moved=true;try{canvas.setPointerCapture(e.pointerId);}catch{/* Pointer may already be cancelled by the browser. */}});
 canvas.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;e.preventDefault();const before=[...points.values()];points.set(e.pointerId,{x:e.clientX,y:e.clientY});const after=[...points.values()];if(!moved&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8)return;moved=true;
  const a=separation(before),b=separation(after);map.view=gestureView(map.view,map.getSim().layout.bounds,canvas.getBoundingClientRect(),midpoint(before),midpoint(after),a>2?b/a:1);map.draw();
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(!points.has(e.pointerId))return;map.ignoreTouchClickUntil=performance.now()+800;const tap=type==='pointerup'&&!moved&&points.size===1;points.delete(e.pointerId);if(tap)canvas.dispatchEvent(new CustomEvent('touch-map-tap',{detail:{clientX:e.clientX,clientY:e.clientY}}));if(points.size===0)reset();else moved=true;});
 map.dialog.addEventListener('close',reset);window.addEventListener('resize',reset);
}
