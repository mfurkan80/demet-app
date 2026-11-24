// Demet 3D motoru: atölye (buket) ve bahçe sahneleri. Web sürümündeki motorun React Native'e taşınmış hali.
// Ekranlar createEngine() ile motoru kurar; motor ortak durumu (app.S, app.W, app.ME) okur ve
// olayları (bir bahçe yatağına dokunma vb.) geri çağırmalarla ekranlara bildirir.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Orbit } from './orbit';
import { Presenter } from './present';
import { createCanvas, canvasTexture, refreshTexture } from './canvas2d';
import { TIE, PHI, FLOWERS, FILLERS, ALL, CENTER, STEMC, LEAFC, modelOf, PAPER_STYLES, RIBBON_STYLES, WINGS, isMain, hash } from '../state/catalog';
import { app, online, mains, fills, gardenEntries } from '../state/store';
import { toName, fromName, genitive, fmtShort } from '../state/text';

export const createEngine = ({ gl, renderer, T, TL: TL0, width, height, dark = false, reduceMotion = false, tier: tier0 = 0, halfFloat = true, maxFps = 60, on = {} }) => {
const TL = TL0 || {};
/* ======================================================================= renderer + scenes */
// The screen is width x height layout points; the drawing buffer is gl.drawingBufferWidth/Height pixels.
// Each quality step renders at a lower pixel density (points -> pixels) and the presenter scales it up.
const SQ_DPR = [2, 1.6, 1.3, 1.05];
const sQ = { tier: Math.max(0, Math.min(3, tier0 | 0)), frames: [], skip: 120 };
let LITE = sQ.tier >= 3;
let viewW = width, viewH = height;
const bufW = () => gl.drawingBufferWidth, bufH = () => gl.drawingBufferHeight;
const presenter = new Presenter(renderer, bufW(), bufH(), { halfFloat });
let gDensity = 1.5;
const density = () => (view === 'garden' ? gDensity : SQ_DPR[sQ.tier]);
const applyDensity = () => presenter.setScale(Math.min(1, density() * viewW / Math.max(1, bufW())));
let covered = false; // a sheet covers the scene: draw at most 15 fps
let uiBusy = false; // the user is scrolling the panel: leave the phone's time to the interface
const pmrem = new THREE.PMREMGenerator(renderer);
let envTex = null;
try { envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture; } catch (e) { envTex = null; }

// ---- studio
const scene = new THREE.Scene(); scene.environment = envTex;
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
const controls = new Orbit(camera, height);
controls.target.set(0, 0.56, 0);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 1.2, maxDistance: 6, minPolarAngle: 0.35, maxPolarAngle: 1.65, rotateSpeed: 0.7, autoRotate: !reduceMotion, autoRotateSpeed: 0.55 });
let userMoved = false, idleTimer;
const hideHint = () => on.hint && on.hint(false);
controls.addEventListener('start', () => { controls.autoRotate = false; userMoved = true; clearTimeout(idleTimer); hideHint(); });
controls.addEventListener('end', () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { controls.autoRotate = !reduceMotion; }, 5000); });
const hemi = new THREE.HemisphereLight('#fff6f1', '#d6e4da', 0.5);
const key = new THREE.DirectionalLight('#fff1e4', 2.0);
key.position.set(0.9, 4.2, 2.2); key.castShadow = true; key.shadow.mapSize.setScalar(sQ.tier >= 2 ? 512 : 1024);
Object.assign(key.shadow.camera, { left: -1.1, right: 1.1, top: 1.5, bottom: -0.6, near: 0.5, far: 7 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025;
const rim = new THREE.DirectionalLight('#ffd3de', 1.1); rim.position.set(-2.2, 1.6, -2.4);
const fillL = new THREE.DirectionalLight('#e4eeff', 0.35); fillL.position.set(-2.4, 0.8, 2.0);
scene.add(hemi, key, rim, fillL);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.14 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
const bouquet = new THREE.Group(); scene.add(bouquet);
const wrapGroup = new THREE.Group(); bouquet.add(wrapGroup);
const ribbonHolder = new THREE.Group(); ribbonHolder.position.y = TIE; wrapGroup.add(ribbonHolder);

// ---- garden
const gScene = new THREE.Scene();
const gCam = new THREE.PerspectiveCamera(38, 1, 0.05, 160);
const gControls = new Orbit(gCam, height);
Object.assign(gControls, { enabled: false, enableDamping: true, dampingFactor: 0.07, enablePan: true, screenSpacePanning: false, panSpeed: 0.7,
  minDistance: 1.0, maxDistance: 13, minPolarAngle: 0.4, maxPolarAngle: 1.36, rotateSpeed: 0.6 });
let gUser = false;
gControls.addEventListener('start', () => { gUser = true; gFocus = null; hideHint(); });
const gHemi = new THREE.HemisphereLight('#fff1e0', '#5d7f4b', 1.0);
const gSun = new THREE.DirectionalLight('#ffd9a6', 2.6); gSun.castShadow = true; gSun.shadow.mapSize.set(2048, 2048);
gSun.shadow.bias = -0.0004; gSun.shadow.normalBias = 0.03;
const gFill = new THREE.DirectionalLight('#dfe8ff', 0.6);
gScene.add(gHemi, gSun, gSun.target, gFill, gFill.target);

let darkMode = !!dark, gReady = false;
const isDark = () => darkMode;
const applyTheme = () => {
  const d = isDark();
  hemi.intensity = d ? 0.22 : 0.5; key.intensity = d ? 1.35 : 2.0; key.color.set(d ? '#e3e9ff' : '#fff1e4');
  rim.intensity = d ? 1.5 : 1.1; renderer.toneMappingExposure = d ? 0.9 : 1.0; ground.material.opacity = d ? 0.32 : 0.14;
  // studio background: radial-gradient(blush -> mist), the same colors as the web page
  presenter.setBackground(d ? '#22151B' : '#F7E5EB', d ? '#101814' : '#E6EEE8');
  if (gReady) gardenTheme();
}

/* ======================================================================= materials */
const matCache = new Map();
const white = new THREE.Color('#ffffff');
const mat = (part, type, hex) => {
  const k = part + '|' + type + '|' + hex;
  if (matCache.has(k)) return LITE ? liteMat(matCache.get(k)) : matCache.get(k);
  const c = new THREE.Color(hex), D = THREE.DoubleSide, light = c.clone().lerp(white, 0.55);
  let m;
  if (part === 'petal' && type === 'rose_gold') {
    m = new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: 0.3, side: D, vertexColors: true, envMapIntensity: 1.35 });
  } else if (part === 'petal' && type === 'rose_night') {
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, iridescence: 0.55, iridescenceIOR: 1.3, iridescenceThicknessRange: [250, 420],
      sheen: 0.35, sheenRoughness: 0.4, sheenColor: c.clone().lerp(white, 0.35), clearcoat: 0.7, clearcoatRoughness: 0.25, side: D, vertexColors: true, envMapIntensity: 0.75 });
  } else switch (part) {
    case 'petal': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.62, sheen: 0.7, sheenRoughness: 0.45, sheenColor: light, side: D, vertexColors: true, envMapIntensity: 0.6 }); break;
    case 'bud': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.8, sheen: 0.5, sheenColor: light, vertexColors: true, envMapIntensity: 0.6 }); break;
    case 'center': m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, vertexColors: true, envMapIntensity: 0.4 }); break;
    case 'stem': case 'husk': m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, side: D, vertexColors: true, envMapIntensity: 0.5 }); break;
    case 'leaf': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, side: D, vertexColors: true, sheen: 0.25, sheenColor: c.clone().lerp(white, 0.4), envMapIntensity: 0.5 }); break;
    case 'paper': m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: D, vertexColors: true, envMapIntensity: 0.45 }); break;
    case 'tissue': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.85, sheen: 0.4, sheenColor: c.clone().lerp(white, 0.6), side: D, vertexColors: true, envMapIntensity: 0.5 }); break;
    case 'ribbon': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.36, sheen: 1, sheenRoughness: 0.25, sheenColor: light, clearcoat: 0.25, side: D, vertexColors: true, envMapIntensity: 0.8 }); break;
    case 'ribbon-metal': m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.9, roughness: 0.3, clearcoat: 0.4, side: D, vertexColors: true, envMapIntensity: 1.3 }); break;
    case 'heart': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1 }); break;
    case 'wing': m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: D, vertexColors: true, envMapIntensity: 0.7 }); break;
    case 'pearl': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.12, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.6, envMapIntensity: 1.4 }); break;
    case 'fur': case 'muzzle': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: light, vertexColors: true, envMapIntensity: 0.5 }); break;
    case 'nose': case 'eye': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, clearcoat: 1, envMapIntensity: 1 }); break;
    case 'foil': case 'gold': m = new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: part === 'foil' ? 0.28 : 0.18, vertexColors: true, envMapIntensity: 1.4 }); break;
    case 'cup': m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: D, vertexColors: true }); break;
    case 'velvet': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 1, sheen: 1, sheenRoughness: 0.35, sheenColor: c.clone().lerp(white, 0.45), vertexColors: true, envMapIntensity: 0.5 }); break;
    case 'satin': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.45, sheen: 0.8, sheenColor: white, vertexColors: true, envMapIntensity: 0.7 }); break;
    case 'diamond': m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0, metalness: 0.15, ior: 2.4, iridescence: 0.35, clearcoat: 1, envMapIntensity: 3.2, flatShading: true }); break;
    case 'card-pick': m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }); break;
    default: m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: D });
  }
  m.name = part;
  matCache.set(k, m);
  return LITE ? liteMat(m) : m;
}
// lightest step: physical materials (sheen, clearcoat, iridescence) become plain standard ones
const liteMat = (m) => {
  if (Array.isArray(m)) return m.map(liteMat);
  if (!m || !m.isMeshPhysicalMaterial) return m;
  const liteCache = liteMat.cache || (liteMat.cache = new WeakMap());
  let l = liteCache.get(m);
  if (!l) {
    l = new THREE.MeshStandardMaterial({ color: m.color, roughness: m.roughness, metalness: m.metalness, map: m.map, side: m.side,
      vertexColors: m.vertexColors, envMapIntensity: m.envMapIntensity, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
    l.name = m.name; liteCache.set(m, l);
  }
  return l;
}
const partColor = (part, type, hex) => {
  switch (part) {
    case 'petal': case 'bud': return hex;
    case 'center': return CENTER[type] || '#E8B83A';
    case 'stem': return STEMC[type] || '#5C8A4A';
    case 'leaf': return LEAFC[type] || '#4F7F42';
    case 'husk': return '#6B4A2E';
    case 'pick': return '#C9A877';
    case 'body': return '#2A2421';
    case 'fur': return '#B88458';
    case 'muzzle': return '#EBD5B8';
    case 'nose': return '#2A1D18';
    case 'eye': return '#140F0D';
    case 'foil': return '#D9A441';
    case 'cup': return '#5A3A22';
    case 'velvet': return '#7A1027';
    case 'satin': return '#F3EEE6';
    case 'gold': return '#E2B455';
    case 'diamond': return '#FFFFFF';
    default: return hex;
  }
}
const paint = (obj, type, hex, extra = {}) => {
  obj.traverse(o => {
    if (!o.isMesh) return;
    const part = o.userData.part || (o.userData.part = o.material.name);
    const col = extra[part] || partColor(part, type, hex);
    o.material = part === 'pick' ? mat('card-pick', '', col) : mat(part, type, col);
    o.castShadow = true; o.receiveShadow = true;
  });
}

// ---- paper styles (canvas textures; glTF uvs: u runs 0..3 around, v=0 at the top edge)
const texCache = new Map();
const canvasTex = (keyName, w, h, draw, srgb = true) => {
  if (texCache.has(keyName)) return texCache.get(keyName);
  const c = createCanvas(w, h); draw(c.getContext('2d'), w, h);
  const t = canvasTexture(c, { flipY: false, srgb, repeat: true }); t.anisotropy = 4;
  texCache.set(keyName, t); return t;
}
const NEWS_WORDS = 'çiçek bahar sevgi demet şehir haber gün akşam bulvar sahil kahve mektup yıldız deniz bahçe yaprak hafta sabah ışık meydan rüzgar yağmur pazar'.split(' ');
const paperMat = (style, hex) => {
  const k = 'paper:' + style + hex;
  if (matCache.has(k)) return LITE ? liteMat(matCache.get(k)) : matCache.get(k);
  const c = new THREE.Color(hex), D = THREE.DoubleSide;
  let m;
  if (style === 'velvet') {
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 1, sheen: 1, sheenRoughness: 0.32, sheenColor: c.clone().lerp(white, 0.5), side: D, vertexColors: true, envMapIntensity: 0.4 });
  } else if (style === 'goldedge') {
    const map = canvasTex('ge-map' + hex, 4, 256, (g, w, h) => {
      g.fillStyle = hex; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, 22); gr.addColorStop(0, '#F6DC8C'); gr.addColorStop(0.6, '#D4A443'); gr.addColorStop(1, '#B07F22');
      g.fillStyle = gr; g.fillRect(0, 0, w, 20);
    });
    const metal = canvasTex('ge-metal', 4, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, 0, w, 20); }, false);
    m = new THREE.MeshStandardMaterial({ map, metalnessMap: metal, metalness: 1, roughness: 0.42, side: D, vertexColors: true, envMapIntensity: 1 });
  } else if (style === 'news') {
    const map = canvasTex('news' + hex, 1024, 1024, (g, w, h) => {
      g.fillStyle = hex; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(40,36,30,.82)'; g.font = '700 74px Georgia, serif'; g.fillText('DEMET GAZETESİ', 36, 120);
      g.fillRect(36, 140, w - 72, 4);
      g.font = '15px Georgia, serif'; g.fillStyle = 'rgba(40,36,30,.6)';
      let seed = 3;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let col = 0; col < 4; col++) {
        const x0 = 36 + col * 245;
        for (let y = 186; y < h - 30; y += 21) {
          if (rnd() < 0.05) { g.font = '700 26px Georgia, serif'; g.fillText(NEWS_WORDS[(rnd() * NEWS_WORDS.length) | 0].toLocaleUpperCase('tr'), x0, y + 8); g.font = '15px Georgia, serif'; y += 16; continue; }
          let line = ''; while (g.measureText(line).width < 210) line += NEWS_WORDS[(rnd() * NEWS_WORDS.length) | 0] + ' ';
          g.fillText(line, x0, y);
        }
      }
    });
    m = new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: D, vertexColors: true, envMapIntensity: 0.4 });
  } else if (style === 'crystal') {
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, transparent: true, opacity: 0.38, iridescence: 1, iridescenceIOR: 1.35,
      iridescenceThicknessRange: [120, 480], clearcoat: 1, side: D, depthWrite: false, envMapIntensity: 1.4 });
  } else m = mat('paper', '', hex);
  m.name = 'paper';
  matCache.set(k, m);
  return LITE ? liteMat(m) : m;
}

