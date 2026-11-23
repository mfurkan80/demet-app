// Alttan açılan pencereler: gönder, paylaş, buket ayrıntısı, kilit, altın, davet, hesap, giriş, bildir, hikâye.
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme, F, R } from '../ui/theme';
import { Txt, Tap, Cta, Btn2, LinkBtn, Chip, Chips, Field, Tip, Err, Group, Acts, Av, Tag, Lines, Check } from '../ui/kit';
import { Coin, IHeart, ILink, IPlus, IWhats, IShare, ICal, IBell, IClose } from '../ui/icons';
import { openSheet, toast } from '../ui/sheet';
import { app, save, online, isGuest, compact, summary, cost, useApp } from '../state/store';
import { ALL, REASONS, DAY, DAY_REASON, REACT_LABEL } from '../state/catalog';
import { lower, toName, fromName, genitive, fmt, fmtDT, fmtDay, fmtLong, fmtShort } from '../state/text';
import { api, applyMe, imageUrl, loadHistory, BASE } from '../services/api';
import { haptic, copy, shareLink, shareFile, openUrl, openWhatsApp, openSettings, push, registerPush, iap, platform } from '../services/native';
import { E, ui, refresh, drawCard, afterSend, upcomingDays, dayLabel, nextOcc, afterLogin, afterRegister, logout, accountDeleted, hideWelcome, setView } from '../ctl';
import { snapshot, storyImage } from '../capture';

const H = ({ children, style }) => <Txt v="h3" style={[{ paddingRight: 40 }, style]} accessibilityRole="header">{children}</Txt>;
const Sub = ({ children, style }) => <Txt v="sub" color={useTheme().ink2} style={style}>{children}</Txt>;
const later = fn => setTimeout(fn, 280);

/* ======================================================================= small confirmations */
const ClearSheet = ({ close }) => (
  <>
    <H>Buketi boşalt</H>
    <Sub>{app.S.items.length} dalın hepsi masadan kalkacak.</Sub>
    <Acts><Btn2 label="Vazgeç" onPress={close} /><Cta label="Boşalt" onPress={() => { app.S.items = []; app.S.wrapped = false; haptic('medium'); refresh(); close(); toast('Buket boşaltıldı'); }} /></Acts>
  </>
);
export const openClear = () => openSheet(ClearSheet);

/* ======================================================================= unlock */
const UnlockSheet = ({ k, name, desc, price, icon, after, close }) => {
  const t = useTheme(); useApp();
  const [busy, setBusy] = useState(false);
  const enough = app.W.gold >= price;
  const go = async () => {
    if (!online()) { toast('Bağlantı yok. İnternete bağlanıp tekrar dene.'); return; }
    setBusy(true);
    try { applyMe(await api('/unlock', { body: { key: k } })); }
    catch (e) { setBusy(false); toast(e.message); return; }
    after && after(); haptic('success'); refresh(); close(); toast(`${name} artık senin`);
  };
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={[st.unlIco, { backgroundColor: t.surface2 }]}>{icon}</View>
        <View style={{ flex: 1 }}><H>{name}</H><Sub style={{ marginTop: 4 }}>{desc}</Sub></View>
      </View>
      <Lines rows={[['Fiyat', `${price} altın`], ['Bakiyen', `${fmt(app.W.gold)} altın`]]} total={enough ? ['Kalan', `${fmt(app.W.gold - price)} altın`] : null} warn={enough ? null : `${price - app.W.gold} altın eksik`} />
      <Acts>{enough ? <Cta label="Kilidi aç" busy={busy} onPress={go} /> : <Cta label="Altın al" icon={<Coin size={18} />} onPress={() => { close(); later(openShop); }} />}</Acts>
    </>
  );
};
export const openUnlock = ({ key, ...o }) => openSheet(UnlockSheet, { k: key, ...o });

/* ======================================================================= gold: daily gift + store packs */
const serverDay = off => new Date(Date.now() + off + 3 * 3600000).toISOString().slice(0, 10);
const ShopSheet = ({ close }) => {
  const t = useTheme(); useApp();
  const [packs, setPacks] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(null), [claiming, setClaiming] = useState(false);
  const today = serverDay(0), yest = serverDay(-DAY), dl = app.W.daily || { last: '', streak: 0 };
  const claimed = dl.last === today, streakNow = claimed ? dl.streak : (dl.last === yest ? dl.streak : 0);
  const filled = streakNow % 7 === 0 && claimed ? 7 : streakNow % 7, nextReward = ((streakNow % 7) + 1) === 7 ? 50 : 10;
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = (app.PACKS_SRV || []).filter(p => p.iap);
      let prods = [];
      if (online() && app.IAP_ON && await iap.configure(app.ME.id)) { try { prods = await iap.products(list.map(p => p.iap)); } catch (e) { prods = []; } }
      if (alive) setPacks(list.map(p => ({ p, prod: prods.find(x => x.id === p.iap) })).filter(x => x.prod));
    })();
    return () => { alive = false; };
  }, []);
  const claim = async () => {
    if (!online()) { toast('Bağlantı yok. İnternete bağlanıp tekrar dene.'); return; }
    setClaiming(true);
    try { const r = await api('/daily', { body: {} }); applyMe(r); haptic('success'); close(); toast(`+${r.reward} altın eklendi`); }
    catch (e) { setClaiming(false); toast(e.message); }
  };
  const buy = async x => {
    setErr(''); setBusy(x.p.iap);
    try {
      const r = await iap.buy(x.prod);
      if (r && r.cancelled) return;
      let added = 0;
      for (let i = 0; i < 5 && !added; i++) {
        const s = await api('/iap/sync', { body: {} }); applyMe(s); added = s.added || 0;
        if (!added) await new Promise(res => setTimeout(res, 1500));
      }
      haptic('success'); close();
      toast(added ? `+${fmt(added)} altın hesabına yüklendi` : 'Ödeme alındı. Altının birkaç dakika içinde hesabına yüklenecek.');
    } catch (e) { setErr(e.message || 'Satın alma tamamlanamadı.'); }
    finally { setBusy(null); }
  };
  return (
    <>
      <H>Altın</H>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Coin size={34} /><Text style={{ fontFamily: F.display, fontSize: 36, color: t.ink, fontVariant: ['tabular-nums'] }}>{fmt(app.W.gold)}</Text><Txt v="small">bakiyen</Txt>
      </View>
      <View style={[st.daily, { backgroundColor: t.goldSoft, borderColor: t.goldLine }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}><Txt v="bold">Günlük hediye</Txt><Txt v="small">{claimed ? 'Bugünkü hediyeni aldın. Yarın tekrar gel.' : `Bugün ${nextReward} altın seni bekliyor.`}</Txt></View>
          {claimed ? null : <Cta small label="Al" busy={claiming} onPress={claim} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 5 }} accessibilityLabel="7 günlük seri">
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={[st.dday, { flex: i === 6 ? 1.4 : 1, backgroundColor: i < filled ? t.gold : 'transparent', borderColor: i < filled ? t.gold : t.goldLine }]}>
              <Text style={{ fontFamily: F.bold, fontSize: 11.5, color: i < filled ? t.surface : t.gold }}>{i === 6 ? '+50' : '+10'}</Text>
            </View>
          ))}
        </View>
      </View>
      {packs === null ? <Txt v="small">Paketler yükleniyor…</Txt>
        : !packs.length ? <Tip>Altın satışı yakında açılacak. Bu sürede günlük hediyeni almayı unutma.</Tip>
        : <>
          <View style={st.packs}>
            {packs.map(x => (
              <Tap key={x.p.iap} onPress={() => buy(x)} disabled={!!busy} scaleTo={0.96} style={[st.pack, { borderColor: x.p.best ? t.gold : t.line, backgroundColor: x.p.best ? t.goldSoft : t.surface, opacity: busy && busy !== x.p.iap ? 0.5 : 1 }]}>
                {x.p.best ? <View style={[st.flag, { backgroundColor: t.gold }]}><Text style={{ fontFamily: F.bold, fontSize: 11, color: t.surface }}>En çok alınan</Text></View> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Coin size={20} /><Text style={{ fontFamily: F.display, fontSize: 22, color: t.ink }}>{fmt(x.p.gold + x.p.bonus)}</Text></View>
                <Txt v="small" style={{ minHeight: 18 }}>{x.p.bonus ? `${fmt(x.p.gold)} + ${x.p.bonus} hediye` : ' '}</Txt>
                <Txt v="bold">{busy === x.p.iap ? 'Bekleniyor…' : x.prod.priceString}</Txt>
              </Tap>
            ))}
          </View>
          <Txt v="small">Ödeme {platform === 'ios' ? 'Apple hesabın' : 'Google Play hesabın'} üzerinden alınır. Altın, satın alma onaylanınca hesabına yüklenir.</Txt>
        </>}
      <Err>{err}</Err>
      <View style={{ gap: 4 }}>
        {['Premium çiçekler dal başına altınla gönderilir', 'Kadife, altın kenarlı kağıtlar ve özel süslerin kilidi bir kez açılır', 'Temel çiçekler ve mat kağıt her zaman ücretsiz'].map(s => (
          <View key={s} style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: t.gold, fontFamily: F.bold }}>•</Text><Txt v="small" style={{ flex: 1 }}>{s}</Txt></View>
        ))}
      </View>
    </>
  );
};
export const openShop = () => openSheet(ShopSheet);

