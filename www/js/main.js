/* راه‌اندازی برنامه */
(function () {
  const NB = window.NB;
  const hideSplash = () => { const sp = document.getElementById('splash'); if (sp) { sp.classList.add('out'); setTimeout(() => sp.remove(), 400); } };

  function start() {
    const s = NB.S(), h = location.hash;
    if ((!h || h === '#/home' || h === '#') && s.settings.mode === 'owner' && NB.myBiz()) location.replace('#/owner');
    else if (!h) location.replace('#/home');
    NB.dispatch();
    hideSplash();
  }
  function fatal(e) {
    NB.page({
      title: NB.cfg.appName,
      html: `<div class="empty"><div class="e-ic">${e.config ? '⚙️' : '📡'}</div><p>${NB.esc(e.config ? 'آدرس سرور در برنامه تنظیم نشده است. (فایل www/js/config.js ← apiBase)' : e.message)}</p>
        <button class="btn btn-pri" id="retry">تلاش مجدد</button></div>`
    });
    document.getElementById('retry').onclick = () => location.reload();
    hideSplash();
  }

  NB.load().then(() => {
    NB.applyTheme();
    return NB.sync(true).then(start, (e) => {
      if (!e.config && NB.S().businesses.length) { start(); setTimeout(() => NB.toast('اینترنت وصل نیست؛ اطلاعات قبلی نمایش داده می‌شود', 'bad'), 500); } else fatal(e);
    });
  }).catch((e) => { console.error(e); fatal(e); });
})();
