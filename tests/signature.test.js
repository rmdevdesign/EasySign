import {test} from 'node:test';
import assert from 'node:assert/strict';
import {removePaper,inkBounds} from '../src/signature.js';
test('White and off-white paper become transparent while black and blue ink remain',()=>{
  const pixels=new Uint8ClampedArray([250,248,245,255,0,0,0,255,15,35,100,255,245,244,242,255]);
  const output=removePaper(pixels,4,1);
  assert.equal(output[3],0);assert.equal(output[15],0);assert.equal(output[7],255);assert.equal(output[11],255);
  assert.equal(pixels[3],255);
});
test('Original transparency is never increased by paper removal',()=>{
  const pixels=new Uint8ClampedArray([255,255,255,0,0,0,0,80]);
  const output=removePaper(pixels,2,1);assert.equal(output[3],0);assert.equal(output[7],80);
});
test('Empty cleaned images are rejected; crop contains every ink pixel',()=>{
  const pixels=new Uint8ClampedArray(40*30*4);assert.equal(inkBounds(pixels,40,30),null);
  pixels[(12*40+20)*4+3]=255;pixels[(18*40+27)*4+3]=255;
  const bounds=inkBounds(pixels,40,30);assert.ok(bounds.left<=20&&bounds.top<=12);assert.ok(bounds.left+bounds.width>27&&bounds.top+bounds.height>18);
});
