import * as THREE from 'three';

// Satin PLA: a rough dielectric surface over a softly scattering luminous shell.
// The internal-light term is an approximation, not a volumetric path tracer.
export function createFilament(source,bounds){
 const material=new THREE.MeshPhysicalMaterial({
  name:'diffuser',color:0xf5f5f2,roughness:source.userData.ribbed?.42:.48,metalness:0,
  ior:1.46,specularIntensity:.65,clearcoat:.08,clearcoatRoughness:.55,
  transmission:source.userData.ribbed?0:.08,thickness:.0012,attenuationColor:0xf3eee5,attenuationDistance:.018,
  bumpMap:source.bumpMap,bumpScale:source.bumpScale||.00006,
  emissive:0xffffff,emissiveIntensity:0,side:THREE.FrontSide
 });
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 material.onBeforeCompile=shader=>{
  shader.uniforms.shellCenter={value:center};shader.uniforms.shellSize={value:size};
  shader.vertexShader='varying vec3 shellWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n shellWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='varying vec3 shellWorld; uniform vec3 shellCenter; uniform vec3 shellSize;\n'+shader.fragmentShader;
  if(source.userData.ribbed)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n reflectedLight.directDiffuse*=0.12; reflectedLight.directSpecular*=0.65; reflectedLight.indirectDiffuse*=0.55;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   vec3 shellP=(shellWorld-shellCenter)/max(shellSize,vec3(0.001));
   float facing=abs(dot(normal,normalize(vViewPosition)));
   float core=exp(-3.0*dot(shellP.xz,shellP.xz)-1.8*((shellP.y+0.20)*(shellP.y+0.20)));
   float scattering=mix(0.32,1.0,pow(facing,0.65))*(0.48+0.72*core);
   ${source.userData.ribbed?`
   // Shade rib flanks using their real normals; no painted stripes or substitute mesh.
   vec3 upView=normalize(mat3(viewMatrix)*vec3(0.0,1.0,0.0));
   float ribSlope=dot(normal,upView);
   float ribTransmission=mix(0.10,1.0,smoothstep(-0.45,0.65,ribSlope));
   float body=mix(0.28,1.0,pow(facing,0.7));
   totalEmissiveRadiance*=ribTransmission*body*(0.7+0.3*core);
   `:'totalEmissiveRadiance*=scattering;'}
  `);
 };
 material.customProgramCacheKey=()=> source.userData.ribbed?'ribbed-pla-v3':'milky-pla-v1';
 return material;
}
