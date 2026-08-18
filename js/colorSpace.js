// 色空間変換と色距離
// sRGB(0-255) -> 線形 -> XYZ(D65) -> CIELab, および ΔE76

function srgbToLinear(c){
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// D65 white point
const Xn = 0.95047, Yn = 1.00000, Zn = 1.08883;
function fLab(t){
  const d = 6/29;
  return t > d*d*d ? Math.cbrt(t) : t/(3*d*d) + 4/29;
}

// r,g,b (0-255) -> [L, a, b]
export function rgbToLab(r, g, b){
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = R*0.4124 + G*0.3576 + B*0.1805;
  const Y = R*0.2126 + G*0.7152 + B*0.0722;
  const Z = R*0.0193 + G*0.1192 + B*0.9505;
  const fx = fLab(X/Xn), fy = fLab(Y/Yn), fz = fLab(Z/Zn);
  return [116*fy - 16, 500*(fx - fy), 200*(fy - fz)];
}

// ΔE76 : Lab空間のユークリッド距離
export function deltaE76(lab1, lab2){
  const dL = lab1[0]-lab2[0], da = lab1[1]-lab2[1], db = lab1[2]-lab2[2];
  return Math.sqrt(dL*dL + da*da + db*db);
}

// Rec.709 輝度
export function luma(r, g, b){
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
