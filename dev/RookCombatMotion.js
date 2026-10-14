// Authored, development-only combat plans in Rook model space: metres, Y up,
// +Z forward, anatomical left +X. A viewer must solve these wrist/foot targets
// against the real skeleton; this is neither collision handling nor production
// damage timing. Samples are immutable-by-convention fresh values, not a mixer.
export const ROOK_COMBO_SEQUENCE=Object.freeze([{id:'slash',duration:1.15},{id:'reverse',duration:1.1},{id:'thrust',duration:1.25}].map(Object.freeze));
export const ROOK_COMBAT_MODES=Object.freeze([
 Object.freeze({id:'slash',label:'Diagonal blade study',duration:1.15,once:true,combat:true}),
 Object.freeze({id:'reverse',label:'Rising reverse cut',duration:1.1,once:true,combat:true}),
 Object.freeze({id:'thrust',label:'Finishing thrust',duration:1.25,once:true,combat:true}),
 Object.freeze({id:'combo',label:'Three-strike blade combo',duration:3.5,once:true,combat:true,sequence:ROOK_COMBO_SEQUENCE}),
 Object.freeze({id:'dodge',label:'Lateral dodge study',duration:1.1,once:true,combat:true}),
]);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const v=(x=0,y=0,z=0)=>({x,y,z});
const blend=(a,b,t)=>a+(b-a)*t;
function key(t,keys){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1];return blend(a[1],b[1],ramp(t,a[0],b[0]));}
const guard=()=>({L:v(.14,1.30,.32),R:v(-.14,1.23,.32)});
const foot=(x,z)=>({x,z,clearance:0,pitch:0,planted:true});
const pulse=(t,a,b,c)=>ramp(t,a,b)*(1-ramp(t,b,c));

