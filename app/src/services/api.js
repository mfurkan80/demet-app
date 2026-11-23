// Sunucu: oturum (misafir ya da kayıtlı), hesap bilgisi ve buket geçmişi. Anahtar cihazın güvenli deposunda durur.
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { app, emit, save, samples, compact } from '../state/store';
import { ALL } from '../state/catalog';

const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};
export const BASE = extra.api || 'https://demet.furkansahin.me';
export const apiUrl = p => BASE + p;
export const CFG = extra;

let TOKEN = null;
const KEY = 'demet-token';
export const loadToken = async () => { try { TOKEN = await SecureStore.getItemAsync(KEY); } catch (e) { TOKEN = null; } return TOKEN; };
export const setToken = async t => {
  TOKEN = t;
  try { if (t) await SecureStore.setItemAsync(KEY, t); else await SecureStore.deleteItemAsync(KEY); } catch (e) {}
};
export const hasToken = () => !!TOKEN;

const timeout = (ms, p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export const api = async (path, opts = {}) => {
  const headers = { accept: 'application/json' };
  if (opts.body) headers['content-type'] = 'application/json';
  if (TOKEN) headers.authorization = 'Bearer ' + TOKEN;
  let r;
  try {
    r = await timeout(opts.timeout || 20000, fetch(apiUrl('/api' + path), {
      method: opts.method || (opts.body ? 'POST' : 'GET'), headers, body: opts.body ? JSON.stringify(opts.body) : undefined,
    }));
  } catch (e) { throw new Error('Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && TOKEN && !opts.retried && path !== '/login' && !(opts.method === 'DELETE' && path === '/me')) {
    await setToken(null); await ensureSession();
    return api(path, { ...opts, retried: true });
  }
  if (!r.ok) { const e = new Error(j.error || 'Bir hata oluştu. Tekrar dene.'); e.status = r.status; throw e; }
  return j;
};

export const applyMe = j => {
  if (!j) return;
  if (j.user) { app.ME = j.user; app.W.gold = j.user.gold; app.W.unlocked = j.user.unlocked || {}; app.W.daily = j.user.daily || { last: '', streak: 0 }; }
  if (j.packs) app.PACKS_SRV = j.packs;
  if (typeof j.iap === 'boolean') app.IAP_ON = j.iap;
  if (j.payments) app.PAYMENTS = j.payments;
  if (typeof j.nativePush === 'boolean') app.NATIVE_PUSH = j.nativePush;
  save(); emit();
};

export const health = async () => {
  try {
    const r = await timeout(8000, fetch(apiUrl('/api/health')));
    const j = r.ok ? await r.json() : null;
    app.serverOK = !!(j && j.ok); app.SUPPORT = (j && j.support) || null;
  } catch (e) { app.serverOK = false; }
  return app.serverOK;
};

export const ensureSession = async () => {
  if (!TOKEN) { const j = await api('/session', { body: { name: 'Misafir' } }); await setToken(j.token); }
  applyMe(await api('/me'));
};

export const imageUrl = id => apiUrl(`/api/bouquets/${id}/image.jpg`);

export const loadHistory = async () => {
  if (!app.serverOK || !app.ME) return;
  try {
    const { bouquets } = await api('/bouquets');
    const mine = app.W.mine || {};
    const list = bouquets.map(b => ({
      id: b.id, remoteId: b.id, dir: b.dir, who: b.who, reason: b.reason || 'Buket', note: b.note || '', at: b.at,
      items: compact((b.items || []).filter(i => ALL[i.type])), snap: b.hasImage ? imageUrl(b.id) : null, link: b.link,
      openedAt: b.openedAt, toPartner: b.toPartner, withId: b.withId, mine: mine[b.id] || '',
      deliverAt: b.deliverAt, delivered: b.delivered, reaction: b.reaction,
    }));
    app.W.history = list.length ? list.reverse() : samples();
    save(); emit();
    return true;
  } catch (e) { return false; }
};
