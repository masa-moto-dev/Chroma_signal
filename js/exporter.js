// 原寸で再計算し、署名を合成してPNG保存
import { applyEffect } from "./effect.js";
import { drawSignature } from "./signature.js";

export function savePNG(origCanvas, colors, feather, signatureOptions={}, filename="chroma-signal.png"){
  const out=document.createElement("canvas");
  applyEffect(origCanvas,out,colors,feather);
  drawSignature(out,colors,signatureOptions);
  out.toBlob((blob)=>{
    if(!blob) return;
    const a=document.createElement("a");
    const url=URL.createObjectURL(blob);
    a.href=url;a.download=filename;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  },"image/png");
}
