// Katalog: çiçekler, yeşillikler, kağıtlar, kurdeleler, süsler, altın paketleri (web sürümüyle aynı).
export const TIE = 0.24;
export const PHI = Math.PI * (3 - Math.sqrt(5));
export const MAX_MAIN = 25, MAX_FILL = 10;

export const FLOWERS = {
  rose:       { name: 'Gül', area: .045, colors: [['Kırmızı','#B3122E'],['Bordo','#6E0F1F'],['Pembe','#E9758F'],['Pudra','#F2C4CC'],['Beyaz','#F4EFE8'],['Şeftali','#F4A77E'],['Sarı','#F2CF5B']] },
  tulip:      { name: 'Lale', area: .028, lift: -.07, colors: [['Pembe','#F07CA0'],['Kırmızı','#D7263D'],['Beyaz','#F5F1EA'],['Sarı','#F6C945'],['Mor','#7B3F8C'],['Turuncu','#F08A3C']] },
  daisy:      { name: 'Papatya', area: .04, lift: .08, colors: [['Beyaz','#F8F6F1'],['Pembe','#F28AA8'],['Sarı','#F5D04E'],['Mavi','#8FB3E8']] },
  sunflower:  { name: 'Ayçiçeği', area: .07, lift: .1, colors: [['Sarı','#F6B91C'],['Turuncu','#E8821E']] },
  carnation:  { name: 'Karanfil', area: .03, lift: .04, colors: [['Kırmızı','#C0142C'],['Pembe','#F28AA8'],['Beyaz','#F6F2EC'],['Sarı','#F2CF5B'],['Mor','#8B3F8C']] },
  ranunculus: { name: 'Düğün çiçeği', area: .032, lift: .03, colors: [['Şeftali','#F7956F'],['Pembe','#F49AB0'],['Sarı','#F4C84D'],['Beyaz','#F6F1E8'],['Kırmızı','#C8213A']] },
  anemone:    { name: 'Anemon', area: .032, lift: .06, colors: [['Beyaz','#F8F8F8'],['Kırmızı','#C41E3A'],['Mor','#6B3FA0'],['Pembe','#F09AB6']] },
  poppy:      { name: 'Gelincik', area: .036, lift: .05, colors: [['Kırmızı','#D7261E'],['Turuncu','#F26A1B'],['Beyaz','#F4F0E8']] },
  calla:      { name: 'Kala', area: .02, lift: -.03, colors: [['Beyaz','#F7F5EE'],['Sarı','#F2C744'],['Mor','#4B1F4E'],['Pembe','#F0A3B8']] },
  lavender:   { name: 'Lavanta', area: .016, lift: -.03, colors: [['Lavanta','#8E72C7'],['Açık lila','#B9A3E0'],['Beyaz','#EDE7F6']] },
  peony:      { name: 'Şakayık', price: 6, area: .062, lift: .01, colors: [['Pembe','#F3A6B5'],['Pudra','#F7D3D8'],['Beyaz','#F6F0EA'],['Mercan','#F27C73'],['Bordo','#8E1F3A']] },
  lily:       { name: 'Zambak', price: 5, area: .05, lift: -.01, colors: [['Beyaz','#F7F4EE'],['Pembe','#F2A1B8'],['Turuncu','#F0883A'],['Sarı','#F5CD55']] },
  hydrangea:  { name: 'Ortanca', price: 5, area: .075, lift: .02, colors: [['Mavi','#7E97E0'],['Lila','#B6A0E0'],['Pembe','#F2A9C4'],['Beyaz','#F3F1EE']] },
  orchid:     { name: 'Orkide', price: 12, area: .04, lift: -.06, colors: [['Beyaz','#F8F2F5'],['Pembe','#EFA3C8'],['Mor','#9B4DA8']] },
  rose_gold:  { name: 'Altın gül', price: 25, area: .045, model: 'rose', colors: [['Altın','#E2B455'],['Gül altın','#E8A98E'],['Gümüş','#D4D7DE']] },
  rose_night: { name: 'Gece gülü', price: 20, area: .045, model: 'rose', colors: [['Gece mavisi','#1D2C78'],['Mor','#3E1B6E'],['Zümrüt','#0F5144']] },
};
export const FILLERS = {
  gypsophila: { name: 'Cipso', colors: [['Beyaz','#FBFAF7'],['Pembe','#F6CCD8'],['Lila','#D9CCF2']], lift: 0 },
  eucalyptus: { name: 'Okaliptüs', colors: [['Gümüş yeşili','#7FA593']], lift: -.08 },
  fern:       { name: 'Eğrelti', colors: [['Yeşil','#4F8A3F']], lift: -.08 },
  cotton:     { name: 'Pamuk', price: 3, colors: [['Beyaz','#FAF8F3']], lift: -.05 },
};
export const ALL = { ...FLOWERS, ...FILLERS };
export const CENTER = { daisy: '#F2B630', sunflower: '#4A2A12', ranunculus: '#7C9A45', lily: '#7A3410', calla: '#F2B630', anemone: '#1A1B2E', poppy: '#1C1A1A', orchid: '#C2306A' };
export const STEMC = { eucalyptus: '#6E8A72', cotton: '#5A4532', fern: '#4C7A3C', carnation: '#6F947C' };
export const LEAFC = { eucalyptus: '#7FA593', fern: '#4F8A3F', carnation: '#7F9F8A' };
export const modelOf = t => (ALL[t] && ALL[t].model) || t;
export const priceOf = t => (ALL[t] && ALL[t].price) || 0;