/* ======================================================================= date & time picking */
const pickDateTime = ({ value, min, mode = 'datetime' }) => new Promise(res => {
  if (Platform.OS !== 'android') { res(null); return; }
  DateTimePickerAndroid.open({
    value, mode: 'date', minimumDate: min,
    onChange: (ev, d) => {
      if (ev.type !== 'set' || !d) { res(null); return; }
      if (mode === 'date') { res(d); return; }
      DateTimePickerAndroid.open({ value: d, mode: 'time', is24Hour: true, onChange: (ev2, d2) => res(ev2.type === 'set' && d2 ? d2 : null) });
    },
  });
});

/* ======================================================================= send */
const whenOptions = () => {
  const now = Date.now(), mid = new Date(); mid.setHours(24, 0, 0, 0);
  const o = [{ id: 'now', label: 'Şimdi', at: null }, { id: 'midnight', label: 'Gece 00:00', at: mid.getTime() }];
  for (const u of upcomingDays(31)) {
    const at = u.date.getTime();
    if (at > now + 60000 && at !== mid.getTime()) o.push({ id: 'day:' + u.x.id, label: `${dayLabel(u.x)} 00:00`, at, reason: DAY_REASON[u.x.type] });
    else if (at === mid.getTime()) { o[1].label = `${dayLabel(u.x)} 00:00`; o[1].reason = DAY_REASON[u.x.type]; o[1].id = 'day:' + u.x.id; }
  }
  o.push({ id: 'custom', label: 'Tarih seç', at: null });
  return o;
};
const SendSheet = ({ snap, close }) => {
  const t = useTheme(); useApp();
  const S = app.S, c = cost(), enough = app.W.gold >= c.total;
  const people = online() ? [...(app.ME.partner ? [{ id: app.ME.partner.id, name: app.ME.partner.name, partner: true }] : []), ...(app.ME.friends || []).map(f => ({ id: f.id, name: f.name }))] : [];
  const [rcpt, setRcpt] = useState(() => people.find(x => x.id === app.W.lastTo) || (app.W.lastTo === '' ? null : people.find(x => x.partner) || null));
  const [to, setTo] = useState(rcpt ? '' : S.to || ''), [from, setFrom] = useState(S.sign || (online() && app.ME.name !== 'Misafir' ? app.ME.name : ''));
  const opts = useRef(whenOptions()).current;
  const [when, setWhen] = useState(S.planDay && opts.some(o => o.id === 'day:' + S.planDay) ? 'day:' + S.planDay : 'now');
  const [custom, setCustom] = useState(null), [iosPick, setIosPick] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const o = opts.find(x => x.id === when) || opts[0];
  const sendAt = when === 'custom' ? custom : o.at;
  const hint = !online() ? '' : rcpt ? (rcpt.partner ? 'Ortak bahçenize eklenir, ona bildirim gider.' : 'Doğrudan ona gider, bildirim alır. Senin bahçende de durur.') : 'Bir link oluşur. WhatsApp’tan istediğin kişiye atarsın; açan kişi hiçbir şey indirmeden buketi görür.';
  const label = busy ? (rcpt ? 'Gönderiliyor…' : 'Link oluşturuluyor…') : sendAt ? 'Planla' : rcpt ? `${toName(rcpt.name)} gönder` : 'Link oluştur';
  const pickWhen = async id => {
    const x = opts.find(y => y.id === id);
    if (x.reason) { S.reason = x.reason; drawCard(); }
    if (id === 'custom') {
      const min = new Date(Date.now() + 5 * 60000);
      if (Platform.OS === 'android') {
        const d = await pickDateTime({ value: custom ? new Date(custom) : new Date(Date.now() + 3600000), min });
        if (!d) return;
        if (d.getTime() < Date.now() + 60000) { toast('En az birkaç dakika sonrasını seç'); return; }
        setCustom(d.getTime());
      } else { setIosPick(true); if (!custom) setCustom(Date.now() + 3600000); }
    } else setIosPick(false);
    setWhen(id); refresh({ sync: false });
  };
  const go = async () => {
    if (!online()) { setErr('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.'); return; }
    S.to = rcpt ? rcpt.name : (to.trim() || 'Sevgilim'); S.sign = from.trim();
    app.W.lastTo = rcpt ? rcpt.id : '';
    setBusy(true); setErr('');
    try {
      if (sendAt && sendAt < Date.now() + 60000) throw new Error('Gönderim zamanı geçmiş. Yeniden seç.');
      if (S.sign && (app.ME.name === 'Misafir' || !app.ME.name)) applyMe(await api('/me', { method: 'PATCH', body: { name: S.sign } }));
      const bouquet = { items: S.items.map(i => ({ type: i.type, color: i.color })), paperStyle: S.paperStyle, paper: S.paper, tissue: S.tissue,
        ribbonStyle: S.ribbonStyle, ribbon: S.ribbon, d: S.d, showCard: S.showCard, note: S.note.trim(), sign: S.sign, reason: S.reason, to: S.to };
      const out = await api('/bouquets', { body: { bouquet, ...(snap ? { snap } : {}), ...(rcpt ? { toUserId: rcpt.id } : {}), ...(sendAt ? { sendAt } : {}) }, timeout: 30000 });
      applyMe(out);
      const entry = { id: out.id, remoteId: out.id, dir: 'out', who: S.to, withId: rcpt ? rcpt.id : null, reason: S.reason, note: S.note.trim(), at: Date.now(), items: compact(),
        link: out.url, toPartner: out.toPartner, openedAt: null, preview: snap, snap: imageUrl(out.id), deliverAt: out.deliverAt, delivered: !out.deliverAt, mine: '' };
      app.W.history = app.W.history.filter(h => !h.sample);
      app.W.history.push(entry); if (app.W.history.length > 100) app.W.history.shift();
      S.planDay = null; save();
      close();
      afterSend(entry, ShareSheet);
    } catch (e) { setErr(e.message || 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.'); setBusy(false); }
  };
  const P = ({ x, icon, name, role, on, onPress }) => (
    <Tap onPress={onPress} hapticKind="select" scaleTo={0.95} accessibilityRole="radio" accessibilityState={{ checked: on }}
      style={[st.person, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : t.surface }]}>
      {icon}
      <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: t.ink, maxWidth: 76 }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: t.ink2 }}>{role}</Text>
    </Tap>
  );
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        {snap ? <Image source={{ uri: snap }} style={[st.snap96, { backgroundColor: t.blush }]} /> : null}
        <View style={{ flex: 1 }}><H>Buketi gönder</H><Txt v="small" style={{ marginTop: 4 }}>{summary(compact())}</Txt></View>
      </View>
      {online() ? (
        <Group title="Kime?">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {people.map(x => <P key={x.id} on={!!rcpt && rcpt.id === x.id} name={x.name} role={x.partner ? 'Sevgilin' : 'Arkadaşın'} onPress={() => setRcpt(x)}
              icon={<Av name={x.name} heart={x.partner} size={40}>{x.partner ? <IHeart size={20} color={t.accentInk} /> : null}</Av>} />)}
            <P on={!rcpt} name="Link ile" role="Herkese" onPress={() => setRcpt(null)} icon={<Av size={40}><ILink size={20} color={t.ink2} /></Av>} />
            <P on={false} name="Kişi ekle" role="Davet et" onPress={() => { close(); later(() => openInvite('friend')); }} icon={<Av size={40}><IPlus size={20} color={t.ink2} /></Av>} />
          </View>
          <Txt v="small">{hint}</Txt>
        </Group>
      ) : <Tip>İnternet bağlantısı yok. Buketi göndermek için bağlanman gerekiyor.</Tip>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {!rcpt ? <Field style={{ flex: 1 }} label="Kartta kime yazsın" value={to} onChangeText={setTo} maxLength={24} placeholder="Örneğin Deniz…" autoCapitalize="words" /> : null}
        <Field style={{ flex: 1 }} label="Senin adın" value={from} onChangeText={setFrom} maxLength={24} placeholder="Örneğin Furkan…" autoCapitalize="words" autoComplete="given-name" />
      </View>
      <Group title="Ne için?">
        <Chips>{REASONS.map(r => <Chip key={r} label={r} on={r === S.reason} onPress={() => { S.reason = r; drawCard(); refresh({ sync: false }); }} />)}</Chips>
      </Group>
      {online() ? (
        <Group title="Ne zaman?">
          <Chips>{opts.map(x => <Chip key={x.id} label={x.id === 'custom' && custom ? fmtShort(custom) + ' ' + new Date(custom).toTimeString().slice(0, 5) : x.label} on={when === x.id}
            icon={x.id === 'custom' ? <ICal size={15} color={when === x.id ? t.surface : t.ink2} /> : null} onPress={() => pickWhen(x.id)} />)}</Chips>
          {iosPick && when === 'custom' ? <DateTimePicker value={new Date(custom || Date.now() + 3600000)} mode="datetime" display="inline" minimumDate={new Date(Date.now() + 5 * 60000)} onChange={(e, d) => d && setCustom(d.getTime())} /> : null}
          {sendAt ? <Txt v="small" color={t.accent}>{fmtDT(sendAt)} gidecek</Txt> : null}
        </Group>
      ) : null}
      <Lines rows={Object.entries(c.lines).map(([ty, l]) => [`${l.n} ${lower(ALL[ty].name)} × ${l.p}`, `${l.n * l.p} altın`])}
        total={['Toplam', c.total ? c.total + ' altın' : 'Ücretsiz']} warn={enough ? null : `${c.total - app.W.gold} altın eksik`} />
      <Err>{err}</Err>
      <Acts>{enough ? <Cta label={err ? 'Tekrar dene' : label} busy={busy} disabled={!online()} onPress={go} /> : <Cta label="Altın al" icon={<Coin size={18} />} onPress={() => { close(); later(openShop); }} />}</Acts>
    </>
  );
};
export const openSend = () => {
  const snap = E.cur ? snapshot(E.cur) : null;
  if (online() && !app.S.sign && app.ME.name !== 'Misafir') app.S.sign = app.ME.name;
  openSheet(SendSheet, { snap });
};

