import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,meshopt} from '@gltf-transform/functions';
import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
await Promise.all([MeshoptDecoder.ready,MeshoptEncoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const folder=new URL('../public/models/',import.meta.url);
const audit=JSON.parse(await readFile(new URL('provenance.json',folder),'utf8'));
for(const file of await readdir(folder)){
 if(!file.endsWith('.glb')||(process.argv.length>2&&!process.argv.slice(2).includes(file.replace('.glb',''))))continue;
 const path=new URL(file,folder),before=(await stat(path)).size;
 const doc=await io.read(path.pathname);
 // Compress the original topology; never simplify or weld manufacturing detail.
 await doc.transform(dedup(),prune(),meshopt({encoder:MeshoptEncoder,level:'high'}));
 await io.write(path.pathname,doc);
 const after=(await stat(path)).size;
 audit.find(m=>file===`${m.id}.glb`).web_bytes=after;
 console.log(`${file}: ${before} -> ${after}`);
}
await writeFile(new URL('provenance.json',folder),JSON.stringify(audit,null,2));
