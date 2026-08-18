// 指定色に近く、かつ各スロットの適用領域内にあるピクセルだけ色を残す
import { rgbToLab, deltaE76, luma } from "./colorSpace.js";

export function applyEffect(srcCanvas, destCanvas, colors, feather){
  const w=srcCanvas.width, h=srcCanvas.height;
  destCanvas.width=w; destCanvas.height=h;
  const sctx=srcCanvas.getContext("2d",{willReadFrequently:true});
  const dctx=destCanvas.getContext("2d");
  // 色が未登録なら変換せずに元画像をそのまま表示する。
  // 初回読み込み時の不要なLab変換を避け、取り込みを即時化する。
  if(!colors.length){
    dctx.clearRect(0,0,w,h);
    dctx.drawImage(srcCanvas,0,0);
    return;
  }

  const img=sctx.getImageData(0,0,w,h);
  const d=img.data;

  const cols=colors.map(c=>({
    lab:c.lab || rgbToLab(c.r,c.g,c.b),
    th:c.threshold,
    scope:c.scope || "global",
    regions:(c.regions||[]).map(r=>({
      x0:r.x*w, y0:r.y*h, x1:(r.x+r.width)*w, y1:(r.y+r.height)*h
    }))
  }));

  for(let p=0,i=0;i<d.length;i+=4,p++){
    const x=p%w, y=(p/w)|0;
    const r=d[i], g=d[i+1], b=d[i+2];
    const lab=rgbToLab(r,g,b);
    let keep=0;

    for(let k=0;k<cols.length;k++){
      const c=cols[k];
      let inScope=c.scope==="global";
      if(!inScope){
        for(let q=0;q<c.regions.length;q++){
          const rg=c.regions[q];
          if(x>=rg.x0 && x<=rg.x1 && y>=rg.y0 && y<=rg.y1){ inScope=true; break; }
        }
      }
      if(!inScope) continue;

      const dist=deltaE76(lab,c.lab);
      let kv;
      if(feather<=0) kv=dist<=c.th?1:0;
      else kv=Math.max(0,Math.min(1,1-(dist-c.th)/feather));
      if(kv>keep) keep=kv;
    }

    if(keep<1){
      const gray=luma(r,g,b);
      d[i]=r*keep+gray*(1-keep);
      d[i+1]=g*keep+gray*(1-keep);
      d[i+2]=b*keep+gray*(1-keep);
    }
  }
  dctx.putImageData(img,0,0);
}
