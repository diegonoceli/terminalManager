import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function render(size) {
  const S = size;
  const img = Buffer.alloc(S * S * 4);
  const px = (x, y) => (y * S + x) * 4;

  const inRoundedRect = (x, y, r, w, h, rad) => {
    if (x < r || x >= r + w || y < r || y >= r + h) return false;
    const dx = Math.min(x - r, r + w - 1 - x);
    const dy = Math.min(y - r, r + h - 1 - y);
    if (dx < 0 || dy < 0) return false;
    const cx = x < r + rad ? r + rad : x > r + w - 1 - rad ? r + w - 1 - rad : x;
    const cy = y < r + rad ? r + rad : y > r + h - 1 - rad ? r + h - 1 - rad : y;
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    return d <= rad * rad + 0.5;
  };

  const bg = [79, 70, 229];
  const bgLight = [99, 102, 241];
  const white = [255, 255, 255];
  const dark = [18, 18, 18];

  const pad = Math.round(S * 0.06);
  const rad = Math.round(S * 0.22);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let i = px(x, y);
      let col = null;
      if (inRoundedRect(x, y, 0, S, S, rad)) {
        const t = y / S;
        col = [bg[0] + (bgLight[0] - bg[0]) * t, bg[1] + (bgLight[1] - bg[1]) * t, bg[2] + (bgLight[2] - bg[2]) * t];
      } else {
        img[i] = img[i + 1] = img[i + 2] = img[i + 3] = 0;
        continue;
      }
      img[i] = col[0]; img[i + 1] = col[1]; img[i + 2] = col[2]; img[i + 3] = 255;
    }
  }

  const winW = S * 0.68, winH = S * 0.5;
  const wx = (S - winW) / 2, wy = (S - winH) / 2 + S * 0.02;
  const wrad = S * 0.09;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inRoundedRect(x, y, wx, winW, winH, wrad)) continue;
      const i = px(x, y);
      img[i] = white[0]; img[i + 1] = white[1]; img[i + 2] = white[2]; img[i + 3] = 255;
    }
  }

  const tbH = winH * 0.2;
  const tbY = wy;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (y < tbY + tbH && inRoundedRect(x, y, wx, winW, winH, wrad) && y > tbY) {
        const i = px(x, y);
        img[i] = 229; img[i + 1] = 232; img[i + 2] = 251; img[i + 3] = 255;
      }
    }
  }

  const dotR = winH * 0.05;
  for (const dx of [-1, 0, 1]) {
    const cx = wx + winW / 2 + dx * winH * 0.16;
    const cy = tbY + tbH / 2;
    for (let y = cy - dotR; y <= cy + dotR; y++) {
      for (let x = cx - dotR; x <= cx + dotR; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= dotR * dotR) {
          const i = px(x, y);
          img[i] = 180; img[i + 1] = 181; img[i + 2] = 210; img[i + 3] = 255;
        }
      }
    }
  }

  const termX = wx + winW * 0.08;
  const termY = tbY + tbH + winH * 0.12;
  const termW = winW * 0.84;
  const termH = winH * 0.62;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (inRoundedRect(x, y, termX, termW, termH, S * 0.03)) {
        const i = px(x, y);
        img[i] = dark[0]; img[i + 1] = dark[1]; img[i + 2] = dark[2]; img[i + 3] = 255;
      }
    }
  }

  const lineY = termY + termH * 0.32;
  const promptX = termX + termW * 0.09;
  const ts = termH * 0.13;
  const caret = [139, 92, 246];
  for (let y = lineY - ts; y < lineY + ts; y++) {
    for (let x = promptX; x < promptX + ts * 1.6; x++) {
      const t = (x - promptX) / (ts * 1.6);
      const half = y < lineY;
      if (half ? t >= 0.5 : t > 0) {
        const i = px(x, y);
        img[i] = caret[0]; img[i + 1] = caret[1]; img[i + 2] = caret[2]; img[i + 3] = 255;
      }
    }
  }

  const cursorW = ts * 0.55;
  const cursorX = promptX + ts * 3.2;
  const cursorY = lineY - ts * 0.75;
  for (let y = cursorY; y < cursorY + ts * 1.5; y++) {
    for (let x = cursorX; x < cursorX + cursorW; x++) {
      const i = px(x, y);
      img[i] = 236; img[i + 1] = 72; img[i + 2] = 153; img[i + 3] = 255;
    }
  }

  return encodePNG(S, S, img);
}

function encodeICO(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = [];
  for (const img of images) {
    const size = img.width;
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size;
    entry[1] = size === 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += img.data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const outDir = new URL("../build/icon-source/", import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(new URL("icon_1024.png", outDir), render(1024));

const buildDir = new URL("../build/", import.meta.url);
const ico = encodeICO([16, 32, 48, 256].map((s) => ({ width: s, data: render(s) })));
writeFileSync(new URL("icon.ico", buildDir), ico);
console.log(`icon_1024.png e icon.ico gerados (${ico.length} bytes)`);
