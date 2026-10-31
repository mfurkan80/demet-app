# Demet mobil uygulaması (iOS + Android)

Uygulama Capacitor ile yapıldı: web sitesindeki 3D uygulama, three.js ve fontlarla birlikte uygulamanın içine paketlenir ve
canlı sunucuya bağlanır. Uygulamaya özel olanlar:

- **Altın satışı** App Store / Google Play üzerinden (RevenueCat). Web sitesinde iyzico aynen kalır; bakiye tek hesapta birleşir.
- **Bildirimler** Firebase Cloud Messaging ile (iPhone'da Apple bildirim servisi üzerinden).
- **Linkler** (`/b/...` buket, `/esles/...` davet) uygulama yüklüyse doğrudan uygulamada açılır.
- Paylaşma, kopyalama, hikâye videosunu kaydetme, titreşim, Android geri tuşu, açılış ekranı, uygulama ikonu.

Paket kimliği: `me.furkansahin.demet` (değiştirmek istersen ilk yüklemeden önce `capacitor.config.json` içindeki `appId`'yi
değiştir, `npx cap sync` çalıştır. Mağazaya yüklendikten sonra değişmez.)

---

## 0. Gerekenler

- Mac, **Xcode** (App Store'dan), **Android Studio**, **Node 22**
- Apple Developer ve Google Play Console hesapları (abinin hesapları)
- Firebase projesi (ücretsiz) ve RevenueCat hesabı (ücretsiz)
- Sunucu yayında olmalı (Dokploy). Uygulama oradaki API'ye bağlanır.

```bash
git clone https://github.com/mfurkan80/demet-app.git
cd demet-app/mobile
npm install
cp app.config.example.json app.config.json   # içini aşağıdaki adımlarda dolduracaksın
```

`app.config.json`:

| alan | ne |
|---|---|
| `api`, `web` | Sunucunun adresi, ör. `https://demet.furkansahin.me` |
| `revenuecatIos` | RevenueCat > Project > API keys > **Apple public SDK key** (`appl_...`) |
| `revenuecatAndroid` | RevenueCat > Project > API keys > **Google public SDK key** (`goog_...`) |

Bu dosya repoya gönderilmez (`.gitignore`).

---

## 1. Firebase (bildirimler)

1. https://console.firebase.google.com → **Proje oluştur** (Analytics gerekmez).
2. **iOS uygulaması ekle**: paket kimliği `me.furkansahin.demet`. `GoogleService-Info.plist` dosyasını indir,
   `mobile/ios/App/App/` klasörüne koy. Xcode'da sol taraftaki **App** klasörüne sürükleyip “Copy items if needed” ve
   **App** hedefi işaretli olarak ekle.
3. **Android uygulaması ekle**: paket adı `me.furkansahin.demet`. `google-services.json` dosyasını indir,
   `mobile/android/app/` klasörüne koy.
4. **iPhone bildirimleri için APNs anahtarı**: Apple Developer → Certificates, IDs & Profiles → **Keys** → `+` →
   “Apple Push Notifications service (APNs)” → indir (`.p8`, bir kez indirilebilir, sakla).
   Firebase → Proje ayarları → **Cloud Messaging** → Apple uygulaması → APNs Authentication Key → `.p8` dosyasını,
   Key ID'yi ve Team ID'yi gir.
5. **Sunucunun bildirim gönderebilmesi için**: Firebase → Proje ayarları → **Hizmet hesapları** → “Yeni özel anahtar oluştur”.
   İnen JSON'u base64'e çevir ve Dokploy'da ortam değişkeni yap:
   ```bash
   base64 -i demet-firebase-adminsdk.json | tr -d '\n'     # çıktıyı kopyala
   ```
   `FCM_SERVICE_ACCOUNT=<çıktı>`
   Bu dosya gizlidir, repoya koyma.

---

## 2. Mağaza ürünleri (altın paketleri)

Dört tüketilebilir ürün. **Ürün kimlikleri birebir aynı olmalı** (sunucu bunlardan hangi paketin alındığını anlıyor):

| ürün kimliği | altın | web fiyatı (öneri) |
|---|---|---|
| `demet_gold_100` | 100 | 29,99 ₺ |
| `demet_gold_330` | 300 + 30 | 79,99 ₺ |
| `demet_gold_800` | 700 + 100 | 159,99 ₺ |
| `demet_gold_1800` | 1500 + 300 | 299,99 ₺ |

Mağaza komisyonu (%15) yüzünden uygulamadaki fiyatları biraz yüksek tutabilirsin; buna izin var.

**App Store Connect** → Uygulamalar → `+` Yeni uygulama (paket kimliği `me.furkansahin.demet`) → **Uygulama İçi Satın Alma** →
her biri için “Tüketilebilir” ürün, kimlik, fiyat, Türkçe görünen ad (“100 altın”) ve açıklama, inceleme için ekran görüntüsü
(mağaza ekranının görüntüsü yeter).
Ayrıca: Anlaşmalar, Vergi ve Bankacılık → **Ücretli Uygulamalar** sözleşmesi aktif olmalı, yoksa ürünler uygulamada görünmez.
%15 komisyon için: developer.apple.com/app-store/small-business-program adresinden başvuru.

**Google Play Console** → Uygulama oluştur → Para kazanma → **Uygulama içi ürünler** → aynı dört kimlik, fiyat, ad.
(Play Console ürün oluşturmaya izin vermeden önce uygulamanın bir sürümünü — dahili test yeterli — yüklemeni ister.)
%15 komisyon: Play Console → Ödeme profili / “15% hizmet ücreti programı”.

---

## 3. RevenueCat

1. https://app.revenuecat.com → proje oluştur (“Demet”).
2. **App Store uygulaması** ekle: paket kimliği, ve App Store Connect'ten oluşturulan **In-App Purchase anahtarı** (`.p8`)
   (RevenueCat ekranında nasıl oluşturulacağı anlatılıyor).
3. **Play Store uygulaması** ekle: paket adı ve Google Cloud **hizmet hesabı JSON**'u (RevenueCat'in rehberindeki
   Play Console izinleriyle).
4. **Products** → her iki mağaza için dört ürünü içe aktar. (Entitlement ya da Offering gerekmez; uygulama ürünleri
   kimlikleriyle çekiyor.)
5. **API keys**: Apple ve Google public SDK anahtarlarını `app.config.json`'a yaz. **Secret API key** (`sk_...`) →
   Dokploy'da `REVENUECAT_SECRET_KEY`.
6. **Integrations → Webhooks** → URL: `https://<alan-adın>/api/revenuecat/webhook`, Authorization header'a uzun rastgele bir
   değer yaz → aynısını Dokploy'da `REVENUECAT_WEBHOOK_AUTH` yap.

Satın alma akışı: uygulama ödemeyi mağazada tamamlar → hemen `/api/iap/sync` ile sunucuya haber verir → sunucu RevenueCat'e
sorar ve altını yükler. Webhook aynı işi arka planda da yapar. Her mağaza işlemi yalnızca bir kez altına çevrilir;
iade edilen satın almanın altını sunucu geri alır. Test (sandbox) satın almaları yönetim panelinde “test” olarak görünür ve
gelire sayılmaz.

---

## 4. Sunucu ortam değişkenleri (Dokploy)

Var olanlara ek olarak:

```
FCM_SERVICE_ACCOUNT=<firebase hizmet hesabı JSON'unun base64 hali>
REVENUECAT_SECRET_KEY=sk_...
REVENUECAT_WEBHOOK_AUTH=<webhook'a yazdığın değer>
IOS_APP_ID=<APPLE_TEAM_ID>.me.furkansahin.demet
ANDROID_PACKAGE=me.furkansahin.demet
ANDROID_SHA256=<Play Console > Uygulama bütünlüğü > Uygulama imzalama anahtarı sertifikası SHA-256>
LEGAL_NAME=<gizlilik ve koşullar sayfasındaki veri sorumlusu: ad soyad ya da şirket>
LEGAL_EMAIL=<destek e-postası>
LEGAL_ADDRESS=<adres>
```

`IOS_APP_ID` ve `ANDROID_*` linklerin uygulamada açılması içindir: sunucu bunlarla
`/.well-known/apple-app-site-association` ve `/.well-known/assetlinks.json` dosyalarını üretir.
Apple Team ID: developer.apple.com → Membership. Android SHA-256'ya yerelde test için upload anahtarınınkini de virgülle
ekleyebilirsin.

---

## 5. iPhone sürümü

```bash
npm run ios        # www'yi paketler, Xcode projesini günceller, Xcode'u açar
```

Xcode'da:
1. **App** hedefi → **Signing & Capabilities** → Team: abinin hesabı. “Automatically manage signing” açık.
2. Aynı ekranda **Push Notifications** ve **Associated Domains** yetkilerinin göründüğünü kontrol et (dosyası hazır:
   `App/App.entitlements`; görünmüyorsa `+ Capability` ile ekle, alan adı `applinks:<alan-adın>`).
3. Gerçek iPhone'u kablo ile bağla → ▶ ile çalıştır. (Bildirim ve satın alma simülatörde tam çalışmaz.)
4. Satın alma testi için: App Store Connect → Kullanıcılar ve Erişim → **Sandbox test hesabı** oluştur, iPhone'da
   Ayarlar → App Store → Sandbox hesabı ile giriş yap.
5. Yayın: **Product → Archive** → Distribute App → App Store Connect → TestFlight'a gider. Arkadaşlarını TestFlight'a
   ekleyip dağıtabilirsin; sonra App Store Connect'te incelemeye gönder.

## 6. Android sürümü

```bash
npm run android    # www'yi paketler, Android projesini günceller, Android Studio'yu açar
```

1. Android Studio Gradle senkronunu bitirince bir cihaz/emülatörde ▶ ile çalıştır.
2. Yayın: **Build → Generate Signed App Bundle** → yeni bir **upload keystore** oluştur. Keystore dosyasını ve şifresini
   kaybetme (repoya koyma); sonraki her güncellemede aynısı gerekir.
3. `.aab` dosyasını Play Console → Test → **Dahili test** ya da **Kapalı test** kanalına yükle, arkadaşlarını test
   listesine ekle. (2023 sonrası açılmış kişisel hesaplarda yayından önce 14 gün, en az 12 testçi şartı var.)

Her web güncellemesinden sonra uygulamaya almak için: `npm run sync`, sonra Xcode/Android Studio'dan yeni sürüm.
Sürüm numarası: Xcode'da *Version/Build*, Android'de `android/app/build.gradle` → `versionCode` (her yüklemede +1) ve `versionName`.

---

## 7. Mağaza sayfası için hazır bilgiler

- **Gizlilik politikası URL'si**: `https://<alan-adın>/gizlilik`
- **Kullanım koşulları**: `https://<alan-adın>/kosullar`
- **Hesap silme** (Google ister): uygulamada Hesabım → Hesabımı sil; web'de aynı adım. URL: `https://<alan-adın>/gizlilik#hesap-silme`
- **Kategori**: Yaşam tarzı (Lifestyle). **Yaş**: 12+ (kullanıcılar arası mesajlaşma/not içeriyor). Kullanıcı içeriği için
  bildirme ve engelleme var (alınan bukette ve bahçedeki buket ayrıntısında “Uygunsuz içerik bildir”; yönetim panelinde Şikayetler).
- **Apple gizlilik formu (App Privacy)**: Toplanan veriler — İletişim bilgisi (ad, e-posta), Kullanıcı içeriği (notlar, buketler),
  Tanımlayıcılar (kullanıcı kimliği, cihaz bildirim anahtarı), Satın almalar. Hepsi “uygulama işlevselliği” için, kimliğe bağlı,
  **izleme (tracking) yok**.
- **Google Veri güvenliği formu**: aynı veriler; aktarım sırasında şifreleniyor (HTTPS), kullanıcı silme talep edebilir,
  veriler üçüncü taraflarla paylaşılmıyor (ödeme ve bildirim hizmet sağlayıcıları hariç).
- **Kısa açıklama**: “Sevdiğine 3D buket yap, gönder; birlikte büyüyen bir bahçe kur.”
- **Uzun açıklama** (öneri):
  > Demet ile sevgiline, ailene ya da arkadaşına dakikalar içinde 3 boyutlu bir buket hazırla. Gülden şakayığa onlarca çiçek,
  > kraft ya da kadife kağıt, kurdele, inci, kelebek ve el yazısı bir not kartı… Buketini kendi ellerinle sar, gönder;
  > açtığında gözünün önünde açılsın.
  >
  > • Sevgilinle ortak bahçe: birbirinize gönderdiğiniz her buket Bahçemiz’de büyür.
  > • Kendi bahçen: sana gelen ve senin gönderdiğin bütün buketler bir arada.
  > • Özel günler: doğum günü ve yıldönümünü unutma, buketini önceden planla.
  > • Hikâye videosu: aldığın buketi Instagram hikâyende paylaş.
  > • Gece ve gündüz temaları, fenerler, ateş böcekleri ve sallanan çimler.

---

## Klasörler

```
mobile/
  capacitor.config.json      uygulama kimliği, eklenti ayarları
  app.config.example.json    sunucu adresi ve RevenueCat anahtarları şablonu
  src/native.js              native köprü (satın alma, bildirim, paylaşma, geri tuşu, linkler)
  scripts/build-www.mjs      ../public'i uygulamaya paketler (three.js ve fontlar dahil)
  scripts/configure-native.mjs  iOS/Android ayarları (dikey ekran, bildirim, linkler, yetkiler)
  assets/                    ikon ve açılış ekranı kaynakları (npm run assets ile tüm boyutlar üretilir)
  ios/, android/             native projeler
```
