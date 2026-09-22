import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSound} from '../src/sound.js';
test('audio starts only on interaction, each lamp has a distinct voice, mute persists',()=>{
 let contexts=0,frequencies=[];const values=new Map();
 const param={value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
 const node=()=>({connect(other){return other},disconnect(){},start(){},stop(){},gain:{...param},frequency:{...param},pan:{...param},Q:{...param}});
 class AudioContext{constructor(){contexts++;this.currentTime=0;this.sampleRate=44100;this.state='running';this.destination={}}createGain(){return node()}createStereoPanner(){return node()}createBiquadFilter(){return node()}createBufferSource(){return node()}createBuffer(_,size){return{getChannelData(){return new Float32Array(size)}}}createOscillator(){const n=node();n.frequency.setValueAtTime=f=>frequencies.push(f);return n;}}
 global.window={AudioContext};
 const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const sound=createSound(storage);assert.equal(contexts,0);
 const fundamental=[];for(const id of ['andon','toro','shoji','pebble','pebble-compact','shibui','shibui-stack']){frequencies=[];sound.play(id);fundamental.push(frequencies[0])}
 assert.equal(contexts,1);assert.equal(new Set(fundamental).size,7);
 sound.toggle();frequencies=[];sound.play('andon');assert.equal(frequencies.length,0);assert.equal(createSound(storage).enabled,false);
 delete global.window;
});

test('signature needs an unlocked context, uses seven notes, and mute stops ringing voices',()=>{
 let contexts=0,started=0,stopped=0;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),pan:param(),connect(n){return n},disconnect(){},start(){started++},stop(){stopped++}});
 global.window={AudioContext:class{
  constructor(){contexts++;this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination={}}
  createGain(){return node()}createStereoPanner(){return node()}createOscillator(){return node()}
  createBuffer(_,size){return{getChannelData:()=>new Float32Array(size)}}
 }};
 const sound=createSound();sound.signatureNote(0);assert.equal(contexts,0);
 sound.unlock();for(let i=0;i<7;i++)sound.signatureNote(i);
 assert.equal(contexts,1);assert.equal(started,21);
 const scheduledStops=stopped;sound.toggle();assert.equal(stopped,scheduledStops+21);
 sound.signatureNote(0);assert.equal(started,21);
 delete global.window;
});
