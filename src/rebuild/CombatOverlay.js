import {Vector3} from 'three';
import {DamageFeed,damageStyle,damageText,damageSize} from './Combat.js';

export class CombatOverlay {
 constructor(game){
  this.canvas=document.createElement('canvas');this.canvas.className='combat-feedback';this.canvas.setAttribute('aria-hidden','true');
  Object.assign(this.canvas.style,{position:'fixed',inset:'0',pointerEvents:'none',width:'100%',height:'100%'});
  game.insertAdjacentElement('afterend',this.canvas);this.ctx=this.canvas.getContext('2d');this.feed=new DamageFeed();this.bars=new Map();this.point=new Vector3();this.settings={};
 }
 clear(){this.feed.clear();this.bars.clear();this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
 destroy(){this.canvas.remove();this.bars.clear();}
 event(hit){
  if(hit.type!=='damage')return;
  if(this.settings.damageNumbers!==false)this.feed.add(hit);
  if(this.settings.enemyHealthBars!==false){const old=this.bars.get(hit.enemyId);this.bars.set(hit.enemyId,{health:Math.max(0,hit.health),maxHealth:hit.maxHealth,trail:old?.trail??hit.health+hit.dealt,hitAt:this.feed.clock});}
 }
 applySettings(settings){this.settings=settings;if(settings.damageNumbers===false)this.feed.hits=[];if(settings.enemyHealthBars===false)this.bars.clear();}
 project(x,y,z,camera){const p=this.point.set(x,y,z).project(camera);return p.z>=-1&&p.z<=1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1?{x:(p.x*.5+.5)*this.w,y:(-.5*p.y+.5)*this.h}:null;}
 height(e){return e.crawling?1:(e.enemyType||e.type)==='boss'?4.5:(e.enemyType||e.type)==='brute'?3.25:(e.enemyType||e.type)==='runner'?2:2.5;}
 draw(sim,dt,camera){
  const c=this.ctx,w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2);
  if(this.w!==w||this.h!==h||this.dpr!==dpr){this.w=w;this.h=h;this.dpr=dpr;this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);}
  c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);this.feed.update(dt);
  if(sim.state==='menu')return;
  const ids=new Set(sim.enemies.filter(e=>e.health>0).map(e=>e.id));for(const id of this.bars.keys())if(!ids.has(id))this.bars.delete(id);
  // Shared screen-space occupancy keeps nearby labels apart, including on phones.
  const occupied=[...(this.reserved||[])];this.drawnNumbers=0;this.drawnBars=0;const overlaps=r=>occupied.some(o=>Math.abs(o.x-r.x)<(o.w+r.w)/2+3&&Math.abs(o.y-r.y)<(o.h+r.h)/2+3);
  const place=(p,width,height)=>{for(const [dx,dy]of [[0,0],[-28,-12],[28,-12],[0,-38],[-36,-40],[36,-40]]){const r={x:p.x+dx,y:p.y+dy,w:width,h:height};if(r.x-width/2<4||r.x+width/2>w-4||r.y-height/2<16||r.y+height/2>h-24||overlaps(r))continue;occupied.push(r);return r;}return null;};
  if(this.settings.enemyHealthBars!==false){let count=0;for(const e of [...sim.enemies].sort((a,b)=>Math.hypot(a.x-sim.player.x,a.z-sim.player.z)-Math.hypot(b.x-sim.player.x,b.z-sim.player.z))){
   if(e.health<=0||e.health>=e.maxHealth||count>=(this.mobile?10:32))continue;const state=this.bars.get(e.id);if(!state||this.feed.clock-state.hitAt>4)continue;
   const p=this.project(e.x,this.height(e),e.z,camera);if(!p||p.y<20||p.y>h-20)continue;count++;
   const width=(e.enemyType||e.type)==='boss'?88:(e.enemyType||e.type)==='brute'?47:34,height=(e.enemyType||e.type)==='boss'?6:4,y=p.y;
   if(overlaps({x:p.x,y:y+2,w:width,h:height+4}))continue;this.drawnBars++;
   if(this.feed.clock-state.hitAt>.22)state.trail+=(e.health-state.trail)*(1-Math.exp(-dt*6));
   c.fillStyle='#102024';c.fillRect(p.x-width/2-2,y-2,width+4,height+4);c.fillStyle='#d8c3a0';c.fillRect(p.x-width/2,y,width*Math.min(1,state.trail/e.maxHealth),height);c.fillStyle=(e.enemyType||e.type)==='boss'?'#ff9585':e.health/e.maxHealth<.25?'#ffab62':'#c2d9b6';c.fillRect(p.x-width/2,y,width*Math.max(0,e.health/e.maxHealth),height);
   occupied.push({x:p.x,y:y+2,w:width,h:height+4});
  }}
  if(this.settings.damageNumbers===false)return;
  for(const hit of [...this.feed.hits].sort((a,b)=>Number(b.critical)-Number(a.critical)||b.amount-a.amount)){
   if(this.mobile&&this.drawnNumbers>=10)break;
   const p=this.project(hit.x,this.height(hit)+.2,hit.z,camera);if(!p)continue;
   const age=this.feed.clock-hit.born,reduced=this.settings.reducedMotion,emphasis=hit.critical&&this.settings.criticalCallouts!==false;
   const size=damageSize(hit.amount,emphasis)*(w<520?.84:1),pulse=reduced?1:1+Math.max(0,1-(this.feed.clock-hit.pulse)/.16)*(emphasis?.22:.10);
   const text=damageText(hit.amount),style=damageStyle(hit),label=hit.execution?'EXECUTE':hit.finisher?(emphasis?'CRIT · CUT':'FINISHER'):hit.headshot?(emphasis?'CRIT · HEAD':'HEADSHOT'):emphasis?'CRIT ×2':hit.kind==='fire'?'BURN':hit.kind==='electric'?'SHOCK':hit.kind==='slice'?'SLICE':hit.kind==='explosion'?'BLAST':'';
   c.font=`${size}px Impact, 'Arial Narrow', sans-serif`;const width=Math.max(c.measureText(text).width* pulse,label.length*6)+12;
   p.x+=reduced?0:(hit.lane%2?1:-1)*(8+age*12);p.x=Math.max(width/2+4,Math.min(w-width/2-4,p.x));p.y-=22+(reduced?0:age*32)+hit.lane*5;
   const placed=place(p,width,size+18);if(!placed)continue;this.drawnNumbers++;
   c.save();c.globalAlpha=Math.min(1,(hit.life-age)/.25);c.translate(placed.x,placed.y);c.scale(pulse,pulse);c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#102024';c.fillStyle=this.settings.damageColors===false?'#f5edcf':style.color;
   c.strokeText(text,0,0);c.fillText(text,0,0);
   if(label){c.font="bold 9px 'SFMono-Regular', Consolas, monospace";c.lineWidth=3;c.fillStyle=emphasis?'#ffe096':this.settings.damageColors===false?'#f5edcf':style.color;c.strokeText(label,0,-size*.65-3);c.fillText(label,0,-size*.65-3);}
   if(emphasis){c.strokeStyle='#ffe096';c.lineWidth=1.5;c.beginPath();c.moveTo(-width/2,4);c.lineTo(-width/2,9);c.lineTo(-width/2+5,9);c.moveTo(width/2,-4);c.lineTo(width/2,-9);c.lineTo(width/2-5,-9);c.stroke();}
   c.restore();
  }
 }
}