/* ======================================================================= link block + share */
const LinkBlock = ({ entry }) => {
  const t = useTheme();
  const msg = `${entry.who}, sana bir buket gönderdim: ${entry.link}`;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput value={entry.link} editable={false} selectTextOnFocus style={[st.linkIn, { borderColor: t.line, backgroundColor: t.surface2, color: t.ink2 }]} accessibilityLabel="Buket linki" />
        <Btn2 label="Kopyala" onPress={async () => { await copy(entry.link); haptic('success'); toast('Link kopyalandı'); }} />
      </View>
      <Acts>
        <Cta tone="wa" label="WhatsApp’ta gönder" icon={<IWhats size={18} color="#fff" />} onPress={() => openWhatsApp(msg)} />
        <Btn2 label="Diğer" icon={<IShare size={17} color={t.ink} />} onPress={() => shareLink(entry.link, `${entry.who}, sana bir buket gönderdim`)} />
      </Acts>
    </View>
  );
};
const PushAsk = ({ text = 'Buketini açınca sana haber verelim mi?' }) => {
  const [ps, setPs] = useState(null);
  useEffect(() => { if (online()) push.state().then(setPs); }, []);
  if (ps !== 'off') return null;
  return <Tip right={<Btn2 small label="Aç" icon={<IBell size={15} color={useTheme().ink} />} onPress={async () => { if (await registerPush(true)) { setPs('on'); toast('Bildirimler açıldı'); } else setPs(await push.state()); }} />}>{text}</Tip>;
};
const ShareSheet = ({ entry }) => {
  const t = useTheme();
  const planned = entry.deliverAt && !entry.delivered;
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Image source={{ uri: entry.preview || entry.snap }} style={[st.snap96, { backgroundColor: t.blush }]} />
        <View style={{ flex: 1, gap: 4 }}>
          {planned ? <><H>Buket planlandı</H><Txt v="small">{fmtDT(entry.deliverAt)} {toName(entry.who)} gidecek. O zamana kadar link açılsa bile zarf kapalı kalır.</Txt></>
            : entry.toPartner ? <><H>Buket {toName(entry.who)} gitti</H><Txt v="small">Ortak bahçenize ekildi. Bildirimleri açıksa hemen haber alacak.</Txt></>
            : entry.withId ? <><H>Buket {toName(entry.who)} gitti</H><Txt v="small">Onun bahçesine ve seninkine ekildi. Bildirimleri açıksa hemen haber alacak.</Txt></>
            : <><H>Buketin hazır</H><Txt v="small">Linki {toName(entry.who)} gönder. Açınca buket gözünün önünde sarılacak.</Txt></>}
        </View>
      </View>
      <PushAsk />
      {entry.withId ? null : <LinkBlock entry={entry} />}
      {online() && !app.ME.partner && !(app.ME.friends || []).length ? <Txt v="small">Sevgilini ya da arkadaşlarını Hesabım’dan eklersen sonraki buketler doğrudan onlara gider.</Txt> : null}
    </>
  );
};
export const openShare = entry => openSheet(ShareSheet, { entry });

