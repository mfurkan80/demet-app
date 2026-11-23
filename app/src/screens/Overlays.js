// Sahnenin üstündeki katmanlar: açılış yükleme ekranı, boş masa, ipucu, gelen buket zarfı, kutlama kalpleri,
// gelen kutusu şeridi, bağlantı uyarısı ve ilk açılıştaki karşılama kartı.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, F, R, alpha } from '../ui/theme';
import { Txt, Cta, Btn2, LinkBtn, Tap } from '../ui/kit';
import { IBack, IHeart, ILeaf, IClose } from '../ui/icons';
import { THUMB } from '../ui/thumbs';
import { app, online } from '../state/store';
import { fromName } from '../state/text';
import { ui, openGift, inbox, hideWelcome, retryServer } from '../ctl';
import { AuthForm, AUTH_COPY } from './sheets';
import { openUrl } from '../services/native';
import { BASE } from '../services/api';
import { useKeyboard } from '../ui/sheet';

const useFade = (on, ms = 400) => {
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  const [shown, setShown] = useState(on);
  useEffect(() => {
    if (on) setShown(true);
    Animated.timing(v, { toValue: on ? 1 : 0, duration: ms, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start(({ finished }) => { if (finished && !on) setShown(false); });
  }, [on]);
  return [v, shown];
};

/* ---------- loading (while the 3D scene starts) */
export const Loading = ({ on, text = 'Çiçekler hazırlanıyor…', sub = 'Modeller yükleniyor…', garden }) => {
  const t = useTheme();
  const [v, shown] = useFade(on, 500);
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true })); a.start(); return () => a.stop(); }, []);
  if (!shown) return null;
  const colors = garden ? t.gardenSky : [t.blush, t.mist];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: v, zIndex: 20 }]} pointerEvents={on ? 'auto' : 'none'}>
      <LinearGradient colors={colors} style={[StyleSheet.absoluteFill, st.center]}>
        <Animated.View style={{ transform: [{ scale: spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] }) }], marginBottom: 14 }}>
          <Image source={THUMB.rose} style={{ width: 72, height: 72 }} />
        </Animated.View>
        <Txt v="h3">{text}</Txt>
        <Txt v="small" style={{ marginTop: 4 }}>{sub}</Txt>
        <View style={[st.bar, { backgroundColor: t.line }]}>
          <Animated.View style={[st.barI, { backgroundColor: t.accent, transform: [{ translateX: spin.interpolate({ inputRange: [0, 1], outputRange: [-120, 170] }) }] }]} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

/* ---------- empty table */
export const Empty = ({ top, height }) => {
  const t = useTheme();
  const on = ui.view === 'studio' && !app.viewing && !app.S.items.length && !ui.welcome;
  const [v, shown] = useFade(on);
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(b, { toValue: 1, duration: 1600, useNativeDriver: true }), Animated.timing(b, { toValue: 0, duration: 1600, useNativeDriver: true })])); a.start(); return () => a.stop(); }, []);
  if (!shown) return null;
  return (
    <Animated.View pointerEvents="none" style={[st.empty, { top: top + (height - top) * 0.42 - 90, opacity: v }]}>
      <Animated.View style={[st.ring, { borderColor: alpha(t.accent, 0.45), transform: [{ scale: b.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
        <Image source={THUMB.rose} style={{ width: 64, height: 64, opacity: 0.85 }} />
      </Animated.View>
      <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 27, color: t.ink, textAlign: 'center', letterSpacing: -0.4 }}>Buketine ilk çiçeği ekle</Text>
      <Txt v="small" style={{ textAlign: 'center', fontSize: 14 }}>Listeden bir çiçeğe dokun, masaya gelsin.</Txt>
    </Animated.View>
  );
};

/* ---------- gesture hint */
export const Hint = ({ bottom }) => {
  const t = useTheme();
  const on = ui.hint && !app.viewing && !ui.welcome && (ui.view === 'garden' || app.S.items.length > 0);
  const [v, shown] = useFade(on, 600);
  if (!shown) return null;
  return (
    <Animated.View pointerEvents="none" style={[st.hint, { bottom, opacity: v, backgroundColor: alpha(t.surface, 0.82) }]}>
      <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: t.ink2 }}>{ui.view === 'garden' ? 'Bir buketin yanına dokun, notunu aç' : 'Parmağınla çevir, iki parmakla yakınlaş'}</Text>
    </Animated.View>
  );
};

