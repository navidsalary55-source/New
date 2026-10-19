# نوبت‌یاب — اپلیکیشن نوبت‌گیری

شامل سه بخش: اپ (پوشه‌ی `www`)، سرور (پوشه‌ی `server`) و ورک‌فلوهای ساخت APK (پوشه‌ی `.github`).

## مراحل (به ترتیب)
1. **سرور را راه بیندازید** — راهنما در `SERVER.md`.
2. در `www/js/config.js` مقدار `apiBase` را آدرس سرور بگذارید (مثلاً `https://nobat.example.ir`).
3. محتویات این پوشه را در یک مخزن **خصوصی (Private)** گیت‌هاب آپلود کنید (پوشه‌ی `.github` هم باید آپلود شود).
4. **APK تستی:** تب Actions ← «Build APK (تستی)» ← Run workflow ← بعد از چند دقیقه از بخش Artifacts دانلود کنید.
5. **APK نهایی برای بازار/مایکت (یک‌بار تنظیم):**
   - Actions ← «1) Create signing key» ← Run. از Artifacts فایل‌های `signing-key-KEEP-SAFE` را دانلود و **جای امنی نگه دارید** (برای همیشه لازم است؛ بدون آن نمی‌توانید آپدیت بدهید).
   - Settings ← Secrets and variables ← Actions ← New repository secret، چهار مورد: `KEYSTORE_BASE64` (محتوای keystore.base64.txt)، `KEYSTORE_PASSWORD`، `KEY_ALIAS`، `KEY_PASSWORD` (مقادیر داخل secrets-info.txt).
   - Actions ← «2) Build release APK» ← Run. خروجی `nobatyar-release.apk` را در بازار و مایکت آپلود کنید. برای هر آپدیت دوباره همین را اجرا کنید (شماره‌ی نسخه خودکار زیاد می‌شود).
6. متن معرفی و تصاویر فروشگاه: `STORE_LISTING.md` و `assets/store/`.

## شخصی‌سازی
- تماس با ما، درباره ما، نام: `www/js/config.js`
- شناسه‌ی بسته (برای انتشار حتماً یکتا): `capacitor.config.json` ← `appId`

## نسخه‌ی آزمایشی بدون سرور
اگر `apiBase` در `www/js/config.js` خالی بماند، اپ در حالت آزمایشی اجرا می‌شود: همه‌ی اطلاعات (با ۱۴ کسب‌وکار نمونه) فقط روی همان گوشی ذخیره می‌شود. رمز پنل مدیریت در این حالت `admin1234` است (۷ بار لمس پایین منوی کشویی). این حالت فقط برای تست است؛ برای انتشار، سرور بگیرید و `apiBase` را بنویسید.
