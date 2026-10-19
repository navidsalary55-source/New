/* منوی کشویی، تنظیمات، درباره ما، تماس با ما، قوانین */
(function () {
  const NB = window.NB, esc = NB.esc, fa = NB.fa, ic = NB.icon, C = NB.cfg;
  const S = () => NB.S();

  NB.applyTheme = () => {
    const s = S().settings, r = document.documentElement;
    r.dataset.theme = s.dark ? 'dark' : 'light';
    r.style.fontSize = 16 * (s.font || 1) + 'px';
  };

  /* ---------- منوی کشویی ---------- */
  NB.drawer.render = () => {
    const s = S(), my = NB.myBiz(), owner = s.settings.mode === 'owner' && my;
    const item = (icon, label, to, extra) => `<button class="dr-i" data-act="${extra || 'nav'}" data-to="${to || ''}">${ic(icon)}<span>${label}</span></button>`;
    NB.$('#drawer').innerHTML = `<div class="dr-bg" data-act="closeOv"></div><aside class="dr-p">
      <div class="dr-h"><div class="avatar lg">${esc((owner ? my.name : s.user.name || 'م').trim().charAt(0))}</div><div><b>${esc(owner ? my.name : (s.user.name || 'کاربر مهمان'))}</b><div class="sm">${owner ? 'حالت کسب‌وکار' : 'حالت مشتری'}</div></div></div>
      <div class="dr-list">
        ${s.admin ? item('shield', 'پنل مدیریت (مدیر)', '/admin/home') + '<div class="dr-sep"></div>' : ''}
        ${owner ? `${item('chart', 'داشبورد', '/owner')}${item('list', 'نوبت‌های دریافتی', '/owner/appts')}${item('calendar', 'برنامه، تعطیلی و تخفیف', '/owner/plan')}${item('tag', 'خدمات و قیمت‌ها', '/owner/services')}${item('briefcase', 'اطلاعات کسب‌وکار', '/owner/profile')}${item('swap', 'رفتن به حالت مشتری', '', 'modeCustomer')}`
          : `${item('home', 'خانه', '/home')}${item('calendar', 'نوبت‌های من', '/appts')}${item('heart', 'علاقه‌مندی‌ها', '/fav')}${item('search', 'جستجو', '/search')}${my ? item('swap', 'رفتن به پنل کسب‌وکار', '', 'modeOwner') : item('briefcase', 'ثبت‌نام کسب‌وکار (رایگان)', '/owner/register')}`}
        <div class="dr-sep"></div>
        ${item('user', 'پروفایل من', '/profile')}${item('settings', 'تنظیمات', '/settings')}${item('info', 'درباره ما', '/about')}${item('phone', 'تماس با ما و پشتیبانی', '/contact')}${item('shield', 'قوانین و حریم خصوصی', '/rules')}${item('share', 'معرفی به دوستان', '', 'shareApp')}
      </div><div class="dr-f" data-act="verTap">${C.appName} · نسخه ${fa(C.version)}</div></aside>`;
  };
  let taps = 0, tapT;
  NB.acts.verTap = () => {
    taps++; clearTimeout(tapT); tapT = setTimeout(() => { taps = 0; }, 2500);
    if (taps >= 7) { taps = 0; NB.nav(S().admin ? '/admin/home' : '/admin'); }
  };
  NB.acts.shareApp = () => NB.share(C.shareText);
  NB.acts.modeCustomer = () => { S().settings.mode = 'customer'; NB.save(); NB.nav('/home'); };
  NB.acts.modeOwner = () => { S().settings.mode = 'owner'; NB.save(); NB.nav('/owner'); };

  /* ---------- تنظیمات ---------- */
  NB.route('/settings', () => {
    const s = S(), st = s.settings;
    NB.page({
      title: 'تنظیمات', back: true,
      html: `<div class="pad"><div class="card"><h3>ظاهر</h3>
        <label class="row between set-r"><span>${ic('moon', 'xs')} حالت تیره</span><span class="sw"><input type="checkbox" data-act="setDark" ${st.dark ? 'checked' : ''}><span></span></span></label>
        <div class="set-r"><span>اندازه نوشته‌ها</span><div class="seg inline">${[[0.9, 'کوچک'], [1, 'متوسط'], [1.12, 'بزرگ'], [1.25, 'خیلی بزرگ']].map((f) => `<button class="${st.font === f[0] ? 'on' : ''}" data-act="setFont" data-v="${f[0]}">${f[1]}</button>`).join('')}</div></div></div>
      <div class="card"><h3>حساب کاربری</h3><button class="btn btn-ghost btn-block" data-act="nav" data-to="/profile">ویرایش نام و شماره تماس</button>
        <button class="btn btn-ghost btn-block mt" data-act="restoreAcc">🔑 بازیابی کسب‌وکار با کد (گوشی جدید)</button></div>
      <div class="card"><h3>اطلاعات این دستگاه</h3><p class="muted sm">علاقه‌مندی‌ها و تنظیمات روی همین دستگاه ذخیره می‌شود. نوبت‌ها و کسب‌وکار شما روی سرور نگهداری می‌شود.</p>
        <button class="btn btn-danger-o btn-block" data-act="wipe">پاک‌کردن اطلاعات این دستگاه</button></div>
      <div class="card"><h3>درباره برنامه</h3><div class="svc-r"><span>نام</span><b>${esc(C.appName)}</b></div><div class="svc-r"><span>نسخه</span><b>${fa(C.version)}</b></div>
        <div class="row gap mt"><button class="btn btn-ghost grow" data-act="nav" data-to="/about">درباره ما</button><button class="btn btn-ghost grow" data-act="nav" data-to="/rules">قوانین</button></div></div></div>`
    });
  });
  NB.acts.setDark = (d, el) => { S().settings.dark = el.checked; NB.save(); NB.applyTheme(); };
  NB.acts.setFont = (d) => { S().settings.font = +d.v; NB.save(); NB.applyTheme(); NB.rerender(); };
  NB.acts.restoreAcc = () => {
    const el = NB.sheet(`<h3 class="sh-t">بازیابی کسب‌وکار</h3><p class="muted sm">کد بازیابی را که در «اطلاعات کسب‌وکار» گوشی قبلی دیده‌اید وارد کنید.</p>
      <input class="inp" id="rc" dir="ltr" placeholder="کد بازیابی"><button class="btn btn-pri btn-block mt" id="rcOk">بازیابی</button>`);
    el.querySelector('#rcOk').addEventListener('click', async () => {
      try { await NB.restoreAccount(el.querySelector('#rc').value); NB.closeOv(); NB.toast('کسب‌وکار شما بازیابی شد ✓'); setTimeout(() => NB.go('/owner'), 80); }
      catch (e) { NB.toast(e.message, 'bad'); }
    });
  };
  NB.acts.wipe = async () => {
    const warn = NB.myBiz() ? ' توجه: شما صاحب کسب‌وکار هستید؛ حتماً ابتدا «کد بازیابی» را از بخش اطلاعات کسب‌وکار یادداشت کنید، وگرنه دسترسی‌تان از بین می‌رود.' : '';
    if (!(await NB.confirm('علاقه‌مندی‌ها، تنظیمات و شناسه‌ی این دستگاه پاک می‌شود.' + warn, 'پاک شود', true))) return;
    NB.resetLocal(); NB.applyTheme(); NB.toast('پاک شد'); NB.sync(true).catch(() => {}).then(() => NB.go('/home'));
  };

  /* ---------- درباره ما ---------- */
  NB.route('/about', () => {
    const a = C.about;
    NB.page({
      title: 'درباره ما', back: true,
      html: `<div class="about"><div class="logo" data-act="verTap"><img src="img/hero.png" alt=""></div><h1>${esc(C.appName)}</h1><p class="muted">${esc(C.tagline)}</p><div class="chip">نسخه ${fa(C.version)}</div>${NB.isLocal() ? '<div class="chip" style="margin-top:.4rem">نسخه‌ی آزمایشی — اطلاعات فقط روی همین گوشی است</div>' : ''}</div>
      <div class="pad"><div class="card maker"><div class="muted sm">سازنده‌ی برنامه</div><h2>${esc(a.creator)}</h2></div>
      <div class="card">${a.text.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      <div class="card"><h3>امکانات</h3>${a.features.map((f) => `<div class="feat">${ic('check', 'xs')}<span>${esc(f)}</span></div>`).join('')}</div>
      <button class="btn btn-ghost btn-block" data-act="nav" data-to="/contact">${ic('phone')} تماس با ما و پشتیبانی</button>
      <button class="btn btn-pri btn-block mt" data-act="shareApp">${ic('share')} معرفی به دوستان</button></div>`
    });
  });

  /* ---------- تماس با ما ---------- */
  NB.route('/contact', () => {
    const c = C.contact, rows = [];
    const link = (icon, label, val, href) => `<a class="ct-r" href="${esc(href)}">${ic(icon)}<div><small class="muted">${label}</small><div dir="ltr" style="text-align:right">${esc(val)}</div></div>${ic('next')}</a>`;
    const copy = (icon, label, val) => `<button class="ct-r" data-act="copyText" data-t="${esc(val)}">${ic(icon)}<div><small class="muted">${label} (برای کپی بزنید)</small><div dir="ltr" style="text-align:right">${esc(val)}</div></div>${ic('share')}</button>`;
    if (c.telegram) rows.push(link('msg', 'تلگرام', '@' + c.telegram, 'https://t.me/' + c.telegram));
    if (c.rubika) rows.push(link('msg', 'روبیکا', '@' + c.rubika, 'https://rubika.ir/' + c.rubika));
    if (c.whatsapp) rows.push(copy('phone', 'واتساپ', '@' + c.whatsapp));
    if (c.email) rows.push(link('mail', 'ایمیل', c.email, 'mailto:' + c.email));
    NB.page({
      title: 'تماس با ما و پشتیبانی', back: true,
      html: `<div class="pad"><p class="muted">برای پشتیبانی، گزارش مشکل، پیشنهاد یا همکاری از یکی از راه‌های زیر با ما در ارتباط باشید.</p>
      <div class="card flush">${rows.join('')}</div>
      ${c.email ? `<div class="card"><h3>${ic('msg', 'xs')} ارسال پیام</h3><div class="field"><label>نام شما</label><input class="inp" id="cn" value="${esc(S().user.name)}"></div>
        <div class="field"><label>موضوع</label><select class="inp" id="cs"><option>پشتیبانی و گزارش مشکل</option><option>پیشنهاد و انتقاد</option><option>گزارش تخلف</option><option>همکاری و ثبت کسب‌وکار</option><option>سایر</option></select></div>
        <div class="field"><label>پیام شما</label><textarea class="inp" id="cm" rows="4" placeholder="پیام خود را بنویسید…"></textarea></div>
        <button class="btn btn-pri btn-block" data-act="sendMsg">${ic('mail')} ارسال با ایمیل</button></div>` : ''}</div>`
    });
  });
  NB.acts.sendMsg = () => {
    const m = NB.$('#cm').value.trim();
    if (m.length < 5) return NB.toast('متن پیام را بنویسید', 'bad');
    const body = `${m}\n\n— ${NB.$('#cn').value.trim() || 'کاربر'}`;
    location.href = `mailto:${C.contact.email}?subject=${encodeURIComponent(C.appName + ' — ' + NB.$('#cs').value)}&body=${encodeURIComponent(body)}`;
  };

  /* ---------- قوانین و حریم خصوصی ---------- */
  NB.route('/rules', () => {
    const sec = (t, items) => `<div class="card"><h3>${t}</h3>${items.map((i) => `<p>${i}</p>`).join('')}</div>`;
    NB.page({
      title: 'قوانین و حریم خصوصی', back: true,
      html: `<div class="pad">
      ${sec('قوانین استفاده', ['۱. اطلاعات واردشده (نام، شماره تماس، آدرس و …) باید صحیح باشد.', '۲. مشتری موظف است در زمان ثبت‌شده حاضر شود یا نوبت را پیش از موعد لغو کند.', '۳. صاحب کسب‌وکار مسئول صحت اطلاعات، قیمت‌ها، عکس‌ها و ساعت کاری ثبت‌شده است.', '۴. ثبت کسب‌وکار، عکس، ویدیو یا متن خلاف قوانین جمهوری اسلامی ایران، توهین‌آمیز، گمراه‌کننده یا مغایر با اخلاق عمومی ممنوع است.', '۵. همه‌ی کسب‌وکارها پیش از نمایش توسط مدیر بررسی می‌شوند و مدیر می‌تواند هر کسب‌وکار، عکس، ویدیو یا نظر نامناسب را بدون اطلاع قبلی رد، غیرفعال یا حذف کند.', '۶. پرداخت هزینه‌ی خدمات مستقیماً بین مشتری و کسب‌وکار انجام می‌شود و برنامه در آن نقشی ندارد.', '۷. هر کاربر می‌تواند کسب‌وکار متخلف را با دکمه‌ی «گزارش تخلف» اعلام کند.'])}
      ${sec('حریم خصوصی', ['برای رزرو نوبت، نام و شماره تماس شما فقط برای همان کسب‌وکار و مدیر برنامه قابل مشاهده است و برای تبلیغات یا فروش به شخص ثالث استفاده نمی‌شود.', 'اطلاعات کسب‌وکارها (نام، آدرس، شماره تماس، عکس‌ها، ویدیو و موقعیت مکانی) برای همه‌ی کاربران برنامه نمایش داده می‌شود.', 'دسترسی به موقعیت مکانی فقط زمانی که صاحب کسب‌وکار دکمه‌ی «موقعیت فعلی من» را بزند انجام می‌شود.', 'برای حذف اطلاعات خود، نوبت‌ها یا کسب‌وکار را از داخل برنامه حذف کنید یا با پشتیبانی تماس بگیرید.'])}
      ${sec('لغو نوبت', ['مشتری می‌تواند از بخش «نوبت‌های من» نوبت را لغو کند.', 'کسب‌وکار نیز می‌تواند در صورت لزوم نوبت را لغو یا رد کند.'])}
      </div>`
    });
  });
})();
