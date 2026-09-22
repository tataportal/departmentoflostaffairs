import * as THREE from 'three';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';

export function createFocusPass(scene,camera){
 const pass=new BokehPass(scene,camera,{focus:4,aperture:.035,maxblur:.012});
 pass.materialBokeh.defines.PERSPECTIVE_CAMERA=0;
 pass.materialBokeh.fragmentShader=pass.materialBokeh.fragmentShader.replace(
  'float factor = ( focus + viewZ );',
  'float delta = focus + viewZ; float factor = sign(delta) * max(0.0, abs(delta) - 0.12);'
 );
 // Dust must not write solid point squares into the depth buffer.
 const render=pass.render.bind(pass);
 pass.render=(...args)=>{const mask=camera.layers.mask;camera.layers.disable(1);try{render(...args);}finally{camera.layers.mask=mask;}};
 pass.enabled=false;
 return pass;
}

export function createDust(scene,models){
 const clouds=models.map((item,index)=>{
  const positions=[],seeds=[];
  let seed=41+index;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<38;i++){positions.push((random()-.5)*.7,random()*.55,(random()-.5)*.6);seeds.push(random());}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('seed',new THREE.Float32BufferAttribute(seeds,1));
  const material=new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
   uniforms:{time:{value:0},tint:{value:new THREE.Color()},strength:{value:0},pixelScale:{value:1}},
   vertexShader:`attribute float seed; uniform float time; uniform float pixelScale; varying float fade;
    void main(){vec3 p=position; p.y=mod(p.y+time*(0.008+seed*0.006),0.55);
     p.x+=sin(time*0.23+seed*40.0)*0.025; p.z+=cos(time*0.17+seed*30.0)*0.018;
     fade=smoothstep(0.0,0.08,p.y)*(1.0-smoothstep(0.32,0.55,p.y));
     gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);gl_PointSize=(1.2+seed*1.7)*pixelScale;}`,
   fragmentShader:`uniform vec3 tint;uniform float strength;varying float fade;
    void main(){float r=length(gl_PointCoord-0.5)*2.0;float a=exp(-r*r*4.0)*(1.0-smoothstep(0.65,1.0,r));
     gl_FragColor=vec4(tint,a*fade*strength*0.42);}`
  });
  const cloud=new THREE.Points(geometry,material);cloud.position.copy(item.anchor);cloud.position.y-=.04;
  if(item.id==='shoji')cloud.position.z+=.15;
  cloud.layers.set(1);cloud.raycast=()=>{};cloud.frustumCulled=false;scene.add(cloud);
  return {cloud,item,material};
 });
 return {update(time,selected,pixelRatio){for(const {cloud,item,material} of clouds){
  cloud.visible=Boolean(selected)&&item.light.intensity>.001;
  material.uniforms.time.value=time;
  material.uniforms.tint.value.copy(item.light.color);
  material.uniforms.strength.value=item.light.intensity/item.power;
  material.uniforms.pixelScale.value=pixelRatio;
 }}};
}
