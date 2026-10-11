import { removePaper, inkBounds } from './signature.js';

export function setupInlineSignatureImport({input,onConfirm,onError}){
  input.accept='image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
  let replacementId=null;
  input.onchange=async(e)=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    if(file.size>10*1024*1024)return onError('Choisissez une image de moins de 10 Mo.');
    let url;
    try{
      if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('format');
      url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();
      const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const original=ctx.getImageData(0,0,canvas.width,canvas.height);let transparent=false;for(let i=3;i<original.data.length;i+=4)if(original.data[i]<240){transparent=true;break;}
      const signature={original,clean:!transparent,strength:65};
      let rendered;
      try{rendered=renderSignature(signature);}catch{signature.clean=false;rendered=renderSignature(signature);onError('Le nettoyage masquait les traits. L’image est conservée ; ajustez le nettoyage sur le document.');}
      onConfirm({...rendered,signature,replacementId});
    }catch{onError('Choisissez une signature PNG, JPG ou WebP sur fond clair.');}
    finally{if(url)URL.revokeObjectURL(url);}
  };
  return{open(id=null){replacementId=id;input.click();}};
}

export function renderSignature({original,clean,strength,crop}){
  const region=crop||{left:0,top:0,width:original.width,height:original.height};
  const {width,height}=region;let input=original.data;
  if(crop){input=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++){const start=((region.top+y)*original.width+region.left)*4;input.set(original.data.subarray(start,start+width*4),y*width*4);}}
  const pixels=clean?removePaper(input,width,height,strength):input.slice();
  const ink=inkBounds(pixels,width,height);if(!ink)throw Error('Aucun trait visible');
  const bounds=crop?{left:0,top:0,width,height}:ink;
  const full=document.createElement('canvas');full.width=width;full.height=height;full.getContext('2d').putImageData(new ImageData(pixels,width,height),0,0);
  const cropped=document.createElement('canvas');cropped.width=bounds.width;cropped.height=bounds.height;cropped.getContext('2d').drawImage(full,bounds.left,bounds.top,bounds.width,bounds.height,0,0,bounds.width,bounds.height);
  return{data:cropped.toDataURL('image/png'),ratio:bounds.width/bounds.height,bounds:{left:region.left+bounds.left,top:region.top+bounds.top,width:bounds.width,height:bounds.height}};
}
