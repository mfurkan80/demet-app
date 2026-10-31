// Web Push bildirimleri (VAPID). Anahtarlar ortam değişkeninden okunur, yoksa ilk açılışta
// data/vapid.json içine üretilir. Anahtarlar değişirse eski abonelikler geçersiz olur.
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

function setupPush(store, dataDir, subject) {
  let pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    const f = path.join(dataDir, 'vapid.json');
    if (fs.existsSync(f)) ({ publicKey: pub, privateKey: priv } = JSON.parse(fs.readFileSync(f, 'utf8')));
    else { ({ publicKey: pub, privateKey: priv } = webpush.generateVAPIDKeys()); fs.writeFileSync(f, JSON.stringify({ publicKey: pub, privateKey: priv })); }
  }
  webpush.setVapidDetails(subject, pub, priv);

  function subscribe(userId, sub) {
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return false;
    const list = (store.push[userId] || []).filter(s => s.endpoint !== sub.endpoint);
    list.push({ endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) }, at: Date.now() });
    store.push[userId] = list.slice(-5); // en fazla 5 cihaz
    store.save();
    return true;
  }
  function unsubscribe(userId, endpoint) {
    store.push[userId] = (store.push[userId] || []).filter(s => !endpoint || s.endpoint !== endpoint);
    store.save();
  }
  async function notify(userId, payload) {
    const list = store.push[userId] || [];
    if (!list.length) return 0;
    let sent = 0;
    await Promise.all(list.map(async sub => {
      try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 }); sent++; }
      catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) unsubscribe(userId, sub.endpoint);
        else console.warn('Bildirim gönderilemedi:', e.statusCode || e.message);
      }
    }));
    return sent;
  }
  return { publicKey: pub, subscribe, unsubscribe, notify };
}

module.exports = { setupPush };
