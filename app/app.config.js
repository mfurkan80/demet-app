// app.json'u derleme anında tamamlar: sunucu adresi, RevenueCat anahtarları, sürüm numarası ve
// (varsa) Firebase ayar dosyası. Değerler GitHub Actions secret'larından ortam değişkeni olarak gelir.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const gs = path.join(__dirname, 'google-services.json');
  const build = parseInt(process.env.DEMET_BUILD || '1', 10) || 1;
  return {
    ...config,
    version: process.env.DEMET_VERSION || config.version,
    android: {
      ...config.android,
      versionCode: build,
      ...(fs.existsSync(gs) ? { googleServicesFile: './google-services.json' } : {}),
    },
    ios: { ...config.ios, buildNumber: String(build) },
    extra: {
      ...(config.extra || {}),
      api: process.env.DEMET_API || 'https://demet.furkansahin.me',
      revenuecatAndroid: process.env.REVENUECAT_ANDROID_KEY || '',
      revenuecatIos: process.env.REVENUECAT_IOS_KEY || '',
      push: fs.existsSync(gs),
      test: process.env.DEMET_TEST === '1',
    },
  };
};
