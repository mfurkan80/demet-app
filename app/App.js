// Geçici doğrulama: asıl 3D motorunu telefonda çalıştırır (atölye, ardından bahçe) ve tanı bilgilerini yazar.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GLView } from 'expo-gl';
import { StatusBar } from 'expo-status-bar';
import { makeRenderer, canHalfFloat } from './src/engine/gl';
import { loadPack } from './src/engine/models';
import { createEngine } from './src/engine/engine';
import { loadFonts } from './src/fonts';
import { app } from './src/state/store';

const App = () => {
  const [info, setInfo] = useState('başlıyor');
  const eng = useRef(null);
  const { width, height } = useWindowDimensions();
  useEffect(() => () => eng.current && eng.current.dispose(), []);
  const onContextCreate = async gl => {
    const log = [];
    const say = s => { log.push(s); console.log('DEMET ' + s); setInfo(log.slice(-12).join('\n')); };
    try {
      const t0 = Date.now();
      await loadFonts(); say(`fonts ${Date.now() - t0}ms`);
      const half = canHalfFloat(gl);
      say(`gl ${gl.drawingBufferWidth}x${gl.drawingBufferHeight} half=${half}`);
      const renderer = makeRenderer(gl);
      const T = await loadPack(require('./assets/models/studio.json'), require('./assets/models/studio.bin'));
      say(`models ${Object.keys(T).length} ${Date.now() - t0}ms`);
      app.S.items = [];
      const add = (type, color, n) => { for (let i = 0; i < n; i++) app.S.items.push({ id: app.S.nextId++, type, color }); };
      add('rose', '#B3122E', 5); add('tulip', '#F07CA0', 3); add('sunflower', '#F6B91C', 2); add('gypsophila', '#FBFAF7', 3); add('eucalyptus', '#7FA593', 2);
      app.S.note = 'Seni çok seviyorum, iyi ki varsın'; app.S.sign = 'Furkan'; app.S.wrapped = true; app.S.d.hearts = true; app.S.d.butterflies = 2;
      const e = createEngine({ gl, renderer, T, width, height, halfFloat: half, on: {
        error: err => say('HATA kare: ' + (err && err.stack || err).toString().slice(0, 400)),
        ready: () => say(`ilk kare ${Date.now() - t0}ms`),
        tier: t => say('kalite basamağı ' + t),
      } });
      eng.current = e;
      e.resize(width, height, 90);
      await e.warm(); say(`shaderlar ${Date.now() - t0}ms programs=${renderer.info.programs.length}`);
      e.sync(); e.start();
      let frames = 0, last = Date.now();
      const iv = setInterval(() => { const n = renderer.info.render.frame; say(`fps~${((n - frames) / ((Date.now() - last) / 1000)).toFixed(1)} calls=${renderer.info.render.calls}`); frames = n; last = Date.now(); }, 5000);
      setTimeout(async () => {
        try {
          const TL = await loadPack(require('./assets/models/garden.json'), require('./assets/models/garden.bin'));
          say(`bahçe modelleri ${Object.keys(TL).length}`);
          e.setGardenPack(TL); e.setView('garden', 'mine'); say('bahçe açıldı');
        } catch (err) { say('HATA bahçe: ' + (err && err.stack || err).toString().slice(0, 400)); }
      }, 38000);
      setTimeout(() => clearInterval(iv), 90000);
    } catch (err) { say('HATA ' + (err && err.stack || err).toString().slice(0, 600)); }
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
  info: { position: 'absolute', left: 12, right: 12, bottom: 30, fontSize: 11, color: '#1C2922', backgroundColor: 'rgba(255,255,255,.8)', padding: 8 },
});
