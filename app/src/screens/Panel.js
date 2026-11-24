// Alt panel: sekmeler (çiçek, yeşillik, sarma, süs, not / bahçe filtreleri), içerik ve alttaki ana düğme.
import { memo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, F, R, alpha } from '../ui/theme';
import { Txt, Tap, Cta, Btn2, LinkBtn, Chip, Chips, Swatches, Switch, Stepper, Field, Tip, Group, Row, Tag, SwatchFace } from '../ui/kit';
import { Coin, IHeart, ISpark, IShare, IImage } from '../ui/icons';
import { THUMB } from '../ui/thumbs';
import { app, count, mains, fills, priceOf, cost, gardenEntries, online, owns, compact, summary } from '../state/store';
import { FLOWERS, FILLERS, ALL, TISSUES, PAPER_STYLES, RIBBON_STYLES, DECOR, HEARTS, REASONS, MAX_MAIN, MAX_FILL, DAY, isMain, nameOf } from '../state/catalog';
import { lower, toName, fromName, fmtLong, fmtWeekday, whenText, dayKey } from '../state/text';
import { ui, refresh, drawCard, streak, buildFor, sendReaction, leaveViewing, E } from '../ctl';
import { haptic, shareLink } from '../services/native';
import { BASE } from '../services/api';
import { toast } from '../ui/sheet';
import * as Sh from './sheets';

export const STUDIO_TABS = [['flowers', 'Çiçek'], ['greens', 'Yeşillik'], ['wrap', 'Sarma'], ['decor', 'Süs'], ['note', 'Not']];
const swCls = { velvet: 'velvet', goldedge: 'goldedge', news: 'news', crystal: 'crystal', shimmer: 'metal' };

/* ---------- tabs */
const Tabs = () => {
  const t = useTheme();
  if (app.viewing) return <View style={{ height: 10 }} />;
  const items = ui.view === 'studio'
    ? STUDIO_TABS.map(([id, label]) => [id, label, id === 'flowers' ? mains().length : id === 'greens' ? fills().length : 0, ui.tab === id])
    : (() => { const l = gardenEntries(), cin = l.filter(e => e.dir === 'in').length; return [['all', 'Tümü', l.length], ['in', 'Gelen', cin], ['out', 'Giden', l.length - cin]].map(x => [...x, ui.gFilter === x[0]]); })();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabs} style={{ flexGrow: 0 }}>
      {items.map(([id, label, n, on]) => (
        <Tap key={id} hapticKind="select" scaleTo={0.94} accessibilityRole="tab" accessibilityState={{ selected: on }}
          onPress={() => { if (ui.view === 'studio') ui.tab = id; else ui.gFilter = id; refresh({ sync: false }); }}
          style={[st.tab, { borderColor: on ? t.ink : t.line, backgroundColor: on ? t.ink : 'transparent' }]}>
          <Text style={[st.tabT, { color: on ? t.surface : t.ink2 }]}>{label}</Text>
          {n || ui.view === 'garden' ? <Text style={[st.tabN, { color: on ? t.surface : t.ink2 }]}>{n}</Text> : null}
        </Tap>
      ))}
    </ScrollView>
  );
};

/* ---------- flowers / greens */
const FCard = memo(({ type, f, n, full, active, w, t }) => {
  const p = priceOf(type), onAdd = () => addItem(type), onMinus = () => removeItem(type);
  return (
    <View style={{ width: w }}>
      <Tap onPress={onAdd} disabled={full} scaleTo={0.95} accessibilityLabel={`Bir dal ${lower(f.name)} ekle`}
        style={[st.fcard, { borderColor: active ? t.accent : t.line, backgroundColor: active ? t.accentSoft : t.surface2, opacity: full ? 0.5 : 1 }]}>
        <Image source={THUMB[type]} style={{ width: 64, height: 64 }} contentFit="contain" transition={0} />
        <Text style={[st.fnm, { color: t.ink }]} numberOfLines={1}>{f.name}</Text>
        <View style={st.fpr}>
          {p ? <><Coin size={13} /><Text style={[st.fprT, { color: t.gold, fontFamily: F.bold }]}>{p} / dal</Text></> : <Text style={[st.fprT, { color: t.ink2 }]}>Ücretsiz</Text>}
        </View>
      </Tap>
      {n ? <>
        <View style={[st.cnt, { backgroundColor: t.ink }]} pointerEvents="none"><Text style={[st.cntT, { color: t.surface }]}>{n}</Text></View>
        <Tap onPress={onMinus} scaleTo={0.85} hitSlop={8} outer={st.minusPos} accessibilityLabel={`Bir dal ${lower(f.name)} çıkar`}
          style={[st.minus, { borderColor: t.line, backgroundColor: t.surface }]}>
          <Text style={{ fontFamily: F.semi, fontSize: 18, lineHeight: 20, color: t.ink }}>−</Text>
        </Tap>
      </> : null}
    </View>
  );
});