/* ======================================================================= entry detail */
const EntrySheet = ({ id, close }) => {
  const t = useTheme(); useApp();
  const e = app.W.history.find(x => x.id === id);
  const [mine, setMine] = useState(e ? e.mine || '' : ''), [busy, setBusy] = useState(false);
  if (!e) return <Sub>Bu buket artık yok.</Sub>;
  const planned = e.deliverAt && !e.delivered;
  const cancel = async () => {
    setBusy(true);
    try { const r = await api('/bouquets/' + e.remoteId, { method: 'DELETE' }); applyMe(r); close(); toast(r.refunded ? `Buket iptal edildi, ${r.refunded} altın iade edildi` : 'Buket iptal edildi'); await loadHistory(); E.cur && E.cur.rebuildGarden(); }
    catch (err) { setBusy(false); toast(err.message); }
  };
  return (
    <>
      {e.snap || e.preview ? <Image source={{ uri: e.preview || e.snap }} style={[st.snapBig, { backgroundColor: t.blush }]} contentFit="cover" transition={200} /> : null}
      <View style={{ gap: 6 }}>
        <H>{e.dir === 'in' ? fromName(e.who) + ' gelen buket' : toName(e.who) + ' gönderdiğin buket'}</H>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><Tag label={e.reason} tone="reason" /><Txt v="small">{fmtLong(e.at)}</Txt>{e.sample ? <Tag label="Örnek" tone="sample" /> : null}</View>
      </View>
      {e.note ? <Text style={{ fontFamily: F.hand, fontSize: 28, lineHeight: 32, color: t.ink }} selectable>{e.note}</Text> : null}
      <Txt v="small">{summary(e.items)}</Txt>
      {e.reaction ? (
        <View style={[st.react, { backgroundColor: t.accentSoft }]}>
          <Txt><Txt v="bold" color={t.accent}>{e.dir === 'out' ? e.who : 'Cevabın'}:</Txt> {REACT_LABEL[e.reaction.kind] || ''}{e.reaction.text ? `${e.reaction.kind === 'note' ? '' : ' · '}“${e.reaction.text}”` : ''}</Txt>
        </View>
      ) : null}
      {planned ? <><Tip>{fmtDT(e.deliverAt)} gidecek.</Tip><Btn2 label="İptal et, altını geri al" busy={busy} onPress={cancel} /></> : null}
      {e.dir === 'out' && e.link && !e.withId ? <LinkBlock entry={e} /> : null}
      {e.remoteId && !planned ? <Btn2 label="Buketi 3D aç" onPress={() => { close(); later(() => require('../ctl').startViewing(e.remoteId)); }} /> : null}
      <Field label="Kendi notun" multiline maxLength={140} value={mine} placeholder="Bu buket sana neyi hatırlatıyor…"
        onChangeText={v => { setMine(v); e.mine = v; app.W.mine = app.W.mine || {}; app.W.mine[e.id] = v; save(); }} />
      <Txt v="small">Bu not sadece sende görünür.</Txt>
      {online() && e.remoteId && e.dir === 'in' ? <LinkBtn label="Uygunsuz içerik bildir" size={12.5} onPress={() => { close(); later(() => openReport(e.remoteId)); }} /> : null}
    </>
  );
};
export const openEntry = id => openSheet(EntrySheet, { id });

/* ======================================================================= report */
const REP = ['Hakaret ya da taciz', 'Uygunsuz içerik', 'İstenmeyen buket', 'Diğer'];
const ReportSheet = ({ id, close }) => {
  const [reason, setReason] = useState(REP[0]), [block, setBlock] = useState(true), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { applyMe(await api(`/bouquets/${id}/report`, { body: { reason, block } })); close(); toast('Bildirimin alındı, teşekkürler'); loadHistory(); }
    catch (e) { setBusy(false); toast(e.message); }
  };
  return (
    <>
      <H>Buketi bildir</H>
      <Sub>Bildirimin incelenir; kurallara aykırıysa buket kaldırılır. Gönderen kim olduğunu görmez.</Sub>
      <Chips>{REP.map(r => <Chip key={r} label={r} on={r === reason} onPress={() => setReason(r)} />)}</Chips>
      <Check on={block} onPress={() => setBlock(!block)} title="Göndereni engelle" sub="Arkadaşlığınız ve varsa ortak bahçeniz kalkar, sana bir daha doğrudan buket gönderemez." />
      <Acts><Btn2 label="Vazgeç" onPress={close} /><Cta label="Bildir" busy={busy} onPress={go} /></Acts>
    </>
  );
};
export const openReport = id => openSheet(ReportSheet, { id });

