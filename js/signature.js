// 出力画像にカラーシグネチャとブランド署名を描く
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function hex(c){ return "#"+[c.r,c.g,c.b].map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase(); }

function avgLuma(ctx,x,y,w,h){
  try{
    const sx=Math.max(0,Math.floor(x)), sy=Math.max(0,Math.floor(y));
    const sw=Math.max(1,Math.min(ctx.canvas.width-sx,Math.floor(w)));
    const sh=Math.max(1,Math.min(ctx.canvas.height-sy,Math.floor(h)));
    const d=ctx.getImageData(sx,sy,sw,sh).data;
    let total=0,n=0;
    const step=Math.max(4,Math.floor(d.length/12000/4)*4);
    for(let i=0;i<d.length;i+=step){ total+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]; n++; }
    return total/Math.max(1,n);
  }catch{return 0;}
}

function roundedRectPath(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  if(typeof ctx.roundRect==="function"){
    ctx.beginPath();ctx.roundRect(x,y,w,h,rr);return;
  }
  ctx.beginPath();
  ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();
}

function panel(ctx,x,y,w,h,lightText){
  ctx.save();
  roundedRectPath(ctx,x,y,w,h,Math.max(3,Math.min(12,h*.12)));
  ctx.fillStyle=lightText?"rgba(5,7,10,.62)":"rgba(255,255,255,.74)";
  ctx.fill();
  ctx.strokeStyle=lightText?"rgba(255,255,255,.18)":"rgba(0,0,0,.15)";
  ctx.lineWidth=Math.max(1,ctx.canvas.width/2200);ctx.stroke();
  ctx.restore();
}

function drawPalette(ctx,colors,W,H,margin,base,pad,family,paletteStyle){
  if(!colors.length)return;
  const visible=colors.slice(0,3);
  const showHex=paletteStyle!=="chips";
  const title=showHex?"SELECTED CHROMA":"CHROMA SIGNALS";
  const titleFont=`600 ${base*.62}px ${family}`;
  const valueFont=`650 ${base*.72}px ${family}`;
  const gap=base*.58, chip=base*.9, chipTextGap=base*.36;
  const maxBoxW=Math.max(base*5,W-margin*2);

  // letterSpacingはブラウザごとにmeasureTextとの整合が異なるため使わない。
  ctx.letterSpacing="0px";
  ctx.font=titleFont;
  const titleW=ctx.measureText(title).width;
  ctx.font=valueFont;
  const entries=visible.map(c=>({
    color:c,
    label:hex(c),
    width:chip+(showHex?chipTextGap+ctx.measureText(hex(c)).width:0)
  }));
  const horizontalW=entries.reduce((sum,e)=>sum+e.width,0)+gap*Math.max(0,entries.length-1);
  const horizontalFits=Math.max(titleW,horizontalW)+pad*2<=maxBoxW;
  const vertical=showHex&&!horizontalFits;

  let contentW,boxH;
  if(vertical){
    contentW=Math.max(titleW,...entries.map(e=>e.width));
    boxH=pad*1.65+base*.62+entries.length*(chip+gap)-gap;
  }else{
    contentW=Math.max(titleW,horizontalW);
    boxH=base*2.75+pad*.7;
  }
  const boxW=Math.min(maxBoxW,contentW+pad*2);
  const x=margin,y=H-margin-boxH;
  const light=avgLuma(ctx,x,y,boxW,boxH)<145;
  panel(ctx,x,y,boxW,boxH,light);
  const ink=light?"rgba(255,255,255,.95)":"rgba(5,7,10,.9)";

  ctx.fillStyle=ink;ctx.font=titleFont;
  ctx.fillText(title,x+pad,y+pad+base*.28);

  const drawEntry=(e,cx,cy)=>{
    ctx.fillStyle=`rgb(${e.color.r},${e.color.g},${e.color.b})`;
    ctx.fillRect(cx,cy-chip/2,chip,chip);
    ctx.strokeStyle=light?"rgba(255,255,255,.38)":"rgba(0,0,0,.28)";
    ctx.lineWidth=Math.max(1,W/2400);ctx.strokeRect(cx,cy-chip/2,chip,chip);
    if(showHex){
      ctx.fillStyle=ink;ctx.font=valueFont;
      ctx.fillText(e.label,cx+chip+chipTextGap,cy);
    }
  };

  if(vertical){
    const firstY=y+pad+base*.62+gap+chip/2;
    entries.forEach((e,i)=>drawEntry(e,x+pad,firstY+i*(chip+gap)));
  }else{
    let cx=x+pad;
    const cy=y+boxH-pad-base*.43;
    entries.forEach((e,i)=>{
      if(i)cx+=gap;
      drawEntry(e,cx,cy);cx+=e.width;
    });
  }
}

function drawBrand(ctx,W,H,margin,base,pad,family){
  const compact=W<800;
  const upper=compact?"":"ACCENTED WITH";
  const brand="CHROMA SIGNAL";
  ctx.letterSpacing="0px";
  ctx.font=`750 ${base}px ${family}`;
  const brandW=ctx.measureText(brand).width;
  ctx.font=`600 ${base*.55}px ${family}`;
  const upperW=ctx.measureText(upper).width;
  const barsW=base*1.55;
  const boxW=Math.max(brandW+barsW+base*.65,upperW)+pad*2;
  const boxH=compact?base*2.05+pad*.4:base*2.65+pad*.65;
  const x=Math.max(margin,W-margin-boxW),y=H-margin-boxH;
  const light=avgLuma(ctx,x,y,boxW,boxH)<145;
  panel(ctx,x,y,boxW,boxH,light);
  const ink=light?"rgba(255,255,255,.95)":"rgba(5,7,10,.9)";
  if(!compact){ctx.fillStyle=ink;ctx.font=`600 ${base*.55}px ${family}`;ctx.fillText(upper,x+pad,y+pad+base*.25);}
  const baseline=y+boxH-pad-base*.42;
  const bx=x+pad,bw=base*.34,bg=base*.17;
  ctx.fillStyle=ink;
  [0.38,0.68,1].forEach((scale,i)=>ctx.fillRect(bx+i*(bw+bg),baseline-base*scale/2,bw,base*scale));
  ctx.font=`750 ${base}px ${family}`;ctx.fillText(brand,bx+barsW+base*.45,baseline);
}

export function drawSignature(canvas,colors,options={}){
  const {showPalette=true,showBrand=true,paletteStyle="hex"}=options;
  if(!showPalette&&!showBrand)return;
  const ctx=canvas.getContext("2d");
  const W=canvas.width,H=canvas.height,short=Math.min(W,H);
  const margin=clamp(short*.025,12,72);
  const base=clamp(short*.018,11,30);
  const pad=base*.75;
  const family='ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
  ctx.save();ctx.textBaseline="middle";
  if(showPalette)drawPalette(ctx,colors,W,H,margin,base,pad,family,paletteStyle);
  if(showBrand)drawBrand(ctx,W,H,margin,base,pad,family);
  ctx.restore();
}