const addItem = type => {
  const S = app.S;
  const full = isMain(type) ? mains().length >= MAX_MAIN : fills().length >= MAX_FILL;
  if (full) { toast(isMain(type) ? `Bir bukete en fazla ${MAX_MAIN} dal çiçek sığar` : `En fazla ${MAX_FILL} dal yeşillik eklenir`); return; }
  if (isMain(type)) S.active = type; else S.fillActive = type;
  S.items.push({ id: S.nextId++, type, color: S.pick[type] });
  ui.hint = false; haptic('light'); refresh();
};
const removeItem = type => {
  const S = app.S;
  for (let i = S.items.length - 1; i >= 0; i--) if (S.items[i].type === type) { S.items.splice(i, 1); break; }
  if (!S.items.length) S.wrapped = false;
  haptic('select'); refresh();
};

const FlowersPane = ({ isF, t, cardW }) => {
  const S = app.S, a = isF ? S.active : S.fillActive, f = ALL[a], types = isF ? FLOWERS : FILLERS;
  const m = mains().length;
  return (
    <>
      {f.colors.length > 1 ? (
        <Group title={<Txt v="label" style={{ flex: 1 }}>Eklenecek {lower(f.name)} rengi: <Txt v="label" color={t.ink}>{nameOf(f.colors, S.pick[a])}</Txt></Txt>}>
          <Swatches list={f.colors} current={S.pick[a]} kind={a === 'rose_gold' ? 'metal' : null} onPick={hex => { S.pick[a] = hex; refresh({ sync: false }); }} />
        </Group>
      ) : null}
      <View style={st.fgrid}>
        {Object.entries(types).map(([type, ff]) => (
          <FCard key={type} type={type} f={ff} n={count(type)} t={t} w={cardW} active={type === a}
            full={isMain(type) ? m >= MAX_MAIN : fills().length >= MAX_FILL} />
        ))}
      </View>
      {isF && m && m % 2 === 0 ? <Tip>Çiçek genelde tek sayıda verilir. Buketinde şu an {m} dal çiçek var.</Tip> : null}
      {isF && S.items.length ? <LinkBtn label="Buketi boşalt" onPress={Sh.openClear} /> : null}
    </>
  );
};

