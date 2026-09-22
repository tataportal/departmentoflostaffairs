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
import {createFilament} from './filament.js';
import {createDust} from './atmosphere.js';
import {createSound} from './sound.js';
import {createRoom} from './room.js';
import {LAMPS,TEMPERATURES,loadState,saveState,STORAGE_KEY} from './state.js';

const $=id=>document.getElementById(id);
let storage;try{storage=window.localStorage;}catch{storage=null;}
let state=loadState(storage);
const sound=createSound(storage);
function updateSound(){ $('sound').setAttribute('aria-pressed',String(sound.enabled)); $('sound').setAttribute('aria-label',sound.enabled?'Silenciar sonidos':'Activar sonidos'); $('sound').innerHTML=sound.enabled?speakerOn:speakerOff; $('sound').querySelector('svg').setAttribute('aria-hidden','true'); }
updateSound();
$('sound').onclick=()=>{sound.toggle();updateSound();if(sound.enabled)sound.play(selected,'select');};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let selected=null,models=[],animation=null,lighting=null,frame=0,dirty=true;
let camera,renderer,composer,scene,dust;
let dustTime=0,lastRender=0;
let orbitYaw=0,orbitPitch=.12,drag=null;
function orbitProduct(){
 const distance=4;camera.position.set(aim.x+Math.sin(orbitYaw)*Math.cos(orbitPitch)*distance,aim.y+Math.sin(orbitPitch)*distance,aim.z+Math.cos(orbitYaw)*Math.cos(orbitPitch)*distance);camera.lookAt(aim);dirty=true;requestFrame();
}
const aim=new THREE.Vector3(),homeAim=new THREE.Vector3(0,.86,0),homeOffset=new THREE.Vector3(6,4.8,6);
let homeSpan=5.2;
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const projected=new THREE.Vector3();
const temperatureButtons=[...document.querySelectorAll('[data-temp]')];
$('retry').onclick=()=>location.reload();
function announce(message){$('announcement').textContent=message;}
function showError(error){console.error(error);$('loading').hidden=true;$('error').hidden=false;$('hint').hidden=true;$('targets').hidden=true;$('controls').hidden=true;$('back').hidden=true;}
function fit(){
 const w=innerWidth,h=innerHeight,aspect=w/h;
 renderer.setSize(w,h);composer.setSize(w,h);
 homeSpan=Math.max(5.25,5.8/aspect);
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
 // Crop to the light-bearing part of a standing lamp; other lamps remain whole.
 if(id==='toro')center.y=item.position[1]+1.07;
 const portrait=innerWidth/innerHeight<.85;
 const span=({toro:.72,'shibui-stack':.49,shibui:.28,shoji:.45,pebble:.32,'pebble-compact':.26})[id]||.44;
 // Raise view target slightly downward to put the lamp above the bottom controls.
 orbitYaw=0;orbitPitch=id.startsWith('pebble')?.4:id.startsWith('shibui')?.34:.12;
 const direction=new THREE.Vector3(0,Math.sin(orbitPitch),Math.cos(orbitPitch));
 const target=center.clone();target.y-=portrait?span*.06:span*.09;
 transition(target,direction.multiplyScalar(4),span*(portrait?1.28:1),animate);
}
function selectLamp(id){
 const controlHadFocus=$('controls').contains(document.activeElement);
 selected=id;
 document.body.classList.add('focused');
 sound.play(id,'select');
 $('controls').hidden=false;$('back').hidden=false;$('hint').hidden=true;$('targets').hidden=false;
 updatePanel();focus(id);if(!controlHadFocus)$('back').focus({preventScroll:true});
 announce(`${models.find(m=>m.id===id).name}. Controles de luz abiertos.`);
}
function back(){
 const previous=selected;selected=null;document.body.classList.remove('focused');
 $('controls').hidden=true;$('back').hidden=true;$('hint').hidden=false;$('targets').hidden=false;
 transition(homeAim,homeOffset,homeSpan);
 models.find(m=>m.id===previous)?.button.focus({preventScroll:true});
}
function updatePanel(){
 if(!selected)return;
 const item=LAMPS.find(m=>m.id===selected),s=state[selected];
 $('lamp-name').textContent=item.name;$('lamp-kind').textContent=item.kind;
 $('power').setAttribute('aria-checked',String(s.on));$('power').setAttribute('aria-label',`${s.on?'Apagar':'Encender'} ${item.name}`);
 $('power-label').textContent=s.on?'Encendida':'Apagada';
 for(const b of temperatureButtons)b.setAttribute('aria-pressed',String(b.dataset.temp===s.temperature));
}
function applyLights(animate=true){
 const changes=models.map(item=>{
  const s=state[item.id],color=new THREE.Color(TEMPERATURES[s.temperature].color);
  item.button.setAttribute('aria-label',`${item.name}, ${s.on?'encendida':'apagada'}, luz ${TEMPERATURES[s.temperature].label.toLowerCase()}`);
  return {item,color,on:s.on,fromColor:item.light.color.clone(),fromPower:item.light.intensity,
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
  item.light.intensity=THREE.MathUtils.lerp(fromPower,on?item.power*(item.id.startsWith('pebble')?.2:1):0,e);
  item.bounce.color.copy(item.light.color).lerp(new THREE.Color('#c4b69b'),.18);
  item.bounce.intensity=item.light.intensity*(item.id.startsWith('pebble')?0:.28);
  for(const {m,color:base,emissive,power} of shades){
   m.emissive.lerpColors(emissive,color,e);m.emissiveIntensity=THREE.MathUtils.lerp(power,on?(item.id.startsWith('pebble')?1.1:item.id==='shoji'?.32:item.id==='toro'?.72:.48):0,e);
   m.color.lerpColors(base,new THREE.Color(on?'#f5f4ef':'#f5f5f2'),e);
  }
 }
 dirty=true;if(t===1)lighting=null;
}
function commit(){
 applyLights();updatePanel();
 const saved=saveState(storage,state);
 $('save-status').textContent=saved?'Guardado.':'Tu navegador no permite guardar los cambios.';
}
$('back').onclick=back;
function moveLamp(step){const i=LAMPS.findIndex(m=>m.id===selected);selectLamp(LAMPS[(i+step+LAMPS.length)%LAMPS.length].id);}
$('previous').onclick=()=>moveLamp(-1);
$('next').onclick=()=>moveLamp(1);
$('power').onclick=()=>{if(selected){state[selected].on=!state[selected].on;sound.play(selected,state[selected].on?'on':'off');commit();}};
for(const b of temperatureButtons)b.onclick=()=>{if(selected){state[selected].temperature=b.dataset.temp;state[selected].on=true;sound.play(selected,'temperature',b.dataset.temp);commit();}};
window.addEventListener('keydown',e=>{if(!selected)return;if(e.key==='Escape')back();if(e.key==='ArrowLeft'){e.preventDefault();moveLamp(-1);}if(e.key==='ArrowRight'){e.preventDefault();moveLamp(1);}});
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
 if(!dirty&&!animation&&!lighting&&lastRender&&time-lastRender<33){requestFrame();return;}
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
 if(animation||lighting||drifting)requestFrame();
}
async function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#16191a');
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 $('scene').append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showError(new Error('Se perdió el contexto 3D.'));});
 camera=new THREE.OrthographicCamera(-1,1,1,-1,.02,40);camera.layers.enable(1);
 const target=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});
 composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
 const contact=new SSAOPass(scene,camera,innerWidth,innerHeight,12);
 contact.kernelRadius=.12;contact.minDistance=.00015;contact.maxDistance=.009;
 composer.addPass(contact);
 composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.14,.55,1.2));
 composer.addPass(new OutputPass());composer.addPass(new SMAAPass());
 const vignette=new ShaderPass(VignetteShader);vignette.uniforms.offset.value=.72;vignette.uniforms.darkness.value=1;composer.addPass(vignette);
 RectAreaLightUniformsLib.init();
 scene.add(new THREE.HemisphereLight(0xb5c5d3,0x4f3d2a,.6));
 const moon=new THREE.DirectionalLight(0xb5c7df,.42);moon.position.set(2,5,1);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});moon.shadow.normalBias=.02;moon.shadow.bias=-.0002;scene.add(moon);
 await createRoom(scene,renderer);
 // Prefiltered broad reflections give matte surfaces a readable shape.
 const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
 const environment=pmrem.fromScene(studio,.025);scene.environment=environment.texture;scene.environmentIntensity=.16;
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
    diffusers.push(obj.material);}else{obj.material.roughness=.58;obj.material.metalness=0;if(def.id.startsWith('shibui')){obj.material.roughness=.42;}}
  });
  const bounds=new THREE.Box3().setFromObject(group),anchor=bounds.getCenter(new THREE.Vector3());
  if(def.id==='toro')anchor.y=def.position[1]+1.05;
  if(def.id.startsWith('pebble')&&!stoneBounds.isEmpty())stoneBounds.getCenter(anchor);
  const light=new THREE.PointLight(0xffbc73,def.power,2.7,2);
  light.position.copy(anchor);if(def.id==='shoji')light.position.z+=.09;
  light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.radius=3;light.shadow.camera.near=.015;light.shadow.camera.far=3;light.shadow.bias=-.00015;light.shadow.normalBias=.002;
  // The static room permits caching all cubemap shadows after first rendering.
  light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;scene.add(light);
  // Broad, surface-coloured fill approximates first-bounce indirect light.
  // This is an artistic GI approximation, not ray-traced global illumination.
  const bounce=new THREE.RectAreaLight(0xffbc73,0,.7,.6);
  bounce.position.set(def.position[0],def.position[1]+.008,def.position[2]);
  bounce.rotation.x=Math.PI/2;
  if(def.id==='shoji'){bounce.position.copy(anchor);bounce.position.z-=.04;bounce.rotation.set(0,Math.PI,0);}
  scene.add(bounce);
  const button=document.createElement('button');button.className='target';button.dataset.lamp=def.id;button.innerHTML=`<span>${def.name}</span>`;button.onclick=()=>selectLamp(def.id);$('targets').append(button);
  models.push({...def,group,diffusers,light,bounce,button,bounds,anchor});
 }));
 dust=createDust(scene,models);
 // Order keyboard navigation consistently, independent of network completion order.
 for(const def of LAMPS)$('targets').append(models.find(m=>m.id===def.id).button);
 renderer.domElement.style.touchAction='none';
 renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:orbitYaw,pitch:orbitPitch,moved:false};
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
 window.addEventListener('resize',fit);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastRender=0;dirty=true;requestFrame();}});
 dirty=true;requestFrame();
}
init().catch(showError);
