import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoomAroundPoint, centerElementInView } from '../src/viewport.js';
test('Zoom keeps the touched PDF point under the same screen position',()=>{
  const result=zoomAroundPoint({scrollLeft:100,scrollTop:200,stageLeft:-76,stageTop:-176,width:1200,height:1600,x:.25,y:.4,px:180,py:250});
  assert.deepEqual(result,{left:144,top:414});
  assert.equal(100-144-76+.25*1200,180);
  assert.equal(200-414-176+.4*1600,250);
});
test('Zooming out does not request negative scroll offsets',()=>{
  assert.deepEqual(zoomAroundPoint({scrollLeft:0,scrollTop:0,stageLeft:10,stageTop:10,width:200,height:300,x:.2,y:.2,px:200,py:200}),{left:0,top:0});
});

test('An element hidden by the mobile sheet moves to the center above it',()=>{
  const result=centerElementInView({scrollLeft:0,scrollTop:100,element:{left:100,right:200,top:650,bottom:690},visible:{left:18,right:372,top:170,bottom:350}});
  assert.equal(result.top,510);
  assert.equal(670-(result.top-100),260);
});
test('A zoomed element clears the desktop settings panel in both axes',()=>{
  const result=centerElementInView({scrollLeft:250,scrollTop:400,element:{left:950,right:1050,top:700,bottom:740},visible:{left:30,right:700,top:180,bottom:800}});
  assert.deepEqual(result,{left:885,top:630});
});
