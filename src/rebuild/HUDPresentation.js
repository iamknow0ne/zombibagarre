let mode='',markup=new WeakMap();
// Viewport density and input ownership are independent: a phone with a pad
// still needs the small field HUD, but must retain controller hints.
export function usesCompactHUD({width=innerWidth,height=globalThis.innerHeight??720}={}){
 return width<=700||(width>height&&height<=600&&width<=1400);
}
export function usesTouchLayout(input,{coarse=matchMedia('(pointer:coarse)').matches,width=innerWidth}={}){
 return input.source!=='gamepad'&&(coarse||width<=700||input.source==='touch');
}
export function updateInputLayout(input,world){
 const touch=usesTouchLayout(input),compact=usesCompactHUD(),next=`${touch?'touch':input.source==='gamepad'?'gamepad':'keyboard'}:${compact}`;
 if(mode!==next){mode=next;markup=new WeakMap();}
 document.body.classList.toggle('touch-layout',touch);document.body.classList.toggle('compact-hud',compact);world.touchView=touch;world.feedback.mobile=touch||compact;world.feedback.reserved=[];
 return touch;
}
// The active presenter owns each control. Invalidate on source changes because
// touch icons and controller prompts share these nodes but use different markup.
export function writeHUD(el,html){
 if(markup.get(el)===html)return;
 el.classList.remove('icon-action');delete el.dataset.iconContent;
 el.innerHTML=html;markup.set(el,html);
}
