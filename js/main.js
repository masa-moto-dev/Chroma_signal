import { loadImageFile, downscale, drawThumb, PREVIEW_EDIT, PREVIEW_SHOW } from "./imageLoader.js";
import { sample5x5, SlotStore } from "./colorPicker.js";
import { applyEffect } from "./effect.js";
import { savePNG } from "./exporter.js";
import { drawSignature } from "./signature.js";
import { normalizeRect, pointerToNormalized, drawRegions, SLOT_UI_COLORS } from "./regionSelection.js";

const els={
  file:document.getElementById("fileInput"), main:document.getElementById("mainCanvas"),
  overlay:document.getElementById("overlayCanvas"), thumb:document.getElementById("thumbCanvas"),
  slots:document.getElementById("slots"), status:document.getElementById("status"),
  feather:document.getElementById("feather"), featherVal:document.getElementById("featherVal"),
  save:document.getElementById("saveBtn"), reset:document.getElementById("resetBtn"),
  rIn:document.getElementById("rIn"),gIn:document.getElementById("gIn"),bIn:document.getElementById("bIn"),
  nativeColor:document.getElementById("nativeColor"), applyPicker:document.getElementById("applyPicker"), showPalette:document.getElementById("showPalette"),
  paletteStyle:document.getElementById("paletteStyle"), showBrand:document.getElementById("showBrand"), toolButtons:document.getElementById("toolButtons"),
  toolHelp:document.getElementById("toolHelp")
};

let origCanvas=null,showCanvas=null,editCanvas=null;
const workCanvas=document.createElement("canvas");
const store=new SlotStore(3);
let toolMode="eyedropper",dragStart=null,draftRect=null;
let polyDraft=null;
// Canvasでキー操作を受け取れるようにする
els.overlay.tabIndex = 0;

function clearDraft() {
  dragStart = null;
  draftRect = null;
  polyDraft = null;
}

function selectSlot(idx) {
  if (idx !== store.active) clearDraft();
  store.setActive(idx);
}

function rgbToHex(r,g,b){
  return "#"+[r,g,b].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,"0")).join("");
}
function hexToRgb(hex){
  return {r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};
}
els.nativeColor.addEventListener("input",()=>{
  const c=hexToRgb(els.nativeColor.value);
  els.rIn.value=c.r;els.gIn.value=c.g;els.bIn.value=c.b;
});

const feather=()=>parseInt(els.feather.value,10);
const signatureOptions=()=>({
  showPalette:els.showPalette.checked,
  paletteStyle:els.paletteStyle.value,
  showBrand:els.showBrand.checked
});
const setStatus=msg=>els.status.textContent=msg;

function syncOverlay(){
  els.overlay.width=els.main.width;els.overlay.height=els.main.height;
  redrawOverlay();
}
function redrawOverlay(){
  if(toolMode==="eyedropper"){
    els.overlay.getContext("2d").clearRect(0,0,els.overlay.width,els.overlay.height);
  }else {
    const draft = toolMode === "add-region"
    ? draftRect
    : toolMode==="add-poly"
      ? polyDraft
      :null;
    drawRegions(els.overlay,store.slots,store.active, draft);
  }
}

function render(quality="show"){
  if(!origCanvas)return;
  const src=quality==="edit"?editCanvas:showCanvas;
  applyEffect(src,workCanvas,store.effective(),feather());
  drawSignature(workCanvas,store.effective(),signatureOptions());
  els.main.width=workCanvas.width;els.main.height=workCanvas.height;
  els.main.getContext("2d").drawImage(workCanvas,0,0);
  syncOverlay();
}
let timer=null;
function scheduleShow(){clearTimeout(timer);timer=setTimeout(()=>render("show"),180);}

