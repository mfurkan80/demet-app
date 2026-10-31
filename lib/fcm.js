// Firebase Cloud Messaging (HTTP v1): iOS ve Android uygulamalarına bildirim. Paketsiz; servis hesabıyla
// imzalanan bir JWT karşılığında erişim anahtarı alınır ve 50 dakika saklanır.
//
// Ortam değişkeni:
//   FCM_SERVICE_ACCOUNT   Firebase konsolundan indirilen servis hesabı JSON'u (düz JSON ya da base64)
const crypto = require('crypto');

function setupFcm() {
  const raw = (process.env.FCM_SERVICE_ACCOUNT || '').trim();
  const off = { enabled: false, send: async () => 'off' };
  if (!raw) return off;
  let sa;
  try { sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')); }
  catch (e) { console.warn('FCM_SERVICE_ACCOUNT okunamadı, uygulama bildirimleri kapalı.'); return off; }
  if (!sa.client_email || !sa.private_key || !sa.project_id) { console.warn('FCM_SERVICE_ACCOUNT eksik alan içeriyor.'); return off; }

  let token = null, expires = 0, pending = null;
  async function accessToken() {
    if (token && Date.now() < expires - 60000) return token;
    if (pending) return pending;
    pending = (async () => {
      const now = Math.floor(Date.now() / 1000);
      const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
      const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
      const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
      });
      const j = await r.json().catch(() => ({}));
      if (!j.access_token) throw new Error('FCM erişim anahtarı alınamadı: ' + (j.error_description || j.error || r.status));
      token = j.access_token; expires = Date.now() + (j.expires_in || 3600) * 1000;
      return token;
    })().finally(() => { pending = null; });
    return pending;
  }

  // 'ok' gönderildi, 'gone' anahtar artık geçersiz (silinmeli), 'error' geçici hata
  async function send(deviceToken, payload) {
    let at;
    try { at = await accessToken(); } catch (e) { console.warn(e.message); return 'error'; }
    const message = {
      token: deviceToken,
      notification: { title: payload.title, body: payload.body || '' },
      data: { url: String(payload.url || '/'), tag: String(payload.tag || '') },
      android: { priority: 'high', notification: { color: '#B5244D', ...(payload.tag ? { tag: payload.tag } : {}) } },
      apns: { payload: { aps: { sound: 'default', ...(payload.tag ? { 'thread-id': payload.tag } : {}) } } },
    };
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST', headers: { authorization: `Bearer ${at}`, 'content-type': 'application/json' }, body: JSON.stringify({ message }),
    });
    if (r.ok) return 'ok';
    const j = await r.json().catch(() => ({}));
    const details = (j.error && j.error.details) || [];
    const code = (details.find(d => d.errorCode) || {}).errorCode;
    if (r.status === 404 || code === 'UNREGISTERED' || (code === 'INVALID_ARGUMENT' && /registration token/i.test((j.error && j.error.message) || ''))) return 'gone';
    console.warn('Uygulama bildirimi gönderilemedi:', r.status, j.error && j.error.message);
    return 'error';
  }
  return { enabled: true, send };
}

module.exports = { setupFcm };