/* ======================================================================= studio: stems */
const nodes = new Map();
const makeNode = (k, model) => {
  const az = new THREE.Group(), tilt = new THREE.Group(), inner = new THREE.Group();
  az.position.y = TIE; az.add(tilt); tilt.add(inner); inner.position.y = -TIE; inner.add(model);
  bouquet.add(az);
  const n = { key: k, az, tilt, inner, model, vl: 0, vs: 0, cur: { az: 0, tilt: 0, lift: 0.9, spin: 0, s: 0.4 }, tgt: { az: 0, tilt: 0, lift: 0, spin: 0, s: 1 } };
  nodes.set(k, n);
  return n;
}
const dropNode = (k) => { const n = nodes.get(k); if (n && !n.dying) { n.dying = true; n.tgt.s = 0; n.tgt.lift = n.cur.lift + 0.25; } }
// the parts inside a model never move relative to the model itself: compute their matrices once
// instead of every frame (three.js otherwise rebuilds every matrix each frame, which is slow in Hermes)
const freeze = root => { root.traverse(o => { if (o !== root) { o.updateMatrix(); o.matrixAutoUpdate = false; } }); return root; };
const applyNode = (n) => {
  n.az.rotation.y = n.cur.az; n.tilt.rotation.z = -n.cur.tilt; n.inner.rotation.y = n.cur.spin;
  n.inner.position.y = -TIE + n.cur.lift; n.az.scale.setScalar(Math.max(0.001, n.cur.s));
}
const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; }
const angDiff = (a, b) => { let d = ((a - b + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return d; }

let theta = 0.12, wrapScale = 0.8, wrapScaleT = 0.8;
const layout = () => {
  const ms = mains().map(i => nodes.get('i' + i.id)).filter(n => n && !n.dying)
    .sort((a, b) => FLOWERS[b.type].area - FLOWERS[a.type].area || a.id - b.id);
  const fs = fills().map(i => nodes.get('i' + i.id)).filter(n => n && !n.dying);
  const A = ms.reduce((s, n) => s + FLOWERS[n.type].area, 0);
  theta = ms.length <= 1 ? 0.12 : Math.min(0.74, Math.max(0.14, Math.acos(Math.max(-1, 1 - (A * 1.55) / (Math.PI * 2)))));
  let cum = 0;
  ms.forEach((n, k) => {
    const a = FLOWERS[n.type].area; cum += a;
    const r = ms.length === 1 ? 0 : Math.sqrt((cum - a / 2) / A);
    n.tgt.tilt = theta * r * (n.type === 'orchid' ? 0.45 : 0.96);
    n.tgt.az = k * PHI + 0.55;
    n.tgt.spin = n.type === 'orchid' ? Math.PI / 2 + (hash(n.id) - 0.5) * 0.4 : hash(n.id) * Math.PI * 2;
    n.tgt.lift = (hash(n.id * 7) - 0.5) * 0.045 + 0.035 * (1 - r) - 0.09 + (FLOWERS[n.type].lift || 0);
  });
  fs.forEach((n, j) => {
    const h = hash(n.id * 3);
    n.tgt.az = j * (Math.PI * 2 / Math.max(1, fs.length)) + 0.3 + h * 0.5;
    n.tgt.tilt = theta * (0.72 + 0.3 * h) + 0.07;
    n.tgt.spin = n.type === 'fern' ? Math.PI / 2 : hash(n.id) * Math.PI * 2;
    n.tgt.lift = (FILLERS[n.type].lift || 0) + h * 0.04 - 0.02;
  });
  // once wrapped, the note card rises on its pick and leans out over the front of the paper so it is always readable
  const card = nodes.get('card'), ws = Math.min(1.3, Math.max(0.78, 0.55 + 0.9 * Math.sin(theta)));
  if (card) {
    const w = app.S.wrapped, off = w ? 0.22 : 0.55;
    Object.assign(card.tgt, { az: -Math.PI / 2 + off, spin: Math.PI / 2 - off,
      tilt: w ? Math.min(0.62, theta * 0.7 + 0.3) : Math.min(0.44, theta * 0.85 + 0.06),
      lift: w ? 0.2 + 0.16 * (ws - 0.78) : 0.02 });
  }
  for (let h = 0; h < 3; h++) { const n = nodes.get('heart' + h); if (n && !n.dying) Object.assign(n.tgt, { az: [-0.9, 2.3, 3.9][h], tilt: theta * 0.9 + 0.06, spin: Math.PI / 2, lift: [-0.06, -0.09, -0.04][h] }); }
  for (let h = 0; h < 5; h++) { const n = nodes.get('choco' + h); if (n && !n.dying) Object.assign(n.tgt, { az: [0.9, 2.6, 4.3, 5.5, 3.4][h], tilt: theta * 0.78 + 0.05, spin: h, lift: 0.07 + 0.02 * (h % 2) }); }
  const ring = nodes.get('ringpick');
  if (ring) Object.assign(ring.tgt, { az: -Math.PI / 2 - 0.25, tilt: Math.min(0.4, theta * 0.7 + 0.08), spin: Math.PI / 2 + 0.25, lift: 0.0 });
  wrapScaleT = Math.min(1.3, Math.max(0.78, 0.55 + 0.9 * Math.sin(theta)));
  buildLights();
}
const syncFlowers = () => {
  const want = new Set(app.S.items.map(i => 'i' + i.id));
  for (const [k] of nodes) if (k.startsWith('i') && !want.has(k)) dropNode(k);
  for (const it of app.S.items) {
    const k = 'i' + it.id;
    if (nodes.has(k)) continue;
    const model = freeze(T[modelOf(it.type)].clone(true));
    paint(model, it.type, it.color);
    const n = makeNode(k, model);
    n.id = it.id; n.type = it.type; n.fresh = true;
    n.cur.az = 0.55 + it.id * PHI + 0.6; n.cur.tilt = 0.35; n.cur.spin = hash(it.id) * 6;
    applyNode(n);
  }
}

/* ---- wrap: unrolled sheets that curl around the stems */
let wrapP = 0, wrapMeshes = [], ribbonModel, ribbonPearls;
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const backOut = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const prepWrap = (model) => {
  model.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, n = pos.count;
    const orig = new Float32Array(n * 3), cyl = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      orig[i * 3] = x; orig[i * 3 + 1] = y; orig[i * 3 + 2] = z;
      cyl[i * 3] = Math.hypot(x, z); cyl[i * 3 + 1] = Math.atan2(x, -z); cyl[i * 3 + 2] = y;
    }
    o.userData.morph = { orig, cyl, last: -1 };
    o.userData.part = o.material.name;
    o.castShadow = true; o.receiveShadow = true;
    wrapMeshes.push(o);
  });
}
const morph = (o, p) => {
  const md = o.userData.morph;
  if (Math.abs(md.last - p) < 1e-4) return;
  md.last = p;
  const pos = o.geometry.attributes.position, arr = pos.array, { orig, cyl } = md;
  if (p >= 0.9999) arr.set(orig);
  else {
    const b = Math.max(p, 0.0015), lag = 1 - p;
    for (let i = 0, n = pos.count; i < n; i++) {
      const r = cyl[i * 3], ph = cyl[i * 3 + 1], y = cyl[i * 3 + 2];
      const R = r / b, ps = ph * b;
      arr[i * 3] = R * Math.sin(ps);
      arr[i * 3 + 1] = y - lag * 0.1;
      arr[i * 3 + 2] = -r + R * (1 - Math.cos(ps)) - lag * 0.16;
    }
  }
  pos.needsUpdate = true;
  o.geometry.computeVertexNormals();
  o.geometry.computeBoundingSphere();
}
const applyWrap = (P) => {
  wrapGroup.visible = P > 0.001;
  for (const o of wrapMeshes) {
    const isTissue = o.userData.part === 'tissue';
    const p = isTissue ? ease(clamp01(P / 0.62)) : ease(clamp01((P - 0.22) / 0.62));
    o.visible = p > 0.001;
    morph(o, p);
  }
  const e = clamp01((P - 0.76) / 0.24);
  ribbonHolder.scale.setScalar(Math.max(0.001, e === 0 ? 0 : backOut(e)));
  ribbonHolder.rotation.y = (1 - e) * 1.8;
}
const paintWrap = () => {
  for (const o of wrapMeshes) o.material = o.userData.part === 'tissue' ? mat('tissue', '', app.S.tissue) : paperMat(app.S.paperStyle, app.S.paper);
  const rs = app.S.ribbonStyle;
  ribbonModel.traverse(o => { if (o.isMesh) { o.material = rs === 'shimmer' ? mat('ribbon-metal', '', app.S.ribbon) : mat('ribbon', '', app.S.ribbon); o.castShadow = true; } });
  ribbonPearls.visible = rs === 'pearl';
}

/* ---- card */
const cardCanvas = createCanvas(768, 512);
const cardTex = canvasTexture(cardCanvas, { flipY: false }); cardTex.anisotropy = 4;
let cardKey = '';
const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.4 });
const wrapLines = (ctx, text, maxW) => {
  const words = text.split(/\s+/).filter(Boolean), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
const drawCard = () => {
  // redrawing and uploading the card is not free on a phone: only when its text changed
  const k = `${app.S.note}|${app.S.reason}|${app.S.sign}`;
  if (k === cardKey) return;
  cardKey = k;
  const c = cardCanvas.getContext('2d'), Wd = 768, H = 512;
  c.fillStyle = '#FFFCF6'; c.fillRect(0, 0, Wd, H);
  c.strokeStyle = 'rgba(181,36,77,.35)'; c.lineWidth = 3; c.strokeRect(30, 30, Wd - 60, H - 60);
  c.fillStyle = '#2B2A28'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const note = (app.S.note || '').trim() || app.S.reason;
  let size = 66, lines;
  do { c.font = `600 ${size}px Caveat, cursive`; lines = wrapLines(c, note, Wd - 150); size -= 4; } while (lines.length * size * 1.05 > H - 210 && size > 34);
  const lh = (size + 4) * 1.05, top = H / 2 - 30 - ((lines.length - 1) * lh) / 2;
  lines.slice(0, 5).forEach((l, i) => c.fillText(l, Wd / 2, top + i * lh));
  if ((app.S.sign || '').trim()) { c.font = '500 52px Caveat, cursive'; c.textAlign = 'right'; c.fillText('— ' + app.S.sign.trim(), Wd - 80, H - 90); }
  refreshTexture(cardTex);
}
const syncCard = () => {
  const has = nodes.get('card'), want = app.S.showCard && app.S.items.length > 0;
  if (want && (!has || has.dying)) {
    if (has) nodes.delete('card'), bouquet.remove(has.az);
    const m = T.card.clone(true); m.scale.setScalar(1.3); m.position.y = -0.22;
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.name === 'card' ? cardMat : mat('card-pick', '', '#C9A877'); } });
    const n = makeNode('card', m); n.cur.az = -Math.PI / 2 + 0.55; n.cur.spin = Math.PI / 2 - 0.55; applyNode(n);
  } else if (!want && has) dropNode('card');
  drawCard();
}

