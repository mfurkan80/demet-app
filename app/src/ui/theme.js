// Renkler, yazı tipleri ve ölçüler: web sürümündeki CSS değişkenlerinin aynısı (açık ve koyu tema).
import { useColorScheme } from 'react-native';
import { F } from '../fonts';

export const LIGHT = {
  dark: false,
  mist: '#E6EEE8', blush: '#F7E5EB', sky1: '#E9F1EA', sky2: '#F8E9EE',
  surface: '#FBFCFA', surface2: '#EFF4F0', ink: '#1C2922', ink2: '#56665D', line: '#D6E0D9',
  accent: '#B5244D', accentInk: '#FFFFFF', accentSoft: '#F7DCE4',
  gold: '#A8761A', goldSoft: '#FBF0D3', goldLine: '#EBD39A',
  noteBg: '#FFF3D4', noteInk: '#5F4600', scrim: 'rgba(18,28,22,0.42)', danger: '#B3261E', ok: '#2E7D4F',
  gardenSky: ['#C7DDF0', '#FBE0C8', '#8DB665'],
};
export const DARK = {
  dark: true,
  mist: '#101814', blush: '#22151B', sky1: '#0F1915', sky2: '#1E141B',
  surface: '#161F1A', surface2: '#1D2822', ink: '#EAF1EC', ink2: '#9AAEA2', line: '#2A3630',
  accent: '#F0728F', accentInk: '#2B0B15', accentSoft: '#3A1A25',
  gold: '#E9B949', goldSoft: '#33280E', goldLine: '#5A4619',
  noteBg: '#352C12', noteInk: '#F1D88E', scrim: 'rgba(0,0,0,0.58)', danger: '#F2867D', ok: '#7FD1A0',
  gardenSky: ['#22324A', '#3A2E3A', '#20341F'],
};

export const useTheme = () => (useColorScheme() === 'dark' ? DARK : LIGHT);

export const R = { sm: 10, md: 16, lg: 22 };
export { F };

// hex + alpha → rgba()
export const alpha = (hex, a) => {
  const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
// mix two hex colors (t = share of b)
export const mix = (a, b, t) => {
  const p = x => parseInt(x.replace('#', ''), 16), A = p(a), B = p(b);
  const ch = s => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
};