/* ---------- wrap */
const styleChips = (styles, current, kind, onPick) => (
  <Chips>{Object.entries(styles).map(([id, s]) => (
    <Chip key={id} label={s.name} on={id === current} lock={s.price && !owns(kind + ':' + id) ? s.price : null} onPress={() => onPick(id, s)} />
  ))}</Chips>
);
const WrapPane = ({ t }) => {
  const S = app.S, ps = PAPER_STYLES[S.paperStyle], rs = RIBBON_STYLES[S.ribbonStyle];
  const pickPaper = (val, st2) => {
    if (st2.price && !owns('paper:' + val)) return Sh.openUnlock({ key: 'paper:' + val, name: st2.name + ' kağıt', desc: 'Bütün buketlerinde sınırsız kullanırsın.', price: st2.price, icon: <SwatchFace hex={st2.colors[0][1]} kind={swCls[val]} size={52} />, after: () => { S.paperStyle = val; S.paper = st2.colors[0][1]; } });
    S.paperStyle = val; if (!st2.colors.some(c => c[1] === S.paper)) S.paper = st2.colors[0][1]; refresh();
  };
  const pickRibbon = (val, st2) => {
    if (st2.price && !owns('ribbon:' + val)) return Sh.openUnlock({ key: 'ribbon:' + val, name: st2.name + ' kurdele', desc: 'Bütün buketlerinde sınırsız kullanırsın.', price: st2.price, icon: <SwatchFace hex={st2.colors[0][1]} kind={swCls[val]} size={52} />, after: () => { S.ribbonStyle = val; S.ribbon = st2.colors[0][1]; } });
    S.ribbonStyle = val; if (!st2.colors.some(c => c[1] === S.ribbon)) S.ribbon = st2.colors[0][1]; refresh();
  };
  return (
    <>
      {!S.items.length ? <Tip>Sarmak için önce birkaç çiçek ekle.</Tip>
        : !S.wrapped ? (
          <View style={[st.wrapcard, { backgroundColor: t.accentSoft, borderColor: alpha(t.accent, 0.3) }]}>
            <View style={{ flex: 1 }}><Txt v="bold">Buket sarılmaya hazır</Txt><Txt v="small">Kağıdı seç, sonra sar.</Txt></View>
            <Cta small label="Buketi sar" onPress={() => { S.wrapped = true; haptic('medium'); refresh(); }} />
          </View>
        ) : <LinkBtn label="Ambalajı aç" onPress={() => { S.wrapped = false; refresh(); }} />}
      <Group title="Dış kağıt">{styleChips(PAPER_STYLES, S.paperStyle, 'paper', pickPaper)}</Group>
      <Group title={<Txt v="label">{ps.name} rengi: <Txt v="label" color={t.ink}>{nameOf(ps.colors, S.paper)}</Txt></Txt>}>
        <Swatches list={ps.colors} current={S.paper} kind={swCls[S.paperStyle]} onPick={hex => { S.paper = hex; refresh(); }} />
      </Group>
      <Group title={<Txt v="label">İç kağıt: <Txt v="label" color={t.ink}>{nameOf(TISSUES, S.tissue)}</Txt></Txt>}>
        <Swatches list={TISSUES} current={S.tissue} onPick={hex => { S.tissue = hex; refresh(); }} />
      </Group>
      <Group title="Kurdele">{styleChips(RIBBON_STYLES, S.ribbonStyle, 'ribbon', pickRibbon)}</Group>
      <Group title={<Txt v="label">{rs.name} rengi: <Txt v="label" color={t.ink}>{nameOf(rs.colors, S.ribbon)}</Txt></Txt>}>
        <Swatches list={rs.colors} current={S.ribbon} kind={swCls[S.ribbonStyle]} onPick={hex => { S.ribbon = hex; refresh(); }} />
      </Group>
    </>
  );
};

/* ---------- decor */
export const DecorIcon = ({ d, t, size = 46 }) => {
  if (d.thumb) return <Image source={THUMB[d.thumb]} style={{ width: size, height: size }} contentFit="contain" />;
  if (d.icon === 'pearl') return <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>{[10, 14, 9].map((s, i) => <View key={i} style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: '#EDE6DD', borderWidth: 1, borderColor: '#D9CEC1' }} />)}</View>;
  if (d.icon === 'glow') return <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,200,110,0.35)', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFE7A6' }} /></View>;
  return <ISpark size={24} color={t.gold} />;
};
const DecorPane = ({ t }) => {
  const S = app.S;
  return (
    <View>
      {DECOR.map((d, i) => {
        const locked = d.price && !owns('decor:' + d.id), v = S.d[d.id];
        let ctl;
        if (locked) ctl = (
          <Tap onPress={() => Sh.openUnlock({ key: 'decor:' + d.id, name: d.name, desc: d.desc + '. Kilidi bir kez açarsın, sonra her bukette kullanırsın.', price: d.price, icon: <DecorIcon d={d} t={t} size={52} />, after: () => { S.d[d.id] = d.kind === 'count' ? 1 : true; } })}
            hapticKind="select" style={[st.unlock, { borderColor: t.goldLine, backgroundColor: t.goldSoft }]} accessibilityLabel={`${d.name} kilidini aç, ${d.price} altın`}>
            <Coin size={14} /><Text style={{ fontFamily: F.bold, fontSize: 13.5, color: t.ink }}>{d.price}</Text>
          </Tap>
        );
        else if (d.kind === 'count') ctl = <Stepper value={v} max={d.max} label={d.name} onMinus={() => { S.d[d.id] = Math.max(0, v - 1); refresh(); }} onPlus={() => { S.d[d.id] = Math.min(d.max, v + 1); refresh(); }} />;
        else ctl = <Switch on={!!v} label={d.name} onPress={() => { S.d[d.id] = !v; refresh(); }} />;
        const note = d.id === 'teddy' && S.d.teddy && !S.wrapped ? ' Buketi sarınca görünür.' : '';
        return (
          <View key={d.id}>
            <Row last={i === DECOR.length - 1 && !(d.id === 'hearts' && S.d.hearts)}>
              <View style={[st.dico, { backgroundColor: t.surface2 }]}><DecorIcon d={d} t={t} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Txt v="semi">{d.name}</Txt>
                  {d.price ? <Text style={{ fontFamily: locked ? F.bold : F.semi, fontSize: 12, color: locked ? t.gold : t.ink2 }}>{locked ? 'Premium' : 'Senin'}</Text> : null}
                </View>
                <Txt v="small">{d.desc}{note}</Txt>
              </View>
              {ctl}
            </Row>
            {d.id === 'hearts' && S.d.hearts ? <View style={{ paddingLeft: 58, paddingBottom: 10 }}><Swatches list={HEARTS} current={S.d.heartColor} onPick={hex => { S.d.heartColor = hex; refresh(); }} /></View> : null}
          </View>
        );
      })}
    </View>
  );
};