export function sampleRookCombat(mode,time=0,{contact=false,direction=1}={}){
 const spec=ROOK_COMBAT_MODES.find(s=>s.id===mode);
 if(!spec)throw new RangeError(`Unknown Rook combat study ${mode}.`);
 if(!Number.isFinite(time))throw new TypeError('Combat sample time must be finite.');
 if(typeof contact!=='boolean'||![1,-1].includes(direction))throw new TypeError('Combat contact must be boolean and dodge direction must be +1 or -1.');
 if(mode==='combo'){const timeInSequence=clamp(time,0,spec.duration);let local=timeInSequence,index=0;while(index<ROOK_COMBO_SEQUENCE.length-1&&local>=ROOK_COMBO_SEQUENCE[index].duration){local-=ROOK_COMBO_SEQUENCE[index++].duration;}const frame=sampleRookCombat(ROOK_COMBO_SEQUENCE[index].id,local,{contact,direction});return{...frame,mode,time:timeInSequence,duration:spec.duration,complete:timeInSequence>=spec.duration,comboIndex:index+1,comboCount:3};}
 const t=clamp(time,0,spec.duration),hands=guard(),feet={L:foot(.23,.1397),R:foot(-.23,-.0903)};
 const frame={mode,attackId:mode,comboIndex:1,comboCount:1,time:t,duration:spec.duration,complete:t>=spec.duration,phase:'anticipation',rootOffset:v(0,-.055,0),travel:v(),torso:{yaw:.18,pitch:.06,roll:0},head:{yaw:mode==='dodge'?-.18:-.144,pitch:0,roll:0},hands,feet,grip:.9,weapon:{key:'katana',visible:mode!=='dodge',yaw:0,pitch:-.65,roll:0,scale:.62},contact:{active:false,weight:0,recoil:0},scope:'Development study only: flat-ground targets; no gameplay collision, invulnerability or damage.'};
 if(mode==='slash'){
  const wind=ramp(t,0,.28),cut=ramp(t,.28,.49),recover=ramp(t,.64,1.15),hold=1-recover;
  frame.phase=t<.28?'anticipation':t<.49?'strike':t<.64?'follow-through':t<1.15?'recovery':'settled';
  // The hand crosses in front of the chest, never sweeping through its centre.
  hands.R.x=key(t,[[0,-.14],[.28,-.31],[.49,.22],[.64,.24],[1.15,-.14]]);
  hands.R.y=key(t,[[0,1.23],[.28,1.44],[.49,1.14],[.64,1.10],[1.15,1.23]]);
  hands.R.z=key(t,[[0,.32],[.28,.21],[.49,.39],[.64,.34],[1.15,.32]]);
  hands.L.x=key(t,[[0,.14],[.28,.23],[.49,.23],[.64,.22],[1.15,.14]]);
  hands.L.y=key(t,[[0,1.30],[.28,1.38],[.49,1.42],[.64,1.40],[1.15,1.30]]);
  hands.L.z=key(t,[[0,.32],[.28,.22],[.49,.20],[.64,.22],[1.15,.32]]);
  frame.torso.yaw=.18+(-.28*wind+.56*cut)*hold;frame.head.yaw=-frame.torso.yaw*.8;
  frame.rootOffset.y-=.025*wind*(1-cut)+.016*cut*hold;frame.rootOffset.z=.035*cut*hold;
  frame.torso.pitch+=.055*cut*hold;
  frame.weapon.yaw=(-.72*wind+1.75*cut)*hold;
  frame.weapon.pitch=-.65+(-.25*wind+.98*cut)*hold;
  frame.weapon.roll=(-.2*wind+.32*cut)*hold;
  // Contact is a finite decaying reaction after the crossing, not a change to
  // the attack's phase clock. Separate hits must be requested by the caller.
  const recoil=contact?pulse(t,.415,.45,.64):0;
  hands.R.z-=.028*recoil;hands.R.x-=.012*recoil;
  frame.weapon.yaw-=.065*recoil;frame.torso.yaw-=.025*recoil;
  frame.contact={active:contact&&recoil>0,weight:recoil,recoil:.028*recoil};
 }else if(mode==='reverse'||mode==='thrust'){
  const thrust=mode==='thrust',windEnd=thrust?.36:.25,hitEnd=thrust?.55:.46,followEnd=thrust?.74:.60,end=spec.duration;
  const wind=ramp(t,0,windEnd),strike=ramp(t,windEnd,hitEnd),recover=ramp(t,followEnd,end),hold=1-recover;
  frame.phase=t<windEnd?'anticipation':t<hitEnd?'strike':t<followEnd?'follow-through':t<end?'recovery':'settled';
  const handKeys=thrust?[
   [-.14,-.24,-.08,-.08,-.14],[1.23,1.28,1.28,1.27,1.23],[.32,.18,.50,.47,.32],
  ]:[[-.14,.22,-.28,-.30,-.14],[1.23,1.10,1.39,1.41,1.23],[.32,.35,.31,.24,.32]];
  for(const [index,axis]of ['x','y','z'].entries())hands.R[axis]=key(t,[0,windEnd,hitEnd,followEnd,end].map((at,i)=>[at,handKeys[index][i]]));
  // The free hand protects its own collar; it never chases the blade across
  // the chest or reaches into the striking forearm's path.
  hands.L.x=.14+.09*wind*hold;hands.L.y=1.30+.12*wind*hold;hands.L.z=.32-.11*wind*hold;
  frame.rootOffset.y-=(thrust?.035:.02)*wind*hold;frame.rootOffset.z=(thrust?.06:.025)*strike*hold;
  frame.torso.yaw=.18+(thrust?(-.1*wind+.04*strike):(.25*wind-.50*strike))*hold;frame.head.yaw=-frame.torso.yaw*.8;
  frame.torso.pitch+=(thrust?.08:.025)*strike*hold;
  frame.weapon.yaw=(thrust?(-.08*wind+.08*strike):(.95*wind-1.8*strike))*hold;
  frame.weapon.pitch=-.65+(thrust?.63*wind:(.70*wind-.90*strike))*hold;
  frame.weapon.roll=(thrust?.10*wind:(.18*wind-.35*strike))*hold;
  const recoil=contact?pulse(t,hitEnd-.075,hitEnd-.025,followEnd):0;
  hands.R.z-=.028*recoil;frame.weapon.pitch-=.055*recoil;frame.rootOffset.z-=.008*recoil;
  frame.contact={active:contact&&recoil>0,weight:recoil,recoil:.028*recoil};
 }else{
  const launch=ramp(t,.16,.60),settle=ramp(t,.62,1.1),compression=pulse(t,0,.18,.95),d=direction;
  frame.phase=t<.16?'anticipation':t<.60?'evade':t<1.1?'recovery':'settled';
  frame.travel.x=d*.52*launch;frame.rootOffset.y-=.14*compression;frame.rootOffset.x=d*.025*compression;
  frame.torso.roll=-d*.14*compression;frame.torso.pitch+=.12*compression;frame.head.roll=d*.07*compression;
  for(const side of ['L','R']){
   const lead=(side==='L')===(d===1),a=lead?.16:.30,b=lead?.55:.78,u=clamp((t-a)/(b-a)),step=ramp(t,a,b),lift=.075*Math.sin(Math.PI*u)**2;
   feet[side].x+=d*.52*step-frame.travel.x;feet[side].clearance=lift;feet[side].planted=t<=a||t>=b;
   hands[side].y-=.10*compression;hands[side].z-=.035*compression;
  }
  // Return the body to a balanced stance over the translated floor contacts.
  frame.rootOffset.x*=1-settle;
 }
 return frame;
}
