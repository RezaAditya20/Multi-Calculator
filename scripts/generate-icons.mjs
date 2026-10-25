/**
 * Generates the PWA icons (no external dependencies).
 *
 *   node scripts/generate-icons.mjs
 *
 * Output: public/icons/{icon-192,icon-512,icon-512-maskable,apple-touch-icon}.png
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

/* ── PNG encoding ── */
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  const pixels = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: none
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Shape helpers (all coordinates normalized 0..1) ── */
function sdRoundRect(px, py, cx, cy, w, h, r) {
  const dx = Math.abs(px - cx) - (w / 2 - r);
  const dy = Math.abs(py - cy) - (h / 2 - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}

function inDroplet(px, py) {
  // Lower bulb of the droplet.
  const cx = 0.5;
  const cy = 0.6;
  const r = 0.24;
  if (Math.hypot(px - cx, py - cy) <= r) return true;

  // Cone from the tip down to both tangent points.
  const tip = { x: 0.5, y: 0.2 };
  const left = { x: 0.308, y: 0.456 };
  const right = { x: 0.692, y: 0.456 };
  const sign = (ax, ay, bx, by, cx2, cy2) =>
    (ax - cx2) * (by - cy2) - (bx - cx2) * (ay - cy2);
  const d1 = sign(tip.x, tip.y, left.x, left.y, px, py);
  const d2 = sign(left.x, left.y, right.x, right.y, px, py);
  const d3 = sign(right.x, right.y, tip.x, tip.y, px, py);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function inEqualsBars(px, py) {
  const bar = (cy) => sdRoundRect(px, py, 0.5, cy, 0.2, 0.045, 0.022) <= 0;
  return bar(0.545) || bar(0.655);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(from, to, t) {
  return [
    Math.round(lerp(from[0], to[0], t)),
    Math.round(lerp(from[1], to[1], t)),
    Math.round(lerp(from[2], to[2], t)),
  ];
}

/* Black surface with a blue accent, matching the app theme. */
const BG_FROM = [0x1c, 0x1c, 0x20];
const BG_TO = [0x05, 0x05, 0x06];
const DROP_FROM = [0x60, 0xa5, 0xfa];
const DROP_TO = [0x25, 0x63, 0xeb];

/** Returns a premultiplied RGBA color at a normalized position. */
function colorAt(px, py, { fullBleed }) {
  const t = Math.min(1, Math.max(0, (px + py) / 2));
  const bg = mix(BG_FROM, BG_TO, t);

  if (!fullBleed && sdRoundRect(px, py, 0.5, 0.5, 1, 1, 0.22) > 0) {
    return [0, 0, 0, 0];
  }

  if (inDroplet(px, py)) {
    if (inEqualsBars(px, py)) {
      return [bg[0], bg[1], bg[2], 255];
    }
    const drop = mix(DROP_FROM, DROP_TO, t);
    return [drop[0], drop[1], drop[2], 255];
  }

  return [bg[0], bg[1], bg[2], 255];
}

function renderIcon(size, options) {
  const SS = 4; // supersampling factor for antialiasing
  const samples = SS * SS;
  const rgba = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / size;
          const ny = (y + (sy + 0.5) / SS) / size;
          const [cr, cg, cb, ca] = colorAt(nx, ny, options);
          const alpha = ca / 255;
          r += (cr * alpha) / 255;
          g += (cg * alpha) / 255;
          b += (cb * alpha) / 255;
          a += alpha;
        }
      }

      const index = (y * size + x) * 4;
      const avgAlpha = a / samples;
      const toByte = (value) =>
        Math.max(0, Math.min(255, Math.round((value / samples) * 255)));

      rgba[index] = avgAlpha > 0 ? toByte(r / avgAlpha) : 0;
      rgba[index + 1] = avgAlpha > 0 ? toByte(g / avgAlpha) : 0;
      rgba[index + 2] = avgAlpha > 0 ? toByte(b / avgAlpha) : 0;
      rgba[index + 3] = Math.round(avgAlpha * 255);
    }
  }

  return rgba;
}

function writeIcon(file, size, options) {
  const bytes = renderIcon(size, options);
  writeFileSync(join(outDir, file), encodePng(size, size, bytes));
  console.log(`written: icons/${file} (${size}x${size})`);
}

writeIcon("icon-192.png", 192, { fullBleed: false });
writeIcon("icon-512.png", 512, { fullBleed: false });
writeIcon("icon-512-maskable.png", 512, { fullBleed: true });
writeIcon("apple-touch-icon.png", 180, { fullBleed: true });
