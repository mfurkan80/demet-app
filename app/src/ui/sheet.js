// Alttan açılan pencere (sheet) ve kısa bilgi balonu (toast). Her yerden openSheet(Bileşen, props) ile açılır.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, F, R } from './theme';
import { IClose } from './icons';

/* ---------- tiny observable */
const make = init => {
  let v = init; const subs = new Set();
  return {
    get: () => v,
    set: n => { v = n; subs.forEach(f => f()); },
    use: () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => v),
  };
};

/* ---------- sheets */
const sheet = make(null); // { id, C, props }
let seq = 0, onCoverChange = null, closing = null;
export const setCoverListener = fn => { onCoverChange = fn; };
export const openSheet = (C, props = {}) => {
  Keyboard.dismiss();
  const next = { id: ++seq, C, props };
  if (sheet.get()) { closing = next; sheet.set({ ...sheet.get(), leaving: true }); }
  else { sheet.set(next); onCoverChange && onCoverChange(true); }
};
export const closeSheet = () => {
  Keyboard.dismiss();
  const cur = sheet.get(); if (!cur || cur.leaving) return;
  closing = null; sheet.set({ ...cur, leaving: true });
};
export const sheetOpen = () => !!sheet.get() && !sheet.get().leaving;
const finished = () => {
  const n = closing; closing = null;
  sheet.set(n);
  if (!n) onCoverChange && onCoverChange(false);
};

const useKeyboard = () => {
  const [h, setH] = useState(0);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, e => setH(e.endCoordinates.height)), b = Keyboard.addListener(hide, () => setH(0));
    return () => { a.remove(); b.remove(); };
  }, []);
  return h;
};
export { useKeyboard };

const SheetFrame = ({ s }) => {
  const t = useTheme(), ins = useSafeAreaInsets(), { height: H } = useWindowDimensions();
  const kb = useKeyboard();
  const y = useSharedValue(H), fade = useSharedValue(0), hgt = useRef(H * 0.6);
  useEffect(() => {
    if (s.leaving) {
      fade.value = withTiming(0, { duration: 220 });
      y.value = withTiming(hgt.current + 40, { duration: 240, easing: Easing.in(Easing.cubic) }, done => { if (done) runOnJS(finished)(); });
    } else {
      y.value = H; fade.value = withTiming(1, { duration: 260 });
      y.value = withSpring(0, { damping: 26, stiffness: 260, mass: 0.9 });
    }
  }, [s.id, s.leaving]);
  const pan = Gesture.Pan().activeOffsetY(8).failOffsetX([-30, 30])
    .onChange(e => { y.value = Math.max(-20, y.value + e.changeY * (y.value < 0 ? 0.3 : 1)); })
    .onEnd(e => {
      if (y.value > 120 || e.velocityY > 900) runOnJS(closeSheet)();
      else y.value = withSpring(0, { damping: 24, stiffness: 280 });
    });
  const sheetSt = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimSt = useAnimatedStyle(() => ({ opacity: fade.value }));
  const { C, props } = s;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }, scrimSt]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} accessibilityLabel="Kapat" />
      </Animated.View>
      <Animated.View onLayout={e => { hgt.current = e.nativeEvent.layout.height; }}
        style={[st.sheet, { backgroundColor: t.surface, maxHeight: H - ins.top - 24 - kb, bottom: kb }, sheetSt]}
        accessibilityViewIsModal>
        <GestureDetector gesture={pan}>
          <View style={st.head}>
            <View style={[st.grab, { backgroundColor: t.line }]} />
          </View>
        </GestureDetector>
        <Pressable onPress={closeSheet} hitSlop={10} accessibilityLabel="Kapat" accessibilityRole="button"
          style={({ pressed }) => [st.x, { backgroundColor: t.surface2, opacity: pressed ? 0.6 : 1 }]}>
          <IClose size={18} color={t.ink2} />
        </Pressable>
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false} overScrollMode="never"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: (kb ? 16 : ins.bottom) + 22, gap: 16 }}>
          <C {...props} close={closeSheet} />
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export const SheetHost = () => {
  const s = sheet.use();
  useEffect(() => {
    if (!s) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { closeSheet(); return true; });
    return () => sub.remove();
  }, [!!s]);
  return s ? <SheetFrame key={s.id} s={s} /> : null;
};

/* ---------- toast */
const toastS = make(null);
let toastTimer;
export const toast = msg => {
  clearTimeout(toastTimer);
  toastS.set({ msg, id: ++seq });
  toastTimer = setTimeout(() => toastS.set(toastS.get() && { ...toastS.get(), out: true }), 2700);
};
export const ToastHost = ({ top }) => {
  const t = useTheme(), s = toastS.use();
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(s && !s.out ? 1 : 0, { duration: s && !s.out ? 220 : 300 }); }, [s && s.id, s && s.out]);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * -14 }, { scale: 0.96 + v.value * 0.04 }] }));
  if (!s) return null;
  return (
    <Animated.View pointerEvents="none" style={[st.toast, { top, backgroundColor: t.ink }, a]} accessibilityLiveRegion="polite">
      <Text style={{ color: t.surface, fontFamily: F.semi, fontSize: 14, lineHeight: 19, textAlign: 'center' }}>{s.msg}</Text>
    </Animated.View>
  );
};

const st = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: R.lg + 4, borderTopRightRadius: R.lg + 4, elevation: 24, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: -6 } },
  head: { height: 30, alignItems: 'center', justifyContent: 'center' },
  grab: { width: 42, height: 5, borderRadius: 3 },
  x: { position: 'absolute', top: 12, right: 14, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '88%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, zIndex: 50, elevation: 30 },
});