/* ======================================================================= invites */
const InviteBlock = ({ inv }) => {
  const t = useTheme();
  const msg = inv.kind === 'friend' ? `Demet’te arkadaşım ol, birbirimize çiçek gönderelim: ${inv.url}` : `Demet’te ortak bahçemizi kuralım, birbirimize çiçek gönderelim: ${inv.url}`;
  return (
    <View style={{ gap: 12 }}>
      <View style={[st.code, { backgroundColor: t.surface2, borderColor: t.line }]}><Text selectable style={{ fontFamily: F.display, fontSize: 32, letterSpacing: 6, color: t.ink }}>{inv.code}</Text></View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput value={inv.url} editable={false} style={[st.linkIn, { borderColor: t.line, backgroundColor: t.surface2, color: t.ink2 }]} />
        <Btn2 label="Kopyala" onPress={async () => { await copy(inv.url); haptic('success'); toast('Link kopyalandı'); }} />
      </View>
      <Acts>
        <Cta tone="wa" label="WhatsApp’ta gönder" icon={<IWhats size={18} color="#fff" />} onPress={() => openWhatsApp(msg)} />
        <Btn2 label="Diğer" icon={<IShare size={17} color={t.ink} />} onPress={() => shareLink(inv.url, msg.split(':')[0])} />
      </Acts>
      <Txt v="small">{inv.kind === 'friend' ? 'Linki birden fazla arkadaşına gönderebilirsin. Açan ya da kodu giren herkes arkadaşın olur. 7 gün geçerli.' : 'Sevgilin linki açınca ya da bu kodu girince ortak bahçeniz açılır. Kod 7 gün geçerli.'}</Txt>
    </View>
  );
};
const useInvite = kind => {
  const [inv, setInv] = useState(null), [err, setErr] = useState('');
  const make = async () => { setErr(''); try { setInv(await api('/invite', { body: { kind } })); } catch (e) { setErr(e.message); } };
  return { inv, err, make };
};
const InviteSheet = ({ kind }) => {
  const { inv, err, make } = useInvite(kind);
  useEffect(() => { make(); }, []);
  return (
    <>
      <H>{kind === 'friend' ? 'Arkadaşını davet et' : 'Sevgilini davet et'}</H>
      <Sub>{kind === 'friend' ? 'Linki açan arkadaşın olur; birbirinize doğrudan buket gönderirsiniz.' : 'Linki açıp kabul edince ortak bahçeniz açılır.'}</Sub>
      {inv ? <InviteBlock inv={inv} /> : err ? <><Err>{err}</Err><Btn2 label="Tekrar dene" onPress={make} /></> : <Txt v="small">Davet hazırlanıyor…</Txt>}
    </>
  );
};
export const openInvite = kind => { if (!online()) { toast('Bağlantı yok. İnternete bağlanıp tekrar dene.'); return; } openSheet(InviteSheet, { kind }); };

