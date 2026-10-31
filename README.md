# Demet

Sevdiğine 3D buket yapıp gönderdiğin web uygulaması. Telefona uygulama gibi yüklenir, buket gelince bildirim gönderir,
gelen ve giden buketler ortak bir bahçede birikir.

## Çalıştırma

Node.js 18 veya üstü gerekir.

```bash
npm install
npm start
```

Sonra http://localhost:5173 adresini aç. Terminal, aynı Wi-Fi'deki telefondan açmak için yerel ağ adresini de yazar.

Port doluysa: `PORT=3000 npm start`

## Neler var

- **Buket stüdyosu**: 16 çiçek, 4 yeşillik, sarma animasyonu, premium kağıt/kurdele/süsler, not kartı
- **Hesap**: ilk açılışta bahçenin önünde karşılama ekranı çıkar: Hesap oluştur, Giriş yap ya da Misafir olarak giriş yap. Misafir olarak giren kişi arka planda misafir hesabıyla çalışır, üst bardaki "Giriş yap" ile istediği an kayıt olur. Var olan hesaba giriş yapınca o cihazda misafirken gönderilen buketler hesaba taşınır (hoş geldin altınıyla açılan parçalar taşınmaz).
- **Eşleşme**: Hesabım > Davet linki oluştur. Eşin linki açınca ya da 6 haneli kodu girince eşleşirsiniz
- **Sevgili ve arkadaşlar**: herkes bir sevgili (ortak bahçe) ve istediği kadar arkadaş ekleyebilir. Davet linki ya da 6 haneli kodla; sevgili daveti tek kullanımlık, arkadaş daveti 7 gün boyunca birden fazla kişiyle paylaşılabilir. Sevgili kaldırılınca ortak bahçe ikisi için de kapanır, buketler herkesin kendi bahçesinde kalır.
- **Gönderme**: gönderirken kişi seçilir: sevgilin, bir arkadaşın (doğrudan gider, bildirim düşer) ya da link ile herkese (WhatsApp'tan)
- **Alıcı ekranı**: `/b/<id>` linkini açan kişi hiçbir şey indirmeden zarfı açar, buket gözünün önünde sarılır
- **Bildirimler**: buket gelince, gönderdiğin buket açılınca, eşleşince (Web Push)
- **Telefona yükleme**: manifest + service worker, modeller önbelleğe alınır
- **İki bahçe**: *Bahçem* gönderdiğin ve sana gelen bütün buketleri, *Bahçemiz* sadece sevgilinle birbirinize gönderdiklerinizi gösterir (ikiniz de aynı bahçeyi görürsünüz). Bahçemiz'de iki kişilik bank, kemerde iki ismin yazdığı tabela ve ağaçlardan kemere ışık zinciri var; Bahçem'de tek sandalye ve kişinin adı. Blender'da modellenen kiraz ağaçları, gül kemeri, fenerler ve çalılar; her buket taş yolun kenarında kendi tarhına, el yazısı tabelasıyla ekilir. Açık temada gün batımı, koyu temada fenerler ve ateş böcekleri. Seri Bahçem'de senin gönderdiğin günleri, Bahçemiz'de ikinizin birbirine gönderdiği günleri sayar.
- **Altın**: bakiye, kilitler ve günlük hediye sunucuda tutulur; fiyatlar sunucuda doğrulanır
- **Ödeme**: iyzico Ödeme Formu; anahtar yoksa deneme modu
- **Özel günler**: doğum günü, yıldönümü ve başka günler; 3 gün önce, 1 gün önce ve günü gelince bildirim, uygulamada "Hazırla" bandı
- **Zamanlanmış gönderim**: Şimdi / Gece 00:00 / yaklaşan özel gün / istenen tarih. Zamanı gelene kadar zarf kilitli kalır, geri sayım görünür. Gitmeden iptal edilirse altın iade edilir
- **Karşılık ver**: alıcı kalp, hazır cevaplar ya da kısa bir notla cevap verir; gönderene bildirim gider, bahçede görünür
- **Hikâye videosu**: alıcı, buketin kendi etrafında döndüğü 9:16 videoyu kaydedip Instagram hikâyesinde paylaşır (MP4 destekleyen tarayıcıda MP4, yoksa WebM)

## Zamanlayıcı

Sunucu her 30 saniyede bir zamanı gelen buketleri teslim eder ve özel gün hatırlatmalarını gönderir
(Türkiye saatiyle 10:00'dan sonra, her hatırlatma bir kez). Sunucu kapalıyken zamanı geçen buketler
sunucu açılınca hemen teslim edilir.

## Önemli: HTTPS

Bildirimler ve "ana ekrana ekle" yalnızca HTTPS'te (ya da bilgisayarda `localhost`'ta) çalışır.
Telefondan `http://192.168.x.x:5173` ile açınca buket yapıp gönderebilirsin ama bildirim ve yükleme çıkmaz.
Bunları telefonda denemek için sunucuya yüklemen gerekir.

## Sunucuya yükleme (Dokploy)

Projede bir `Dockerfile` var. Dokploy'da yeni bir uygulama aç, bu klasörü Git'ten bağla ve:

- Port: `3000`
- Ortam değişkenleri: `.env.example` dosyasına bak. En azından `PUBLIC_URL` gerekli (WhatsApp önizlemesi ve linkler için)
- Kalıcı volume: `/app/data`. Yoksa her yeniden yüklemede hesaplar ve buketler silinir

## Ödeme (iyzico)

`IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` girilince altın paketleri iyzico'nun ödeme sayfasına yönlendirir,
ödeme bitince iyzico `/api/iyzico/callback` adresine döner ve altın hesaba bir kez yüklenir.

- Önce sandbox anahtarlarıyla dene (`IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`), canlıya geçince `https://api.iyzipay.com` yap
- Entegrasyon resmi iyzico paketi yerine doğrudan REST ile yazıldı (resmi paket güvenlik açıkları olan eski bir kütüphaneye bağlı).
  İmza yöntemi dokümandaki HMAC-SHA256 (IYZWSv2); sahte bir sunucuyla test edildi, gerçek sandbox'ta henüz denenmedi
- iyzico alıcının adını, T.C. kimlik numarasını ve adresini ister. Şu an `lib/iyzico.js` içinde yer tutucu değerler var;
  iyzico sözleşmene göre bunları kullanıcıdan toplaman gerekebilir
- Gerçek satış için şirket (şahıs şirketi yeterli olabilir), mesafeli satış sözleşmesi ve dijital içerikte cayma hakkı
  onayı gibi yasal adımları tamamlaman gerekir

## Yönetim paneli

`/admin` adresinde açılır. Sunucuda `ADMIN_PASSWORD` ortam değişkeni ayarlı değilse panel tamamen kapalıdır.

- Genel durum: kayıtlı ve misafir kullanıcılar, son 7 günde aktif olanlar, eşleşen çiftler, buketler, dolaşımdaki altın, gelir
- Kullanıcılar: arama (ad, e-posta, kimlik), filtre (kayıtlı, misafir, eşli, ödeme yapan), sıralama
- Kullanıcı ayrıntısı: hesap bilgileri, açtığı premium parçalar, son buketleri, satın almaları
- Altın ekleme ve düşme: neden yazmak zorunlu, bakiye eksiye düşemez, istenirse kullanıcıya bildirim gider. Her işlem `adminLog` kaydına düşer.
- Satın almalar ve altın işlemleri listesi

Giriş denemeleri 15 dakikada 8 ile sınırlı; oturum 12 saat geçerli ve sunucu yeniden başlayınca kapanır. Uzun ve tahmin edilemez bir şifre kullan.

## Klasörler

- `server.js` : HTTP sunucusu ve bütün API uçları
- `lib/store.js` : tek dosyalı veri deposu (`data/db.json`), ileride MySQL'e taşınabilir
- `lib/catalog.js` : fiyatlar, kilitler, altın paketleri
- `lib/push.js` : Web Push bildirimleri
- `lib/iyzico.js` : iyzico ödeme formu
- `public/index.html` : uygulamanın tamamı (arayüz + three.js sahnesi)
- `public/sw.js`, `public/manifest.webmanifest`, `public/icons/` : telefona yükleme ve bildirimler
- `public/models.json`, `public/garden.json`, `public/thumbs/` : 3D modeller ve küçük resimler
- `blender/` : modelleri üreten Blender Python kodu

## API

| Uç | Ne yapar |
| --- | --- |
| `POST /api/session` | misafir hesabı açar, token döner |
| `POST /api/register`, `POST /api/login`, `POST /api/logout` | e-posta/şifre |
| `GET /api/me`, `PATCH /api/me` | hesap, cüzdan, eş |
| `POST /api/invite`, `GET /api/invite/:kod`, `POST /api/invite/:kod/accept`, `POST /api/unpair` | eşleşme |
| `POST /api/unlock`, `POST /api/daily`, `POST /api/purchase`, `POST /api/iyzico/callback` | altın |
| `GET /api/bouquets`, `POST /api/bouquets` | gelen/giden buketler, gönderme |
| `GET /api/bouquets/:id`, `POST /api/bouquets/:id/open`, `GET /api/bouquets/:id/image.jpg` | alıcı tarafı |
| `DELETE /api/bouquets/:id` | planlanmış ama gitmemiş buketi iptal eder, altını iade eder |
| `POST /api/bouquets/:id/react` | alıcının cevabı (`heart`, `thanks`, `love`, `wow`, `note`) |
| `POST /api/days`, `DELETE /api/days/:id` | özel günler |
| `POST /api/push`, `DELETE /api/push`, `POST /api/push/test` | bildirim aboneliği |
| `POST /api/invite` | davet linki ve kodu (`kind`: `partner` ya da `friend`) |
| `DELETE /api/friends/:id` | arkadaşlıktan çıkar |

Kimlik doğrulama `Authorization: Bearer <token>` ile. Token tarayıcının localStorage'ında `demet-token` anahtarında durur.

## Modelleri yeniden üretmek

```bash
pip install bpy==5.2.3
cd blender
python build.py --export          # tüm modelleri ../assets klasörüne GLB olarak çıkarır
python build.py rose --preview    # tek bir çiçeğin önizlemesini ../preview klasörüne render eder
python build.py g_tree g_bench g_arch g_lantern --export   # bahçe parçaları (ortam gölgesi köşe renklerine pişirilir)
```

GLB'ler `gltf-transform meshopt` ile sıkıştırılıp base64 olarak `public/models.json` (stüdyo) ve `public/garden.json` (bahçe: çiçeklerin hafif sürümleri + `g_` ile başlayan bahçe parçaları) içine konur. `garden.json` değişirse `index.html` içindeki `garden.json?v=` numarasını artır.
