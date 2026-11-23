# Demet: Google Play'e çıkış

Bu klasör Demet'in React Native (Expo) uygulamasıdır. Derleme GitHub Actions'ta yapılır (`.github/workflows/rn-android.yml`).

## Derlemeler

| Ne | Nerede |
| --- | --- |
| Deneme APK'sı (telefona doğrudan kurulur) | `android-beta` sürümü → `demet.apk` |
| Play Console'a yüklenecek paket (AAB) | `android-store` sürümü → `demet.aab` |
| Emülatör testi ekran görüntüleri ve günlük | `rn-test` sürümü |

Sürüm kodu her derlemede GitHub çalıştırma numarasıyla artar (`versionCode`). Sürüm adı `app.json` içindeki `version` alanıdır.

## Gerekli GitHub secret'ları (Settings → Secrets and variables → Actions)

| Secret | Ne için |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Yükleme anahtarı (upload key), `base64 -w0 demet.jks` çıktısı |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Anahtarın şifreleri ve adı |
| `GOOGLE_SERVICES_JSON_BASE64` | Firebase `google-services.json` (bildirimler için), base64 |
| `REVENUECAT_ANDROID_KEY` | RevenueCat Android public anahtarı (`goog_...`), altın satışı için |

Anahtar verilmezse her derlemede geçici bir anahtar üretilir; bu derleme Play'e yüklenemez ve telefonda güncellemek için eski uygulamayı silmek gerekir.

Anahtar üretmek için (bir kez, güvenli bir yerde sakla):

```bash
keytool -genkeypair -v -keystore demet.jks -alias demet -keyalg RSA -keysize 2048 -validity 10000
```

## Sunucu ayarları

- `ANDROID_PACKAGE=me.furkansahin.demet`
- `ANDROID_SHA256=` Play Console → Uygulama bütünlüğü → Uygulama imzalama anahtarı sertifikasının SHA-256 parmak izi (yükleme anahtarınınkini de virgülle ekleyebilirsin). Bu olunca `demet.furkansahin.me/b/...` ve `/esles/...` linkleri doğrudan uygulamada açılır.
- `FCM_SERVICE_ACCOUNT` Firebase servis hesabı JSON'u (bildirim göndermek için).
- `REVENUECAT_SECRET_KEY` RevenueCat gizli anahtarı (satın almaları doğrulamak için).

## Play Console: mağaza kaydı

**Uygulama adı:** Demet: Çiçek Gönder

**Kısa açıklama (80 karakter):** 3D buketini kendin yap, sevdiğine gönder. Bahçeniz birlikte büyüsün.

**Tam açıklama:**

Demet ile sevdiğine çiçek göndermek bir mesaj yazmak kadar kolay, ama çok daha güzel.

🌹 Buketini çiçek çiçek kendin yap
Gül, lale, şakayık, ayçiçeği, orkide ve daha fazlası. Her çiçeğin rengini seç, yeşilliklerle zenginleştir, buketi parmağınla çevirip her açıdan bak.

🎀 Kağıdına sar, kurdelesini bağla
Kraft, kadife, altın kenarlı, gazete ya da kristal kağıt. Saten, simli ya da inci dizili kurdele. Kalpler, kelebekler, peri ışıkları, ayıcık ve hatta yüzük kutusu.

💌 Notunu el yazısıyla yaz
Kartına ne hissettiğini yaz, imzanı at.

📨 Gönder, onun ekranında açılsın
Sevgiline ya da arkadaşına doğrudan gönder, bildirim gitsin. Ya da bir link oluştur, WhatsApp'tan istediğin kişiye at; açan kişi hiçbir şey indirmeden buketi görür. Doğum günü ya da yıldönümü için gece yarısına planla.

🌷 Bahçeniz birlikte büyüsün
Gönderdiğin ve aldığın her buket bahçene ekilir. Sevgilinle ortak bahçeniz olur; her gün çiçek gönderip serinizi sürdürün.

📸 Hikâyende paylaş
Gelen buketi Instagram hikâyen için hazır bir görselle paylaş.

Temel çiçekler ve mat kağıt her zaman ücretsiz. Premium çiçekler ve özel süsler için altın kullanılır; her gün ücretsiz altın hediyeni almayı unutma.

**Kategori:** Yaşam tarzı (Lifestyle) · **Etiketler:** hediye, sevgili, çiçek

## Veri güvenliği formu (özet)

- Toplanan veriler: ad (kullanıcının girdiği), e-posta (hesap oluşturursa), uygulama içi mesajlar (buket notları), satın alma geçmişi, cihaz kimliği (bildirim anahtarı).
- Amaç: uygulamanın çalışması ve hesap yönetimi. Reklam ya da analiz için toplanmaz, üçüncü taraflarla paylaşılmaz.
- Veriler aktarım sırasında şifrelenir (HTTPS). Kullanıcı hesabını uygulamadan silebilir (Hesabım → Hesabımı sil).
- Gizlilik politikası: https://demet.furkansahin.me/gizlilik

## İçerik derecelendirmesi

Kullanıcılar birbirine mesaj (buket notu) gönderebildiği için "kullanıcılar arası etkileşim" işaretlenmeli. Uygulamada bildirme ve engelleme vardır (buket ayrıntısı → Uygunsuz içerik bildir).

## Uygulama içi ürünler (Play Console → Para kazanma → Uygulama içi ürünler)

Tüketilebilir ürünler: `demet_gold_100`, `demet_gold_330`, `demet_gold_800`, `demet_gold_1800`. Aynı kimliklerle RevenueCat'e de eklenmeli.
