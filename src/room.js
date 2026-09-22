import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

import {createSurfaceLibrary,surfaceUV} from './materials.js';

export async function createRoom(scene,renderer){
 const surfaces=await createSurfaceLibrary(Math.min(8,renderer.capabilities.getMaxAnisotropy()));
 const {wood,dark,edge,wall,fabric,fabricDark,tatami,paper,binding}=surfaces;
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
 const black=surfaces.ceramic;
 const room=new THREE.Group();scene.add(room);
 function box(w,h,d,x,y,z,m=wood,r=0){
  const radius=r||(m.userData.surface==='wood'?Math.min(.004,Math.min(w,h,d)*.15):0);
  const geometry=radius?new RoundedBoxGeometry(w,h,d,3,radius):new THREE.BoxGeometry(w,h,d);
  surfaceUV(geometry,m,[w,h,d],[x,y,z]);
  const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;room.add(mesh);return mesh;
 }
 function seat(w,h,d,x,y,z,m,rotation=0){
  const pillow=box(w,h,d,x,y,z,m,Math.min(h*.46,.055));
  const p=pillow.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const px=p.getX(i)/(w/2),pz=p.getZ(i)/(d/2),py=p.getY(i);
   const bulge=.017*(1-px*px)*(1-pz*pz);
   const creases=.0035*Math.sin(px*19+pz*6)*Math.pow(Math.max(Math.abs(px),Math.abs(pz)),5);
   if(py>0)p.setY(i,py+bulge+creases);
  }
  pillow.geometry.computeVertexNormals();pillow.rotation.y=rotation;
  const points=[],radius=.05;
  for(let corner=0;corner<4;corner++){
   const sx=corner===0||corner===3?1:-1,sz=corner<2?1:-1;
   const cx=sx*(w/2-radius),cz=sz*(d/2-radius);
   for(let i=0;i<=8;i++){const a=corner*Math.PI/2+i/8*Math.PI/2;points.push(new THREE.Vector3(cx+radius*Math.cos(a),-h*.06,cz+radius*Math.sin(a)));}
  }
  const seam=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),96,.0022,5,true),binding);
  seam.position.set(x,y,z);seam.rotation.y=rotation;room.add(seam);return pillow;
 }
 function cylinder(top,bottom,h,x,y,z,m=black){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,36),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;room.add(mesh);return mesh;}
 // Floating, open-front architectural model. Dimensions are metres.
 box(3.65,.2,3.45,0,-.025,0,edge,.025);
 for(let i=0;i<24;i++)box(.147,.06,3.35,-1.725+i*.15,.1,0,i%4===0?dark:wood);
 box(3.67,.035,.055,0,.138,1.7,dark);
 box(.055,.035,3.45,1.805,.138,0,dark);
 // Walls end at the open edges. Framing is exposed in the cutaway.
 box(.095,2.04,3.35,-1.77,1.13,0,wall);
 box(3.57,2.04,.095,0,1.13,-1.63,wall);
 for(const z of [-1.61,-.55,.55,1.63])box(.11,2.12,.11,-1.7,1.15,z,dark);
 for(const x of [-1.7,-.8,.12,1.73])box(.10,2.12,.12,x,1.15,-1.57,dark);
 box(.14,.12,3.42,-1.7,2.19,0,dark);
 box(3.52,.12,.16,.015,2.19,-1.57,dark);
 box(3.48,.13,.1,0,.19,-1.54,dark);
 box(.1,.13,3.25,-1.69,.19,0,dark);
 // Recessed shoji window across the right half of the back wall.
 box(1.35,1.38,.032,.92,1.36,-1.565,paper);
 for(let i=0;i<7;i++)box(.019,1.43,.028,.26+i*.22,1.36,-1.535,dark);
 for(let i=0;i<6;i++)box(1.38,.019,.028,.92,.67+i*.276,-1.53,dark);
 // A quiet hanging textile in the left niche.
 const hanging=box(.016,.9,.48,-1.705,1.28,-.04,fabric);
 for(const y of [.82,1.74])box(.032,.027,.53,-1.68,y,-.04,dark);
 // Small ink-like vertical stroke on fabric (geometry is part of the textile).
 const ink=box(.005,.44,.018,-1.693,1.32,-.04,mat('#686e61'));ink.rotation.x=.13;
 // Tatami island, wooden border, low conversation seating.
 box(2.3,.024,1.95,-.08,.151,.34,dark);
 for(let x=0;x<2;x++)for(let z=0;z<2;z++){
  const mx=-.64+x*1.13,mz=-.137+z*.96;
  box(1.11,.018,.935,mx,.172,mz,tatami);
  for(const side of [-1,1])box(.027,.005,.934,mx+side*.54,.183,mz,binding,.002);
 }
 box(.57,.14,1.6,-1.18,.24,-.08,dark,.02);
 for(let i=0;i<3;i++){
  seat(.54,.115,.47,-1.16,.365,-.56+i*.5,fabric);
  const cushion=box(.12,.36,.47,-1.4,.49,-.56+i*.5,fabric,.045);cushion.rotation.z=-.1;
 }
 // Low table and its joinery.
 box(.98,.052,.7,-.12,.379,.22,dark,.02);
 for(const x of [-.48,.24])for(const z of [-.02,.46])box(.055,.17,.055,x,.269,z,dark);
 box(.66,.027,.04,-.12,.2,.42,dark);
 // Side table for Andon.
 box(.34,.036,.34,-1.24,.532,.98,dark,.012);
 for(const x of [-1.36,-1.12])for(const z of [.86,1.10])box(.036,.38,.036,x,.322,z,dark);
 // Credenza for SHIBUI, shallow enough to preserve the room's scale.
 box(1.42,.055,.38,.82,.6225,-1.25,dark,.012);
 box(1.36,.38,.34,.82,.405,-1.25,wood,.008);
 for(let i=0;i<27;i++)box(.012,.33,.012,.16+i*.05,.43,-1.071,dark);
 for(const x of [.23,1.4])box(.05,.16,.24,x,.19,-1.25,dark);
 // Foreground stool with compact Pebble.
 cylinder(.23,.24,.045,.75,.4725,.95,dark);
 for(let i=0;i<3;i++){let a=i*Math.PI*2/3;box(.038,.27,.038,.75+Math.cos(a)*.15,.315,.95+Math.sin(a)*.15,dark);}
 // Tea objects stay on the table; keep the foreground free of spare seating.
 cylinder(.054,.043,.03,.15,.42,.07,black);
 cylinder(.043,.03,.043,.15,.45,.07,black);
 cylinder(.03,.023,.027,.11,.436,.34,black);
 cylinder(.03,.023,.027,.21,.436,.34,black);
 // A single sculptural vase in the rear niche with thin branches.
 const points=[new THREE.Vector2(0,0),new THREE.Vector2(.085,0),new THREE.Vector2(.11,.07),new THREE.Vector2(.095,.18),new THREE.Vector2(.035,.23),new THREE.Vector2(.031,.26)];
 const vase=new THREE.Mesh(new THREE.LatheGeometry(points,32),surfaces.ceramic);vase.position.set(-1.5,.13,-1.22);vase.castShadow=true;vase.receiveShadow=true;room.add(vase);
 const branchMat=mat('#454238');
 function branch(a,b,r=.004){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),dir=to.clone().sub(from);const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r,dir.length(),5),branchMat);m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());room.add(m);}
 for(let i=0;i<5;i++){let end=[-1.5+(i-2)*.07,.8+(i%3)*.09,-1.2+Math.sin(i*3)*.1];branch([-1.5,.36,-1.22],end);for(let j=0;j<3;j++){let p=[end[0]+.08*Math.cos(j+i),end[1]-.15+j*.04,end[2]+.08*Math.sin(j+i)];branch([end[0],end[1]-.2,end[2]],p,.002);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.027,7,5),mat('#525e48'));leaf.scale.set(.45,1,.55);leaf.rotation.z=i+j;leaf.position.set(...p);room.add(leaf);}}
 return room;
}
