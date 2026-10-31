// Demet sunucusu: statik dosyalar, hesaplar, eşleşme, cüzdan, buket gönderme, bildirimler ve ödeme.
// Çalıştır: npm install && npm start
//
// Ortam değişkenleri (hepsi isteğe bağlı):
//   PORT              dinlenecek port (varsayılan 5173)
//   DATA_DIR          verinin tutulacağı klasör (varsayılan ./data)
//   PUBLIC_URL        linklerde kullanılacak adres, örn. https://demet.furkansahin.me
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   bildirim anahtarları (yoksa üretilir)
//   IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL   ödeme (yoksa deneme modu)
//   DEMO_PURCHASES    "off" yapılırsa iyzico yokken deneme satın alımı kapanır
//   ADMIN_PASSWORD    yönetim panelinin (/admin) şifresi; ayarlanmazsa panel kapalıdır
const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { Store } = require('./lib/store');
const { setupPush } = require('./lib/push');
const catalog = require('./lib/catalog');
const iyzico = require('./lib/iyzico');
const setupAdmin = require('./lib/admin');

const PORT = Number(process.env.PORT) || 5173;
const ROOT = path.join(__dirname, 'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const IMG_DIR = path.join(DATA_DIR, 'bouquets');
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const DEMO_PURCHASES = !iyzico.enabled && process.env.DEMO_PURCHASES !== 'off';
fs.mkdirSync(IMG_DIR, { recursive: true });

const store = new Store(DATA_DIR);
const push = setupPush(store, DATA_DIR, process.env.VAPID_SUBJECT || (PUBLIC_URL.startsWith('https://') ? PUBLIC_URL : 'mailto:destek@demet.local'));

// Önceki sürümden kalan tek dosyalık buketleri içeri al.
for (const f of fs.readdirSync(IMG_DIR)) {
  if (!f.endsWith('.json')) continue;
  const id = f.slice(0, -5);
  if (!store.bouquets[id]) {
    try { store.bouquets[id] = { fromUserId: null, toUserId: null, ...JSON.parse(fs.readFileSync(path.join(IMG_DIR, f), 'utf8')) }; } catch (e) {}
  }
  fs.renameSync(path.join(IMG_DIR, f), path.join(IMG_DIR, f + '.imported'));
  store.save();
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

/* ================================================================== helpers */
const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışan harfler yok (0/O, 1/I)
function randStr(n, chars = B62) { const b = crypto.randomBytes(n); let s = ''; for (const x of b) s += chars[x % chars.length]; return s; }
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const ID_RE = /^[A-Za-z0-9]{10}$/;
const dayKey = ts => new Date(ts + 3 * 3600 * 1000).toISOString().slice(0, 10); // Türkiye saati
// Türkçe ekler: Elif'in, Ayşe'nin, Furkan'ın
const VOW = 'aeıioöuü';
function genitive(name) {
  const w = String(name).trim(), low = w.toLocaleLowerCase('tr');
  const lastV = [...low].reverse().find(c => VOW.includes(c)) || 'e';
  const v = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' }[lastV];
  return `${w}’${VOW.includes(low.slice(-1)) ? 'n' : ''}${v}n`;
}
const TR = 3 * 3600 * 1000;
function trParts(ts) { const d = new Date(ts + TR); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours() }; }
function daysUntil(month, day, now = Date.now()) {
  const t = trParts(now);
  const today = Date.UTC(t.y, t.m - 1, t.d);
  const occ = y => { const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; const dd = month === 2 && day === 29 && !leap ? 28 : day; return Date.UTC(y, month - 1, dd); };
  let o = occ(t.y), year = t.y;
  if (o < today) { o = occ(t.y + 1); year = t.y + 1; }
  return { days: Math.round((o - today) / 86400000), year };
}
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function send(res, code, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const data = isBuf || typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, {
    'content-type': isBuf ? 'application/octet-stream' : typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data), 'x-content-type-options': 'nosniff', ...headers,
  });
  res.end(data);
}
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const fail = (code, msg) => { throw new HttpError(code, msg); };

function baseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'http';
  const host = (req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`).split(',')[0].trim();
  return `${proto}://${host}`;
}
const clientIp = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().replace(/^::ffff:/, '');
function readBody(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new HttpError(413, 'İstek çok büyük.')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function json(req, limit) {
  const raw = await readBody(req, limit);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { fail(400, 'Geçersiz veri.'); }
}

// basit hız sınırı
const buckets = new Map();
function limit(name, key, max, windowMs) {
  const k = name + ':' + key, now = Date.now();
  const list = (buckets.get(k) || []).filter(t => now - t < windowMs);
  list.push(now); buckets.set(k, list);
  if (list.length > max) fail(429, 'Çok fazla deneme yaptın. Birkaç dakika sonra tekrar dene.');
}
setInterval(() => { const now = Date.now(); for (const [k, l] of buckets) if (!l.some(t => now - t < 3600000)) buckets.delete(k); }, 600000).unref();

/* ================================================================== auth */
function newSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  store.sessions[sha(token)] = { userId, at: Date.now() };
  store.save();
  return token;
}
function authUser(req, required = true) {
  const m = (req.headers.authorization || '').match(/^Bearer ([A-Za-z0-9_-]{20,})$/);
  const s = m && store.sessions[sha(m[1])];
  const user = s && store.users[s.userId];
  if (!user && required) fail(401, 'Oturumun sona ermiş. Sayfayı yenile.');
  if (user && Date.now() - (user.seenAt || 0) > 5 * 60000) { user.seenAt = Date.now(); store.save(); }
  return user || null;
}
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const got = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(got, Buffer.from(hash, 'hex'));
}
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

function publicUser(u) {
  const p = u.partnerId && store.users[u.partnerId];
  return {
    id: u.id, name: u.name, email: u.email || null, hasPassword: !!u.passHash, createdAt: u.createdAt,
    gold: u.gold, unlocked: u.unlocked, daily: u.daily, days: u.days || [],
    partner: p ? { id: p.id, name: p.name, since: u.coupleSince } : null,
  };
}

/* ================================================================== bouquets */
const hex = v => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
const key = v => (typeof v === 'string' && /^[a-z_]{2,24}$/.test(v) ? v : null);
const int = (v, lo, hi) => (Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : lo);
function cleanBouquet(p) {
  if (!p || typeof p !== 'object') return null;
  const items = Array.isArray(p.items) ? p.items.slice(0, 40)
    .map(i => i && key(i.type) && hex(i.color) ? { type: i.type, color: i.color } : null).filter(Boolean) : [];
  if (!items.length) return null;
  const d = p.d && typeof p.d === 'object' ? p.d : {};
  return {
    items,
    paperStyle: key(p.paperStyle) || 'matte', paper: hex(p.paper) || '#B98A5C', tissue: hex(p.tissue) || '#F3D3D8',
    ribbonStyle: key(p.ribbonStyle) || 'satin', ribbon: hex(p.ribbon) || '#F2ECE0',
    d: {
      hearts: !!d.hearts, heartColor: hex(d.heartColor) || '#C8102E', butterflies: int(d.butterflies, 0, 3), choco: int(d.choco, 0, 5),
      pearls: !!d.pearls, sparkle: !!d.sparkle, lights: !!d.lights, teddy: !!d.teddy, ring: !!d.ring,
    },
    showCard: p.showCard !== false,
    note: str(p.note, 120), sign: str(p.sign, 24), reason: str(p.reason, 40), to: str(p.to, 24),
  };
}
const isDelivered = b => !b.deliverAt || b.delivered;
function publicBouquet(b, me) {
  const { fromUserId, toUserId, cost, reaction, ...rest } = b;
  const party = me && (me.id === fromUserId || me.id === toUserId);
  return { ...rest, reaction: party ? reaction || null : null, recipient: !!(me && me.id === toUserId) };
}
function listItem(b, me, base) {
  const out = b.fromUserId === me.id;
  const other = store.users[out ? b.toUserId : b.fromUserId];
  return {
    id: b.id, dir: out ? 'out' : 'in', who: out ? (b.to || (other && other.name) || 'Sevgilim') : (b.sign || (other && other.name) || 'Biri'),
    toPartner: !!(out && b.toUserId && me.partnerId === b.toUserId), reason: b.reason, note: b.note, at: b.createdAt,
    openedAt: b.openedAt || null, items: b.items, hasImage: !!b.hasImage, link: `${base}/b/${b.id}`,
    deliverAt: b.deliverAt || null, delivered: isDelivered(b), reaction: b.reaction || null,
  };
}

/* ================================================================== routes */
const routes = [];
const route = (method, re, fn) => routes.push({ method, re, fn });

route('GET', /^\/api\/health$/, () => ({ ok: true, payments: iyzico.enabled ? 'iyzico' : DEMO_PURCHASES ? 'demo' : 'off' }));

