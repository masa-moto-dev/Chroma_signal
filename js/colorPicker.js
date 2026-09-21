// クリック位置の5x5平均色を取得
export function sample5x5(canvas, cx, cy){
  const ctx = canvas.getContext("2d", {willReadFrequently:true});
  const x0 = Math.max(0, Math.min(canvas.width - 1, cx - 2));
  const y0 = Math.max(0, Math.min(canvas.height - 1, cy - 2));
  const x1 = Math.max(x0, Math.min(canvas.width - 1, cx + 2));
  const y1 = Math.max(y0, Math.min(canvas.height - 1, cy + 2));
  const d = ctx.getImageData(x0, y0, x1-x0+1, y1-y0+1).data;
  let r=0,g=0,b=0,n=0;
  for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++; }
  return {r:Math.round(r/n), g:Math.round(g/n), b:Math.round(b/n)};
}

import { rgbToLab } from "./colorSpace.js";
import { pointInPolygon } from "./regionSelection.js";

// 各スロットは色・独立ΔE・適用範囲・複数矩形を持つ
export class SlotStore {
  constructor(n=3){
    this.slots = Array.from({length:n}, ()=>null);
    this.active = 0;
  }
  setColor(idx, r,g,b){
    const prev = this.slots[idx];
    this.slots[idx] = {
      r,g,b,
      threshold: prev?.threshold ?? 20,
      lab: rgbToLab(r,g,b),
      scope: prev?.scope ?? "global",
      regions: prev?.regions ? [...prev.regions] : []
    };
  }
  setThreshold(idx, t){ if(this.slots[idx]) this.slots[idx].threshold = t; }
  setScope(idx, scope){ if(this.slots[idx]) this.slots[idx].scope = scope; }
  addRegion(idx, region){
    if(!this.slots[idx]) return false;
    this.slots[idx].regions.push(region);
    this.slots[idx].scope = "regions";
    return true;
  }
  clearRegions(idx){ if(this.slots[idx]) this.slots[idx].regions = []; }
  deleteRegionAt(idx, x, y) {
    const slot = this.slots[idx];
    if (!slot) return false;

    // 後から追加した領域から調べる
    for (let i = slot.regions.length - 1; i >= 0; i--) {
      const r = slot.regions[i];
      let hit = false;

      if (r.type === "polygon") {
        hit = pointInPolygon(x, y, r.points);

      } else if (!r.type || r.type === "rect") {
        hit =
          x >= r.x &&
          x <= r.x + r.width &&
          y >= r.y &&
          y <= r.y + r.height;
      }

      if (hit) {
        slot.regions.splice(i, 1);
        return true;
      }
    }

    return false;
  }
  remove(idx){ this.slots[idx] = null; }
  setActive(idx){ this.active = idx; }
  activeEmptyIndex(){
    if(!this.slots[this.active]) return this.active;
    const e = this.slots.findIndex(s=>!s);
    return e>=0 ? e : this.active;
  }
  effective(){ return this.slots.filter(Boolean); }
  reset(){ this.slots = this.slots.map(()=>null); this.active = 0; }
}
