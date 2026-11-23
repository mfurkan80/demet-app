// Uygulamanın akışı: görünüm (atölye / bahçe), gelen buketi açma, gönderme sonrası, derin linkler, açılış.
import { Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { app, emit, save, draft0, samples, wipeLocal, setWelcomed, isGuest, online, gardenEntries, compact } from './state/store';
import { ALL, PAPER_STYLES, RIBBON_STYLES, DAY, DAY_REASON } from './state/catalog';
import { dayKey, genitive } from './state/text';
import { api, applyMe, apiUrl, ensureSession, health, loadHistory, loadToken, setToken, BASE } from './services/api';
import { haptic, registerPush, iap } from './services/native';
import { openSheet, closeSheet, toast } from './ui/sheet';
import { loadPack } from './engine/models';

// screen state lives next to the shared state so one emit() redraws everything
app.ui = { view: 'studio', tab: 'flowers', gFilter: 'all', welcome: false, gardenLoading: false, ready: false, gift: null, hint: true, lockLeft: '', booting: true };
export const ui = app.ui;

/* ---------- the 3D engine (created when the GL view is ready) */
export const E = { cur: null, waiters: [] };
export const setEngine = e => { E.cur = e; const w = E.waiters; E.waiters = []; w.forEach(f => f(e)); };
export const withEngine = () => (E.cur ? Promise.resolve(E.cur) : new Promise(r => E.waiters.push(r)));

export const refresh = ({ sync = true } = {}) => { if (sync && E.cur) E.cur.sync(); save(); emit(); };
export const drawCard = () => { if (E.cur) E.cur.drawCard(); };

/* ---------- garden models load on first use */
let gardenP = null;
export const ensureGarden = () => {
  if (!gardenP) {
    gardenP = (async () => {
      const TL = await loadPack(require('../assets/models/garden.json'), require('../assets/models/garden.bin'));
      const e = await withEngine(); e.setGardenPack(TL);
      return true;
    })().catch(err => { gardenP = null; throw err; });
  }
  return gardenP;
};

export const preferredMode = () => (online() && app.ME.partner && app.W.gMode !== 'mine' ? 'ours' : 'mine');
export const setView = async (v, mode) => {
  const g = v === 'garden';
  if (g) { const m = mode || app.gMode || preferredMode(); app.gMode = m; app.W.gMode = m; save(); }
  ui.view = v; ui.hint = true;
  const e = await withEngine();
  e.setView(v, g ? app.gMode : undefined);
  emit();
  if (g) {
    ui.gardenLoading = !e.gardenBuilt; emit();
    try { await ensureGarden(); } catch (err) { toast('Bahçe yüklenemedi. Tekrar dene.'); if (ui.view === 'garden') { ui.view = 'studio'; e.setView('studio'); } }
    ui.gardenLoading = false; emit();
  }
};
export const setGardenMode = m => { if (m === app.gMode) return; app.W.gMode = m; setView('garden', m); };
export const toggleView = () => {
  if (app.viewing) { leaveViewing('garden'); return; }
  if (ui.view === 'studio') setView('garden', preferredMode()); else setView('studio');
};
export const buildFor = () => {
  if (online() && app.ME.partner) { app.W.lastTo = app.ME.partner.id; save(); }
  setView('studio');
};

/* ---------- studio helpers */
export const resetDraft = () => {
  const prev = app.S; app.S = draft0(prev);
  app.S.d = { ...prev.d, butterflies: 0, choco: 0, teddy: false, ring: false };
  if (E.cur) E.cur.clearTable();
};

// after sending: the bouquet flies away, the table clears, the garden gets the new bouquet
export const afterSend = (entry, ShareSheet) => {
  haptic('success');
  const done = () => {
    resetDraft();
    if (E.cur) E.cur.rebuildGarden();
    ui.tab = 'flowers'; refresh();
    if (entry.link && ShareSheet) openSheet(ShareSheet, { entry });
    else toast(`${entry.who} için buket bahçenize eklendi`);
    maybeAskReview();
  };
  if (E.cur) E.cur.fly(done); else done();
};
// a happy moment (a bouquet just went out): ask for a store rating once, after the third bouquet
const maybeAskReview = async () => {
  const sent = app.W.history.filter(h => h.dir === 'out' && !h.sample).length;
  if (sent < 3 || app.W.askedReview) return;
  app.W.askedReview = Date.now(); save();
  try { if (await StoreReview.isAvailableAsync()) setTimeout(() => StoreReview.requestReview().catch(() => {}), 2600); } catch (e) {}
};

/* ---------- streak + special days */
export const streak = () => {
  const days = new Set(gardenEntries().filter(e => app.gMode === 'ours' || e.dir === 'out').map(e => dayKey(e.at)));
  let n = 0, d = Date.now();
  if (!days.has(dayKey(d))) d -= DAY;
  while (days.has(dayKey(d))) { n++; d -= DAY; }
  return n;
};
export const nextOcc = x => {
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const occ = y => { const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; return new Date(y, x.month - 1, x.month === 2 && x.day === 29 && !leap ? 28 : x.day); };
  let d = occ(today.getFullYear());
  if (d < today) d = occ(today.getFullYear() + 1);
  return { date: d, days: Math.round((d - today) / DAY) };
};
export const dayLabel = x => {
  const p = app.ME && app.ME.partner;
  if (x.type === 'partner_birthday') return `${p ? genitive(p.name) : 'Sevgilinin'} doğum günü`;
  if (x.type === 'anniversary') { const n = x.year ? nextOcc(x).date.getFullYear() - x.year : 0; return n > 0 ? `${n}. yıldönümünüz` : 'Yıldönümünüz'; }
  return x.label;
};
export const upcomingDays = max => ((app.ME && app.ME.days) || []).map(x => { const o = nextOcc(x); return { x, ...o, key: `${x.id}:${o.date.getFullYear()}` }; })
  .filter(u => u.days <= max).sort((a, b) => a.days - b.days);
// the banner over the studio: a new bouquet waiting, or a special day coming up
export const inbox = () => {
  if (app.viewing || ui.view === 'garden' || ui.welcome) return null;
  const fresh = app.W.history.filter(e => e.dir === 'in' && e.remoteId && !e.openedAt);
  if (fresh.length) {
    const e = fresh[fresh.length - 1];
    return { kind: 'gift', text: fresh.length > 1 ? `${fresh.length} yeni buketin var` : `${require('./state/text').fromName(e.who)} yeni bir buket var`, btn: 'Aç', go: () => startViewing(e.remoteId) };
  }
  const up = online() ? upcomingDays(7)[0] : null;
  if (!up || app.W.dismissedDay === up.key) return null;
  return {
    kind: 'day', text: `${dayLabel(up.x)} ${up.days === 0 ? 'bugün' : up.days === 1 ? 'yarın' : `${up.days} gün sonra`}`, btn: 'Hazırla',
    go: () => { app.S.reason = DAY_REASON[up.x.type] || app.S.reason; app.S.planDay = up.x.id; app.W.dismissedDay = up.key; drawCard(); refresh({ sync: false }); toast('Buketini hazırla, Gönder’de tarih hazır seçili olacak'); },
    dismiss: () => { app.W.dismissedDay = up.key; refresh({ sync: false }); },
  };
};

/* ---------- receiving a bouquet */
let lockTimer = null, openRun = 0;
export const startViewing = async id => {
  closeSheet();
  if (app.viewing && app.viewing.id === id) return;
  if (!app.viewing) app.myDraft = app.S;
  app.viewing = { id, data: null, opened: false };
  app.S = draft0(app.myDraft);
  app.S.d = { hearts: false, heartColor: '#C8102E', butterflies: 0, choco: 0, pearls: false, sparkle: false, lights: false, teddy: false, ring: false };
  app.S.showCard = false;
  const e = await withEngine();
  e.clearTable(); ui.gift = { state: 'loading' };
  if (ui.view !== 'studio') await setView('studio');
  refresh({ sync: true });
  try { app.viewing.data = await api(`/bouquets/${id}`); }
  catch (err) {
    if (!app.viewing || app.viewing.id !== id) return;
    app.viewing.error = true; ui.gift = null; emit(); return;
  }
  const v = app.viewing; if (!v || v.id !== id) return;
  const d = v.data;
  if (d.locked) {
    v.locked = true; ui.gift = { state: 'locked', sign: d.sign, deliverAt: d.deliverAt };
    clearInterval(lockTimer);
    const tickLock = () => {
      const left = d.deliverAt - Date.now();
      if (!app.viewing || app.viewing.id !== id) { clearInterval(lockTimer); return; }
      if (left <= 0) { clearInterval(lockTimer); const again = id; app.viewing = null; startViewing(again); return; }
      const dd = Math.floor(left / DAY), hh = Math.floor((left % DAY) / 3600000), mm = Math.floor((left % 3600000) / 60000), ss = Math.floor((left % 60000) / 1000);
      ui.lockLeft = dd ? `${dd} gün ${hh} sa sonra açılır` : hh ? `${hh} sa ${mm} dk sonra açılır` : `${mm} dk ${String(ss).padStart(2, '0')} sn sonra açılır`;
      emit();
    };
    tickLock(); lockTimer = setInterval(tickLock, 1000);
    return;
  }
  d.items = (d.items || []).filter(i => ALL[i.type]);
  Object.assign(app.S, {
    paperStyle: PAPER_STYLES[d.paperStyle] ? d.paperStyle : 'matte', paper: d.paper, tissue: d.tissue,
    ribbonStyle: RIBBON_STYLES[d.ribbonStyle] ? d.ribbonStyle : 'satin', ribbon: d.ribbon,
    note: d.note || '', sign: d.sign || '', reason: d.reason || 'Sadece seni düşündüm',
  });
  ui.gift = { state: 'sealed', sign: d.sign, mine: !!d.mine };
  refresh();
};
export const openGift = async () => {
  const v = app.viewing; if (!v || v.opened || !v.data) return;
  const run = ++openRun;
  haptic('medium');
  ui.gift = { ...ui.gift, state: 'opening' }; emit();
  setTimeout(() => { if (ui.gift && ui.gift.state === 'opening') { ui.gift = null; emit(); } }, 450);
  v.opened = true;
  const wait = ms => new Promise(r => setTimeout(r, app.reduceMotion ? 0 : ms));
  const alive = () => app.viewing === v && run === openRun;
  const d = v.data;
  await wait(300);
  for (const it of d.items) { if (!alive()) return; app.S.items.push({ id: app.S.nextId++, type: it.type, color: it.color }); E.cur && E.cur.sync(); emit(); await wait(170); }
  await wait(900); if (!alive()) return;
  app.S.wrapped = true; E.cur && E.cur.sync();
  await wait(1900); if (!alive()) return;
  app.S.d = { ...app.S.d, ...d.d }; app.S.showCard = d.showCard !== false; E.cur && E.cur.sync(); emit();
  await wait(1200); if (!alive()) return;
  haptic('success');
  if (online()) {
    try {
      const r = await api(`/bouquets/${d.id}/open`, { body: {} });
      if (r.own) toast('Bu senin gönderdiğin buket');
      else if (r.claimed) { v.canReact = true; v.reaction = d.reaction; emit(); await loadHistory(); toast('Buket bahçene eklendi'); }
    } catch (e) {}
  }
};
export const leaveViewing = async to => {
  if (!app.viewing) return;
  clearInterval(lockTimer); openRun++;
  app.viewing = null; ui.gift = null;
  app.S = app.myDraft || draft0(null); app.myDraft = null;
  if (E.cur) E.cur.clearTable();
  refresh();
  await setView(to === 'garden' ? 'garden' : 'studio', to === 'garden' ? preferredMode() : undefined);
};
export const sendReaction = async (kind, text = '') => {
  const v = app.viewing; if (!v) return false;
  if (kind === 'note' && !text.trim()) { toast('Önce notunu yaz'); return false; }
  try {
    const r = await api(`/bouquets/${v.data.id}/react`, { body: { kind, text: kind === 'note' ? text.trim() : '' } });
    v.reaction = r.reaction; haptic('success'); emit();
    const { toName } = require('./state/text');
    toast(`Cevabın ${v.data.sign ? toName(v.data.sign) : 'gönderene'} iletildi`);
    ui.burst = Date.now(); emit();
    return true;
  } catch (e) { toast(e.message); return false; }
};

/* ---------- account changes */
export const afterLogin = async (j, PairOrNull) => {
  await setToken(j.token);
  applyMe(await api('/me'));
  await loadHistory();
  registerPush(false); iap.configure(app.ME.id);
  await setWelcomed(true); ui.welcome = false; E.cur && E.cur.setWelcome(false);
  if (ui.view === 'garden') E.cur && E.cur.rebuildGarden();
  emit();
  toast(j.merged ? `Tekrar hoş geldin ${j.user.name}. Bu cihazdaki buketler hesabına taşındı.` : `Tekrar hoş geldin ${j.user.name}`);
};
export const afterRegister = async () => {
  await setWelcomed(true); ui.welcome = false; E.cur && E.cur.setWelcome(false); emit();
  toast(`Hoş geldin ${app.ME.name}, hesabın hazır`);
  setView(ui.view);
};
const freshStart = async () => {
  await setToken(null);
  app.W = { v: 2, gold: 0, unlocked: {}, daily: { last: '', streak: 0 }, history: samples(), mine: {} };
  app.ME = null; resetDraft(); app.gMode = 'mine';
  try { await ensureSession(); } catch (e) {}
  await setWelcomed(false);
  refresh();
  showWelcome();
};
export const logout = async () => {
  try { await api('/logout', { body: {} }); } catch (e) {}
  closeSheet(); await freshStart();
  toast('Çıkış yaptın');
};
export const accountDeleted = async () => {
  closeSheet(); await wipeLocal(); await freshStart();
  setTimeout(() => toast('Hesabın silindi. Seni özleyeceğiz.'), 400);
};

/* ---------- first visit */
export const showWelcome = async () => {
  ui.welcome = true; emit();
  const e = await withEngine(); e.setWelcome(true);
  setView('garden', 'mine');
};
export const hideWelcome = async () => {
  await setWelcomed(true);
  ui.welcome = false; emit();
  if (E.cur) E.cur.setWelcome(false);
  setView('studio');
};

/* ---------- links: https://demet.furkansahin.me/b/ID, /esles/CODE, /#bahce, demet://... */
let pairHandler = null;
export const setPairHandler = fn => { pairHandler = fn; };
export const handleUrl = url => {
  if (!url) return false;
  let path = url;
  try {
    const host = BASE.replace(/^https?:\/\//, '');
    path = url.replace(/^demet:\/\/\/?/, '/').replace(new RegExp('^https?://' + host.replace(/\./g, '\\.')), '');
  } catch (e) {}
  let m;
  if ((m = path.match(/^\/?b\/([A-Za-z0-9]+)/))) { if (ui.welcome) { ui.welcome = false; E.cur && E.cur.setWelcome(false); setWelcomed(true); } startViewing(m[1]); return true; }
  if ((m = path.match(/^\/?esles\/([A-Za-z0-9]{6})/))) { if (pairHandler) pairHandler(m[1].toUpperCase()); return true; }
  if (/#bahcemiz/.test(path)) { if (app.viewing) leaveViewing('garden'); else setView('garden', 'ours'); return true; }
  if (/#bahce/.test(path)) { if (app.viewing) leaveViewing('garden'); else setView('garden', 'mine'); return true; }
  return false;
};

/* ---------- boot: server session, history, push, launch link */
export const bootServer = async ({ initialUrl, onPair } = {}) => {
  await loadToken();
  const ok = await health();
  if (ok) { try { await ensureSession(); } catch (e) { app.serverOK = false; } }
  ui.booting = false; emit();
  if (online()) { registerPush(false); iap.configure(app.ME.id); }
  const handled = initialUrl && handleUrl(initialUrl);
  if (!handled) {
    if (online()) loadHistory();
    if (isGuest() && !app.welcomed) showWelcome();
  } else if (online()) loadHistory();
  return ok;
};
export const retryServer = async () => {
  const ok = await health();
  if (ok) { try { await ensureSession(); await loadHistory(); registerPush(false); } catch (e) { return false; } }
  emit();
  return ok;
};
export { compact, apiUrl, Linking };
