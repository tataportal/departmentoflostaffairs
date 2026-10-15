"""Export final production 3MF meshes, excluding print-bed duplicates and layout.
Usage: blender --background --factory-startup --python scripts/export_final_models.py -- /path/to/3D
"""
import bpy, json, math, sys, hashlib, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from mathutils import Vector
source=Path(sys.argv[sys.argv.index('--')+1]);out=Path(__file__).resolve().parents[1]/'public/models'
ns={'m':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
# Positions in mm, reconstructed from the assembled product (not slicer plates).
# MARU: disc seats at 17.6 mm; three-stone shade at 20 mm, matching MARU.blend.
configs={
 'maru':('MARU.3mf',[(1,'MARU_Base','frame',(0,0,15),False),(2,'MARU_Disc','sand',(0,0,18.8),False),(3,'MARU_Three_Stones','diffuser',(.5632286,-.1088848,52.2397194),False)]),
 'shibui':('SHIBUI.3mf',[(1,'SHIBUI_Shade','diffuser',(0,0,68.0712997),False),(2,'SHIBUI_Base','frame',(0,0,7.73100471),False),(3,'SHIBUI_Top_Ring','frame',(0,0,131.8425995),True)])}
audit=json.loads((out/'provenance.json').read_text())
for id,(filename,parts) in configs.items():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 mats={}
 for name,col in [('frame',(.12,.065,.029,1)),('diffuser',(.88,.85,.76,1)),('sand',(.88,.85,.76,1))]:
  m=bpy.data.materials.new(name);m.diffuse_color=col;m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=col;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.72 if name=='diffuser' else .85;mats[name]=m
 z=zipfile.ZipFile(source/filename);objects=[];triangles=0
 for number,name,material,offset,flip in parts:
  tree=ET.fromstring(z.read(f'3D/Objects/object_{number}.model'))
  vertices=[tuple(float(v.get(a))*.001 for a in ('x','y','z')) for v in tree.findall('.//m:vertex',ns)]
  faces=[tuple(int(t.get(a)) for a in ('v1','v2','v3')) for t in tree.findall('.//m:triangle',ns)]
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();mesh.materials.append(mats[material]);triangles+=len(faces)
  for p in mesh.polygons:p.use_smooth=True
  mesh.set_sharp_from_angle(angle=math.radians(35))
  o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=Vector(offset)*.001
  if flip:o.rotation_euler.x=math.pi
  objects.append(o)
 bpy.context.view_layer.update()
 corners=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box];lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)));hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
 dest=out/f'{id}.glb';bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',export_yup=True,export_apply=True)
 audit=[a for a in audit if a['id'] not in [id,'pebble' if id=='maru' else id]]
 audit.append(dict(id=id,source='3D/'+filename,source_sha256=hashlib.sha256((source/filename).read_bytes()).hexdigest(),dimensions_m=list(hi-lo),triangles=triangles,bytes=dest.stat().st_size,assembly_parts=[dict(name=n,material=m,translation_mm=p,flip_x=f) for _,n,m,p,f in parts]))
 print('FINAL',id,list(hi-lo),triangles,flush=True)
(out/'provenance.json').write_text(json.dumps(audit,indent=2))
