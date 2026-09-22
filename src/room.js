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
  // Millimetre-scale edge breaks catch light without changing the footprint.
  const edgeRadius={wood:.006,plaster:.0015,tatami:.002,linen:.001}[m.userData.surface]||0;
  const radius=Math.min(r||edgeRadius,Math.min(w,h,d)*(r?.49:.24));
  const geometry=radius?new RoundedBoxGeometry(w,h,d,radius>.005?5:3,radius):new THREE.BoxGeometry(w,h,d);
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
 function cylinder(top,bottom,h,x,y,z,m=black){
  // Revolved quarter-round rims instead of razor-sharp cylinder caps.
  const r=Math.min(m===black?.0018:.004,h*.18,top*.12,bottom*.12);
  const profile=[new THREE.Vector2(0,-h/2)];
  for(let i=0;i<=6;i++){
   const a=-Math.PI/2+i*Math.PI/12;
   profile.push(new THREE.Vector2(bottom-r+r*Math.cos(a),-h/2+r+r*Math.sin(a)));
  }
  for(let i=0;i<=6;i++){
   const a=i*Math.PI/12;
   profile.push(new THREE.Vector2(top-r+r*Math.cos(a),h/2-r+r*Math.sin(a)));
  }
  profile.push(new THREE.Vector2(0,h/2));
  const geometry=new THREE.LatheGeometry(profile,96);
  const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;room.add(mesh);return mesh;
 }

 // A deeper entry apron leaves circulation space around the existing furniture.
 // Extend the architecture toward the open doorway; keep every object in place.
 box(4.25,.2,3.90,.30,-.025,.225,edge,.025);
 for(let i=0;i<28;i++)box(.147,.06,3.80,-1.725+i*.15,.1,.225,i%4===0?dark:wood);
 box(4.27,.035,.055,.30,.138,2.15,dark);
 box(.055,.035,3.90,2.405,.138,.225,dark);
 // Walls and beams follow the enlarged perimeter.
 box(.095,2.04,3.80,-1.77,1.13,.225,wall);
 box(4.17,2.04,.095,.30,1.13,-1.63,wall);
 for(const z of [-1.61,-.55,.55,2.08])box(.11,2.12,.11,-1.7,1.15,z,dark);
 for(const x of [-1.7,-.8,.12,1.73,2.33])box(.10,2.12,.12,x,1.15,-1.57,dark);
 box(.14,.12,3.87,-1.7,2.19,.225,dark);
 box(4.12,.12,.16,.315,2.19,-1.57,dark);
 box(4.08,.13,.1,.30,.19,-1.54,dark);
 box(.1,.13,3.70,-1.69,.19,.225,dark);
 // Complete interior for the eye-level entrance. Inward-facing surfaces close
 // the ceiling and the two cutaway sides instead of exposing the black void.
 const enclosure=new THREE.Group();room.add(enclosure);
 const enclosureMaterials=[];
 function fadeMaterial(source){
  const m=source.clone();m.onBeforeCompile=source.onBeforeCompile;
  m.customProgramCacheKey=source.customProgramCacheKey;
  m.transparent=true;m.depthWrite=false;enclosureMaterials.push(m);return m;
 }
 function interiorPlane(w,h,position,rotation,material){
  const m=fadeMaterial(material);
  const geometry=new THREE.PlaneGeometry(w,h);surfaceUV(geometry,m,[w,h,.01]);
  const mesh=new THREE.Mesh(geometry,m);
  mesh.position.set(...position);mesh.rotation.set(...rotation);
  mesh.receiveShadow=true;mesh.renderOrder=1;enclosure.add(mesh);return mesh;
 }
 interiorPlane(4.18,3.80,[.30,2.235,.225],[Math.PI/2,0,0],wall);
 interiorPlane(3.80,2.10,[2.385,1.185,.225],[0,-Math.PI/2,0],wall);
 interiorPlane(4.18,2.10,[.30,1.185,2.125],[0,Math.PI,0],wall);
 // Shoji panels and timber joinery continue around the entrance-side wall.
 function enclosureBox(w,h,d,x,y,z,material=dark){
  const mesh=box(w,h,d,x,y,z,material);
  mesh.material=fadeMaterial(material);mesh.castShadow=false;mesh.renderOrder=material===paper?2:3;enclosure.attach(mesh);return mesh;
 }
 for(const x of [-1.68,-.34,1.0,2.32])enclosureBox(.075,2.10,.07,x,1.185,2.07);
 for(const y of [.20,2.17])enclosureBox(4.12,.08,.07,.32,y,2.07);
 for(const x of [-1.01,.33,1.66]){
  enclosureBox(1.24,1.84,.025,x,1.18,2.085,paper);
  for(let i=-2;i<=2;i++)enclosureBox(.018,1.84,.023,x+i*.245,1.18,2.055);
  for(let i=0;i<6;i++)enclosureBox(1.24,.019,.023,x,.40+i*.31,2.055);
 }
 // Exposed timber overhead supplies scale cues while standing in the doorway.
 for(const x of [-1.1,-.15,.80,1.75]){
  const beam=box(.065,.065,3.80,x,2.20,.225,dark);
  beam.material=fadeMaterial(dark);beam.castShadow=false;beam.renderOrder=3;enclosure.attach(beam);
 }
 room.userData.setInteriorVisibility=value=>{
  enclosure.visible=value>0;
  for(const material of enclosureMaterials)material.opacity=value;
 };
 // Recessed shoji window across the right half of the back wall.
 box(1.35,1.38,.032,.92,1.36,-1.565,paper);
 for(let i=0;i<7;i++)box(.019,1.43,.028,.26+i*.22,1.36,-1.535,dark);
 for(let i=0;i<6;i++)box(1.38,.019,.028,.92,.67+i*.276,-1.53,dark);
 // Full-height shoji bay beside the hanging scroll, matching the reference room.
 box(.027,1.82,1.27,-1.71,1.18,1.33,paper);
 for(const z of [.67,1.99])box(.08,1.96,.065,-1.665,1.18,z,dark);
 for(const y of [.22,2.14])box(.08,.065,1.38,-1.665,y,1.33,dark);
 for(let i=0;i<5;i++)box(.023,1.82,.018,-1.683,1.18,.82+i*.255,dark);
 for(let i=0;i<6;i++)box(.023,.019,1.27,-1.683,.41+i*.31,1.33,dark);
 // A quiet hanging textile in the left niche.
 const hanging=box(.016,.9,.48,-1.705,1.28,-.04,fabric);
 for(const y of [.82,1.74])box(.032,.027,.53,-1.68,y,-.04,dark);
 // User-selected Gohonzon: full image, original aspect ratio, no crop or mirroring.
 const artwork=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}art/sgi-gohonzon.jpg`);
 artwork.colorSpace=THREE.SRGBColorSpace;
 artwork.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const artWidth=.43,artHeight=artWidth*artwork.image.height/artwork.image.width;
 const art=new THREE.Mesh(new THREE.PlaneGeometry(artWidth,artHeight),new THREE.MeshStandardMaterial({map:artwork,roughness:1,metalness:0}));
 art.rotation.y=Math.PI/2;art.position.set(-1.695,1.28,-.04);art.receiveShadow=true;
 room.add(art);
 // Tatami island, wooden border, low conversation seating.
 box(2.3,.024,1.95,-.08,.151,.34,dark);
 for(let x=0;x<2;x++)for(let z=0;z<2;z++){
  const mx=-.645+x*1.13,mz=-.14+z*.96;
  box(1.11,.018,.935,mx,.172,mz,tatami);
  for(const side of [-1,1])box(.027,.005,.934,mx+side*.54,.183,mz,binding,.002);
 }
 box(.57,.14,1.6,-1.18,.24,-.08,dark,.02);
 for(let i=0;i<3;i++){
  seat(.54,.115,.47,-1.16,.365,-.58+i*.5,fabric);
  const cushion=box(.12,.36,.47,-1.4,.49,-.58+i*.5,fabric,.045);cushion.rotation.z=-.1;
 }
 // Low table and its joinery.
 box(.98,.052,.7,-.08,.379,-.08,dark,.008);
 for(const x of [-.44,.28])for(const z of [-.32,.16])box(.055,.17,.055,x,.269,z,dark);
 box(.66,.027,.04,-.08,.2,.12,dark);
 // Side table for Andon.
 box(.34,.036,.34,-1.18,.532,.98,dark,.005);
 for(const x of [-1.30,-1.06])for(const z of [.86,1.10])box(.036,.38,.036,x,.322,z,dark);
 // Credenza for SHIBUI, shallow enough to preserve the room's scale.
 box(1.42,.055,.38,.82,.6225,-1.25,dark,.007);
 box(1.36,.38,.34,.82,.405,-1.25,wood,.008);
 for(let i=0;i<27;i++)box(.012,.33,.012,.16+i*.05,.43,-1.071,dark);
 for(const x of [.23,1.4])box(.05,.16,.24,x,.19,-1.25,dark);
 // Foreground stool with compact Pebble.
 cylinder(.23,.24,.045,.82,.4725,.98,dark);
 for(let i=0;i<3;i++){let a=i*Math.PI*2/3;box(.038,.27,.038,.82+Math.cos(a)*.15,.315,.98+Math.sin(a)*.15,dark);}
 // Tea objects stay on the table; keep the foreground free of spare seating.
 cylinder(.054,.043,.03,.19,.42,-.23,black);
 cylinder(.043,.03,.043,.19,.45,-.23,black);
 cylinder(.03,.023,.027,.14,.436,.04,black);
 cylinder(.03,.023,.027,.24,.436,.04,black);
 // A single sculptural vase in the rear niche with thin branches.
 const points=[new THREE.Vector2(0,0),new THREE.Vector2(.085,0),new THREE.Vector2(.11,.07),new THREE.Vector2(.095,.18),new THREE.Vector2(.035,.23),new THREE.Vector2(.031,.26)];
 const vase=new THREE.Mesh(new THREE.LatheGeometry(points,32),surfaces.ceramic);vase.position.set(-1.5,.13,-1.22);vase.castShadow=true;vase.receiveShadow=true;room.add(vase);
 const branchMat=mat('#454238');
 function branch(a,b,r=.004){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),dir=to.clone().sub(from);const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r,dir.length(),5),branchMat);m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());room.add(m);}
 for(let i=0;i<5;i++){let end=[-1.5+(i-2)*.07,.8+(i%3)*.09,-1.2+Math.sin(i*3)*.1];branch([-1.5,.36,-1.22],end);for(let j=0;j<3;j++){let p=[end[0]+.08*Math.cos(j+i),end[1]-.15+j*.04,end[2]+.08*Math.sin(j+i)];branch([end[0],end[1]-.2,end[2]],p,.002);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.027,7,5),mat('#525e48'));leaf.scale.set(.45,1,.55);leaf.rotation.z=i+j;leaf.position.set(...p);room.add(leaf);}}
 return room;
}
