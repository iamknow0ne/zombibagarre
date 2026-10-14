import {retroRoomPlaces} from './RetroPlaces.js';
import {travelGate} from './Regions.js';
import {waterOutline} from './City.js';
import {questGuide} from './QuestNavigation.js';
export function serviceRoofPlaces(sim){return (sim.layout.traversal?.roofs||[]).filter(r=>sim.props.some(p=>p.id===r.buildingId&&p.health>0)).map(r=>({...r.approach,id:r.id,name:'MAINTENANCE ROOF',kind:'travel'}));}
export function atlasTransform(canvas,layout,view={},large=true,player={x:0,z:0}){
 const b=layout.bounds,extent=large?Math.max(b.maxX-b.minX,b.maxZ-b.minZ)+12:82,cx=large?(view.x??(b.minX+b.maxX)/2):player.x,cz=large?(view.z??(b.minZ+b.maxZ)/2):player.z,scale=canvas.width/extent*(large?(view.zoom||1):1);
 return {scale,cx,cz,X:x=>(x-cx)*scale+canvas.width/2,Z:z=>(z-cz)*scale+canvas.height/2};
}
export function mapSymbol(ctx,x,y,kind,color,size=10){
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#142125';ctx.strokeStyle=color;ctx.lineWidth=2;
 ctx.beginPath();if(kind==='quest'){ctx.moveTo(0,-size);ctx.lineTo(size,0);ctx.lineTo(0,size);ctx.lineTo(-size,0);ctx.closePath();}else if(kind==='shop'){ctx.rect(-size,-size,size*2,size*2);}else ctx.arc(0,0,size,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle=color;ctx.font=`bold ${size+3}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(kind==='quest'?'!':kind==='shop'?'+':kind==='secret'?'×':kind==='cache'?'□':kind==='travel'?'↗':'·',0,.5);ctx.restore();
}
export function drawAtlas(canvas,sim,large=false,view={}){
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,ui=large?W/(canvas.getBoundingClientRect?.().width||W):1,p=sim.player,{X,Z,scale}=atlasTransform(canvas,sim.layout,view,large,p),guide=questGuide(sim),target=guide?.target;
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#15282e';ctx.fillRect(0,0,W,H);ctx.save();
 const boundary=()=>{ctx.beginPath();sim.layout.boundary.forEach((a,i)=>i?ctx.lineTo(X(a.x),Z(a.z)):ctx.moveTo(X(a.x),Z(a.z)));ctx.closePath();};boundary();ctx.fillStyle='#3c514b';ctx.fill();ctx.strokeStyle='#73887c';ctx.lineWidth=2;ctx.stroke();ctx.clip();
 if(large){ctx.strokeStyle='#b4c6ab0c';ctx.lineWidth=1;const gap=25*scale;for(let x=(X(0)%gap);x<W;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=(Z(0)%gap);y<H;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}}
 for(const parcel of sim.layout.parcels||[])if(parcel.park){ctx.fillStyle='#60725a';ctx.fillRect(X(parcel.x-parcel.w/2),Z(parcel.z-parcel.d/2),parcel.w*scale,parcel.d*scale);}
 ctx.lineCap='round';ctx.lineJoin='round';
 // Paint all verges before asphalt so adjoining rounded segments form a single
 // road, without pale end-caps crossing the next segment at every bend.
 for(const verge of [true,false])for(const r of sim.layout.roads||[]){ctx.strokeStyle=verge?'#829084':'#263b40';ctx.lineWidth=(r.width+(verge?1.5:0))*scale;ctx.beginPath();ctx.moveTo(X(r.a.x),Z(r.a.z));ctx.lineTo(X(r.b.x),Z(r.b.z));ctx.stroke();}
 if(large&&(view.zoom||1)>1.4){ctx.strokeStyle='#8f998c70';ctx.lineWidth=1;ctx.setLineDash([5,8]);for(const r of sim.layout.roads||[]){ctx.beginPath();ctx.moveTo(X(r.a.x),Z(r.a.z));ctx.lineTo(X(r.b.x),Z(r.b.z));ctx.stroke();}ctx.setLineDash([]);}

 for(const w of sim.layout.water||[]){ctx.fillStyle='#396d7c';ctx.strokeStyle='#83a6a7';ctx.lineWidth=1;ctx.beginPath();waterOutline(w).forEach((a,i)=>i?ctx.lineTo(X(a.x),Z(a.z)):ctx.moveTo(X(a.x),Z(a.z)));ctx.closePath();ctx.fill();ctx.stroke();}for(const v of sim.layout.bridges||[]){ctx.fillStyle='#b9b292';ctx.fillRect(X(v.x-v.w/2),Z(v.z-v.d/2),v.w*scale,v.d*scale);}
 for(const o of sim.props){if(o.health<=0)continue;const x=X(o.x-o.w/2),z=Z(o.z-o.d/2),w=Math.max(1,o.w*scale),d=Math.max(1,o.d*scale);if(x+w<0||z+d<0||x>W||z>H)continue;if(o.kind==='building'){ctx.fillStyle='#10272e80';ctx.fillRect(x+2,z+3,w,d);ctx.fillStyle='#9d9d82';ctx.fillRect(x,z,w,d);ctx.strokeStyle='#c7c4a160';ctx.lineWidth=.8;ctx.strokeRect(x,z,w,d);}else if(o.driveable&&view.vehicles!==false){ctx.fillStyle='#9dcbb0';ctx.fillRect(x,z,Math.max(3,w),Math.max(3,d));}else if(!o.driveable&&large&&(view.zoom||1)>1.6){ctx.fillStyle=o.kind==='planter'?'#819c72':'#748173';ctx.fillRect(x,z,w,d);}}
 const route=sim.questRoute,waypoint=p.waypoint;
 if(waypoint&&route?.points.length>1){ctx.beginPath();route.points.forEach((a,i)=>i?ctx.lineTo(X(a.x),Z(a.z)):ctx.moveTo(X(a.x),Z(a.z)));ctx.strokeStyle='#142125';ctx.lineWidth=large?6:4;ctx.stroke();ctx.strokeStyle=waypoint.source==='quest'?'#edbd73':'#8fcbd0';ctx.lineWidth=large?3:2;ctx.stroke();}
 // Bearing only when no pedestrian route exists; never draw a false route through buildings.
 if(waypoint&&!route?.points.length){ctx.strokeStyle='#c3b79b';ctx.lineWidth=1;ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(X(p.x),Z(p.z));ctx.lineTo(X(waypoint.x),Z(waypoint.z));ctx.stroke();ctx.setLineDash([]);}
 for(const e of view.enemies===false?[]:sim.enemies){if(e.health<=0||!large&&Math.hypot(e.x-p.x,e.z-p.z)>38)continue;ctx.fillStyle=e.type==='boss'?'#ffa972':'#ee8c76';ctx.beginPath();ctx.arc(X(e.x),Z(e.z),e.type==='boss'?5:2,0,Math.PI*2);ctx.fill();}
 ctx.restore();
 const boxes=[],label=(text,x,y,color,size=12,priority=false)=>{size*=ui;ctx.font=`600 ${size}px sans-serif`;const w=ctx.measureText(text).width+12,h=size+10,box={x:x-w/2,y:y-h/2,w,h};if(box.x<5||box.y<30||box.x+w>W-5||box.y+h>H-30)return;if(!priority&&boxes.some(b=>box.x<b.x+b.w+4&&box.x+w+4>b.x&&box.y<b.y+b.h+3&&box.y+h+3>b.y))return;boxes.push(box);ctx.fillStyle='#142125eb';ctx.fillRect(box.x,box.y,w,h);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y);};
 const inView=q=>X(q.x)>10&&X(q.x)<W-10&&Z(q.z)>10&&Z(q.z)<H-10;
 if(target&&inView(target)){mapSymbol(ctx,X(target.x),Z(target.z),'quest','#edbd73',large?10*ui:5);if(large)label(guide.state==='ready'?'RETURN / REWARD READY':'TRACKED OBJECTIVE',X(target.x),Z(target.z)-26*ui,'#f2ce8a',12,true);}
 if(view.landmarks!==false)for(const q of serviceRoofPlaces(sim)){if(inView(q)){mapSymbol(ctx,X(q.x),Z(q.z),'travel','#c4ba8e',large?7*ui:3);if(large)label(q.name,X(q.x),Z(q.z)+21*ui,'#d4cba6',11);}}
 for(const q of retroRoomPlaces(sim)){if(inView(q)){mapSymbol(ctx,X(q.x),Z(q.z),'cache','#b8cf9d',large?8*ui:4);if(large)label(q.name,X(q.x),Z(q.z)+23*ui,'#b8cf9d',11);}}
 const gate=travelGate(sim),supply=sim.layout.country&&!sim.rpg?.countrySupplies?sim.layout.region?.supply:null;for(const [q,name,kind]of [[gate,gate?.name,'travel'],[supply,'MEDICAL SUPPLIES','cache']]){if(q&&inView(q)){mapSymbol(ctx,X(q.x),Z(q.z),kind,'#9bd0bb',large?8*ui:4);if(large)label(name,X(q.x),Z(q.z)+23*ui,'#b8e2ce',11);}}
 for(const q of sim.places||[]){if(!q.revealed||q.used&&q.kind!=='shop'||!inView(q)||target===q)continue;const color=q.kind==='shop'?'#eee6cf':q.kind==='secret'?'#eaa882':'#d5c796';mapSymbol(ctx,X(q.x),Z(q.z),q.kind,color,large?7*ui:3);if(large)label(q.name.split(' / ')[0],X(q.x),Z(q.z)-20*ui,color);}
 for(const j of view.encounters===false?[]:sim.streetEvents||[]){if(!inView(j)||j===target)continue;const color=j.state==='complete'?'#90aa8e':'#dcb785';mapSymbol(ctx,X(j.x),Z(j.z),'encounter',color,large?5*ui:3);if(large&&(view.zoom||1)>1.2)label(j.name,X(j.x),Z(j.z)+19*ui,color,11);}
 if(large&&view.landmarks!==false)for(const place of sim.layout.landmarks||[]){if(!inView(place))continue;label(place.name,X(place.x),Z(place.z)+8,sim.visited.has(place.name)?'#c1d3b6':'#d5dbc9',11);}
 if(waypoint&&waypoint.source!=='quest'&&inView(waypoint))mapSymbol(ctx,X(waypoint.x),Z(waypoint.z),'manual','#8fcbd0',large?8*ui:4);
 if(!large&&(target||waypoint)){const t=waypoint||target,x=X(t.x),y=Z(t.z);if(x<9||x>W-9||y<9||y>H-9){const dx=x-W/2,dy=y-H/2,k=Math.min((W/2-10)/Math.abs(dx||.001),(H/2-10)/Math.abs(dy||.001));mapSymbol(ctx,W/2+dx*k,H/2+dy*k,'quest',waypoint?.source==='manual'?'#8fcbd0':'#edbd73',5);}}
 ctx.save();ctx.translate(X(p.x),Z(p.z));ctx.rotate(-p.angle);ctx.fillStyle='#fff5d6';ctx.strokeStyle='#142125';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,large?10:7);ctx.lineTo(-6,-6);ctx.lineTo(0,-3);ctx.lineTo(6,-6);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 ctx.fillStyle='#eee6cf';ctx.font='bold 12px sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText('N ↑',14,23);
 if(large){const meters=[10,25,50,100].find(n=>n*scale>=50)||100,w=meters*scale;ctx.fillStyle='#142125dd';ctx.fillRect(12,H-40,w+18,30);ctx.strokeStyle='#eee6cf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(20,H-22);ctx.lineTo(20+w,H-22);ctx.stroke();ctx.font='11px sans-serif';ctx.fillStyle='#eee6cf';ctx.fillText(`${meters} m`,20,H-28);}
}
export function atlasPoint(canvas,layout,event,view={}){const box=canvas.getBoundingClientRect(),b=layout.bounds,extent=Math.max(b.maxX-b.minX,b.maxZ-b.minZ)+12;return{x:((event.clientX-box.left)/box.width-.5)*extent/(view.zoom||1)+(view.x??(b.minX+b.maxX)/2),z:((event.clientY-box.top)/box.height-.5)*extent/(view.zoom||1)+(view.z??(b.minZ+b.maxZ)/2)};}