// --- oturum
route('POST', /^\/api\/session$/, async (req) => {
  limit('anon', clientIp(req), 30, 600000);
  const body = await json(req);
  const id = randStr(12);
  store.users[id] = { id, name: str(body.name, 24) || 'Misafir', createdAt: Date.now(), gold: catalog.WELCOME_GOLD, unlocked: {}, daily: { last: '', streak: 0 }, partnerId: null };
  return { token: newSession(id), user: publicUser(store.users[id]) };
});
route('POST', /^\/api\/register$/, async (req) => {
  const me = authUser(req);
  limit('register', clientIp(req), 10, 600000);
  const { email, password, name } = await json(req);
  const em = str(email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) fail(400, 'Geçerli bir e-posta adresi yaz.');
  if (typeof password !== 'string' || password.length < 8) fail(400, 'Şifre en az 8 karakter olmalı.');
  if (store.emails[em] && store.emails[em] !== me.id) fail(409, 'Bu e-posta ile kayıtlı bir hesap var. Giriş yapmayı dene.');
  if (me.email && me.email !== em) delete store.emails[me.email];
  me.email = em; me.passHash = hashPassword(password);
  if (str(name, 24)) me.name = str(name, 24);
  store.emails[em] = me.id; store.save();
  return { user: publicUser(me) };
});
route('POST', /^\/api\/login$/, async (req) => {
  limit('login', clientIp(req), 20, 600000);
  const { email, password } = await json(req);
  const id = store.emails[str(email, 120).toLowerCase()];
  const u = id && store.users[id];
  if (!u || typeof password !== 'string' || !checkPassword(password, u.passHash)) fail(401, 'E-posta ya da şifre hatalı.');
  // Bu cihazda misafir olarak bir şeyler yapıldıysa hesaba taşı.
  const guest = authUser(req, false);
  const merged = guest && guest.id !== u.id && !guest.passHash ? mergeGuest(guest, u) : 0;
  return { token: newSession(u.id), user: publicUser(u), merged };
});
// Misafir hesabı kayıtlı hesaba katar: buketler, satın alınan/kazanılan fazladan altın, açılan parçalar,
// bildirim abonelikleri ve (hesapta eş yoksa) eşleşme. Misafir hesabı sonra silinir.
function mergeGuest(guest, u) {
  let n = 0;
  for (const b of Object.values(store.bouquets)) {
    if (b.fromUserId === guest.id) { b.fromUserId = u.id; n++; }
    if (b.toUserId === guest.id) { b.toUserId = u.id; n++; }
  }
  // Hoş geldin altınıyla açılanlar taşınmaz (her yeni misafirle bedava parça toplanamasın); ödeme yapıldıysa hepsi taşınır.
  const paid = Object.values(store.purchases).some(p => p.userId === guest.id && p.status === 'paid');
  u.gold += Math.max(0, (guest.gold || 0) - (paid ? 0 : catalog.WELCOME_GOLD));
  if (paid) u.unlocked = { ...(guest.unlocked || {}), ...(u.unlocked || {}) };
  if (guest.partnerId && !u.partnerId) {
    const p = store.users[guest.partnerId];
    if (p && p.partnerId === guest.id && p.id !== u.id) { p.partnerId = u.id; u.partnerId = p.id; u.coupleSince = guest.coupleSince; }
  } else if (guest.partnerId) {
    const p = store.users[guest.partnerId];
    if (p && p.partnerId === guest.id) { p.partnerId = null; p.coupleSince = null; }
  }
  if ((!u.days || !u.days.length) && guest.days && guest.days.length) u.days = guest.days;
  if (store.push[guest.id]) { store.push[u.id] = [...(store.push[u.id] || []), ...store.push[guest.id]].slice(-5); delete store.push[guest.id]; }
  for (const [c, inv] of Object.entries(store.invites)) if (inv.userId === guest.id) delete store.invites[c];
  for (const [k, s] of Object.entries(store.sessions)) if (s.userId === guest.id) delete store.sessions[k];
  for (const p of Object.values(store.purchases)) if (p.userId === guest.id) p.userId = u.id;
  delete store.users[guest.id];
  store.save();
  return n;
}
route('POST', /^\/api\/logout$/, (req) => {
  const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
  if (m) { delete store.sessions[sha(m[1])]; store.save(); }
  return { ok: true };
});
route('GET', /^\/api\/me$/, (req) => {
  const me = authUser(req);
  return { user: publicUser(me), vapidPublicKey: push.publicKey, packs: catalog.PACKS, payments: iyzico.enabled ? 'iyzico' : DEMO_PURCHASES ? 'demo' : 'off', pushDevices: (store.push[me.id] || []).length };
});
route('PATCH', /^\/api\/me$/, async (req) => {
  const me = authUser(req);
  const { name } = await json(req);
  if (!str(name, 24)) fail(400, 'Adını yaz.');
  me.name = str(name, 24); store.save();
  return { user: publicUser(me) };
});