/* ---------- inbox strip: a new bouquet, or a special day coming up */
export const Inbox = ({ top }) => {
  const t = useTheme();
  const it = inbox();
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(p, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(p, { toValue: 0, duration: 800, useNativeDriver: true })])); a.start(); return () => a.stop(); }, []);
  if (!it) return null;
  return (
    <View style={[st.inbox, { top }]} pointerEvents="box-none">
      <Tap onPress={it.go} hapticKind="light" style={[st.inboxB, { backgroundColor: alpha(t.surface, 0.94), borderColor: t.line }]} accessibilityRole="button">
        <Animated.View style={[st.pulse, { backgroundColor: t.accent, opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) }]} />
        <Text style={{ fontFamily: F.semi, fontSize: 14, color: t.ink, flexShrink: 1 }} numberOfLines={1}>{it.text}</Text>
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: t.accent }}>{it.btn}</Text>
        {it.dismiss ? <Pressable onPress={it.dismiss} hitSlop={10} accessibilityLabel="Kapat"><IClose size={14} color={t.ink2} /></Pressable> : null}
      </Tap>
    </View>
  );
};

/* ---------- offline strip */
export const Offline = ({ top }) => {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  if (ui.booting || app.serverOK) return null;
  return (
    <View style={[st.inbox, { top }]} pointerEvents="box-none">
      <View style={[st.inboxB, { backgroundColor: t.noteBg, borderColor: alpha(t.noteInk, 0.2) }]}>
        <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: t.noteInk, flexShrink: 1 }} numberOfLines={2}>İnternete bağlanılamadı.</Text>
        <Pressable onPress={async () => { setBusy(true); await retryServer(); setBusy(false); }} hitSlop={8}>
          <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: t.noteInk, textDecorationLine: 'underline' }}>{busy ? 'Deneniyor…' : 'Tekrar dene'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

/* ---------- the envelope of a received bouquet */
export const Gift = ({ top, bottom }) => {
  const t = useTheme();
  const g = ui.gift;
  const on = !!g && g.state !== 'opening';
  const [v, shown] = useFade(on, 420);
  const [kept, setKept] = useState(g);
  useEffect(() => { if (g) setKept(g); }, [g]);
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])); a.start(); return () => a.stop(); }, []);
  if (!shown || !kept) return null;
  const d = kept;
  const seal = (d.sign || 'D').trim().charAt(0).toLocaleUpperCase('tr');
  const from = d.mine ? 'Gönderdiğin buket' : d.sign ? `${fromName(d.sign)} sana` : 'Sana';
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st.center, { zIndex: 12, paddingTop: top, paddingBottom: bottom, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
      <LinearGradient colors={[alpha(t.blush, 0.92), alpha(t.mist, 0.96)]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[st.env, { backgroundColor: t.surface, borderColor: t.line, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }]}>
        <View style={[st.envIn, { borderColor: alpha(t.accent, 0.3) }]} pointerEvents="none" />
        <LinearGradient colors={['#E66A88', '#B5244D', '#74102D']} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 1 }} style={st.seal}>
          <Text style={{ fontFamily: F.display, fontSize: 26, color: '#fff' }}>{d.state === 'loading' ? 'D' : seal}</Text>
        </LinearGradient>
        {d.state === 'loading' ? <Txt v="sub" style={{ textAlign: 'center' }}>Buket getiriliyor…</Txt> : <>
          <Txt v="sub" style={{ textAlign: 'center' }}>{from}</Txt>
          <Text style={{ fontFamily: F.hand, fontSize: 38, lineHeight: 40, color: t.ink, textAlign: 'center' }}>bir buket var</Text>
          {d.state === 'locked'
            ? <Cta label={ui.lockLeft || 'Zamanı gelince açılır'} disabled style={{ alignSelf: 'center', marginTop: 8 }} />
            : <Cta label="Buketi aç" onPress={openGift} style={{ alignSelf: 'center', marginTop: 8 }} />}
        </>}
      </Animated.View>
    </Animated.View>
  );
};

/* ---------- hearts flying up after a reaction */
export const Burst = () => {
  const t = useTheme(), { height } = useWindowDimensions();
  const [hearts, setHearts] = useState([]);
  useEffect(() => {
    if (!ui.burst || app.reduceMotion) return;
    const list = Array.from({ length: 16 }, (_, i) => ({ id: ui.burst + '-' + i, x: 20 + Math.random() * 60, dx: (Math.random() - 0.5) * 140, r: (Math.random() - 0.5) * 60, d: Math.random() * 500, s: 16 + Math.random() * 20, v: new Animated.Value(0) }));
    setHearts(list);
    list.forEach(h => Animated.timing(h.v, { toValue: 1, duration: 2400, delay: h.d, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
    const tm = setTimeout(() => setHearts([]), 3200);
    return () => clearTimeout(tm);
  }, [ui.burst]);
  if (!hearts.length) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 40 }]}>
      {hearts.map(h => (
        <Animated.View key={h.id} style={{ position: 'absolute', left: `${h.x}%`, bottom: height * 0.3, opacity: h.v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: h.v.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.55] }) }, { translateX: h.v.interpolate({ inputRange: [0, 1], outputRange: [0, h.dx] }) }, { rotate: `${h.r}deg` }] }}>
          <IHeart size={h.s} color={t.accent} />
        </Animated.View>
      ))}
    </View>
  );
};

