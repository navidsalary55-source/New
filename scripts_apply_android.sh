#!/usr/bin/env bash
# بعد از "cap add android" اجرا می‌شود: آیکون، رنگ، مجوزها و تنظیمات اندروید
set -euo pipefail
RES=android/app/src/main/res
cp -r assets/res/* "$RES"/
cat > "$RES/values/ic_launcher_background.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#EEF1FF</color>
</resources>
XML
# حذف آیکن پیش‌فرض (ربات) و اتصال آیکن تطبیقی به تصویر نوبت‌یاب
find "$RES" -name 'ic_launcher_foreground.xml' -delete
find "$RES" -name 'ic_launcher_background.xml' -path '*drawable*' -delete
mkdir -p "$RES/mipmap-anydpi-v26"
for n in ic_launcher ic_launcher_round; do
cat > "$RES/mipmap-anydpi-v26/$n.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML
done
if find "$RES" -name 'ic_launcher_foreground.xml' | grep -q .; then echo "ERROR: default icon still present"; exit 1; fi
grep -q 'mipmap/ic_launcher_foreground' "$RES/mipmap-anydpi-v26/ic_launcher.xml" || { echo "ERROR: icon xml"; exit 1; }
MAN=android/app/src/main/AndroidManifest.xml
# مجوز موقعیت مکانی (برای دکمه «موقعیت فعلی من»)
if ! grep -q ACCESS_FINE_LOCATION "$MAN"; then
  sed -i 's#</manifest>#    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n</manifest>#' "$MAN"
fi
# جهت صفحه: فقط عمودی
sed -i 's#android:name=".MainActivity"#android:name=".MainActivity"\n            android:screenOrientation="portrait"#' "$MAN"
echo "Android customisation done"