/* ---------- note */
let cardTimer;
const NotePane = ({ t }) => {
  const S = app.S;
  const later = () => { clearTimeout(cardTimer); cardTimer = setTimeout(drawCard, 160); };
  return (
    <>
      <Group title="Ne için?">
        <Chips>{REASONS.map(r => <Chip key={r} label={r} on={r === S.reason} onPress={() => { S.reason = r; drawCard(); refresh({ sync: false }); }} />)}</Chips>
      </Group>
      <Field label="Kartına yaz" hand multiline maxLength={120} defaultValue={S.note} placeholder={`${S.reason}…`} count={`${S.note.length} / 120`}
        onChangeText={v => { S.note = v; later(); refresh({ sync: false }); }} />
      <Field label="İmza" hand maxLength={24} defaultValue={S.sign} placeholder="İsmin…" autoCapitalize="words"
        onChangeText={v => { S.sign = v; later(); refresh({ sync: false }); }} />
      <Row last>
        <Txt v="semi" style={{ flex: 1 }}>Kartı buketin içinde göster</Txt>
        <Switch on={S.showCard} label="Kartı göster" onPress={() => { S.showCard = !S.showCard; refresh(); }} />
      </Row>
    </>
  );
};

/* ---------- garden */
const Thumb = ({ e, t }) => (
  <View style={[st.thumb, { backgroundColor: t.blush }]}>
    {e.snap || e.preview ? <Image source={{ uri: e.preview || e.snap }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="disk" recyclingKey={e.id} />
      : <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>{e.items.slice(0, 3).map(([ty], i) => <Image key={i} source={THUMB[ty]} style={{ width: 30, height: 30, marginHorizontal: -4 }} contentFit="contain" />)}</View>}
  </View>
);
const GardenPane = ({ t }) => {
  const all = gardenEntries(), p = online() && app.ME.partner, ours = app.gMode === 'ours';
  if (ours && !p) return (
    <>
      <View style={[st.invite, { backgroundColor: t.accentSoft, borderColor: alpha(t.accent, 0.28) }]}>
        <Txt v="h3" style={{ fontSize: 19, lineHeight: 23 }}>Ortak bahçeniz sizi bekliyor</Txt>
        <Txt v="sub" color={t.ink2}>Sevgilini ya da eşini ekle. Birbirinize gönderdiğiniz her buket burada, ikinizin bahçesinde büyüsün. Bahçeyi ikiniz de aynı görürsünüz.</Txt>
        <Cta label={online() ? 'Sevgilini davet et' : 'Bağlantı gerekli'} disabled={!online()} onPress={() => Sh.openInvite('partner')} />
      </View>
      <Txt v="small">Davet linkini WhatsApp’tan atabilirsin. Kabul edince ikinize de haber gelir.</Txt>
    </>
  );
  const s = streak(), stems = all.reduce((a, e) => a + e.items.reduce((x, it) => x + it[2], 0), 0);
  const week = Array.from({ length: 7 }, (_, i) => { const d = Date.now() - (6 - i) * DAY; return { on: all.some(e => (ours || e.dir === 'out') && dayKey(e.at) === dayKey(d)), l: fmtWeekday(d), today: i === 6 }; });
  const list = all.filter(e => ui.gFilter === 'all' || e.dir === ui.gFilter).sort((a, b) => b.at - a.at);
  const people = new Set(all.filter(e => !e.sample).map(e => e.withId || e.who)).size;
  const third = ours ? [s, 'gün seri'] : [people, 'kişi'];
  const streakText = ours ? (s ? `${s} gündür birbirinize çiçek gönderiyorsunuz` : `Bugün ${toName(p.name)} bir buket gönder, seriniz başlasın`)
    : (s ? `${s} gündür çiçek gönderiyorsun` : 'Bugün birine buket gönder, seri başlasın');
  return (
    <>
      {ours && !all.length ? (
        <View style={[st.invite, { backgroundColor: t.accentSoft, borderColor: alpha(t.accent, 0.28) }]}>
          <Txt v="h3" style={{ fontSize: 19, lineHeight: 23 }}>{p.name} ile ortak bahçeniz hazır</Txt>
          <Txt v="sub" color={t.ink2}>Birbirinize gönderdiğiniz ilk buket burada açacak.</Txt>
          <Cta label={`${toName(p.name)} buket yap`} onPress={buildFor} />
        </View>
      ) : null}
      <View style={st.gsum}>
        {[[all.length, 'buket'], [stems, 'dal çiçek'], third].map(([n, l], i) => (
          <View key={i} style={[st.gsumC, { backgroundColor: t.surface2 }]}>
            <Text style={{ fontFamily: F.display, fontSize: 24, lineHeight: 27, color: t.ink, fontVariant: ['tabular-nums'] }}>{n}</Text>
            <Txt v="small">{l}</Txt>
          </View>
        ))}
      </View>
      <View style={{ gap: 6 }} accessibilityLabel="Son 7 gün">
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {week.map((w, i) => (
            <View key={i} style={[st.wk, { borderColor: w.on ? t.accent : w.today ? t.ink2 : t.line, backgroundColor: w.on ? t.accent : 'transparent' }]}>
              <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: w.on ? t.accentInk : t.ink2 }}>{w.l}</Text>
            </View>
          ))}
        </View>
        <Txt v="small">{streakText}</Txt>
      </View>
      <View style={{ gap: 2, marginHorizontal: -8 }}>
        {list.length ? list.map(e => (
          <Tap key={e.id} scaleTo={0.98} onPress={() => { Sh.openEntry(e.id); E.cur && E.cur.focusPatch(e.id); }} style={st.entry} accessibilityLabel={`${e.dir === 'in' ? fromName(e.who) + ' gelen' : toName(e.who) + ' giden'} buket`}>
            <Thumb e={e} t={t} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Txt v="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{e.dir === 'in' ? fromName(e.who) : toName(e.who)}</Txt>
                <Tag label={e.dir === 'in' ? 'Gelen' : 'Giden'} tone={e.dir === 'in' ? 'in' : null} />
                {e.sample ? <Tag label="Örnek" tone="sample" /> : null}
                {e.remoteId && e.dir === 'out' ? (e.deliverAt && !e.delivered ? <Tag label="Planlandı" tone="reason" /> : <Tag label={e.openedAt ? 'Açıldı' : 'Açılmadı'} />) : null}
                {e.reaction ? <Tag label={e.dir === 'out' ? 'Cevap verdi' : 'Cevapladın'} tone="in" /> : null}
                <Txt v="small" style={{ marginLeft: 'auto' }}>{whenText(e.at)}</Txt>
              </View>
              <Txt v="small" numberOfLines={1} color={e.note ? t.ink : t.ink2} style={e.note ? { fontFamily: F.hand, fontSize: 19, lineHeight: 22 } : null}>{e.note || e.reason}</Txt>
            </View>
          </Tap>
        )) : <Txt v="small" style={{ paddingHorizontal: 8 }}>{all.length ? 'Bu listede henüz buket yok.' : ours ? '' : 'Henüz buket yok. İlk buketini yap, bahçen büyümeye başlasın.'}</Txt>}
      </View>
    </>
  );
};

