// Simulation actions are edges, unlike movement, aim, held fire and driving.
// Keep one shared list for catch-up suppression and high-refresh carryover.
const ONE_SHOT_ACTIONS=['bulletTime','dash','melee','grenade','reload','interact','weapon','jump','grapple'];
export const SIMULATION_STEP=1/60;
export function advanceFixedStep(sim,accumulator,frame,pending){
 let first=true,held;
 while(accumulator>=SIMULATION_STEP){
  if(!first&&!held){held={...frame};for(const key of ONE_SHOT_ACTIONS)held[key]=key==='weapon'?null:false;}
  sim.update(SIMULATION_STEP,first?frame:held);first=false;accumulator-=SIMULATION_STEP;
 }
 // Input.consume clears its edge queue every rendered frame. A fast display can
 // render without a physics tick; preserve those actions until physics uses them.
 if(first)for(const key of ONE_SHOT_ACTIONS)if(frame[key])pending[key]=frame[key];
 return accumulator;
}