function renderSlots(){
  els.slots.innerHTML="";
  store.slots.forEach((s,idx)=>{
    const div=document.createElement("div");
    div.className="slot"+(idx===store.active?" active":"")+(s?"":" empty");
    div.style.setProperty("--slot-color",SLOT_UI_COLORS[idx]);
    if(!s){
      div.innerHTML=`<div>スロット${idx+1}（空）<br>クリックして選択</div>`;
      div.onclick=()=>{selectSlot(idx);;renderSlots();redrawOverlay();};
    }else{
      const hx="#"+[s.r,s.g,s.b].map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase();
      div.innerHTML=`
        <div class="top">
          <span class="swatch" style="background:${hx}"></span>
          <span class="meta">${hx}<br>RGB(${s.r}, ${s.g}, ${s.b})</span>
          <button class="rm" title="色スロットを削除">×</button>
        </div>
        <label class="thr">ΔE
          <input class="threshold" type="range" min="1" max="60" value="${s.threshold}">
          <span>${s.threshold}</span>
        </label>
        <div class="scope-row">
          <select class="scope" aria-label="スロット${idx+1}の適用範囲">
            <option value="global" ${s.scope==="global"?"selected":""}>画像全体</option>
            <option value="regions" ${s.scope==="regions"?"selected":""}>指定領域のみ</option>
          </select>
          <button class="clear-regions" ${s.regions.length?"":"disabled"}>領域全削除</button>
        </div>
        <div class="region-info"><span style="color:${SLOT_UI_COLORS[idx]}">■ スロット${idx+1}の領域</span><span>${s.regions.length}個</span></div>`;

      div.querySelector(".top").onclick=e=>{
        if(e.target.closest(".rm"))return;
        selectSlot(idx);;els.nativeColor.value=rgbToHex(s.r,s.g,s.b);renderSlots();redrawOverlay();
      };
      if (idx === store.active) clearDraft();
      div.querySelector(".rm").onclick=()=>{store.remove(idx);renderSlots();render("show");};
      const range=div.querySelector(".threshold"),value=div.querySelector(".thr span");
      range.oninput=()=>{value.textContent=range.value;store.setThreshold(idx,+range.value);render("edit");};
      range.onchange=scheduleShow;
      if (idx === store.active) clearDraft();
      div.querySelector(".scope").onchange=e=>{store.setScope(idx,e.target.value);render("show");renderSlots();};
      if (idx === store.active) clearDraft();
      div.querySelector(".clear-regions").onclick=()=>{store.clearRegions(idx);renderSlots();render("show");};
    }
    els.slots.appendChild(div);
  });
}

function assignColor(r,g,b){
  const idx=store.active;
  store.setColor(idx,r,g,b);
  els.nativeColor.value=rgbToHex(r,g,b);
  renderSlots();render("show");
}

function setTool(mode){
  toolMode=mode;
  clearDraft();

  
  els.toolButtons.querySelectorAll(".tool").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  const help={
    "eyedropper":"画像をクリックすると、周辺5×5の平均色を取得します。",
    "add-region":"選択中の色スロットに対して、残したい範囲をドラッグしてください。",
    "add-poly":"マウスクリックで多角形領域を指定してください",
    "delete-region":"選択中の色スロットから、削除したい矩形をクリックしてください。"
  };
  els.toolHelp.textContent=help[mode];
  els.overlay.style.cursor = 
      (mode==="add-region"||mode==="add-poly") 
        ?"crosshair"
        :mode==="delete-region" 
          ?"not-allowed" 
          :"copy";
  
  redrawOverlay();
}
els.toolButtons.addEventListener("click",e=>{const b=e.target.closest("[data-mode]");if(b)setTool(b.dataset.mode);});

els.file.addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    setStatus("読み込み中...");
    clearDraft();origCanvas=await loadImageFile(f);
    showCanvas=downscale(origCanvas,PREVIEW_SHOW);
    editCanvas=downscale(origCanvas,PREVIEW_EDIT);
    drawThumb(els.thumb,origCanvas);render("show");
    setStatus(`原寸 ${origCanvas.width}×${origCanvas.height}px / プレビュー ${showCanvas.width}×${showCanvas.height}px`);
  }catch(err){console.error(err);setStatus("画像を読み込めませんでした。");}
});

els.overlay.addEventListener("pointerdown",e=>{
  if (!showCanvas || e.button !== 0 || e.isPrimary === false) return;
  els.overlay.focus({ preventScroll: true });

  const p=pointerToNormalized(els.overlay,e);
  if(toolMode==="eyedropper"){
    const x=Math.round(p.x*(showCanvas.width-1)),y=Math.round(p.y*(showCanvas.height-1));
    const col=sample5x5(showCanvas,x,y);assignColor(col.r,col.g,col.b);return;
  }
  if(!store.slots[store.active]){
    setStatus("先に残す色をスロットへ登録してください。");return;
  }
  if(toolMode==="delete-region"){
    if(store.deleteRegionAt(store.active,p.x,p.y)){renderSlots();render("show");setStatus("矩形を削除しました。");}
    else setStatus("クリック位置に、選択スロットの矩形はありません。");
    return;
  }
  if (toolMode === "add-poly") {
    if (!polyDraft) {
      polyDraft = {
        type: "polygon",
        points: [],
        mouse: null
      };
    }

    // 画面上の距離で判定する
    const bounds = els.overlay.getBoundingClientRect();

    const distanceTo = ([x, y]) => Math.hypot(
      (p.x - x) * bounds.width,
      (p.y - y) * bounds.height
    );

    // 3点以上あり、始点付近をクリックしたら確定
    if (
      polyDraft.points.length >= 3 &&
      distanceTo(polyDraft.points[0]) <= 12
    ) {
      finishPolygon();
      return;
    }

    // 同じ場所を続けてクリックした場合は追加しない
    const last = polyDraft.points[polyDraft.points.length - 1];
    if (last && distanceTo(last) < 2) return;

    polyDraft.points.push([p.x, p.y]);
    polyDraft.mouse = null;

    redrawOverlay();
    setStatus(
      `頂点${polyDraft.points.length}個。始点クリックかEnterで確定できます。`
    );
    return;
  }

  if (toolMode !== "add-region") return;
  dragStart=p;draftRect={x:p.x,y:p.y,width:0,height:0};
  els.overlay.setPointerCapture(e.pointerId);redrawOverlay();
});

