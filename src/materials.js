import * as THREE from 'three';

// Four independent material tiles. Crop at load time to keep each tile's
// mip chain isolated: linen must never bleed into wood at a distance.
export async function createSurfaceLibrary(anisotropy=8){
 const atlas=await new THREE.ImageLoader().loadAsync(`${import.meta.env.BASE_URL}textures/japandi-materials-v1.png`);
 const maps={};
 for(const [kind,x,y] of [['wood',0,0],['linen',1,0],['tatami',0,1],['plaster',1,1]]){
  const size=1024,c=document.createElement('canvas');c.width=c.height=size;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(atlas,x*atlas.width/2,y*atlas.height/2,atlas.width/2,atlas.height/2,0,0,size,size);
  if(kind==='wood'){
   // Keep the warm timber hue while reducing baked contrast.
   const data=ctx.getImageData(0,0,size,size);
   for(let i=0;i<data.data.length;i+=4){const l=.2126*data.data[i]+.7152*data.data[i+1]+.0722*data.data[i+2];
    for(let channel=0;channel<3;channel++)data.data[i+channel]=128+(.82*data.data[i+channel]+.18*l-128)*.78;
   }ctx.putImageData(data,0,0);
  }
  if(kind==='plaster'){
   const data=ctx.getImageData(0,0,size,size);
   for(let i=0;i<data.data.length;i+=4)for(let j=0;j<3;j++)data.data[i+j]=190+(data.data[i+j]-190)*.38;
   ctx.putImageData(data,0,0);
  }
  const color=new THREE.CanvasTexture(c);color.colorSpace=THREE.SRGBColorSpace;
  const heightCanvas=document.createElement('canvas');heightCanvas.width=heightCanvas.height=size;
  const heightCtx=heightCanvas.getContext('2d'),heightData=ctx.getImageData(0,0,size,size);
  const roughCanvas=document.createElement('canvas');roughCanvas.width=roughCanvas.height=size;
  const roughCtx=roughCanvas.getContext('2d'),roughData=ctx.getImageData(0,0,size,size);
  for(let i=0;i<heightData.data.length;i+=4){
   const l=.2126*heightData.data[i]+.7152*heightData.data[i+1]+.0722*heightData.data[i+2];
   const rough=kind==='wood'?160+(255-l)*.23:205+(255-l)*.15;
   for(let j=0;j<3;j++){heightData.data[i+j]=l;roughData.data[i+j]=rough;}
  }
  heightCtx.putImageData(heightData,0,0);roughCtx.putImageData(roughData,0,0);
  const bump=new THREE.CanvasTexture(heightCanvas),rough=new THREE.CanvasTexture(roughCanvas);
  for(const t of [color,bump,rough]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;t.minFilter=THREE.LinearMipmapLinearFilter;}
  maps[kind]={color,bump,rough};
 }
 // Keep the softer paper/ceramic finish separate from the wall's clay relief.
 maps.paper=maps.plaster;
 const loader=new THREE.TextureLoader();
 await Promise.all([['wood','wood_table_001'],['linen','rough_linen'],['plaster','clay_plaster']].map(async([kind,asset])=>{
  const [color,normal,rough]=await Promise.all(['Diffuse','nor_gl','Rough'].map(channel=>loader.loadAsync(`${import.meta.env.BASE_URL}textures/pbr/${asset}_${channel}.jpg`)));
  color.colorSpace=THREE.SRGBColorSpace;
  for(const texture of [color,normal,rough]){
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;
  }
  maps[kind]={color,normal,rough};
 }));
 function surface(kind,color,options={},mapKind=kind){
  const m=maps[mapKind];
  const specs={wood:{roughness:.83,normalScale:new THREE.Vector2(.38,.38),clearcoat:.08,clearcoatRoughness:.65},linen:{roughness:1,normalScale:new THREE.Vector2(.65,.65),sheen:.55,sheenColor:new THREE.Color('#d4cfba'),sheenRoughness:.88},tatami:{roughness:1,bumpScale:.0008},plaster:{roughness:1,normalScale:new THREE.Vector2(.22,.22),bumpScale:.00025}};
  const material=new THREE.MeshPhysicalMaterial({color,map:m.color,normalMap:m.normal||null,bumpMap:m.bump||null,roughnessMap:m.rough,...specs[kind],...options});
  if(mapKind!=='paper'&&['wood','linen','plaster'].includes(kind)){
   const correction=kind==='linen'
    ? 'sampledDiffuseColor.rgb = vec3(dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))) * 1.6;'
    :kind==='wood'
    ? 'sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), 0.38) * 2.3;'
    : 'sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), 0.85) * 2.8;';
   material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;', correction+' diffuseColor *= sampledDiffuseColor;'));
    if(kind==='wood')shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor = max(0.66, roughnessFactor);');
   };
   material.customProgramCacheKey=()=>kind+'-room-pbr-v2';
  }
  material.userData.surface=kind;return material;
 }
 return {wood:surface('wood','#ffffff'),dark:surface('wood','#d5c8b8'),edge:surface('wood','#766b5e'),wall:surface('plaster','#f3e9d8'),fabric:surface('linen','#eee4d3'),fabricDark:surface('linen','#828d78'),tatami:surface('tatami','#d2c6a8'),paper:surface('plaster','#d7dbc9',{bumpScale:.00035},'paper'),ceramic:surface('plaster','#545d50',{roughness:.72,clearcoat:.12,clearcoatRoughness:.6},'paper'),binding:surface('linen','#4c574b',{bumpScale:.001})};
}

// Metre-scaled box projection. Grain follows each part's long axis instead
// of stretching one bitmap over every face irrespective of its dimensions.
export function surfaceUV(geometry,material,dimensions,offset=[0,0,0]){
 const kind=material.userData.surface;if(!kind)return;
 const pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv;
 const tile=kind==='wood'?[.65,1.8]:kind==='linen'?[.45,.45]:kind==='tatami'?[.48,.48]:[1.7,1.7];
 for(let i=0;i<pos.count;i++){
  const n=[Math.abs(norm.getX(i)),Math.abs(norm.getY(i)),Math.abs(norm.getZ(i))];
  const normalAxis=!geometry.index&&geometry.groups.length===6?Math.floor(i/(pos.count/6)/2):n.indexOf(Math.max(...n));let axes=[0,1,2].filter(a=>a!==normalAxis);
  if(kind==='wood'&&dimensions[axes[0]]>dimensions[axes[1]])axes.reverse();
  const variation=kind==='wood'?Math.sin(offset[0]*127.1+offset[1]*311.7+offset[2]*74.7)*.37:0;
  const xyz=[pos.getX(i),pos.getY(i),pos.getZ(i)];
  uv.setXY(i,(xyz[axes[0]]+offset[axes[0]])/tile[0]+variation,(xyz[axes[1]]+offset[axes[1]])/tile[1]+variation*.61);
 }
 uv.needsUpdate=true;
}
