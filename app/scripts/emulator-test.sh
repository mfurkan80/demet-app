#!/usr/bin/env bash
# Emülatörde APK'yı kurar ve uygulamayı baştan sona dolaşır: karşılama, misafir girişi, çiçek ekleme, sarma,
# gönder penceresi, bahçe, altın, hesap, link ile açılan buket ve arka plana alıp geri gelme.
# Her adımda ekran görüntüsü alır. Kullanım: emulator-test.sh <çıktı klasörü>
OUT="$1"; mkdir -p "$OUT"
PKG=me.furkansahin.demet
timeout 300 adb install -r "$OUT/demet-rn.apk" || { echo "::error title=Kurulum::APK kurulamadı"; exit 1; }
adb logcat -c
adb logcat -v time > "$OUT/logcat-full.txt" 2>/dev/null &
LOGPID=$!
mem() { echo "--- meminfo $1" >> "$OUT/meminfo.txt"; timeout 20 adb shell dumpsys meminfo $PKG | head -45 >> "$OUT/meminfo.txt" 2>&1; timeout 10 adb shell cat /proc/meminfo | head -4 >> "$OUT/meminfo.txt"; }
STEPS="$OUT/steps.txt"; : > "$STEPS"
n=0
shot() { n=$((n + 1)); local f; f=$(printf "%02d-%s.png" "$n" "$1"); timeout 30 adb exec-out screencap -p > "$OUT/$f"; echo "shot $f" >> "$STEPS"; }
# find an element by its text or accessibility label (a trailing * matches a prefix); prints "x y"
find() {
  local label="$1" max="${2:-3}" tries=0 xy=""
  while [ $tries -lt $max ] && [ -z "$xy" ]; do
    adb shell rm -f /sdcard/ui.xml > /dev/null 2>&1
    timeout 25 adb shell uiautomator dump /sdcard/ui.xml > /dev/null 2>&1
    timeout 10 adb pull /sdcard/ui.xml "$OUT/ui.xml" > /dev/null 2>&1
    xy=$(python3 - "$OUT/ui.xml" "$label" <<'PY'
import re, sys
try: xml = open(sys.argv[1], encoding='utf-8', errors='ignore').read()
except Exception: xml = ''
want = sys.argv[2]
ok = (lambda v: v.startswith(want[:-1])) if want.endswith('*') else (lambda v: v == want)
for m in re.finditer(r'<node [^>]*>', xml):
    n = m.group(0)
    t = re.search(r' text="([^"]*)"', n); d = re.search(r'content-desc="([^"]*)"', n); b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
    if b and ((t and ok(t.group(1))) or (d and ok(d.group(1)))):
        x0, y0, x1, y1 = map(int, b.groups())
        if x1 > x0 and y1 > y0: print((x0 + x1) // 2, (y0 + y1) // 2); break
PY
)
    tries=$((tries + 1)); [ -z "$xy" ] && sleep 3
  done
  [ -n "$xy" ] && echo "$xy"
}
tap() {
  local xy; xy=$(find "$1" "${2:-3}")
  if [ -z "$xy" ]; then echo "MISS $1" >> "$STEPS"; return 1; fi
  timeout 20 adb shell input tap $xy; echo "tap $1 @ $xy" >> "$STEPS"; return 0
}
# let the freshly booted system settle (media scan, package jobs) before the 3D app starts
sleep 45
timeout 30 adb shell am start -n "$PKG/.MainActivity"
sleep 25; shot acilis
# wait (up to ~3 min) for the welcome card, then continue as a guest
find "Misafir olarak giriş yap" 15 > /dev/null; sleep 8; shot karsilama; mem karsilama
tap "Misafir olarak giriş yap"; sleep 12; shot atolye-bos; mem atolye
tap "Bir dal gül ekle"; sleep 3; tap "Bir dal gül ekle"; sleep 3; tap "Bir dal gül ekle"; sleep 3
tap "Bir dal lale ekle"; sleep 3; tap "Bir dal ayçiçeği ekle"; sleep 6; shot cicekler
tap "Yeşillik"; sleep 3; tap "Bir dal cipso ekle"; sleep 3; tap "Bir dal okaliptüs ekle"; sleep 5; shot yesillik
tap "Buketi sar"; sleep 10; shot sarildi
tap "Süs"; sleep 4; shot sus
tap "Not"; sleep 4; shot not
tap "Gönder"; sleep 10; shot gonder
timeout 20 adb shell input keyevent KEYCODE_BACK; sleep 4
timeout 30 adb exec-out screencap -p > /dev/null
tap "Bahçe"; sleep 35; shot bahce; mem bahce
tap "Altın:*"; sleep 6; shot altin
timeout 20 adb shell input keyevent KEYCODE_BACK; sleep 3
tap "Giriş yap ya da hesap oluştur"; sleep 5; shot hesap
timeout 20 adb shell input keyevent KEYCODE_BACK; sleep 3
timeout 20 adb shell input keyevent KEYCODE_BACK; sleep 8; shot geri-atolye
# app to the background and back: the 3D view must come back
timeout 20 adb shell input keyevent KEYCODE_HOME; sleep 6
timeout 30 adb shell am start -n "$PKG/.MainActivity"; sleep 10; shot geri-gelince
# a bouquet link that does not exist: the app opens it and shows the friendly error
timeout 30 adb shell am start -a android.intent.action.VIEW -d "https://demet.furkansahin.me/b/yokboylebirbuket" "$PKG"; sleep 15; shot link-hatali
kill $LOGPID 2>/dev/null; gzip -f "$OUT/logcat-full.txt"
adb logcat -d -v brief ReactNativeJS:V ReactNative:V AndroidRuntime:E '*:S' > "$OUT/log.txt" || true
adb logcat -d -v brief '*:W' | tail -n 600 > "$OUT/log-warn.txt" || true
msg=$( (cat "$STEPS"; grep -E "DEMET|FATAL|Exception|Error|TypeError" "$OUT/log.txt" | tail -n 30) | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}')
echo "::notice title=Test adımları ve günlük::$msg"
ls -la "$OUT"
