// App Store ve Google Play satın almaları (RevenueCat). Altın tüketilebilir üründür; her mağaza işlemi
// (transaction) tek bir kez altına çevrilir. İki yol da aynı fonksiyondan geçer:
//   1) RevenueCat webhook'u: satın alma olunca RevenueCat sunucuya haber verir.
//   2) Uygulamanın satın almadan hemen sonra çağırdığı senkron: sunucu RevenueCat'e kullanıcının işlemlerini sorar.
// Böylece webhook gecikse ya da kaçsa bile altın hemen yüklenir.
//
// Ortam değişkenleri:
//   REVENUECAT_SECRET_KEY     RevenueCat > Project settings > API keys > Secret API key (sk_...)
//   REVENUECAT_WEBHOOK_AUTH   RevenueCat webhook ayarına yazdığın Authorization değeri
const crypto = require('crypto');

module.exports = function setupRevenueCat({ route, store, fail, json, authUser, publicUser, catalog, push, limit }) {
  const SECRET = process.env.REVENUECAT_SECRET_KEY || '';
  const HOOK = process.env.REVENUECAT_WEBHOOK_AUTH || '';
  if (!store.data.iap) store.data.iap = {};
  const byProduct = id => catalog.PACKS.find(p => p.iap === id || (p.iapAlt || []).includes(id));
  const STORE_NAME = { APP_STORE: 'app_store', MAC_APP_STORE: 'app_store', PLAY_STORE: 'play_store', app_store: 'app_store', play_store: 'play_store' };

  // Yeni bir işlemse altını yükler ve eklenen miktarı döner; daha önce işlendiyse 0.
  function credit({ userId, productId, txId, storeName, sandbox, price, currency, at }) {
    if (!txId || store.data.iap[txId]) return 0;
    const u = store.users[userId], pack = byProduct(productId);
    if (!u) { console.warn('RevenueCat: kullanıcı bulunamadı', userId); return 0; }
    if (!pack) { console.warn('RevenueCat: tanımsız ürün', productId); return 0; }
    const id = 'iap_' + crypto.randomBytes(6).toString('hex');
    const gold = pack.gold + pack.bonus;
    store.purchases[id] = {
      id, userId: u.id, pack: pack.id, gold, price: typeof price === 'number' ? price : pack.price, currency: currency || 'TRY',
      status: 'paid', provider: STORE_NAME[storeName] || String(storeName || 'store').toLowerCase(), sandbox: !!sandbox,
      transactionId: txId, productId, createdAt: at || Date.now(), paidAt: Date.now(),
    };
    store.data.iap[txId] = id;
    u.gold += gold;
    store.save();
    return gold;
  }
  // Mağaza iadesi: altını geri al (bakiye yetmiyorsa sıfıra kadar).
  function refund(txId) {
    const pid = store.data.iap[txId], p = pid && store.purchases[pid];
    if (!p || p.status === 'refunded') return;
    const u = store.users[p.userId];
    if (u) u.gold = Math.max(0, u.gold - p.gold);
    p.status = 'refunded'; p.refundedAt = Date.now();
    store.save();
  }

  route('POST', /^\/api\/revenuecat\/webhook$/, async (req) => {
    if (!HOOK) fail(503, 'Webhook ayarlanmamış.');
    const got = String(req.headers.authorization || '');
    const ok = got.length === HOOK.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(HOOK));
    const okBearer = !ok && got === `Bearer ${HOOK}`;
    if (!ok && !okBearer) fail(401, 'Yetkisiz.');
    const body = await json(req, 64 * 1024);
    const e = body && body.event;
    if (!e) return { ok: true };
    if (e.type === 'NON_RENEWING_PURCHASE' || (e.type === 'INITIAL_PURCHASE' && byProduct(e.product_id))) {
      const ids = [e.app_user_id, e.original_app_user_id, ...(e.aliases || [])].filter(Boolean);
      const userId = ids.find(id => store.users[id]);
      const added = credit({ userId, productId: e.product_id, txId: e.transaction_id, storeName: e.store, sandbox: e.environment === 'SANDBOX',
        price: e.price_in_purchased_currency, currency: e.currency, at: e.purchased_at_ms });
      if (added && userId) push.notify(userId, { title: `${added} altın hesabına yüklendi`, body: 'Teşekkürler! Altınların kullanıma hazır.', url: '/', tag: 'gold' }).catch(() => {});
    } else if (e.type === 'CANCELLATION' && e.transaction_id) {
      refund(e.transaction_id);
    }
    return { ok: true };
  });

  // Uygulama satın almadan sonra çağırır; RevenueCat'teki işlemleri kontrol edip eksik olanları yükler.
  route('POST', /^\/api\/iap\/sync$/, async (req) => {
    const me = authUser(req);
    limit('iapsync', me.id, 30, 600000);
    if (!SECRET) fail(503, 'Mağaza ödemeleri sunucuda ayarlanmamış.');
    const r = await fetch(`${process.env.REVENUECAT_API_BASE || 'https://api.revenuecat.com'}/v1/subscribers/${encodeURIComponent(me.id)}`, { headers: { authorization: `Bearer ${SECRET}`, accept: 'application/json' } });
    if (!r.ok) fail(502, 'Mağaza bilgisi alınamadı, birazdan tekrar dene.');
    const j = await r.json();
    const non = (j.subscriber && j.subscriber.non_subscriptions) || {};
    let added = 0;
    for (const [productId, list] of Object.entries(non)) {
      for (const t of list || []) {
        added += credit({ userId: me.id, productId, txId: t.store_transaction_id || t.id, storeName: t.store, sandbox: !!t.is_sandbox,
          at: t.purchase_date ? Date.parse(t.purchase_date) : Date.now() });
      }
    }
    return { user: publicUser(me), added };
  });

  return { enabled: !!SECRET, credit, refund };
};
