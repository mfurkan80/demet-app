// Web paketlerindeki (meshopt sıkıştırmalı glTF) modelleri React Native'in doğrudan okuyabileceği
// düz bir biçime çevirir: düğüm ağacı + malzeme bilgisi bir JSON'da, tüm köşe verileri tek bir .bin dosyasında.
// Telefonda WebAssembly ya da glTF çözücü gerekmez; dizi verisi doğrudan BufferAttribute olur.
// Kullanım: node scripts/convert-models.mjs  (../public/models.json ve ../public/garden.json okunur)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(here, '..', '..', 'public');
const out = path.join(here, '..', 'assets', 'models');
fs.mkdirSync(out, { recursive: true });

const warn = console.warn; console.warn = (...a) => { if (!String(a[0]).includes('de-interleave')) warn(...a); };
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const TYPES = { Float32Array: 'f32', Int16Array: 'i16', Uint16Array: 'u16', Int8Array: 'i8', Uint8Array: 'u8', Uint32Array: 'u32' };

const convert = async (pack, name) => {
  const src = JSON.parse(fs.readFileSync(path.join(pub, pack), 'utf8'));
  const chunks = []; let off = 0;
  const put = arr => {
    const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); off += pad; }
    const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); chunks.push(b);
    const at = off; off += b.length; return at;
  };
  const attr = a => {
    if (a.isInterleavedBufferAttribute) a = a.clone(); // de-interleave
    const arr = a.array;
    return { t: TYPES[arr.constructor.name], o: put(arr), n: arr.length, s: a.itemSize, nm: a.normalized || undefined };
  };
  const matInfo = m => ({
    type: m.type, name: m.name, color: m.color && '#' + m.color.getHexString(), rough: m.roughness, metal: m.metalness,
    vc: m.vertexColors || undefined, side: m.side || undefined, transparent: m.transparent || undefined,
    opacity: m.opacity !== 1 ? m.opacity : undefined, emissive: m.emissive && m.emissive.getHex() ? '#' + m.emissive.getHexString() : undefined,
  });
  const node = o => {
    const n = { name: o.name || undefined, p: o.position.toArray(), q: o.quaternion.toArray(), s: o.scale.toArray() };
    if (!n.p.some(Boolean)) delete n.p;
    if (n.q[0] === 0 && n.q[1] === 0 && n.q[2] === 0 && n.q[3] === 1) delete n.q;
    if (n.s.every(v => v === 1)) delete n.s;
    if (Object.keys(o.userData || {}).length) n.u = o.userData;
    if (o.isMesh) {
      const g = o.geometry, a = {};
      for (const [k, v] of Object.entries(g.attributes)) a[k] = attr(v);
      n.mesh = { a, i: g.index ? attr(g.index) : undefined, m: Array.isArray(o.material) ? o.material.map(matInfo) : matInfo(o.material) };
      if (g.groups && g.groups.length) n.mesh.g = g.groups;
      if (o.isSkinnedMesh) throw new Error('skinned mesh not supported: ' + name);
    }
    if (o.children.length) n.c = o.children.map(node);
    return n;
  };
  const models = {};
  for (const [k, b64] of Object.entries(src)) {
    const bin = Buffer.from(b64, 'base64');
    const gltf = await loader.parseAsync(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), '');
    models[k] = node(gltf.scene);
  }
  const bin = Buffer.concat(chunks);
  fs.writeFileSync(path.join(out, name + '.bin'), bin);
  fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(models));
  console.log(name, Object.keys(models).length, 'models,', (bin.length / 1e6).toFixed(2), 'MB');
};
await convert('models.json', 'studio');
await convert('garden.json', 'garden');
