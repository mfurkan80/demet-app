// three.js renderer on an expo-gl context. The caller presents each frame with gl.endFrameEXP().
import * as THREE from 'three';

export const makeRenderer = gl => {
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const canvas = {
    width: w, height: h, clientWidth: w, clientHeight: h, style: {},
    addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl,
  };
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.autoClear = true;
  return renderer;
};

// Can this context render into half-float targets (HDR before tone mapping)?
export const canHalfFloat = gl => {
  try { return !!(gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float')); }
  catch (e) { return false; }
};
