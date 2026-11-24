// Üst çubuk: başlık ve alt başlık, altın, bahçe/atölye düğmesi, hesap; bahçede Bahçem / Bahçemiz anahtarı.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, F, alpha } from '../ui/theme';
import { Coin, IGarden, IHeart, IStudio } from '../ui/icons';
import { Tap } from '../ui/kit';
import { app, gardenEntries, isGuest, mains, fills, online } from '../state/store';
import { fmt, fromName } from '../state/text';
import { ui, toggleView, setGardenMode } from '../ctl';

const serverDay = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);

// the gold number counts up/down to its new value
const useCount = to => {
  const [v, setV] = useState(to), from = useRef(to);
  useEffect(() => {
    const a = from.current; from.current = to;
    if (a === to || app.reduceMotion) { setV(to); return; }
    const t0 = Date.now(); let raf;
    const step = () => { const p = Math.min(1, (Date.now() - t0) / 600); setV(Math.round(a + (to - a) * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to]);
  return v;
};

export const TopBar = ({ top, onGold, onMe, narrow }) => {
  const t = useTheme();
  const v = app.viewing, garden = ui.view === 'garden', guest = isGuest();
  let title = 'Demet', sub = 'Buketini kendin yap';
  if (v) { const d = v.data; sub = v.error ? 'Buket bulunamadı' : d && v.opened ? `${fromName(d.sign || 'Biri')} gelen buket` : 'Sana bir buket geldi'; }
  else if (!garden) { const m = mains().length, f = fills().length; if (app.S.items.length) sub = `${m} dal çiçek${f ? `, ${f} dal yeşillik` : ''}`; }
  else {
    const list = gardenEntries(), p = online() && app.ME.partner, stems = list.reduce((s, e) => s + e.items.reduce((a, it) => a + it[2], 0), 0);
    title = app.gMode === 'ours' ? 'Bahçemiz' : 'Bahçem';
    sub = app.gMode === 'ours' ? (p ? `${p.name} ile · ${list.length} buket` : 'Ortak bahçe') : `${list.length} buket, ${stems} dal çiçek`;
  }
  const gold = useCount(app.W.gold || 0);
  const dot = online() && app.W.daily && app.W.daily.last !== serverDay();
  const shadow = garden ? { textShadowColor: alpha(t.surface, 0.9), textShadowRadius: 10 } : null;
  const pill = [st.pill, { borderColor: t.line, backgroundColor: alpha(t.surface, 0.86) }];
  const hideActions = ui.welcome;
  if (ui.welcome) return null;
  return (
    <View style={[st.bar, { paddingTop: top }]} pointerEvents="box-none">
      <View style={{ flex: 1, minWidth: 0 }} pointerEvents="none">
        <Text style={[st.title, { color: t.ink, fontSize: garden ? 28 : 30 }, shadow]} numberOfLines={1}>{title}</Text>
        {!garden ? <Text style={[st.sub, { color: t.ink2 }, shadow]} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {!hideActions ? (
        <View style={st.actions}>
          <Tap onPress={onGold} hapticKind="select" accessibilityLabel={`Altın: ${gold}`} style={[...pill, { borderColor: t.goldLine, backgroundColor: alpha(t.goldSoft, 0.92) }]}>
            <Coin size={18} /><Text style={[st.pillT, { color: t.ink }]}>{fmt(gold)}</Text>
            {dot ? <View style={[st.dot, { backgroundColor: t.accent, borderColor: t.surface }]} /> : null}
          </Tap>
          <Tap onPress={toggleView} hapticKind="select" accessibilityLabel={garden && !v ? 'Stüdyo' : 'Bahçe'} style={[...pill, narrow && { width: 38, paddingLeft: 0, paddingRight: 0, justifyContent: 'center' }]}>
            {garden && !v ? <IStudio size={18} color={t.ink} /> : <IGarden size={18} color={t.ink} />}
            {!narrow ? <Text style={[st.pillT, { color: t.ink }]}>{garden && !v ? 'Stüdyo' : 'Bahçe'}</Text> : null}
          </Tap>
          <Tap onPress={onMe} hapticKind="select" accessibilityLabel={guest ? 'Giriş yap ya da hesap oluştur' : 'Hesabım'}
            style={[...pill, guest ? { paddingHorizontal: 13 } : { width: 38, paddingHorizontal: 0, justifyContent: 'center' }]}>
            {guest ? <Text style={[st.pillT, { color: t.ink }]}>Giriş</Text>
              : <Text style={{ fontFamily: F.display, fontSize: 17, color: t.ink }}>{((app.ME && app.ME.name) || 'D').trim().charAt(0).toLocaleUpperCase('tr') || 'D'}</Text>}
            {!guest && online() && !app.ME.partner ? <View style={[st.dot, { backgroundColor: t.accent, borderColor: t.surface }]} /> : null}
          </Tap>
        </View>
      ) : null}
    </View>
  );
};

export const GardenSwitch = ({ top }) => {
  const t = useTheme();
  if (ui.view !== 'garden' || app.viewing || !online() || ui.welcome) return null;
  const B = ({ m, label, icon }) => {
    const on = app.gMode === m;
    return (
      <Pressable onPress={() => setGardenMode(m)} accessibilityRole="button" accessibilityState={{ selected: on }}
        style={[st.gsB, on && { backgroundColor: t.ink }]}>
        {icon ? <IHeart size={14} color={on ? t.surface : t.ink2} /> : null}
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: on ? t.surface : t.ink2 }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[st.gs, { top, backgroundColor: alpha(t.surface, 0.88), borderColor: alpha(t.line, 0.8) }]}>
      <B m="mine" label="Bahçem" /><B m="ours" label="Bahçemiz" icon />
    </View>
  );
};

const st = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, zIndex: 5 },
  title: { fontFamily: F.display, lineHeight: 34, letterSpacing: -1.2 },
  sub: { fontFamily: F.body, fontSize: 13.5, marginTop: 1, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingLeft: 10, paddingRight: 13, borderRadius: 999, borderWidth: 1 },
  pillT: { fontFamily: F.bold, fontSize: 14.5, fontVariant: ['tabular-nums'] },
  dot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  gs: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 2, padding: 4, borderRadius: 999, borderWidth: 1, zIndex: 4, elevation: 3 },
  gsB: { height: 34, paddingHorizontal: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
});
