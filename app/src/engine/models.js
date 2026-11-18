// Dönüştürülmüş model paketlerini (assets/models/*.json + *.bin) three.js nesnelerine çevirir.
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

const ARR = { f32: Float32Array, i16: Int16Array, u16: Uint16Array, i8: Int8Array, u8: Uint8Array, u32: Uint32Array };

const readBytes = async mod => {
  const asset = Asset.fromModule(mod);
  if (Platform.OS === 'web') return (await fetch(asset.uri)).arrayBuffer();
  await asset.downloadAsync();
  const { File } = require('expo-file-system');
  return new File(asset.localUri).arrayBuffer();
};

const makeMaterial = m => {
  const Ctor = m.type === 'MeshBasicMaterial' ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
  const mat = new Ctor({ color: m.color || '#ffffff', vertexColors: !!m.vc, side: m.side || THREE.FrontSide, transparent: !!m.transparent, opacity: m.opacity ?? 1 });
  if (mat.isMeshStandardMaterial) { mat.roughness = m.rough ?? 1; mat.metalness = m.metal ?? 0; if (m.emissive) mat.emissive.set(m.emissive); }
  mat.name = m.name || '';
  return mat;
};

const build = (n, buf, mats) => {
  let o;
  if (n.mesh) {
    const g = new THREE.BufferGeometry();
    const attr = a => new THREE.BufferAttribute(new ARR[a.t](buf, a.o, a.n), a.s, !!a.nm);
    for (const [k, a] of Object.entries(n.mesh.a)) g.setAttribute(k, attr(a));
    if (n.mesh.i) g.setIndex(attr(n.mesh.i));
    if (n.mesh.g) for (const gr of n.mesh.g) g.addGroup(gr.start, gr.count, gr.materialIndex);
    const mm = Array.isArray(n.mesh.m) ? n.mesh.m.map(x => mats(x)) : mats(n.mesh.m);
    o = new THREE.Mesh(g, mm);
  } else o = new THREE.Group();
  if (n.name) o.name = n.name;
  if (n.p) o.position.fromArray(n.p);
  if (n.q) o.quaternion.fromArray(n.q);
  if (n.s) o.scale.fromArray(n.s);
  if (n.u) o.userData = { ...n.u };
  for (const c of n.c || []) o.add(build(c, buf, mats));
  return o;
};

// Bir paketi yükler: { modelAdı: THREE.Object3D } döner. Aynı malzeme bilgisi tek malzeme nesnesini paylaşır.
export const loadPack = async (json, binModule) => {
  const buf = await readBytes(binModule);
  const cache = new Map();
  const mats = m => { const k = JSON.stringify(m); if (!cache.has(k)) cache.set(k, makeMaterial(m)); return cache.get(k); };
  const out = {};
  for (const [k, n] of Object.entries(json)) out[k] = build(n, buf, mats);
  return out;
};
