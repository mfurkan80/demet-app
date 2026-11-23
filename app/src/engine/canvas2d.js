// A small 2D canvas for drawing textures (card text, garden signs, glows, paper patterns).
// On the phone it is backed by Skia (CPU surface); in the browser it is a real <canvas>.
// It implements the subset of CanvasRenderingContext2D the engine uses, so drawing code reads the same.
import * as THREE from 'three';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
let Sk = null;
const skia = () => Sk || (Sk = require('@shopify/react-native-skia'));

/* ---------- fonts (phone only; the browser uses CSS fonts) */
const faces = {}; // family(lowercase) -> { weight: SkTypeface }
export const registerTypeface = (family, weight, typeface) => {
  const f = family.toLowerCase();
  (faces[f] || (faces[f] = {}))[weight] = typeface;
};
const ALIAS = { 'caveat': 'caveat', 'figtree': 'figtree', 'system-ui': 'figtree', 'sans-serif': 'figtree', 'georgia': 'lora', 'serif': 'lora', 'cursive': 'caveat', 'bricolage grotesque': 'bricolage grotesque' };
const pickFace = (families, weight) => {
  for (let fam of families) {
    fam = fam.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
    const set = faces[fam] || faces[ALIAS[fam]];
    if (!set) continue;
    const ws = Object.keys(set).map(Number);
    if (!ws.length) continue;
    const best = ws.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
    return set[best];
  }
  const any = Object.values(faces)[0];
  return any ? Object.values(any)[0] : null;
};
const parseFont = css => {
  const m = /^\s*(?:(normal|bold|\d{3})\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/.exec(css || '');
  if (!m) return { weight: 400, size: 10, families: ['sans-serif'] };
  const w = m[1] === 'bold' ? 700 : m[1] === 'normal' || !m[1] ? 400 : +m[1];
  return { weight: w, size: +m[2], families: m[3].split(',') };
};

/* ---------- gradients */
class Gradient {
  constructor(kind, args) { this.kind = kind; this.args = args; this.stops = []; }
  addColorStop(at, color) { this.stops.push([at, color]); }
  shader() {
    const { Skia, TileMode } = skia();
    const stops = this.stops.slice().sort((a, b) => a[0] - b[0]);
    const colors = stops.map(s => Skia.Color(s[1])), pos = stops.map(s => s[0]);
    if (this.kind === 'linear') {
      const [x0, y0, x1, y1] = this.args;
      return Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, colors, pos, TileMode.Clamp);
    }
    const [x0, y0, r0, x1, y1, r1] = this.args;
    return Skia.Shader.MakeTwoPointConicalGradient({ x: x0, y: y0 }, r0, { x: x1, y: y1 }, r1, colors, pos, TileMode.Clamp);
  }
}

