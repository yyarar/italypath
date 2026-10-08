// 2025 kagidinda dogru sik acik yesil zemin + kesik cerceveyle vurgulu; goruntuden yazim modeli ve ogrenci anahtari
// gormemeli. crop-questions.mjs (soru kirpintisi) ve crop-figures.mjs (sekil) ayni maskeyi kullanir; yalniz 2025.
//
// Yesil alan (HIGHLIGHT +/- HIGHLIGHT_TOL, en az HIGHLIGHT_MIN_PX piksel) bulunur; alanin dikdortgeninde yesil fazlasi
// olan HER piksel (esik 0: G > max(R, B)) G degerinde griye cevrilir: zemin beyaz, yazi kenari gri, iz kalmaz.
// Dort kenardaki cerceve seridi (disari HIGHLIGHT_EDGE_PX, iceri 2 px) beyazlatilir. Sik metni kenardan en az ~6 px
// iceride (olculdu: sol 15 px, ust/alt 6-15 px). Ham RGB(A) tamponunu yerinde degistirir.
export const HIGHLIGHT_YEARS = Object.freeze([2025]);
const HIGHLIGHT = [204, 255, 204];
const HIGHLIGHT_TOL = 14;
const HIGHLIGHT_MIN_PX = 2000;
const HIGHLIGHT_EDGE_PX = 4;

// Donus: maskelenen alan { minX, minY, maxX, maxY } ya da null (vurgu yok).
export function maskHighlight(data, { width, height, channels }) {
  const isGreen = (i) => HIGHLIGHT.every((value, c) => Math.abs(data[i + c] - value) <= HIGHLIGHT_TOL);
  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      if (!isGreen(i)) continue;
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (count < HIGHLIGHT_MIN_PX) return null;
  const e = HIGHLIGHT_EDGE_PX;
  const x0 = Math.max(0, minX - e);
  const x1 = Math.min(width - 1, maxX + e);
  const y0 = Math.max(0, minY - e);
  const y1 = Math.min(height - 1, maxY + e);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const i = (y * width + x) * channels;
      if (data[i + 1] > Math.max(data[i], data[i + 2])) {
        data[i] = data[i + 1];
        data[i + 2] = data[i + 1];
      }
    }
  }
  const white = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * channels;
    for (let c = 0; c < Math.min(channels, 3); c += 1) data[i + c] = 255;
  };
  for (let x = minX - e; x <= maxX + e; x += 1) {
    for (let d = -e; d <= 2; d += 1) {
      white(x, minY + d);
      white(x, maxY - d);
    }
  }
  for (let y = minY - e; y <= maxY + e; y += 1) {
    for (let d = -e; d <= 2; d += 1) {
      white(minX + d, y);
      white(maxX - d, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

// Yesil fazlasi olan piksel sayisi (G > max(R, B)); maske sonrasi 2025 kirpintisinda 0 olmali.
export function tintedPixels(data, { width, height, channels }) {
  let count = 0;
  for (let i = 0; i < width * height * channels; i += channels) {
    if (data[i + 1] > Math.max(data[i], data[i + 2])) count += 1;
  }
  return count;
}
