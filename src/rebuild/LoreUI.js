import {DOSSIERS,SURVIVOR_HOOKS} from './Lore.js';
import './lore.css';

export class LoreUI{
 constructor({theme,onOpen,onClose}){
  this.theme=theme;this.onOpen=onOpen;this.onClose=onClose;this.page='story';
  this.dialog=document.createElement('dialog');this.dialog.id='lore-dialog';this.dialog.setAttribute('aria-labelledby','lore-title');
  this.dialog.innerHTML=`<header class="lore-toolbar"><span class="label">ZB / WORLD DOSSIER</span><button id="lore-close" aria-label="Close world dossier">CLOSE ×</button></header><nav class="lore-worlds" aria-label="World setting"><button data-world="quarantine">01 / QUARANTINE</button><button data-world="cyberpunk">02 / BLACKOUT 2089</button></nav><div class="lore-layout"><figure class="lore-art"><img id="lore-artwork" width="1536" height="1024" decoding="async"><figcaption><span id="lore-caption"></span><small>ORIGINAL WORLD ILLUSTRATION</small></figcaption><p id="lore-art-status" role="status"></p></figure><section class="lore-reading"><p id="lore-place" class="label"></p><h2 id="lore-title"></h2><nav class="lore-chapters" aria-label="Dossier chapter"><button data-page="story">STORY</button><button data-page="people">CONTACTS</button><button data-page="forces">FACTIONS</button><button data-page="survivors">SURVIVORS</button></nav><article id="lore-copy" aria-live="polite"></article></section></div><footer class="lore-foot"><span>Two interpretations of one city. Previewing a dossier keeps your current world and progress.</span><button id="lore-next">NEXT CHAPTER →</button></footer>`;
  document.body.append(this.dialog);
  this.dialog.querySelector('#lore-close').onclick=()=>this.dialog.close();
  this.dialog.addEventListener('close',()=>this.onClose());
  // Keep Escape local: the game's window listener also uses it for pause.
  this.dialog.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();this.dialog.close();}});
  this.dialog.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>{this.world=b.dataset.world;this.render();});
  this.dialog.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{this.page=b.dataset.page;this.renderCopy();});
  this.dialog.querySelector('#lore-next').onclick=()=>{const pages=['story','people','forces','survivors'];this.page=pages[(pages.indexOf(this.page)+1)%pages.length];this.renderCopy();this.dialog.querySelector('.lore-reading').scrollIntoView({block:'nearest'});};
  const img=this.dialog.querySelector('img'),status=this.dialog.querySelector('#lore-art-status');
  img.onload=()=>{status.textContent='';};img.onerror=()=>{status.textContent='Artwork unavailable. The dossier can still be read.';};
 }
 open(){this.world=this.theme();this.page='story';this.render();this.onOpen();this.dialog.showModal();this.dialog.scrollTop=0;this.dialog.querySelector(`[data-world="${this.world}"]`).focus();}
 render(){
  const d=DOSSIERS[this.world];this.dialog.dataset.world=this.world;
  const img=this.dialog.querySelector('img'),url=import.meta.env.BASE_URL+'art/'+d.art;
  if(img.getAttribute('src')!==url){this.dialog.querySelector('#lore-art-status').textContent='Loading world illustration…';img.alt=d.alt;img.src=url;}
  this.dialog.querySelector('#lore-caption').textContent=d.caption;
  this.dialog.querySelector('#lore-place').textContent=d.place;
  this.dialog.querySelector('#lore-title').textContent=d.title;
  this.dialog.querySelectorAll('[data-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===this.world)));
  this.renderCopy();
 }
 renderCopy(){
  const d=DOSSIERS[this.world],article=this.dialog.querySelector('#lore-copy');article.replaceChildren();
  const node=(tag,text,parent=article)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
  if(this.page==='story'){d.story.forEach(p=>node('p',p));const quote=node('blockquote',d.quote);node('cite',d.source,quote);}
  else{const entries=this.page==='survivors'?SURVIVOR_HOOKS:d[this.page];for(const[title,body]of entries){const section=node('section','');node('h3',title,section);node('p',body,section);}}
  this.dialog.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===this.page)));
 }
}
