// Simgeler (web sürümündeki SVG'lerin aynısı) ve altın sikkesi.
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

const S = ({ size = 20, color, sw = 1.8, fill = 'none', children }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill === 'none' ? color : 'none'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</Svg>
);

export const IGarden = p => <S {...p}><Path d="M12 21v-8" /><Path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z" /><Path d="M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" /><Path d="M5 21h14" /></S>;
export const IStudio = p => <S {...p}><Path d="M12 22V12" /><Circle cx="12" cy="8" r="3.2" /><Path d="M8.5 11.5 6 21m9.5-9.5L18 21" /></S>;
export const ILeaf = p => <S {...p} sw={1.9}><Path d="M12 21v-8" /><Path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z" /><Path d="M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" /></S>;
export const IHeart = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path fill={color} d="M12 21s-7.5-4.6-9.6-9.2C.8 8.4 2.9 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.7 0 5.8 3.9 4.2 7.3C19.5 16.4 12 21 12 21z" /></Svg>
);
export const ILink = p => <S {...p} sw={2}><Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></S>;
export const IPlus = p => <S {...p} sw={2.2}><Path d="M12 5v14M5 12h14" /></S>;
export const IMinus = p => <S {...p} sw={2.2}><Path d="M5 12h14" /></S>;
export const IBack = p => <S {...p} sw={2}><Path d="m15 18-6-6 6-6" /></S>;
export const IClose = p => <S {...p} sw={2}><Path d="M6 6l12 12M18 6 6 18" /></S>;
export const IShare = p => <S {...p} sw={1.9}><Path d="M12 3v12" /><Path d="m7 8 5-5 5 5" /><Path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></S>;
export const IBell = p => <S {...p} sw={1.9}><Path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><Path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></S>;
export const ICheck = p => <S {...p} sw={2.4}><Path d="m5 12.5 4.5 4.5L19 7.5" /></S>;
export const IChevron = p => <S {...p} sw={2}><Path d="m9 18 6-6-6-6" /></S>;
export const ICal = p => <S {...p} sw={1.9}><Path d="M7 3v3M17 3v3" /><Path d="M4 8h16" /><Path d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /></S>;
export const IImage = p => <S {...p} sw={1.9}><Path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><Circle cx="9" cy="9" r="1.8" /><Path d="m20 15-4.5-4.5L6 20" /></S>;
export const IDownload = p => <S {...p} sw={1.9}><Path d="M12 3v12" /><Path d="m7 10 5 5 5-5" /><Path d="M5 21h14" /></S>;
export const IUser = p => <S {...p} sw={1.9}><Circle cx="12" cy="8" r="4" /><Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></S>;
export const IGift = p => <S {...p} sw={1.9}><Path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z" /><Path d="M3 7h18v4H3z" /><Path d="M12 7v14" /><Path d="M12 7C10.5 4 7 3.5 7 5.5S10 7 12 7zM12 7c1.5-3 5-3.5 5-1.5S14 7 12 7z" /></S>;
export const ISpark = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path fill={color} d="M12 2c.6 4.6 2.4 7.4 7.5 8.3v1.4C14.4 12.6 12.6 15.4 12 22h-.1c-.6-6.6-2.4-9.4-7.4-10.3v-1.4C9.6 9.4 11.4 6.6 12 2z" /></Svg>
);
export const IWhats = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24"><Path fill={color} d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.4-.3z" /></Svg>
);

// the gold coin (radial gradient + rim), like the web's .coin
export const Coin = ({ size = 18 }) => {
  const id = `coin${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Defs>
        <RadialGradient id={id} cx="34%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#FFF1B8" /><Stop offset="0.16" stopColor="#FFF1B8" />
          <Stop offset="0.45" stopColor="#F2C552" /><Stop offset="0.78" stopColor="#C98E1E" /><Stop offset="1" stopColor="#8E5E0E" />
        </RadialGradient>
      </Defs>
      <Circle cx="10" cy="10" r="10" fill={`url(#${id})`} />
      <Circle cx="10" cy="10" r="9.2" fill="none" stroke="rgba(110,70,0,0.35)" strokeWidth="1.5" />
      <Circle cx="10" cy="10" r="6.9" fill="none" stroke="rgba(255,236,170,0.35)" strokeWidth="2.6" />
    </Svg>
  );
};
