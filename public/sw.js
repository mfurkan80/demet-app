// Demet service worker: bildirimler + hızlı açılış için önbellek.
const VERSION = 'demet-v6';
const ASSETS = /\/(models|garden)\.json(\?|$)|\/thumbs\/|\/icons\/|cdn\.jsdelivr\.net\/npm\/three@|fonts\.(googleapis|gstatic)\.com/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith('/api/') && !url.pathname.endsWith('/image.jpg')) return;
  // sayfalar: önce ağ, çevrimdışıysa önbellekteki ana sayfa
  if (req.mode === 'navigate') {
    if (url.pathname.startsWith('/admin')) return; // yönetim paneli önbelleğe girmez
    e.respondWith(fetch(req).then(res => { if (url.pathname === '/' && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('/', copy)).catch(() => {}); } return res; })
      .catch(() => caches.match('/')));
    return;
  }
  // modeller, küçük resimler, kütüphaneler: önbellekten hemen ver, arkada güncelle
  if (ASSETS.test(url.href) || url.pathname.endsWith('/image.jpg')) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { title: 'Demet', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Demet', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag,
    data: { url: data.url || '/' },
    vibrate: [60, 40, 60],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data && e.notification.data.url || '/', location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (new URL(c.url).origin === location.origin && 'focus' in c) return c.navigate(target).then(w => (w || c).focus());
    return self.clients.openWindow(target);
  }));
});
