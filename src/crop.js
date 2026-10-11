export function adjustCrop(initial, handle, dx, dy, minimum = .04) {
  const crop={...initial};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  if(handle.includes('w'))crop.left=clamp(initial.left+dx,0,initial.right-minimum);
  if(handle.includes('e'))crop.right=clamp(initial.right+dx,initial.left+minimum,1);
  if(handle.includes('n'))crop.top=clamp(initial.top+dy,0,initial.bottom-minimum);
  if(handle.includes('s'))crop.bottom=clamp(initial.bottom+dy,initial.top+minimum,1);
  return crop;
}

export function cropPixels(bounds,crop){
  const left=bounds.left+Math.floor(crop.left*bounds.width),top=bounds.top+Math.floor(crop.top*bounds.height);
  const right=bounds.left+Math.ceil(crop.right*bounds.width),bottom=bounds.top+Math.ceil(crop.bottom*bounds.height);
  return{left,top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}
