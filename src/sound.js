// Small, gesture-triggered foley. No files, autoplay, music or continuous audio.
// Each object has its own resonant material and tuning.
const VOICES={
 andon:{base:420,ring:1.42,decay:.095,filter:1400,noise:.065,type:'wood'},
 toro:{base:230,ring:2.03,decay:.2,filter:1000,noise:.045,type:'bamboo'},
 shoji:{base:610,ring:1.31,decay:.07,filter:2300,noise:.13,type:'paper'},
 pebble:{base:1120,ring:2.73,decay:.27,filter:3500,noise:.012,type:'stone'},
 'pebble-compact':{base:1460,ring:2.17,decay:.19,filter:4100,noise:.014,type:'stone'},
 shibui:{base:730,ring:2.41,decay:.2,filter:2400,noise:.025,type:'ceramic'},
 'shibui-stack':{base:560,ring:2.41,decay:.26,filter:2200,noise:.03,type:'ceramic'}
};
const SOUND_KEY='lamparas.sound.v1';
export function createSound(storage){
 let enabled=true,ctx,master,noiseBuffer;
 try{enabled=storage?.getItem(SOUND_KEY)!=='off';}catch{}
 function initialize(){
  if(!ctx){
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(!Audio)return false;
   ctx=new Audio();master=ctx.createGain();master.gain.value=.28;master.connect(ctx.destination);
   noiseBuffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.2),ctx.sampleRate);
   const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  }
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  return true;
 }
 function tone(t,freq,decay,level,pan=0){
  const osc=ctx.createOscillator(),gain=ctx.createGain(),stereo=ctx.createStereoPanner();
  osc.type='sine';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*.94,t+decay);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.004);gain.gain.exponentialRampToValueAtTime(.0001,t+decay);
  stereo.pan.value=pan;osc.connect(gain).connect(stereo).connect(master);osc.start(t);osc.stop(t+decay+.02);
  osc.onended=()=>{osc.disconnect();gain.disconnect();stereo.disconnect();};
 }
 function play(id,event='select',value){
  if(!enabled)return;
  try{
   if(!initialize())return;
   const v=VOICES[id]||VOICES.andon,t=ctx.currentTime+.005;
   const pitch=event==='temperature'?({warm:.89,neutral:1,cool:1.12}[value]||1):event==='off'?.72:1;
   const level=event==='select'?.18:.24;
   tone(t,v.base*pitch,v.decay,level);
   tone(t,v.base*v.ring*pitch,v.decay*.6,level*.2);
   if(event==='on'||event==='temperature')tone(t+.065,v.base*pitch*1.5,v.decay*.7,level*.22,.07);
   if(id==='shibui-stack')tone(t+.038,v.base*pitch*.75,v.decay*.8,level*.3,-.1);
   const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();noise.buffer=noiseBuffer;
   filter.type='bandpass';filter.frequency.value=v.filter;filter.Q.value=v.type==='paper'?.7:2;
   gain.gain.setValueAtTime(v.noise,t);gain.gain.exponentialRampToValueAtTime(.0001,t+(v.type==='paper'?.09:.035));
   noise.connect(filter).connect(gain).connect(master);noise.start(t);noise.stop(t+.12);
   noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};
  }catch{/* Audio unsupported or blocked: controls and lighting keep working. */}
 }
 return {play,get enabled(){return enabled;},toggle(){enabled=!enabled;try{storage?.setItem(SOUND_KEY,enabled?'on':'off');}catch{}return enabled;}};
}
