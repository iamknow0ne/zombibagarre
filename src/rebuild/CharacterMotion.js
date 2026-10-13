const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
// Visual inertia never delays input or moves the collision body.
export function stepCharacterMotion(cache,state,dt,{player=false,runner=false,brute=false}={}){
 if(dt<=0)return cache.pose||{phase:0,walk:0,forward:1,strafe:0,pitch:0,roll:0,land:0,footfall:false};
 let vx=0,vz=0;if(player){vx=state.moveX||0;vz=state.moveZ||0;}else if(cache.last){vx=(state.x-cache.last.x)/dt;vz=(state.z-cache.last.z)/dt;}cache.last={x:state.x||0,z:state.z||0};
 const speed=Math.hypot(vx,vz),angle=state.angle||0,forward=speed>.05?(vx*Math.sin(angle)+vz*Math.cos(angle))/speed:cache.pose?.forward??1,strafe=speed>.05?(vx*Math.cos(angle)-vz*Math.sin(angle))/speed:0;
 const dash=state.dash>0;cache.walk=damp(cache.walk||0,!dash?Math.min(1,speed/(player?3.5:runner?2.8:1.2)):0,14,dt);const old=cache.phase||0;cache.phase=old+(dash?0:Math.min(speed,runner?9:7))*dt*(brute?1.5:2.05);
 const accelX=(vx-(cache.vx||0))/dt,accelZ=(vz-(cache.vz||0))/dt;cache.vx=vx;cache.vz=vz;
 const pitchTarget=limit((accelX*Math.sin(angle)+accelZ*Math.cos(angle))*.006,-.13,.15)+(dash?.48:forward*cache.walk*.07),rollTarget=limit(-(accelX*Math.cos(angle)-accelZ*Math.sin(angle))*.004,-.12,.12)-strafe*cache.walk*.08;
 cache.pitch=damp(cache.pitch||0,pitchTarget,12,dt);cache.roll=damp(cache.roll||0,rollTarget,12,dt);cache.land=Math.max(0,(cache.land||0)-dt*3.5);if(cache.wasDash&&!dash)cache.land=.12;cache.wasDash=dash;
 cache.smoothForward=damp(cache.smoothForward??forward,forward,12,dt);cache.smoothStrafe=damp(cache.smoothStrafe??strafe,strafe,12,dt);
 const angleDelta=cache.angle===undefined?0:Math.atan2(Math.sin(angle-cache.angle),Math.cos(angle-cache.angle));cache.angle=angle;
 cache.turn=damp(cache.turn||0,limit(angleDelta/dt,-4,4)*.025,10,dt);cache.brace=damp(cache.brace||0,state.aiming?1:0,12,dt);
 return cache.pose={smoothForward:cache.smoothForward,smoothStrafe:cache.smoothStrafe,turn:cache.turn,brace:cache.brace,phase:cache.phase,walk:cache.walk,forward,strafe,pitch:cache.pitch,roll:cache.roll,land:cache.land,footfall:!dash&&speed>.5&&Math.floor(old/Math.PI)!==Math.floor(cache.phase/Math.PI),side:Math.floor(cache.phase/Math.PI)%2?1:-1,speed};
}
export function hitRecoil(age,amount=20){if(age<0||age>.24)return 0;const u=age/.24;return Math.sin(Math.PI*u)*Math.exp(-u*3)*Math.min(.22,.05+Math.sqrt(Math.max(0,amount))*.018);}
