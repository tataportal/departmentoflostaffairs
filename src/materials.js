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
   // Remove the strong orange cast and baked contrast from the material tile.
   const data=ctx.getImageData(0,0,size,size);
   for(let i=0;i<data.data.length;i+=4){const l=.2126*data.data[i]+.7152*data.data[i+1]+.0722*data.data[i+2];
    for(let channel=0;channel<3;channel++)data.data[i+channel]=128+(.58*data.data[i+channel]+.42*l-128)*.78;
   }ctx.putImageData(data,0,0);
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
 function surface(kind,color,options={}){
  const m=maps[kind];
  const specs={wood:{roughness:.82,bumpScale:.00028,clearcoat:.12,clearcoatRoughness:.62},linen:{roughness:1,bumpScale:.00065,sheen:1,sheenColor:new THREE.Color('#d4cfba'),sheenRoughness:.88},tatami:{roughness:1,bumpScale:.0008},plaster:{roughness:1,bumpScale:.00025}};
  const material=new THREE.MeshPhysicalMaterial({color,map:m.color,bumpMap:m.bump,roughnessMap:m.rough,...specs[kind],...options});
  material.userData.surface=kind;return material;
 }
 return {wood:surface('wood','#d5c6b3'),dark:surface('wood','#8e8172'),edge:surface('wood','#615b50'),wall:surface('plaster','#e0dace'),fabric:surface('linen','#d0cbb8'),fabricDark:surface('linen','#828d78'),tatami:surface('tatami','#c3c6a0'),paper:surface('plaster','#d7dbc9',{bumpScale:.00035}),ceramic:surface('plaster','#545d50',{roughness:.72,clearcoat:.12,clearcoatRoughness:.6}),binding:surface('linen','#4c574b',{bumpScale:.001})};
}

// Metre-scaled box projection. Grain follows each part's long axis instead
// of stretching one bitmap over every face irrespective of its dimensions.
export function surfaceUV(geometry,material,dimensions,offset=[0,0,0]){
 const kind=material.userData.surface;if(!kind)return;
 const pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv;
 const tile=kind==='wood'?[.38,1.4]:kind==='linen'?[.32,.32]:kind==='tatami'?[.38,.38]:[.65,.65];
 for(let i=0;i<pos.count;i++){
  const n=[Math.abs(norm.getX(i)),Math.abs(norm.getY(i)),Math.abs(norm.getZ(i))];
  const normalAxis=!geometry.index&&geometry.groups.length===6?Math.floor(i/(pos.count/6)/2):n.indexOf(Math.max(...n));let axes=[0,1,2].filter(a=>a!==normalAxis);
  if(kind==='wood'&&dimensions[axes[0]]>dimensions[axes[1]])axes.reverse();
  const xyz=[pos.getX(i),pos.getY(i),pos.getZ(i)];
  uv.setXY(i,(xyz[axes[0]]+offset[axes[0]])/tile[0],(xyz[axes[1]]+offset[axes[1]])/tile[1]);
 }
 uv.needsUpdate=true;
}