// --- eşleşme
route('POST', /^\/api\/invite$/, (req) => {
  const me = authUser(req);
  if (me.partnerId) fail(409, 'Zaten bir eşin var.');
  for (const [c, inv] of Object.entries(store.invites)) if (inv.userId === me.id) delete store.invites[c];
  let code; do { code = randStr(6, CODE_CHARS); } while (store.invites[code]);
  store.invites[code] = { userId: me.id, at: Date.now() }; store.save();
  return { code, url: `${baseUrl(req)}/esles/${code}` };
});
function liveInvite(code) {
  const inv = store.invites[String(code).toUpperCase()];
  if (!inv || Date.now() - inv.at > 7 * 86400000 || !store.users[inv.userId]) return null;
  return inv;
}
route('GET', /^\/api\/invite\/([A-Za-z0-9]{6})$/, (req, m) => {
  const inv = liveInvite(m[1]);
  if (!inv) fail(404, 'Bu davet kodu geçersiz ya da süresi dolmuş.');
  const u = store.users[inv.userId];
  return { fromName: u.name, taken: !!u.partnerId };
});
route('POST', /^\/api\/invite\/([A-Za-z0-9]{6})\/accept$/, async (req, m) => {
  const me = authUser(req);
  limit('pair', me.id, 20, 600000);
  const code = m[1].toUpperCase(), inv = liveInvite(code);
  if (!inv) fail(404, 'Bu davet kodu geçersiz ya da süresi dolmuş.');
  const other = store.users[inv.userId];
  if (other.id === me.id) fail(400, 'Kendi davetini kabul edemezsin. Linki eşine gönder.');
  if (other.partnerId) fail(409, `${other.name} başka biriyle eşleşmiş.`);
  if (me.partnerId) fail(409, 'Zaten bir eşin var. Önce Hesabım’dan eşleşmeyi kaldır.');
  const now = Date.now();
  me.partnerId = other.id; other.partnerId = me.id; me.coupleSince = now; other.coupleSince = now;
  delete store.invites[code]; store.save();
  push.notify(other.id, { title: 'Eşleştiniz', body: `${me.name} ile artık birbirinize buket gönderebilirsiniz.`, url: '/' });
  return { user: publicUser(me) };
});
route('POST', /^\/api\/unpair$/, (req) => {
  const me = authUser(req);
  const p = me.partnerId && store.users[me.partnerId];
  if (p && p.partnerId === me.id) { p.partnerId = null; p.coupleSince = null; }
  me.partnerId = null; me.coupleSince = null; store.save();
  return { user: publicUser(me) };
});

// --- cüzdan
route('POST', /^\/api\/unlock$/, async (req) => {
  const me = authUser(req);
  const { key: k } = await json(req);
  const price = catalog.UNLOCKS[k];
  if (!price) fail(400, 'Bilinmeyen ürün.');
  if (!me.unlocked[k]) {
    if (me.gold < price) fail(402, `${price - me.gold} altın eksik.`);
    me.gold -= price; me.unlocked[k] = Date.now(); store.save();
  }
  return { user: publicUser(me) };
});
route('POST', /^\/api\/daily$/, (req) => {
  const me = authUser(req);
  const today = dayKey(Date.now()), yest = dayKey(Date.now() - 86400000);
  if (me.daily.last === today) fail(409, 'Bugünkü hediyeni aldın. Yarın tekrar gel.');
  const streak = me.daily.last === yest ? me.daily.streak + 1 : 1, reward = streak % 7 === 0 ? 50 : 10;
  me.daily = { last: today, streak }; me.gold += reward; store.save();
  return { user: publicUser(me), reward };
});
route('POST', /^\/api\/purchase$/, async (req) => {
  const me = authUser(req);
  limit('purchase', me.id, 20, 600000);
  const { pack: packId } = await json(req);
  const pack = catalog.PACKS.find(p => p.id === packId);
  if (!pack) fail(400, 'Bilinmeyen paket.');
  const id = randStr(16);
  const purchase = { id, userId: me.id, pack: pack.id, gold: pack.gold + pack.bonus, price: pack.price, status: 'pending', createdAt: Date.now() };
  store.purchases[id] = purchase;
  if (iyzico.enabled) {
    try {
      const r = await iyzico.initialize({ purchase, pack, user: me, ip: clientIp(req), callbackUrl: `${baseUrl(req)}/api/iyzico/callback` });
      purchase.provider = 'iyzico'; purchase.token = r.token; store.save();
      return { paymentPageUrl: r.paymentPageUrl };
    } catch (e) {
      purchase.status = 'failed'; purchase.error = e.message; store.save();
      console.error('iyzico başlatılamadı:', e.message, e.iyzico || '');
      fail(502, 'Ödeme sayfası açılamadı. Birazdan tekrar dene.');
    }
  }
  if (!DEMO_PURCHASES) fail(503, 'Ödeme şu an kapalı.');
  purchase.provider = 'demo'; purchase.status = 'paid'; purchase.paidAt = Date.now();
  me.gold += purchase.gold; store.save();
  return { user: publicUser(me), demo: true, added: purchase.gold };
});
// iyzico ödeme formu sonucu buraya form olarak POST eder (token=...).
route('POST', /^\/api\/iyzico\/callback$/, async (req, m, res) => {
  const raw = await readBody(req, 8 * 1024);
  const token = new URLSearchParams(raw).get('token') || '';
  const purchase = Object.values(store.purchases).find(p => p.provider === 'iyzico' && p.token === token);
  let ok = false;
  if (purchase && purchase.status === 'pending') {
    try {
      const r = await iyzico.retrieve(token, purchase.id);
      const paid = r.paymentStatus === 'SUCCESS' && r.basketId === purchase.id && Number(r.paidPrice) >= purchase.price - 0.001 && r.currency === 'TRY';
      if (paid) {
        const u = store.users[purchase.userId];
        purchase.status = 'paid'; purchase.paidAt = Date.now(); purchase.paymentId = r.paymentId;
        if (u) u.gold += purchase.gold;
        ok = true;
      } else { purchase.status = 'failed'; purchase.error = r.errorMessage || r.paymentStatus; }
      store.save();
    } catch (e) { console.error('iyzico sonucu alınamadı:', e.message); }
  } else if (purchase && purchase.status === 'paid') ok = true;
  res.writeHead(303, { location: ok ? `/?odeme=basarili&altin=${purchase.gold}` : '/?odeme=hata' });
  res.end();
});

