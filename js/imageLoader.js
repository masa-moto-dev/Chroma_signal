// 画像の読み込み・自動リサイズ・Canvas描画・サムネイル
export const MAX_ORIG = 4096;    // 原寸(=保存)の長辺上限
export const PREVIEW_EDIT = 800;  // 操作中プレビューの長辺
export const PREVIEW_SHOW = 1600; // 確定プレビューの長辺

// Fileを読み、long辺をmaxLongに収めたImageBitmap/canvasを返す
export function loadImageFile(file){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const scale = Math.min(1, MAX_ORIG / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      resolve(c); // 原寸(上限内)canvas
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// srcCanvasを長辺longに縮小した新canvasを返す(長辺が既に小さければそのまま)
export function downscale(srcCanvas, longEdge){
  const scale = Math.min(1, longEdge / Math.max(srcCanvas.width, srcCanvas.height));
  const w = Math.round(srcCanvas.width * scale);
  const h = Math.round(srcCanvas.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(srcCanvas, 0, 0, w, h);
  return c;
}

// サムネイル描画
export function drawThumb(canvas, srcCanvas){
  const long = 200;
  const scale = Math.min(1, long / Math.max(srcCanvas.width, srcCanvas.height));
  canvas.width = Math.round(srcCanvas.width*scale);
  canvas.height = Math.round(srcCanvas.height*scale);
  canvas.getContext("2d").drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);
}
