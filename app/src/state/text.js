// Türkçe ekler ve biçimlendirme (web sürümüyle aynı kurallar).
import { DAY } from './catalog';

export const lower = s => String(s).toLocaleLowerCase('tr');
export const upper1 = s => String(s || '').trim().charAt(0).toLocaleUpperCase('tr');
const lastVowel = w => { const m = lower(w).match(/[aeıioöuü](?=[^aeıioöuü]*$)/); return m ? m[0] : 'e'; };
const backV = v => 'aıou'.includes(v);
// Deniz’e, Elif’e, Ayşe’ye
export const toName = w => { const endV = /[aeıioöuü]$/.test(lower(w)); return w + '’' + (endV ? 'y' : '') + (backV(lastVowel(w)) ? 'a' : 'e'); };
// Furkan’ın, Ayşe’nin
export const genitive = w => {
  const low = lower(w), lastV = [...low].reverse().find(c => 'aeıioöuü'.includes(c)) || 'e';
  const v = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' }[lastV];
  return `${w}’${'aeıioöuü'.includes(low.slice(-1)) ? 'n' : ''}${v}n`;
};
// Deniz’den, Ahmet’ten
export const fromName = w => { const hard = /[fstkçşhp]$/.test(lower(w)); return w + '’' + (hard ? 't' : 'd') + (backV(lastVowel(w)) ? 'an' : 'en'); };

const nf = new Intl.NumberFormat('tr-TR');
export const fmt = n => nf.format(n);
const tlf = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
export const tl = n => tlf.format(n);
export const dayKey = d => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; };
export const ago = n => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime() - n * DAY; };

const dShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const dLong = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const dDay = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
const dDT = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', hour: '2-digit', minute: '2-digit' });
const dWd = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
export const fmtShort = t => dShort.format(t);
export const fmtLong = t => dLong.format(t);
export const fmtDay = t => dDay.format(t);
export const fmtDT = t => dDT.format(t);
export const fmtWeekday = t => dWd.format(t).slice(0, 3);
export const whenText = at => {
  const days = Math.round((new Date().setHours(12, 0, 0, 0) - new Date(at).setHours(12, 0, 0, 0)) / DAY);
  if (days <= 0) return 'Bugün'; if (days === 1) return 'Dün'; if (days < 7) return `${days} gün önce`;
  return fmtShort(at);
};
