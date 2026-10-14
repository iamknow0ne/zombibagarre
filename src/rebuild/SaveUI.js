import {parseBackup,MAX_BACKUP_BYTES} from './SaveStore.js';
import {levelForXP,pointsLeft} from './RPG.js';

export class SaveUI {
 constructor({store,host,canRestore,onRestored,beforeExport=()=>{}}){
  Object.assign(this,{store,canRestore,onRestored,beforeExport});this.pending=null;this.selection=0;
  const panel=document.createElement('details');panel.id='save-panel';panel.className='save-panel';
  panel.innerHTML=`<summary>YOUR SAVE · BACKUP & RESTORE</summary><p>Keep your survivor between devices. Backups include character levels, equipment, base camp and settings. Current expeditions are not saved.</p><p id="save-status" role="status" aria-live="polite"></p><div class="save-actions"><button type="button" id="save-export">EXPORT BACKUP ↓</button><button type="button" id="save-choose">CHOOSE BACKUP ↑</button><button type="button" id="save-retry">RETRY SAVING</button><button type="button" id="save-original">EXPORT STORED ORIGINAL ↓</button><button type="button" id="save-recovery">EXPORT PRE-RESTORE COPY ↓</button></div><input id="save-file" type="file" accept=".json,application/json" hidden><section id="save-preview" hidden aria-label="Backup preview"><div class="label">REPLACE THIS CHARACTER?</div><p id="save-comparison"></p><p>Your previous save is kept as a recovery copy. This replaces progress and settings; it does not merge characters.</p><p id="save-restore-note"></p><div class="save-actions"><button type="button" id="save-restore">RESTORE & RELOAD</button><button type="button" id="save-cancel">CANCEL</button></div></section><p id="save-feedback" role="status" aria-live="polite"></p>`;
  host.append(panel);this.panel=panel;this.el=id=>panel.querySelector('#'+id);
  this.el('save-export').onclick=()=>this.attempt(()=>{beforeExport();this.download(store.export(),'backup');this.feedback('Backup download started. Check your downloads and keep the file somewhere safe.');});
  this.el('save-original').onclick=()=>this.attempt(()=>this.download(store.original(),'stored-original'));
  this.el('save-recovery').onclick=()=>this.attempt(()=>this.download(store.recovery(),'before-restore'));
  this.el('save-retry').onclick=()=>{store.flush();this.update();};
  this.el('save-choose').onclick=()=>this.el('save-file').click();
  this.el('save-file').onchange=async()=>{
   const selected=++this.selection,file=this.el('save-file').files[0];this.pending=null;this.update();if(!file)return;
   try{if(file.size>MAX_BACKUP_BYTES)throw new Error('Choose a backup under 256 KB.');const text=await file.text();if(selected!==this.selection)return;this.preview(text);}
   catch(error){if(selected===this.selection)this.feedback(error.message,true);}
   finally{if(selected===this.selection)this.el('save-file').value='';}
  };
  this.el('save-cancel').onclick=()=>{this.selection++;this.pending=null;this.feedback('Restore cancelled. Your progress has not changed.');this.update();this.el('save-choose').focus();};
  this.el('save-restore').onclick=()=>this.attempt(()=>{
   if(!this.pending||!canRestore())throw new Error('Return to the title screen before replacing your character.');
   store.restore(this.pending);this.pending=null;this.feedback('Backup restored. Reloading your survivor…');onRestored();
  });
  this.unsubscribe=store.subscribe(()=>this.update());
 }
 feedback(text,error=false){this.el('save-feedback').textContent=text;this.el('save-feedback').classList.toggle('save-error',error);}
 attempt(action){try{action();}catch(error){this.feedback(error.message||'The save could not be changed. Export your current progress and try again.',true);}}
 preview(text){const next=parseBackup(text);this.pending=text;this.el('save-comparison').textContent=`CURRENT · ${this.describe(this.store.data)}\nBACKUP · ${this.describe(next)}`;this.feedback('Backup checked. Review the character before restoring.');this.update();this.el('save-cancel').focus();}
 describe(data){return `Level ${levelForXP(data.profile.xp).level} · ${data.profile.owned.length} armour items · ${pointsLeft(data.profile)} unspent points · ${data.record.scrap.toLocaleString('en-US')} scrap`;}
 update(){
  const store=this.store;this.el('save-status').textContent=store.ephemeral?'TEST WORKSHOP · Progress is temporary and never overwrites your character.':store.issue||'LOCAL SAVE · Character progress is saved automatically on this device.';
  this.el('save-status').classList.toggle('save-error',!!store.issue);
  this.el('save-retry').hidden=!store.issue||store.locked;this.el('save-original').hidden=!store.locked&&!store.recovered;
  this.el('save-choose').disabled=store.ephemeral;
  this.el('save-preview').hidden=!this.pending;this.el('save-restore').disabled=!this.canRestore()||store.ephemeral;
  this.el('save-restore-note').textContent=this.canRestore()?'Restoring reloads the game with this backup.':'Finish or leave your expedition, then return here from the title screen to restore.';
  let recovery=false;try{recovery=!!store.recovery();}catch{}this.el('save-recovery').hidden=!recovery;
 }
 download(text,kind){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`zombie-bagarre-${kind}-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
