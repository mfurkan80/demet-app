// Bildirimler: tarayıcılar için Web Push (VAPID), iOS ve Android uygulaması için Firebase (FCM).
// VAPID anahtarları ortam değişkeninden okunur, yoksa ilk açılışta data/vapid.json içine üretilir.
// Anahtarlar değişirse eski tarayıcı abonelikleri geçersiz olur.
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const { setupFcm } = require('./fcm');

function setupPush(store, dataDir, subject) {
  let pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    const f = path.join(dataDir, 'vapid.json');
    if (fs.existsSync(f)) ({ publicKey: pub, privateKey: priv } = JSON.parse(fs.readFileSync(f, 'utf8')));
    else { ({ publicKey: pub, privateKey: priv } = webpush.generateVAPIDKeys()); fs.writeFileSync(f, JSON.stringify({ publicKey: pub, privateKey: priv })); }
  }
  webpush.setVapidDetails(subject, pub, priv);
  const fcm = setupFcm();
  if (!store.data.devices) store.data.devices = {};
  const devices = store.data.devices;

  function subscribe(userId, sub) {
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return false;
    const list = (store.push[userId] || []).filter(s => s.endpoint !== sub.endpoint);
    list.push({ endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) }, at: Date.now() });
    store.push[userId] = list.slice(-5); // en fazla 5 tarayıcı
    store.save();
    return true;
  }
  function unsubscribe(userId, endpoint) {
    store.push[userId] = (store.push[userId] || []).filter(s => !endpoint || s.endpoint !== endpoint);
    store.save();
  }
  // Uygulama cihazları: aynı cihaz anahtarı tek bir kullanıcıya bağlıdır (çıkış yapıp başka hesaba girilirse taşınır).
  function registerDevice(userId, token, platform) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 4096) return false;
    for (const [uid, list] of Object.entries(devices)) {
      const left = list.filter(d => d.token !== token);
      if (left.length !== list.length) devices[uid] = left;
    }
    const list = devices[userId] || [];
    list.push({ token, platform: platform === 'ios' ? 'ios' : 'android', at: Date.now() });
    devices[userId] = list.slice(-5);
    store.save();
    return true;
  }
  function unregisterDevice(userId, token) {
    devices[userId] = (devices[userId] || []).filter(d => !token || d.token !== token);
    store.save();
  }
  const deviceCount = userId => (store.push[userId] || []).length + (devices[userId] || []).length;

  async function notify(userId, payload) {
    let sent = 0;
    const web = store.push[userId] || [], apps = devices[userId] || [];
    await Promise.all([
      ...web.map(async sub => {
        try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 }); sent++; }
        catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) unsubscribe(userId, sub.endpoint);
          else console.warn('Bildirim gönderilemedi:', e.statusCode || e.message);
        }
      }),
      ...(fcm.enabled ? apps.map(async d => {
        const r = await fcm.send(d.token, payload).catch(() => 'error');
        if (r === 'ok') sent++; else if (r === 'gone') unregisterDevice(userId, d.token);
      }) : []),
    ]);
    return sent;
  }
  return { publicKey: pub, subscribe, unsubscribe, registerDevice, unregisterDevice, deviceCount, notify, nativeEnabled: fcm.enabled };
}

module.exports = { setupPush };
