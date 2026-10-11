import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adjustCrop,cropPixels} from '../src/crop.js';
test('Each edge moves independently; corners move two edges',()=>{
  const original={left:0,top:0,right:1,bottom:1};
  assert.deepEqual(adjustCrop(original,'w',.2,.3),{left:.2,top:0,right:1,bottom:1});
  assert.deepEqual(adjustCrop(original,'se',-.2,-.3),{left:0,top:0,right:.8,bottom:.7});
  assert.deepEqual(original,{left:0,top:0,right:1,bottom:1});
});
test('Crop handles cannot cross or extend past the original image',()=>{
  const crop=adjustCrop({left:.1,top:.1,right:.9,bottom:.9},'nw',2,-2);
  assert.equal(crop.top,0);assert.ok(crop.left<crop.right);
});
test('Normalized crop maps back to original pixels after previous automatic cropping',()=>{
  assert.deepEqual(cropPixels({left:30,top:20,width:200,height:100},{left:.1,top:.2,right:.9,bottom:.8}),{left:50,top:40,width:160,height:60});
});
