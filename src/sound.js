// One shared tuning and timbre for the entrance and every lamp interaction.
export const SIGNATURE_ORDER=['andon','toro','shoji','shibui','shibui-stack','pebble','pebble-compact'];
const SOUND_KEY='lamparas.sound.v1';
export function createSound(storage){
 let enabled=true,ctx,master;
 const signatureVoices=new Set();
 try{enabled=storage?.getItem(SOUND_KEY)!=='off';}catch{}
 function initialize(){
  if(!ctx){
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return false;
   ctx=new Audio();master=ctx.createGain();master.gain.value=.28;master.connect(ctx.destination);

  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return true;
 }
 function play(id){
  if(!enabled)return;
  try{
   if(!initialize())return;
   const index=SIGNATURE_ORDER.indexOf(id);
   const ring=()=>signatureNote(index<0?0:index);
   if(ctx.state==='suspended')ctx.resume().then(ring).catch(()=>{});else ring();
  }catch{/* Lighting remains usable without audio support. */}
 }
 function stopSignature(){
  for(const voice of signatureVoices){try{voice.stop();}catch{}}
  signatureVoices.clear();
 }
 function signatureNote(index){
  if(!enabled||!ctx||ctx.state!=='running')return;
  // D in pentatonic: D–Eb–G–A–Bb. Resolve gently to D.
  const steps=[0,1,5,7,8,12,0],frequency=293.6648*2**(steps[index%steps.length]/12);
  const t=ctx.currentTime+.008;
  [1,2,3.01].forEach((ratio,partial)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain(),pan=ctx.createStereoPanner();
   osc.frequency.value=frequency*ratio;
   const decay=partial===0?1.45:.48,level=[.30,.075,.023][partial];
   gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,t+decay);
   pan.pan.value=(index-3)*.075;
   osc.connect(gain).connect(pan).connect(master);
   signatureVoices.add(osc);osc.start(t);osc.stop(t+decay+.03);
   osc.onended=()=>{signatureVoices.delete(osc);osc.disconnect();gain.disconnect();pan.disconnect();};
  });
 }
 function doorSlide(){
  if(!enabled||!ctx)return;
  const length=.9,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate);
  const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(.6+.4*Math.sin(i/ctx.sampleRate*53));
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=850;
  const t=ctx.currentTime+.02;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.13,t+.15);gain.gain.exponentialRampToValueAtTime(.0001,t+length);
  source.connect(filter).connect(gain).connect(master);signatureVoices.add(source);source.start(t);source.stop(t+length);
  source.onended=()=>{signatureVoices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
 }
 return {play,signatureNote,stopSignature,doorSlide,unlock(){try{if(enabled)initialize();}catch{}},get enabled(){return enabled;},toggle(){enabled=!enabled;if(!enabled)stopSignature();try{storage?.setItem(SOUND_KEY,enabled?'on':'off');}catch{}return enabled;}};
}