/* ---------- a received bouquet */
const ReactBox = ({ t }) => {
  const v = app.viewing, cur = v.reaction, k = cur && cur.kind;
  const txt = useRef(k === 'note' && cur.text ? cur.text : '');
  return (
    <Group title={cur ? 'Cevabın gitti. İstersen değiştir' : `${toName(v.data.sign || 'Gönderen')} karşılık ver`}>
      <Chips>
        {[['heart', 'Kalp'], ['thanks', 'Teşekkür ederim'], ['love', 'Seni seviyorum'], ['wow', 'Çok güzel olmuş']].map(([id, l]) => (
          <Chip key={id} label={l} on={k === id} icon={id === 'heart' ? <IHeart size={15} color={k === id ? t.surface : t.accent} /> : null} onPress={() => sendReaction(id)} />
        ))}
      </Chips>
      <Field placeholder="Kısa bir not yaz…" maxLength={120} defaultValue={txt.current} onChangeText={x => { txt.current = x; }}
        right={<Btn2 label="Gönder" onPress={() => sendReaction('note', txt.current)} />} />
    </Group>
  );
};
const RecvPane = ({ t }) => {
  const v = app.viewing;
  if (v.error) return (
    <View style={{ gap: 8 }}>
      <Txt v="h3">Bu buket bulunamadı</Txt>
      <Txt v="small">Link eksik kopyalanmış olabilir. Gönderen kişiden linki tekrar iste.</Txt>
    </View>
  );
  const d = v.data;
  if (v.locked) return <Txt v="small">Bu buket {require('../state/text').fmtDT(d.deliverAt)} açılacak. Zamanı gelince kendiliğinden açılır.</Txt>;
  if (!d || !v.opened) return <Txt v="small">{d ? 'Buketini açmak için zarfa dokun.' : 'Buket yükleniyor…'}</Txt>;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Tag label={d.reason || 'Buket'} tone="reason" /><Txt v="small">{fmtLong(d.createdAt || Date.now())}</Txt></View>
      <Text style={{ fontFamily: F.hand, fontSize: 32, lineHeight: 36, color: t.ink }} selectable>{d.note || d.reason || ''}</Text>
      {d.sign ? <Text style={{ fontFamily: F.hand, fontSize: 24, color: t.ink2, textAlign: 'right', marginTop: -6 }}>— {d.sign}</Text> : null}
      <Txt v="small">{summary(compact(d.items))}</Txt>
      {v.canReact ? <ReactBox t={t} /> : null}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Cta label="Hikâyede paylaş" icon={<IImage size={18} color={t.accentInk} />} onPress={Sh.openStory} />
        <Btn2 label="Linki paylaş" icon={<IShare size={17} color={t.ink} />} onPress={() => shareLink(`${BASE}/b/${v.id}`, `${fromName(d.sign || 'Biri')} gelen buket`)} />
      </View>
      <LinkBtn label="Bahçemde gör" onPress={() => leaveViewing('garden')} />
      {online() && d.canReport ? <LinkBtn label="Uygunsuz içerik bildir" size={12.5} onPress={() => Sh.openReport(v.id)} /> : null}
    </View>
  );
};

