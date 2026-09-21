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
  const w = overlay.width, h = overlay.height;
  ctx.clearRect(0,0,overlay.width,overlay.height);
  slots.forEach((slot,idx)=>{
    if(!slot) return;
    slot.regions.forEach(r=>{
      if (!r.type|| r.type === "rect"){
        drawRect(ctx, r, w, h, SLOT_UI_COLORS[idx], idx === activeIndex, false);
      }else if (r.type==="polygon"){
        drawPolygon(ctx, r, w, h, SLOT_UI_COLORS[idx], idx===activeIndex);
      }
    });
  });
  if(draft) {
    if (draft.type === "polygon" || Array.isArray(draft.points)) {
      drawDraftPolygon(
        ctx, draft, w, h, SLOT_UI_COLORS[activeIndex]
      );
    } else if (draft.width !== undefined) {
      drawRect(
        ctx, draft, w, h,
        SLOT_UI_COLORS[activeIndex], true, true
      );
    }
}}

function drawPolygon(ctx, poly, w, h, color, active=false){
  const pts = poly.points;
  if(!pts || poly.points.length<3) return;
  ctx.save();
  ctx.fillStyle = color + (active? "30" : "18");
  ctx.strokeStyle = color;
  ctx.lineWidth = active? Math.max(2, w/700) :Math.max(1.25, w/1000);
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(poly.points[0][0]*w, poly.points[0][1]*h);
  for(let i = 1; i < poly.points.length; i++){
    ctx.lineTo(poly.points[i][0] * w, poly.points[i][1] * h);
  }
  ctx.closePath();
  ctx.fill("evenodd");
  ctx.stroke();
  
  // 頂点を小さく描く（操作感のため）
  ctx.fillStyle = color;
  const r = Math.max(2.5, w/500);
  for(const [px, py] of poly.points){
    ctx.beginPath();
    ctx.arc(px * w, py * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawDraftPolygon(ctx, draft, w, h, color) {
  const pts = draft.points;
  if (!pts || pts.length === 0) return;

  ctx.save();

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, w/600);
  ctx.setLineDash([
    Math.max(5, w/250),
    Math.max(3, w/300)
  ]);

  // 配置済みの頂点を順につなぐ
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * w, pts[0][1] * h);

  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0] * w, pts[i][1] * h);
  }

  // マウス位置が渡された場合は、そこまで仮の辺を描く
  if (draft.mouse) {
    ctx.lineTo(draft.mouse.x * w, draft.mouse.y * h);
  }

  ctx.stroke();

  // 頂点の丸は実線で描く
  ctx.setLineDash([]);

  const r = Math.max(3, w/400);

  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i];

    ctx.beginPath();
    ctx.arc(
      px * w,
      py * h,
      i === 0 ? r * 1.4 : r,
      0,
      Math.PI * 2
    );

    // 始点を見分けられるようにする
    ctx.fillStyle = i === 0 ? "#ffffff" : color;
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export function pointInPolygon(px, py, points){
  let inside = false;
  for(let i = 0, j = points.length - 1; i < points.length; j = i++){
    const xi = points[i][0], yi = points[i][1];
    const xj = points[j][0], yj = points[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if(intersect) inside = !inside;
  }
  return inside;
}