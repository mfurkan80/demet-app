#!/usr/bin/env bash
# Emülatörde APK'yı kurar, açar, ekran görüntüleri ve günlük alır. Kullanım: emulator-test.sh <çıktı klasörü>
OUT="$1"; mkdir -p "$OUT"
PKG=me.furkansahin.demet
adb install -r "$OUT/demet-rn.apk" || { echo "::error title=Kurulum::APK kurulamadı"; exit 1; }
adb logcat -c
adb shell am start -n "$PKG/.MainActivity"
for t in 12 30 60; do
  sleep $(( t - ${prev:-0} )); prev=$t
  adb exec-out screencap -p > "$OUT/shot-${t}s.png"
done
adb logcat -d -v brief ReactNativeJS:V ReactNative:V AndroidRuntime:E '*:S' > "$OUT/log.txt" || true
adb logcat -d -v brief '*:W' | tail -n 400 > "$OUT/log-warn.txt" || true
# özet: günlükteki DEMET satırları ve çökme belirtileri açıklama olarak görünsün
msg=$(grep -E "DEMET|FATAL|Exception|Error" "$OUT/log.txt" | tail -n 30 | sed 's/%/%25/g' | awk '{printf "%s%%0A", $0}')
echo "::notice title=Uygulama günlüğü::$msg"
ls -la "$OUT"