/* ---- picks: hearts, chocolates, ring */
const stickGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.46, 6); stickGeo.translate(0, 0.76, 0);
const syncPicks = () => {
  const n0 = app.S.items.length > 0;
  for (let h = 0; h < 3; h++) {
    const k = 'heart' + h, n = nodes.get(k), want = n0 && app.S.d.hearts;
    if (want && (!n || n.dying)) {
      if (n) { nodes.delete(k); bouquet.remove(n.az); }
      const g = new THREE.Group(), hm = T.heart.clone(true); hm.position.y = 1.0; hm.scale.setScalar(1.35 - h * 0.15);
      g.add(hm, new THREE.Mesh(stickGeo, mat('card-pick', '', '#C9A877')));
      paint(hm, 'heart', app.S.d.heartColor, { heart: app.S.d.heartColor });
      const nn = makeNode(k, g); nn.cur.az = [-0.9, 2.3, 3.9][h]; applyNode(nn);
    } else if (!want && n) dropNode(k);
    else if (n) paint(n.model.children[0], 'heart', app.S.d.heartColor, { heart: app.S.d.heartColor });
  }
  for (let h = 0; h < 5; h++) {
    const k = 'choco' + h, n = nodes.get(k), want = n0 && h < app.S.d.choco;
    if (want && (!n || n.dying)) {
      if (n) { nodes.delete(k); bouquet.remove(n.az); }
      const m = T.choco.clone(true); paint(m, 'choco', '#D9A441'); m.scale.setScalar(1.25); m.position.y = -0.2;
      const nn = makeNode(k, m); nn.cur.az = [0.9, 2.6, 4.3, 5.5, 3.4][h]; applyNode(nn);
    } else if (!want && n) dropNode(k);
  }
  const rk = 'ringpick', rn = nodes.get(rk), wantPick = n0 && app.S.d.ring && !app.S.d.teddy;
  if (wantPick && (!rn || rn.dying)) {
    if (rn) { nodes.delete(rk); bouquet.remove(rn.az); }
    const g = new THREE.Group(), box = T.ringbox.clone(true); paint(box, 'ring', '#fff');
    box.position.y = 0.985; box.scale.setScalar(1.5); box.rotation.x = -0.35;
    g.add(box, new THREE.Mesh(stickGeo, mat('card-pick', '', '#C9A877')));
    const nn = makeNode(rk, g); nn.cur.az = -Math.PI / 2 - 0.25; nn.cur.spin = Math.PI / 2 + 0.25; applyNode(nn);
  } else if (!wantPick && rn) dropNode(rk);
}

/* ---- teddy (sits on the front lip of the wrap) */
const teddyHolder = new THREE.Group(); bouquet.add(teddyHolder);
let teddyModel, teddyRing, teddyS = 0, teddyV = 0;
const buildTeddy = () => {
  teddyModel = T.teddy.clone(true); paint(teddyModel, 'teddy', '#B88458', { ribbon: '#C8325A' });
  teddyHolder.add(teddyModel);
  teddyRing = T.ringbox.clone(true); paint(teddyRing, 'ring', '#fff');
  teddyRing.position.set(0, 0.03, 0.05); teddyRing.scale.setScalar(0.9); teddyRing.rotation.x = -0.2;
  teddyModel.add(teddyRing);
  teddyHolder.scale.setScalar(0.001);
}

/* ---- pearls on petals */
const pearlGeo = new THREE.SphereGeometry(0.011, 14, 10);
let pearls = [];
const syncPearls = () => {
  pearls.forEach(p => p.parent && p.parent.remove(p)); pearls = [];
  if (!app.S.d.pearls) return;
  const ms = mains(); if (!ms.length) return;
  const pm = mat('pearl', '', '#F7F2EC');
  for (let i = 0; i < 18; i++) {
    const it = ms[i % ms.length], n = nodes.get('i' + it.id); if (!n) continue;
    const a = hash(i * 13 + it.id) * Math.PI * 2, r = 0.05 + hash(i * 5 + 1) * 0.05;
    const p = new THREE.Mesh(pearlGeo, pm); p.position.set(Math.cos(a) * r, 1.0 + 0.045 - r * 0.25, Math.sin(a) * r); p.castShadow = true;
    n.inner.add(p); pearls.push(p);
  }
}

/* ---- butterflies */
let flies = [];
const makeButterfly = (color) => {
  const m = T.butterfly.clone(true); paint(m, 'butterfly', color, { wing: color });
  const wings = [];
  for (const nm of ['wingL', 'wingR']) { const w = m.getObjectByName(nm); if (!w) continue; const pivot = new THREE.Group(); w.parent.add(pivot); pivot.add(w); wings.push({ pivot, side: nm === 'wingR' ? 1 : -1 }); }
  const holder = new THREE.Group(); m.rotation.y = Math.PI; m.scale.setScalar(2.1); holder.add(m);
  return { holder, wings, phase: Math.random() * 10 };
}
const syncButterflies = () => {
  flies.forEach(f => f.holder.parent && f.holder.parent.remove(f.holder)); flies = [];
  const ms = mains();
  for (let i = 0; i < app.S.d.butterflies && ms.length; i++) {
    const f = makeButterfly(WINGS[i % WINGS.length]);
    if (i === 0) { const n = nodes.get('i' + ms[0].id); f.holder.position.set(0.02, 1.085, 0.015); f.holder.rotation.y = 0.8; f.sitting = true; (n ? n.inner : bouquet).add(f.holder); }
    else { f.orbit = { r: 0.5 + i * 0.12, speed: 0.35 + i * 0.08, y: 0.95 + i * 0.08, dir: i % 2 ? -1 : 1 }; bouquet.add(f.holder); }
    flies.push(f);
  }
}

/* ---- glow sprites: fairy lights, sparkle dust, landing bursts */
const glowTex = (() => {
  const c = createCanvas(64, 64);
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,214,140,.55)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return canvasTexture(c);
})();
const lightsGroup = new THREE.Group(); bouquet.add(lightsGroup);
let bulbs = [], lightsTheta = -1;
const disposeLights = () => {
  lightsGroup.traverse(o => { if (o.isMesh && o.geometry !== bulbGeo) o.geometry.dispose(); if (o.isSprite || (o.isMesh && o.material !== bulbMat)) o.material.dispose(); });
  lightsGroup.clear();
}
const bulbGeo = new THREE.SphereGeometry(0.0065, 10, 8), bulbMat = new THREE.MeshBasicMaterial({ color: '#FFE2A8' });
const buildLights = () => {
  if (!app.S.d.lights || !app.S.items.length) { disposeLights(); bulbs = []; lightsTheta = -1; return; }
  if (Math.abs(lightsTheta - theta) < 0.01 && lightsGroup.children.length) return;
  lightsTheta = theta; disposeLights(); bulbs = [];
  const pts = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90, y = 0.55 + t * 0.42, ang = t * 2.6 * Math.PI * 2;
    const r = (y - TIE) * Math.sin(theta * 0.95 + 0.05) * (1.05 - 0.25 * t) + 0.04;
    pts.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  lightsGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.0016, 4), new THREE.MeshStandardMaterial({ color: '#9C8452', roughness: 0.4, metalness: 0.6 })));
  for (let i = 0; i < 30; i++) {
    const p = curve.getPointAt((i + 0.5) / 30), b = new THREE.Mesh(bulbGeo, bulbMat); b.position.copy(p);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(0.075); s.position.copy(p); lightsGroup.add(b, s); bulbs.push({ s, ph: Math.random() * 6.28 });
  }
}
const dust = (() => {
  const N = 80, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) seeds.push({ a: Math.random() * 6.28, r: 0.18 + Math.random() * 0.42, y: Math.random(), sp: 0.04 + Math.random() * 0.07, w: Math.random() * 6 });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, size: 0.045, color: '#FFD98A', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  pts.visible = false; pts.frustumCulled = false; bouquet.add(pts);
  return { pts, seeds, pos, geo };
})();
const bursts = [];
const burstMat = new THREE.SpriteMaterial({ map: glowTex, color: '#FFE6A8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const burst = (at) => {
  if (reduceMotion) return;
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(burstMat.clone()); s.position.copy(at); s.scale.setScalar(0.05);
    const a = Math.random() * 6.28, up = 0.2 + Math.random() * 0.5;
    s.userData = { v: new THREE.Vector3(Math.cos(a) * 0.35, up, Math.sin(a) * 0.35), life: 0 };
    scene.add(s); bursts.push(s);
  }
}

// Compile every flower, wrap and decor shader while the loading screen is still up, so the first rose, the first
// sunflower or the first wrap does not freeze the screen for a moment on a phone.
const warmShaders = async () => {
  const g = new THREE.Group(), add = (m, type, hex, extra) => { paint(m, type, hex, extra); g.add(m); };
  for (const [type, f] of Object.entries(ALL)) if (T[modelOf(type)]) add(T[modelOf(type)].clone(true), type, f.colors[0][1]);
  if (T.heart) add(T.heart.clone(true), 'heart', '#C8325A', { heart: '#C8325A' });
  if (T.choco) add(T.choco.clone(true), 'choco', '#D9A441');
  if (T.butterfly) add(T.butterfly.clone(true), 'butterfly', '#F2A1B8', { wing: '#F2A1B8' });
  if (T.card) { const c = T.card.clone(true); c.traverse(o => { if (o.isMesh) o.material = o.material.name === 'card' ? cardMat : mat('card-pick', '', '#C9A877'); }); g.add(c); }
  const wrapVis = wrapGroup.visible, hidden = [];
  wrapGroup.visible = true; wrapGroup.traverse(o => { if (o.isMesh && !o.visible) { o.visible = true; hidden.push(o); } });
  bouquet.add(g);
  try { if (renderer.compileAsync) { const p = renderer.compileAsync(scene, camera); bouquet.remove(g); await p; } else renderer.compile(scene, camera); }
  catch (e) {}
  bouquet.remove(g);
  wrapGroup.visible = wrapVis; for (const o of hidden) o.visible = false;
}
const sync3D = () => {
  if (!T.rose || !ribbonModel) return;
  if (!app.S.items.length) app.S.wrapped = false;
  syncFlowers(); syncCard(); syncPicks();
  layout(); syncPearls(); syncButterflies(); paintWrap();
  dust.pts.visible = app.S.d.sparkle && app.S.items.length > 0;
  if (!app.S.items.length && view === 'studio') hideHint();
}

/* ======================================================================= garden
   A walled cottage garden. A stepping-stone path runs from the rose arch (oldest bouquets,
   under the blossom tree and the bench) toward the camera; every bouquet the couple sends
   is planted in its own bed beside the path with a little hand-lettered sign. Light theme
   is a golden afternoon, dark theme a lantern-lit night with fireflies. */