// --- bildirimler
route('POST', /^\/api\/push$/, async (req) => {
  const me = authUser(req);
  const { subscription } = await json(req, 8 * 1024);
  if (!push.subscribe(me.id, subscription)) fail(400, 'Bildirim aboneliği geçersiz.');
  return { ok: true };
});
route('DELETE', /^\/api\/push$/, async (req) => {
  const me = authUser(req);
  const { endpoint } = await json(req, 8 * 1024);
  push.unsubscribe(me.id, typeof endpoint === 'string' ? endpoint : null);
  return { ok: true };
});
route('POST', /^\/api\/push\/test$/, async (req) => {
  const me = authUser(req);
  limit('pushtest', me.id, 5, 600000);
  const n = await push.notify(me.id, { title: 'Demet', body: 'Bildirimler açık. Sana buket gelince burada göreceksin.', url: '/' });
  if (!n) fail(404, 'Bu hesapta bildirime kayıtlı cihaz yok.');
  return { sent: n };
});

// --- buketler
route('GET', /^\/api\/bouquets$/, (req) => {
  const me = authUser(req), base = baseUrl(req);
  const list = Object.values(store.bouquets).filter(b => b.fromUserId === me.id || (b.toUserId === me.id && isDelivered(b)))
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map(b => listItem(b, me, base));
  return { bouquets: list };
});
route('POST', /^\/api\/bouquets$/, async (req) => {
  const me = authUser(req);
  limit('send', me.id, 30, 600000);
  const body = await json(req, 600 * 1024);
  const b = cleanBouquet(body.bouquet);
  if (!b) fail(400, 'Bukette en az bir çiçek olmalı.');
  const missing = catalog.requiredUnlocks(b).filter(k => !me.unlocked[k]);
  if (missing.length) fail(403, 'Bu bukette kilidi açılmamış premium parçalar var.');
  const cost = catalog.bouquetCost(b.items);
  if (me.gold < cost) fail(402, `${cost - me.gold} altın eksik.`);
  let id; do { id = randStr(10); } while (store.bouquets[id]);
  const toUserId = body.toPartner && me.partnerId && store.users[me.partnerId] ? me.partnerId : null;
  let deliverAt = null;
  if (body.sendAt != null) {
    const t = Number(body.sendAt);
    if (!Number.isFinite(t) || t < Date.now() + 30000 || t > Date.now() + 366 * 86400000) fail(400, 'Gönderim zamanı en az 1 dakika sonra ve en fazla 1 yıl içinde olmalı.');
    deliverAt = Math.round(t);
  }
  if (!b.sign) b.sign = me.name;
  if (toUserId && !b.to) b.to = store.users[toUserId].name;
  const rec = { id, fromUserId: me.id, toUserId, createdAt: Date.now(), ...b, cost, hasImage: false, openedAt: null, deliverAt, delivered: !deliverAt };
  const m = typeof body.snap === 'string' && body.snap.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (m) {
    const img = Buffer.from(m[1], 'base64');
    if (img.length <= 300 * 1024 && img[0] === 0xff && img[1] === 0xd8) { await fsp.writeFile(path.join(IMG_DIR, id + '.jpg'), img); rec.hasImage = true; }
  }
  me.gold -= cost;
  store.bouquets[id] = rec; store.save();
  const url = `${baseUrl(req)}/b/${id}`;
  if (toUserId && !deliverAt) notifyArrival(rec);
  return { id, url, toPartner: !!toUserId, deliverAt, user: publicUser(me) };
});
route('GET', /^\/api\/bouquets\/([A-Za-z0-9]+)$/, (req, m) => {
  const b = ID_RE.test(m[1]) && store.bouquets[m[1]];
  if (!b) fail(404, 'Bu buket bulunamadı.');
  const me = authUser(req, false), mine = !!(me && b.fromUserId === me.id);
  if (!isDelivered(b) && !mine) return { id: b.id, locked: true, deliverAt: b.deliverAt, sign: b.sign, reason: b.reason };
  return { ...publicBouquet(b, me), mine };
});
route('DELETE', /^\/api\/bouquets\/([A-Za-z0-9]+)$/, async (req, m) => {
  const me = authUser(req);
  const b = ID_RE.test(m[1]) && store.bouquets[m[1]];
  if (!b || b.fromUserId !== me.id) fail(404, 'Bu buket bulunamadı.');
  if (isDelivered(b)) fail(409, 'Bu buket çoktan gitti, iptal edilemez.');
  me.gold += b.cost || 0;
  delete store.bouquets[b.id]; store.save();
  fsp.unlink(path.join(IMG_DIR, b.id + '.jpg')).catch(() => {});
  return { user: publicUser(me), refunded: b.cost || 0 };
});
const REACTIONS = { heart: 'Kalp gönderdi', thanks: 'Teşekkür ederim', love: 'Seni seviyorum', wow: 'Çok güzel olmuş', note: '' };
route('POST', /^\/api\/bouquets\/([A-Za-z0-9]+)\/react$/, async (req, m) => {
  const me = authUser(req);
  limit('react', me.id, 30, 600000);
  const b = ID_RE.test(m[1]) && store.bouquets[m[1]];
  if (!b || !isDelivered(b)) fail(404, 'Bu buket bulunamadı.');
  if (b.toUserId !== me.id) fail(403, 'Sadece buketi alan kişi cevap verebilir.');
  const { kind, text } = await json(req);
  if (!(kind in REACTIONS)) fail(400, 'Geçersiz cevap.');
  const t = str(text, 120);
  if (kind === 'note' && !t) fail(400, 'Notunu yaz.');
  b.reaction = { kind, text: t, at: Date.now() }; store.save();
  if (b.fromUserId) {
    const who = me.name !== 'Misafir' ? me.name : (b.to || 'Sevdiğin');
    push.notify(b.fromUserId, { title: `${who} buketine cevap verdi`, body: t ? (kind === 'note' ? t : `${REACTIONS[kind]}: ${t}`) : REACTIONS[kind], url: '/#bahce', tag: 'r-' + b.id });
  }
  return { reaction: b.reaction };
});

