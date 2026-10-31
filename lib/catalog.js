// Fiyatlar sunucuda da tutulur; istemciden gelen fiyata güvenilmez.
const STEM_PRICES = { peony: 6, lily: 5, hydrangea: 5, orchid: 12, rose_gold: 25, rose_night: 20, cotton: 3 };

const UNLOCKS = {
  'paper:velvet': 60, 'paper:goldedge': 80, 'paper:news': 50, 'paper:crystal': 70,
  'ribbon:shimmer': 40, 'ribbon:pearl': 50,
  'decor:butterflies': 40, 'decor:choco': 50, 'decor:pearls': 60, 'decor:sparkle': 40,
  'decor:lights': 90, 'decor:teddy': 120, 'decor:ring': 150,
};

// TL fiyatları KDV dahil (web, iyzico). `iap`: App Store Connect ve Play Console'daki tüketilebilir ürün kimliği;
// mağazadaki fiyat orada ayrıca belirlenir.
const PACKS = [
  { id: 'p100', gold: 100, bonus: 0, price: 29.99, iap: 'demet_gold_100' },
  { id: 'p330', gold: 300, bonus: 30, price: 79.99, iap: 'demet_gold_330' },
  { id: 'p800', gold: 700, bonus: 100, price: 159.99, best: true, iap: 'demet_gold_800' },
  { id: 'p1800', gold: 1500, bonus: 300, price: 299.99, iap: 'demet_gold_1800' },
];

const WELCOME_GOLD = 120;

function bouquetCost(items) {
  return items.reduce((s, i) => s + (STEM_PRICES[i.type] || 0), 0);
}

// Buketin kullandığı premium parçalar: bunların kilidi açık olmalı.
function requiredUnlocks(b) {
  const need = [];
  if (UNLOCKS['paper:' + b.paperStyle]) need.push('paper:' + b.paperStyle);
  if (UNLOCKS['ribbon:' + b.ribbonStyle]) need.push('ribbon:' + b.ribbonStyle);
  for (const k of ['butterflies', 'choco', 'pearls', 'sparkle', 'lights', 'teddy', 'ring']) if (b.d[k]) need.push('decor:' + k);
  return need;
}

module.exports = { STEM_PRICES, UNLOCKS, PACKS, WELCOME_GOLD, bouquetCost, requiredUnlocks };
