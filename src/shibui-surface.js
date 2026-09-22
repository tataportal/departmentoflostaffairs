import * as THREE from 'three';
import profile from './shibui-profile.json';

// The printing mesh's subpixel corrugation aliases in motion. Use its sampled
// radial silhouette for display, with mipmapped relief instead of tiny faces.
// The print source is untouched. This is a presentation mesh, not a CAD export.
export function replaceShibuiSurface(group,id){
 const removed=[];let material=new THREE.MeshStandardMaterial({color:0xb7b4a8});
 group.traverse(obj=>{if(obj.isMesh&&obj.material.name==='diffuser'){material=obj.material.clone();removed.push(obj);}});
 for(const mesh of removed)mesh.removeFromParent();
 const points=profile.map(([r,y])=>new THREE.Vector2(r,y));
 const inner=[...points].reverse().map(p=>new THREE.Vector2(Math.max(.001,p.x-.0012),p.y));
 const geometry=new THREE.LatheGeometry([...points,...inner,points[0]],128);
 const canvas=document.createElement('canvas');canvas.width=8;canvas.height=2048;
 const ctx=canvas.getContext('2d');
 for(let y=0;y<2048;y++){const v=Math.round(128+45*Math.cos(y/2048*Math.PI*2*86));ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(0,y,8,1);}
 const bump=new THREE.CanvasTexture(canvas);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.anisotropy=8;
 material.bumpMap=bump;material.bumpScale=.00012;material.roughness=.94;material.metalness=0;
 material.name='diffuser';material.side=THREE.FrontSide;
 const positions=id==='shibui'?[.0025]:[.0041,.1344426];
 for(const y of positions){const mesh=new THREE.Mesh(geometry,material.clone());mesh.position.y=y;group.add(mesh);}
}
