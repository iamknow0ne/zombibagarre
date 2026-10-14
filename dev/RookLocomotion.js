// Travel-space foot planning for the development Rook viewer. This is flat-
// ground locomotion only; terrain, jumping and production movement are separate.
const STEP=1/120,STANCE=.6,TAU=.18;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function createRookLocomotion(){
 let command={x:0,z:1,speed:.8},position={x:0,z:0},velocity={x:0,z:0},phase=.1,elapsed=0,remainder=0,feet,travel=0;
 function reset(){position={x:0,z:0};velocity={x:0,z:0};phase=.1;elapsed=remainder=travel=0;feet={L:{x:.175,z:.0197,anchorX:.175,anchorZ:.0197,swing:false,phase:.1,lift:0,pitch:0},R:{x:-.175,z:.0197,anchorX:-.175,anchorZ:.0197,swing:false,phase:.6,lift:0,pitch:0}};return frame();}
 function set(input){
  if(!input||![input.x,input.z,input.speed].every(Number.isFinite)||input.speed<0||input.speed>3)throw new TypeError('Locomotion needs finite x/z and speed from 0 to 3m/s.');
  const length=Math.hypot(input.x,input.z);command={x:length>1e-8?input.x/length:0,z:length>1e-8?input.z/length:0,speed:length>1e-8?input.speed:0};return {...command};
 }
 function step(){
  const tx=command.x*command.speed,tz=command.z*command.speed,decay=Math.exp(-STEP/TAU),before={...velocity};
  position.x+=tx*STEP+(velocity.x-tx)*TAU*(1-decay);position.z+=tz*STEP+(velocity.z-tz)*TAU*(1-decay);
  velocity.x=tx+(velocity.x-tx)*decay;velocity.z=tz+(velocity.z-tz)*decay;
  const speed=Math.hypot(velocity.x,velocity.z),distance=Math.hypot((before.x+velocity.x)*.5*STEP,(before.z+velocity.z)*.5*STEP);travel+=distance;
  // Anticipate the requested cadence on acceleration: otherwise a fast lateral
  // start drags the first support foot beyond reach before its initial toe-off.
  const moving=speed>.025||command.speed>.025,cadence=.9+Math.max(speed,command.speed)*.65,previous=phase;
  if(moving||feet.L.swing||feet.R.swing)phase=(phase+cadence*STEP)%1;
  for(const [side,f]of Object.entries(feet)){
   const offset=side==='L'?0:.5,u=(phase+offset)%1,old=(previous+offset)%1,baseX=side==='L'?.175:-.175;
   if(!f.swing&&moving&&u>=STANCE&&(old<STANCE||f.phase===.6)){
    f.swing=true;f.startX=f.x;f.startZ=f.z;f.flight=0;
   }
   if(f.swing){
    const flight=Math.max(0,Math.min(1,(u-STANCE)/(1-STANCE)));
    if(u<STANCE&&old>=STANCE){f.swing=false;f.x=f.goalX??f.x;f.z=f.goalZ??f.z;f.anchorX=f.x;f.anchorZ=f.z;f.lift=0;}
    else{
     const remaining=(1-flight)*(1-STANCE)/cadence,ahead=STANCE/cadence*.48;
     // Predict the next support point. Recompute against velocity as the player
     // steers/stops rather than forcing a stale, unreachable forward stride.
     f.goalX=position.x+baseX+velocity.x*(remaining+ahead);f.goalZ=position.z+.0197+velocity.z*(remaining+ahead);
     const w=smooth(flight);f.x=f.startX+(f.goalX-f.startX)*w;f.z=f.startZ+(f.goalZ-f.startZ)*w;
     f.lift=(.055+Math.min(speed,2)*.022)*Math.sin(Math.PI*flight)**2;f.flight=flight;
    }
   }
   if(!f.swing){f.x=f.anchorX;f.z=f.anchorZ;f.lift=0;}
   f.phase=u;const forward=Math.abs(velocity.z)/(speed||1);
   f.pitch=(!moving&&!f.swing)?0:(f.swing?(.22+(-.14-.22)*smooth(f.flight)):(u<.12?-.14*(1-smooth(u/.12)):.22*smooth((u-.4)/.2)))*forward*Math.min(1,speed/.15);
  }
  elapsed+=STEP;
 }
 function update(dt){if(!Number.isFinite(dt)||dt<0)throw new TypeError('Locomotion delta must be finite and nonnegative.');remainder+=dt;while(remainder+1e-10>=STEP){step();remainder=Math.max(0,remainder-STEP);}return frame();}
 function frame(){const speed=Math.hypot(velocity.x,velocity.z);return{time:elapsed,phase,speed,command:{...command},velocity:{...velocity},position:{...position},distance:travel,feet:Object.fromEntries(Object.entries(feet).map(([side,f])=>[side,{x:f.x-position.x,z:f.z-position.z,anchorX:f.anchorX,anchorZ:f.anchorZ,phase:f.phase,planted:!f.swing,clearance:f.lift,pitch:f.pitch}])),scope:'Flat ground; fixed120Hz planning; seek replays the current input from rest.'};}
 function seek(time){if(!Number.isFinite(time)||time<0)throw new TypeError('Locomotion seek must be finite and nonnegative.');reset();return update(time);}
 reset();return{set,reset,update,seek,frame};
}
