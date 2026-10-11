// Local light-paper removal. Keeps the original alpha and separates dark/colored ink.
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
  const threshold = 3 + Math.max(0,Math.min(100,strength))*.45;
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const difference = Math.max(paperLight-light(i),...paper.map((value,c)=>value-pixels[i+c]));
    const alpha = Math.max(0,Math.min(1,(difference-threshold)/45));
    result[i+3] = Math.round(pixels[i+3]*alpha);
    if (alpha > 0 && alpha < 1) for(let c=0;c<3;c++) result[i+c]=Math.max(0,Math.min(255,(pixels[i+c]-(1-alpha)*paper[c])/alpha));
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
