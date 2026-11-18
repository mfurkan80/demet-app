// Uygulamanın ortak durumu: taslak buket (S), yerel dünya (W: geçmiş, altın...), sunucudaki hesap (ME).
// 3D motor ve ekranlar aynı nesneyi okur; değişince emit() ile ekranlar yeniden çizilir.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { ALL, FLOWERS, isMain } from './catalog';
import { ago, lower } from './text';

export const draft0 = prev => ({
  items: [], nextId: 1,
  pick: Object.fromEntries(Object.entries(ALL).map(([k, v]) => [k, (prev && prev.pick && prev.pick[k]) || v.colors[0][1]])),
  active: 'rose', fillActive: 'gypsophila', wrapped: false,
  paperStyle: prev ? prev.paperStyle : 'matte', paper: prev ? prev.paper : '#B98A5C', tissue: prev ? prev.tissue : '#F3D3D8',
  ribbonStyle: prev ? prev.ribbonStyle : 'satin', ribbon: prev ? prev.ribbon : '#F2ECE0',
  d: { hearts: false, heartColor: '#C8102E', butterflies: 0, choco: 0, pearls: false, sparkle: false, lights: false, teddy: false, ring: false },
  showCard: true, note: '', sign: prev ? prev.sign : '', reason: 'Sadece seni düşündüm', to: prev ? prev.to : 'Deniz',
});

export const samples = () => [
  { id: 's1', dir: 'in', who: 'Deniz', reason: 'Yıldönümü', note: 'Bir yıl oldu. İyi ki tanışmışız.', at: ago(12), items: [['rose', '#B3122E', 9], ['gypsophila', '#FBFAF7', 3]], sample: true, mine: '' },
  { id: 's2', dir: 'out', who: 'Deniz', reason: 'Günaydın', note: 'Günün güzel geçsin, akşam görüşürüz.', at: ago(7), items: [['sunflower', '#F6B91C', 3], ['daisy', '#F8F6F1', 2], ['eucalyptus', '#7FA593', 2]], sample: true, mine: '' },
  { id: 's3', dir: 'in', who: 'Deniz', reason: 'Özür dilerim', note: 'Dün akşam için kusura bakma. Konuşalım mı?', at: ago(4), items: [['tulip', '#F07CA0', 5], ['eucalyptus', '#7FA593', 2]], sample: true, mine: '' },
  { id: 's4', dir: 'out', who: 'Deniz', reason: 'Sadece seni düşündüm', note: '', at: ago(2), items: [['peony', '#F3A6B5', 3], ['lavender', '#8E72C7', 2]], sample: true, mine: '' },
  { id: 's5', dir: 'in', who: 'Deniz', reason: 'Tebrikler', note: 'Sınavın harika geçti, gurur duyuyorum!', at: ago(1), items: [['ranunculus', '#F7956F', 4], ['anemone', '#F8F8F8', 2], ['fern', '#4F8A3F', 2]], sample: true, mine: '' },
];

// the one shared state object
export const app = {
  S: draft0(null),
  W: { v: 2, gold: 120, unlocked: {}, daily: { last: '', streak: 0 }, history: samples(), mine: {} },
  ME: null, serverOK: false, SUPPORT: null, PAYMENTS: 'off', PACKS_SRV: null, IAP_ON: false,
  viewing: null, myDraft: null, welcomed: false, gMode: 'mine',
};

export const online = () => app.serverOK && !!app.ME;
export const isGuest = () => online() && !app.ME.hasPassword;
export const owns = k => !!app.W.unlocked[k];
export const mains = () => app.S.items.filter(i => isMain(i.type));
export const fills = () => app.S.items.filter(i => !isMain(i.type));
export const count = t => app.S.items.filter(i => i.type === t).length;
export const priceOf = t => (ALL[t] && ALL[t].price) || 0;
export const cost = () => {
  const lines = {};
  for (const i of app.S.items) { const p = priceOf(i.type); if (p) { lines[i.type] = lines[i.type] || { n: 0, p }; lines[i.type].n++; } }
  return { lines, total: Object.values(lines).reduce((s, l) => s + l.n * l.p, 0) };
};
export const compact = (list = app.S.items) => {
  const m = new Map();
  for (const i of list) { const k = i.type + i.color; if (!m.has(k)) m.set(k, [i.type, i.color, 0]); m.get(k)[2]++; }
  return [...m.values()];
};
export const summary = items => items.map(([t, , n]) => `${n} ${lower(ALL[t].name)}`).join(', ');
export const flowerArea = t => FLOWERS[t].area;
// Bahçem: every bouquet I sent or received. Bahçemiz: only those between me and my partner.
export const gardenEntries = (mode = app.gMode) => {
  const all = app.W.history.filter(e => !(e.deliverAt && !e.delivered));
  if (mode !== 'ours') return all;
  const p = online() && app.ME.partner;
  return p ? all.filter(e => e.withId === p.id) : [];
};

/* ---------- change notifications for the screens */
let version = 0;
const subs = new Set();
export const emit = () => { version++; for (const fn of subs) fn(); };
const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
export const useApp = () => useSyncExternalStore(subscribe, () => version);

/* ---------- persistence */
const KEY = 'demet-v2';
let saveTimer;
export const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    // the history keeps image links only; big inline previews are dropped to keep storage small
    const W = { ...app.W, history: app.W.history.map(h => (h.snap && h.snap.startsWith('data:') ? { ...h, snap: null, preview: null } : { ...h, preview: undefined })) };
    try { await AsyncStorage.setItem(KEY, JSON.stringify({ S: app.viewing ? app.myDraft : app.S, W })); } catch (e) {}
  }, 200);
};
export const load = async () => {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
    if (saved && saved.W && saved.S) {
      app.W = { ...app.W, ...saved.W };
      app.S = { ...app.S, ...saved.S, d: { ...app.S.d, ...saved.S.d } };
    }
    app.welcomed = (await AsyncStorage.getItem('demet-welcomed')) === '1';
  } catch (e) {}
};
export const setWelcomed = async v => { app.welcomed = v; try { if (v) await AsyncStorage.setItem('demet-welcomed', '1'); else await AsyncStorage.removeItem('demet-welcomed'); } catch (e) {} };
export const wipeLocal = async () => { try { await AsyncStorage.multiRemove([KEY, 'demet-welcomed', 'demet-q']); } catch (e) {} };