const beds = new THREE.Group(), gWorld = new THREE.Group(), gFxG = new THREE.Group();
gScene.add(gWorld, beds, gFxG);
let gBuilt = false, gFocus = null, selRing = null, gWorldKey = '', gBase = null, gShadowDirty = true;
// phones get fewer grass blades and a lower pixel ratio in the garden; a slow device steps down once more by itself
const gQ = { dpr: sQ.tier >= 2 ? 1.1 : sQ.tier >= 1 ? 1.3 : 1.5, grass: sQ.tier >= 2 ? 7000 : sQ.tier >= 1 ? 9000 : 12000, frames: [], checked: 0 };
gDensity = gQ.dpr;
const gBox = { z0: -2.6, z1: -0.5, cz: -1.5 };
const gU = { time: { value: 0 }, scale: { value: 400 } };
const gFx = { sky: null, stars: null, motes: null, petals: null, flies: [], lamps: [], lights: [], glows: [], own: [], signs: [] };
const pathX = z => 0.3 * Math.sin(z * 0.62 + 0.4);
const makeRnd = s => { let x = (Math.abs(Math.floor(s)) % 2147483646) + 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const PROP = { bark: ['#6E5144', 0.95], blossom: ['#F4B9C8', 0.85], wood: ['#B98352', 0.72], metal: ['#2A2E2D', 0.45, 0.55], paint: ['#F3EFE6', 0.55],
  climb: ['#E3708A', 0.7], stem: ['#4E7A3E', 0.8], leaf: ['#4C8A3E', 0.7], hedge: ['#5E9150', 0.95], stone: ['#B9AF9F', 0.95], glass: ['#FFE6B0', 0.3] };
const pmat = (part, hex) => {
  const k = 'prop|' + part + '|' + (hex || '');
  if (matCache.has(k)) return matCache.get(k);
  const [c, r, m = 0] = PROP[part] || ['#8A8F86', 0.8];
  const mm = new THREE.MeshStandardMaterial({ color: hex || c, roughness: r, metalness: m, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 0.55 });
  if (part === 'glass') { mm.emissive = new THREE.Color('#FFB24A'); mm.emissiveIntensity = 0.3; }
  mm.name = part; matCache.set(k, mm); return mm;
}
const dress = (model, over = {}) => {
  freeze(model);
  model.traverse(o => {
    if (!o.isMesh) return;
    const part = o.userData.part || (o.userData.part = o.material.name);
    o.material = pmat(part, over[part]); o.castShadow = part !== 'glass'; o.receiveShadow = true;
  });
  return model;
}
// one InstancedMesh per sub-mesh of a model; list items are {x, y, z, ry, s, sy}
const instanced = (model, list, over = {}, cast = true) => {
  const g = new THREE.Group(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  model.updateMatrixWorld(true);
  model.traverse(o => {
    if (!o.isMesh) return;
    const part = o.userData.part || o.material.name;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); gFx.own.push(geo);
    const im = new THREE.InstancedMesh(geo, pmat(part, over[part]), list.length);
    list.forEach((t, i) => { e.set(t.rx || 0, t.ry || 0, 0); q.setFromEuler(e); m4.compose(v.set(t.x, t.y || 0, t.z), q, sc.set(t.s, t.sy || t.s, t.s)); im.setMatrixAt(i, m4); });
    im.castShadow = cast; im.receiveShadow = true; g.add(im);
  });
  return g;
}
// gentle wind for grass, wildflowers and leaves; normals stay "up" so blades read as soft turf
const windy = (m, amp, byHeight = true) => {
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = gU.time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wpos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float gust = sin(uTime * 1.1 + wpos.x * 0.7 + wpos.z * 0.45) * 0.6 + sin(uTime * 2.6 + wpos.x * 2.1 - wpos.z * 1.3) * 0.25;
      float hk = ${byHeight ? 'position.y * position.y' : '1.0'};
      transformed.z += gust * ${amp.toFixed(3)} * hk; transformed.x += gust * ${(amp * 0.4).toFixed(3)} * hk;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
  };
  m.customProgramCacheKey = () => 'windy' + amp + byHeight;
  return m;
}
const softTex = (inner, outer) => {
  const c = createCanvas(64, 64);
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return canvasTexture(c);
}

/* ---- sky dome: soft gradient with a sun (or moon) disc and glow */
const makeSky = () => {
  const mtl = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, disc: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 top, mid, hor, sunCol, sunDir; uniform float disc; varying vec3 vP;
      void main(){ vec3 d = normalize(vP); float h = d.y;
        vec3 c = mix(hor, mid, smoothstep(-0.03, 0.2, h)); c = mix(c, top, smoothstep(0.16, 0.8, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 5.0) * 0.28 + pow(s, 48.0) * 0.45 + smoothstep(0.9993, 0.9996, s) * disc);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const m = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), mtl); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}