/* ---------- footer */
const Foot = ({ t, bottom }) => {
  let meta, btn;
  const v = app.viewing;
  if (v) {
    meta = v.error ? 'Kendi buketini yapıp gönderebilirsin.' : 'Sen de bir buket yapıp gönder.';
    btn = <Cta label="Buket yap" onPress={() => leaveViewing('studio')} />;
  } else if (ui.view === 'garden') {
    const p = online() && app.ME.partner;
    meta = app.gMode === 'ours' ? (p ? `${p.name} ile birbirinize gönderdikleriniz burada büyür.` : 'Sevgilini ekle, ortak bahçeniz açılsın.') : 'Gönderdiğin ve sana gelen her buket bu bahçeye ekilir.';
    btn = <Cta label={app.gMode === 'ours' && p ? `${toName(p.name)} buket yap` : 'Yeni buket yap'} onPress={buildFor} />;
  } else {
    const c = cost(), n = app.S.items.length;
    if (!n) { meta = 'Masa boş. İlk çiçeği seç.'; btn = <Cta label="Buketi sar" disabled />; }
    else if (!app.S.wrapped) {
      meta = <>{''}<Text style={{ fontFamily: F.bold, color: t.ink }}>{mains().length}</Text> dal çiçek hazır.{c.total ? <> Premium: <Text style={{ fontFamily: F.bold, color: t.ink }}>{c.total}</Text> altın</> : null}</>;
      btn = <Cta label="Buketi sar" onPress={() => { app.S.wrapped = true; ui.tab = 'wrap'; haptic('medium'); refresh(); }} />;
    } else {
      meta = c.total ? <>Premium çiçekler <Text style={{ fontFamily: F.bold, color: t.ink }}>{c.total}</Text> altın</> : 'Bu buket ücretsiz';
      btn = <Cta label="Gönder" cost={c.total || null} onPress={Sh.openSend} />;
    }
  }
  return (
    <View style={[st.foot, { borderTopColor: t.line, paddingBottom: 10 + bottom }]}>
      <Text style={{ flex: 1, minWidth: 0, fontFamily: F.body, fontSize: 13, lineHeight: 17, color: t.ink2 }} numberOfLines={3}>{meta}</Text>
      {btn}
    </View>
  );
};

