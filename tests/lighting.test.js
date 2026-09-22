import test from 'node:test';
import assert from 'node:assert/strict';
import {Color} from 'three';
import {TEMPERATURES} from '../src/state.js';
import {emissionGain,luminance} from '../src/lighting.js';

test('every light temperature reaches the same bloom luminance while retaining its hue',()=>{
 const neutral=new Color(TEMPERATURES.neutral.color);
 for(const {color} of Object.values(TEMPERATURES)){
  const source=new Color(color),output=source.clone().multiplyScalar(emissionGain(source));
  assert.ok(Math.abs(luminance(output)-luminance(neutral))<1e-10);
  assert.ok(Math.abs(output.r/output.b-source.r/source.b)<1e-10);
 }
 assert.equal(emissionGain(neutral),1);
});
