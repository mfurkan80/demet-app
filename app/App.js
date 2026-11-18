import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GLView } from 'expo-gl';
import { StatusBar } from 'expo-status-bar';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeRenderer } from './src/engine/gl';
import { loadPack } from './src/engine/models';

const studioJson = require('./assets/models/studio.json');

const App = () => {
  const [info, setInfo] = useState('başlıyor');
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onContextCreate = async gl => {
    const log = [];
    const say = s => { log.push(s); console.log('DEMET ' + s); setInfo(log.join('\n')); };
    try {
      say(`gl ${gl.drawingBufferWidth}x${gl.drawingBufferHeight} webgl2=${typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext}`);
      const renderer = makeRenderer(gl);
      say(`three isWebGL2=${renderer.capabilities.isWebGL2} maxTex=${renderer.capabilities.maxTextureSize}`);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.05, 50);
      camera.position.set(0, 1.0, 3.2); camera.lookAt(0, 0.75, 0);
      try {
        const t0 = Date.now();
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
        say(`pmrem ok ${Date.now() - t0}ms`);
      } catch (e) { say('pmrem FAIL ' + e.message); }
      scene.add(new THREE.HemisphereLight('#fff6f1', '#d6e4da', 0.5));
      const key = new THREE.DirectionalLight('#fff1e4', 2.0); key.position.set(0.9, 4.2, 2.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
      const t1 = Date.now();
      const T = await loadPack(studioJson, require('./assets/models/studio.bin'));
      say(`models ${Object.keys(T).length} in ${Date.now() - t1}ms`);
      const white = new THREE.Color('#fff');
      const paint = (m, hex) => m.traverse(o => {
        if (!o.isMesh) return; o.castShadow = true;
        const part = o.material.name;
        if (part === 'petal' || part === 'bud') { const c = new THREE.Color(hex); o.material = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.6, sheen: 0.6, sheenRoughness: 0.45, sheenColor: c.clone().lerp(white, 0.5), side: THREE.DoubleSide, vertexColors: true }); }
        else if (part === 'center') o.material = new THREE.MeshStandardMaterial({ color: '#E8B923', roughness: 0.8, vertexColors: true });
        else o.material = new THREE.MeshStandardMaterial({ color: part === 'leaf' ? '#4F7F42' : '#5C8A4A', roughness: 0.7, side: THREE.DoubleSide, vertexColors: true });
      });
      const group = new THREE.Group(); scene.add(group);
      [['rose', '#B3122E', -0.12], ['tulip', '#F07CA0', 0.12], ['daisy', '#FBFAF7', 0], ['sunflower', '#F2C230', 0.22]].forEach(([k, c, x], i) => {
        const m = T[k].clone(true); paint(m, c); m.position.x = x; m.rotation.z = x * 0.6; m.position.z = (i % 2) * 0.05; group.add(m);
      });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.2 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
      let frames = 0, last = Date.now(), acc = 0;
      const loop = () => {
        const now = Date.now(); acc += now - last; last = now; frames++;
        group.rotation.y += 0.01;
        renderer.render(scene, camera);
        if (frames === 120) say(`avg frame ${(acc / 120).toFixed(1)}ms, calls ${renderer.info.render.calls}, programs ${renderer.info.programs.length}`);
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { say('HATA ' + (e && e.stack || e)); }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      <Text style={styles.info}>{info}</Text>
    </View>
  );
};
export default App;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4EEF0' },
  info: { position: 'absolute', left: 12, right: 12, bottom: 40, fontSize: 12, color: '#1C2922', backgroundColor: 'rgba(255,255,255,.75)', padding: 8 },
});
