export async function toggleFullscreen(doc=document){
 if(globalThis.window?.bagarreDesktop)return window.bagarreDesktop.toggleFullscreen();
 if(doc.fullscreenElement||doc.webkitFullscreenElement){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;if(exit)await exit.call(doc);return;}
 const root=doc.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;
 if(!request)throw new Error('Fullscreen is unavailable in this browser. Try the browser’s fullscreen command or add the game to your home screen.');
 try{await request.call(root);}catch{throw new Error('Tap or click FULLSCREEN to allow it. Your browser may block controller-only fullscreen requests.');}
}
export function installFullscreen(){
 const hosts=[document.querySelector('.menu-links'),document.querySelector('.pause-tools'),document.getElementById('settings-dialog')],buttons=[];
 for(const [i,host]of hosts.entries()){const button=document.createElement('button');button.type='button';button.className='fullscreen-button';button.id=['menu-fullscreen','pause-fullscreen','settings-fullscreen'][i];button.innerHTML='⛶ FULLSCREEN';button.setAttribute('aria-label','Enter fullscreen');const note=document.createElement('p');note.className='fullscreen-note';note.setAttribute('role','status');note.hidden=true;if(i===2){host.querySelector('h2').after(button);button.after(note);}else{host.append(button,note);}button.onclick=async()=>{try{await toggleFullscreen();note.hidden=true;}catch(error){note.textContent=error.message;note.hidden=false;}};buttons.push(button);}
 let nativeFullscreen=false;
 const sync=()=>{const active=window.bagarreDesktop?nativeFullscreen:!!(document.fullscreenElement||document.webkitFullscreenElement);for(const button of buttons){button.textContent=active?'⛶ EXIT FULLSCREEN':'⛶ FULLSCREEN';button.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');button.setAttribute('aria-pressed',String(active));}window.dispatchEvent(new Event('resize'));};
 if(window.bagarreDesktop){window.bagarreDesktop.onFullscreen(value=>{nativeFullscreen=value;sync();});window.bagarreDesktop.getStatus().then(status=>{nativeFullscreen=status.fullscreen;sync();}).catch(()=>{});}
 document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);sync();
}
