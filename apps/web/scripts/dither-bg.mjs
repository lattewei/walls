import { Jimp } from "jimp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.join(root, "public", "bg.jpg");
const output = path.join(root, "public", "bg-dither.jpg");

// Bayer 8×8 threshold map (0..63), normalized later to 0..1
const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Palette close to Lever night painting (deep navy → cool mid → warm lights)
const PALETTE = [
  [8, 12, 22],
  [14, 22, 38],
  [22, 34, 58],
  [32, 48, 78],
  [48, 62, 92],
  [70, 82, 108],
  [110, 118, 130],
  [160, 155, 140],
  [200, 185, 140],
  [230, 175, 70],
  [245, 210, 120],
];

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function nearestPalette(r, g, b) {
  let best = PALETTE[0];
  let bestD = Infinity;
  for (const p of PALETTE) {
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

const img = await Jimp.read(input);

// Slight pre-contrast like Lever painting treatment
img.contrast(0.08);

const w = img.bitmap.width;
const h = img.bitmap.height;

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const idx = (y * w + x) * 4;
    let r = img.bitmap.data[idx];
    let g = img.bitmap.data[idx + 1];
    let b = img.bitmap.data[idx + 2];

    // Bayer threshold bias (± half step) — classic ordered dither
    const t = (BAYER8[y & 7][x & 7] / 64 - 0.5) * 48;
    r = Math.max(0, Math.min(255, r + t));
    g = Math.max(0, Math.min(255, g + t));
    b = Math.max(0, Math.min(255, b + t));

    // Cool night shift (push blues, pull greens slightly)
    const lum = luminance(r, g, b);
    r = r * 0.82 + lum * 0.05;
    g = g * 0.88 + lum * 0.04;
    b = b * 1.05 + lum * 0.08;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    const [pr, pg, pb] = nearestPalette(r, g, b);
    img.bitmap.data[idx] = pr;
    img.bitmap.data[idx + 1] = pg;
    img.bitmap.data[idx + 2] = pb;
  }
}

await img.write(output);
console.log("Wrote", output);
