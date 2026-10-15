// Android sends these events from its bundled WebView shell. Merely installing
// this adapter does not change browser or desktop focus/audio behavior.
export function cancelTopDialog(document){
 const dialogs=[...document.querySelectorAll('dialog[open]')];
 if(!dialogs.length)return false;
 const focused=document.activeElement?.closest?.('dialog[open]');
 const dialog=dialogs.includes(focused)?focused:dialogs.at(-1);
 // Match Escape: cancel handlers may veto closing (upgrades/results) or perform
 // their own state transition (pause and the emulator). Never close a new dialog
 // that a handler opens while cancelling the old one.
 const EventClass=document.defaultView?.Event||Event;
 if(dialog.dispatchEvent(new EventClass('cancel',{cancelable:true}))&&dialog.open)dialog.close();
 return true;
}

export function installAndroidPlatform({window,document,getAudio=()=>null,closeRetro=()=>{},onPause=()=>{},onForeground=()=>{},onBack=()=>{}}){
 let background=false,audioSuspended=false,disposed=false,audioAttempt=0;
 const listeners=[];
 const listen=(target,name,handler,options)=>{target.addEventListener(name,handler,options);listeners.push(()=>target.removeEventListener(name,handler,options));};
 const settle=action=>{try{action()?.catch?.(()=>{});}catch{/* Audio may be unavailable or already closed. */}};
 function resumeAudioOnGesture(){
  if(disposed||background||document.hidden||!audioSuspended)return;
  const context=getAudio()?.ctx;
  if(!context)return;
  // A renderer/audio-device interruption can reject resume. Keep a failed
  // attempt retryable on the next gesture, without letting an old rejection
  // overwrite a newer pause/resume cycle.
  const attempt=++audioAttempt;
  const retry=()=>{if(!disposed&&audioAttempt===attempt)audioSuspended=true;};
  audioSuspended=false;
  try{context.resume()?.catch?.(retry);}catch{retry();}
 }
 function pause(){
  background=true;audioSuspended=true;audioAttempt++;
  // Removing the cartridge frame stops its independent audio and simulation.
  // It can resume the main context during cleanup, so suspend that context last.
  closeRetro();onPause();settle(()=>getAudio()?.ctx?.suspend());
 }
 function foreground(){background=false;onForeground();}
 function back(){
  if(background)return;
  resumeAudioOnGesture();
  if(!cancelTopDialog(document))onBack();
 }
 listen(window,'bagarre-android-pause',pause);
 listen(window,'bagarre-android-resume',foreground);
 listen(window,'bagarre-android-back',back);
 listen(document,'pointerdown',resumeAudioOnGesture,{capture:true});
 listen(document,'keydown',resumeAudioOnGesture,{capture:true});
 return {resumeAudioOnGesture,dispose(){disposed=true;for(const remove of listeners)remove();}};
}
