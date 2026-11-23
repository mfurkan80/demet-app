// Buketin fotoğrafı (gönderirken sunucuya giden JPEG) ve 9:16 hikâye görseli (Instagram için).
import { File, Paths } from 'expo-file-system';
import { createCanvas, imageFromPixels } from './engine/canvas2d';
import { app } from './state/store';
import { fromName } from './state/text';

// square JPEG of the bouquet on the studio background, as a data URI
export const snapshot = engine => {
  try {
    const { width, height, pixels } = engine.snapshotPixels(360);
    const img = imageFromPixels(width, height, pixels);
    const { ImageFormat } = require('@shopify/react-native-skia');
    return 'data:image/jpeg;base64,' + img.encodeToBase64(ImageFormat.JPEG, 82);
  } catch (e) { return null; }
};

const wrapLines = (g, text, max) => {
  const words = String(text || '').split(/\s+/).filter(Boolean), out = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (g.measureText(next).width > max && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
};

// a 720x1280 story picture: soft gradient, the bouquet, the wordmark and the handwritten card. Returns a file URI.
export const storyImage = async (engine, { note, sign, dark }) => {
  const W = 720, H = 1280;
  const shot = engine.storyPixels(W, H, 0.35);
  const cv = createCanvas(W, H), g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (dark) { gr.addColorStop(0, '#2A1820'); gr.addColorStop(0.55, '#1B1F1D'); gr.addColorStop(1, '#13201A'); }
  else { gr.addColorStop(0, '#F7E2EA'); gr.addColorStop(0.55, '#F1ECEB'); gr.addColorStop(1, '#E2ECE5'); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W / 2, H * 0.38, 40, W / 2, H * 0.38, W * 0.75);
  rg.addColorStop(0, dark ? 'rgba(255,220,230,0.10)' : 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  g.drawImage(imageFromPixels(shot.width, shot.height, shot.pixels, shot.premultiplied), 0, 0, W, H);
  // wordmark
  g.fillStyle = dark ? '#F0728F' : '#B5244D'; g.font = '800 46px "Bricolage Grotesque"'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText('Demet', 48, 96);
  g.fillStyle = dark ? 'rgba(234,241,236,0.75)' : 'rgba(28,41,34,0.7)'; g.font = '600 26px Figtree';
  if (sign) g.fillText(`${fromName(sign)} bir buket geldi`, 48, 136);
  // card
  const text = note || app.S.reason;
  const cx = 48, cw = W - 96, ch = 230, cy = H - ch - 70;
  g.shadowRRect(cx, cy, cw, ch, 28, 'rgba(80,20,40,0.18)', 40, 12);
  g.fillStyle = 'rgba(255,252,246,0.95)'; g.beginPath(); g.roundRect(cx, cy, cw, ch, 28); g.fill();
  g.fillStyle = '#2B2A28'; g.textAlign = 'center';
  let size = 62, lines;
  do { g.font = `600 ${size}px Caveat`; lines = wrapLines(g, text, cw - 80); size -= 4; } while (lines.length * size > ch - 70 && size > 34);
  const lh = (size + 4) * 1.02, n = Math.min(lines.length, 3), top = cy + ch / 2 - ((n - 1) * lh) / 2 - (sign ? 12 : 0);
  lines.slice(0, 3).forEach((l, i) => g.fillText(l, W / 2, top + i * lh + size * 0.3));
  if (sign) { g.textAlign = 'right'; g.font = '500 40px Caveat'; g.fillStyle = 'rgba(43,42,40,0.75)'; g.fillText('— ' + sign, cx + cw - 36, cy + ch - 28); }
  const b64 = cv.toBase64('jpeg', 90);
  const f = new File(Paths.cache, `demet-hikaye-${Date.now()}.jpg`);
  try { f.create({ overwrite: true }); } catch (e) {}
  f.write(b64, { encoding: 'base64' });
  return f.uri;
};
