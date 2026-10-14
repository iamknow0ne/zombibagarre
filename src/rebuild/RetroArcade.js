import {beginRetroSession,endRetroSession,retroExitHeld} from './RetroSession.js';
import './retro.css';
export class RetroArcade{
 constructor({getSim,input,audio,onReturn,volume}){
  Object.assign(this,{getSim,input,audio,onReturn,volume});this.session=null;this.exitSince=null;
  this.dialog=document.createElement('dialog');this.dialog.id='retro-dialog';this.dialog.setAttribute('aria-labelledby','retro-title');
  this.dialog.innerHTML='<header><div><small>THE LAST CHECKPOINT / CARTRIDGE 01</small><h2 id="retro-title">Zombie Bagarre <span>16-bit</span></h2></div><button type="button" class="retro-return">Return to room <kbd>Esc</kbd></button></header><div class="retro-screen"></div><footer><span class="retro-led">SNES HOMEBREW · FIRST PLAYABLE</span><span>Hold Select + Start to leave · Your expedition is frozen</span></footer>';
  document.body.append(this.dialog);this.dialog.querySelector('button').onclick=()=>this.close();
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.dialog.addEventListener('close',()=>this.close());
  window.addEventListener('message',e=>{if(e.source!==this.frame?.contentWindow||e.origin!==location.origin)return;if(e.data?.type==='retro-exit')this.close();});
 }
 get active(){return !!this.session;}
 open(consoleId){
  if(this.active)return false;const session=beginRetroSession(this.getSim(),consoleId);if(!session)return false;this.session=session;
  this.input.clear();this.input.playing=false;this.audio.ctx?.suspend().catch(()=>{});this.exitSince=null;this.exitArmed=false;
  this.frame=document.createElement('iframe');this.frame.title='Zombie Bagarre SNES cartridge';this.frame.allow='autoplay; gamepad; fullscreen';
  this.frame.src=`${import.meta.env.BASE_URL}retro/play.html?volume=${Math.max(0,Math.min(1,this.volume()))}`;
  this.dialog.querySelector('.retro-screen').replaceChildren(this.frame);document.body.classList.add('retro-playing');this.dialog.showModal();this.frame.focus();return true;
 }
 poll(now){
  let held=false;try{held=retroExitHeld(navigator.getGamepads?.());}catch{/* Keyboard and touch exit stay available. */}
  if(!held){this.exitSince=null;this.exitArmed=true;return;}if(!this.exitArmed)return;
  this.exitSince??=now;if(now-this.exitSince>650)this.close();
 }
 close(){
  if(!this.session)return;const session=this.session;this.session=null;
  this.frame?.remove();this.frame=null;this.dialog.close();document.body.classList.remove('retro-playing');
  endRetroSession(session);this.input.clear();if(!document.hidden)this.audio.ctx?.resume().catch(()=>{});this.onReturn();
 }
}