/* ======================================================================= pairing from a link */
const PairSheet = ({ code, close }) => {
  const t = useTheme(); useApp();
  const [info, setInfo] = useState(null), [err, setErr] = useState(''), [name, setName] = useState(app.ME && app.ME.name !== 'Misafir' ? app.ME.name : ''), [busy, setBusy] = useState(false);
  useEffect(() => { api(`/invite/${code}`).then(setInfo).catch(e => setErr(e.message)); }, []);
  if (err && !info) return <><H>Davet geçersiz</H><Sub>{err} Davet eden kişiden yeni bir link iste.</Sub></>;
  if (!info) return <Txt v="small">Davet açılıyor…</Txt>;
  const friend = info.kind === 'friend', fn = info.fromName;
  if (info.already) return <><H>{friend ? `${fn} zaten arkadaşın` : `${fn} ile ortak bahçeniz zaten açık`}</H><Sub>Ona doğrudan buket gönderebilirsin.</Sub></>;
  if (!friend && app.ME.partner) return <><H>Zaten bir sevgilin ekli</H><Sub>{app.ME.partner.name} ile ortak bahçen var. {fn} ile ortak bahçe kurmak için önce Hesabım’dan sevgilini kaldır.</Sub></>;
  if (!friend && info.taken) return <><H>Bu davet artık geçerli değil</H><Sub>{fn} başka biriyle ortak bahçe kurmuş.</Sub></>;
  const go = async () => {
    const nm = name.trim(); if (!nm) { setErr(`${fn} seni tanısın diye adını yaz.`); return; }
    setBusy(true); setErr('');
    try {
      if (nm !== app.ME.name) applyMe(await api('/me', { method: 'PATCH', body: { name: nm } }));
      applyMe(await api(`/invite/${code}/accept`, { body: {} }));
      haptic('success'); close(); toast(friend ? `${fn} ile artık arkadaşsınız` : `${fn} ile ortak bahçeniz açıldı`);
      await loadHistory();
      if (ui.welcome) hideWelcome();
      if (!friend) { app.W.gMode = 'ours'; save(); }
      if (isGuest()) { later(() => openAuth('register')); return; }
      if ((await push.state()) === 'off') later(() => openSheet(PushSheet, { name: fn }));
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Av name={fn} heart={!friend} size={72} />
        <View style={{ flex: 1 }}><H>{fn} seni {friend ? 'arkadaş' : 'sevgilisi'} olarak ekledi</H>
          <Sub style={{ marginTop: 4 }}>{friend ? 'Birbirinize doğrudan buket gönderebilirsiniz. Gelen buketler kendi bahçende durur.' : 'Kabul edince ortak bahçeniz açılır. Birbirinize gönderdiğiniz buketler Bahçemiz’de büyür.'}</Sub></View>
      </View>
      <Field label="Adın" value={name} onChangeText={setName} maxLength={24} placeholder="Örneğin Elif…" autoCapitalize="words" />
      <Err>{err}</Err>
      <Acts><Btn2 label="Şimdi değil" onPress={close} /><Cta label={friend ? 'Arkadaş ol' : 'Kabul et'} busy={busy} onPress={go} /></Acts>
    </>
  );
};
const PushSheet = ({ name, close }) => (
  <>
    <H>Buket gelince haber verelim mi?</H>
    <Sub>{name ? `${name} sana buket gönderince bildirim gelsin.` : 'Sana buket gelince ya da gönderdiğin buket açılınca bildirim gelsin.'}</Sub>
    <Acts><Btn2 label="Şimdi değil" onPress={close} /><Cta label="Bildirimleri aç" onPress={async () => { if (await registerPush(true)) { close(); toast('Bildirimler açıldı'); } else { close(); toast('Bildirim izni verilmedi. Ayarlardan açabilirsin.'); } }} /></Acts>
  </>
);
export const openPair = code => {
  if (!online()) { toast('Daveti açmak için internete bağlan.'); return; }
  openSheet(PairSheet, { code });
};

/* ======================================================================= special days */
const DaysBox = () => {
  const t = useTheme(); useApp();
  const [type, setType] = useState('partner_birthday'), [label, setLabel] = useState(''), [date, setDate] = useState(null), [busy, setBusy] = useState(false), [ios, setIos] = useState(false);
  const list = ((app.ME && app.ME.days) || []).map(x => ({ x, ...nextOcc(x) })).sort((a, b) => a.days - b.days);
  const p = app.ME && app.ME.partner;
  const pick = async () => {
    if (Platform.OS === 'android') { const d = await pickDateTime({ value: date || new Date(), mode: 'date' }); if (d) setDate(d); }
    else setIos(true);
  };
  const add = async () => {
    if (!date) { pick(); return; }
    if (type === 'custom' && !label.trim()) { toast('Bu güne bir ad ver'); return; }
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setBusy(true);
    try { applyMe(await api('/days', { body: { type, date: iso, label: label.trim() } })); setDate(null); setLabel(''); toast('Özel gün eklendi'); haptic('success'); }
    catch (e) { toast(e.message); }
    setBusy(false);
  };
  const del = async id => { try { applyMe(await api('/days/' + id, { method: 'DELETE' })); } catch (e) { toast(e.message); } };
  return (
    <View style={{ gap: 10 }}>
      {list.length ? list.map(({ x, date: d, days }) => (
        <View key={x.id} style={[st.dayRow, { borderColor: t.line }]}>
          <View style={{ flex: 1 }}><Txt v="bold">{dayLabel(x)}</Txt><Txt v="small">{fmtDay(d)}</Txt></View>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: days <= 3 ? t.accent : t.ink2 }}>{days === 0 ? 'Bugün' : days === 1 ? 'Yarın' : `${days} gün`}</Text>
          <Tap onPress={() => del(x.id)} hitSlop={8} accessibilityLabel={`${dayLabel(x)} sil`} style={[st.rm, { borderColor: t.line }]}><IClose size={14} color={t.ink2} /></Tap>
        </View>
      )) : <Txt v="small">Doğum gününü ve yıldönümünüzü ekle. Üç gün önce, bir gün önce ve günü gelince haber verelim.</Txt>}
      <Chips>
        {[['partner_birthday', `${p ? genitive(p.name) : 'Sevgilimin'} doğum günü`], ['anniversary', 'Yıldönümümüz'], ['custom', 'Başka bir gün']].map(([id, l]) => <Chip key={id} label={l} on={type === id} onPress={() => setType(id)} />)}
      </Chips>
      {type === 'custom' ? <Field value={label} onChangeText={setLabel} maxLength={40} placeholder="Günün adı, örneğin İlk buluşma…" /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn2 label={date ? fmtLong(date) : 'Tarih seç'} icon={<ICal size={16} color={t.ink} />} onPress={pick} />
        <Cta small label="Ekle" busy={busy} disabled={!date} onPress={add} />
      </View>
      {ios ? <DateTimePicker value={date || new Date()} mode="date" display="inline" onChange={(e, d) => d && setDate(d)} /> : null}
    </View>
  );
};

