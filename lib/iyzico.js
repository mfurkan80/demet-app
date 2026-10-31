// iyzico Ödeme Formu (Checkout Form) entegrasyonu, paketsiz.
// Kimlik doğrulama: IYZWSv2 (HMAC-SHA256), https://docs.iyzico.com/en/getting-started/preliminaries/authentication/hmacsha256-auth
//
// Ortam değişkenleri:
//   IYZICO_API_KEY, IYZICO_SECRET_KEY   (iyzico panelinden)
//   IYZICO_BASE_URL                     varsayılan sandbox: https://sandbox-api.iyzipay.com
//                                       canlı: https://api.iyzipay.com
const crypto = require('crypto');

const API_KEY = process.env.IYZICO_API_KEY || '';
const SECRET = process.env.IYZICO_SECRET_KEY || '';
const BASE = (process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com').replace(/\/+$/, '');
const enabled = !!(API_KEY && SECRET);

function authHeaders(uriPath, bodyStr) {
  const rnd = Date.now() + crypto.randomBytes(6).toString('hex');
  const signature = crypto.createHmac('sha256', SECRET).update(rnd + uriPath + bodyStr).digest('hex');
  const auth = Buffer.from(`apiKey:${API_KEY}&randomKey:${rnd}&signature:${signature}`).toString('base64');
  return { Authorization: `IYZWSv2 ${auth}`, 'x-iyzi-rnd': rnd, 'Content-Type': 'application/json', Accept: 'application/json' };
}
async function call(uriPath, body) {
  const bodyStr = JSON.stringify(body);
  const res = await fetch(BASE + uriPath, { method: 'POST', headers: authHeaders(uriPath, bodyStr), body: bodyStr });
  const json = await res.json().catch(() => ({}));
  if (json.status !== 'success') {
    const err = new Error(json.errorMessage || `iyzico hata ${res.status}`);
    err.iyzico = json;
    throw err;
  }
  return json;
}
const money = n => (Math.round(n * 100) / 100).toFixed(2);

// Ödeme sayfasını başlatır, { token, paymentPageUrl } döner.
// Not: iyzico alıcı için ad, soyad, T.C. kimlik no ve adres ister. Sözleşmene göre bunları kullanıcıdan
// toplaman gerekebilir; aşağıdaki varsayılanlar sadece dijital ürün satışı için yer tutucudur.
async function initialize({ purchase, pack, user, ip, callbackUrl }) {
  const [name, ...rest] = (user.name || 'Demet Kullanıcısı').trim().split(/\s+/);
  const city = process.env.IYZICO_BUYER_CITY || 'Bursa';
  const address = process.env.IYZICO_BUYER_ADDRESS || 'Dijital ürün, adres gerekmez';
  const body = {
    locale: 'tr', conversationId: purchase.id, price: money(pack.price), paidPrice: money(pack.price), currency: 'TRY',
    basketId: purchase.id, paymentGroup: 'PRODUCT', callbackUrl, enabledInstallments: [1],
    buyer: {
      id: user.id, name: name || 'Demet', surname: rest.join(' ') || 'Kullanıcısı',
      email: user.email || `${user.id}@kullanici.demet`, identityNumber: process.env.IYZICO_DEFAULT_IDENTITY || '11111111111',
      registrationAddress: address, ip: ip || '85.34.78.112', city, country: 'Turkey',
    },
    billingAddress: { contactName: user.name || 'Demet Kullanıcısı', city, country: 'Turkey', address },
    basketItems: [{ id: pack.id, name: `${pack.gold + pack.bonus} altın`, category1: 'Dijital içerik', itemType: 'VIRTUAL', price: money(pack.price) }],
  };
  const r = await call('/payment/iyzipos/checkoutform/initialize/auth/ecom', body);
  return { token: r.token, paymentPageUrl: r.paymentPageUrl };
}

// Geri dönüşteki token ile ödemenin sonucunu iyzico'dan sorar.
async function retrieve(token, conversationId) {
  return call('/payment/iyzipos/checkoutform/auth/ecom/detail', { locale: 'tr', conversationId, token });
}

module.exports = { enabled, initialize, retrieve, money, BASE };