// --- özel günler
const DAY_TYPES = ['partner_birthday', 'anniversary', 'custom'];
route('POST', /^\/api\/days$/, async (req) => {
  const me = authUser(req);
  const { type, label, date } = await json(req);
  if (!DAY_TYPES.includes(type)) fail(400, 'Geçersiz gün türü.');
  const mm = typeof date === 'string' && date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!mm) fail(400, 'Tarihi seç.');
  const y = +mm[1], mo = +mm[2], d = +mm[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) fail(400, 'Tarih geçersiz.');
  if (type === 'custom' && !str(label, 40)) fail(400, 'Bu güne bir ad ver.');
  me.days = me.days || [];
  if (me.days.length >= 12) fail(409, 'En fazla 12 özel gün ekleyebilirsin.');
  me.days.push({ id: randStr(8), type, label: str(label, 40), month: mo, day: d, year: y >= 1950 && y <= 2100 ? y : null });
  store.save();
  return { user: publicUser(me) };
});
route('DELETE', /^\/api\/days\/([A-Za-z0-9]{8})$/, (req, m) => {
  const me = authUser(req);
  me.days = (me.days || []).filter(x => x.id !== m[1]); store.save();
  return { user: publicUser(me) };
});
route('POST', /^\/api\/bouquets\/([A-Za-z0-9]+)\/open$/, (req, m) => {
  const me = authUser(req);
  const b = ID_RE.test(m[1]) && store.bouquets[m[1]];
  if (!b) fail(404, 'Bu buket bulunamadı.');
  if (b.fromUserId === me.id) return { own: true };
  if (!isDelivered(b)) fail(423, 'Bu buket henüz açılmadı.');
  if (!b.toUserId) b.toUserId = me.id; // link ile gelen buketi ilk açan sahiplenir
  if (b.toUserId === me.id && !b.openedAt) {
    b.openedAt = Date.now();
    if (b.fromUserId) push.notify(b.fromUserId, { title: `${me.name !== 'Misafir' ? me.name : (b.to || 'Sevdiğin')} buketini açtı`, body: b.note || b.reason || '', url: '/#bahce', tag: 'o-' + b.id });
  }
  store.save();
  return { claimed: b.toUserId === me.id };
});
route('GET', /^\/api\/bouquets\/([A-Za-z0-9]+)\/image\.jpg$/, async (req, m, res) => {
  if (!ID_RE.test(m[1])) fail(404, 'Bulunamadı');
  const bq = store.bouquets[m[1]];
  if (bq && !isDelivered(bq)) { const me = authUser(req, false); if (!me || me.id !== bq.fromUserId) fail(404, 'Bulunamadı'); }
  try { const img = await fsp.readFile(path.join(IMG_DIR, m[1] + '.jpg')); send(res, 200, img, { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' }); }
  catch (e) { fail(404, 'Bulunamadı'); }
});

setupAdmin({ route, store, fail, json, limit, clientIp, push, catalog, str });

/* ================================================================== pages */
async function page(req, res, meta) {
  let html = await fsp.readFile(path.join(ROOT, 'index.html'), 'utf8');
  if (meta) {
    const tags = [
      `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="Demet">`,
      `<meta property="og:title" content="${escHtml(meta.title)}">`, `<meta property="og:description" content="${escHtml(meta.desc)}">`,
      `<meta property="og:url" content="${escHtml(meta.url)}">`,
      meta.image ? `<meta property="og:image" content="${escHtml(meta.image)}"><meta property="og:image:width" content="360"><meta property="og:image:height" content="360">` : '',
      `<meta name="twitter:card" content="summary">`,
    ].join('\n');
    html = html.replace('<!--OG-->', tags).replace('<title>Demet</title>', `<title>${escHtml(meta.title)} · Demet</title>`);
  }
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', vary: 'accept-encoding' };
  if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    const buf = zlib.gzipSync(html);
    res.writeHead(200, { ...headers, 'content-encoding': 'gzip', 'content-length': buf.length });
    return res.end(buf);
  }
  send(res, 200, html, headers);
}
const GZ_EXT = new Set(['.json', '.js', '.html', '.css', '.webmanifest', '.svg']);
const gzCache = new Map();
async function adminPage(req, res) {
  const html = await fsp.readFile(path.join(ROOT, 'admin.html'));
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow',
    'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer', vary: 'accept-encoding' };
  if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) { const buf = zlib.gzipSync(html); res.writeHead(200, { ...headers, 'content-encoding': 'gzip', 'content-length': buf.length }); return res.end(buf); }
  res.writeHead(200, { ...headers, 'content-length': html.length }); res.end(html);
}
function serveStatic(req, res, urlPath) {
  let file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) return send(res, 403, 'Yasak');
  if (urlPath.endsWith('/')) file = path.join(file, 'index.html');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Bulunamadı');
    const ext = path.extname(file);
    const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-cache', vary: 'accept-encoding' };
    if (urlPath === '/sw.js') headers['service-worker-allowed'] = '/';
    if (GZ_EXT.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      const k = file + ':' + st.mtimeMs;
      let buf = gzCache.get(k);
      if (!buf) { buf = zlib.gzipSync(fs.readFileSync(file), { level: 9 }); gzCache.set(k, buf); }
      res.writeHead(200, { ...headers, 'content-encoding': 'gzip', 'content-length': buf.length, 'x-raw-length': st.size });
      return res.end(req.method === 'HEAD' ? undefined : buf);
    }
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}