/* ---------- the panel: while the list scrolls, the 3D scene slows down so scrolling stays smooth */
let busyTimer;
const busy = () => { clearTimeout(busyTimer); E.cur && E.cur.setUiBusy(true); };
const idle = () => { clearTimeout(busyTimer); E.cur && E.cur.setUiBusy(false); };
const idleSoon = () => { clearTimeout(busyTimer); busyTimer = setTimeout(idle, 400); };

/* ---------- the panel */
export const Panel = ({ height, bottom, kb = 0 }) => {
  const t = useTheme(), { width } = useWindowDimensions();
  const cols = Math.max(3, Math.floor((width - 32 + 8) / (98 + 8))), cardW = (width - 32 - (cols - 1) * 8) / cols;
  const key = app.viewing ? 'recv' : ui.view === 'garden' ? 'garden-' + app.gMode : ui.tab;
  let pane;
  if (app.viewing) pane = <RecvPane t={t} />;
  else if (ui.view === 'garden') pane = <GardenPane t={t} />;
  else if (ui.tab === 'flowers' || ui.tab === 'greens') pane = <FlowersPane isF={ui.tab === 'flowers'} t={t} cardW={cardW} />;
  else if (ui.tab === 'wrap') pane = <WrapPane t={t} />;
  else if (ui.tab === 'decor') pane = <DecorPane t={t} />;
  else pane = <NotePane t={t} />;
  return (
    <View style={[st.panel, { height, bottom: kb, backgroundColor: t.surface, borderColor: t.line }]}>
      <Tabs />
      <ScrollView key={key} style={{ flex: 1 }} contentContainerStyle={st.pane} keyboardShouldPersistTaps="handled" overScrollMode="never"
        onScrollBeginDrag={busy} onScrollEndDrag={idleSoon} onMomentumScrollBegin={busy} onMomentumScrollEnd={idle}
        showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag">
        {pane}
      </ScrollView>
      {kb ? null : <Foot t={t} bottom={bottom} />}
    </View>
  );
};

const st = StyleSheet.create({
  panel: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, borderTopWidth: 1, zIndex: 6, elevation: 10, shadowColor: '#14281E', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: -8 } },
  tabs: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 6 },
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabT: { fontFamily: F.semi, fontSize: 14 },
  tabN: { fontFamily: F.body, fontSize: 12, opacity: 0.75, fontVariant: ['tabular-nums'] },
  pane: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 16, gap: 16 },
  fgrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fcard: { borderWidth: 1.5, borderRadius: R.md, paddingTop: 6, paddingBottom: 8, paddingHorizontal: 6, alignItems: 'center', gap: 2 },
  fnm: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 16 },
  fpr: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 15 },
  fprT: { fontFamily: F.body, fontSize: 12, fontVariant: ['tabular-nums'] },
  cnt: { position: 'absolute', top: 6, right: 6, minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cntT: { fontFamily: F.bold, fontSize: 13, fontVariant: ['tabular-nums'] },
  minusPos: { position: 'absolute', top: 5, left: 5 },
  minus: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  wrapcard: { borderRadius: R.md, padding: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dico: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  unlock: { borderWidth: 1.5, borderRadius: 999, height: 34, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  invite: { borderRadius: R.md, padding: 16, borderWidth: 1.5, gap: 10 },
  gsum: { flexDirection: 'row', gap: 8 },
  gsumC: { flex: 1, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 12 },
  wk: { flex: 1, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: R.md },
  thumb: { width: 58, height: 58, borderRadius: 14, overflow: 'hidden' },
  foot: { borderTopWidth: StyleSheet.hairlineWidth * 2, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10 },
});
