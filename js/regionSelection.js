// 比率座標(0..1)で矩形領域を扱う
export const SLOT_UI_COLORS = ["#62a0ff", "#52d29a", "#f2c94c"];

export function normalizeRect(x0,y0,x1,y1){
  const x=Math.max(0,Math.min(1,Math.min(x0,x1)));
  const y=Math.max(0,Math.min(1,Math.min(y0,y1)));
  const right=Math.max(0,Math.min(1,Math.max(x0,x1)));
  const bottom=Math.max(0,Math.min(1,Math.max(y0,y1)));
  return {x,y,width:right-x,height:bottom-y};
}

export function pointerToNormalized(canvas, event){
  const rect=canvas.getBoundingClientRect();
  return {
    x: Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),
    y: Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))
  };
}

function drawRect(ctx, rect, w, h, color, active=false, dashed=false){
  const x=rect.x*w, y=rect.y*h, rw=rect.width*w, rh=rect.height*h;
  ctx.save();
  ctx.fillStyle = color + (active ? "30" : "18");
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? Math.max(2,w/700) : Math.max(1.25,w/1000);
  ctx.setLineDash(dashed ? [Math.max(6,w/180),Math.max(4,w/260)] : []);
  ctx.fillRect(x,y,rw,rh);
  ctx.strokeRect(x,y,rw,rh);
  ctx.restore();
}

export function drawRegions(overlay, slots, activeIndex, draft=null){
  const ctx=overlay.getContext("2d");
  ctx.clearRect(0,0,overlay.width,overlay.height);
  slots.forEach((slot,idx)=>{
    if(!slot) return;
    slot.regions.forEach(r=>drawRect(ctx,r,overlay.width,overlay.height,SLOT_UI_COLORS[idx],idx===activeIndex,false));
  });
  if(draft) drawRect(ctx,draft,overlay.width,overlay.height,SLOT_UI_COLORS[activeIndex],true,true);
}