/* ---------- context */
class SkiaContext {
  constructor(cv) {
    this.cv = cv;
    this.state = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1 };
    this.stack = [];
    this.path = null;
  }
  get canvas() { return this.cv.sk.getCanvas(); }
  // style properties
  get fillStyle() { return this.state.fillStyle; } set fillStyle(v) { this.state.fillStyle = v; }
  get strokeStyle() { return this.state.strokeStyle; } set strokeStyle(v) { this.state.strokeStyle = v; }
  get lineWidth() { return this.state.lineWidth; } set lineWidth(v) { this.state.lineWidth = v; }
  get font() { return this.state.font; } set font(v) { this.state.font = v; }
  get textAlign() { return this.state.textAlign; } set textAlign(v) { this.state.textAlign = v; }
  get textBaseline() { return this.state.textBaseline; } set textBaseline(v) { this.state.textBaseline = v; }
  get globalAlpha() { return this.state.globalAlpha; } set globalAlpha(v) { this.state.globalAlpha = v; }

  paint(style, stroke) {
    const { Skia, PaintStyle } = skia();
    const p = Skia.Paint(); p.setAntiAlias(true);
    if (style instanceof Gradient) { p.setShader(style.shader()); p.setAlphaf(this.state.globalAlpha); }
    else { const c = Skia.Color(style); if (this.state.globalAlpha !== 1) c[3] *= this.state.globalAlpha; p.setColor(c); }
    if (stroke) { p.setStyle(PaintStyle.Stroke); p.setStrokeWidth(this.state.lineWidth); }
    return p;
  }
  save() { this.stack.push({ ...this.state }); this.canvas.save(); }
  restore() { if (this.stack.length) this.state = this.stack.pop(); this.canvas.restore(); }
  translate(x, y) { this.canvas.translate(x, y); }
  rotate(a) { this.canvas.rotate((a * 180) / Math.PI, 0, 0); }
  scale(x, y) { this.canvas.scale(x, y); }
  createLinearGradient(...a) { return new Gradient('linear', a); }
  createRadialGradient(...a) { return new Gradient('radial', a); }
  fillRect(x, y, w, h) { this.canvas.drawRect({ x, y, width: w, height: h }, this.paint(this.state.fillStyle)); }
  strokeRect(x, y, w, h) { this.canvas.drawRect({ x, y, width: w, height: h }, this.paint(this.state.strokeStyle, true)); }
  clearRect(x, y, w, h) {
    const { Skia, BlendMode } = skia();
    const p = Skia.Paint(); p.setBlendMode(BlendMode.Clear); this.canvas.drawRect({ x, y, width: w, height: h }, p);
  }
  beginPath() { const { Skia } = skia(); this.path = Skia.PathBuilder ? Skia.PathBuilder.Make() : Skia.Path.Make(); }
  ensure() { if (!this.path) this.beginPath(); return this.path; }
  moveTo(x, y) { this.ensure().moveTo(x, y); }
  lineTo(x, y) { this.ensure().lineTo(x, y); }
  bezierCurveTo(a, b, c, d, e, f) { this.ensure().cubicTo(a, b, c, d, e, f); }
  quadraticCurveTo(a, b, c, d) { this.ensure().quadTo(a, b, c, d); }
  closePath() { this.ensure().close(); }
  rect(x, y, w, h) { this.ensure().addRect({ x, y, width: w, height: h }); }
  arc(x, y, r, a0, a1, ccw) {
    let sweep = a1 - a0;
    if (!ccw && sweep < 0) sweep += Math.PI * 2; else if (ccw && sweep > 0) sweep -= Math.PI * 2;
    if (Math.abs(a1 - a0) >= Math.PI * 2) sweep = ccw ? -Math.PI * 2 : Math.PI * 2;
    const oval = { x: x - r, y: y - r, width: r * 2, height: r * 2 };
    if (Math.abs(sweep) >= Math.PI * 2 - 1e-6) this.ensure().addOval(oval);
    else this.ensure().arcToOval(oval, (a0 * 180) / Math.PI, (sweep * 180) / Math.PI, false);
  }
  roundRect(x, y, w, h, r) { this.ensure().addRRect({ rect: { x, y, width: w, height: h }, rx: r, ry: r }); }
  // draw a Skia image (from imageFromPixels) scaled into the rectangle
  drawImage(img, x, y, w, h) {
    const { Skia } = skia();
    const p = Skia.Paint(); p.setAntiAlias(true); if (this.state.globalAlpha !== 1) p.setAlphaf(this.state.globalAlpha);
    this.canvas.drawImageRect(img, { x: 0, y: 0, width: img.width(), height: img.height() }, { x, y, width: w ?? img.width(), height: h ?? img.height() }, p);
  }
  // soft drop shadow under a rounded rectangle (the story card)
  shadowRRect(x, y, w, h, r, color, blur, dy) {
    const { Skia, BlurStyle } = skia();
    const p = Skia.Paint(); p.setAntiAlias(true); p.setColor(Skia.Color(color));
    p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur / 2, true));
    this.canvas.drawRRect({ rect: { x, y: y + dy, width: w, height: h }, rx: r, ry: r }, p);
  }
  ellipse(x, y, rx, ry) { this.ensure().addOval({ x: x - rx, y: y - ry, width: rx * 2, height: ry * 2 }); }
  built() { return this.path.build ? this.path.build() : this.path; }
  fill() { if (this.path) this.canvas.drawPath(this.built(), this.paint(this.state.fillStyle)); }
  stroke() { if (this.path) this.canvas.drawPath(this.built(), this.paint(this.state.strokeStyle, true)); }
  skFont() {
    const { Skia } = skia();
    const f = parseFont(this.state.font), tf = pickFace(f.families, f.weight);
    return Skia.Font(tf, f.size);
  }
  advance(font, text) {
    const ids = font.getGlyphIDs(text);
    return font.getGlyphWidths(ids).reduce((a, b) => a + b, 0);
  }
  measureText(text) { return { width: this.advance(this.skFont(), String(text)) }; }
  fillText(text, x, y) {
    text = String(text);
    const font = this.skFont(), w = this.advance(font, text), m = font.getMetrics();
    const al = this.state.textAlign;
    if (al === 'center') x -= w / 2; else if (al === 'right' || al === 'end') x -= w;
    const bl = this.state.textBaseline;
    if (bl === 'middle') y -= (m.ascent + m.descent) / 2;
    else if (bl === 'top' || bl === 'hanging') y -= m.ascent;
    else if (bl === 'bottom' || bl === 'ideographic') y -= m.descent;
    this.canvas.drawText(text, x, y, this.paint(this.state.fillStyle), font);
  }
}