export const PAPER_STYLES = {
  matte:    { name: 'Mat kağıt', price: 0, colors: [['Kraft','#B98A5C'],['Fildişi','#F1EADF'],['Pudra','#E8C1C5'],['Adaçayı','#A9BFA8'],['Lila','#CDBCE3'],['Gece mavisi','#2C3E5C'],['Siyah','#2A2A2E']] },
  velvet:   { name: 'Kadife', price: 60, colors: [['Bordo','#6E1426'],['Siyah','#1E1C22'],['Zümrüt','#1F4D3A'],['Lacivert','#1F2A4F'],['Pudra','#D9A3AE']] },
  goldedge: { name: 'Altın kenarlı', price: 80, colors: [['Fildişi','#F2EBDD'],['Siyah','#24232A'],['Bordo','#7A1A2E'],['Adaçayı','#A9BFA8']] },
  news:     { name: 'Gazete', price: 50, colors: [['Eskitilmiş','#E6D8BC'],['Beyaz','#F4F2EC']] },
  crystal:  { name: 'Kristal', price: 70, colors: [['Şeffaf','#F4F7FF'],['Pembe','#FFD6E2'],['Lila','#E3D8FF']] },
};
export const TISSUES = [['Beyaz','#FAF8F5'],['Pudra','#F3D3D8'],['Lila','#E3D8F2'],['Adaçayı','#D5E3D3'],['Altın','#E8D6A8'],['Siyah','#3A3A3F']];
export const RIBBON_STYLES = {
  satin:   { name: 'Saten', price: 0, colors: [['Fildişi','#F2ECE0'],['Kırmızı','#B3122E'],['Pudra','#EBB3BD'],['Altın','#C9A45C'],['Adaçayı','#8BA889'],['Lila','#A48CCB'],['Siyah','#1F1F22']] },
  shimmer: { name: 'Simli', price: 40, colors: [['Altın','#D4AF61'],['Gümüş','#C9CCD3'],['Rose gold','#E3A792']] },
  pearl:   { name: 'İnci dizili', price: 50, colors: [['Fildişi','#F2ECE0'],['Pudra','#EBB3BD'],['Siyah','#1F1F22']] },
};
export const HEARTS = [['Kırmızı','#C8102E'],['Pembe','#F07CA0'],['Altın','#D4AF61']];
export const WINGS = ['#7FA7E6', '#F2A65A', '#EFE2F0'];
export const DECOR = [
  { id: 'hearts', name: 'Kalp çubukları', desc: 'Çiçeklerin arasına üç kalp', price: 0, kind: 'toggle', thumb: 'heart' },
  { id: 'butterflies', name: 'Kelebek', desc: 'Biri çiçeğe konar, diğerleri etrafında uçar', price: 40, kind: 'count', max: 3, thumb: 'butterfly' },
  { id: 'choco', name: 'Yaldızlı çikolata', desc: 'Altın varaklı pralinler', price: 50, kind: 'count', max: 5, thumb: 'choco' },
  { id: 'pearls', name: 'İnciler', desc: 'Taç yapraklarına serpilir', price: 60, kind: 'toggle', icon: 'pearl' },
  { id: 'sparkle', name: 'Işıltı', desc: 'Buketin çevresinde süzülen altın tozu', price: 40, kind: 'toggle', icon: 'star' },
  { id: 'lights', name: 'Peri ışıkları', desc: 'Karanlık temada en güzel görünür', price: 90, kind: 'toggle', icon: 'glow' },
  { id: 'teddy', name: 'Ayıcık', desc: 'Sarılmış buketin önüne oturur', price: 120, kind: 'toggle', thumb: 'teddy' },
  { id: 'ring', name: 'Yüzük kutusu', desc: 'Evlilik teklifi için. Ayıcık varsa onun kucağında durur.', price: 150, kind: 'toggle', thumb: 'ringbox' },
];
export const PACKS = [
  { id: 'p100', gold: 100, bonus: 0, price: 29.99 },
  { id: 'p330', gold: 300, bonus: 30, price: 79.99 },
  { id: 'p800', gold: 700, bonus: 100, price: 159.99, best: true },
  { id: 'p1800', gold: 1500, bonus: 300, price: 299.99 },
];
export const REASONS = ['Sadece seni düşündüm', 'Günaydın', 'İyi geceler', 'Seni seviyorum', 'Yıldönümü', 'Doğum günü', 'Özür dilerim', 'Tebrikler', 'Geçmiş olsun'];


export const DAY = 86400000;
export const isMain = t => t in FLOWERS;
export const nameOf = (list, hex) => (list.find(c => c[1] === hex) || [''])[0];
export const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const DAY_REASON = { partner_birthday: 'Doğum günü', anniversary: 'Yıldönümü', custom: 'Sadece seni düşündüm' };
export const REACT_LABEL = { heart: 'Kalp gönderdi', thanks: 'Teşekkür ederim', love: 'Seni seviyorum', wow: 'Çok güzel olmuş', note: '' };
