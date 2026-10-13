// Each entry has an individual motor balance, recoil duration and trigger travel.
// strong / weak / milliseconds; trigger start / break point / force (1–8).
export const WEAPON_HAPTICS={
 carbine:{recoil:[.24,.52,58],trigger:[2,5,3],frequency:6,automatic:true},
 smg:{recoil:[.09,.42,25],trigger:[1,4,2],frequency:13,automatic:true},
 shotgun:{recoil:[.88,.48,170],trigger:[3,7,6],frequency:9},
 revolver:{recoil:[.58,.72,105],trigger:[3,6,5],frequency:18},
 marksman:{recoil:[.76,.32,145],trigger:[4,7,5],frequency:12},
 launcher:{recoil:[1,.55,230],trigger:[4,8,7],frequency:7},
 flame:{recoil:[.13,.24,85],trigger:[2,0,2],frequency:32,continuous:true},
 arc:{recoil:[.16,.9,115],trigger:[3,0,3],frequency:60},
 katana:{recoil:[.28,.7,85],trigger:[2,5,3],frequency:24,melee:true},
 dual:{recoil:[.16,.56,52],trigger:[1,4,2],frequency:36,melee:true},
 axe:{recoil:[.73,.38,155],trigger:[3,7,6],frequency:11,melee:true},
 spear:{recoil:[.2,.8,65],trigger:[2,6,4],frequency:29,melee:true},
 hammer:{recoil:[.98,.26,220],trigger:[4,8,7],frequency:6,melee:true}
};
export function weaponPulse(e){
 const p=WEAPON_HAPTICS[e.weapon];if(!p||!['shoot','swing','slice'].includes(e.type))return null;
 let [strong,weak,duration]=p.recoil;
 if(p.melee){
  const hit=e.type==='slice'&&e.hits>0;
  const weight=e.type==='swing'?.2:hit?(e.combo===2?1.3:1):.12;
  strong*=weight;weak*=weight;duration*=e.type==='swing'?.45:hit?(e.combo===2?1.2:1):.35;
  // Alternating paired blades have a different motor balance, not random noise.
  if(e.weapon==='dual'&&(e.combo||0)%2){const old=strong;strong=weak*.7;weak=old;}
 }else if(p.automatic&&e.interval>0)duration=Math.min(duration,e.interval*1000*.55);
 const evolution=1+Math.min(3,Math.max(0,e.tier||0))*.04;
 return {strongMagnitude:Math.min(1,strong*evolution),weakMagnitude:Math.min(1,weak*evolution),duration:Math.max(10,Math.round(duration)),startDelay:0};
}