/* ======================================================================= account */
const Section = ({ title, children, right }) => {
  const t = useTheme();
  return (
    <View style={[st.acc, { borderTopColor: t.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Txt v="bold" style={{ fontSize: 16 }}>{title}</Txt>{right}</View>
      {children}
    </View>
  );
};
const PushRow = () => {
  const [ps, setPs] = useState(null);
  useEffect(() => { push.state().then(setPs); }, []);
  if (ps === null) return <Txt v="small">…</Txt>;
  if (ps === 'on') return <><Txt v="small">Bu cihazda bildirimler açık. Sana buket gelince ya da gönderdiğin buket açılınca haber veririz.</Txt>
    <Btn2 small label="Deneme bildirimi gönder" onPress={async () => { await registerPush(false); try { await api('/push/test', { body: {} }); toast('Deneme bildirimi gönderildi'); } catch (e) { toast(e.message); } }} /></>;
  if (ps === 'off') return <><Txt v="small">Sana buket gelince ya da gönderdiğin buket açılınca haber verelim.</Txt>
    <Cta small label="Bildirimleri aç" icon={<IBell size={16} color={useTheme().accentInk} />} onPress={async () => { if (await registerPush(true)) { setPs('on'); toast('Bildirimler açıldı'); } else setPs(await push.state()); }} /></>;
  if (ps === 'denied') return <><Txt v="small">Bildirim izni kapalı. Telefonun ayarlarından Demet için bildirimlere izin ver.</Txt><Btn2 small label="Ayarları aç" onPress={openSettings} /></>;
  return <Txt v="small">Bildirimler bu sürümde henüz açık değil.</Txt>;
};
const AccountSheet = ({ close }) => {
  const t = useTheme(); useApp();
  const ME = app.ME, p = ME.partner;
  const [name, setName] = useState(ME.name === 'Misafir' ? '' : ME.name), [code, setCode] = useState(''), [sure, setSure] = useState(null);
  const partnerInv = useInvite('partner'), friendInv = useInvite('friend');
  const saveName = async () => { const v = name.trim(); if (!v) { toast('Adını yaz'); return; } try { applyMe(await api('/me', { method: 'PATCH', body: { name: v } })); haptic('success'); toast('Adın kaydedildi'); } catch (e) { toast(e.message); } };
  const useCode = async () => {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) { toast('Kod 6 karakter olmalı'); return; }
    try { const r = await api(`/invite/${c}/accept`, { body: {} }); applyMe(r); close(); haptic('success'); toast(r.kind === 'friend' ? 'Arkadaş eklendi' : `${app.ME.partner.name} ile ortak bahçeniz açıldı`); loadHistory(); }
    catch (e) { toast(e.message); }
  };
  const unfriend = async f => {
    if (sure !== f.id) { setSure(f.id); setTimeout(() => setSure(s => (s === f.id ? null : s)), 3000); return; }
    try { applyMe(await api('/friends/' + f.id, { method: 'DELETE' })); toast(`${f.name} arkadaşlarından çıkarıldı`); } catch (e) { toast(e.message); }
  };
  return (
    <>
      <H>Hesabım</H>
      <Field label="Adın" value={name} onChangeText={setName} maxLength={24} placeholder="Örneğin Furkan…" autoCapitalize="words" right={<Btn2 label="Kaydet" onPress={saveName} />} />
      <Section title="Sevgilin">
        {p ? <>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Av name={p.name} heart size={44} />
            <View style={{ flex: 1 }}><Txt v="bold">{p.name}</Txt><Txt v="small">Ortak bahçeniz {p.since ? fmtLong(p.since) : ''} tarihinde açıldı. Birbirinize gönderdikleriniz Bahçemiz’de büyüyor.</Txt></View>
          </View>
          <LinkBtn label="Sevgilini kaldır" onPress={() => { close(); later(() => openSheet(UnpairSheet)); }} />
        </> : <>
          <Txt v="small">Sevgilini ya da eşini ekle. Birbirinize gönderdiğiniz buketler ortak bahçenizde, Bahçemiz’de büyüsün.</Txt>
          {partnerInv.inv ? <InviteBlock inv={partnerInv.inv} /> : <><Err>{partnerInv.err}</Err><Cta small label="Sevgilini davet et" icon={<IHeart size={16} color={t.accentInk} />} onPress={partnerInv.make} /></>}
        </>}
      </Section>
      <Section title="Arkadaşların" right={(ME.friends || []).length ? <Txt v="small">{ME.friends.length}</Txt> : null}>
        {(ME.friends || []).length ? ME.friends.map(f => (
          <View key={f.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Av name={f.name} size={36} />
            <View style={{ flex: 1 }}><Txt v="bold">{f.name}</Txt><Txt v="small">{f.since ? fmtShort(f.since) + ' tarihinden beri' : 'Arkadaşın'}</Txt></View>
            <Btn2 small label={sure === f.id ? 'Çıkar' : '×'} color={sure === f.id ? t.accent : t.ink2} onPress={() => unfriend(f)} />
          </View>
        )) : <Txt v="small">Annene, kardeşine, en yakın arkadaşına doğrudan buket gönder. Onlardan gelenler senin bahçende durur.</Txt>}
        {friendInv.inv ? <InviteBlock inv={friendInv.inv} /> : <><Err>{friendInv.err}</Err><Btn2 small label="Arkadaş davet et" icon={<IPlus size={16} color={t.ink} />} onPress={friendInv.make} /></>}
        <Field label="Davet kodun var mı?" value={code} onChangeText={v => setCode(v.toUpperCase())} maxLength={6} autoCapitalize="characters" autoCorrect={false}
          placeholder="Örneğin K7Q2MX…" inputStyle={{ letterSpacing: 2 }} right={<Btn2 label="Ekle" onPress={useCode} />} />
      </Section>
      {(ME.blocked || []).length ? (
        <Section title="Engellediklerin">
          {ME.blocked.map(x => (
            <View key={x.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Av name={x.name} size={36} />
              <View style={{ flex: 1 }}><Txt v="bold">{x.name}</Txt><Txt v="small">Sana doğrudan buket gönderemez</Txt></View>
              <Btn2 small label="Kaldır" onPress={async () => { try { applyMe(await api('/block/' + x.id, { method: 'DELETE' })); toast('Engel kaldırıldı'); } catch (e) { toast(e.message); } }} />
            </View>
          ))}
        </Section>
      ) : null}
      <Section title="Özel günler"><DaysBox /></Section>
      <Section title="Bildirimler"><PushRow /></Section>
      <Section title="Hesabını koru">
        {ME.hasPassword ? <><Txt v="small">{ME.email} ile kayıtlısın. Başka bir cihazda bu e-postayla giriş yapabilirsin.</Txt><LinkBtn label="Çıkış yap" onPress={logout} /></>
          : <><Txt v="small">Şu an misafirsin. Hesap oluştur, telefonun değişse bile buketlerin, bahçen ve altının kaybolmasın.</Txt>
            <Acts><Cta small label="Hesap oluştur" onPress={() => { close(); later(() => openAuth('register')); }} /><Btn2 small label="Giriş yap" onPress={() => { close(); later(() => openAuth('login')); }} /></Acts></>}
      </Section>
      <Section title="Hakkında">
        <Acts style={{ gap: 4, columnGap: 18 }}>
          <LinkBtn label="Gizlilik politikası" onPress={() => openUrl(`${BASE}/gizlilik`)} />
          <LinkBtn label="Kullanım koşulları" onPress={() => openUrl(`${BASE}/kosullar`)} />
          {app.SUPPORT ? <LinkBtn label="Bize yaz" onPress={() => require('react-native').Linking.openURL(`mailto:${app.SUPPORT}?subject=Demet`)} /> : null}
        </Acts>
        <Txt v="small">Demet {require('expo-constants').default.expoConfig?.version || ''}</Txt>
        <LinkBtn label="Hesabımı sil" color={t.danger} onPress={() => { close(); later(() => openSheet(DeleteSheet)); }} />
      </Section>
    </>
  );
};
const UnpairSheet = ({ close }) => {
  const p = app.ME.partner, [busy, setBusy] = useState(false);
  if (!p) return <Sub>Ekli bir sevgilin yok.</Sub>;
  return (
    <>
      <H>Sevgilini kaldır</H>
      <Sub>{p.name} ile ortak bahçeniz ikiniz için de kapanır. Buketler silinmez; herkesin gönderdiği ve aldığı buketler kendi bahçesinde kalır.</Sub>
      <Acts><Btn2 label="Vazgeç" onPress={close} /><Cta label="Kaldır" busy={busy} onPress={async () => {
        setBusy(true);
        try { applyMe(await api('/unpair', { body: {} })); close(); toast('Ortak bahçe kapandı'); if (ui.view === 'garden') setView('garden', 'mine'); }
        catch (e) { setBusy(false); toast(e.message); }
      }} /></Acts>
    </>
  );
};
const DeleteSheet = ({ close }) => {
  const t = useTheme(), reg = app.ME && app.ME.hasPassword;
  const [pw, setPw] = useState(''), [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => {
    if (reg && !pw) { setErr('Şifreni yaz.'); return; }
    setBusy(true); setErr('');
    try { await api('/me', { method: 'DELETE', body: { password: reg ? pw : '' } }); await accountDeleted(); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <>
      <H>Hesabını sil</H>
      <Sub>Bu işlem geri alınamaz. Hesabın, bahçen, altın bakiyen, arkadaşlıkların ve ortak bahçen silinir. Başkalarına gönderdiğin buketler onların bahçesinde kalır ama hesabınla bağı kopar.</Sub>
      {reg ? <Field label="Onaylamak için şifren" value={pw} onChangeText={setPw} secureTextEntry={!show} autoComplete="current-password" right={<Btn2 small label={show ? 'Gizle' : 'Göster'} onPress={() => setShow(!show)} />} /> : null}
      <Err>{err}</Err>
      <Acts><Btn2 label="Vazgeç" onPress={close} /><Cta tone="danger" label="Kalıcı olarak sil" busy={busy} onPress={go} /></Acts>
    </>
  );
};
export const openAccount = () => {
  if (!online()) { toast('Hesap için internet bağlantısı gerekiyor.'); return; }
  if (isGuest()) openAuth('register'); else openSheet(AccountSheet);
};
export const openAccountSettings = () => { if (online()) openSheet(AccountSheet); };

/* ======================================================================= sign up / sign in */
export const AUTH_COPY = {
  register: ['Hesabını oluştur', 'Buketlerin, bahçen ve altının hesabında güvende kalır. Telefonun değişse bile.'],
  login: ['Tekrar hoş geldin', 'E-postan ve şifrenle gir. Bu cihazda yaptıkların da hesabına taşınır.'],
};
export const AuthForm = ({ mode, onDone }) => {
  const t = useTheme();
  const reg = mode === 'register';
  const [name, setName] = useState(app.ME && app.ME.name !== 'Misafir' ? app.ME.name : ''), [email, setEmail] = useState(''), [pw, setPw] = useState('');
  const [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const emailRef = useRef(null), pwRef = useRef(null);
  const submit = async () => {
    setErr('');
    const em = email.trim();
    if (reg && !name.trim()) return setErr('Adını yaz, sevdiklerin seni tanısın.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return setErr('Geçerli bir e-posta adresi yaz.');
    if (reg && pw.length < 8) return setErr('Şifre en az 8 karakter olmalı.');
    if (!pw) return setErr('Şifreni yaz.');
    if (!online()) return setErr('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
    setBusy(true);
    try {
      if (reg) { applyMe(await api('/register', { body: { email: em, password: pw, name: name.trim() } })); await afterRegister(); }
      else { const j = await api('/login', { body: { email: em, password: pw } }); await afterLogin(j); }
      haptic('success'); onDone && onDone();
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <View style={{ gap: 14 }}>
      {reg ? <Field label="Adın" value={name} onChangeText={setName} maxLength={24} autoComplete="given-name" autoCapitalize="words" placeholder="Sevdiklerin seni bu adla görecek…" returnKeyType="next" onSubmitEditing={() => emailRef.current && emailRef.current.focus()} /> : null}
      <Field ref={emailRef} label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} placeholder="ornek@mail.com…" returnKeyType="next" onSubmitEditing={() => pwRef.current && pwRef.current.focus()} />
      <Field ref={pwRef} label="Şifre" value={pw} onChangeText={setPw} secureTextEntry={!show} autoComplete={reg ? 'new-password' : 'current-password'} placeholder={reg ? 'En az 8 karakter…' : 'Şifren…'} returnKeyType="go" onSubmitEditing={submit}
        right={<Btn2 small label={show ? 'Gizle' : 'Göster'} onPress={() => setShow(!show)} />} />
      <Err>{err}</Err>
      <Cta wide label={reg ? 'Hesabımı oluştur' : 'Giriş yap'} busy={busy} onPress={submit} />
    </View>
  );
};
const AuthSheet = ({ mode: m0, close }) => {
  const t = useTheme();
  const [m, setM] = useState(m0);
  return (
    <>
      <H>{AUTH_COPY[m][0]}</H>
      <Sub>{AUTH_COPY[m][1]}</Sub>
      <View style={[st.seg, { backgroundColor: t.surface2 }]}>
        {[['register', 'Kayıt ol'], ['login', 'Giriş yap']].map(([id, l]) => (
          <Tap key={id} onPress={() => setM(id)} hapticKind="select" style={[st.segB, m === id && { backgroundColor: t.surface, elevation: 2 }]} accessibilityRole="tab" accessibilityState={{ selected: m === id }}>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: m === id ? t.ink : t.ink2 }}>{l}</Text>
          </Tap>
        ))}
      </View>
      <AuthForm key={m} mode={m} onDone={close} />
      {isGuest() ? <LinkBtn label="Hesap ayarları: sevgilin, arkadaşların, özel günler, bildirimler" onPress={() => { close(); later(openAccountSettings); }} /> : null}
    </>
  );
};
export const openAuth = (mode = 'register') => openSheet(AuthSheet, { mode });

/* ======================================================================= story picture */
const StorySheet = () => {
  const t = useTheme(), dark = useColorScheme() === 'dark';
  const [uri, setUri] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    const v = app.viewing, d = v && v.data;
    setTimeout(async () => {
      try { setUri(await storyImage(E.cur, { note: (d && (d.note || d.reason)) || app.S.note || app.S.reason, sign: d && d.sign, dark })); }
      catch (e) { setErr('Görsel hazırlanamadı. Tekrar dene.'); }
    }, 60);
  }, []);
  return (
    <>
      <H>Hikâye görselin</H>
      <View style={[st.story, { backgroundColor: t.blush }]}>
        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : <Txt v="small" style={{ textAlign: 'center' }}>{err || 'Hazırlanıyor…'}</Txt>}
      </View>
      <Txt v="small">Paylaş’a dokun: Instagram’ı seçip hikâyende paylaşabilir ya da galerine kaydedebilirsin.</Txt>
      <Cta wide label="Paylaş" icon={<IShare size={18} color={t.accentInk} />} disabled={!uri} onPress={async () => { try { await shareFile(uri); } catch (e) { toast(e.message || 'Paylaşılamadı, tekrar dene.'); } }} />
    </>
  );
};
export const openStory = () => { if (E.cur) openSheet(StorySheet); };

const st = StyleSheet.create({
  unlIco: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  daily: { borderRadius: R.md, borderWidth: 1.5, padding: 14, gap: 12 },
  dday: { height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  packs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pack: { width: '47.5%', flexGrow: 1, borderWidth: 1.5, borderRadius: R.md, padding: 14, gap: 4 },
  flag: { position: 'absolute', top: -10, right: 10, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  person: { width: 92, borderWidth: 1.5, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  snap96: { width: 96, height: 96, borderRadius: 18 },
  snapBig: { width: '100%', aspectRatio: 1, borderRadius: R.lg },
  linkIn: { flex: 1, borderWidth: 1.5, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 14 },
  react: { borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10 },
  code: { borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  rm: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  acc: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 14, gap: 10 },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segB: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  story: { width: '62%', aspectRatio: 9 / 16, alignSelf: 'center', borderRadius: R.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
