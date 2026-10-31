// Demet native köprüsü: sayfa bu nesneyi window.DemetNative olarak görür. Sayfa kodu tarayıcıda da aynen
// çalıştığı için native olan her şey burada toplanır (satın alma, bildirim, paylaşma, titreşim, geri tuşu,
// derin linkler, durum çubuğu, açılış ekranı).
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { Keyboard } from '@capacitor/keyboard';
import { Purchases, PRODUCT_CATEGORY, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
const cfg = window.DEMET || {};
const quiet = p => p.catch(() => {});

// Uygulama içi bir yola git: /b/ID, /esles/KOD, /#bahce ...
function go(pathname) {
  if (!pathname) return;
  const here = location.pathname + location.search + location.hash;
  if (pathname !== here) location.href = pathname;
}
function pathFromUrl(url) {
  try {
    const u = new URL(url);
    if (/^\/(b|esles)\//.test(u.pathname) || u.pathname === '/') return u.pathname + u.search + u.hash;
  } catch (e) {}
  return null;
}

// ---- durum çubuğu: açık temada koyu yazı, koyu temada açık yazı
const dark = matchMedia('(prefers-color-scheme: dark)');
const applyBars = () => quiet(SystemBars.setStyle({ style: dark.matches ? SystemBarsStyle.Dark : SystemBarsStyle.Light }));

// ---- bildirimler (Firebase Cloud Messaging; iOS'ta APNs üzerinden)
let messagingOk = null;
async function messaging() {
  if (messagingOk !== null) return messagingOk;
  try { messagingOk = (await FirebaseMessaging.isSupported()).isSupported; } catch (e) { messagingOk = false; }
  return messagingOk;
}
const push = {
  async state() {
    if (!(await messaging())) return 'unsupported';
    const p = await FirebaseMessaging.checkPermissions();
    if (p.receive === 'granted') return 'on';
    if (p.receive === 'denied') return 'denied';
    return 'off';
  },
  async enable() {
    if (!(await messaging())) throw new Error('Bu cihazda bildirimler kullanılamıyor.');
    let p = await FirebaseMessaging.checkPermissions();
    if (p.receive !== 'granted') p = await FirebaseMessaging.requestPermissions();
    if (p.receive !== 'granted') return null;
    return (await FirebaseMessaging.getToken()).token || null;
  },
  async token() {
    if (!(await messaging())) return null;
    const p = await FirebaseMessaging.checkPermissions();
    if (p.receive !== 'granted') return null;
    return (await FirebaseMessaging.getToken()).token || null;
  },
};

// ---- uygulama içi satın alma (RevenueCat): altın paketleri tüketilebilir ürün
let configuredFor = null;
const iap = {
  async configure(userId) {
    const apiKey = platform === 'ios' ? cfg.revenuecatIos : cfg.revenuecatAndroid;
    if (!apiKey || !userId) return false;
    if (configuredFor === userId) return true;
    if (configuredFor) await Purchases.logIn({ appUserID: userId });
    else { await quiet(Purchases.setLogLevel({ level: LOG_LEVEL.WARN })); await Purchases.configure({ apiKey, appUserID: userId }); }
    configuredFor = userId;
    return true;
  },
  async products(ids) {
    if (!configuredFor || !ids.length) return [];
    const { products } = await Purchases.getProducts({ productIdentifiers: ids, type: PRODUCT_CATEGORY.NON_SUBSCRIPTION });
    return products.map(p => ({ id: p.identifier, price: p.price, priceString: p.priceString, currency: p.currencyCode, title: p.title }));
  },
  async buy(id) {
    const { products } = await Purchases.getProducts({ productIdentifiers: [id], type: PRODUCT_CATEGORY.NON_SUBSCRIPTION });
    if (!products.length) throw new Error('Bu paket şu an satın alınamıyor.');
    try {
      const r = await Purchases.purchaseStoreProduct({ product: products[0] });
      return { ok: true, productId: r.productIdentifier };
    } catch (e) {
      if (e && (e.code === '1' || e.code === 1 || e.userCancelled)) return { cancelled: true };
      throw new Error((e && e.message) || 'Satın alma tamamlanamadı.');
    }
  },
};

const DemetNative = {
  isNative, platform, push, iap,
  haptic(kind = 'light') {
    if (kind === 'success') return quiet(Haptics.notification({ type: NotificationType.Success }));
    return quiet(Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }));
  },
  copy: text => Clipboard.write({ string: text }),
  async share({ title, text, url }) {
    try { await Share.share({ title, text: text || title, url, dialogTitle: title }); }
    catch (e) { if (!/cancel/i.test(String(e && e.message))) throw e; }
  },
  // hikâye videosu: önbelleğe yazıp paylaşma menüsünü aç (Instagram, Galeriye kaydet ...)
  async shareFile(blob, name) {
    const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
    try { await Share.share({ files: [uri], dialogTitle: 'Demet' }); }
    catch (e) { if (!/cancel/i.test(String(e && e.message))) throw e; }
  },
  openUrl: url => quiet(Browser.open({ url, presentationStyle: 'popover' })),
  // sayfa ilk ekranını çizince açılış ekranını kapat
  ready() { quiet(SplashScreen.hide({ fadeOutDuration: 250 })); },
};
window.DemetNative = DemetNative;

if (isNative) {
  applyBars();
  dark.addEventListener('change', applyBars);
  if (platform === 'ios') quiet(Keyboard.setAccessoryBarVisible({ isVisible: false }));
  // Android geri tuşu: önce açık pencereyi kapat, sonra bahçeden çık, en son uygulamayı arka plana al
  App.addListener('backButton', () => {
    const handled = typeof window.__demetBack === 'function' && window.__demetBack();
    if (!handled) App.minimizeApp();
  });
  // demet linkleri (buket, davet) uygulama yüklüyken doğrudan uygulamada açılır
  App.addListener('appUrlOpen', ({ url }) => go(pathFromUrl(url)));
  // uygulama kapalıyken bir linkle açıldıysa: o linke bir kez git (sayfa yeniden yüklenince tekrar gitme)
  quiet(App.getLaunchUrl().then(r => {
    const url = r && r.url; if (!url) return;
    let seen = null; try { seen = sessionStorage.getItem('demet-launch'); sessionStorage.setItem('demet-launch', url); } catch (e) {}
    if (seen !== url) go(pathFromUrl(url));
  }));
  // bildirime dokunulunca ilgili buketi ya da bahçeyi aç
  messaging().then(ok => {
    if (!ok) return;
    FirebaseMessaging.addListener('notificationActionPerformed', e => {
      const d = (e.notification && e.notification.data) || {};
      if (typeof d.url === 'string' && d.url.startsWith('/')) go(d.url);
    });
    if (platform === 'android') quiet(FirebaseMessaging.createChannel({ id: 'demet', name: 'Buketler', description: 'Gelen buketler ve cevaplar', importance: 4, visibility: 1, lights: true, vibration: true }));
  });
  // yedek: sayfa 8 saniyede hazır olmazsa açılış ekranını yine kapat
  setTimeout(() => DemetNative.ready(), 8000);
}