els.overlay.addEventListener("pointermove", e => {
  if (toolMode === "add-poly" && polyDraft) {
    polyDraft.mouse = pointerToNormalized(els.overlay, e);
    redrawOverlay();
    return;
  }

  if (toolMode !== "add-region" || !dragStart) return;

  const p = pointerToNormalized(els.overlay, e);

  draftRect = normalizeRect(
    dragStart.x, dragStart.y, p.x, p.y
  );

  redrawOverlay();
});
els.overlay.addEventListener("pointerleave", () => {
  if (polyDraft) {
    polyDraft.mouse = null;
    redrawOverlay();
  }
});

els.overlay.addEventListener("keydown", e => {
  if (
    toolMode !== "add-poly" ||
    !polyDraft ||
    e.ctrlKey || e.metaKey || e.altKey
  ) return;

  if (e.key === "Enter") {
    e.preventDefault();
    finishPolygon();

  } else if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();

    polyDraft.points.pop();
    polyDraft.mouse = null;

    if (polyDraft.points.length === 0) polyDraft = null;

    redrawOverlay();
    setStatus("最後の頂点を取り消しました。");

  } else if (e.key === "Escape") {
    e.preventDefault();

    clearDraft();
    redrawOverlay();
    setStatus("多角形の作成を中止しました。");
  }
});

function finishRegion(e){
  if(toolMode!=="add-region"||!dragStart)return;
  const p=pointerToNormalized(els.overlay,e);
  const rect=normalizeRect(dragStart.x,dragStart.y,p.x,p.y);
  dragStart=null;draftRect=null;
  if(rect.width>.006&&rect.height>.006){
    store.addRegion(store.active,rect);renderSlots();render("show");
    setStatus(`スロット${store.active+1}に矩形領域を追加しました。`);
  }else redrawOverlay();
}

function finishPolygon() {
  if (
    toolMode !== "add-poly" ||
    !polyDraft ||
    polyDraft.points.length < 3
  ) return;

  if (!store.slots[store.active]) return;

  // 下書きから独立した頂点列を保存する
  const points = polyDraft.points.map(([x, y]) => [x, y]);

  let twiceArea = 0;

  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];

    twiceArea += x0 * y1 - x1 * y0;
  }

  if (Math.abs(twiceArea) < 1e-10) {
    setStatus("一直線にならないよう、3点以上の頂点を指定してください。");
    return;
  }

  store.addRegion(store.active, {
    type: "polygon",
    points
  });

  polyDraft = null;
  renderSlots();
  render("show");

  setStatus(`スロット${store.active + 1}に多角形領域を追加しました。`);
}

els.overlay.addEventListener("pointerup",finishRegion);
els.overlay.addEventListener("pointercancel", () => {
  clearDraft();
  redrawOverlay();
});

els.applyPicker.addEventListener("click",()=>{
  const clamp=v=>Math.max(0,Math.min(255,Number.isFinite(v)?v:0));
  clearDraft();assignColor(clamp(+els.rIn.value|0),clamp(+els.gIn.value|0),clamp(+els.bIn.value|0));
});
els.feather.addEventListener("input",()=>{els.featherVal.textContent=els.feather.value;render("edit");});
els.feather.addEventListener("change",scheduleShow);
els.showPalette.addEventListener("change",()=>{
  els.paletteStyle.disabled=!els.showPalette.checked;
  render("show");
});
els.paletteStyle.addEventListener("change",()=>render("show"));
els.showBrand.addEventListener("change",()=>render("show"));

els.save.addEventListener("click",()=>{
  if(!origCanvas){setStatus("先に画像を開いてください。");return;}
  setStatus("原寸でPNGを書き出しています...");
  setTimeout(()=>{
    savePNG(origCanvas,store.effective(),feather(),signatureOptions());
    setStatus("PNGを保存しました。");
  },20);
});
els.reset.addEventListener("click",()=>{
  clearDraft();store.reset();els.feather.value=10;els.featherVal.textContent="10";
  els.showPalette.checked=true;els.paletteStyle.value="hex";els.paletteStyle.disabled=false;els.showBrand.checked=true;
  renderSlots();render("show");setTool("eyedropper");
});

renderSlots();setTool("eyedropper");
