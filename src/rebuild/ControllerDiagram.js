import {ACTION_NAMES,BINDINGS,buttonName,glyph} from './ControllerConfig.js';

export const DIAGRAM_CONTEXTS={combat:'On foot',driving:'Driving',menus:'Menus',map:'Map'};
// Fixed UI/vehicle inputs intentionally do not inherit remapped combat buttons.
export function diagramActions(settings,context='combat'){
 const b={...BINDINGS,...settings.bindings},stick=(id,label)=>({id,label}),button=(id,label)=>({id:String(id),label});
 if(context==='driving')return [stick('move',settings.drivingStyle==='racing'?'Steer':'Point to drive · release to stop'),...(settings.drivingStyle==='racing'?[button(7,'Accelerate'),button(6,'Brake / reverse')]:[button(6,'Hold to reverse')]),button(1,'Handbrake'),button(b.interact,'Exit vehicle · stop first'),button(b.map,'Open map'),button(b.pause,'Pause')];
 if(context==='menus')return [stick('dpad','Navigate · left/right adjusts'),button(0,'Select / confirm'),button(1,'Back / close')];
 if(context==='map')return [stick('move','Pan map'),stick('aim','Move marker cursor'),button(6,'Zoom out'),button(7,'Zoom in'),button(0,'Place marker'),button(2,'Clear route'),button(11,'Centre on survivor'),stick('dpad','Navigate map options'),button(1,'Close map')];
 return [stick('move','Move survivor'),stick('aim','Aim weapons'),...Object.entries(ACTION_NAMES).map(([action,label])=>button(b[action],label))];
}
export function diagramGeometry(family='playstation'){
 const xbox=family==='xbox',dpad=xbox?[190,202]:[120,132],left=xbox?[120,132]:[190,202];
 const buttons={0:[380,169],1:[417,132],2:[343,132],3:[380,95],4:[128,66],5:[372,66],6:[128,27],7:[372,27],8:[181,104],9:[319,104],10:left,11:[310,202],12:[dpad[0],dpad[1]-24],13:[dpad[0],dpad[1]+24],14:[dpad[0]-24,dpad[1]],15:[dpad[0]+24,dpad[1]]};
 return {buttons,left,right:[310,202],dpad};
}
const captions={combat:'Combat bindings update as you remap them below.',driving:'Driving controls follow your selected driving style.',menus:'Menu buttons stay fixed, even with custom combat bindings.',map:'Map controls apply while the map canvas has focus.'};
export function controllerSVG(family){
 const {buttons,left,right,dpad}=diagramGeometry(family),ps=family==='playstation',xbox=family==='xbox';
 const controls=Object.entries(buttons).map(([key,[x,y]])=>{const i=Number(key),shoulder=i>=4&&i<=7,stick=i===10||i===11,system=i===8||i===9;
  const shape=shoulder?'<rect x="-42" y="-15" width="84" height="30" rx="8"/>':stick?'<circle r="31"/><circle class="pad-stick-ring" r="23"/>':system?'<rect x="-12" y="-16" width="24" height="32" rx="8"/>':`<circle r="${i<4?17:13}"/>`;
  const label=system?(i===8?'••':'≡'):buttonName(i,family);
  return `<g class="pad-control ${stick?'pad-stick':''}" data-pad-button="${i}" transform="translate(${x} ${y})">${shape}<text text-anchor="middle" dominant-baseline="central" class="${i<4?'pad-symbol':''}">${label}</text></g>`;
 }).join('');
 return `<svg class="controller-drawing ${ps?'dualsense-shell':xbox?'xbox-shell':'generic-shell'}" viewBox="0 0 500 302" role="img" aria-label="${ps?'PlayStation DualSense':xbox?'Xbox':'Standard gamepad'} controller, front view. Button actions are listed below.">
 <path class="pad-body" d="M105 77 Q70 82 60 126 L28 240 Q20 286 54 282 Q80 276 112 230 L145 203 Q178 251 220 235 L280 235 Q322 251 355 203 L388 230 Q420 276 446 282 Q480 286 472 240 L440 126 Q430 82 395 77 Z"/>
 <path class="pad-inlay" d="M145 89 L355 89 L336 144 L350 196 Q332 239 289 222 L211 222 Q168 239 150 196 L164 144 Z"/>
 ${ps?'<rect class="pad-touch" x="206" y="86" width="88" height="66" rx="10"/><path class="pad-touch-line" d="M214 83 H286"/>':'<circle class="pad-system" cx="250" cy="114" r="15"/><text class="pad-brand" x="250" y="120" text-anchor="middle">'+(xbox?'X':'•')+'</text>'}
 <path class="pad-seam" d="M88 183 L57 256 M412 183 L443 256"/>
 ${controls}<text class="pad-stick-caption" x="${left[0]}" y="${left[1]+48}" text-anchor="middle">LEFT STICK</text><text class="pad-stick-caption" x="${right[0]}" y="${right[1]+48}" text-anchor="middle">RIGHT STICK</text>
 <g data-pad-stick="dpad" class="pad-direction-zone"><circle cx="${dpad[0]}" cy="${dpad[1]}" r="42"/></g>
 </svg>`;
}
export class ControllerDiagram{
 constructor(parent,input,settings){this.input=input;this.settings=settings;this.context='combat';this.root=document.createElement('figure');this.root.className='controller-reference';this.root.innerHTML=`<figcaption><span class="label">YOUR CONTROLLER / FRONT VIEW</span><strong id="controller-diagram-name"></strong></figcaption><div class="controller-contexts" role="group" aria-label="Controller reference context">${Object.entries(DIAGRAM_CONTEXTS).map(([key,label])=>`<button type="button" data-controller-context="${key}" aria-pressed="${key==='combat'}">${label}</button>`).join('')}</div><div class="controller-artwork"></div><p class="controller-diagram-note"></p><ul class="controller-action-legend" aria-label="Controller actions"></ul>`;parent.append(this.root);
  this.root.querySelectorAll('[data-controller-context]').forEach(button=>button.onclick=()=>{this.context=button.dataset.controllerContext;this.update();});this.update();
 }
 update(){const family=this.settings.promptStyle&&this.settings.promptStyle!=='auto'?this.settings.promptStyle:this.input.family||'playstation';const key=JSON.stringify([family,this.context,this.settings.bindings,this.settings.drivingStyle,!!this.input.pad]);
  if(key!==this.key){this.key=key;this.root.querySelector('#controller-diagram-name').textContent=`${family==='playstation'?'PlayStation / DualSense layout':family==='xbox'?'Xbox layout':'Standard gamepad layout'}${this.input.pad?'':' · preview'}`;this.root.querySelector('.controller-artwork').innerHTML=controllerSVG(family);this.root.querySelector('.controller-diagram-note').textContent=captions[this.context];
   this.root.querySelectorAll('[data-controller-context]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.controllerContext===this.context)));
   this.root.querySelector('.controller-action-legend').innerHTML=diagramActions(this.settings,this.context).map(({id,label})=>`<li data-control-ref="${id}">${/^\d+$/.test(id)?glyph(Number(id),family):`<span class="pad-axis-key">${id==='move'?'LS':id==='aim'?'RS':'D-PAD'}</span>`}<span>${label}</span></li>`).join('');
   this.controls=[...this.root.querySelectorAll('[data-pad-button]')];this.rows=[...this.root.querySelectorAll('[data-control-ref]')];
  }
  const pad=this.input.pad,active=id=>id==='move'?Math.hypot(pad?.move.x||0,pad?.move.y||0)>.1:id==='aim'?Math.hypot(pad?.aim.x||0,pad?.aim.y||0)>.1:id==='dpad'?pad?.buttons.slice(12,16).some(Boolean):!!pad?.buttons[Number(id)];
  for(const el of this.controls){const id=el.dataset.padButton;el.classList.toggle('is-down',active(id)||(id==='10'&&active('move'))||(id==='11'&&active('aim')));}
  for(const el of this.rows)el.classList.toggle('is-down',!!active(el.dataset.controlRef));
 }
}
