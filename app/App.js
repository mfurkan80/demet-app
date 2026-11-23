// Demet: uygulamanın kökü. Yazı tipleri ve kayıtlı durum yüklenir, 3D sahne, üst çubuk, alt panel ve
// pencereler kurulur; sunucu oturumu, bildirimler ve linkler burada bağlanır.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Linking, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadFonts } from './src/fonts';
import { app, load, useApp } from './src/state/store';
import { useTheme } from './src/ui/theme';
import { SheetHost, ToastHost, setCoverListener, sheetOpen, closeSheet, useKeyboard } from './src/ui/sheet';
import { Stage } from './src/screens/Stage';
import { TopBar, GardenSwitch } from './src/screens/TopBar';
import { Panel } from './src/screens/Panel';
import { Loading, Empty, Hint, Inbox, Offline, Gift, Burst, Welcome } from './src/screens/Overlays';
import { openShop, openAccount, openEntry, openPair } from './src/screens/sheets';
import { E, ui, bootServer, handleUrl, leaveViewing, setView, setPairHandler } from './src/ctl';
import { notificationUrl } from './src/services/native';

SplashScreen.preventAutoHideAsync().catch(() => {});
setPairHandler(code => openPair(code));

const Main = () => {
  useApp();
  const t = useTheme(), dark = useColorScheme() === 'dark', ins = useSafeAreaInsets(), win = useWindowDimensions(), kb = useKeyboard();
  // the GL view keeps the size it was created with (resizing a GL surface is not reliable), so measure once
  const dims = useRef(null);
  if (!dims.current || Math.abs(dims.current.W - win.width) > 1) dims.current = { W: win.width, H: win.height };
  const { W, H } = dims.current;
  const panelStudio = Math.round(Math.min(H * 0.5, 470)), panelGarden = Math.round(Math.min(H * 0.42, 400));
  const stageH = H - panelGarden + 20;
  const top = Math.max(14, ins.top + 6);
  const insets = useMemo(() => ({ top: top + 56, bottom: panelStudio - panelGarden, garden: 0 }), [top, panelStudio, panelGarden]);
  const [ready, setReady] = useState(false), [glFail, setGlFail] = useState(false);
  const booted = useRef(false);

  const onReady = useCallback(() => {
    setReady(true);
    if (booted.current) return; booted.current = true;
    (async () => {
      let url = null;
      try { url = await Linking.getInitialURL(); } catch (e) {}
      try { const r = await Notifications.getLastNotificationResponseAsync(); url = notificationUrl(r) || url; } catch (e) {}
      await bootServer({ initialUrl: url });
    })();
  }, []);
  const onGlError = useCallback(() => setGlFail(true), []);
  const onTap = useCallback(id => {
    if (ui.view === 'garden' && id && !ui.welcome) { openEntry(id); E.cur && E.cur.focusPatch(id); }
  }, []);

  useEffect(() => { setCoverListener(c => E.cur && E.cur.setCovered(c)); }, []);
  useEffect(() => {
    const a = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    const b = Notifications.addNotificationResponseReceivedListener(r => handleUrl(notificationUrl(r)));
    const c = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheetOpen()) { closeSheet(); return true; }
      if (app.viewing) { leaveViewing('studio'); return true; }
      if (ui.view === 'garden' && !ui.welcome) { setView('studio'); return true; }
      return false;
    });
    return () => { a.remove(); b.remove(); c.remove(); };
  }, []);

  const garden = ui.view === 'garden';
  const showPanel = !ui.welcome;
  const panelH = garden ? panelGarden : panelStudio;
  const panelUp = kb && showPanel ? Math.min(panelH, H - kb - top - 70) : panelH;
  return (
    <View style={[st.root, { backgroundColor: garden ? t.gardenSky[2] : t.surface }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stage width={W} height={stageH} dark={dark} onReady={onReady} onError={onGlError} onTap={onTap} insets={insets} />
      <Empty top={insets.top} height={H - panelStudio} />
      <Hint bottom={panelH + 26} />
      <TopBar top={top} narrow={W <= 400} onGold={openShop} onMe={openAccount} />
      <GardenSwitch top={top + 56} />
      <Offline top={top + 56} />
      {app.serverOK ? <Inbox top={top + 58} /> : null}
      {showPanel ? <Panel height={panelUp} bottom={ins.bottom} kb={kb} /> : null}
      <Welcome top={top} bottom={ins.bottom} />
      <Gift top={top} bottom={ins.bottom} />
      <Loading on={!ready} text={glFail ? '3D sahne açılamadı' : undefined} sub={glFail ? 'Uygulamayı kapatıp yeniden açmayı dene.' : undefined} />
      <Loading on={ready && ui.gardenLoading && !ui.welcome} garden text="Bahçe hazırlanıyor…" sub="Buketler toprağa ekiliyor…" />
      <Burst />
      <SheetHost />
      <ToastHost top={top + 52} />
    </View>
  );
};

const App = () => {
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    (async () => {
      AccessibilityInfo.isReduceMotionEnabled().then(r => { app.reduceMotion = r; }).catch(() => {});
      await Promise.all([loadFonts().catch(() => {}), load()]);
      setFonts(true);
      setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 60);
    })();
  }, []);
  if (!fonts) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Main />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
export default App;

const st = StyleSheet.create({ root: { flex: 1, overflow: 'hidden' } });
