// 3D sahne: GL görünümü, dokunma hareketleri (çevirme, yakınlaştırma, kaydırma, dokunma) ve motorun yaşam döngüsü.
import { memo, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GLView } from 'expo-gl';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { makeRenderer, canHalfFloat } from '../engine/gl';
import { loadPack } from '../engine/models';
import { createEngine } from '../engine/engine';
import { app, emit } from '../state/store';
import { E, setEngine, ui } from '../ctl';

const QKEY = 'demet-q';

export const Stage = memo(({ width, height, dark, onReady, onError, onTap, insets }) => {
  const eng = useRef(null), last = useRef({ x: 0, y: 0, fx: 0, fy: 0 });
  const [failed, setFailed] = useState(false);

  useEffect(() => () => { if (eng.current) { eng.current.stop(); eng.current.dispose && eng.current.dispose(); } E.cur = null; }, []);
  useEffect(() => { if (eng.current) eng.current.setDark(dark); }, [dark]);
  useEffect(() => { if (eng.current && insets) eng.current.setInsets(insets.top, insets.bottom, insets.garden); }, [insets && insets.top, insets && insets.bottom, insets && insets.garden]);
  // stop drawing while the app is in the background (battery), start again when it comes back
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { const e = eng.current; if (!e) return; if (s === 'active') e.start(); else e.stop(); });
    return () => sub.remove();
  }, []);

  const onContextCreate = async gl => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const tier = Math.max(0, Math.min(3, +((await AsyncStorage.getItem(QKEY).catch(() => null)) || 0)));
      const half = canHalfFloat(gl);
      const renderer = makeRenderer(gl);
      const T = await loadPack(require('../../assets/models/studio.json'), require('../../assets/models/studio.bin'));
      const e = createEngine({
        gl, renderer, T, width, height, dark, halfFloat: half, tier, reduceMotion: !!app.reduceMotion,
        on: {
          hint: show => { if (ui.hint !== !!show) { ui.hint = !!show; emit(); } },
          error: err => console.warn('DEMET frame', err && err.message),
          ready: () => onReady && onReady(),
          tier: t => { AsyncStorage.setItem(QKEY, String(t)).catch(() => {}); },
        },
      });
      eng.current = e;
      e.resize(width, height, insets ? insets.top : 0);
      if (insets) e.setInsets(insets.top, insets.bottom, insets.garden);
      e.sync(); e.start();
      setEngine(e);
      e.warm().catch(() => {});
    } catch (err) {
      console.warn('DEMET gl', err && (err.stack || err.message));
      setFailed(true); onError && onError(err);
    }
  };

  const pan = Gesture.Pan().maxPointers(1).minDistance(8).runOnJS(true)
    .onBegin(e => { last.current.x = e.absoluteX; last.current.y = e.absoluteY; eng.current && eng.current.begin(); })
    .onUpdate(e => {
      const L = last.current, dx = e.absoluteX - L.x, dy = e.absoluteY - L.y; L.x = e.absoluteX; L.y = e.absoluteY;
      eng.current && eng.current.rotate(dx, dy);
    })
    .onFinalize(() => { eng.current && eng.current.end(); });
  const pinch = Gesture.Pinch().runOnJS(true)
    .onBegin(e => { last.current.fx = e.focalX; last.current.fy = e.focalY; eng.current && eng.current.begin(); })
    .onUpdate(e => {
      const L = last.current, e2 = eng.current; if (!e2) return;
      if (e.scaleChange && isFinite(e.scaleChange)) e2.zoom(e.scaleChange);
      const dx = e.focalX - L.fx, dy = e.focalY - L.fy; L.fx = e.focalX; L.fy = e.focalY;
      if (e.numberOfPointers >= 2 && Math.abs(dx) + Math.abs(dy) < 80) e2.pan(dx, dy);
    })
    .onFinalize(() => { eng.current && eng.current.end(); });
  const tap = Gesture.Tap().maxDuration(260).maxDistance(10).runOnJS(true)
    .onEnd((e, ok) => { if (!ok || !eng.current) return; eng.current.input(); const id = eng.current.tap(e.x, e.y); onTap && onTap(id); });
  const g = Gesture.Exclusive(Gesture.Simultaneous(pinch, pan), tap);

  if (failed) return <View style={[st.stage, { width, height }]} />;
  return (
    <GestureDetector gesture={g}>
      <View style={[st.stage, { width, height }]} collapsable={false}>
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} msaaSamples={0} />
      </View>
    </GestureDetector>
  );
});

const st = StyleSheet.create({ stage: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' } });
