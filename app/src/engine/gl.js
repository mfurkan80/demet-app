// expo-gl bağlamı üzerinde three.js çizicisi kurar.
import * as THREE from 'three';

export const makeRenderer = (gl, { pixelRatio = 1 } = {}) => {
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const canvas = {
    width: w, height: h, clientWidth: w, clientHeight: h, style: {},
    addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl,
  };
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // expo-gl'de kare, endFrameEXP ile ekrana basılır
  const render = renderer.render.bind(renderer);
  renderer.render = (s, c) => { render(s, c); gl.endFrameEXP(); };
  return renderer;
};
