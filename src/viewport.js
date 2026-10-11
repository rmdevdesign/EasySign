// Keep the same document point under the finger or cursor after zooming.
export function zoomAroundPoint({scrollLeft,scrollTop,stageLeft,stageTop,width,height,x,y,px,py}) {
  return {left:Math.max(0,scrollLeft+stageLeft+x*width-px),top:Math.max(0,scrollTop+stageTop+y*height-py)};
}

export function centerElementInView({ scrollLeft, scrollTop, element, visible }) {
  return {
    left: Math.max(0, scrollLeft + (element.left + element.right - visible.left - visible.right) / 2),
    top: Math.max(0, scrollTop + (element.top + element.bottom - visible.top - visible.bottom) / 2),
  };
}
