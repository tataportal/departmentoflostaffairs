"""Export lightweight copies of the existing lamp assemblies; never change source files."""
import bpy,json,math,hashlib,sys
from pathlib import Path
from mathutils import Matrix,Vector,Euler
ROOT=Path(__file__).resolve().parents[2]/'Lamparas LED'
OUT=Path(__file__).resolve().parents[1]/'public/models'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
materials={}
for name,col in [('frame',(.12,.065,.029,1)),('diffuser',(.88,.85,.76,1)),('sand',(.51,.44,.31,1))]:
 mat=bpy.data.materials.new(name);mat.diffuse_color=col;mat.use_nodes=True
 bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=col;bs.inputs['Roughness'].default_value=.8
 materials[name]=mat
cache={}
def mesh_for(p):
 path=p.get('mesh_file',p['file'])
 if path in cache:return cache[path]
 if path.endswith('.obj'):bpy.ops.wm.obj_import(filepath=path)
 else:bpy.ops.wm.stl_import(filepath=path)
 obj=bpy.context.object
 bpy.context.view_layer.objects.active=obj
 obj.data.transform(Matrix.Scale(.001,4))
 for face in obj.data.polygons:face.use_smooth=True
 obj.data.set_sharp_from_angle(angle=math.radians(35))
 mesh=obj.data;cache[path]=mesh;bpy.data.objects.remove(obj,do_unlink=True)
 return mesh
configs=[('andon','Produccion_Optimizada_025','01_Andon_Frame'),('toro','Produccion_Optimizada_025','03_Toro_Stack'),('shoji','Produccion_Optimizada_025','04_Shoji_Wall'),('pebble','Pebble_Pared_Gruesa_v10','01_Pebble_Jardin'),('pebble-compact','Pebble_Pared_Gruesa_v10','02_Pebble_Compacta'),('shibui','SHIBUI_Rosca_025','SHIBUI_Individual'),('shibui-stack','SHIBUI_Rosca_025','SHIBUI_Stack_2_LED')]
filters=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
audit=json.loads((OUT/'provenance.json').read_text()) if filters else []
for id,folder,key in configs:
 if filters and id not in filters:continue
 audit=[a for a in audit if a['id']!=id]
 d=json.loads((ROOT/folder/'manifest.json').read_text())
 instances=d.get('assemblies',{}).get(key) or [i for i in d['instances'] if i['model']==key]
 objs=[]
 for i in instances:
  part=i['part']
  if part.startswith('00_') or 'Bandeja_LED' in part:continue
  p=d['parts'][part];mesh=mesh_for(p).copy()
  material='sand' if 'Arena' in part else ('diffuser' if any(s in part for s in ['Difusor','Pantalla','Piedra']) else 'frame')
  mesh.materials.clear();mesh.materials.append(materials[material])
  obj=bpy.data.objects.new(part,mesh);scene.collection.objects.link(obj)
  tr=Matrix.LocRotScale(Vector(i['location']),Euler(tuple(math.radians(v) for v in i['rotation'])).to_quaternion(),Vector((1,1,1)))@Matrix.Rotation(math.radians(i.get('spin',0)),4,'Z')
  if id=='shoji':tr=Matrix.Translation((0,0,120))@Matrix.Rotation(math.pi/2,4,'X')@tr
  tr.translation*=.001;obj.matrix_world=tr;objs.append(obj)
 bpy.context.view_layer.update()
 lo=Vector((float('inf'),)*3);hi=Vector((-float('inf'),)*3)
 for o in objs:
  for corner in o.bound_box:
   v=o.matrix_world@Vector(corner)
   for a in range(3):lo[a]=min(lo[a],v[a]);hi[a]=max(hi[a],v[a])
 center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 for o in objs:o.location-=center
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0]
 bpy.ops.object.join()
 dest=OUT/f'{id}.glb'
 bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
 audit.append({'id':id,'source':str((ROOT/folder/'manifest.json').relative_to(ROOT.parent)),'source_sha256':hashlib.sha256((ROOT/folder/'manifest.json').read_bytes()).hexdigest(),'dimensions_m':list(hi-lo),'triangles':sum(len(o.data.polygons) for o in bpy.context.selected_objects),'bytes':dest.stat().st_size})
 bpy.ops.object.delete()
 print('EXPORTED',id,flush=True)
(OUT/'provenance.json').write_text(json.dumps(audit,indent=2))
