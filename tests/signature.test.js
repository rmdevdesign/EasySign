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

test('Adaptive cleanup removes a shaded gray paper gradient without losing a thin dark signature',()=>{
  const width=240,height=100,pixels=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;const paper=Math.round(245-x/width*95);pixels[i]=pixels[i+1]=pixels[i+2]=paper;pixels[i+3]=255;}
  for(let x=20;x<220;x++){const y=45+Math.round(10*Math.sin(x/18));const i=(y*width+x)*4;pixels[i]=20;pixels[i+1]=30;pixels[i+2]=65;}
  const output=removePaper(pixels,width,height,65);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;const ink=x>=20&&x<220&&y===45+Math.round(10*Math.sin(x/18));assert.equal(output[i+3],ink?255:0);}
});

test('Stronger cleanup removes gray residue while preserving solid black strokes',()=>{
  const pixels=new Uint8ClampedArray([255,255,255,255,200,200,200,255,0,0,0,255]);
  const gentle=removePaper(pixels,3,1,10),strong=removePaper(pixels,3,1,100);
  assert.ok(gentle[7]>0);assert.equal(strong[7],0);assert.equal(strong[11],255);
});

test('Maximum cleanup removes dark gray residue while retaining dark signature ink',()=>{
  const pixels=new Uint8ClampedArray([255,255,255,255,145,145,145,255,0,0,0,255]);
  assert.ok(removePaper(pixels,3,1,65)[7]>0);
  const output=removePaper(pixels,3,1,100);assert.equal(output[7],0);assert.equal(output[11],255);
});
