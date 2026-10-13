// Anchor labels use a conservative text envelope so placement needs no per-frame
// DOM measurements. Coordinates are screen pixels; hero is above the head.
export function placeAnchorLabel(anchor,hero,viewportWidth){
 const half=Math.min(140,Math.max(0,viewportWidth/2-12));
 const x=Math.max(half+12,Math.min(viewportWidth-half-12,anchor.x));
 let y=anchor.y;
 if(Math.abs(x-hero.x)<half+26&&y>hero.y-30&&y<hero.y+140)y=hero.y-30;
 return {x,y};
}
