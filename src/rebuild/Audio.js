export class Audio {
  constructor(volume=.45){this.volume=volume;this.ctx=null;this.lastBeat=0;}
  start(){
    if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.4;this.master.connect(this.ctx.destination);
      const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;this.noise=buffer;
      this.ambient=this.ctx.createGain();this.ambient.gain.value=.035;this.ambient.connect(this.master);
      for(const f of [55,82.41,110.1]){const o=this.ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(this.ambient);o.start();}
    }this.ctx.resume().catch(()=>{});
  }
  setVolume(v){this.volume=v;if(this.ctx)this.master.gain.setTargetAtTime(v*.4,this.ctx.currentTime,.05);}
  tone(freq,duration=.1,volume=.2,type='sine',end=freq){if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
  hiss(duration,volume,frequency=1500){if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime,s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();s.buffer=this.noise;f.type='lowpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
  event(e){switch(e.type){case'arc':this.tone(180,.12,.12,'sawtooth',800);break;case'shoot':if(e.weapon==='flame'){this.hiss(.13,.09,700);break;}if(e.weapon==='arc')break;this.hiss(e.weapon==='shotgun'?.22:.07,e.weapon==='shotgun'?.65:.28,2600);this.tone(110,.1,.4,'triangle',35);break;case'hit':this.hiss(.07,.08,800);break;case'hurt':this.tone(90,.25,.3,'sawtooth',35);break;case'explosion':case'slam':this.hiss(.5,.65,600);this.tone(75,.4,.7,'sine',25);break;case'melee':case'dash':this.hiss(.15,.2,1600);break;case'reload':this.hiss(.09,.13,3500);break;case'loaded':case'switch':this.tone(700,.035,.08,'square',300);break;case'powerup':case'heal':this.tone(520,.16,.12,'sine',780);break;case'wave':this.tone(164,.8,.13,'triangle',164);this.tone(246,1.1,.09);break;case'upgrade':case'victory':this.tone(330,.8,.2);this.tone(440,1,.14);this.tone(660,1.3,.1);break;}}
  update(time,active){if(this.ctx)this.ambient.gain.setTargetAtTime(active?.03:.008,this.ctx.currentTime,.2);if(active&&time-this.lastBeat>1.4){this.lastBeat=time;this.tone(55,.35,.09,'sine',45);}}
}
