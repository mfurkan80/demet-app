// Yönetim paneli API'si: genel durum, kullanıcılar, altın ekleme/çıkarma, satın almalar ve işlem kaydı.
// Panel /admin adresinde açılır ve ADMIN_PASSWORD ortam değişkeni ayarlı değilse tamamen kapalıdır.
// Oturumlar bellekte tutulur (sunucu yeniden başlayınca tekrar giriş gerekir), 12 saat geçerlidir.
const crypto = require('crypto');

module.exports = function setupAdmin({ route, store, fail, json, limit, clientIp, push, catalog, str }) {
  const PASSWORD = process.env.ADMIN_PASSWORD || '';
  const sessions = new Map();
  const TTL = 12 * 3600 * 1000;
  const DAY = 86400000;
  const sha = s => crypto.createHash('sha256').update(String(s)).digest();
  if (!store.data.adminLog) store.data.adminLog = [];

  function admin(req) {
    if (!PASSWORD) fail(503, 'Yönetim paneli kapalı. Sunucuda ADMIN_PASSWORD ortam değişkenini ayarla.');
    const m = (req.headers.authorization || '').match(/^Admin ([A-Za-z0-9_-]{30,})$/);
    const s = m && sessions.get(m[1]);
    if (!s || Date.now() - s.at > TTL) { if (m) sessions.delete(m[1]); fail(401, 'Oturum süresi doldu. Tekrar giriş yap.'); }
    return s;
  }

  route('POST', /^\/api\/admin\/login$/, async (req) => {
    if (!PASSWORD) fail(503, 'Yönetim paneli kapalı. Sunucuda ADMIN_PASSWORD ortam değişkenini ayarla.');
    limit('admin', clientIp(req), 8, 15 * 60000);
    const { password } = await json(req);
    if (typeof password !== 'string' || !crypto.timingSafeEqual(sha(password), sha(PASSWORD))) fail(401, 'Şifre yanlış.');
    for (const [t, s] of sessions) if (Date.now() - s.at > TTL) sessions.delete(t);
    const token = crypto.randomBytes(32).toString('base64url');
    sessions.set(token, { at: Date.now(), ip: clientIp(req) });
    return { token };
  });
  route('POST', /^\/api\/admin\/logout$/, (req) => {
    const m = (req.headers.authorization || '').match(/^Admin (.+)$/);
    if (m) sessions.delete(m[1]);
    return { ok: true };
  });

  // ---- yardımcılar
  const users = () => Object.values(store.users);
  const paidOf = () => {
    const by = {};
    for (const p of Object.values(store.purchases)) if (p.status === 'paid') { const b = by[p.userId] || (by[p.userId] = { tl: 0, n: 0 }); b.tl += p.price || 0; b.n++; }
    return by;
  };
  const countsOf = () => {
    const by = {};
    for (const b of Object.values(store.bouquets)) {
      if (b.fromUserId) (by[b.fromUserId] || (by[b.fromUserId] = { sent: 0, recv: 0 })).sent++;
      if (b.toUserId) (by[b.toUserId] || (by[b.toUserId] = { sent: 0, recv: 0 })).recv++;
    }
    return by;
  };
  function row(u, counts, paid) {
    const p = u.partnerId && store.users[u.partnerId];
    const c = counts[u.id] || { sent: 0, recv: 0 }, pd = paid[u.id] || { tl: 0, n: 0 };
    return {
      id: u.id, name: u.name, email: u.email || null, registered: !!u.passHash, gold: u.gold || 0,
      createdAt: u.createdAt || 0, seenAt: u.seenAt || u.createdAt || 0,
      partner: p ? { id: p.id, name: p.name } : null, sent: c.sent, recv: c.recv,
      paidTL: Math.round(pd.tl * 100) / 100, paidCount: pd.n, devices: (store.push[u.id] || []).length,
      friends: (u.friends || []).filter(id => store.users[id]).length,
    };
  }

  route('GET', /^\/api\/admin\/overview$/, (req) => {
    admin(req);
    const now = Date.now(), list = users(), bqs = Object.values(store.bouquets), pur = Object.values(store.purchases);
    const registered = list.filter(u => u.passHash);
    const paid = pur.filter(p => p.status === 'paid');
    const sum = a => Math.round(a.reduce((s, p) => s + (p.price || 0), 0) * 100) / 100;
    const delivered = bqs.filter(b => !b.deliverAt || b.delivered);
    return {
      users: list.length, registered: registered.length, guests: list.length - registered.length,
      newRegistered7: registered.filter(u => now - (u.createdAt || 0) < 7 * DAY).length,
      active7: list.filter(u => now - (u.seenAt || u.createdAt || 0) < 7 * DAY).length,
      active1: list.filter(u => now - (u.seenAt || u.createdAt || 0) < DAY).length,
      couples: Math.floor(list.filter(u => u.partnerId && store.users[u.partnerId]).length / 2),
      bouquets: bqs.length, bouquets7: bqs.filter(b => now - b.createdAt < 7 * DAY).length,
      opened: delivered.filter(b => b.openedAt).length, delivered: delivered.length,
      scheduled: bqs.filter(b => b.deliverAt && !b.delivered).length,
      gold: list.reduce((s, u) => s + (u.gold || 0), 0),
      goldRegistered: registered.reduce((s, u) => s + (u.gold || 0), 0),
      revenue: sum(paid), revenue30: sum(paid.filter(p => now - (p.paidAt || p.createdAt) < 30 * DAY)), paidCount: paid.length,
      pushUsers: Object.values(store.push).filter(l => l && l.length).length,
      payments: process.env.IYZICO_API_KEY ? 'iyzico' : process.env.DEMO_PURCHASES === 'off' ? 'off' : 'demo',
    };
  });

  route('GET', /^\/api\/admin\/users$/, (req) => {
    admin(req);
    const q = new URL(req.url, 'http://x').searchParams;
    const term = (q.get('q') || '').trim().toLocaleLowerCase('tr');
    const filter = q.get('filter') || 'registered', sort = q.get('sort') || 'new';
    const offset = Math.max(0, parseInt(q.get('offset'), 10) || 0), lim = Math.min(200, Math.max(1, parseInt(q.get('limit'), 10) || 50));
    const counts = countsOf(), paid = paidOf();
    let rows = users().map(u => row(u, counts, paid));
    if (filter === 'registered') rows = rows.filter(r => r.registered);
    else if (filter === 'guest') rows = rows.filter(r => !r.registered);
    else if (filter === 'paired') rows = rows.filter(r => r.partner);
    else if (filter === 'paid') rows = rows.filter(r => r.paidCount > 0);
    if (term) rows = rows.filter(r => r.id.toLowerCase() === term || (r.name || '').toLocaleLowerCase('tr').includes(term) || (r.email || '').includes(term));
    const by = { new: r => -r.createdAt, gold: r => -r.gold, active: r => -r.seenAt, bouquets: r => -(r.sent + r.recv), paid: r => -r.paidTL };
    const key = by[sort] || by.new;
    rows.sort((a, b) => key(a) - key(b));
    return { total: rows.length, users: rows.slice(offset, offset + lim) };
  });

  function userOr404(id) { const u = store.users[id]; if (!u) fail(404, 'Kullanıcı bulunamadı.'); return u; }
  function detail(u) {
    const counts = countsOf(), paid = paidOf();
    const bqs = Object.values(store.bouquets).filter(b => b.fromUserId === u.id || b.toUserId === u.id)
      .sort((a, b) => b.createdAt - a.createdAt).slice(0, 30)
      .map(b => {
        const out = b.fromUserId === u.id, other = store.users[out ? b.toUserId : b.fromUserId];
        return { id: b.id, dir: out ? 'out' : 'in', who: out ? (b.to || (other && other.name) || 'Link ile') : (b.sign || (other && other.name) || '?'),
          reason: b.reason || '', note: b.note || '', stems: (b.items || []).length, cost: b.cost || 0, createdAt: b.createdAt,
          openedAt: b.openedAt || null, deliverAt: b.deliverAt || null, delivered: !b.deliverAt || !!b.delivered, reaction: b.reaction ? b.reaction.kind : null };
      });
    const purchases = Object.values(store.purchases).filter(p => p.userId === u.id).sort((a, b) => b.createdAt - a.createdAt)
      .map(p => ({ id: p.id, pack: p.pack, gold: p.gold, price: p.price, status: p.status, provider: p.provider || null, createdAt: p.createdAt, paidAt: p.paidAt || null }));
    return {
      user: { ...row(u, counts, paid), unlocked: Object.keys(u.unlocked || {}), daily: u.daily || null, days: (u.days || []).length, coupleSince: u.coupleSince || null },
      bouquets: bqs, purchases,
      log: store.data.adminLog.filter(l => l.userId === u.id).slice(-30).reverse(),
    };
  }
  route('GET', /^\/api\/admin\/users\/([A-Za-z0-9]+)$/, (req, m) => { admin(req); return detail(userOr404(m[1])); });

  route('POST', /^\/api\/admin\/users\/([A-Za-z0-9]+)\/gold$/, async (req, m) => {
    admin(req);
    const u = userOr404(m[1]);
    const body = await json(req);
    const delta = Number(body.delta), reason = str(body.reason, 120);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) fail(400, 'Miktar 0 olmayan bir tam sayı olmalı (en fazla 100.000).');
    if (!reason) fail(400, 'Neden yaz; işlem kaydında görünecek.');
    const before = u.gold || 0;
    if (before + delta < 0) fail(400, `Kullanıcının ${before} altını var, daha fazlası düşülemez.`);
    u.gold = before + delta;
    store.data.adminLog.push({ id: crypto.randomBytes(6).toString('hex'), at: Date.now(), userId: u.id, userName: u.name, delta, before, after: u.gold, reason, ip: clientIp(req) });
    if (store.data.adminLog.length > 5000) store.data.adminLog.splice(0, store.data.adminLog.length - 5000);
    store.save();
    if (body.notify && delta > 0) push.notify(u.id, { title: `Hesabına ${delta} altın eklendi`, body: reason, url: '/', tag: 'gold' }).catch(() => {});
    return detail(u);
  });

  route('GET', /^\/api\/admin\/purchases$/, (req) => {
    admin(req);
    const q = new URL(req.url, 'http://x').searchParams, status = q.get('status') || 'all';
    const list = Object.values(store.purchases).filter(p => status === 'all' || p.status === status)
      .sort((a, b) => b.createdAt - a.createdAt).slice(0, 300)
      .map(p => { const u = store.users[p.userId]; return { id: p.id, userId: p.userId, userName: u ? u.name : '(silinmiş)', email: u && u.email || null, pack: p.pack, gold: p.gold, price: p.price, status: p.status, provider: p.provider || null, createdAt: p.createdAt, paidAt: p.paidAt || null, error: p.error || null }; });
    return { purchases: list, packs: catalog.PACKS };
  });

  route('GET', /^\/api\/admin\/log$/, (req) => { admin(req); return { log: store.data.adminLog.slice(-300).reverse() }; });
};
