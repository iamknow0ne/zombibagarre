// Presentation only: never consume simulation RNG or alter wounds/damage.
export function goreLevel(settings={}){
 if(settings.gore===false)return 0;
 const n=settings.goreLevel;return typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(10,Math.round(n))):4;
}
export function goreSettings(raw={}){const level=goreLevel(raw);return{goreLevel:level,gore:level>0};}
const profiles=Array.from({length:11},(_,level)=>{
 const scale=level<=4?level/4:1+(level-4)*.25;
 return Object.freeze({level,enabled:level>0,dismember:level>=4,spray:scale,stain:level===0?0:level<=4?.4+level*.15:1+(level-4)*.085,life:level===0?0:level<=4?30+level*37.5:180+(level-4)*12,decals:level===0?0:level<=4?30+level*30:150+(level-4)*12,droplets:level===0?0:level<=4?10+level*20:90+(level-4)*15,gibs:level<4?0:32+(level-4)*4,tissue:level<4?0:1+(level-4)*.15});
});
export function goreProfile(settings={}){return profiles[goreLevel(settings)];}
export function goreLabel(level){return level===0?'OFF':level<4?'LIGHT BLOOD':level===4?'CLASSIC':level<8?'HEAVY':'OVER THE TOP';}