// createCanvas(w, h) -> { width, height, getContext('2d'), pixels() }
export const createCanvas = (w, h) => {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (isWeb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.pixels = () => c.getContext('2d').getImageData(0, 0, w, h).data;
    return c;
  }
  const { Skia } = skia();
  const cv = { width: w, height: h, sk: Skia.Surface.Make(w, h) };
  const ctx = new SkiaContext(cv);
  cv.getContext = () => ctx;
  cv.pixels = () => {
    const { ColorType, AlphaType } = skia();
    cv.sk.flush();
    const img = cv.sk.makeImageSnapshot();
    return img.readPixels(0, 0, { width: w, height: h, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul });
  };
  // encode as a base64 JPEG or PNG
  cv.toBase64 = (fmt = 'jpeg', q = 85) => {
    const { ImageFormat } = skia();
    cv.sk.flush();
    return cv.sk.makeImageSnapshot().encodeToBase64(fmt === 'png' ? ImageFormat.PNG : ImageFormat.JPEG, q);
  };
  return cv;
};

// a Skia image from RGBA pixels (top row first), e.g. what the engine reads back from the GPU
export const imageFromPixels = (w, h, px, premul = false) => {
  const { Skia, AlphaType, ColorType } = skia();
  const data = Skia.Data.fromBytes(px instanceof Uint8Array ? px : new Uint8Array(px.buffer || px));
  return Skia.Image.MakeImage({ width: w, height: h, alphaType: premul ? AlphaType.Premul : AlphaType.Unpremul, colorType: ColorType.RGBA_8888 }, data, w * 4);
};

const toBytes = (c, flipY) => {
  const src = c.pixels();
  const out = new Uint8Array(src.length);
  if (!flipY) { out.set(src); return out; }
  const row = c.width * 4;
  for (let y = 0; y < c.height; y++) out.set(src.subarray(y * row, (y + 1) * row), (c.height - 1 - y) * row);
  return out;
};

// A texture from a canvas. flipY follows THREE.CanvasTexture: true (default) puts the canvas' top row at v = 1.
export const canvasTexture = (c, { flipY = true, srgb = true, repeat = false } = {}) => {
  const t = new THREE.DataTexture(toBytes(c, flipY), c.width, c.height, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
  if (repeat) t.wrapS = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c; t.userData.flipY = flipY;
  t.needsUpdate = true;
  return t;
};
// redraw a canvas texture after drawing on its canvas again
export const refreshTexture = t => {
  const c = t.userData.canvas;
  t.image.data = toBytes(c, t.userData.flipY);
  t.needsUpdate = true;
};
