// Estimate paper locally so uneven lighting is not mistaken for ink.
export function removePaper(pixels, width, height, strength = 50) {
  const result = new Uint8ClampedArray(pixels);
  const border = [];
  const light = (i) => pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722;
  const step = Math.max(1, Math.floor((width + height) / 500));
  for (let x = 0; x < width; x += step) for (const y of [0, height - 1]) { const i = (y * width + x) * 4; if (pixels[i + 3] > 240) border.push({ i, l: light(i) }); }
  for (let y = 0; y < height; y += step) for (const x of [0, width - 1]) { const i = (y * width + x) * 4; if (pixels[i + 3] > 240) border.push({ i, l: light(i) }); }
  border.sort((a,b)=>a.l-b.l);
  const background = border.length ? border[Math.floor((border.length - 1) * .8)] : null;
  const paper = background ? [pixels[background.i],pixels[background.i+1],pixels[background.i+2]] : [255,255,255];
  const paperLight = paper[0]*.2126+paper[1]*.7152+paper[2]*.0722;
  const tile = Math.max(24,Math.min(80,Math.round(Math.min(width,height)/8)));
  const columns=Math.ceil(width/tile),rows=Math.ceil(height/tile);
  const field=new Float32Array(columns*rows*3);
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<columns;gx++){
    const histogram=new Uint32Array(256);let count=0;
    const startX=gx*tile,endX=Math.min(width,startX+tile),startY=gy*tile,endY=Math.min(height,startY+tile);
    for(let y=startY;y<endY;y++)for(let x=startX;x<endX;x++){const i=(y*width+x)*4;if(pixels[i+3]>240){histogram[Math.round(light(i))]++;count++;}}
    let cutoff=255,total=0;while(cutoff>0&&total<count*.2){total+=histogram[cutoff];cutoff--;}
    cutoff++;
    let r=0,g=0,b=0,samples=0;
    for(let y=startY;y<endY;y++)for(let x=startX;x<endX;x++){const i=(y*width+x)*4;if(pixels[i+3]>240&&light(i)>=cutoff){r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];samples++;}}
    const offset=(gy*columns+gx)*3;
    // A tile occupied entirely by dark ink must not become its own background.
    const valid=samples>0&&(r*.2126+g*.7152+b*.0722)/samples>=paperLight*.6;
    field[offset]=valid?r/samples:paper[0];field[offset+1]=valid?g/samples:paper[1];field[offset+2]=valid?b/samples:paper[2];
  }
  const threshold = 6 + Math.max(0,Math.min(100,strength))*.65;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;if(!pixels[i+3])continue;
    const fx=Math.max(0,Math.min(columns-1,(x+.5)/tile-.5)),fy=Math.max(0,Math.min(rows-1,(y+.5)/tile-.5));
    const x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(columns-1,x0+1),y1=Math.min(rows-1,y0+1),tx=fx-x0,ty=fy-y0;
    const a=(y0*columns+x0)*3,b=(y0*columns+x1)*3,c=(y1*columns+x0)*3,d=(y1*columns+x1)*3;
    const bgR=(field[a]*(1-tx)+field[b]*tx)*(1-ty)+(field[c]*(1-tx)+field[d]*tx)*ty;
    const bgG=(field[a+1]*(1-tx)+field[b+1]*tx)*(1-ty)+(field[c+1]*(1-tx)+field[d+1]*tx)*ty;
    const bgB=(field[a+2]*(1-tx)+field[b+2]*tx)*(1-ty)+(field[c+2]*(1-tx)+field[d+2]*tx)*ty;
    const difference=Math.max(bgR-pixels[i],bgG-pixels[i+1],bgB-pixels[i+2]);
    const alpha=Math.max(0,Math.min(1,(difference-threshold)/28));
    result[i+3]=Math.round(pixels[i+3]*alpha);
    if(alpha>0&&alpha<1){result[i]=Math.max(0,Math.min(255,(pixels[i]-(1-alpha)*bgR)/alpha));result[i+1]=Math.max(0,Math.min(255,(pixels[i+1]-(1-alpha)*bgG)/alpha));result[i+2]=Math.max(0,Math.min(255,(pixels[i+2]-(1-alpha)*bgB)/alpha));}
  }
  return result;
}

export function inkBounds(pixels, width, height) {
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) if(pixels[(y*width+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)return null;
  const padding=Math.max(3,Math.ceil(Math.max(right-left,bottom-top)*.025));
  left=Math.max(0,left-padding);top=Math.max(0,top-padding);right=Math.min(width-1,right+padding);bottom=Math.min(height-1,bottom+padding);
  return {left,top,width:right-left+1,height:bottom-top+1};
}