const makeStars = () => {
  const n = 700, pos = new Float32Array(n * 3), R = makeRnd(77);
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, y = 0.08 + Math.pow(R(), 0.7) * 0.92, r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 80; pos[i * 3 + 1] = y * 80; pos[i * 3 + 2] = Math.sin(a) * r * 80;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: '#E9EEFF', transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
  p.frustumCulled = false; p.renderOrder = -9; return p;
}
/* drifting pollen by day, blinking fireflies by night */
const makeMotes = () => {
  const n = 120, pos = new Float32Array(n * 3), ph = new Float32Array(n), R = makeRnd(5);
  for (let i = 0; i < n; i++) { pos[i * 3] = (R() - 0.5) * 7; pos[i * 3 + 1] = 0.15 + R() * 1.6; pos[i * 3 + 2] = (R() - 0.5) * 7; ph[i] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: gU.time, uScale: gU.scale, color: { value: new THREE.Color('#fff2cc') }, size: { value: 0.03 }, night: { value: 0 } },
    vertexShader: `attribute float ph; uniform float uTime, uScale, size; varying float vA;
      void main(){ vec3 p = position; p.x += sin(uTime * 0.23 + ph * 6.3) * 0.35; p.y += sin(uTime * 0.37 + ph * 4.1) * 0.18; p.z += cos(uTime * 0.21 + ph * 5.7) * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        vA = 0.5 + 0.5 * sin(uTime * (1.2 + ph * 1.5) + ph * 20.0); gl_PointSize = size * uScale / -mv.z; }`,
    fragmentShader: `uniform vec3 color; uniform float night; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a; gl_FragColor = vec4(color, a * mix(0.55, pow(vA, 3.0), night)); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}
/* petals drifting down from the blossom trees */
const makePetals = () => {
  const geo = new THREE.PlaneGeometry(0.03, 0.022, 2, 1); geo.translate(0, 0, 0);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(p.getX(i)) * 0.25);
  geo.computeVertexNormals();
  const n = 90, im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#F7C6D3', roughness: 0.7, side: THREE.DoubleSide }), n);
  const R = makeRnd(9), seeds = [];
  for (let i = 0; i < n; i++) seeds.push({ t: R(), sp: 0.12 + R() * 0.1, a: R() * 6.28, r: R(), w: R() * 6.28, tree: i % 3 === 2 ? 1 : 0 });
  im.userData.seeds = seeds; im.frustumCulled = false; im.castShadow = false;
  return im;
}
const TREES = [{ x: -2.6, z: -3.65, s: 1.0, ry: 0.4, blossom: '#F4B9C8' }, { x: 3.0, z: -4.3, s: 0.82, ry: 2.1, blossom: '#F9DCE8' }];
const m4t = new THREE.Matrix4(), qt = new THREE.Quaternion(), et = new THREE.Euler(), vt = new THREE.Vector3(), st1 = new THREE.Vector3(1, 1, 1);
const stepPetals = (dt, t) => {
  const im = gFx.petals; if (!im) return;
  im.userData.seeds.forEach((s, i) => {
    const tr = TREES[s.tree];
    if (!reduceMotion) { s.t += dt * s.sp * 0.25; if (s.t > 1) { s.t = 0; s.a = Math.random() * 6.28; s.r = Math.random(); } }
    const r = (0.3 + s.r * 1.2) * tr.s, y = (2.3 - s.t * 2.3) * tr.s;
    const dx = Math.sin(t * 0.8 + s.w) * 0.25 + s.t * 1.1, dz = Math.cos(t * 0.6 + s.w) * 0.2 + s.t * 0.6;
    vt.set(tr.x + Math.cos(s.a) * r + dx, Math.max(0.02, y), tr.z + Math.sin(s.a) * r + dz);
    et.set(t * 1.3 + s.w, t * 0.9 + s.a, t * 0.7); qt.setFromEuler(et);
    const fade = y < 0.05 ? 0.001 : 1;
    m4t.compose(vt, qt, st1.setScalar(fade)); im.setMatrixAt(i, m4t);
  });
  im.instanceMatrix.needsUpdate = true;
}

/* ---- layout */
const bedSlot = (i) => {
  const row = Math.floor(i / 4), k = i % 4, R = makeRnd(i * 97 + 13);
  const z = -1.55 + row * 1.1 + [0, 0.55, 0.28, 0.82][k] + (R() - 0.5) * 0.12;
  const side = [-1, 1, 1, -1][k], off = [0.8, 0.82, 1.66, 1.62][k] + (R() - 0.5) * 0.16;
  return { x: pathX(z) + side * off, z, side };
}
// Bahçem: every bouquet I sent or received. Bahçemiz: only those between me and my partner.
const gardenList = () => { return gardenEntries().slice().sort((a, b) => a.at - b.at); }

/* ---- static set: ground, grass, path, trees, bench, arch, lanterns, hedges */
const groundY = (x, z) => {
  const r = Math.hypot(x * 0.8, z - gBox.cz);
  const hills = Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17) * 1.3 + Math.sin(x * 0.09 - z * 0.12 + 2) * 1.6 + 1.2;
  return Math.max(0, hills) * smooth(7.5, 22, r);
}
const buildWorld = () => {
  gWorld.clear(); gFx.own.forEach(g => g.dispose()); gFx.own = []; gFx.lamps = []; gFx.glows = [];
  for (const l of gFx.lights) gScene.remove(l);
  gFx.lights = [];
  const R = makeRnd(2024), z0 = gBox.z0, z1 = gBox.z1;
  // ground with soft colour variation, rising into far hills
  const gg = new THREE.PlaneGeometry(150, 150, 96, 96); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, gBox.cz); gFx.own.push(gg);
  const pos = gg.attributes.position, col = new Float32Array(pos.count * 3), c1 = new THREE.Color('#5E8C45'), c2 = new THREE.Color('#8DB665'), c3 = new THREE.Color('#A9B86A'), cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = groundY(x, z); pos.setY(i, h - 0.004);
    const n = 0.5 + 0.25 * Math.sin(x * 1.7 + Math.sin(z * 1.3)) + 0.25 * Math.sin(z * 2.3 - x * 0.7);
    cc.copy(c1).lerp(c2, n); cc.lerp(c3, smooth(8, 30, Math.hypot(x, z - gBox.cz)) * 0.6);
    for (const tr of TREES) cc.multiplyScalar(1 - 0.28 * (1 - smooth(0.4, 2.2, Math.hypot(x - tr.x, z - tr.z))));
    col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.3 }));
  ground.receiveShadow = true; gWorld.add(ground);
  // grass: tapered blades, darker at the root, swaying
  const blade = new THREE.BufferGeometry(), bp = [], bc = [], bn = [], bi = [];
  for (let i = 0; i <= 3; i++) {
    const t = i / 3, w = 0.015 * Math.pow(1 - t, 0.85) + 0.0006, bend = t * t * 0.07, g = 0.38 + 0.62 * t;
    bp.push(-w, t, bend, w, t, bend); bc.push(g, g, g, g, g, g); bn.push(0, 1, 0, 0, 1, 0);
    if (i < 3) { const a = i * 2; bi.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); blade.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
  blade.setAttribute('normal', new THREE.Float32BufferAttribute(bn, 3)); blade.setIndex(bi); gFx.own.push(blade);
  const x0 = -5.6, x1 = 5.6, zA = z0 - 2.6, zB = z1 + 3.4;
  const N = Math.min(gQ.grass, Math.round((x1 - x0) * (zB - zA) * 260));
  const grass = new THREE.InstancedMesh(blade, windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.3 }), 0.09), N);
  const slots = gardenList().map((_, i) => bedSlot(i));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  let k = 0;
  for (let tries = 0; k < N && tries < N * 3; tries++) {
    const x = x0 + R() * (x1 - x0), z = zA + R() * (zB - zA);
    const dp = Math.abs(x - pathX(z));
    if (dp < 0.26 && z > z0 - 0.5) continue;
    if (slots.some(b => (b.x - x) ** 2 + (b.z - z) ** 2 < 0.07)) continue;
    const edge = smooth(0.26, 0.5, dp);
    e.set((R() - 0.5) * 0.35, R() * 6.28, (R() - 0.5) * 0.35); q.setFromEuler(e);
    const h = (0.07 + R() * 0.11) * (0.55 + 0.45 * edge);
    m4.compose(v.set(x, 0, z), q, s.set(0.8 + R() * 0.6, h, 1)); grass.setMatrixAt(k, m4);
    grass.setColorAt(k, c.setHSL(0.22 + R() * 0.07, 0.42 + R() * 0.2, 0.3 + R() * 0.16)); k++;
  }
  grass.count = k; grass.receiveShadow = true; grass.castShadow = false; gWorld.add(grass); gFx.grass = grass;
  // wildflowers dotted through the lawn
  const head = new THREE.IcosahedronGeometry(0.016, 0); head.scale(1, 0.55, 1); gFx.own.push(head);
  const WF = ['#FFFFFF', '#FFF4C2', '#F7D46B', '#E8C9F2', '#F6B8C8'], nW = 700;
  const wild = new THREE.InstancedMesh(head, windy(new THREE.MeshStandardMaterial({ roughness: 0.7, envMapIntensity: 0.4 }), 0.012, false), nW);
  k = 0;
  for (let tries = 0; k < nW && tries < nW * 4; tries++) {
    const x = x0 + R() * (x1 - x0), z = zA + R() * (zB - zA);
    if (Math.abs(x - pathX(z)) < 0.32 || slots.some(b => (b.x - x) ** 2 + (b.z - z) ** 2 < 0.1)) continue;
    m4.compose(v.set(x, 0.07 + R() * 0.09, z), q.identity(), s.setScalar(0.7 + R() * 0.7)); wild.setMatrixAt(k, m4);
    wild.setColorAt(k, c.set(WF[Math.floor(R() * WF.length)])); k++;
  }
  wild.count = k; gWorld.add(wild);
  // stepping stones
  const stones = [[], [], []];
  for (let z = z0 - 0.15, i = 0; z < z1 + 2.6; z += 0.34, i++) stones[i % 3].push({ x: pathX(z) + (i % 2 ? 0.05 : -0.05) + (R() - 0.5) * 0.04, y: -0.028, z, ry: R() * 6.28, s: 0.95 + R() * 0.25, sy: 1 });
  stones.forEach((list, i) => {
    if (!list.length) return;
    const sg = instanced(TL['g_stone' + (i + 1)], list, {}, false);
    sg.children.forEach(im => { list.forEach((_, j) => im.setColorAt(j, c.setScalar(0.8 + R() * 0.22))); });
    gWorld.add(sg);
  });
  // set pieces at the far end
  TREES.forEach(t => { const m = dress(TL.g_tree.clone(true), { blossom: t.blossom }); m.position.set(t.x, 0, t.z); m.rotation.y = t.ry; m.scale.setScalar(t.s); gWorld.add(m); });
  const arch = dress(TL.g_arch.clone(true)); arch.position.set(pathX(z0), 0, z0); gWorld.add(arch);
  // lanterns along the path
  const glowT = gFx.glowTex || (gFx.glowTex = softTex('rgba(255,214,150,1)', 'rgba(255,170,80,0)'));
  let li = 0;
  for (let z = z0 + 1.35; z < z1 + 0.4; z += 2.1, li++) {
    const side = li % 2 ? -1 : 1, lp = dress(TL.g_lantern.clone(true));
    lp.position.set(pathX(z) + side * 0.5, 0, z); lp.rotation.y = R() * 0.6; gWorld.add(lp); gFx.lamps.push(lp);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    gl.position.set(lp.position.x, 1.14, z); gl.scale.setScalar(1.1); gWorld.add(gl); gFx.glows.push(gl);
    if (gFx.lights.length < 2) { const pl = new THREE.PointLight('#FFC98A', 0, 5, 1.3); pl.position.set(lp.position.x, 1.12, z); gScene.add(pl); gFx.lights.push(pl); }
  }
  // hedge behind the garden, shrubs along the sides, distant bushes on the hills
  const bushes = [[], [], []];
  for (let x = -8; x <= 8; x += 0.62 + R() * 0.3) bushes[Math.floor(R() * 3)].push({ x, z: -5.0 - R() * 0.5, ry: R() * 6.28, s: 1.5 + R() * 0.7 });
  for (const sd of [-1, 1]) for (let z = z0 - 0.4; z < z1 + 0.9; z += 0.9 + R() * 0.5) bushes[Math.floor(R() * 3)].push({ x: sd * (2.75 + R() * 0.9), z, ry: R() * 6.28, s: 0.8 + R() * 0.6 });
  bushes.forEach((list, i) => list.length && gWorld.add(instanced(TL['g_bush' + (i + 1)], list, { blossom: ['#F6F1E7', '#F4C1D0', '#E7D7F5'][i] })));
  // distant bushes on the hills: a low-poly version, softened by fog, no shadows
  const far = [];
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2, r = 10 + R() * 16, x = Math.cos(a) * r * 1.3, z = gBox.cz + Math.sin(a) * r;
    if (z > z1 + 1) continue;
    far.push({ x, y: groundY(x, z) - 0.1, z, ry: R() * 6.28, s: 2 + R() * 2.5 });
  }
  if (TL.g_bushlo) gWorld.add(instanced(TL.g_bushlo, far, { blossom: '#F4D6E0' }, false));
  // the light hugs the garden: fit the sun's shadow box to it
  const half = Math.max(6, (z1 - z0) / 2 + 4.5);
  Object.assign(gSun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 50 });
  gSun.shadow.camera.updateProjectionMatrix(); gShadowDirty = true;
}

/* ---- one bed per bouquet */
const moundGeo = (() => {
  const g = new THREE.SphereGeometry(0.27, 28, 7, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.2, 1);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const n = 0.8 + 0.2 * Math.sin(p.getX(i) * 60) * Math.cos(p.getZ(i) * 55); col[i * 3] = n; col[i * 3 + 1] = n; col[i * 3 + 2] = n; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
})();
const soilMat = new THREE.MeshStandardMaterial({ color: '#6E4D37', roughness: 1, vertexColors: true, envMapIntensity: 0.2 });
const stakeGeo = new THREE.BoxGeometry(0.016, 0.2, 0.016); stakeGeo.translate(0, 0.1, 0);
const plankGeo = new THREE.BoxGeometry(0.22, 0.105, 0.014);
const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
// every sign face is one cell of a shared atlas texture, so all signs are a single draw call
const SIGN_W = 320, SIGN_H = 152, SIGN_COLS = 6;
const drawSign = (g, e, x0, y0) => {
  g.save(); g.translate(x0, y0);
  g.fillStyle = e.dir === 'in' ? '#F3E6CF' : '#F2CDD6'; g.fillRect(0, 0, SIGN_W, SIGN_H);
  g.strokeStyle = 'rgba(110,70,40,.10)'; g.lineWidth = 2;
  for (let y = 10; y < SIGN_H; y += 13) { g.beginPath(); g.moveTo(0, y + Math.sin(y) * 2); g.bezierCurveTo(100, y + 4, 220, y - 4, SIGN_W, y + Math.cos(y) * 2); g.stroke(); }
  g.fillStyle = '#4A2E1E'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const name = e.dir === 'in' ? fromName(e.who) : toName(e.who);
  let fs = 64; g.font = `600 ${fs}px Caveat, cursive`;
  while (g.measureText(name).width > 290 && fs > 30) { fs -= 4; g.font = `600 ${fs}px Caveat, cursive`; }
  g.fillText(name, 160, 62);
  g.font = '600 24px Figtree, system-ui, sans-serif'; g.fillStyle = 'rgba(74,46,30,.72)';
  g.fillText(dateFmt.format(e.at), 160, 118);
  g.restore();
}
/* Beds are merged into one mesh per material across the whole garden, so even a garden
   with dozens of bouquets is a handful of draw calls. Stems are shortened and blooms enlarged,
   and a leafy clump hides the bare stems, so a bed reads as a planted flower clump. */
const HEAD_PARTS = new Set(['petal', 'bud', 'center', 'husk']);
const plantCache = new Map();
const toFloat = (geo, m4) => {
  const n = geo.attributes.position.count, P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
  const pa = geo.attributes.position, na = geo.attributes.normal, ca = geo.attributes.color;
  for (let i = 0; i < n; i++) {
    P[i * 3] = pa.getX(i); P[i * 3 + 1] = pa.getY(i); P[i * 3 + 2] = pa.getZ(i);
    if (na) { N[i * 3] = na.getX(i); N[i * 3 + 1] = na.getY(i); N[i * 3 + 2] = na.getZ(i); } else N[i * 3 + 1] = 1;
    if (ca) { C[i * 3] = ca.getX(i); C[i * 3 + 1] = ca.getY(i); C[i * 3 + 2] = ca.getZ(i); } else C.fill(1, i * 3, i * 3 + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setIndex(new THREE.BufferAttribute(geo.index ? Uint32Array.from(geo.index.array) : Uint32Array.from({ length: n }, (_, i) => i), 1));
  if (m4) g.applyMatrix4(m4);
  return g;
}
const plantParts = (name) => {
  if (plantCache.has(name)) return plantCache.get(name);
  const root = TL[name]; if (!root) return null;
  root.updateMatrixWorld(true);
  const parts = []; let head = Infinity;
  root.traverse(o => {
    if (!o.isMesh) return;
    const part = o.userData.part || o.material.name, geo = toFloat(o.geometry, o.matrixWorld);
    if (HEAD_PARTS.has(part)) { const p = geo.attributes.position.array; for (let i = 1; i < p.length; i += 3) head = Math.min(head, p[i]); }
    parts.push({ part, geo });
  });
  const out = { parts, head: head === Infinity ? null : head };
  plantCache.set(name, out); return out;
}
const mergeUV = (list) => {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); U.set(g.attributes.uv.array, ov * 2);
    const idx = g.index.array; for (let k = 0; k < idx.length; k++) I[oi + k] = idx[k] + ov;
    ov += g.attributes.position.count; oi += idx.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  out.setIndex(new THREE.BufferAttribute(I, 1)); out.computeBoundingSphere(); return out;
}
const concatGeos = (list) => {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), I = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3); C.set(g.attributes.color.array, ov * 3);
    const idx = g.index.array; for (let k = 0; k < idx.length; k++) I[oi + k] = idx[k] + ov;
    ov += g.attributes.position.count; oi += idx.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3));
  out.setIndex(new THREE.BufferAttribute(I, 1)); out.computeBoundingSphere();
  return out;
}
const GROUGH = { petal: 0.62, bud: 0.75, center: 0.9, stem: 0.75, leaf: 0.6, husk: 0.85 };
const gardenMat = (part, type, hex) => {
  const k = 'gm|' + part + '|' + type + '|' + hex;
  if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: GROUGH[part] || 0.7, side: THREE.DoubleSide, vertexColors: true, envMapIntensity: 0.55 });
  if (part === 'petal' && type === 'rose_gold') Object.assign(m, { metalness: 1, roughness: 0.3, envMapIntensity: 1.3 });
  if (part === 'petal' && type === 'rose_night') Object.assign(m, { metalness: 0.25, roughness: 0.35, envMapIntensity: 0.9 });
  matCache.set(k, m); return m;
}
const bedMeshes = new THREE.Group(); gScene.add(bedMeshes);
const proxyGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.7, 10); proxyGeo.translate(0, 0.35, 0);
const FOLIAGE = ['#4A8A3C', '#3F7D3A', '#5A9445'];
const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const placeMat = (x, y, z, ry, s) => { _e.set(0, ry, 0); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s.set(s, s, s)); }
const plantBeds = (list) => {
  const buckets = new Map(), faces = [];
  const nSigns = Math.min(list.length, SIGN_COLS * 26), atlasW = SIGN_W * SIGN_COLS, atlasH = Math.max(1, Math.ceil(nSigns / SIGN_COLS)) * SIGN_H;
  const atlasC = createCanvas(atlasW, atlasH);
  const atlas = atlasC.getContext('2d');
  const put = (key, mat, geo) => { let b = buckets.get(key); if (!b) buckets.set(key, b = { mat, geos: [] }); b.geos.push(geo); };
  const addModel = (name, m4, matFor) => { const pp = plantParts(name); if (pp) for (const { part, geo } of pp.parts) { const [k, mt] = matFor(part); put(k, mt, geo.clone().applyMatrix4(m4)); } };
  list.forEach((e, i) => {
    const slot = bedSlot(i), R = makeRnd(i * 7919 + 3), bx = slot.x, bz = slot.z;
    // tap target, sign, and the bed's identity live on a light group; everything visible is merged
    const g = new THREE.Group(); g.position.set(bx, 0, bz); g.userData.entryId = e.id; g.userData.side = slot.side;
    const proxy = new THREE.Mesh(proxyGeo); proxy.visible = false; g.add(proxy); beds.add(g);
    // sign: wood merged with the rest, face from the atlas
    if (i < SIGN_COLS * 26) {
      _e.set(-0.08, -slot.side * 0.42, 0, 'YXZ'); _q.setFromEuler(_e);
      const sm = new THREE.Matrix4().compose(_v.set(bx - slot.side * 0.14, 0, bz + 0.3), _q, _s.set(1, 1, 1));
      put('wood', pmat('wood'), toFloat(stakeGeo, sm));
      put('wood', pmat('wood'), toFloat(plankGeo, sm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.2, 0))));
      const fg = new THREE.PlaneGeometry(0.21, 0.098), uv = fg.attributes.uv, col = i % SIGN_COLS, row = Math.floor(i / SIGN_COLS);
      for (let q = 0; q < uv.count; q++) uv.setXY(q, (col * SIGN_W + uv.getX(q) * SIGN_W) / atlasW, 1 - (row * SIGN_H + (1 - uv.getY(q)) * SIGN_H) / atlasH);
      fg.applyMatrix4(sm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.2, 0.0075)));
      faces.push(fg); drawSign(atlas, e, col * SIGN_W, row * SIGN_H);
    }
    const mound = toFloat(moundGeo, new THREE.Matrix4().makeScale(1.05 + R() * 0.15, 1, 1.05 + R() * 0.15).premultiply(new THREE.Matrix4().makeTranslation(bx, 0, bz)));
    put('soil', soilMat, mound);
    addModel('g_ground', placeMat(bx, 0, bz, R() * 6.28, 1.1 + R() * 0.15), () => ['leaf|g', pmat('leaf', '#3F7A39')]);
    const fol = FOLIAGE[i % 3];
    addModel('g_foliage', placeMat(bx, 0, bz, R() * 6.28, 0.95 + R() * 0.2), () => ['leaf|' + fol, pmat('leaf', fol)]);
    const stems = expand(e.items, 12), n = stems.length;
    stems.forEach((st, j) => {
      const name = modelOf(st.type), pp = plantParts(name); if (!pp) return;
      const main = isMain(st.type), u = (j + 0.5) / n;
      const a = j * 2.39996 + i, rr = n === 1 ? 0 : 0.02 + 0.15 * Math.sqrt(u);
      const tilt = (rr / 0.17) * 0.34 + 0.02, spin = R() * 6.28, sc = (main ? 0.96 : 0.8) * (0.92 + R() * 0.16);
      // shorter stems toward the rim so the bed domes up in the middle
      const k = main ? 0.52 - 0.15 * u + R() * 0.08 : 0.46 + R() * 0.1;
      const h0 = pp.head !== null ? pp.head - 0.02 : null;
      const m4 = new THREE.Matrix4().makeTranslation(bx + Math.cos(a) * rr, -0.02 + (R() - 0.5) * 0.03, bz + Math.sin(a) * rr)
        .multiply(_r.makeRotationY(-a)).multiply(new THREE.Matrix4().makeRotationZ(-tilt)).multiply(new THREE.Matrix4().makeRotationY(spin))
        .multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
      for (const { part, geo } of pp.parts) {
        const g2 = geo.clone(), p = g2.attributes.position.array;
        for (let q = 1; q < p.length; q += 3) { const y = p[q]; p[q] = h0 === null ? y * k : (y < h0 ? y * k : y - h0 * (1 - k)); }
        g2.applyMatrix4(m4);
        const col = partColor(part, st.type, st.color);
        put(`${part}|${st.type}|${col}`, gardenMat(part, st.type, col), g2);
      }
    });
  });
  for (const { mat, geos } of buckets.values()) {
    const mesh = new THREE.Mesh(concatGeos(geos), mat);
    mesh.castShadow = true; mesh.receiveShadow = true; bedMeshes.add(mesh);
    geos.forEach(g => g.dispose());
  }
  if (faces.length) {
    const tex = canvasTexture(atlasC); tex.anisotropy = 4;
    const fm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, envMapIntensity: 0.3 }); gFx.signs.push(fm);
    const fgeo = mergeUV(faces); faces.forEach(f => f.dispose());
    const mesh = new THREE.Mesh(fgeo, fm); mesh.receiveShadow = true; bedMeshes.add(mesh);
  }
}
const expand = (items, cap) => {
  const out = [];
  for (const [type, color, n] of items) for (let i = 0; i < n; i++) out.push({ type, color });
  if (out.length <= cap) return out;
  const m = out.filter(o => isMain(o.type)), f = out.filter(o => !isMain(o.type));
  return m.slice(0, cap - Math.min(2, f.length)).concat(f.slice(0, Math.min(2, f.length)));
}

/* ---- what makes each garden its own: a bench for two or a single chair, and a sign hung in the arch */
const gSet = new THREE.Group(); gScene.add(gSet);
let gSetKey = '';
const archSignTex = (title, sub) => {
  const c = createCanvas(768, 230);
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 230); gr.addColorStop(0, '#F1E2C4'); gr.addColorStop(1, '#E2CDA4');
  g.fillStyle = gr; g.fillRect(0, 0, 768, 230);
  g.strokeStyle = 'rgba(120,80,40,.12)'; g.lineWidth = 2;
  for (let y = 12; y < 230; y += 15) { g.beginPath(); g.moveTo(0, y + Math.sin(y) * 3); g.bezierCurveTo(250, y + 6, 520, y - 6, 768, y + Math.cos(y) * 3); g.stroke(); }
  g.strokeStyle = 'rgba(110,70,35,.45)'; g.lineWidth = 6; g.strokeRect(12, 12, 744, 206);
  g.fillStyle = '#4A2E1E'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 96; g.font = `600 ${fs}px Caveat, cursive`;
  while (g.measureText(title).width > 690 && fs > 44) { fs -= 4; g.font = `600 ${fs}px Caveat, cursive`; }
  g.fillText(title, 384, sub ? 96 : 115);
  if (sub) { g.font = '600 28px Figtree, system-ui, sans-serif'; g.fillStyle = 'rgba(74,46,30,.7)'; g.fillText(sub, 384, 174); }
  const t = canvasTexture(c); t.anisotropy = 4; return t;
}
const buildSet = () => {
  const ours = app.gMode === 'ours', p = online() && app.ME.partner;
  const me = app.ME && app.ME.name && app.ME.name !== 'Misafir' ? app.ME.name : '';
  const title = ours ? (p ? `${me || 'Sen'} & ${p.name}` : 'Bahçemiz') : (me ? `${genitive(me)} bahçesi` : 'Bahçem');
  const sub = ours ? 'ikimizin bahçesi' : 'sevgiyle büyüyen bahçe';
  const key = `${app.gMode}|${title}|${sub}`;
  if (key === gSetKey) return;
  gSetKey = key;
  if (gFx.setFace) { gFx.setFace.map.dispose(); gFx.setFace.dispose(); gFx.setFace = null; }
  gSet.clear();
  const seat = dress(TL[ours || !TL.g_chair ? 'g_bench' : 'g_chair'].clone(true));
  seat.position.set(ours ? -1.45 : -1.6, 0, -3.0); seat.rotation.y = 0.32; gSet.add(seat);
  const ax = pathX(gBox.z0), az = gBox.z0, wood = pmat('wood'), metal = pmat('metal');
  const face = new THREE.MeshStandardMaterial({ map: archSignTex(title, sub), roughness: 0.85, envMapIntensity: 0.3 }); gFx.setFace = face;
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.29, 0.03), [wood, wood, wood, wood, face, wood]);
  plank.position.set(ax, 1.82, az); plank.castShadow = true;
  gSet.add(plank);
  for (const s of [-1, 1]) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), metal);
    ch.position.set(ax + s * 0.36, 2.08, az); gSet.add(ch);
  }
  // the shared garden gets warm string lights draped from the trees to the arch
  gFx.bulbs = null;
  if (ours) {
    const strings = [[new THREE.Vector3(TREES[0].x + 0.6, 2.05, TREES[0].z + 0.5), new THREE.Vector3(ax - 0.55, 2.0, az)],
      [new THREE.Vector3(ax + 0.55, 2.0, az), new THREE.Vector3(TREES[1].x - 0.6, 1.9, TREES[1].z + 0.6)]];
    const pts = [], wire = [];
    for (const [a, b] of strings) {
      const n = 22, sag = 0.45;
      for (let i = 0; i <= n; i++) {
        const t = i / n, p = a.clone().lerp(b, t); p.y -= sag * 4 * t * (1 - t);
        wire.push(p); if (i % 2 === 1) pts.push(p.clone().add(new THREE.Vector3(0, -0.03, 0)));
      }
      wire.push(null);
    }
    const segs = []; for (let i = 0; i < wire.length - 1; i++) if (wire[i] && wire[i + 1]) segs.push(wire[i], wire[i + 1]);
    gSet.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segs), new THREE.LineBasicMaterial({ color: '#3A3430' })));
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFE2A0' }), pts.length);
    const m4 = new THREE.Matrix4(); pts.forEach((p, i) => bulbs.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z))); gSet.add(bulbs);
    const glow = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ map: gFx.glowTex || (gFx.glowTex = softTex('rgba(255,214,150,1)', 'rgba(255,170,80,0)')), size: 0.32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#FFD9A0' }));
    gSet.add(glow); gFx.bulbs = glow; glow.material.opacity = isDark() ? 1 : 0.35;
  }
  gShadowDirty = true;
}
const buildGarden = () => {
  if (!TL.rose || !TL.g_tree) return;
  if (!gBuilt) {
    gFx.sky = makeSky(); gFx.stars = makeStars(); gFx.motes = makeMotes(); gFx.petals = makePetals();
    gScene.add(gFx.sky, gFx.stars); gFxG.add(gFx.motes, gFx.petals);
    selRing = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    selRing.material.map = (() => { const c = createCanvas(128, 128); const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,230,170,0)'); gr.addColorStop(0.55, 'rgba(255,226,160,.85)'); gr.addColorStop(0.7, 'rgba(255,214,140,.35)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return canvasTexture(c); })();
    selRing.rotation.x = -Math.PI / 2; selRing.position.y = 0.03; selRing.visible = false; gScene.add(selRing);
    for (let i = 0; i < 3; i++) { const f = makeButterfly(WINGS[i]); f.holder.scale.setScalar(0.75); f.holder.traverse(o => { o.castShadow = false; }); f.g = { c: new THREE.Vector3(), next: 0, i }; gFxG.add(f.holder); gFx.flies.push(f); }
    gBuilt = true; gReady = true; gardenTheme();
  }
  const list = gardenList();
  const slots = list.map((_, i) => bedSlot(i));
  gBox.z1 = Math.max(-0.6, ...slots.map(s => s.z)); gBox.cz = (gBox.z0 + gBox.z1) / 2;
  const key = `${Math.ceil(list.length / 4)}`;
  if (key !== gWorldKey) { gWorldKey = key; buildWorld(); }
  beds.clear(); gFx.signs.forEach(m => { m.map.dispose(); m.dispose(); }); gFx.signs = [];
  bedMeshes.children.forEach(m => m.geometry.dispose()); bedMeshes.clear();
  plantBeds(list); buildSet(); gShadowDirty = true;
  gFx.motes.position.set(0, 0, gBox.cz); gardenTheme();
}
const gardenTheme = () => {
  if (!gReady) return;
  const night = isDark(), u = gFx.sky.material.uniforms;
  const sunDir = night ? new THREE.Vector3(-0.45, 0.42, -0.78) : new THREE.Vector3(0.62, 0.3, -0.72);
  sunDir.normalize(); u.sunDir.value.copy(sunDir);
  if (night) {
    u.top.value.set('#070B22'); u.mid.value.set('#16204A'); u.hor.value.set('#3B3866'); u.sunCol.value.set('#C9D6FF'); u.disc.value = 1.4;
    gScene.fog = new THREE.Fog('#2A2B50', 10, 34);
    gHemi.color.set('#7F8FD0'); gHemi.groundColor.set('#2A3E30'); gHemi.intensity = 1.1;
    gSun.color.set('#B7C6FF'); gSun.intensity = 1.2; gFill.color.set('#6E7DC0'); gFill.intensity = 0.45;
    gScene.environment = null;
  } else {
    u.top.value.set('#8DB9E6'); u.mid.value.set('#C7DDF0'); u.hor.value.set('#FBE0C8'); u.sunCol.value.set('#FFE2B0'); u.disc.value = 1.2;
    gScene.fog = new THREE.Fog('#EBDCC8', 11, 40);
    gHemi.color.set('#FFF1DE'); gHemi.groundColor.set('#5D7F4B'); gHemi.intensity = 1.05;
    gSun.color.set('#FFD7A3'); gSun.intensity = 2.7; gFill.color.set('#E2EBFF'); gFill.intensity = 0.7;
    gScene.environment = envTex;
  }
  gFx.sunDir = sunDir; aimSun();
  gFx.stars.visible = night;
  const mu = gFx.motes.material.uniforms; mu.night.value = night ? 1 : 0; mu.color.value.set(night ? '#E4FF8A' : '#FFF4D2'); mu.size.value = night ? 0.06 : 0.028;
  pmat('glass').emissiveIntensity = night ? 3.2 : 0.25;
  gFx.glows.forEach(g => { g.material.opacity = night ? 0.9 : 0; });
  if (gFx.bulbs) gFx.bulbs.material.opacity = night ? 1 : 0.35;
  gFx.lights.forEach(l => { l.intensity = night ? 5 : 0; });
  gShadowDirty = true;
}
const focusPatch = (id) => {
  const g = beds.children.find(c => c.userData.entryId === id);
  if (!g) return;
  // look at the bed from the path side, a little above the flowers
  const dir = new THREE.Vector3(-g.userData.side * 0.45, 0.62, 0.78).normalize();
  gFocus = { target: g.position.clone().setY(0.34), pos: g.position.clone().setY(0.34).addScaledVector(dir, 2.1) };
  gUser = true;
  selRing.position.x = g.position.x; selRing.position.z = g.position.z; selRing.visible = true;
}
// tap on the garden: which bed (bouquet) is under the finger? x, y in layout points
const pickBed = (x, y) => {
  if (view !== 'garden') return null;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x / viewW) * 2 - 1, -(y / viewH) * 2 + 1), gCam);
  const hit = ray.intersectObjects(beds.children, true)[0];
  if (!hit) return null;
  let o = hit.object; while (o && !o.userData.entryId) o = o.parent;
  return o ? o.userData.entryId : null;
}

/* ======================================================================= camera fit + loop */
// on a phone the bouquet should not sit under the top bar (name, gold, buttons): shift the image down and fit it
let camFrac = 1, topInset = 0, botInset = 0, welcomeOpen = false;
const studioFrame = () => {
  const w = viewW, h = viewH;
  if (h > 0) {
    const top = Math.max(0, topInset) * 0.6, bot = 18 + Math.max(0, botInset);
    camFrac = Math.max(0.62, (h - top - bot) / h);
    camera.setViewOffset(w, h, 0, -(top - bot) / 2, w, h);
  } else { camFrac = 1; camera.clearViewOffset(); }
}
// while the welcome card covers the lower part of the screen, slide the garden up into the free area
let gBotInset = 0;
const welcomeFrame = () => {
  const w = viewW, h = viewH;
  if (welcomeOpen && w && h) gCam.setViewOffset(w, h, 0, h * 0.2, w, h);
  else if (w && h) gCam.setViewOffset(w, h, 0, -Math.min(30, h * 0.05) + gBotInset / 2, w, h);
  else gCam.clearViewOffset();
}
const resize = () => {
  presenter.setScreen(bufW(), bufH()); applyDensity();
  for (const c of [camera, gCam]) { c.aspect = viewW / Math.max(1, viewH); c.updateProjectionMatrix(); }
  controls.viewHeight = viewH; gControls.viewHeight = viewH;
  studioFrame(); welcomeFrame();
}
const fitDist = (aspect = camera.aspect, fov = camera.fov, frac = camFrac) => {
  const v = 2 * Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const half = Math.max(app.S.wrapped ? 0.42 * wrapScaleT : 0.2, 0.16 + 0.82 * Math.sin(theta)) + 0.06;
  const tall = 1.38 + Math.max(0, Math.sin(theta) - 0.35) * 0.5;
  return Math.min(4.4, Math.max(tall / v, (half * 2) / (v * aspect))) / frac;
}
const placeCamera = () => { const d = fitDist(); camera.position.set(0, 0.56 + d * 0.42, d * 0.9); controls.update(); }
const placeGardenCam = () => {
  const v = 2 * Math.tan(THREE.MathUtils.degToRad(gCam.fov / 2)), depth = gBox.z1 - gBox.z0;
  const d = Math.min(11, Math.max(4.6, 3.4 / (v * gCam.aspect), depth * 1.25 + 2.6));
  // on tall phone screens look a little higher so the arch sign clears the garden switch
  gControls.target.set(pathX(gBox.z0 + 1) * 0.5, gCam.aspect < 0.95 ? 1.08 : 0.85, gBox.z0 + 0.9);
  const dir = new THREE.Vector3(0.26, 0.3, 0.92).normalize();
  gCam.position.copy(gControls.target).addScaledVector(dir, d); gControls.update();
  gBase = { theta: Math.atan2(dir.x, dir.z) }; gUser = false;
}
const aimSun = () => {
  if (!gFx.sunDir) return;
  const c = new THREE.Vector3(0, 0, gBox.cz);
  gSun.target.position.copy(c); gSun.position.copy(c).addScaledVector(gFx.sunDir, 22);
  gFill.target.position.copy(c); gFill.position.set(-4, 5, gBox.cz + 7);
}

let view = 'studio', flight = null;
const clock = new THREE.Clock();
const tmpV = new THREE.Vector3();
const now = () => Date.now();
// Shadows only need redrawing while something moves (a stem settling, the wrap, a flight); otherwise the slow
// bob of the bouquet is caught a few times a second. On slower phones a calm scene is also drawn at 30 fps.
let studioCalm = false, lastInput = 0, shadowTick = 0;
const studioWatch = dt => {
  if (covered || sQ.tier >= 3) { sQ.frames.length = 0; return; }
  if (sQ.skip > 0) { sQ.skip--; return; }
  sQ.frames.push(dt);
  if (sQ.frames.length < 90) return;
  const f = sQ.frames.sort((a, b) => a - b), med = f[f.length >> 1];
  sQ.frames.length = 0;
  if (med > 0.026) setStudioTier(sQ.tier + 1);
}
const setStudioTier = tier => {
  sQ.tier = Math.min(3, tier); sQ.skip = 60;
  on.tier && on.tier(sQ.tier);
  if (sQ.tier >= 2 && key.shadow.mapSize.x > 512) { key.shadow.mapSize.setScalar(512); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
  if (sQ.tier >= 3 && !LITE) { LITE = true; scene.traverse(o => { if (o.isMesh) o.material = liteMat(o.material); }); }
  applyDensity();
}
const draw = (sc, cam) => presenter.render(sc, cam, { exposure: renderer.toneMappingExposure, fxaa: true });
let skipDraw = false, fullRate = true;
const stepStudio = (dt, t) => {
  // quality is judged only on full-rate frames (while the user turns the bouquet)
  if (fullRate) studioWatch(dt);
  const k = 1 - Math.pow(0.0015, dt);
  let moving = !!flight || bursts.length > 0;
  for (const [nk, n] of nodes) {
    n.cur.az = angLerp(n.cur.az, n.tgt.az, k);
    n.cur.spin = angLerp(n.cur.spin, n.tgt.spin, k);
    n.cur.tilt += (n.tgt.tilt - n.cur.tilt) * k;
    n.vl += ((n.tgt.lift - n.cur.lift) * 70 - n.vl * 11) * dt; n.cur.lift += n.vl * dt;
    n.vs += ((n.tgt.s - n.cur.s) * 80 - n.vs * 14) * dt; n.cur.s = Math.max(0, n.cur.s + n.vs * dt);
    applyNode(n);
    if (!moving && (n.dying || Math.abs(n.vl) > 0.004 || Math.abs(n.vs) > 0.004 || Math.abs(n.tgt.tilt - n.cur.tilt) > 0.002
      || Math.abs(n.tgt.lift - n.cur.lift) > 0.002 || Math.abs(angDiff(n.tgt.az, n.cur.az)) > 0.003 || Math.abs(angDiff(n.tgt.spin, n.cur.spin)) > 0.003)) moving = true;
    if (n.fresh && n.cur.lift - n.tgt.lift < 0.02) {
      n.fresh = false;
      n.inner.updateWorldMatrix(true, false);
      burst(n.inner.localToWorld(tmpV.set(0, 1.0, 0)).clone());
    }
    if (n.dying && n.cur.s < 0.03) { bouquet.remove(n.az); nodes.delete(nk); }
  }
  // wrap animation toward the wanted state
  const want = app.S.wrapped && app.S.items.length ? 1 : 0;
  if (wrapP !== want) {
    wrapP = reduceMotion ? want : clamp01(wrapP + Math.sign(want - wrapP) * dt / 1.7);
    applyWrap(wrapP); moving = true;
  }
  if (Math.abs(wrapScaleT - wrapScale) > 0.002 || Math.abs(teddyV) > 0.01) moving = true;
  wrapScale += (wrapScaleT - wrapScale) * k;
  wrapGroup.scale.set(wrapScale, 1, wrapScale);
  // teddy rides on the wrap's front lip
  const tw = app.S.d.teddy && wrapP > 0.95 ? 1.6 : 0;
  teddyV += ((tw - teddyS) * 70 - teddyV * 12) * dt; teddyS = Math.max(0, teddyS + teddyV * dt);
  teddyHolder.scale.setScalar(Math.max(0.001, teddyS));
  teddyHolder.position.set(0, 0.47, 0.215 * wrapScale + 0.02);
  if (teddyRing) teddyRing.visible = app.S.d.ring;
  let fy = 0, fs = 1;
  if (flight) {
    flight.t += dt; const e = ease(clamp01(flight.t / 1.0));
    fy = e * 1.8; fs = 1 - 0.55 * e; bouquet.rotation.y += dt * 2.5 * e;
    if (flight.t >= 1.0) { const done = flight.done; flight = null; bouquet.rotation.y = 0; done(); }
  }
  bouquet.position.y = (reduceMotion ? 0 : Math.sin(t * 0.9) * 0.008) + fy;
  bouquet.scale.setScalar(fs);
  for (const f of flies) {
    const flap = f.sitting ? (Math.sin(t * 1.6 + f.phase) > 0.6 ? Math.sin(t * 9) * 0.5 + 0.55 : 0.35 + Math.sin(t * 0.8) * 0.15) : Math.sin(t * 14 + f.phase) * 0.9 + 0.3;
    for (const w of f.wings) w.pivot.rotation.z = flap * w.side;
    if (f.orbit) {
      const o = f.orbit, a = (reduceMotion ? 0 : t * o.speed * o.dir) + f.phase;
      f.holder.position.set(Math.cos(a) * o.r, o.y + Math.sin(a * 2.3) * 0.07, Math.sin(a) * o.r);
      const a2 = a + 0.05 * o.dir;
      f.holder.lookAt(tmpV.set(Math.cos(a2) * o.r, o.y + Math.sin(a2 * 2.3) * 0.07, Math.sin(a2) * o.r).add(bouquet.position));
    }
  }
  for (const b of bulbs) b.s.material.opacity = 0.65 + 0.35 * Math.sin(t * 2.2 + b.ph);
  if (dust.pts.visible) {
    const top = 0.55 + 0.5 * Math.sin(theta) + 0.6;
    dust.seeds.forEach((s, i) => {
      if (!reduceMotion) { s.y += s.sp * dt; if (s.y > 1) s.y = 0; }
      const y = 0.45 + s.y * (top - 0.45), r = s.r * (0.6 + Math.sin(theta) * 1.2), a = s.a + t * 0.15 + Math.sin(t + s.w) * 0.1;
      dust.pos[i * 3] = Math.cos(a) * r; dust.pos[i * 3 + 1] = y; dust.pos[i * 3 + 2] = Math.sin(a) * r;
    });
    dust.geo.attributes.position.needsUpdate = true;
    dust.pts.material.opacity = 0.75 + 0.25 * Math.sin(t * 2);
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const s = bursts[i], u = s.userData; u.life += dt;
    s.position.addScaledVector(u.v, dt); u.v.multiplyScalar(0.92); u.v.y -= 0.2 * dt;
    s.material.opacity = Math.max(0, 1 - u.life / 0.9); s.scale.setScalar(0.05 * (1 - u.life / 1.2));
    if (u.life > 0.9) { scene.remove(s); s.material.dispose(); bursts.splice(i, 1); }
  }
  if (!userMoved) {
    const off = camera.position.clone().sub(controls.target), len = off.length(), d = fitDist();
    if (Math.abs(d - len) > 0.002) camera.position.copy(controls.target).add(off.setLength(len + (d - len) * k * 0.6));
  }
  controls.update(dt);
  studioCalm = !moving;
  if (skipDraw) return false;
  renderer.shadowMap.autoUpdate = false;
  if (++shadowTick >= (moving ? (sQ.tier >= 1 ? 2 : 1) : 6)) { renderer.shadowMap.needsUpdate = true; shadowTick = 0; }
  draw(scene, camera);
  return true;
}
const gSph = new THREE.Spherical(), gOff = new THREE.Vector3(), gTmp = new THREE.Vector3();
const watchSpeed = dt => {
  // after the garden settles, average ~2 s of frames; if it runs under ~30 fps, step quality down (at most twice)
  if (gQ.checked >= 2 || covered) { gQ.frames.length = 0; return; }
  gQ.frames.push(dt);
  if (gQ.frames.length < 150) return;
  const avg = gQ.frames.slice(30).reduce((a, b) => a + b, 0) / (gQ.frames.length - 30);
  gQ.frames.length = 0;
  if (avg < 0.033) { gQ.checked = 2; return; }
  gQ.checked++;
  gQ.dpr = Math.max(1, gQ.dpr - 0.4); gDensity = gQ.dpr; applyDensity();
  if (gFx.grass) gFx.grass.count = Math.floor(gFx.grass.count * 0.6);
  if (gQ.checked === 2) { gSun.shadow.mapSize.set(1024, 1024); if (gSun.shadow.map) { gSun.shadow.map.dispose(); gSun.shadow.map = null; } gShadowDirty = true; }
}
const stepGarden = (dt, t) => {
  if (fullRate) watchSpeed(dt);
  gU.time.value = reduceMotion ? 0 : t;
  gU.scale.value = presenter.height / (2 * Math.tan(THREE.MathUtils.degToRad(gCam.fov / 2)));
  const tg = gControls.target;
  if (gFocus) {
    const k = 1 - Math.pow(0.02, dt);
    tg.lerp(gFocus.target, k); gCam.position.lerp(gFocus.pos, k);
    if (gCam.position.distanceToSquared(gFocus.pos) < 1e-4) gFocus = null;
  } else if (!gUser && gBase && !reduceMotion) {
    gSph.setFromVector3(gOff.copy(gCam.position).sub(tg)); gSph.theta = gBase.theta + 0.22 * Math.sin(t * 0.07);
    gCam.position.copy(tg).add(gOff.setFromSpherical(gSph));
  }
  // panning stays inside the garden
  gTmp.copy(tg);
  tg.x = Math.max(-3.4, Math.min(3.4, tg.x)); tg.z = Math.max(gBox.z0 - 1.2, Math.min(gBox.z1 + 2.4, tg.z)); tg.y = Math.max(0.1, Math.min(1.5, tg.y));
  gCam.position.add(gTmp.sub(tg).negate());
  if (selRing && selRing.visible) { selRing.material.opacity = 0.6 + 0.4 * Math.sin(t * 3); selRing.scale.setScalar(1 + 0.05 * Math.sin(t * 3)); }
  if (gFx.sky) { gFx.sky.position.copy(gCam.position); gFx.stars.position.copy(gCam.position); }
  stepPetals(dt, t);
  const list = beds.children;
  for (const f of gFx.flies) {
    if (t > f.g.next) { const b = list[Math.floor(Math.random() * list.length)]; f.g.c.set(b ? b.position.x : 0, 0, b ? b.position.z : gBox.cz); f.g.next = t + 6 + Math.random() * 7; }
    const i = f.g.i, ph = reduceMotion ? 0 : t;
    gTmp.set(f.g.c.x + Math.cos(ph * 0.7 + i * 2) * 0.38, 0.55 + Math.sin(ph * 1.9 + i) * 0.12, f.g.c.z + Math.sin(ph * 0.9 + i * 2) * 0.38);
    if (!f.holder.userData.on) { f.holder.position.copy(gTmp); f.holder.userData.on = true; }
    const prev = f.holder.position.clone(); f.holder.position.lerp(gTmp, 1 - Math.pow(0.25, dt));
    if (prev.distanceToSquared(f.holder.position) > 1e-8) f.holder.lookAt(f.holder.position.clone().add(f.holder.position.clone().sub(prev)));
    const flap = Math.sin(t * 14 + f.phase) * 0.9 + 0.3;
    for (const w of f.wings) w.pivot.rotation.z = flap * w.side;
  }
  gControls.update(dt);
  if (skipDraw) return false;
  // the garden is static: render the shadow map only when something changed
  renderer.shadowMap.autoUpdate = false;
  if (gShadowDirty) { renderer.shadowMap.needsUpdate = true; gShadowDirty = false; }
  draw(gScene, gCam);
  return true;
}
let lastDraw = 0, raf = 0, running = false, gardenWanted = false;
const tick = () => {
  if (!running) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  // a sheet covers the scene, or a calm bouquet on a slow phone: keep the simulation running, draw at ~30 fps
  // frame budget: full rate only while the user touches the scene or something big moves;
  // a slow idle turn, the garden breeze or decorations look the same at 30 fps and leave the phone free for the interface
  const idle = now() - lastInput > 1200;
  const cov = covered && !flight && !(view === 'garden' && gFocus);
  const calm = idle && !flight && (view === 'studio' ? studioCalm : !gFocus);
  const cap = Math.min(maxFps, cov ? 15 : uiBusy ? 20 : calm ? 30 : sQ.tier >= 1 && idle ? 40 : 60);
  skipDraw = cap < 60 && t - lastDraw < 1 / cap - 0.002;
  fullRate = cap >= 60;
  const t0 = now(); renderer.info.autoReset = false; renderer.info.reset();
  let drew = false;
  try {
    if (view === 'garden' && gBuilt) drew = stepGarden(dt, t);
    else drew = stepStudio(dt, t);
  } catch (e) { on.error && on.error(e); }
  if (drew) {
    lastDraw = t; gl.endFrameEXP();
    perf.frames++; perf.js += now() - t0; perf.calls = renderer.info.render.calls;
    if (!firstFrame) { firstFrame = true; on.ready && on.ready(); }
  }
  if (now() - perf.since > 5000) {
    const s = (now() - perf.since) / 1000;
    perf.last = { fps: Math.round(perf.frames / s), jsMs: perf.frames ? +(perf.js / perf.frames).toFixed(1) : 0, calls: perf.calls, tier: view === 'garden' ? 'g' + gQ.checked : sQ.tier };
    perf.frames = 0; perf.js = 0; perf.since = now();
    on.perf && on.perf(perf.last);
  }
  raf = requestAnimationFrame(tick);
}
let firstFrame = false;
const perf = { frames: 0, js: 0, calls: 0, since: Date.now(), last: null };

/* ---- snapshot of the current bouquet (square JPEG for the history list and the server) */
let snapPresenter = null;
const readTarget = (rt, w, h) => {
  const px = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
  // GL rows run bottom-up
  const out = new Uint8Array(px.length), row = w * 4;
  for (let y = 0; y < h; y++) out.set(px.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
  return out;
}
const outTarget = (w, h) => {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, depthBuffer: false });
  rt.texture.generateMipmaps = false; return rt;
}
// render the bouquet into a w x h image (RGBA bytes, top row first) from a given camera
const renderBouquet = (w, h, cam, bg = true) => {
  if (!snapPresenter) snapPresenter = new Presenter(renderer, w, h, { halfFloat });
  snapPresenter.setScreen(w, h); snapPresenter.setScale(1);
  const d = isDark();
  if (bg) snapPresenter.setBackground(d ? '#22151B' : '#F7E5EB', d ? '#101814' : '#E6EEE8'); else snapPresenter.setBackground(null);
  const out = outTarget(w, h);
  const prevAuto = renderer.shadowMap.autoUpdate; renderer.shadowMap.needsUpdate = true;
  snapPresenter.render(scene, cam, { exposure: renderer.toneMappingExposure, fxaa: true, target: out, alpha: !bg });
  renderer.shadowMap.autoUpdate = prevAuto;
  const px = readTarget(out, w, h); out.dispose();
  return px;
}
const snapshotPixels = (N = 360) => {
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
  const dd = fitDist(1, 30, 1) * 1.04, a = 0.45;
  cam.position.set(Math.sin(a) * dd * 0.9, 0.56 + dd * 0.36, Math.cos(a) * dd * 0.9); cam.lookAt(0, 0.6, 0);
  return { width: N, height: N, pixels: renderBouquet(N, N, cam) };
}
// a 9:16 portrait of the bouquet for stories (turntable angle a in radians)
const storyPixels = (w = 720, h = 1280, a = 0.35) => {
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.05, 30);
  const dd = fitDist(w / (h * 0.62), 30, 1) * 1.22;
  cam.position.set(Math.sin(a) * dd * 0.92, 0.58 + dd * 0.3, Math.cos(a) * dd * 0.92); cam.lookAt(0, 0.36, 0);
  return { width: w, height: h, pixels: renderBouquet(w, h, cam, false), premultiplied: true };
}

/* ======================================================================= setup */
{
  const wrapModel = T.wrap.clone(true); wrapModel.traverse(o => { if (o.isMesh) o.geometry = o.geometry.clone(); });
  prepWrap(wrapModel); wrapGroup.add(wrapModel);
  ribbonModel = T.ribbon.clone(true); ribbonModel.position.y = -TIE; ribbonHolder.add(ribbonModel);
  ribbonPearls = new THREE.Group();
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, p = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), mat('pearl', '', '#F7F2EC')); p.position.set(Math.cos(a) * 0.066, 0.0, Math.sin(a) * 0.066); ribbonPearls.add(p); }
  ribbonHolder.add(ribbonPearls);
  buildTeddy();
  wrapP = app.S.wrapped && app.S.items.length ? 1 : 0; applyWrap(wrapP);
  applyTheme(); resize();
  sync3D(); placeCamera();
}

/* ======================================================================= what the screens use */
const api = {
  get view() { return view; },
  get tier() { return sQ.tier; },
  get gardenBuilt() { return gBuilt; },
  start() { if (running) return; running = true; clock.getDelta(); raf = requestAnimationFrame(tick); },
  stop() { running = false; cancelAnimationFrame(raf); },
  warm: () => Promise.race([warmShaders(), new Promise(r => setTimeout(r, 3000))]),
  sync: () => sync3D(),
  drawCard: () => drawCard(),
  layoutChanged: () => { if (!userMoved) placeCamera(); },
  resize(w, h, inset = topInset) { viewW = w; viewH = h; topInset = inset; resize(); if (!userMoved) placeCamera(); },
  setTopInset(px) { topInset = px; studioFrame(); },
  // part of the view covered by the bottom panel (studio) / extra panel height (garden)
  setInsets(top, bottom, gardenBottom = 0) {
    topInset = top; botInset = bottom; gBotInset = gardenBottom; studioFrame(); welcomeFrame();
    for (const c of [camera, gCam]) c.updateProjectionMatrix();
    if (!userMoved) placeCamera();
  },
  setDark(d) { if (darkMode === !!d) return; darkMode = !!d; applyTheme(); },
  setCovered(c) { covered = !!c; if (!c) { sQ.skip = Math.max(sQ.skip, 30); } },
  setUiBusy(b) { uiBusy = !!b; if (!b) sQ.skip = Math.max(sQ.skip, 20); },
  get perf() { return perf.last; },
  setWelcome(open) { welcomeOpen = !!open; welcomeFrame(); },
  // touch input
  input() { lastInput = now(); },
  begin() { lastInput = now(); (view === 'garden' ? gControls : controls).begin(); },
  rotate(dx, dy) { lastInput = now(); (view === 'garden' ? gControls : controls).rotate(dx, dy); },
  pan(dx, dy) { lastInput = now(); if (view === 'garden') gControls.pan(dx, dy); },
  zoom(f) { lastInput = now(); (view === 'garden' ? gControls : controls).zoom(f); },
  end() { (view === 'garden' ? gControls : controls).end(); },
  tap(x, y) { lastInput = now(); return pickBed(x, y); },
  // views
  setView(v, mode) {
    view = v; sQ.skip = 90; sQ.frames.length = 0;
    if (v === 'garden' && mode && mode !== app.gMode) { app.gMode = mode; gFocus = null; }
    controls.enabled = v !== 'garden'; gControls.enabled = v === 'garden';
    if (selRing) selRing.visible = false; gFocus = null;
    applyDensity();
    if (v === 'garden') { gardenWanted = true; if (TL.rose) { buildGarden(); placeGardenCam(); } }
  },
  setGardenPack(pack) { Object.assign(TL, pack); if (view === 'garden') { buildGarden(); placeGardenCam(); } },
  rebuildGarden() { if (gBuilt || (view === 'garden' && TL.rose)) buildGarden(); },
  focusPatch: id => focusPatch(id),
  clearFocus() { gFocus = null; if (selRing) selRing.visible = false; },
  // sending: the bouquet flies up and away, then the table is cleared
  fly(done) { if (reduceMotion) done(); else flight = { t: 0, done }; },
  clearTable() {
    for (const [k, n] of nodes) { bouquet.remove(n.az); nodes.delete(k); }
    wrapP = 0; applyWrap(0); teddyS = 0; teddyV = 0; cardKey = '';
  },
  snapshotPixels, storyPixels,
  dispose() {
    api.stop();
    presenter.dispose(); if (snapPresenter) snapPresenter.dispose();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    gScene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const m of matCache.values()) { if (m.map) m.map.dispose(); m.dispose(); }
    texCache.forEach(t => t.dispose());
    cardTex.dispose(); glowTex.dispose(); pmrem.dispose(); if (envTex) envTex.dispose();
    renderer.dispose();
  },
};
return api;
};
