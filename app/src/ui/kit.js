// Ortak arayüz parçaları: yazı, düğmeler, çipler, renk örnekleri, anahtar, sayaç, giriş kutuları.
import { forwardRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme, F, R, alpha, mix } from './theme';
import { Coin, ICheck } from './icons';
import { haptic } from '../services/native';

/* ---------- text */
export const Txt = ({ style, v = 'body', color, children, ...p }) => {
  const t = useTheme();
  return <Text {...p} style={[ts[v], { color: color || (v === 'small' || v === 'label' || v === 'sub' ? t.ink2 : t.ink) }, style]}>{children}</Text>;
};
const ts = StyleSheet.create({
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  bold: { fontFamily: F.bold, fontSize: 15, lineHeight: 21 },
  semi: { fontFamily: F.semi, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  sub: { fontFamily: F.body, fontSize: 14.5, lineHeight: 20.5 },
  label: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 18 },
  h3: { fontFamily: F.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  h2: { fontFamily: F.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  title: { fontFamily: F.display, fontSize: 30, lineHeight: 32, letterSpacing: -1.2 },
  hand: { fontFamily: F.hand, fontSize: 26, lineHeight: 30 },
});

/* ---------- press feedback: a little scale-down, like :active in the web */
const usePress = (to = 0.96) => {
  const s = useRef(new Animated.Value(1)).current;
  const go = v => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 6 : 0 }).start();
  return { scale: s, onPressIn: () => go(to), onPressOut: () => go(1) };
};
export const Tap = ({ onPress, disabled, style, children, scaleTo = 0.96, hapticKind, hitSlop = 6, ...p }) => {
  const pr = usePress(scaleTo);
  return (
    <Pressable {...p} hitSlop={hitSlop} disabled={disabled} onPressIn={pr.onPressIn} onPressOut={pr.onPressOut}
      onPress={e => { if (hapticKind) haptic(hapticKind); onPress && onPress(e); }}>
      <Animated.View style={[style, { transform: [{ scale: pr.scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

/* ---------- buttons */
export const Cta = ({ label, onPress, disabled, busy, small, wide, cost, tone = 'accent', icon, style }) => {
  const t = useTheme();
  const bg = tone === 'danger' ? t.danger : tone === 'wa' ? '#1FA855' : t.accent;
  const fg = tone === 'accent' ? t.accentInk : '#FFFFFF';
  return (
    <Tap onPress={onPress} disabled={disabled || busy} hapticKind="light" accessibilityRole="button" accessibilityLabel={label}
      style={[st.cta, { backgroundColor: bg, opacity: disabled ? 0.45 : 1, height: small ? 40 : 48, paddingHorizontal: small ? 16 : 22 },
        wide && { alignSelf: 'stretch' }, !disabled && { shadowColor: bg, elevation: 4 }, style]}>
      {busy ? <ActivityIndicator color={fg} size="small" /> : icon}
      <Text style={[st.ctaT, { color: fg, fontSize: small ? 14.5 : 15.5 }]} numberOfLines={1}>{label}</Text>
      {cost ? <View style={st.cost}><Coin size={14} /><Text style={[st.costT, { color: fg }]}>{cost}</Text></View> : null}
    </Tap>
  );
};
export const Btn2 = ({ label, onPress, disabled, busy, small, wide, icon, style, color }) => {
  const t = useTheme();
  return (
    <Tap onPress={onPress} disabled={disabled || busy} hapticKind="select" accessibilityRole="button" accessibilityLabel={label}
      style={[st.btn2, { borderColor: t.line, backgroundColor: t.surface, opacity: disabled ? 0.45 : 1, height: small ? 36 : 44, paddingHorizontal: small ? 13 : 18 }, wide && { alignSelf: 'stretch' }, style]}>
      {busy ? <ActivityIndicator color={t.ink} size="small" /> : icon}
      <Text style={[st.btn2T, { color: color || t.ink, fontSize: small ? 13.5 : 15 }]} numberOfLines={1}>{label}</Text>
    </Tap>
  );
};
export const LinkBtn = ({ label, onPress, color, style, size = 13.5, center }) => {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" style={[{ paddingVertical: 4, alignSelf: center ? 'center' : 'flex-start' }, style]}>
      {({ pressed }) => <Text style={{ fontFamily: F.semi, fontSize: size, color: color || t.ink2, textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1, textAlign: center ? 'center' : 'left' }}>{label}</Text>}
    </Pressable>
  );
};

/* ---------- chips */
export const Chip = ({ label, on, onPress, lock, icon, accessibilityLabel }) => {
  const t = useTheme();
  return (
    <Tap onPress={onPress} hapticKind="select" scaleTo={0.94} accessibilityRole="button" accessibilityState={{ selected: !!on }} accessibilityLabel={accessibilityLabel || label}
      style={[st.chip, { borderColor: on ? t.ink : t.line, backgroundColor: on ? t.ink : t.surface }]}>
      {icon}
      <Text style={[st.chipT, { color: on ? t.surface : t.ink }]}>{label}</Text>
      {lock ? <View style={st.lock}><Coin size={13} /><Text style={[st.lockT, { color: on ? t.goldLine : t.gold }]}>{lock}</Text></View> : null}
    </Tap>
  );
};
export const Chips = ({ children, style }) => <View style={[st.chips, style]}>{children}</View>;

/* ---------- color swatches (with the special paper looks) */
export const SwatchFace = ({ hex, kind, size = 34 }) => {
  const id = `g${kind}${hex.slice(1)}${size}`;
  const dk = mix(hex, '#000000', 0.45), lt = mix(hex, '#FFFFFF', 0.45);
  return (
    <Svg width={size} height={size} viewBox="0 0 34 34">
      <Defs>
        {kind === 'metal' && <RadialGradient id={id} cx="35%" cy="30%" r="80%"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.1" stopColor="#FFFFFF" /><Stop offset="0.5" stopColor={hex} /><Stop offset="1" stopColor={dk} /></RadialGradient>}
        {kind === 'velvet' && <RadialGradient id={id} cx="40%" cy="35%" r="75%"><Stop offset="0" stopColor={lt} /><Stop offset="0.55" stopColor={hex} /><Stop offset="1" stopColor={mix(hex, '#000000', 0.3)} /></RadialGradient>}
        {kind === 'crystal' && <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={mix(hex, '#FFFFFF', 0.3)} /><Stop offset="0.4" stopColor="#CFE8FF" /><Stop offset="0.7" stopColor="#F6D6FF" /><Stop offset="1" stopColor={hex} /></LinearGradient>}
        {kind === 'goldedge' && <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#E8C46A" /><Stop offset="0.22" stopColor="#E8C46A" /><Stop offset="0.22" stopColor="#B98A2E" /><Stop offset="0.3" stopColor="#B98A2E" /><Stop offset="0.3" stopColor={hex} /><Stop offset="1" stopColor={hex} /></LinearGradient>}
        {kind === 'news' && <Pattern id={id} width="34" height="4" patternUnits="userSpaceOnUse"><Rect width="34" height="3" fill={hex} /><Rect y="3" width="34" height="1" fill={mix(hex, '#555555', 0.3)} /></Pattern>}
      </Defs>
      <Circle cx="17" cy="17" r="17" fill={kind && kind !== 'plain' ? `url(#${id})` : hex} opacity={kind === 'crystal' ? 0.9 : 1} />
      <Circle cx="17" cy="17" r="16.5" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1" />
    </Svg>
  );
};
export const Swatches = ({ list, current, onPick, kind }) => {
  const t = useTheme();
  return (
    <View style={st.sws} accessibilityRole="radiogroup">
      {list.map(([n, hex]) => {
        const on = hex === current;
        return (
          <Tap key={hex} onPress={() => onPick(hex)} hapticKind="select" scaleTo={0.9} accessibilityRole="radio" accessibilityLabel={n} accessibilityState={{ selected: on }}
            style={[st.sw, { borderColor: on ? t.ink : 'transparent' }]}>
            <SwatchFace hex={hex} kind={kind} />
          </Tap>
        );
      })}
    </View>
  );
};

/* ---------- switch + stepper */
export const Switch = ({ on, onPress, label }) => {
  const t = useTheme();
  const x = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.spring(x, { toValue: on ? 1 : 0, useNativeDriver: false, speed: 30, bounciness: 4 }).start(); }, [on]);
  return (
    <Pressable onPress={() => { haptic('select'); onPress(); }} hitSlop={8} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: !!on }}>
      <Animated.View style={[st.switch, { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [t.line, t.accent] }) }]}>
        <Animated.View style={[st.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
};
export const Stepper = ({ value, max, onMinus, onPlus, label }) => {
  const t = useTheme();
  const B = ({ txt, dis, fn, a }) => (
    <Tap onPress={fn} disabled={dis} hapticKind="select" scaleTo={0.9} accessibilityLabel={a}
      style={[st.stepB, { borderColor: t.line, backgroundColor: t.surface, opacity: dis ? 0.35 : 1 }]}>
      <Text style={{ fontFamily: F.semi, fontSize: 18, color: t.ink, lineHeight: 20 }}>{txt}</Text>
    </Tap>
  );
  return (
    <View style={st.stepper}>
      <B txt="−" dis={!value} fn={onMinus} a={`${label} azalt`} />
      <Text style={{ minWidth: 26, textAlign: 'center', fontFamily: F.semi, fontSize: 15, color: t.ink }}>{value}</Text>
      <B txt="+" dis={value >= max} fn={onPlus} a={`${label} ekle`} />
    </View>
  );
};

/* ---------- form fields */
export const Field = forwardRef(({ label, hand, style, inputStyle, multiline, right, error, count, ...p }, ref) => {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput ref={ref} {...p} multiline={multiline} placeholderTextColor={alpha(t.ink2, 0.75)} selectionColor={t.accent}
          onFocus={e => { setFocus(true); p.onFocus && p.onFocus(e); }} onBlur={e => { setFocus(false); p.onBlur && p.onBlur(e); }}
          style={[st.input, { borderColor: error ? t.danger : focus ? t.accent : t.line, backgroundColor: t.surface2, color: t.ink },
            hand ? { fontFamily: F.hand, fontSize: 25, lineHeight: 29, paddingVertical: 8 } : { fontFamily: F.body, fontSize: 16 },
            multiline && { minHeight: hand ? 96 : 72, textAlignVertical: 'top' }, inputStyle]} />
        {right}
      </View>
      {count != null ? <Txt v="small" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>{count}</Txt> : null}
    </View>
  );
});

/* ---------- blocks */
export const Tip = ({ children, style, right }) => {
  const t = useTheme();
  return (
    <View style={[st.tip, { backgroundColor: t.noteBg }, style]}>
      <Text style={{ flex: 1, color: t.noteInk, fontFamily: F.body, fontSize: 13.5, lineHeight: 19 }}>{children}</Text>
      {right}
    </View>
  );
};
export const Err = ({ children }) => {
  const t = useTheme();
  if (!children) return null;
  return <Text accessibilityRole="alert" style={{ color: t.danger, fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 }}>{children}</Text>;
};
export const Group = ({ title, children, style, right }) => (
  <View style={[{ gap: 10 }, style]}>
    {title ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      {typeof title === 'string' ? <Txt v="label">{title}</Txt> : title}{right}
    </View> : null}
    {children}
  </View>
);
export const Row = ({ children, style, last }) => {
  const t = useTheme();
  return <View style={[st.row, { borderBottomColor: t.line, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth * 2 }, style]}>{children}</View>;
};
export const Acts = ({ children, style }) => <View style={[st.acts, style]}>{children}</View>;
export const Av = ({ name, heart, size = 40, children }) => {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: heart ? t.accent : t.surface2, borderWidth: heart ? 0 : 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
      {children || <Text style={{ fontFamily: F.display, fontSize: size * 0.42, color: heart ? t.accentInk : t.ink }}>{String(name || 'D').trim().charAt(0).toLocaleUpperCase('tr')}</Text>}
    </View>
  );
};
export const Tag = ({ label, tone }) => {
  const t = useTheme();
  const c = tone === 'in' ? [t.accentSoft, t.accent] : tone === 'sample' ? [t.goldSoft, t.gold] : tone === 'reason' ? [t.noteBg, t.noteInk] : [t.surface2, t.ink2];
  return <View style={[st.tag, { backgroundColor: c[0] }]}><Text style={{ fontFamily: F.bold, fontSize: 11.5, color: c[1] }}>{label}</Text></View>;
};
export const Lines = ({ rows, total, warn }) => {
  const t = useTheme();
  return (
    <View style={[st.lines, { backgroundColor: t.surface2 }]}>
      {rows.map(([a, b], i) => <View key={i} style={st.line}><Txt v="small" color={t.ink2}>{a}</Txt><Txt v="small" color={t.ink}>{b}</Txt></View>)}
      {total ? <View style={[st.line, { borderTopWidth: 1, borderTopColor: t.line, paddingTop: 8, marginTop: 2 }]}><Txt v="bold">{total[0]}</Txt><Txt v="bold">{total[1]}</Txt></View> : null}
      {warn ? <Txt v="semi" color={t.danger} style={{ fontSize: 13.5 }}>{warn}</Txt> : null}
    </View>
  );
};
export const Check = ({ on, onPress, title, sub }) => {
  const t = useTheme();
  return (
    <Pressable onPress={() => { haptic('select'); onPress(); }} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : t.surface, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {on ? <ICheck size={15} color={t.accentInk} /> : null}
      </View>
      <View style={{ flex: 1 }}><Txt v="bold">{title}</Txt>{sub ? <Txt v="small">{sub}</Txt> : null}</View>
    </Pressable>
  );
};

const st = StyleSheet.create({
  cta: { borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  ctaT: { fontFamily: F.bold },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  costT: { fontFamily: F.bold, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  btn2: { borderWidth: 1.5, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start' },
  btn2T: { fontFamily: F.bold },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipT: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockT: { fontFamily: F.bold, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  sws: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sw: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stepB: { width: 36, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderWidth: 1.5, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 10, minHeight: 46 },
  tip: { borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  acts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  tag: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  lines: { borderRadius: R.md, padding: 12, gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
});
