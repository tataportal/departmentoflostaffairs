import {storyFor} from './stories.js';
import './style.css';
import speakerOn from '@phosphor-icons/core/assets/regular/speaker-high.svg?raw';
import speakerOff from '@phosphor-icons/core/assets/regular/speaker-slash.svg?raw';
import * as THREE from 'three';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {VignetteShader} from 'three/addons/shaders/VignetteShader.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFilament,excludeRoomBounce} from './filament.js';
import {createDust} from './atmosphere.js';
import {createSound,SIGNATURE_ORDER} from './sound.js';
import {createRoom} from './room.js';
import {LAMPS,TEMPERATURES,loadState,saveState,STORAGE_KEY} from './state.js';

const $=id=>document.getElementById(id);
let storage;try{storage=window.localStorage;}catch{storage=null;}
let state=loadState(storage);
const sound=createSound(storage);
// The introduction is a visual overlay; it never overwrites saved lamp choices.
let introPhase='waiting',introLit=new Set(),introTimers=[];
const introOrder=SIGNATURE_ORDER;
function finishIntro(){
 introTimers.forEach(clearTimeout);introTimers=[];introPhase='done';
 $('enter').hidden=true;document.body.classList.remove('introducing','awaiting-entry','door-opening');
 $('targets').inert=false;$('targets').hidden=false;
 if(entryCamera){cameraTravel=null;scenePass.camera=camera;contactPass.enabled=true;dirty=true;}
 room?.userData.setInteriorVisibility(0);sound.stopSignature();applyLights();
}
function startIntro(){
 if(introPhase!=='waiting')return;
 introPhase='playing';$('enter').disabled=true;
 document.body.classList.add('door-opening');
 sound.unlock();sound.doorSlide();
 const openingDuration=reduceMotion.matches?0:1500;
 introTimers.push(setTimeout(()=>{
  $('enter').hidden=true;document.body.classList.remove('awaiting-entry','door-opening');
  if(reduceMotion.matches){scenePass.camera=camera;contactPass.enabled=true;room.userData.setInteriorVisibility(0);}
  else cameraTravel={start:performance.now()+3500,duration:2700};
  dirty=true;requestFrame();
 },openingDuration));
 introOrder.forEach((id,i)=>introTimers.push(setTimeout(()=>{
  introLit.add(id);sound.signatureNote(i);applyLights();
 },(reduceMotion.matches?0:450)+i*480)));
 introTimers.push(setTimeout(finishIntro,reduceMotion.matches?4800:8000));
}
$('enter').onclick=startIntro;
function updateSound(){ $('sound').setAttribute('aria-pressed',String(sound.enabled)); $('sound').setAttribute('aria-label',sound.enabled?'Mute sound':'Enable sound'); $('sound').innerHTML=sound.enabled?speakerOn:speakerOff; $('sound').querySelector('svg').setAttribute('aria-hidden','true'); }
updateSound();
$('sound').onclick=()=>{sound.toggle();updateSound();if(sound.enabled)sound.play(selected,'select');};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let selected=null,models=[],animation=null,lighting=null,frame=0,dirty=true;
let camera,renderer,composer,scene,dust,room,entryCamera,scenePass,contactPass,cameraTravel=null;
let dustTime=0,lastRender=0;
let orbitYaw=0,orbitPitch=.12,drag=null;
function orbitProduct(){
 const distance=4;camera.position.set(aim.x+Math.sin(orbitYaw)*Math.cos(orbitPitch)*distance,aim.y+Math.sin(orbitPitch)*distance,aim.z+Math.cos(orbitYaw)*Math.cos(orbitPitch)*distance);camera.lookAt(aim);dirty=true;requestFrame();
}
const aim=new THREE.Vector3(),homeAim=new THREE.Vector3(0,.86,0),homeOffset=new THREE.Vector3(6,4.8,6);
// Eye-level threshold view: enough setback to read the whole room.
const entryAim=new THREE.Vector3(-1.695,1.28,-.04);
const entryOffset=new THREE.Vector3(3.92,0,0);
function entryFov(aspect){return THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(35))*Math.max(1,1.3/aspect)));}
let homeSpan=5.7;
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const projected=new THREE.Vector3();
const temperatureButtons=[...document.querySelectorAll('[data-temp]')];
$('retry').onclick=()=>location.reload();
function announce(message){$('announcement').textContent=message;}
function showError(error){introTimers.forEach(clearTimeout);sound.stopSignature();$('enter').hidden=true;console.error(error);$('loading').hidden=true;$('error').hidden=false;$('hint').hidden=true;$('targets').hidden=true;$('controls').hidden=true;$('back').hidden=true;}
function fit(){
 const w=innerWidth,h=innerHeight,aspect=w/h;
 renderer.setSize(w,h);composer.setSize(w,h);
 if(entryCamera){entryCamera.aspect=aspect;if(!cameraTravel)entryCamera.fov=entryFov(aspect);entryCamera.updateProjectionMatrix();}
 homeSpan=Math.max(5.7,6.5/aspect);
 camera.left=-aspect/2;camera.right=aspect/2;camera.top=.5;camera.bottom=-.5;
 animation=null;if(selected)focus(selected,false);else{camera.zoom=1/homeSpan;camera.position.copy(homeAim).add(homeOffset);aim.copy(homeAim);camera.lookAt(aim);}
 camera.updateProjectionMatrix();dirty=true;requestFrame();
}
function transition(target,offset,span,animate=true){
 const finish={position:target.clone().add(offset),aim:target.clone(),zoom:1/span};
 if(!animate||reduceMotion.matches){camera.position.copy(finish.position);aim.copy(finish.aim);camera.zoom=finish.zoom;camera.lookAt(aim);camera.updateProjectionMatrix();animation=null;}
 else animation={start:performance.now(),duration:selected?700:950,from:camera.position.clone(),fromAim:aim.clone(),fromZoom:camera.zoom,...finish};
 dirty=true;requestFrame();
}
function focus(id,animate=true){
 const item=models.find(m=>m.id===id);if(!item)return;
 const center=item.bounds.getCenter(new THREE.Vector3());
 // Frame the complete approved assembly, including the standing base.
 const portrait=innerWidth/innerHeight<.85;
 const span=({toro:1.62,'shibui-stack':.39,shibui:.215,shoji:.35,pebble:.265,'pebble-compact':.205})[id]||.36;
 // Raise view target slightly downward to put the lamp above the bottom controls.
 orbitYaw=id==='andon'?.32:id==='toro'?.28:id==='shoji'?.16:.12;orbitPitch=id.startsWith('pebble')?.48:id.startsWith('shibui')?.38:id==='andon'?.26:.16;
 const direction=new THREE.Vector3(Math.sin(orbitYaw)*Math.cos(orbitPitch),Math.sin(orbitPitch),Math.cos(orbitYaw)*Math.cos(orbitPitch));
 const target=center.clone();target.y-=portrait?span*.06:span*.09;
 transition(target,direction.multiplyScalar(4),span*(portrait?1.28:1),animate);
}
function selectLamp(id){
 if(introPhase!=='done')finishIntro();
 const controlHadFocus=$('controls').contains(document.activeElement);
 selected=id;
 document.body.classList.add('focused');
 sound.play(id,'select');
 $('controls').hidden=false;$('back').hidden=false;$('hint').hidden=true;$('targets').hidden=false;
 updatePanel();focus(id);if(!controlHadFocus)$('back').focus({preventScroll:true});
 announce(`${models.find(m=>m.id===id).name}. Light controls open.`);
}
function back(){
 closeStory(false);
 const previous=selected;selected=null;document.body.classList.remove('focused');
 $('controls').hidden=true;$('back').hidden=true;$('hint').hidden=false;$('targets').hidden=false;
 transition(homeAim,homeOffset,homeSpan);
 models.find(m=>m.id===previous)?.button.focus({preventScroll:true});
}
function updatePanel(){
 if(!selected)return;
 const item=LAMPS.find(m=>m.id===selected),s=state[selected];
 const story=storyFor(selected);
 $('lamp-tagline').textContent=story.title;
 $('story-name').textContent=item.name;
 $('story-title').textContent=story.title;
 $('story-text').textContent=story.text;
 $('lamp-name').textContent=item.name;$('lamp-kind').textContent=item.kind;
 $('lamp-price').hidden=!Number.isFinite(item.priceUSD);
 $('lamp-price').textContent=Number.isFinite(item.priceUSD)?`US$ ${item.priceUSD}`:'';
 $('power').setAttribute('aria-checked',String(s.on));$('power').setAttribute('aria-label',`${s.on?'Turn off':'Turn on'} ${item.name}`);
 $('power-label').textContent=s.on?'On':'Off';
 for(const b of temperatureButtons)b.setAttribute('aria-pressed',String(s.on&&b.dataset.temp===s.temperature));
}
function applyLights(animate=true){
 const changes=models.map(item=>{
  const s=state[item.id],color=new THREE.Color(TEMPERATURES[s.temperature].color);
  const on=introPhase==='done'?s.on:introLit.has(item.id);
  item.button.setAttribute('aria-label',`${item.name}, ${on?`on, ${TEMPERATURES[s.temperature].label.toLowerCase()} light`:'off'}`);
  return {item,color,on,fromColor:item.light.color.clone(),fromPower:item.light.intensity,
   shades:item.diffusers.map(m=>({m,color:m.color.clone(),emissive:m.emissive.clone(),power:m.emissiveIntensity}))};
 });
 lighting={start:performance.now(),changes};
 if(!animate||reduceMotion.matches)updateLighting(1);
 dirty=true;requestFrame();
}
function updateLighting(t){
 const e=t*t*(3-2*t);
 for(const {item,color,on,fromColor,fromPower,shades} of lighting.changes){
  item.light.color.lerpColors(fromColor,color,e);
  item.light.intensity=THREE.MathUtils.lerp(fromPower,on?item.power*(item.id.startsWith('pebble')?.06:item.id.startsWith('shibui')?.065:item.id==='shoji'?.018:.06):0,e);
  item.bounce.color.copy(item.light.color).lerp(new THREE.Color('#c4b69b'),.18);
  const radiance=item.light.intensity / item.spillPower;
  item.bounce.color.copy(item.light.color);
  item.bounce.intensity=radiance*item.bouncePower;
  item.wallWash.color.copy(item.light.color);
  item.wallWash.intensity=radiance*item.wallPower;
  for(const {m,color:base,emissive,power} of shades){
   m.emissive.lerpColors(emissive,color,e);m.emissiveIntensity=THREE.MathUtils.lerp(power,on?(item.id.startsWith('pebble')?2.3:item.id==='shoji'?1.35:item.id==='toro'?2.8:item.id.startsWith('shibui')?2.8:2.2):0,e);
   m.color.lerpColors(base,new THREE.Color(on?'#f5f4ef':'#f5f5f2'),e);
  }
 }
 dirty=true;if(t===1)lighting=null;
}
function commit(){
 applyLights();updatePanel();
 const saved=saveState(storage,state);
 $('save-status').textContent=saved?'Saved.':'Your browser cannot save these changes.';
}
$('back').onclick=back;
function moveLamp(step){const i=LAMPS.findIndex(m=>m.id===selected);selectLamp(LAMPS[(i+step+LAMPS.length)%LAMPS.length].id);}
$('previous').onclick=()=>moveLamp(-1);
$('next').onclick=()=>moveLamp(1);
$('power').onclick=()=>{if(selected){state[selected].on=!state[selected].on;sound.play(selected,state[selected].on?'on':'off');commit();}};
for(const b of temperatureButtons)b.onclick=()=>{if(selected){state[selected].temperature=b.dataset.temp;state[selected].on=true;sound.play(selected,'temperature',b.dataset.temp);commit();}};
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||!selected)return;if(e.key==='Escape')back();if(e.key==='ArrowLeft'){e.preventDefault();moveLamp(-1);}if(e.key==='ArrowRight'){e.preventDefault();moveLamp(1);}});
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){state=loadState(storage);applyLights();updatePanel();}});
function updateTargets(){
 for(const item of models){
  projected.copy(item.anchor).project(camera);
  item.button.style.transform=`translate(-50%,-50%) translate(${(projected.x*.5+.5)*innerWidth}px,${(-projected.y*.5+.5)*innerHeight}px)`;
  item.button.hidden=item.id===selected||projected.z>1||projected.z< -1||Math.abs(projected.x)>1.1||Math.abs(projected.y)>1.1;
 }
}
function requestFrame(){if(!frame&&!document.hidden)frame=requestAnimationFrame(render);}
function render(time){
 frame=0;
 // Idle dust is limited to 30 fps; camera and light transitions retain full cadence.
 if(!dirty&&!animation&&!lighting&&!cameraTravel&&lastRender&&time-lastRender<33){requestFrame();return;}
 if(cameraTravel){
  const t=THREE.MathUtils.clamp((time-cameraTravel.start)/cameraTravel.duration,0,1);
  // Uncover the architectural cutaway before lifting through the ceiling.
  const reveal=THREE.MathUtils.smoothstep(t,0,.20);
  room.userData.setInteriorVisibility(1-reveal);
  const travel=THREE.MathUtils.clamp((t-.14)/.86,0,1);
  const e=travel*travel*travel*(travel*(travel*6-15)+10);
  const povAim=entryAim.clone(),povOffset=entryOffset.clone();
  const distance=povOffset.length()*Math.pow(120/povOffset.length(),e);
  const direction=povOffset.clone().normalize().lerp(homeOffset.clone().normalize(),e).normalize();
  const target=povAim.lerp(homeAim,e);
  const startSpan=2*povOffset.length()*Math.tan(THREE.MathUtils.degToRad(entryFov(entryCamera.aspect)/2));
  const span=THREE.MathUtils.lerp(startSpan,homeSpan,e);
  entryCamera.position.copy(target).addScaledVector(direction,distance);
  entryCamera.fov=THREE.MathUtils.radToDeg(2*Math.atan(span/(2*distance)));
  // Tight clipping range preserves depth precision as the lens becomes orthographic.
  // The old .02–2000 range made nearby surfaces fight during the pullback.
  entryCamera.near=Math.max(.08,distance-6);entryCamera.far=distance+7;
  entryCamera.lookAt(target);entryCamera.updateProjectionMatrix();dirty=true;
  if(t===1){cameraTravel=null;scenePass.camera=camera;contactPass.enabled=true;}
 }
 if(animation){
  const t=Math.min(1,(time-animation.start)/animation.duration),e=t*t*t*(t*(t*6-15)+10);
  camera.position.lerpVectors(animation.from,animation.position,e);aim.lerpVectors(animation.fromAim,animation.aim,e);camera.zoom=THREE.MathUtils.lerp(animation.fromZoom,animation.zoom,e);
  camera.lookAt(aim);camera.updateProjectionMatrix();dirty=true;
  if(t===1)animation=null;
 }
 if(lighting)updateLighting(Math.min(1,(time-lighting.start)/240));
 const drifting=selected&&!reduceMotion.matches&&models.some(m=>m.light.intensity>.001);
 if(drifting){dustTime+=Math.min(lastRender?(time-lastRender)/1000:0,.05);dirty=true;}
 lastRender=time;
 if(dirty){
  dust?.update(dustTime,selected,renderer.getPixelRatio());
  composer.render();updateTargets();dirty=false;
 }
 if(animation||lighting||drifting||cameraTravel)requestFrame();
}
async function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#16191a');
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 $('scene').append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showError(new Error('The 3D context was lost.'));});
 camera=new THREE.OrthographicCamera(-1,1,1,-1,.02,40);camera.layers.enable(1);
 const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});
 composer=new EffectComposer(renderer,target);scenePass=new RenderPass(scene,camera);composer.addPass(scenePass);
 const contact=contactPass=new SSAOPass(scene,camera,innerWidth,innerHeight,12);
 contact.kernelRadius=.045;contact.minDistance=.0001;contact.maxDistance=.003;
 composer.addPass(contact);
 composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.2,.65,1.35));
 composer.addPass(new OutputPass());composer.addPass(new SMAAPass());
 const vignette=new ShaderPass(VignetteShader);vignette.uniforms.offset.value=.72;vignette.uniforms.darkness.value=1;composer.addPass(vignette);
 RectAreaLightUniformsLib.init();
 scene.add(new THREE.HemisphereLight(0xffead4,0x59422c,.38));
 const moon=new THREE.DirectionalLight(0xffdfb5,.48);moon.position.set(2,5,1);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});moon.shadow.normalBias=.02;moon.shadow.bias=-.0002;scene.add(moon);
 room=await createRoom(scene,renderer);
 // Prefiltered broad reflections give matte surfaces a readable shape.
 const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
 const environment=pmrem.fromScene(studio,.025);scene.environment=environment.texture;scene.environmentIntensity=.2;
 studio.dispose();pmrem.dispose();
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 await Promise.all(LAMPS.map(async(def)=>{
  const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}models/${def.id}.glb`);
  const group=gltf.scene;group.position.set(...def.position);scene.add(group);
  group.updateMatrixWorld(true);
  const diffusers=[],stoneBounds=new THREE.Box3();
  group.traverse(obj=>{if(!obj.isMesh)return;obj.userData.lampId=def.id;obj.castShadow=true;obj.receiveShadow=true;obj.material=obj.material.clone();
   if(obj.material.name==='diffuser'){if(def.id.startsWith('pebble'))stoneBounds.expandByObject(obj);obj.castShadow=false;obj.receiveShadow=false;obj.material.side=THREE.FrontSide;obj.material.roughness=.72;
    const shellBounds=new THREE.Box3().setFromObject(obj);
    if(def.id.startsWith('shibui'))obj.material.userData.ribbed=true;
    obj.material=createFilament(obj.material,shellBounds);
    diffusers.push(obj.material);}else{obj.material=new THREE.MeshPhysicalMaterial({name:obj.material.name,color:obj.material.name==='sand'?0xd9cbb4:0x65412b,roughness:obj.material.name==='sand'?.85:.4,metalness:0,clearcoat:.16,clearcoatRoughness:.4,envMapIntensity:1.4});}
   excludeRoomBounce(obj.material);
  });
  const bounds=new THREE.Box3().setFromObject(group),anchor=bounds.getCenter(new THREE.Vector3());
  if(def.id==='toro')anchor.y=def.position[1]+1.05;
  if(def.id.startsWith('pebble')&&!stoneBounds.isEmpty())stoneBounds.getCenter(anchor);
  const light=new THREE.PointLight(0xffbc73,def.power,2.7,2);
  light.position.copy(anchor);if(def.id==='shoji')light.position.z+=.035;
  light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.radius=3;light.shadow.camera.near=.015;light.shadow.camera.far=3;light.shadow.bias=-.00015;light.shadow.normalBias=.0004;
  // The static room permits caching all cubemap shadows after first rendering.
  light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;scene.add(light);
  // Broad diffuse spill follows each lamp's power and temperature. Area sources
  // soften the pools without the giant grid shadows of a stronger point light.
  const pebble=def.id.startsWith('pebble'),shibui=def.id.startsWith('shibui');
  const spillPower=def.power*(pebble?.06:shibui?.065:def.id==='shoji'?.018:.06);
  const bouncePower=pebble?2.6:shibui?4.5:def.id==='toro'?3.5:3.0;
  const wallPower=pebble?.6:shibui?4.5:def.id==='shoji'?1.8:5.8;
  const bounce=new THREE.RectAreaLight(0xffbc73,0,pebble?.22:.35,pebble?.18:.3);
  bounce.position.copy(anchor);bounce.position.y+=.12;
  bounce.lookAt(def.position[0],def.position[1]-.2,def.position[2]);
  scene.add(bounce);
  const wallWash=new THREE.RectAreaLight(0xffbc73,0,.5,.55);
  wallWash.position.copy(anchor);wallWash.position.z+=.35;
  if(def.id==='andon'){
   wallWash.position.x+=.25;wallWash.position.z=anchor.z;wallWash.lookAt(-1.77,anchor.y,anchor.z);
  }else wallWash.lookAt(anchor.x,anchor.y,-1.63);
  scene.add(wallWash);
  const button=document.createElement('button');button.className='target';button.dataset.lamp=def.id;button.innerHTML=`<span>${def.name}</span>`;button.onclick=()=>selectLamp(def.id);$('targets').append(button);
  models.push({...def,group,diffusers,light,bounce,wallWash,spillPower,bouncePower,wallPower,button,bounds,anchor});
 }));
 dust=createDust(scene,models);
 // Order keyboard navigation consistently, independent of network completion order.
 for(const def of LAMPS)$('targets').append(models.find(m=>m.id===def.id).button);
 renderer.domElement.style.touchAction='none';
 renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0||introPhase!=='done')return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:orbitYaw,pitch:orbitPitch,moved:false};
  renderer.domElement.setPointerCapture(e.pointerId);
 });
 renderer.domElement.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||!selected||animation)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5)drag.moved=true;
  if(!drag.moved)return;
  orbitYaw=THREE.MathUtils.clamp(drag.yaw-dx*.004,-.55,.55);
  orbitPitch=THREE.MathUtils.clamp(drag.pitch+dy*.003,-.04,.5);orbitProduct();
 });
 renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;
  if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
  if(moved)return;
  pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(scene.children,true)[0];
  if(hit?.object.userData.lampId&&hit.object.userData.lampId!==selected)selectLamp(hit.object.userData.lampId);
 });
 // Populate all shadows once, even for lamps restored as off.
 fit();applyLights(false);composer.render();
 moon.shadow.autoUpdate=false;moon.shadow.needsUpdate=false;
 $('loading').hidden=true;
 document.body.classList.add('introducing');$('enter').hidden=false;$('enter').disabled=false;$('targets').inert=true;
 $('targets').hidden=true;
 entryCamera=new THREE.PerspectiveCamera(entryFov(innerWidth/innerHeight),innerWidth/innerHeight,.08,14);entryCamera.layers.enable(1);
 entryCamera.position.copy(entryAim).add(entryOffset);entryCamera.lookAt(entryAim);
 scenePass.camera=entryCamera;contactPass.enabled=false;
 window.addEventListener('resize',fit);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&introPhase==='playing')finishIntro();if(!document.hidden){lastRender=0;dirty=true;requestFrame();}});
 dirty=true;requestFrame();
}
init().catch(showError);

// Native dialogs keep the room uncluttered and restore keyboard focus on close.
for(const button of document.querySelectorAll('[data-dialog]'))button.onclick=()=>{
 document.getElementById(button.dataset.dialog).showModal();
};
for(const dialog of document.querySelectorAll('.brand-dialog')){
 dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
}

function closeStory(restoreFocus=true){
 $('piece-story').hidden=true;$('story-open').setAttribute('aria-expanded','false');
 if(restoreFocus)$('story-open').focus({preventScroll:true});
}
$('story-open').onclick=()=>{
 const opening=$('piece-story').hidden;
 $('piece-story').hidden=!opening;$('story-open').setAttribute('aria-expanded',String(opening));
 if(opening)$('story-close').focus({preventScroll:true});
};
$('story-close').onclick=()=>closeStory();
window.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!$('piece-story').hidden){event.stopImmediatePropagation();closeStory();}
},true);
