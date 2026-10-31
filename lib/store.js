// Basit, tek dosyalı veri deposu. Bütün veri bellekte durur, değişiklikler kısa bir gecikmeyle
// data/db.json dosyasına atomik olarak (geçici dosya + rename) yazılır. Tek bir Node süreci için güvenlidir.
// Kullanıcı sayısı büyüdüğünde aynı arayüzle MySQL'e taşınabilir.
const fs = require('fs');
const path = require('path');

const EMPTY = () => ({ users: {}, sessions: {}, invites: {}, bouquets: {}, purchases: {}, push: {}, emails: {} });

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'db.json');
    fs.mkdirSync(dir, { recursive: true });
    this.data = EMPTY();
    if (fs.existsSync(this.file)) {
      try { this.data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; }
      catch (e) { throw new Error(`${this.file} okunamadı: ${e.message}`); }
    }
    this.timer = null;
    const flush = () => { this.flushSync(); };
    process.on('exit', flush);
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { flush(); process.exit(0); });
  }
  get users() { return this.data.users; }
  get sessions() { return this.data.sessions; }
  get invites() { return this.data.invites; }
  get bouquets() { return this.data.bouquets; }
  get purchases() { return this.data.purchases; }
  get push() { return this.data.push; }
  get emails() { return this.data.emails; }
  save() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flushSync(); }, 120);
  }
  flushSync() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }
}

module.exports = { Store };
