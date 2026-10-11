import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoomAroundPoint } from '../src/viewport.js';
test('Zoom keeps the touched PDF point under the same screen position',()=>{
  const result=zoomAroundPoint({scrollLeft:100,scrollTop:200,stageLeft:-76,stageTop:-176,width:1200,height:1600,x:.25,y:.4,px:180,py:250});
  assert.deepEqual(result,{left:144,top:414});
  assert.equal(100-144-76+.25*1200,180);
  assert.equal(200-414-176+.4*1600,250);
});
test('Zooming out does not request negative scroll offsets',()=>{
  assert.deepEqual(zoomAroundPoint({scrollLeft:0,scrollTop:0,stageLeft:10,stageTop:10,width:200,height:300,x:.2,y:.2,px:200,py:200}),{left:0,top:0});
});
