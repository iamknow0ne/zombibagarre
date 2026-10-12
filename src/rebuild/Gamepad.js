// Standard browser mapping: DualSense, DualShock 4 and Xbox-style pads.
export function deadZone(x=0,y=0,zone=.2){const length=Math.hypot(x,y);if(length<=zone)return {x:0,y:0};const strength=Math.min(1,(length-zone)/(1-zone));return{x:x/length*strength,y:y/length*strength};}
export function sampleGamepad(pad,previous=[]){
 if(!pad||pad.connected===false||pad.mapping!=='standard')return null;
 const buttons=Array.from({length:17},(_,i)=>!!pad.buttons[i]?.pressed||Number(pad.buttons[i]?.value)>.35);
 return {id:pad.id,index:pad.index,buttons,pressed:buttons.map((b,i)=>b&&!previous[i]),move:deadZone(pad.axes[0],pad.axes[1]),aim:deadZone(pad.axes[2],pad.axes[3],.18),fire:buttons[7],brake:buttons[6]};
}
export function worldStick(stick){return{x:stick.x*.776+stick.y*.63,z:-stick.x*.63+stick.y*.776};}
