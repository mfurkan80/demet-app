// Web dosyalarını uygulamanın içine paketler (mobile/www):
//  - ../public klasörünü kopyalar (servis çalışanı, yönetim paneli ve yasal şablonlar hariç)
//  - three.js'i ve fontları uygulamanın içine koyar, böylece 3D sahne internetten kütüphane indirmeden açılır
//  - app.config.json'daki sunucu adresini ve RevenueCat anahtarlarını sayfaya yazar
//  - native köprüyü (src/native.js) esbuild ile tek dosyaya paketler
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pub = path.resolve(root, '..', 'public');
const www = path.join(root, 'www');
const nm = path.join(root, 'node_modules');

const cfgFile = path.join(root, 'app.config.json');
if (!fs.existsSync(cfgFile)) {
  console.error('\n  mobile/app.config.json yok. app.config.example.json dosyasını kopyalayıp sunucu adresini yaz.\n');
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
if (process.env.DEMET_API) cfg.api = cfg.web = process.env.DEMET_API;
if (!/^https:\/\//.test(cfg.api || '') && !/^http:\/\/localhost(:\d+)?$/.test(cfg.api || '')) { console.error('  app.config.json: "api" https:// ile başlayan sunucu adresi olmalı.'); process.exit(1); }

fs.rmSync(www, { recursive: true, force: true });
const SKIP = new Set(['sw.js', 'admin.html', 'legal', 'manifest.webmanifest']);
fs.cpSync(pub, www, { recursive: true, filter: src => !SKIP.has(path.relative(pub, src).split(path.sep)[0]) });

// three.js: sadece kullanılan modüller
const three = path.join(nm, 'three');
const vend = path.join(www, 'vendor', 'three');
const files = ['build/three.module.js', 'examples/jsm/controls/OrbitControls.js', 'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/utils/BufferGeometryUtils.js', 'examples/jsm/environments/RoomEnvironment.js', 'examples/jsm/libs/meshopt_decoder.module.js'];
for (const f of files) {
  const out = path.join(vend, f.replace('build/', '').replace('examples/', ''));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(path.join(three, f), out);
}

// fontlar: Türkçe karakterler için latin + latin-ext
const fontDir = path.join(www, 'fonts');
fs.mkdirSync(fontDir, { recursive: true });
const fontCss = [];
function addFont(pkg, cssName, family) {
  const css = fs.readFileSync(path.join(nm, pkg, cssName), 'utf8');
  for (const block of css.split('/*').slice(1)) {
    const name = block.slice(0, block.indexOf('*/')).trim();
    if (!/-latin(-ext)?-/.test(name)) continue;
    let face = block.slice(block.indexOf('@font-face'));
    const woff2 = face.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
    fs.copyFileSync(path.join(nm, pkg, 'files', woff2), path.join(fontDir, woff2));
    face = face.replace(/src:[^;]+;/, `src: url(fonts/${woff2}) format('woff2');`)
      .replace(/font-family: '[^']+'/, `font-family: '${family}'`);
    fontCss.push(face.trim());
  }
}
for (const w of [400, 500, 600, 700]) addFont('@fontsource/figtree', `${w}.css`, 'Figtree');
for (const w of [500, 600]) addFont('@fontsource/caveat', `${w}.css`, 'Caveat');
addFont('@fontsource-variable/bricolage-grotesque', 'opsz.css', 'Bricolage Grotesque');
fs.writeFileSync(path.join(www, 'fonts.css'), fontCss.join('\n\n') + '\n');

// sayfa: CDN yerine yerel dosyalar, uygulama ayarları ve köprü
let html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const swap = (from, to) => { if (!html.includes(from)) { console.error('  index.html içinde bulunamadı:', from.slice(0, 80)); process.exit(1); } html = html.replace(from, to); };
swap('"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"', '"three": "./vendor/three/three.module.js"');
swap('"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"', '"three/addons/": "./vendor/three/jsm/"');
html = html.replace(/<link rel="preconnect"[^>]*>\n?/g, '');
html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts.css">');
html = html.replace('<link rel="manifest" href="/manifest.webmanifest">\n', '');
html = html.replace('<!--OG-->\n', '');
html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n<meta name="format-detection" content="telephone=no">');
const config = { api: cfg.api.replace(/\/+$/, ''), web: (cfg.web || cfg.api).replace(/\/+$/, ''), revenuecatIos: cfg.revenuecatIos || '', revenuecatAndroid: cfg.revenuecatAndroid || '' };
swap('<script type="importmap">', `<script>window.DEMET = ${JSON.stringify(config)};</script>\n<script src="native.js"></script>\n<script type="importmap">`);
html = html.replace('<style>:root{', '<style>html,body{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea{-webkit-user-select:text;user-select:text}:root{');
fs.writeFileSync(path.join(www, 'index.html'), html);

await esbuild.build({
  entryPoints: [path.join(root, 'src', 'native.js')], outfile: path.join(www, 'native.js'),
  bundle: true, format: 'iife', target: ['safari15', 'chrome100'], minify: true, legalComments: 'none',
  external: ['firebase', 'firebase/*'], logLevel: 'warning',
});
const size = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((s, d) => s + (d.isDirectory() ? size(path.join(dir, d.name)) : fs.statSync(path.join(dir, d.name)).size), 0);
console.log(`  www hazır (${(size(www) / 1048576).toFixed(1)} MB), sunucu: ${config.api}`);
