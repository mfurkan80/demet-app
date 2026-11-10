// iOS ve Android projelerine Demet'e özel ayarları uygular. Tekrar tekrar çalıştırmak güvenlidir
// (npm run sync her seferinde çalıştırır). Alan adı app.config.json'daki "web" adresinden alınır.
//
// Android: dikey ekran, kenardan kenara görünüm, bildirim kanalı ve izni, demet linklerinin uygulamada açılması
// iOS:     sadece iPhone + dikey, bildirim için APNs anahtarının Firebase'e iletilmesi, push ve
//          associated domains yetkileri (entitlements), şifreleme beyanı
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
const capCfg = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
const host = new URL(process.env.DEMET_API || cfg.web || cfg.api).host;
const appId = capCfg.appId;
const read = f => fs.readFileSync(f, 'utf8');
const write = (f, s) => { fs.writeFileSync(f, s); console.log('  ✓', path.relative(root, f)); };

/* ---------------- Android ---------------- */
const andr = path.join(root, 'android', 'app', 'src', 'main');
if (fs.existsSync(andr)) {
  const mf = path.join(andr, 'AndroidManifest.xml');
  let m = read(mf);
  if (!m.includes('android:screenOrientation')) m = m.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"\n            android:windowSoftInputMode="adjustResize"');
  m = m.replace(/\n\s*<!-- demet:links -->[\s\S]*?<!-- \/demet:links -->/, '');
  m = m.replace(/(<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>\s*<\/intent-filter>)/, `$1
            <!-- demet:links -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${host}" android:pathPrefix="/b/" />
                <data android:scheme="https" android:host="${host}" android:pathPrefix="/esles/" />
            </intent-filter>
            <!-- /demet:links -->`);
  // Firebase bildirim ayarları: önce eski kayıtları (biçimi ne olursa olsun) kaldır, sonra tek blok olarak ekle
  m = m.replace(/\n\s*<!-- demet:fcm -->[\s\S]*?<!-- \/demet:fcm -->/, '');
  m = m.replace(/\s*<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_[a-z_]+"[^>]*?\/>/g, '');
  m = m.replace(/\s*<provider/, `

        <!-- demet:fcm -->
        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="demet" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_demet" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/demet_accent" />
        <!-- /demet:fcm -->

        <provider`);
  if (!m.includes('android:screenOrientation')) m = m.replace(/android:name="\.MainActivity"/, 'android:name=".MainActivity"\n            android:screenOrientation="portrait"\n            android:windowSoftInputMode="adjustResize"');
  if (!m.includes('POST_NOTIFICATIONS')) m = m.replace(/<uses-permission android:name="android\.permission\.INTERNET"\s*\/>/, '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n    <uses-permission android:name="android.permission.VIBRATE" />');
  write(mf, m);

  // renkler: açık ve koyu tema (durum çubuğunun arkası, açılışta görünen zemin)
  const colorsXml = (bg, accent) => `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="demet_accent">${accent}</color>\n    <color name="demet_bg">${bg}</color>\n</resources>\n`;
  write(path.join(andr, 'res', 'values', 'demet_colors.xml'), colorsXml('#FBFCFA', '#B5244D'));
  fs.mkdirSync(path.join(andr, 'res', 'values-night'), { recursive: true });
  write(path.join(andr, 'res', 'values-night', 'demet_colors.xml'), colorsXml('#161F1A', '#F0728F'));

  // uygulama teması: pencere zemini uygulamanın zemin rengi olsun (sistem çubuklarının arkası beyaz/gri kalmasın)
  // açılış zemini: düz renk ve ortada, oranı bozulmadan duran açılış görseli
  write(path.join(andr, 'res', 'drawable', 'demet_launch.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/demet_bg" />
    <item><bitmap android:gravity="center" android:src="@drawable/splash" /></item>
</layer-list>
`);
  const stylesF = path.join(andr, 'res', 'values', 'styles.xml');
  let st = read(stylesF);
  st = st.replace(/\s*<item name="android:windowBackground">@color\/demet_bg<\/item>/g, '');
  st = st.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, '$1\n        <item name="android:windowBackground">@color/demet_bg</item>');
  // açılış teması: başlık çubuğu olmasın (yoksa açılış görseli üstte ezik bir çubuk olarak kalıyordu),
  // görsel yalnızca pencere zemininde dursun ve açılıştan sonra uygulamanın kendi temasına geçilsin
  st = st.replace(/<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/, `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowBackground">@drawable/demet_launch</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="windowActionBar">false</item>
        <item name="windowSplashScreenBackground">@color/demet_bg</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>`);
  write(stylesF, st);

  const act = path.join(andr, 'java', ...appId.split('.'), 'MainActivity.java');
  write(act, `package ${appId};

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // pencere uygulamanın kendi temasıyla kurulduktan sonra kenardan kenara çiz
        EdgeToEdge.enable(this);
        // Telefonda yazı boyutu çok büyütülmüşse ekranlar taşmasın: sistem ayarını %90-%110 aralığında uygula
        if (bridge != null && bridge.getWebView() != null) {
            WebSettings ws = bridge.getWebView().getSettings();
            float scale = getResources().getConfiguration().fontScale;
            ws.setTextZoom(Math.round(Math.max(0.9f, Math.min(1.1f, scale)) * 100));
            bridge.getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        }
    }
}
`);
}

/* ---------------- iOS ---------------- */
const iosApp = path.join(root, 'ios', 'App', 'App');
if (fs.existsSync(iosApp)) {
  const plistF = path.join(iosApp, 'Info.plist');
  let p = read(plistF);
  const setKey = (key, xml) => {
    const re = new RegExp(`\\s*<key>${key}</key>\\s*(<array>[\\s\\S]*?</array>|<dict>[\\s\\S]*?</dict>|<[^>]+/>|<string>[^<]*</string>)`);
    p = re.test(p) ? p.replace(re, `\n\t<key>${key}</key>\n\t${xml}`) : p.replace(/<\/dict>\s*<\/plist>\s*$/, `\t<key>${key}</key>\n\t${xml}\n</dict>\n</plist>\n`);
  };
  setKey('UISupportedInterfaceOrientations', '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>');
  setKey('UIRequiredDeviceCapabilities', '<array>\n\t\t<string>arm64</string>\n\t</array>');
  setKey('UIBackgroundModes', '<array>\n\t\t<string>remote-notification</string>\n\t</array>');
  setKey('ITSAppUsesNonExemptEncryption', '<false/>');
  setKey('CFBundleDevelopmentRegion', '<string>tr</string>');
  setKey('UIStatusBarStyle', '<string>UIStatusBarStyleDefault</string>');
  write(plistF, p);

  const ent = path.join(iosApp, 'App.entitlements');
  write(ent, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>aps-environment</key>
\t<string>development</string>
\t<key>com.apple.developer.associated-domains</key>
\t<array>
\t\t<string>applinks:${host}</string>
\t</array>
</dict>
</plist>
`);

  const pbx = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  let x = read(pbx);
  x = x.replace(/(\t+)PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);\n/g, (all, tab, id) => all + (x.includes('CODE_SIGN_ENTITLEMENTS') ? '' : `${tab}CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n`));
  x = x.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g, 'TARGETED_DEVICE_FAMILY = 1;');
  write(pbx, x);

  const ad = path.join(iosApp, 'AppDelegate.swift');
  let a = read(ad);
  if (!a.includes('capacitorDidRegisterForRemoteNotifications')) {
    a = a.replace(/\n\s*func applicationWillResignActive/, `

    // Bildirimler: APNs anahtarını Firebase Messaging eklentisine ilet
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillResignActive`);
    write(ad, a);
  }
}
console.log(`  native ayarlar uygulandı (alan adı: ${host})`);
