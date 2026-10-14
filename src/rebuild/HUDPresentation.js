let mode='',markup=new WeakMap();
export function usesTouchLayout(input,{coarse=matchMedia('(pointer:coarse)').matches,width=innerWidth}={}){
 return input.source!=='gamepad'&&(coarse||width<=700||input.source==='touch');
}
export function updateInputLayout(input,world){
 const touch=usesTouchLayout(input),next=touch?'touch':input.source==='gamepad'?'gamepad':'keyboard';
 if(mode!==next){mode=next;markup=new WeakMap();}
 document.body.classList.toggle('touch-layout',touch);world.touchView=touch;world.feedback.mobile=touch;world.feedback.reserved=[];
 return touch;
}
// The active presenter owns each control. Invalidate on source changes because
// touch icons and controller prompts share these nodes but use different markup.
export function writeHUD(el,html){
 if(markup.get(el)===html)return;
 el.classList.remove('icon-action');delete el.dataset.iconContent;
 el.innerHTML=html;markup.set(el,html);
}
