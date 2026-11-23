// Draws the scene into an offscreen target at the wanted resolution, then puts it on the screen in one pass:
// tone mapping (ACES), sRGB, the studio background gradient behind empty pixels, and FXAA edge smoothing.
// This lets the phone render below its native resolution (old phones) and still get smooth edges,
// because expo-gl has no multisampling on Android.
import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform sampler2D tScene; uniform vec2 px; uniform float exposure, fxaa, tone;
uniform vec3 bgA, bgB; uniform float bgMode, keepAlpha; uniform vec2 aspect;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c){
  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c *= exposure / 0.6; c = IN * c; c = RRTAndODTFit(c); c = OUT * c; return clamp(c, 0.0, 1.0);
}
vec3 srgb(vec3 c){ return mix(pow(c, vec3(0.41666)) * 1.055 - vec3(0.055), c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
vec3 bg(vec2 uv){
  if (bgMode < 0.5) return bgB;
  // radial-gradient(110% 85% at 50% 16%, A 0%, B 72%) with y measured from the top
  vec2 d = vec2((uv.x - 0.5) / 1.1, ((1.0 - uv.y) - 0.16) / 0.85);
  float t = clamp(length(d) / 0.72, 0.0, 1.0);
  return mix(bgA, bgB, t);
}
vec3 shade(vec2 uv){
  vec4 s = texture2D(tScene, uv);
  vec3 c = tone > 0.5 ? srgb(aces(s.rgb)) : srgb(clamp(s.rgb, 0.0, 1.0));
  return c + bg(uv) * (1.0 - clamp(s.a, 0.0, 1.0));
}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
void main(){
  vec3 rgbM = shade(vUv);
  // transparent output (story image): premultiplied color with the scene's own coverage
  float outA = keepAlpha > 0.5 ? clamp(texture2D(tScene, vUv).a, 0.0, 1.0) : 1.0;
  if (fxaa < 0.5) { gl_FragColor = vec4(rgbM, outA); return; }
  vec3 rgbNW = shade(vUv + vec2(-1.0, -1.0) * px), rgbNE = shade(vUv + vec2(1.0, -1.0) * px);
  vec3 rgbSW = shade(vUv + vec2(-1.0, 1.0) * px), rgbSE = shade(vUv + vec2(1.0, 1.0) * px);
  float lNW = luma(rgbNW), lNE = luma(rgbNE), lSW = luma(rgbSW), lSE = luma(rgbSE), lM = luma(rgbM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float reduce = max((lNW + lNE + lSW + lSE) * 0.25 * (1.0 / 8.0), 1.0 / 128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * px;
  vec3 a = 0.5 * (shade(vUv + dir * (1.0 / 3.0 - 0.5)) + shade(vUv + dir * (2.0 / 3.0 - 0.5)));
  vec3 b = a * 0.5 + 0.25 * (shade(vUv + dir * -0.5) + shade(vUv + dir * 0.5));
  float lB = luma(b);
  gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, outA);
}`;

export class Presenter {
  // screenW/H: drawing buffer size in pixels; scale: render resolution relative to it (0.3 .. 1)
  constructor(renderer, screenW, screenH, { halfFloat = true } = {}) {
    this.renderer = renderer;
    this.type = halfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: this.type, depthBuffer: true, stencilBuffer: false });
    this.rt.texture.minFilter = THREE.LinearFilter; this.rt.texture.magFilter = THREE.LinearFilter; this.rt.texture.generateMipmaps = false;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        tScene: { value: this.rt.texture }, px: { value: new THREE.Vector2() }, exposure: { value: 1 }, fxaa: { value: 1 }, tone: { value: 1 },
        bgA: { value: new THREE.Color() }, bgB: { value: new THREE.Color() }, bgMode: { value: 1 }, keepAlpha: { value: 0 }, aspect: { value: new THREE.Vector2(1, 1) },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.qScene = new THREE.Scene(); this.qScene.add(this.quad);
    this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scale = 1; this.setScreen(screenW, screenH);
  }
  setScreen(w, h) { this.sw = Math.max(1, w); this.sh = Math.max(1, h); this.resize(); }
  setScale(s) { this.scale = Math.max(0.25, Math.min(1, s)); this.resize(); }
  resize() {
    const w = Math.max(1, Math.round(this.sw * this.scale)), h = Math.max(1, Math.round(this.sh * this.scale));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    this.mat.uniforms.px.value.set(1 / w, 1 / h);
  }
  get width() { return this.rt.width; }
  get height() { return this.rt.height; }
  // background: studio gradient colors (CSS hex strings) or null for none (garden has its own sky)
  setBackground(a, b) {
    const u = this.mat.uniforms;
    if (a) { u.bgA.value.set(a); u.bgB.value.set(b); u.bgMode.value = 1; }
    else { u.bgB.value.set('#000000'); u.bgMode.value = 0; }
    // the shader mixes these in sRGB space, like the browser does with CSS colors
    u.bgA.value.convertLinearToSRGB(); u.bgB.value.convertLinearToSRGB();
  }
  render(scene, camera, { exposure = 1, fxaa = true, target = null, alpha = false } = {}) {
    const r = this.renderer, prevTone = r.toneMapping;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 0); r.clear();
    r.render(scene, camera);
    r.setRenderTarget(target);
    const u = this.mat.uniforms; u.exposure.value = exposure; u.fxaa.value = fxaa ? 1 : 0; u.tone.value = prevTone === THREE.NoToneMapping ? 0 : 1; u.keepAlpha.value = alpha ? 1 : 0;
    r.render(this.qScene, this.qCam);
    if (target) r.setRenderTarget(null);
  }
  dispose() { this.rt.dispose(); this.mat.dispose(); this.quad.geometry.dispose(); }
}
