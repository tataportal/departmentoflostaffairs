import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,meshopt} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer';
import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const folder=new URL('../public/models/',import.meta.url);
const audit=JSON.parse(await readFile(new URL('provenance.json',folder),'utf8'));
for(const file of await readdir(folder)){
 if(!file.endsWith('.glb')||(process.argv.length>2&&!process.argv.slice(2).includes(file.replace('.glb',''))))continue;
 const path=new URL(file,folder),before=(await stat(path)).size;
 const doc=await io.read(path.pathname);
 // The web shade is rebuilt from the filtered silhouette; do not ship print corrugations.
 if(file.startsWith('shibui'))for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives())if(primitive.getMaterial()?.getName()==='diffuser')mesh.removePrimitive(primitive);
 await doc.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:file.startsWith('shibui')?1:.4,error:.0001}),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
 await io.write(path.pathname,doc);
 const after=(await stat(path)).size;
 audit.find(m=>file===`${m.id}.glb`).web_bytes=after;
 console.log(`${file}: ${before} -> ${after}`);
}
await writeFile(new URL('provenance.json',folder),JSON.stringify(audit,null,2));
