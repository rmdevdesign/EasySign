import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, degrees } from 'pdf-lib';
import { exportPdf } from '../src/pdf.js';

test('Export preserves every page and rotation while embedding text and transparent PNG', async () => {
  const source = await PDFDocument.create();
  for (const angle of [0, 90, 180, 270]) source.addPage([595,842]).setRotation(degrees(angle));
  const bytes = await source.save();
  const geometries = Object.fromEntries([1,2,3,4].map(p=>[p,p%2?{width:595,height:842}:{width:842,height:595}]));
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  const items = [1,2,3,4].flatMap(page=>[
    {type:'text',page,x:.1,y:.2,w:.3,h:.1,size:.02,text:'Élodie\nSignature',font:page===2?'TimesRoman':page===3?'Courier':'Helvetica',lineHeight:1.5},
    {type:'signature',page,x:.2,y:.5,w:.3,h:.1,data:png}
  ]);
  const result = await exportPdf(bytes,items,geometries);
  const output = await PDFDocument.load(result);
  assert.equal(output.getPageCount(),4);
  assert.deepEqual(output.getPages().map(p=>p.getRotation().angle),[0,90,180,270]);
  for(const page of output.getPages()) assert.ok(page.node.Contents());
  assert.ok(result.length>bytes.length);
});

test('Export leaves original bytes intact',async()=>{
  const source=await PDFDocument.create();source.addPage();
  const bytes=await source.save();const copy=bytes.slice();
  await exportPdf(bytes,[],{});
  assert.deepEqual(bytes,copy);
});

test('Empty text drafts are ignored before page lookup or drawing',async()=>{
  const source=await PDFDocument.create();source.addPage();
  const result=await exportPdf(await source.save(),[
    {type:'text',page:99,text:''},
    {type:'text',page:99,text:'  \n\t '}
  ],{});
  const output=await PDFDocument.load(result);
  assert.equal(output.getPageCount(),1);
  assert.equal(output.getPage(0).node.Contents(),undefined);
});
