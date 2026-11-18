// Fonts: the same TTF files serve the interface (expo-font) and the 3D textures (Skia: card, signs).
import { Platform } from 'react-native';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { registerTypeface } from './engine/canvas2d';

export const FILES = {
  'Figtree-400': require('@expo-google-fonts/figtree/400Regular/Figtree_400Regular.ttf'),
  'Figtree-500': require('@expo-google-fonts/figtree/500Medium/Figtree_500Medium.ttf'),
  'Figtree-600': require('@expo-google-fonts/figtree/600SemiBold/Figtree_600SemiBold.ttf'),
  'Figtree-700': require('@expo-google-fonts/figtree/700Bold/Figtree_700Bold.ttf'),
  'Caveat-500': require('@expo-google-fonts/caveat/500Medium/Caveat_500Medium.ttf'),
  'Caveat-600': require('@expo-google-fonts/caveat/600SemiBold/Caveat_600SemiBold.ttf'),
  'Bricolage-700': require('@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
  'Bricolage-800': require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
  'Lora-400': require('@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf'),
  'Lora-700': require('@expo-google-fonts/lora/700Bold/Lora_700Bold.ttf'),
};

// family names used in the interface styles
export const F = {
  body: 'Figtree-400', medium: 'Figtree-500', semi: 'Figtree-600', bold: 'Figtree-700',
  hand: 'Caveat-600', handM: 'Caveat-500', display: 'Bricolage-800', displayB: 'Bricolage-700',
};

const SKIA_FAMILY = { Figtree: 'figtree', Caveat: 'caveat', Bricolage: 'bricolage grotesque', Lora: 'lora' };

export const loadFonts = async () => {
  await Font.loadAsync(FILES);
  if (Platform.OS === 'web') return;
  // the 3D textures are drawn with Skia, which needs the typefaces themselves
  const { Skia } = require('@shopify/react-native-skia');
  await Promise.all(Object.entries(FILES).map(async ([name, mod]) => {
    try {
      const asset = Asset.fromModule(mod); await asset.downloadAsync();
      const data = await Skia.Data.fromURI(asset.localUri || asset.uri);
      const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
      const [fam, w] = name.split('-');
      if (tf) registerTypeface(SKIA_FAMILY[fam], +w, tf);
    } catch (e) { /* a missing face falls back to another one */ }
  }));
};
