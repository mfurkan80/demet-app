// Orbit camera controller fed by touch gestures (the subset of three's OrbitControls the app uses).
// Gestures call begin() / rotate(dx, dy) / pan(dx, dy) / zoom(factor) / end(); the render loop calls update().
import * as THREE from 'three';

export class Orbit {
  constructor(camera, viewHeight = 800) {
    this.camera = camera; this.viewHeight = viewHeight;
    this.target = new THREE.Vector3();
    Object.assign(this, {
      enabled: true, enableDamping: true, dampingFactor: 0.08, enablePan: false, panSpeed: 1, screenSpacePanning: false,
      minDistance: 0, maxDistance: Infinity, minPolarAngle: 0, maxPolarAngle: Math.PI, rotateSpeed: 1, zoomSpeed: 1,
      autoRotate: false, autoRotateSpeed: 2,
    });
    this.sph = new THREE.Spherical(); this.dSph = new THREE.Spherical(0, 0, 0); this.scale = 1;
    this.panOff = new THREE.Vector3(); this.listeners = { start: [], end: [] };
    this._off = new THREE.Vector3(); this._v = new THREE.Vector3();
  }
  addEventListener(type, fn) { (this.listeners[type] || (this.listeners[type] = [])).push(fn); }
  emit(type) { for (const fn of this.listeners[type] || []) fn(); }
  begin() { if (this.enabled) this.emit('start'); }
  end() { if (this.enabled) this.emit('end'); }
  rotate(dx, dy) {
    if (!this.enabled) return;
    const h = this.viewHeight || 800;
    this.dSph.theta -= (2 * Math.PI * dx / h) * this.rotateSpeed;
    this.dSph.phi -= (2 * Math.PI * dy / h) * this.rotateSpeed;
  }
  zoom(factor) { if (this.enabled && factor > 0) this.scale /= Math.pow(factor, this.zoomSpeed); }
  pan(dx, dy) {
    if (!this.enabled || !this.enablePan) return;
    const off = this._off.copy(this.camera.position).sub(this.target);
    const dist = off.length() * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const h = this.viewHeight || 800, te = this.camera.matrix.elements;
    // left/right along the camera's x axis
    const left = this._v.setFromMatrixColumn(this.camera.matrix, 0).multiplyScalar(-2 * dx * dist / h * this.panSpeed);
    this.panOff.add(left);
    // forward/back on the ground plane (or up/down in screen space)
    const up = new THREE.Vector3();
    if (this.screenSpacePanning) up.setFromMatrixColumn(this.camera.matrix, 1);
    else { up.setFromMatrixColumn(this.camera.matrix, 0); up.crossVectors(this.camera.up, up); }
    up.multiplyScalar(2 * dy * dist / h * this.panSpeed);
    this.panOff.add(up);
    void te;
  }
  update(dt) {
    const off = this._off.copy(this.camera.position).sub(this.target);
    this.sph.setFromVector3(off);
    if (this.autoRotate && this.enabled) this.dSph.theta -= (2 * Math.PI / 60 / 60) * this.autoRotateSpeed * (dt ? dt * 60 : 1);
    const k = this.enableDamping ? this.dampingFactor : 1;
    this.sph.theta += this.dSph.theta * k; this.sph.phi += this.dSph.phi * k;
    this.sph.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.sph.phi));
    this.sph.makeSafe();
    this.sph.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.sph.radius * this.scale));
    this.target.addScaledVector(this.panOff, k);
    off.setFromSpherical(this.sph);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
    if (this.enableDamping) { this.dSph.theta *= 1 - k; this.dSph.phi *= 1 - k; this.panOff.multiplyScalar(1 - k); }
    else { this.dSph.set(0, 0, 0); this.panOff.set(0, 0, 0); }
    this.scale = 1;
  }
}
