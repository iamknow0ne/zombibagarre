// Gameplay renders on every animation frame. Static menus/paused runs need far
// fewer frames, and hidden tabs need none; input polling remains independent.
export class RenderSchedule{
 constructor(){this.last=null;this.state=null;}
 next(now,state,hidden=false,dirty=false){
  if(hidden){this.last=now;this.state=null;return null;}
  const interval=['playing','extracting'].includes(state)?0:state==='menu'?1000/30:100;
  if(this.last!==null&&state===this.state&&!dirty&&now-this.last<interval-.5)return null;
  const dt=this.last===null?0:Math.min(.1,Math.max(0,(now-this.last)/1000));this.last=now;this.state=state;return dt;
 }
}
