// Additive poses over the shared, speed-driven gait. No frame counters or random
// sampling: paused inspection, low FPS and corpse transitions remain repeatable.
const styles={
 walker:{lean:.085,roll:.035,drag:.16,arm:-.34,elbow:-.26,head:.11,breath:1.45},
 runner:{lean:.24,roll:.025,drag:.035,arm:-.61,elbow:-.9,head:.03,breath:3.2},
 brute:{lean:.13,roll:.052,drag:.08,arm:-.12,elbow:-.28,head:.06,breath:1.1},
 armored:{lean:.045,roll:.018,drag:.055,arm:-.25,elbow:-.46,head:.025,breath:1.3},
 spitter:{lean:.19,roll:.026,drag:.11,arm:-.56,elbow:-.68,head:.13,breath:2.1},
 volatile:{lean:-.025,roll:.042,drag:.12,arm:-.42,elbow:-.5,head:.07,breath:2.7},
};
export function animateEnemyDetails(root,time,pose,state={}){
 const d=root.userData,s=styles[d.type]||styles.walker,variant=d.variant||0,phase=pose.phase||0,walk=pose.walk||0;
 const asym=variant%2?1:-1,breath=Math.sin(time*s.breath+variant*.7),sway=Math.sin(phase);
 d.body.rotation.x+=s.lean+breath*.008;
 d.body.rotation.z+=sway*walk*s.roll+Math.sin(time*.8+variant)*.012;
 d.body.rotation.y+=Math.sin(phase-.5)*walk*(d.type==='brute'?.07:.025);
 // Weight falls onto the planted foot; runner shoulders stay forward while
 // the brute and armoured gait carry the chest more steadily.
 d.body.position.y-=Math.max(0,Math.sin(phase*2)) *walk*(d.type==='brute'?.018:.006);
 if(d.head){
  d.head.rotation.x=-s.lean*.48+breath*.018;
  d.head.rotation.y=-d.body.rotation.y*.6+Math.sin(time*.55+variant)*.025;
  d.head.rotation.z=asym*s.head-Math.sin(phase-.45)*walk*s.roll*.6;
 }
 d.arms.forEach((arm,i)=>{
  const side=i?1:-1,cycle=phase+(i?Math.PI:0),swing=Math.sin(cycle);
  arm.rotation.x=s.arm+swing*walk*(d.type==='runner'?.44:d.type==='brute'?.19:.23)+side*asym*.045;
  arm.rotation.z=side*(d.type==='volatile'?.24:d.type==='brute'?.18:.09)+breath*.008;
  arm.userData.elbow.rotation.x=s.elbow+Math.max(0,swing)*walk*.16+side*asym*.035;
  arm.userData.wrist.rotation.x=.15+Math.sin(time*.95+i+variant)*.055;
  arm.userData.wrist.rotation.z=side*-.08;
 });
 // A restrained asymmetric drag gives civilian infected an uneven stride;
 // the faster runner stays coordinated instead of inheriting the same limp.
 const dragging=d.legs[variant%2];
 if(dragging){dragging.rotation.x*=1-s.drag;dragging.userData.knee.rotation.x+=walk*s.drag*.3;}
 if(d.type==='spitter'&&state.windup>0){
  const charge=Math.min(1,Math.max(0,state.windup));
  d.head.rotation.x-=charge*.28;d.body.rotation.x-=charge*.11;
 }
}
