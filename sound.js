/* Audio is a separate service; recording keys are human-facing result levels. */
(function(root){
class AudioDesk{
 constructor(recordings){this.raw=recordings;this.buffers=new Map();this.nodes=new Set();this.context=null;this.enabled=true;this.loading=null;}
 unlock(){
  if(!this.context){const Constructor=root.AudioContext||root.webkitAudioContext;if(!Constructor)return Promise.resolve();this.context=new Constructor();this.loading=Promise.all(Object.entries(this.raw).map(async([level,data])=>{try{const bytes=Uint8Array.from(atob(data),x=>x.charCodeAt(0));const decoded=await this.context.decodeAudioData(bytes.buffer);this.buffers.set(Number(level),decoded);}catch{}}));}
  if(this.context.state==='suspended')this.context.resume().catch(()=>{});return this.loading;
 }
 stop(){for(const source of this.nodes){try{source.stop();}catch{}}this.nodes.clear();}
 setEnabled(value){this.enabled=value;if(!value)this.stop();else this.unlock();}
 tone(frequency,duration=.12,volume=.045,delay=0,wave='square'){
  if(!this.enabled||!this.context)return;
  const c=this.context,o=c.createOscillator(),g=c.createGain(),at=c.currentTime+delay;
  o.type=wave;o.frequency.setValueAtTime(frequency,at);
  g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
  o.connect(g);g.connect(c.destination);this.nodes.add(o);
  o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration);
 }
 cue(name){
  const tunes={coin:[659,988,1319,1760],revive:[330,440,659,880],end:[440,349,294,220],complete:[523,659,784,1047,1319]};
  const notes=tunes[name]||[392,523,784];
  notes.forEach((hz,i)=>this.tone(hz,name==='complete'?.065:.11,.035,i*(name==='complete'?.045:.085),i%2?'triangle':'square'));
 }

 merge(level,complete){if(!this.enabled)return;if(complete){this.cue('complete');return;}const buffer=this.buffers.get(level);if(buffer&&this.context){const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);source.disconnect();};source.start();}else{const base=220*Math.pow(2,level/12);[1,1.25,1.5].forEach((n,i)=>this.tone(base*n,.045,.035,i*.025));}}
}
root.ResceneAudio=AudioDesk;
})(globalThis);
