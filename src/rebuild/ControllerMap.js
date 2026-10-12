import {bindTouchMap} from './TouchMap.js';
import {drawAtlas,atlasPoint} from './Atlas.js';
import {insideMap} from './Map.js';
import {pointBlocked} from './config.js';
import {glyph} from './ControllerConfig.js';
export function moveMapCursor(cursor,stick,dt){return {x:Math.max(.02,Math.min(.98,cursor.x+stick.x*dt*.65)),y:Math.max(.02,Math.min(.98,cursor.y+stick.y*dt*.65))};}
export class ControllerMap{
 constructor(getSim,input){this.getSim=getSim;this.input=input;this.canvas=document.getElementById('city-atlas');this.dialog=document.getElementById('map-dialog');this.view={zoom:1};this.cursor={x:.5,y:.5};
  this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','City street map. Drag to pan, pinch to zoom, tap to mark. Right stick moves cursor; Cross places marker.');
  this.canvas.onclick=e=>{if(e.pointerType!=='touch'&&performance.now()>(this.ignoreTouchClickUntil||0))this.mark(atlasPoint(this.canvas,getSim().layout,e,this.view));};
  this.canvas.addEventListener('touch-map-tap',e=>this.mark(atlasPoint(this.canvas,getSim().layout,e.detail,this.view)));bindTouchMap(this);
  this.canvas.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();this.cursor=moveMapCursor(this.cursor,{x:d[0],y:d[1]},.045);this.draw();}if(e.key==='Enter'){e.preventDefault();this.markCursor();}});
  document.getElementById('map-clear').onclick=()=>this.clear();document.getElementById('map-center').onclick=()=>this.center();
  document.getElementById('map-zoom-in').onclick=()=>this.zoom(.5);document.getElementById('map-zoom-out').onclick=()=>this.zoom(-.5);
  for(const key of ['enemies','vehicles','encounters','landmarks'])document.getElementById('map-show-'+key).onchange=e=>{this.view[key]=e.target.checked;this.draw();};
 }
 open(){this.view.x=0;this.view.z=0;this.view.zoom=1;this.cursor={x:.5,y:.5};this.draw();if(this.input.source==='gamepad')this.canvas.focus();}
 draw(){if(this.input.source==='touch')document.getElementById('map-pad-help').textContent=`DRAG TO PAN · PINCH TO ZOOM · TAP TO MARK · ${this.view.zoom.toFixed(1)}×`;drawAtlas(this.canvas,this.getSim(),true,this.view);const ctx=this.canvas.getContext('2d'),x=this.cursor.x*this.canvas.width,y=this.cursor.y*this.canvas.height;ctx.strokeStyle='#fff1cd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.moveTo(x-17,y);ctx.lineTo(x-5,y);ctx.moveTo(x+5,y);ctx.lineTo(x+17,y);ctx.moveTo(x,y-17);ctx.lineTo(x,y-5);ctx.moveTo(x,y+5);ctx.lineTo(x,y+17);ctx.stroke();}
 zoom(delta){this.view.zoom=Math.max(1,Math.min(4,this.view.zoom+delta));this.draw();}
 center(){const p=this.getSim().player;this.view.x=p.x;this.view.z=p.z;this.cursor={x:.5,y:.5};this.draw();}
 clear(){this.getSim().player.waypoint=null;document.getElementById('atlas-help').textContent='MARKER CLEARED';this.draw();}
 mark(p){const sim=this.getSim();if(insideMap(sim.layout,p.x,p.z,.5)&&!pointBlocked(p.x,p.z,.5,sim.obstacles)){sim.player.waypoint=p;document.getElementById('atlas-help').textContent='DESTINATION MARKED · FOLLOW THE GOLD LINE';}else document.getElementById('atlas-help').textContent='CHOOSE AN OPEN STREET OR A BRIDGE';this.draw();}
 markCursor(){const box=this.canvas.getBoundingClientRect();this.mark(atlasPoint(this.canvas,this.getSim().layout,{clientX:box.left+this.cursor.x*box.width,clientY:box.top+this.cursor.y*box.height},this.view));}
 poll(pad,dt){
  const moving=Math.hypot(pad.aim.x,pad.aim.y)>.1;if(moving){this.canvas.focus();this.cursor=moveMapCursor(this.cursor,pad.aim,dt);}
  const active=document.activeElement===this.canvas;
  if(pad.pressed[1]||pad.pressed[8]||pad.pressed[17]){this.dialog.close();return true;}
  if(!active)return false;
  const sim=this.getSim(),b=sim.layout.bounds;this.view.x=Math.max(b.minX,Math.min(b.maxX,(this.view.x||0)+pad.move.x*dt*90/this.view.zoom));this.view.z=Math.max(b.minZ,Math.min(b.maxZ,(this.view.z||0)+pad.move.y*dt*90/this.view.zoom));
  if(pad.buttons[6]||pad.buttons[7])this.zoom(((pad.buttons[7]?1:0)-(pad.buttons[6]?1:0))*dt*1.5);
  if(pad.pressed[0])this.markCursor();if(pad.pressed[2])this.clear();if(pad.pressed[11])this.center();
  this.draw();document.getElementById('map-pad-help').innerHTML=`RS CURSOR · LS PAN · L2/R2 ZOOM · ${glyph(0,this.input.family)} MARK · ${glyph(2,this.input.family)} CLEAR · ${glyph(11,this.input.family)} CENTER · D-PAD OPTIONS`;
  if(pad.buttons.slice(12,16).some(Boolean))return false;
  return true;
 }
}
