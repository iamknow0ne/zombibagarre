// A minimized/occluded window may never deliver animation frames. Loading is
// allowed to yield for painting, but painting must not gate initialization.
export function loadingFrame({request = requestAnimationFrame, cancel = cancelAnimationFrame,
 schedule = setTimeout, unschedule = clearTimeout, delay = 150} = {}) {
 return new Promise(resolve => {
  let frame, timer, done = false;
  const finish = () => { if(done)return;done=true;cancel(frame);unschedule(timer);resolve(); };
  timer=schedule(finish,delay);
  frame=request(()=>{frame=request(finish);});
 });
}
