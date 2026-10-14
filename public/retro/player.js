/* Local cartridge wrapper. No arbitrary ROM URLs or external services. */
const power=document.getElementById('power'),button=document.getElementById('power-on'),status=document.getElementById('status');
let started=false,loading=false,exitSince=null,exitArmed=false;
function leave(){if(parent!==window)parent.postMessage({type:'retro-exit'},location.origin);else location.href='../';}
document.getElementById('exit').onclick=leave;
window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();leave();}},true);
button.onclick=()=>{
 if(loading)return;loading=true;button.disabled=true;status.textContent='Loading the cartridge and local SNES hardware…';
 Object.assign(window,{EJS_player:'#game',EJS_core:'snes9x',EJS_gameUrl:'zombie-bagarre.sfc',EJS_pathtodata:'emulator/data/',EJS_gameName:'Zombie Bagarre - Night Shift v1',EJS_startOnLoaded:true,EJS_threads:false,EJS_defaultOptions:{'virtual-gamepad':matchMedia('(pointer:coarse)').matches||innerWidth<600?'enabled':'disabled'},EJS_disableDatabases:true,EJS_disableAutoLang:false,EJS_language:'en-US',EJS_color:'#b9945e',EJS_volume:Math.max(0,Math.min(1,Number(new URLSearchParams(location.search).get('volume')??.45))),EJS_Buttons:{netplay:false,cheat:false,saveSavFiles:false,loadSavFiles:false,exitEmulation:false},EJS_ready:()=>{status.textContent='Starting SNES…';},EJS_onGameStart:()=>{started=true;power.hidden=true;window.focus();}});
 const script=document.createElement('script');script.src='emulator/data/loader.js';script.onerror=()=>fail('The local emulator could not load. Return to the room and try again.');document.body.append(script);
 setTimeout(()=>{if(!started)fail('The cartridge is taking too long to start. Power off and try again.');},30000);
};
function fail(message){if(started)return;power.hidden=false;status.textContent=message;button.textContent='Retry cartridge';button.disabled=false;button.onclick=()=>location.reload();}
window.addEventListener('error',e=>{console.error('SNES startup:',e.message||e.target?.src||'resource failure',e.error?.stack||'');fail('The cartridge could not start on this browser. You can safely return to the room.');});
function padMenu(now){
 let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}catch{}
 const held=pads.some(p=>p.buttons[8]?.pressed&&p.buttons[9]?.pressed);
 if(!held){exitArmed=true;exitSince=null;}else if(exitArmed){exitSince??=now;if(now-exitSince>650){leave();return;}}
 // Power on with Start or the south face button, after release of the room interaction.
 const pressed=pads.some(p=>p.buttons.some(b=>b.pressed));
 if(!pressed)window.padPowerArmed=true;
 if(!loading&&window.padPowerArmed&&pads.some(p=>p.buttons[0]?.pressed||p.buttons[9]?.pressed)){window.padPowerArmed=false;button.click();}
 requestAnimationFrame(padMenu);
}requestAnimationFrame(padMenu);

const touchToggle=document.getElementById('touch-toggle');
function showTouch(value){document.body.classList.toggle('touch-controls',value);touchToggle.setAttribute('aria-pressed',String(value));}
showTouch(matchMedia('(pointer:coarse)').matches||innerWidth<600);touchToggle.onclick=()=>showTouch(!document.body.classList.contains('touch-controls'));