/* ---------- welcome card (first launch): the garden fills the screen behind it */
const PERKS = [
  '3D buketini çiçek çiçek kendin yap, kağıdına sar, notunu yaz.',
  'Sevgiline, arkadaşına gönder; bildirim gitsin, buket onun ekranında açılsın.',
  'Her buket bahçene ekilir; sevgilinle olanlar ortak bahçenizde büyür.',
];
export const Welcome = ({ top, bottom }) => {
  const t = useTheme(), { height } = useWindowDimensions(), kb = useKeyboard();
  const [step, setStep] = useState('intro');
  const [v, shown] = useFade(ui.welcome, 500);
  useEffect(() => { if (ui.welcome) setStep('intro'); }, [ui.welcome]);
  if (!shown) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 15, opacity: v }]} pointerEvents={ui.welcome ? 'box-none' : 'none'}>
      {ui.gardenLoading ? <LinearGradient colors={t.gardenSky} style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
      <LinearGradient colors={[alpha(t.surface, 0.85), alpha(t.surface, 0)]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top + 130 }} pointerEvents="none" />
      <View style={[st.whead, { top: top + 8 }]} pointerEvents="none">
        <Text style={[st.wmark, { color: t.accent, textShadowColor: alpha(t.surface, 0.9), textShadowRadius: 12 }]}>Demet</Text>
        <Text style={{ fontFamily: F.semi, fontSize: 14.5, color: t.ink, textShadowColor: alpha(t.surface, 0.9), textShadowRadius: 10 }}>sevgiyle büyüyen bir bahçe</Text>
      </View>
      <Animated.View style={[st.wcard, { backgroundColor: t.surface, bottom: kb, maxHeight: height - top - 90 - kb, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }]}>
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false} contentContainerStyle={{ padding: 22, paddingBottom: (kb ? 16 : bottom) + 18, gap: 16 }}>
          {step === 'intro' ? <>
            <Text style={{ fontFamily: F.display, fontSize: 25, lineHeight: 29, color: t.ink, letterSpacing: -0.5 }}>Sevdiğine çiçek gönder, bahçeniz birlikte büyüsün</Text>
            <View style={{ gap: 12 }}>
              {PERKS.map(p => (
                <View key={p} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={[st.perk, { backgroundColor: t.accentSoft }]}><ILeaf size={18} color={t.accent} /></View>
                  <Txt style={{ flex: 1 }}>{p}</Txt>
                </View>
              ))}
            </View>
            <View style={{ gap: 10 }}>
              <Cta wide label="Hesap oluştur" disabled={!online()} onPress={() => setStep('register')} />
              <Btn2 wide label="Hesabım var, giriş yap" disabled={!online()} onPress={() => setStep('login')} />
            </View>
            <LinkBtn center label="Misafir olarak giriş yap" size={14.5} onPress={hideWelcome} />
            <Text style={{ fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: t.ink2, textAlign: 'center' }}>
              Devam ederek <Text onPress={() => openUrl(`${BASE}/kosullar`)} style={{ textDecorationLine: 'underline' }}>Kullanım koşullarını</Text> ve <Text onPress={() => openUrl(`${BASE}/gizlilik`)} style={{ textDecorationLine: 'underline' }}>Gizlilik politikasını</Text> kabul etmiş olursun.
            </Text>
          </> : <>
            <Pressable onPress={() => setStep('intro')} hitSlop={10} accessibilityLabel="Geri" style={[st.back, { backgroundColor: t.surface2 }]}><IBack size={20} color={t.ink} /></Pressable>
            <Text style={{ fontFamily: F.display, fontSize: 25, lineHeight: 29, color: t.ink }}>{AUTH_COPY[step][0]}</Text>
            <Txt v="sub" color={t.ink2}>{AUTH_COPY[step][1]}</Txt>
            <AuthForm key={step} mode={step} />
            <LinkBtn center label={step === 'register' ? 'Zaten hesabın var mı? Giriş yap' : 'Hesabın yok mu? Hesap oluştur'} onPress={() => setStep(step === 'register' ? 'login' : 'register')} />
          </>}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  bar: { width: 170, height: 4, borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  barI: { width: 70, height: 4, borderRadius: 2 },
  empty: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6, paddingHorizontal: 40, zIndex: 2 },
  ring: { width: 92, height: 92, borderRadius: 46, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  hint: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, zIndex: 3 },
  inbox: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 4 },
  inboxB: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 40, borderRadius: 999, borderWidth: 1, maxWidth: '100%', elevation: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  pulse: { width: 9, height: 9, borderRadius: 5 },
  env: { width: 320, maxWidth: '88%', borderRadius: R.lg, borderWidth: 1, paddingTop: 44, paddingHorizontal: 22, paddingBottom: 22, gap: 8, elevation: 16, shadowColor: '#500A23', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } },
  envIn: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: R.lg - 6 },
  seal: { position: 'absolute', top: -31, alignSelf: 'center', width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  whead: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 2 },
  wmark: { fontFamily: F.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.6 },
  wcard: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: R.lg + 6, borderTopRightRadius: R.lg + 6, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: -6 } },
  perk: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
