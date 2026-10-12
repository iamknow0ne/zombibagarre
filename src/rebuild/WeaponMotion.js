// Shared timing keeps the visible contact, damage, sound and haptics on one clock.
const clamp01=n=>Math.max(0,Math.min(1,n));
export const smooth=n=>{n=clamp01(n);return n*n*(3-2*n);};
export const WEAPON_MOTION={
 carbine:{kick:.085,lift:.09,settle:.17,weight:.5,length:.82,support:.23},
 shotgun:{kick:.17,lift:.22,settle:.4,weight:.9,length:1.02,support:.26},
 smg:{kick:.045,lift:.065,settle:.11,weight:.3,length:.62,support:.15},
 revolver:{kick:.12,lift:.34,settle:.31,weight:.25,length:.58,support:.02},
 marksman:{kick:.14,lift:.18,settle:.48,weight:1,length:1.26,support:.26},
 flame:{kick:.016,lift:.016,settle:.12,weight:1,length:.91,support:.23},
 launcher:{kick:.2,lift:.2,settle:.58,weight:1,length:.92,support:.23},
 arc:{kick:.055,lift:.07,settle:.3,weight:.7,length:.77,support:.2},
};
export function recoilAt(key,age){
 const p=WEAPON_MOTION[key]||WEAPON_MOTION.carbine;
 if(age<0||age>p.settle)return 0;
 const f=age/p.settle;
 return f<.12?smooth(f/.12):Math.pow(1-smooth((f-.12)/.88),2);
}
export function meleeTiming(key,combo=0,multiplier=1){
 const fast=key==='dual',finisher=combo===2;
 const duration=(fast?(finisher?.43:.32):(finisher?.72:.6))*Math.max(.45,multiplier);
 return {duration,contact:duration*(fast?.29:.34),cutEnd:duration*.57};
}
// Smooth key poses: guard -> anticipation -> contact -> follow through -> guard.
// No full-body spin or instantaneous reset at the end of a combo.
export function meleePose(key,combo,progress,variant=0){
 const f=clamp01(progress),side=combo===1?-1:1,finisher=combo===2;
 const keys=[
  [0,0,0,0], [.2,-side*.58,finisher?.32:.12,-.08],
  [.34,side*.12,finisher?-.15:-.02,.08], [.57,side*.7,finisher?-.35:-.12,.12], [1,0,0,0],
 ];
 let a=keys[0],b=keys[1];for(let i=1;i<keys.length;i++){if(f<=keys[i][0]){a=keys[i-1];b=keys[i];break;}}
 const u=smooth((f-a[0])/(b[0]-a[0])),lerp=i=>a[i]+(b[i]-a[i])*u;
 const arc=[1,.86,1.12,.92][variant%4],height=[0,.12,-.09,.2][variant%4]*Math.sin(f*Math.PI)**2;
 return {twist:lerp(1)*arc,height:lerp(2)+height,reach:lerp(3)*(variant===3?1.1:1),side,finisher,active:f>=.2&&f<=.62};
}
export function reloadPose(progress){
 const f=clamp01(progress);
 return {lower:smooth(f/.16)*(1-smooth((f-.82)/.18)),reach:smooth((f-.12)/.15)*(1-smooth((f-.58)/.22)),magazine:smooth((f-.18)/.16)*(1-smooth((f-.52)/.16)),rack:Math.sin(Math.PI*clamp01((f-.72)/.16))};
}

// Four weighted follow-throughs per weapon: centred, inward, outward and braced.
// Variation is indexed by the shot, so no per-frame jitter or gameplay RNG changes.
export function shotPose(key,age,variant=0){
 const p=WEAPON_MOTION[key]||WEAPON_MOTION.carbine,r=recoilAt(key,age),v=variant%4,sign=[0,1,-1,.35][v],weight=p.weight;
 return{yaw:sign*r*p.lift*.18,roll:sign*r*p.lift*.3,pitch:r*p.lift*[0,-.09,.12,-.18][v],rise:r*p.kick*[0,.08,-.05,.12][v]/(1+weight)};
}
export function weaponReloadPose(key,progress){
 const r=reloadPose(progress),f=clamp01(progress),pulse=Math.sin(Math.PI*f)**2;
 const out={...r,side:0,tilt:0,spin:0};
 if(key==='shotgun'){out.magazine=r.magazine*.3;out.side=-pulse*.08;out.tilt=pulse*.8;}
 if(key==='revolver'){out.magazine=0;out.side=-r.lower*.12;out.spin=smooth((f-.2)/.5)*Math.PI*2;}
 if(key==='marksman'){out.rack=Math.sin(Math.PI*clamp01((f-.62)/.3));out.tilt=-r.magazine*.2;}
 if(key==='smg'){out.tilt=r.magazine*.3;out.lower*=.8;}
 if(key==='flame'){out.spin=pulse*.8;out.magazine*=.6;out.side=r.magazine*.07;}
 if(key==='launcher'){out.tilt=r.magazine*.65;out.spin=pulse*Math.PI/3;out.magazine*=.65;}
 if(key==='arc'){out.magazine*=.7;out.spin=pulse*.4;out.rack*=.6;}
 return out;
}