/* ================================================================== zamanlayıcı */
function notifyArrival(b) {
  push.notify(b.toUserId, { title: `${b.sign || 'Biri'} sana bir buket gönderdi`, body: b.note || b.reason || 'Açmak için dokun.', url: `/b/${b.id}`, tag: 'b-' + b.id });
}
function dayTitle(u, x, when) {
  const p = u.partnerId && store.users[u.partnerId];
  const pn = p ? p.name : 'Eşinin';
  if (x.type === 'partner_birthday') return `${p ? genitive(pn) : pn} doğum günü ${when}`;
  if (x.type === 'anniversary') { const n = x.year ? daysUntil(x.month, x.day).year - x.year : 0; return `${n > 0 ? n + '. ' : ''}yıldönümünüz ${when}`.replace(/^y/, 'Y'); }
  return `${x.label} ${when}`;
}
function tickScheduler() {
  const now = Date.now();
  let dirty = false;
  for (const b of Object.values(store.bouquets)) {
    if (b.deliverAt && !b.delivered && b.deliverAt <= now) {
      b.delivered = true; dirty = true;
      if (b.toUserId) notifyArrival(b);
      if (b.fromUserId) push.notify(b.fromUserId, { title: 'Planladığın buket gitti', body: b.to ? `${b.to} artık buketini açabilir.` : 'Linki açan artık buketi görebilir.', url: '/#bahce', tag: 'd-' + b.id });
    }
  }
  if (trParts(now).h >= 10) {
    for (const u of Object.values(store.users)) {
      for (const x of u.days || []) {
        const { days, year } = daysUntil(x.month, x.day, now);
        if (![3, 1, 0].includes(days)) continue;
        const key = `${x.id}:${year}:${days}`;
        u.remindLog = u.remindLog || {};
        if (u.remindLog[key]) continue;
        u.remindLog[key] = now; dirty = true;
        const when = days === 0 ? 'bugün' : days === 1 ? 'yarın' : '3 gün sonra';
        push.notify(u.id, { title: dayTitle(u, x, when), body: days === 0 ? 'Bir buketle günü güzelleştir.' : 'Buketini şimdiden hazırla, tam zamanında gitsin.', url: '/', tag: 'day-' + x.id });
      }
    }
  }
  if (dirty) store.save();
}
setInterval(tickScheduler, 30000).unref();
setTimeout(tickScheduler, 2000).unref();

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const urlPath = decodeURIComponent(url.pathname);
    if (urlPath.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = urlPath.match(r.re);
        if (!m) continue;
        const out = await r.fn(req, m, res);
        if (!res.headersSent) send(res, 200, out);
        return;
      }
      return send(res, 404, { error: 'Bulunamadı' });
    }
    let m;
    if ((m = urlPath.match(/^\/b\/([A-Za-z0-9]+)\/?$/))) {
      const b = ID_RE.test(m[1]) && store.bouquets[m[1]], base = baseUrl(req);
      const open = b && isDelivered(b);
      return page(req, res, b && {
        title: `${b.sign || 'Biri'} sana bir buket gönderdi`, desc: open ? (b.note || b.reason || 'Açmak için dokun.') : 'Bu buket zamanı gelince açılacak.',
        url: `${base}/b/${b.id}`, image: open && b.hasImage ? `${base}/api/bouquets/${b.id}/image.jpg` : null,
      });
    }
    if ((m = urlPath.match(/^\/esles\/([A-Za-z0-9]{6})\/?$/))) {
      const inv = liveInvite(m[1]), u = inv && store.users[inv.userId];
      return page(req, res, u && { title: `${u.name} seni Demet’e davet etti`, desc: 'Eşleşin, birbirinize 3D buket gönderin.', url: `${baseUrl(req)}/esles/${m[1].toUpperCase()}` });
    }
    if (urlPath === '/' || urlPath === '/index.html') return page(req, res, null);
    if (urlPath === '/admin' || urlPath === '/admin/' || urlPath === '/admin.html') return adminPage(req, res);
    return serveStatic(req, res, urlPath);
  } catch (e) {
    if (e instanceof HttpError) return res.headersSent ? res.end() : send(res, e.code, { error: e.message });
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'Sunucuda bir hata oluştu.' });
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Demet çalışıyor\n\n  Bu bilgisayarda:  http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  Telefonda (aynı Wi-Fi): http://${a.address}:${PORT}`);
  }
  console.log(`\n  Veri:    ${DATA_DIR}`);
  console.log(`  Yönetim: ${process.env.ADMIN_PASSWORD ? `/admin` : 'kapalı (ADMIN_PASSWORD ayarlanmamış)'}`);
  console.log(`  Ödeme:   ${iyzico.enabled ? `iyzico (${iyzico.BASE})` : DEMO_PURCHASES ? 'deneme modu (para çekilmez)' : 'kapalı'}`);
  if (PUBLIC_URL) console.log(`  Linkler: ${PUBLIC_URL}`);
  console.log('\n  Durdurmak için Ctrl+C\n');
});
