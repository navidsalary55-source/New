/* پنل مدیریت: بررسی، تأیید، غیرفعال‌سازی و حذف کسب‌وکارها */
(function () {
  const NB = window.NB, J = NB.J, esc = NB.esc, fa = NB.fa, ic = NB.icon;
  const S = () => NB.S();
  const AD = { stats: null, list: null, detail: {}, loading: false };
  let filter = 'pending';

  const stChip = (st) => { const x = NB.BIZ_STATUS[st] || [st, '']; return `<span class="chip ${x[1]}">${x[0]}</span>`; };
  const dateOf = (ms) => J.short(J.fromDate(new Date(ms)));
  const guard = (fn) => (p, first) => { if (!S().admin) return NB.go('/admin'); fn(p, first); };
  const fail = (e) => {
    if (e.adminExpired) { NB.toast('نشست مدیر تمام شد؛ دوباره وارد شوید', 'bad'); NB.go('/admin'); return; }
    NB.toast(e.message, 'bad');
  };
  const reload = () => Promise.all([NB.api('GET', '/api/admin/stats'), NB.api('GET', '/api/admin/businesses')]).then((r) => {
    AD.stats = r[0]; AD.list = r[1].businesses.map(NB.ingest); AD.detail = {};
  });
  // صفحه را می‌کشد و بعد از رسیدن داده دوباره رسم می‌کند
  const ensure = (first) => {
    if ((first || !AD.list) && !AD.loading) {
      AD.loading = true;
      reload().catch(fail).then(() => { AD.loading = false; if (/^\/admin\//.test(NB.path()) && !NB.$('#ov').children.length) NB.rerender(); });
    }
  };
  const refreshBtn = `<button class="bar-btn" data-act="adminRefresh" aria-label="بروزرسانی">${ic('refresh')}</button>`;
  NB.acts.adminRefresh = () => { AD.loading = true; NB.toast('بروزرسانی…'); reload().catch(fail).then(() => { AD.loading = false; NB.rerender(); }); };

  /* ---------- ورود ---------- */
  NB.route('/admin', () => {
    if (S().admin) return NB.replace('/admin/home');
    NB.page({
      title: 'ورود مدیر', back: true,
      html: `<div class="pad"><div class="about"><div class="logo">${ic('shield')}</div><h1>پنل مدیریت</h1><p class="muted">فقط برای مدیر برنامه</p></div>
      <form class="card" data-form="adminLogin">${NB.isLocal() ? '<p class="muted sm">نسخه‌ی آزمایشی: رمز مدیر «admin1234» است.</p>' : ''}<div class="field"><label>رمز مدیر</label><input class="inp" id="apw" type="password" dir="ltr" autocomplete="current-password" placeholder="رمز"></div>
      <button class="btn btn-pri btn-block" type="submit">ورود</button></form></div>`
    });
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-form="adminLogin"]');
    if (!f) return;
    e.preventDefault();
    const pw = NB.$('#apw').value;
    if (!pw) return NB.toast('رمز را وارد کنید', 'bad');
    try {
      const r = await NB.api('POST', '/api/admin/login', { password: pw });
      S().admin = r.token; NB.save(); AD.list = null; NB.toast('خوش آمدید ✓'); NB.replace('/admin/home');
    } catch (err) { NB.toast(err.message, 'bad'); }
  });

  /* ---------- کارت کسب‌وکار ---------- */
  const card = (b) => {
    const c = NB.cat(b.cat);
    return `<div class="ab-card" data-s="${esc([b.name, b.phone, b.city, c.name, b.address].join(' ').toLowerCase())}">
      <div class="ab-top" data-act="nav" data-to="/admin/biz/${b.id}">
        <div class="ab-th" style="background:linear-gradient(135deg,${c.c1},${c.c2})">${b.photos[0] ? `<img src="${esc(b.photos[0])}" alt="">` : c.emoji}</div>
        <div class="grow"><b>${esc(b.name)}</b>${b.demo ? ' <span class="chip">نمونه</span>' : ''}<div class="muted sm">${c.emoji} ${esc(c.name)} · ${esc(b.city)}</div><div class="muted sm" dir="ltr" style="text-align:right">${esc(b.phone)}</div></div>
        ${stChip(b.status)}
      </div>
      <div class="row gap wrap sm ab-badges"><span class="muted">${fa(b.photos.length)} عکس${b.video ? ' + ویدیو' : ''}</span><span class="muted">· ${fa(b.appts || 0)} نوبت</span><span class="muted">· ثبت ${dateOf(b.created)}</span>${b.reports ? `<span class="chip bad">🚩 ${fa(b.reports)} گزارش</span>` : ''}${b.edited ? '<span class="chip warn">ویرایش‌شده</span>' : ''}</div>
      <div class="row gap wrap mt">
        <button class="btn btn-ghost btn-sm" data-act="nav" data-to="/admin/biz/${b.id}">بررسی</button>
        ${b.status !== 'approved' ? `<button class="btn btn-pri btn-sm" data-act="admSet" data-id="${b.id}" data-v="approved">${ic('check')} تأیید</button>` : `<button class="btn btn-danger-o btn-sm" data-act="admSet" data-id="${b.id}" data-v="disabled">${ic('ban')} غیرفعال</button>`}
        ${b.status === 'pending' ? `<button class="btn btn-danger-o btn-sm" data-act="admSet" data-id="${b.id}" data-v="rejected">رد</button>` : ''}
        ${b.status === 'disabled' ? '' : `<button class="btn btn-danger-o btn-sm" data-act="admDel" data-id="${b.id}">${ic('trash')}</button>`}
      </div></div>`;
  };
  const loadingBox = '<div class="empty"><div class="e-ic">⏳</div><p>در حال دریافت اطلاعات…</p></div>';

  /* ---------- داشبورد ---------- */
  NB.route('/admin/home', guard((p, first) => {
    ensure(first);
    const st = AD.stats, list = AD.list || [];
    const pending = list.filter((b) => b.status === 'pending'), reported = list.filter((b) => b.reports), edited = list.filter((b) => b.edited && b.status === 'approved');
    const tile = (n, label, cls, f) => `<button class="stat ${cls || ''}" data-act="admFilter" data-f="${f}"><b>${fa(n)}</b><span>${label}</span></button>`;
    NB.page({
      title: 'پنل مدیریت', tabs: 'admin', tab: 'dash', actions: refreshBtn,
      html: !st ? loadingBox : `<div class="stats pt">${tile(st.pending, 'در انتظار تأیید', 'warn', 'pending')}${tile(st.reported, 'گزارش‌شده', 'warn', 'reported')}${tile(st.approved, 'فعال', 'ok', 'approved')}${tile(st.disabled + st.rejected, 'غیرفعال / رد شده', '', 'inactive')}${tile(st.total, 'کل کسب‌وکارها', '', 'all')}${tile(st.edited, 'ویرایش‌شده (نیاز به نگاه)', '', 'edited')}</div>
      <div class="card row between"><span>نوبت‌ها: امروز <b>${fa(st.today)}</b> · ۷ روز اخیر <b>${fa(st.week)}</b> · کل <b>${fa(st.appointments)}</b></span></div>
      ${!st.requireApproval ? '<div class="banner warn"><b>تأیید دستی خاموش است:</b> کسب‌وکارهای جدید بدون بررسی شما فوراً نمایش داده می‌شوند. از «تنظیمات» می‌توانید روشنش کنید.</div>' : ''}
      ${pending.length ? `<div class="sec-h"><h2>⏳ منتظر تأیید شما (${fa(pending.length)})</h2></div><div class="list">${pending.slice(0, 8).map(card).join('')}</div>` : '<div class="card center"><p>✅ کسب‌وکاری در انتظار تأیید نیست.</p></div>'}
      ${reported.length ? `<div class="sec-h"><h2>🚩 گزارش‌شده توسط کاربران</h2></div><div class="list">${reported.map(card).join('')}</div>` : ''}
      ${edited.length ? `<div class="sec-h"><h2>✏️ ویرایش‌شده بعد از تأیید</h2></div><div class="list">${edited.map(card).join('')}</div>` : ''}
      <div style="height:1rem"></div>`
    });
  }));
  NB.acts.admFilter = (d) => { filter = d.f; NB.go('/admin/list'); };

  /* ---------- فهرست ---------- */
  NB.route('/admin/list', guard((p, first) => {
    ensure(first);
    const list = AD.list || [];
    const F = {
      all: [list, 'همه'], pending: [list.filter((b) => b.status === 'pending'), 'در انتظار'], approved: [list.filter((b) => b.status === 'approved'), 'فعال'],
      inactive: [list.filter((b) => b.status === 'disabled' || b.status === 'rejected'), 'غیرفعال/رد شده'], reported: [list.filter((b) => b.reports), 'گزارش‌شده'], edited: [list.filter((b) => b.edited && b.status === 'approved'), 'ویرایش‌شده']
    };
    if (!F[filter]) filter = 'all';
    const rows = F[filter][0];
    NB.page({
      title: 'همه‌ی کسب‌وکارها', tabs: 'admin', tab: 'list', actions: refreshBtn,
      html: !AD.list ? loadingBox : `<form class="search inline" onsubmit="return false">${ic('search')}<input id="aq" type="search" placeholder="جستجو: نام، شماره، شهر…"></form>
      <div class="chips scroll">${Object.keys(F).map((k) => `<button class="chip-btn ${filter === k ? 'on' : ''}" data-act="admTab" data-f="${k}">${F[k][1]} (${fa(F[k][0].length)})</button>`).join('')}</div>
      <div class="list pt" id="alist">${rows.length ? rows.map(card).join('') : NB.emptyState('📭', 'موردی وجود ندارد.')}</div><div style="height:1rem"></div>`
    });
  }));
  NB.acts.admTab = (d) => { filter = d.f; NB.rerender(); };
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'aq') return;
    const q = NB.en(e.target.value).trim().toLowerCase();
    NB.$$('#alist .ab-card').forEach((el) => { el.hidden = !!q && !el.dataset.s.includes(q); });
  });

  /* ---------- اقدام‌ها ---------- */
  const REASONS = ['محتوای نامناسب یا خلاف قوانین', 'اطلاعات ناقص یا نادرست', 'عکس یا ویدیوی نامناسب', 'کسب‌وکار تکراری', 'شماره تماس یا آدرس معتبر نیست'];
  function setStatus(id, status, note) {
    return NB.api('PATCH', '/api/admin/businesses/' + id, { status, note }).then(() => reload()).then(() => { NB.toast('انجام شد ✓'); NB.rerender(); }).catch(fail);
  }
  NB.acts.admSet = (d) => {
    if (d.v === 'approved' || d.v === 'pending') return setStatus(d.id, d.v, '');
    const title = d.v === 'disabled' ? 'غیرفعال کردن کسب‌وکار' : 'رد کردن کسب‌وکار';
    const el = NB.sheet(`<h3 class="sh-t">${title}</h3><p class="muted sm">دلیل را برای صاحب کسب‌وکار بنویسید (اختیاری).</p>
      <div class="chips wrap">${REASONS.map((r) => `<button class="chip-btn" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <textarea class="inp mt" id="an" rows="2" placeholder="توضیح برای صاحب کسب‌وکار…"></textarea>
      <button class="btn btn-danger btn-block mt" id="anOk">${d.v === 'disabled' ? 'غیرفعال شود' : 'رد شود'}</button>`);
    el.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => { el.querySelector('#an').value = b.dataset.r; }));
    el.querySelector('#anOk').addEventListener('click', () => { const n = el.querySelector('#an').value; NB.closeOv(); setStatus(d.id, d.v, n); });
  };
  NB.acts.admDel = async (d, el) => {
    const b = (AD.list || []).find((x) => x.id === d.id) || { name: '' };
    if (!(await NB.confirm('کسب‌وکار «' + b.name + '» همراه با همه‌ی نوبت‌ها، عکس‌ها و ویدیویش برای همیشه حذف شود؟', 'حذف دائمی', true))) return;
    try { await NB.api('DELETE', '/api/admin/businesses/' + d.id); await reload(); NB.toast('حذف شد'); if (/^\/admin\/biz\//.test(NB.path())) NB.go('/admin/list'); else NB.rerender(); } catch (e) { fail(e); }
  };

  /* ---------- جزئیات ---------- */
  NB.route('/admin/biz/:id', guard((p, first) => {
    const id = p.id, b = AD.detail[id];
    if (first || !b) {
      if (!AD.detailLoading) {
        AD.detailLoading = true;
        NB.api('GET', '/api/admin/businesses/' + id).then((d) => { NB.ingest(d); AD.detail[id] = d; }).catch((e) => { fail(e); if (e.status === 404) NB.go('/admin/list'); })
          .then(() => { AD.detailLoading = false; if (NB.path() === '/admin/biz/' + id) NB.rerender(); });
      }
    }
    if (!b) return NB.page({ title: 'بررسی کسب‌وکار', back: true, html: loadingBox });
    const c = NB.cat(b.cat);
    const geo = b.lat != null ? `https://www.openstreetmap.org/?mlat=${b.lat}&mlon=${b.lng}#map=17/${b.lat}/${b.lng}` : '';
    NB.page({
      title: 'بررسی کسب‌وکار', back: true, fab: true,
      html: `<div class="pad adm-d">
        <div class="row between"><h2>${esc(b.name)}</h2>${stChip(b.status)}</div>
        ${b.statusNote ? `<div class="banner warn sm">توضیح ثبت‌شده: ${esc(b.statusNote)}</div>` : ''}
        ${b.edited ? '<div class="banner warn sm"><b>بعد از تأیید ویرایش شده است.</b> بررسی کنید و «تأیید» بزنید تا این علامت برداشته شود.</div>' : ''}
        <div class="card"><h3>اطلاعات</h3>
          <div class="svc-r"><span>نوع</span><b>${c.emoji} ${esc(c.name)}</b></div>
          <div class="svc-r"><span>تلفن</span><a dir="ltr" href="tel:${esc(b.phone)}"><b>${esc(b.phone)}</b></a></div>
          <div class="svc-r"><span>شهر</span><b>${esc(b.city)}</b></div>
          <div class="svc-r"><span>آدرس</span><b style="text-align:left">${esc(b.address)}</b></div>
          ${geo ? `<div class="svc-r"><span>موقعیت</span><a href="${geo}"><b>نمایش روی نقشه</b></a></div>` : ''}
          <div class="svc-r"><span>تعداد نوبت</span><b>${fa(b.appts || 0)}</b></div><div class="svc-r"><span>ثبت</span><b>${dateOf(b.created)}</b></div>
          ${b.desc ? `<p class="pre mt">${esc(b.desc)}</p>` : '<p class="muted mt">توضیحاتی ثبت نشده.</p>'}</div>
        <div class="card"><h3>${ic('image', 'xs')} عکس‌ها (${fa(b.photos.length)})</h3>${b.photos.length ? `<div class="photos">${b.photos.map((ph, i) => `<div class="ph"><img src="${esc(ph)}" alt="" data-act="admZoom" data-i="${i}"><button class="ph-x" data-act="admPhotoDel" data-id="${b.id}" data-i="${i}" aria-label="حذف">${ic('trash')}</button></div>`).join('')}</div>` : '<p class="muted">عکسی نیست.</p>'}</div>
        ${b.video ? `<div class="card"><h3>${ic('video', 'xs')} ویدیو</h3><video class="adm-v" controls playsinline preload="metadata" src="${esc(b.video.url)}"></video><button class="btn btn-danger-o btn-sm mt" data-act="admVideoDel" data-id="${b.id}">${ic('trash')} حذف ویدیو</button></div>` : ''}
        <div class="card"><h3>${ic('tag', 'xs')} خدمات</h3>${b.services.map((s) => `<div class="svc-r"><span>${esc(s.name)}${s.active === false ? ' <small class="muted">(غیرفعال)</small>' : ''}</span><b>${NB.money(s.price)}</b></div>`).join('')}</div>
        <div class="card"><h3>🚩 گزارش‌های کاربران (${fa(b.reports.filter((r) => r.open).length)} باز)</h3>${b.reports.length ? b.reports.map((r) => `<div class="rev"><div class="row between"><span class="muted sm">${dateOf(r.at)}</span>${r.open ? '<span class="chip bad">باز</span>' : '<span class="chip">بسته</span>'}</div><p>${esc(r.reason)}</p></div>`).join('') + (b.reports.some((r) => r.open) ? `<button class="btn btn-ghost btn-sm" data-act="admClearRep" data-id="${b.id}">بستن همه‌ی گزارش‌ها</button>` : '') : '<p class="muted">گزارشی ثبت نشده.</p>'}</div>
        <div class="card"><h3>${ic('star', 'xs')} نظرات (${fa(b.rN)})</h3>${b.reviews.length ? b.reviews.slice().reverse().map((v) => `<div class="rev"><div class="row between"><b>${esc(v.name)}</b><span class="row gap vc">${NB.stars(v.stars)}<button class="icon-btn danger" data-act="admRevDel" data-id="${b.id}" data-r="${v.id}">${ic('trash')}</button></span></div>${v.text ? `<p>${esc(v.text)}</p>` : ''}</div>`).join('') : '<p class="muted">نظری نیست.</p>'}</div>
      </div>
      <div class="bottom-bar adm-bar">
        ${b.status !== 'approved' ? `<button class="btn btn-pri grow" data-act="admSet" data-id="${b.id}" data-v="approved">${ic('check')} تأیید</button>` : `<button class="btn btn-danger-o grow" data-act="admSet" data-id="${b.id}" data-v="disabled">${ic('ban')} غیرفعال</button>`}
        ${b.status === 'pending' ? `<button class="btn btn-danger-o" data-act="admSet" data-id="${b.id}" data-v="rejected">رد</button>` : ''}
        <button class="btn btn-danger" data-act="admDel" data-id="${b.id}">${ic('trash')} حذف</button></div>`
    });
  }));
  const afterDetail = (id) => NB.api('GET', '/api/admin/businesses/' + id).then((d) => { NB.ingest(d); AD.detail[id] = d; NB.rerender(); }).catch(fail);
  NB.acts.admZoom = (d) => { const b = AD.detail[NB.path().split('/')[3]]; if (b) NB.lightbox(b.photos[+d.i]); };
  NB.acts.admPhotoDel = async (d) => {
    if (!(await NB.confirm('این عکس حذف شود؟', 'حذف', true))) return;
    try { await NB.api('DELETE', `/api/admin/businesses/${d.id}/photos/${d.i}`); NB.toast('حذف شد'); afterDetail(d.id); } catch (e) { fail(e); }
  };
  NB.acts.admVideoDel = async (d) => {
    if (!(await NB.confirm('ویدیو حذف شود؟', 'حذف', true))) return;
    try { await NB.api('DELETE', `/api/admin/businesses/${d.id}/video`); NB.toast('حذف شد'); afterDetail(d.id); } catch (e) { fail(e); }
  };
  NB.acts.admRevDel = async (d) => {
    if (!(await NB.confirm('این نظر حذف شود؟', 'حذف', true))) return;
    try { await NB.api('DELETE', `/api/admin/businesses/${d.id}/reviews/${d.r}`); NB.toast('حذف شد'); afterDetail(d.id); } catch (e) { fail(e); }
  };
  NB.acts.admClearRep = async (d) => {
    try { await NB.api('POST', `/api/admin/businesses/${d.id}/reports/clear`); await reload(); NB.toast('گزارش‌ها بسته شد'); afterDetail(d.id); } catch (e) { fail(e); }
  };

  /* ---------- تنظیمات مدیر ---------- */
  NB.route('/admin/settings', guard((p, first) => {
    ensure(first);
    const st = AD.stats;
    NB.page({
      title: 'تنظیمات مدیریت', tabs: 'admin', tab: 'set',
      html: `<div class="pad">${!st ? loadingBox : `<div class="card"><label class="row between set-r"><span><b>تأیید دستی کسب‌وکارهای جدید</b><div class="muted sm">روشن: هر کسب‌وکار جدید ابتدا باید توسط شما تأیید شود (پیشنهاد می‌شود).</div></span><span class="sw"><input type="checkbox" data-act="admReq" ${st.requireApproval ? 'checked' : ''}><span></span></span></label></div>
      ${st.demo ? `<div class="card"><h3>کسب‌وکارهای نمونه</h3><p class="muted sm">${fa(st.demo)} کسب‌وکار نمونه در سرور هست. قبل از انتشار حذفشان کنید.</p><button class="btn btn-danger-o btn-block" data-act="admDemo">حذف همه‌ی کسب‌وکارهای نمونه</button></div>` : ''}`}
      <div class="card"><h3>سرور</h3><p class="muted sm" dir="ltr" style="text-align:right">${esc(NB.base())}</p><p class="muted sm">رمز مدیر از تنظیمات سرور (ADMIN_PASSWORD) تغییر می‌کند. نشست مدیر ۱۲ ساعت اعتبار دارد.</p></div>
      <button class="btn btn-danger-o btn-block" data-act="admLogout">خروج از پنل مدیریت</button></div>`
    });
  }));
  NB.acts.admReq = async (d, el) => {
    try { await NB.api('PUT', '/api/admin/settings', { requireApproval: el.checked }); if (AD.stats) AD.stats.requireApproval = el.checked; NB.toast(el.checked ? 'تأیید دستی روشن شد' : 'تأیید دستی خاموش شد'); } catch (e) { el.checked = !el.checked; fail(e); }
  };
  NB.acts.admDemo = async () => {
    if (!(await NB.confirm('همه‌ی کسب‌وکارهای نمونه حذف شوند؟', 'حذف', true))) return;
    try { await NB.api('POST', '/api/admin/demo/delete'); await reload(); NB.toast('حذف شد'); NB.rerender(); } catch (e) { fail(e); }
  };
  NB.acts.admLogout = () => { S().admin = null; NB.save(); AD.list = null; AD.stats = null; NB.toast('از پنل مدیریت خارج شدید'); NB.go('/home'); };
})();
