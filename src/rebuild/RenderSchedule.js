import {activeGameplay} from './GameplayContext.js';
import {frameLimit} from './DesktopProfile.js';
// A render cap limits drawing only; simulation and input polling remain independent.
// Static menus/paused runs draw less frequently, and hidden windows draw nothing.
export class RenderSchedule{
 constructor(){this.last=null;this.state=null;}
 next(now,state,hidden=false,dirty=false,limit=0){
  if(hidden){this.last=now;this.state=null;return null;}
  const interval=activeGameplay(state)?(frameLimit(limit)?1000/frameLimit(limit):0):state==='menu'?1000/30:100;
  if(this.last!==null&&state===this.state&&!dirty&&now-this.last<interval-.5)return null;
  const dt=this.last===null?0:Math.min(.1,Math.max(0,(now-this.last)/1000));this.last=now;this.state=state;return dt;
 }
}
