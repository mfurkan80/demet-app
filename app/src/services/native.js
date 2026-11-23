// Telefonun yerel özellikleri: titreşim, pano, paylaşma, tarayıcı, bildirimler ve uygulama içi satın alma.
import { Linking, Platform, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { CFG, api } from './api';
import { app } from '../state/store';

export const platform = Platform.OS;
const quiet = p => Promise.resolve(p).catch(() => {});

export const haptic = (kind = 'light') => {
  if (app.reduceHaptics) return;
  if (kind === 'success') return quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  if (kind === 'warn') return quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  if (kind === 'select') return quiet(Haptics.selectionAsync());
  return quiet(Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light));
};

export const copy = text => Clipboard.setStringAsync(text);

export const shareLink = async (url, title) => {
  try { await Share.share(Platform.OS === 'ios' ? { url, message: title } : { message: `${title}\n${url}`, title }); } catch (e) {}
};
export const shareFile = async (uri, mimeType = 'image/jpeg') => {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Paylaşma bu cihazda kullanılamıyor.');
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Demet' });
};
export const openUrl = url => quiet(WebBrowser.openBrowserAsync(url, { toolbarColor: '#FBFCFA', enableBarCollapsing: true }));
export const openWhatsApp = async text => {
  const deep = `whatsapp://send?text=${encodeURIComponent(text)}`;
  try { if (await Linking.canOpenURL(deep)) return Linking.openURL(deep); } catch (e) {}
  return Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
};
export const openSettings = () => quiet(Linking.openSettings());

/* ---------- notifications (Firebase Cloud Messaging on Android) */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
let channelReady = false;
const ensureChannel = async () => {
  if (channelReady || Platform.OS !== 'android') return;
  channelReady = true;
  await quiet(Notifications.setNotificationChannelAsync('default', {
    name: 'Buketler', description: 'Sana buket gelince ve gönderdiğin buket açılınca', importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#B5244D', vibrationPattern: [0, 180, 120, 180],
  }));
};
const pushSupported = () => !!CFG.push && app.NATIVE_PUSH !== false;
export const push = {
  supported: pushSupported,
  async state() {
    if (!pushSupported()) return 'unsupported';
    try {
      const p = await Notifications.getPermissionsAsync();
      if (p.granted) return 'on';
      return p.canAskAgain === false ? 'denied' : 'off';
    } catch (e) { return 'unsupported'; }
  },
  async token(ask) {
    if (!pushSupported()) return null;
    await ensureChannel();
    let p = await Notifications.getPermissionsAsync();
    if (!p.granted && ask && p.canAskAgain !== false) p = await Notifications.requestPermissionsAsync();
    if (!p.granted) return null;
    const t = await Notifications.getDevicePushTokenAsync();
    return (t && t.data) || null;
  },
};
// hand the device key to the server; it changes now and then, so it is sent again on every launch
export const registerPush = async ask => {
  if (!app.ME) return false;
  try {
    const token = await push.token(ask);
    if (!token) return false;
    await api('/push/native', { body: { token, platform } });
    return true;
  } catch (e) { return false; }
};
export const notificationUrl = r => {
  const c = r && r.notification && r.notification.request;
  if (!c) return null;
  const d = (c.content && c.content.data) || {};
  const rm = c.trigger && (c.trigger.remoteMessage || c.trigger.payload);
  return d.url || (rm && rm.data && rm.data.url) || null;
};

/* ---------- in-app purchases (RevenueCat): gold packs are consumable products */
let RC = null, configuredFor = null;
const rcMod = () => {
  if (RC === null) { try { RC = require('react-native-purchases'); } catch (e) { RC = false; } }
  return RC || null;
};
const rc = () => { const m = rcMod(); return m ? m.default : null; };
export const iap = {
  key: () => (Platform.OS === 'ios' ? CFG.revenuecatIos : CFG.revenuecatAndroid) || '',
  async configure(userId) {
    const P = rc(), apiKey = iap.key();
    if (!P || !apiKey || !userId) return false;
    if (configuredFor === userId) return true;
    try {
      if (configuredFor) await P.logIn(userId);
      else { const LL = rcMod().LOG_LEVEL || P.LOG_LEVEL; if (LL) quiet(P.setLogLevel(LL.WARN)); P.configure({ apiKey, appUserID: userId }); }
      configuredFor = userId; return true;
    } catch (e) { return false; }
  },
  async products(ids) {
    const P = rc(); if (!P || !configuredFor || !ids.length) return [];
    const m = rcMod(), list = await P.getProducts(ids, (m.PRODUCT_CATEGORY || P.PRODUCT_CATEGORY || {}).NON_SUBSCRIPTION);
    return list.map(p => ({ id: p.identifier, priceString: p.priceString, price: p.price, product: p }));
  },
  async buy(prod) {
    const P = rc(); if (!P) throw new Error('Satın alma kullanılamıyor.');
    try { await P.purchaseStoreProduct(prod.product); return { ok: true }; }
    catch (e) {
      if (e && (e.userCancelled || e.code === '1' || e.code === 1)) return { cancelled: true };
      throw new Error((e && e.message) || 'Satın alma tamamlanamadı.');
    }
  },
};
