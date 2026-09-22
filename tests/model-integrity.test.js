import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';

test('compressed web models retain every exported triangle and the emitting stone/shade',async()=>{
 await MeshoptDecoder.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 const models=JSON.parse(await readFile(new URL('../public/models/provenance.json',import.meta.url)));
 for(const model of models){
  const doc=await io.read(new URL(`../public/models/${model.id}.glb`,import.meta.url).pathname);
  const primitives=doc.getRoot().listMeshes().flatMap(mesh=>mesh.listPrimitives());
  const triangles=primitives.reduce((sum,p)=>sum+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0);
  assert.equal(triangles,model.triangles,`${model.id}: topology changed during compression`);
  assert.ok(primitives.some(p=>p.getMaterial()?.getName()==='diffuser'),`${model.id}: missing stone/shade`);
 }
});
