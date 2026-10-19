/* صفحه‌های مشتری: خانه، فهرست، جزئیات، رزرو نوبت، نوبت‌های من، علاقه‌مندی‌ها */
(function () {
  const NB = window.NB, J = NB.J, esc = NB.esc, fa = NB.fa, ic = NB.icon;
  const S = () => NB.S();

  /* ---------- ابزارهای مشترک ---------- */
  NB.effStatus = (a) => (a.status === 'confirmed' && NB.apptStart(a) + 60 * 60000 < Date.now() ? 'done' : a.status);
  const norm = (s) => NB.en(String(s || '')).replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase();
  const chip = (st) => { const x = NB.STATUS[st] || [st, '']; return `<span class="chip ${x[1]}">${x[0]}</span>`; };
  NB.chip = chip;

  NB.share = (text) => {
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    const done = () => NB.toast('متن در کلیپ‌بورد کپی شد');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => NB.toast(text));
    else NB.toast(text);
  };

  // بیشترین تخفیف روزهای پیش‌رو (تا ۱۴ روز)
  NB.nextDiscount = (b) => {
    let best = null; const t = J.today();
    for (let i = 0; i <= Math.min(b.advance || 30, 14); i++) {
      const d = J.addDays(t, i), info = NB.dayInfo(b, d.y, d.m, d.d);
      if (!info.off && info.discount > 0 && (i > 0 || NB.freeCount(b, d.y, d.m, d.d) > 0 || i > 0)) {
        if (!best || info.discount > best.percent) best = { percent: info.discount, key: info.key, days: i };
      }
    }
    return best;
  };
  NB.openNow = (b) => {
    const t = J.today(), info = NB.dayInfo(b, t.y, t.m, t.d);
    if (info.off) return false;
    const n = new Date(), m = n.getHours() * 60 + n.getMinutes(), h = info.hours;
    if (m < NB.toMin(h.from) || m >= NB.toMin(h.to)) return false;
    if (h.brk && m >= NB.toMin(h.bfrom) && m < NB.toMin(h.bto)) return false;
    return true;
  };

  const coverStyle = (b) => { const c = NB.cat(b.cat); return `background:linear-gradient(135deg,${c.c1},${c.c2})`; };
  const coverInner = (b) => (b.photos && b.photos[0] ? `<img src="${b.photos[0]}" alt="">` : `<span class="cv-emoji">${NB.cat(b.cat).emoji}</span>`);

  NB.bizCard = (b) => {
    const r = NB.rating(b), d = NB.nextDiscount(b), p = NB.minPrice(b), c = NB.cat(b.cat);
    return `<div class="bcard" data-act="nav" data-to="/biz/${b.id}">
      <div class="cover" style="${coverStyle(b)}">${coverInner(b)}
        ${r.n ? `<span class="rate">${ic('star')}${fa(r.avg.toFixed(1).replace('.', '٫'))} <small>(${fa(r.n)})</small></span>` : '<span class="rate new">جدید</span>'}
        <button class="fav ${NB.isFav(b.id) ? 'on' : ''}" data-act="fav" data-id="${b.id}" aria-label="علاقه‌مندی">${ic('heart')}</button>
        ${d ? `<span class="disc">${fa(d.percent)}٪ تخفیف</span>` : ''}
      </div>
      <div class="bbody"><h3>${esc(b.name)}</h3>
        <div class="muted sm">${c.emoji} ${esc(c.name)} · ${ic('pin', 'xs')} ${esc(b.city)}</div>
        <div class="row between sm"><span class="${NB.openNow(b) ? 'ok-t' : 'muted'}">${NB.openNow(b) ? '● اکنون باز' : 'در حال حاضر بسته'}</span>${p ? `<span class="muted">از ${NB.money(p)} ${NB.cfg.currency}</span>` : ''}</div>
      </div></div>`;
  };

  NB.acts.fav = (d, el, e) => {
    e.stopPropagation();
    NB.toggleFav(d.id);
    el.classList.toggle('on', NB.isFav(d.id));
    if (NB.path() === '/fav') NB.rerender();
  };

  const emptyState = (emoji, text, btn) => `<div class="empty"><div class="e-ic">${emoji}</div><p>${text}</p>${btn || ''}</div>`;
  NB.emptyState = emptyState;

  /* ---------- خانه ---------- */
  NB.route('/home', () => {
    const s = S(), cats = NB.CATS;
    const mine = s.appointments.filter((a) => a.mine && ['pending', 'confirmed'].includes(NB.effStatus(a)) && NB.apptStart(a) > Date.now()).sort((a, b) => NB.apptStart(a) - NB.apptStart(b))[0];
    const inCity = (b) => !s.settings.city || b.city === s.settings.city;
    const hot = NB.pub().filter(inCity).filter((b) => NB.nextDiscount(b)).sort((a, b) => NB.nextDiscount(b).percent - NB.nextDiscount(a).percent).slice(0, 8);
    const top = NB.pub().filter(inCity).sort((a, b) => NB.rating(b).avg - NB.rating(a).avg).slice(0, 6);
    const my = NB.myBiz();
    NB.page({
      title: NB.cfg.appName, tabs: 'customer', tab: 'home',
      html: `<div class="hero">
        <div class="row between"><div><div class="hello">سلام${s.user.name ? ' ' + esc(s.user.name) : ''} 👋</div><div class="sub">امروز برای چه کاری نوبت می‌خواهی؟</div></div>
        <button class="city-btn" data-act="cityPick">${ic('pin', 'xs')} ${esc(s.settings.city || 'همه شهرها')}</button></div>
        <form class="search" data-act-submit="search">${ic('search')}<input id="q" type="search" placeholder="جستجوی آرایشگاه، دکتر، خدمت…" enterkeyhint="search"></form>
      </div>
      <div class="cta cta-top" data-act="nav" data-to="${my ? '/owner' : '/owner/register'}"><img src="img/hero.png" alt=""><div><b>${my ? 'ورود به پنل کسب‌وکار شما' : 'صاحب کسب‌وکار هستید؟'}</b><div class="sm">${my ? 'نوبت‌ها و برنامه کاری را مدیریت کنید' : 'رایگان ثبت‌نام کنید و نوبت‌های آنلاین بگیرید'}</div><span class="cta-btn">${my ? 'ورود به پنل' : 'ثبت کسب‌وکار'}</span></div></div>
      ${mine ? `<div class="next-appt" data-act="nav" data-to="/appts">${ic('clock')}<div><b>نوبت بعدی شما</b><div class="sm">${esc((NB.biz(mine.biz) || {}).name || '')} — ${J.label(mine.date)}، ساعت ${fa(mine.time)}</div></div>${ic('next')}</div>` : ''}
      <div class="sec-h"><h2>دسته‌بندی‌ها</h2></div>
      <div class="cat-grid">${cats.map((c) => `<button class="cat" data-act="nav" data-to="/cat/${c.id}"><span class="cat-ic" style="background:linear-gradient(135deg,${c.c1},${c.c2})">${c.emoji}</span><span>${esc(c.name)}</span></button>`).join('')}</div>
      ${hot.length ? `<div class="sec-h"><h2>🔥 تخفیف‌های این روزها</h2></div><div class="hscroll">${hot.map(NB.bizCard).join('')}</div>` : ''}
      <div class="sec-h"><h2>⭐ پرامتیازترین‌ها</h2><button class="link" data-act="nav" data-to="/search">همه</button></div>
      <div class="list">${top.length ? top.map(NB.bizCard).join('') : emptyState('🔍', 'در این شهر هنوز کسب‌وکاری ثبت نشده است.')}</div>`
    });
  });

  NB.acts.cityPick = () => {
    const cur = S().settings.city || '';
    const el = NB.sheet(`<h3 class="sh-t">انتخاب شهر</h3><div class="chips wrap">${['', ...NB.CITIES].map((c) => `<button class="chip-btn ${c === cur ? 'on' : ''}" data-city="${esc(c)}">${c || 'همه شهرها'}</button>`).join('')}</div>`);
    el.querySelectorAll('[data-city]').forEach((b) => b.addEventListener('click', () => {
      S().settings.city = b.dataset.city || null; NB.save(); NB.closeOv(); setTimeout(() => NB.rerender(), 50);
    }));
  };
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-act-submit="search"]');
    if (!f) return;
    e.preventDefault();
    const q = NB.$('#q', f).value.trim();
    NB.go('/search' + (q ? '?q=' + encodeURIComponent(q) : ''));
  });

  /* ---------- فهرست (دسته‌بندی و جستجو) ---------- */
  let LS = { sort: 'rate', disc: false };
  function listPage(title, opts, first) {
    if (first) LS = { sort: 'rate', disc: false };
    const s = S(), q = norm(opts.q);
    let arr = NB.pub().filter((b) => (!opts.cat || b.cat === opts.cat) && (!s.settings.city || b.city === s.settings.city));
    if (q) arr = arr.filter((b) => norm([b.name, NB.cat(b.cat).name, b.city, b.address, b.desc, b.services.map((x) => x.name).join(' ')].join(' ')).includes(q));
    if (LS.disc) arr = arr.filter((b) => NB.nextDiscount(b));
    arr.sort((a, b) => LS.sort === 'price' ? NB.minPrice(a) - NB.minPrice(b) : LS.sort === 'disc' ? ((NB.nextDiscount(b) || { percent: 0 }).percent - (NB.nextDiscount(a) || { percent: 0 }).percent) : NB.rating(b).avg - NB.rating(a).avg);
    NB.page({
      title, back: true, tabs: 'customer', tab: 'home',
      html: `${opts.cat ? '' : `<form class="search inline" data-act-submit="search">${ic('search')}<input id="q" type="search" value="${esc(opts.q || '')}" placeholder="جستجو…"></form>`}
      <div class="chips scroll"><button class="chip-btn ${LS.sort === 'rate' ? 'on' : ''}" data-act="sort" data-v="rate">امتیاز</button><button class="chip-btn ${LS.sort === 'price' ? 'on' : ''}" data-act="sort" data-v="price">ارزان‌ترین</button><button class="chip-btn ${LS.sort === 'disc' ? 'on' : ''}" data-act="sort" data-v="disc">بیشترین تخفیف</button><button class="chip-btn ${LS.disc ? 'on' : ''}" data-act="onlyDisc">فقط تخفیف‌دار</button><button class="chip-btn" data-act="cityPick">${ic('pin', 'xs')} ${esc(s.settings.city || 'همه شهرها')}</button></div>
      <div class="muted sm pad">${fa(arr.length)} نتیجه</div>
      <div class="list">${arr.length ? arr.map(NB.bizCard).join('') : emptyState('🔍', 'موردی پیدا نشد. فیلترها را تغییر دهید.')}</div>`
    });
  }
  NB.route('/cat/:id', (p, first) => listPage(NB.cat(p.id).emoji + ' ' + NB.cat(p.id).name, { cat: p.id }, first));
  NB.route('/search', (p, first) => listPage('جستجو', { q: NB.query().q }, first));
  NB.acts.sort = (d) => { LS.sort = d.v; NB.rerender(); };
  NB.acts.onlyDisc = () => { LS.disc = !LS.disc; NB.rerender(); };

  /* ---------- علاقه‌مندی‌ها ---------- */
  NB.route('/fav', () => {
    const arr = S().favorites.map(NB.biz).filter((b) => b && b.status === 'approved');
    NB.page({ title: 'علاقه‌مندی‌ها', tabs: 'customer', tab: 'heart', html: `<div class="list pt">${arr.length ? arr.map(NB.bizCard).join('') : emptyState('💜', 'هنوز چیزی ذخیره نکرده‌اید. با زدن قلب روی هر کسب‌وکار، اینجا می‌بینید.', '<button class="btn btn-pri" data-act="nav" data-to="/home">دیدن کسب‌وکارها</button>')}</div>` });
  });

  /* ---------- جزئیات کسب‌وکار ---------- */
  let galIdx = 0;
  NB.route('/biz/:id', (p, first) => {
    const b = NB.biz(p.id);
    if (!b) return NB.go('/home');
    if (first) galIdx = 0;
    const c = NB.cat(b.cat), r = NB.rating(b), t = J.today(), todayWd = J.wd(t.y, t.m, t.d);
    const media = [];
    b.photos.forEach((src, i) => media.push(`<div class="gal-i" data-act="zoom" data-i="${i}"><img src="${src}" alt=""></div>`));
    if (b.video) media.push(`<div class="gal-i vid"><video id="bv" controls playsinline preload="metadata" src="${esc(b.video.url)}"></video></div>`);
    const gallery = media.length ? `<div class="gal">${media.join('')}</div>${media.length > 1 ? `<div class="gal-n muted sm">${fa(b.photos.length)} عکس${b.video ? ' و ۱ ویدیو' : ''} — بکشید</div>` : ''}` : `<div class="gal-ph" style="${coverStyle(b)}"><span class="cv-emoji big">${c.emoji}</span></div>`;
    const svcs = b.services.filter((s) => s.active !== false);
    const offFuture = b.offDates.filter((k) => J.cmp(J.parse(k), t) >= 0).sort().slice(0, 8);
    const dd = Object.keys(b.dateDiscount).filter((k) => b.dateDiscount[k] > 0 && J.cmp(J.parse(k), t) >= 0).sort().slice(0, 8);
    const wk = Object.keys(b.weekDiscount).filter((k) => b.weekDiscount[k] > 0);
    const geo = b.lat != null ? `geo:${b.lat},${b.lng}?q=${b.lat},${b.lng}(${encodeURIComponent(b.name)})` : `geo:0,0?q=${encodeURIComponent(b.city + ' ' + b.address)}`;
    NB.page({
      title: b.name, back: true, fab: true,
      actions: `<button class="bar-btn ${NB.isFav(b.id) ? 'on' : ''}" data-act="fav" data-id="${b.id}">${ic('heart')}</button><button class="bar-btn" data-act="shareBiz" data-id="${b.id}">${ic('share')}</button>`,
      html: `${gallery}
      <div class="detail">
        ${b.status !== 'approved' ? `<div class="card flat note-warn">این صفحه فقط برای شما نمایش داده می‌شود چون کسب‌وکار شما «${(NB.BIZ_STATUS[b.status] || [b.status])[0]}» است و برای مشتریان دیده نمی‌شود.</div>` : ''}
        <div class="row between"><h1 class="d-t">${esc(b.name)}</h1></div>
        <div class="row gap wrap sm"><span class="tag">${c.emoji} ${esc(c.name)}</span><span class="tag">${ic('pin', 'xs')} ${esc(b.city)}</span>${r.n ? `<span class="tag star">${ic('star', 'xs')} ${fa(r.avg.toFixed(1).replace('.', '٫'))} (${fa(r.n)} نظر)</span>` : ''}<span class="tag ${NB.openNow(b) ? 'ok' : ''}">${NB.openNow(b) ? '● اکنون باز' : 'اکنون بسته'}</span></div>
        <div class="actions3">
          ${b.phone ? `<a class="act-b" href="tel:${esc(b.phone)}">${ic('phone')}<span>تماس</span></a>` : ''}
          <a class="act-b" href="${geo}">${ic('nav')}<span>مسیریابی</span></a>
          <button class="act-b" data-act="shareBiz" data-id="${b.id}">${ic('share')}<span>اشتراک</span></button>
        </div>
        ${b.desc ? `<div class="card"><h3>درباره</h3><p class="pre">${esc(b.desc)}</p></div>` : ''}
        <div class="card"><h3>${ic('tag', 'xs')} خدمات و قیمت‌ها</h3>${svcs.length ? svcs.map((s) => `<div class="svc-r"><span>${esc(s.name)}</span><b>${s.price ? NB.money(s.price) + ' ' + NB.cfg.currency : 'رایگان'}</b></div>`).join('') : '<p class="muted">هنوز خدمتی ثبت نشده.</p>'}</div>
        <div class="card"><h3>${ic('clock', 'xs')} ساعت کاری</h3>${J.wdays.map((n, i) => { const h = b.hours[i]; return `<div class="hr-r ${i === todayWd ? 'today' : ''}"><span>${n}${i === todayWd ? ' (امروز)' : ''}</span>${h.open ? `<b>${fa(h.from)} تا ${fa(h.to)}${h.brk ? `<small class="muted"> · استراحت ${fa(h.bfrom)}–${fa(h.bto)}</small>` : ''}</b>` : '<b class="bad-t">تعطیل</b>'}</div>`; }).join('')}</div>
        ${(offFuture.length) ? `<div class="card"><h3>🚫 روزهای تعطیل پیش‌رو</h3><div class="chips wrap">${offFuture.map((k) => `<span class="chip bad">${J.label(k)}</span>`).join('')}</div></div>` : ''}
        ${(dd.length || wk.length) ? `<div class="card"><h3>${ic('percent', 'xs')} روزهای تخفیف</h3>${wk.map((k) => `<div class="svc-r"><span>هر ${J.wdays[k]}</span><b class="ok-t">${fa(b.weekDiscount[k])}٪ تخفیف</b></div>`).join('')}${dd.map((k) => `<div class="svc-r"><span>${J.label(k)}</span><b class="ok-t">${fa(b.dateDiscount[k])}٪ تخفیف</b></div>`).join('')}</div>` : ''}
        <div class="card"><h3>${ic('pin', 'xs')} آدرس و موقعیت</h3><p>${esc(b.city)}، ${esc(b.address || '—')}</p>
          ${b.lat != null ? `<p class="muted sm" dir="ltr">${(+b.lat).toFixed(5)}, ${(+b.lng).toFixed(5)}</p>` : ''}
          <div class="row gap"><a class="btn btn-ghost grow" href="${geo}">${ic('nav')} مسیریابی با نقشه</a>${b.lat != null ? `<a class="btn btn-ghost grow" href="https://www.openstreetmap.org/?mlat=${b.lat}&mlon=${b.lng}#map=17/${b.lat}/${b.lng}">نمایش در مرورگر</a>` : ''}</div></div>
        <div class="card"><h3>${ic('star', 'xs')} نظرات</h3>${b.reviews.length ? b.reviews.slice().reverse().map((v) => `<div class="rev"><div class="row between"><b>${esc(v.name || 'کاربر')}</b>${NB.stars(v.stars)}</div>${v.text ? `<p>${esc(v.text)}</p>` : ''}</div>`).join('') : '<p class="muted">هنوز نظری ثبت نشده است.</p>'}</div>
        ${b.status === 'approved' && !b.mine ? `<div class="pad"><button class="btn btn-ghost btn-block" data-act="reportBiz" data-id="${b.id}">🚩 گزارش تخلف یا محتوای نامناسب</button></div>` : ''}
      </div>
      <div class="bottom-bar"><div><div class="muted sm">شروع قیمت</div><b>${NB.minPrice(b) ? NB.money(NB.minPrice(b)) + ' ' + NB.cfg.currency : 'رایگان'}</b></div><button class="btn btn-pri btn-lg" ${b.status === 'approved' ? `data-act="nav" data-to="/book/${b.id}"` : 'disabled'}>${ic('calendar')} رزرو نوبت</button></div>`
    });
  });
  NB.acts.reportBiz = (d) => {
    const el = NB.sheet(`<h3 class="sh-t">گزارش تخلف</h3><p class="muted sm">اگر این کسب‌وکار خلاف قوانین است (محتوای نامناسب، اطلاعات جعلی، کلاهبرداری و…) دلیل را بنویسید تا مدیر بررسی کند.</p>
      <textarea class="inp" id="rr" rows="3" placeholder="دلیل گزارش…"></textarea><button class="btn btn-danger btn-block mt" id="rs2">ارسال گزارش</button>`);
    el.querySelector('#rs2').addEventListener('click', async () => {
      try { await NB.api('POST', '/api/businesses/' + d.id + '/report', { reason: el.querySelector('#rr').value }); NB.closeOv(); NB.toast('گزارش شما ثبت شد. ممنون 🙏'); }
      catch (e) { NB.toast(e.message, 'bad'); }
    });
  };
  NB.acts.zoom = (d) => { const b = NB.biz(NB.path().split('/')[2]); if (b) NB.lightbox(b.photos[+d.i]); };
  NB.acts.shareBiz = (d) => { const b = NB.biz(d.id); NB.share(`${b.name} — ${b.city}\n${NB.cfg.shareText}`); };

  /* ---------- رزرو نوبت ---------- */
  let BK = null;
  NB.route('/book/:id', (p, first) => {
    const b = NB.biz(p.id);
    if (!b) return NB.go('/home');
    const s = S();
    if (first || !BK || BK.id !== b.id) {
      BK = { id: b.id, svc: [], date: null, time: null, note: '', name: s.user.name, phone: s.user.phone };
      delete NB.calState.book;
    }
    NB.cur = BK;
    const t = J.today(), end = J.addDays(t, b.advance || 30);
    const svcs = b.services.filter((x) => x.active !== false);
    const sum = svcs.filter((x) => BK.svc.includes(x.id)).reduce((a, x) => a + x.price, 0);
    let disc = 0, slots = [];
    if (BK.date) { const d = J.parse(BK.date); disc = NB.dayInfo(b, d.y, d.m, d.d).discount; slots = NB.slotsFor(b, d.y, d.m, d.d); }
    const off = Math.round(sum * disc / 100), ready = BK.svc.length && BK.date && BK.time;
    const cal = NB.calendar({
      id: 'book', selected: BK.date,
      canPrev: (y, m) => J.cmp({ y, m, d: 1 }, { y: t.y, m: t.m, d: 1 }) > 0,
      canNext: (y, m) => J.cmp({ y, m, d: 1 }, { y: end.y, m: end.m, d: 1 }) < 0,
      cell: (y, m, d) => {
        const ok = NB.inWindow(b, y, m, d), info = NB.dayInfo(b, y, m, d), today = J.cmp({ y, m, d }, t) === 0;
        return { dis: !ok || info.off, off: ok && info.off, today, cls: info.discount > 0 && !info.off && ok ? 'has-disc' : '', badge: info.discount > 0 && !info.off && ok ? fa(info.discount) + '٪' : '' };
      }
    });
    NB.page({
      title: 'رزرو نوبت', back: true, fab: true,
      html: `<div class="book">
        <div class="b-head"><div class="cv-sm" style="${coverStyle(b)}">${NB.cat(b.cat).emoji}</div><div><b>${esc(b.name)}</b><div class="muted sm">${esc(b.city)} · ${esc(NB.cat(b.cat).name)}</div></div></div>
        <div class="step"><span class="n">۱</span> خدمت مورد نظر را انتخاب کنید</div>
        <div class="card flush">${svcs.length ? svcs.map((x) => `<label class="svc-pick"><input type="checkbox" data-act="svcPick" data-id="${x.id}" ${BK.svc.includes(x.id) ? 'checked' : ''}><span class="cb"></span><span class="grow">${esc(x.name)}</span><b>${x.price ? NB.money(x.price) : 'رایگان'}</b></label>`).join('') : '<p class="pad muted">این کسب‌وکار هنوز خدمتی ثبت نکرده است.</p>'}</div>
        <div class="step"><span class="n">۲</span> روز را انتخاب کنید</div>
        <div class="card">${cal}<div class="legend"><span><i class="lgd dis"></i> تعطیل / غیرقابل رزرو</span><span><i class="lgd gd"></i> روز تخفیف</span></div></div>
        ${BK.date ? `<div class="step"><span class="n">۳</span> ساعت را انتخاب کنید <small class="muted">— ${J.label(BK.date)}${disc ? ` · <b class="ok-t">${fa(disc)}٪ تخفیف</b>` : ''}</small></div>
          <div class="card">${slots.length ? `<div class="slots">${slots.map((x) => `<button class="slot ${BK.time === x.time ? 'sel' : ''}" ${x.free ? `data-act="timePick" data-t="${x.time}"` : 'disabled'}>${fa(x.time)}${x.free ? '' : '<small>پر</small>'}</button>`).join('')}</div>` : '<p class="muted center">برای این روز نوبتی تعریف نشده است.</p>'}</div>` : ''}
        ${ready ? `<div class="step"><span class="n">۴</span> اطلاعات شما</div>
          <div class="card"><div class="field"><label>نام و نام خانوادگی</label><input class="inp" data-model="name" value="${esc(BK.name)}" placeholder="مثلاً علی رضایی"></div>
          <div class="field"><label>شماره موبایل</label><input class="inp" data-model="phone" inputmode="tel" dir="ltr" value="${esc(BK.phone)}" placeholder="09123456789"></div>
          <div class="field"><label>توضیحات (اختیاری)</label><textarea class="inp" rows="2" data-model="note" placeholder="اگر نکته‌ای هست بنویسید">${esc(BK.note)}</textarea></div></div>` : ''}
      </div>
      <div class="bottom-bar col">
        ${sum ? `<div class="sum"><span>جمع خدمات</span><span>${NB.money(sum)} ${NB.cfg.currency}</span></div>${off ? `<div class="sum ok-t"><span>تخفیف ${fa(disc)}٪</span><span>− ${NB.money(off)}</span></div>` : ''}<div class="sum tot"><span>مبلغ نهایی</span><b>${NB.money(sum - off)} ${NB.cfg.currency}</b></div>` : ''}
        <button class="btn btn-pri btn-lg btn-block" data-act="confirmBook" ${ready ? '' : 'disabled'}>${ready ? 'ثبت نهایی نوبت' : (!BK.svc.length ? 'ابتدا خدمت را انتخاب کنید' : !BK.date ? 'روز را انتخاب کنید' : 'ساعت را انتخاب کنید')}</button>
      </div>`
    });
  });
  NB.acts.svcPick = (d, el) => { const i = BK.svc.indexOf(d.id); if (el.checked && i < 0) BK.svc.push(d.id); if (!el.checked && i >= 0) BK.svc.splice(i, 1); NB.rerender(); };
  NB.acts.calPick = (d) => {
    if (d.cal !== 'book') return;
    BK.date = d.k; BK.time = null; NB.rerender();
    setTimeout(() => { const v = NB.$('#view'); const el = NB.$('.slots'); if (el) v.scrollTo({ top: el.offsetTop - 140, behavior: 'smooth' }); }, 60);
  };
  NB.acts.timePick = (d) => { BK.time = d.t; NB.rerender(); setTimeout(() => { NB.$('#view').scrollTo({ top: 99999, behavior: 'smooth' }); }, 60); };
  let booking = false;
  NB.acts.confirmBook = async () => {
    if (booking) return;
    const b = NB.biz(BK.id), s = S();
    const name = (BK.name || '').trim(), phone = NB.en(BK.phone || '').replace(/\s|-/g, '');
    if (name.length < 3) return NB.toast('نام و نام خانوادگی را وارد کنید', 'bad');
    if (!/^0\d{9,10}$/.test(phone)) return NB.toast('شماره تماس معتبر نیست (مثال: 09123456789)', 'bad');
    booking = true;
    let a;
    try { a = await NB.book(b, { svc: BK.svc, date: BK.date, time: BK.time, name, phone, note: BK.note }); }
    catch (e) {
      booking = false;
      if (e.status === 409 || e.status === 404) { BK.time = null; NB.ensureDetail(b.id, true).catch(() => {}).then(() => NB.rerender()); }
      return NB.toast(e.message, 'bad');
    }
    booking = false;
    if (!s.user.name) s.user.name = name;
    if (!s.user.phone) s.user.phone = phone;
    NB.save();
    BK = null; NB.cur = null;
    NB.sheet(`<div class="done"><div class="done-ic">${ic('check')}</div><h3>${a.status === 'confirmed' ? 'نوبت شما ثبت شد 🎉' : 'درخواست نوبت ارسال شد'}</h3>
      <p class="muted">${a.status === 'confirmed' ? 'نوبت شما تأیید شده است.' : 'پس از تأیید کسب‌وکار، وضعیت نوبت به «تأیید شده» تغییر می‌کند.'}</p>
      <div class="card tight"><div class="svc-r"><span>کسب‌وکار</span><b>${esc(b.name)}</b></div><div class="svc-r"><span>زمان</span><b>${J.label(a.date)}، ${fa(a.time)}</b></div><div class="svc-r"><span>خدمت</span><b>${esc(a.svc.join('، '))}</b></div><div class="svc-r"><span>مبلغ</span><b>${NB.money(a.total)} ${NB.cfg.currency}</b></div></div>
      <button class="btn btn-pri btn-block" data-act="nav" data-to="/appts">مشاهده نوبت‌های من</button></div>`);
  };

  /* ---------- نوبت‌های من ---------- */
  let apTab = 'up';
  NB.route('/appts', (p, first) => {
    if (first) apTab = 'up';
    const s = S(), now = Date.now();
    const all = s.appointments.filter((a) => a.mine);
    const isUp = (a) => ['pending', 'confirmed'].includes(NB.effStatus(a));
    const list = all.filter((a) => (apTab === 'up' ? isUp(a) : !isUp(a))).sort((a, b) => apTab === 'up' ? NB.apptStart(a) - NB.apptStart(b) : NB.apptStart(b) - NB.apptStart(a));
    const card = (a) => {
      const b = NB.biz(a.biz) || { name: 'کسب‌وکار حذف شده', city: '', phone: '' }, st = NB.effStatus(a);
      return `<div class="appt"><div class="row between"><b>${esc(b.name)}</b>${chip(st)}</div>
        <div class="ap-l">${ic('calendar', 'xs')} ${J.label(a.date)}</div><div class="ap-l">${ic('clock', 'xs')} ساعت ${fa(a.time)}</div><div class="ap-l">${ic('tag', 'xs')} ${esc(a.svc.join('، '))}</div>
        <div class="ap-l">${ic('percent', 'xs')} ${NB.money(a.total)} ${NB.cfg.currency}${a.discount ? ` <small class="ok-t">(${fa(a.discount)}٪ تخفیف)</small>` : ''}</div>
        <div class="row gap wrap mt">
          ${b.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(b.phone)}">${ic('phone')} تماس</a>` : ''}
          ${NB.biz(a.biz) ? `<button class="btn btn-ghost btn-sm" data-act="nav" data-to="/biz/${a.biz}">مشاهده</button>` : ''}
          ${isUp(a) && NB.apptStart(a) > now ? `<button class="btn btn-danger-o btn-sm" data-act="cancelAppt" data-id="${a.id}">لغو نوبت</button>` : ''}
          ${!isUp(a) && NB.biz(a.biz) ? `<button class="btn btn-ghost btn-sm" data-act="nav" data-to="/book/${a.biz}">نوبت مجدد</button>` : ''}
          ${st === 'done' && !a.review && NB.biz(a.biz) ? `<button class="btn btn-pri btn-sm" data-act="reviewAppt" data-id="${a.id}">${ic('star')} ثبت نظر</button>` : ''}
        </div></div>`;
    };
    NB.page({
      title: 'نوبت‌های من', tabs: 'customer', tab: 'calendar',
      html: `<div class="seg"><button class="${apTab === 'up' ? 'on' : ''}" data-act="apTab" data-v="up">پیش‌رو</button><button class="${apTab === 'past' ? 'on' : ''}" data-act="apTab" data-v="past">گذشته و لغو شده</button></div>
      <div class="list pt">${list.length ? list.map(card).join('') : emptyState('📅', apTab === 'up' ? 'نوبت فعالی ندارید.' : 'سابقه‌ای وجود ندارد.', apTab === 'up' ? '<button class="btn btn-pri" data-act="nav" data-to="/home">گرفتن نوبت</button>' : '')}</div>`
    });
  });
  NB.acts.apTab = (d) => { apTab = d.v; NB.rerender(); };
  NB.acts.cancelAppt = async (d) => {
    if (!(await NB.confirm('این نوبت لغو شود؟', 'بله، لغو شود', true))) return;
    try { await NB.setApptStatus(d.id, 'cancelled'); NB.toast('نوبت لغو شد'); NB.sync(true).catch(() => {}).then(() => NB.rerender()); }
    catch (e) { NB.toast(e.message, 'bad'); }
  };
  NB.acts.reviewAppt = (d) => {
    let stars = 5;
    const el = NB.sheet(`<h3 class="sh-t">نظر شما</h3><div class="rate-in" id="ri">${[1, 2, 3, 4, 5].map((i) => `<button data-s="${i}" class="on">${ic('star')}</button>`).join('')}</div>
      <textarea class="inp" id="rt" rows="3" placeholder="تجربه‌ی خود را بنویسید (اختیاری)"></textarea><button class="btn btn-pri btn-block mt" id="rs">ثبت نظر</button>`);
    el.querySelectorAll('#ri button').forEach((b) => b.addEventListener('click', () => { stars = +b.dataset.s; el.querySelectorAll('#ri button').forEach((x) => x.classList.toggle('on', +x.dataset.s <= stars)); }));
    el.querySelector('#rs').addEventListener('click', async () => {
      const a = S().appointments.find((x) => x.id === d.id);
      try {
        await NB.api('POST', '/api/businesses/' + a.biz + '/reviews', { appt: a.id, stars, text: el.querySelector('#rt').value.trim() });
        a.review = true; NB.closeOv(); NB.toast('ممنون از نظر شما 🙏');
        NB.ensureDetail(a.biz, true).catch(() => {}); NB.sync(true).catch(() => {}).then(() => NB.rerender());
      } catch (e) { NB.toast(e.message, 'bad'); }
    });
  };

  /* ---------- پروفایل مشتری ---------- */
  NB.route('/profile', () => {
    const s = S(), n = s.appointments.filter((a) => a.mine).length, my = NB.myBiz();
    NB.cur = s.user;
    NB.page({
      title: 'پروفایل من', tabs: 'customer', tab: 'user',
      html: `<div class="prof-h"><div class="avatar">${esc((s.user.name || '؟').trim().charAt(0))}</div><div><b>${esc(s.user.name || 'کاربر مهمان')}</b><div class="muted sm">${fa(n)} نوبت ثبت‌شده</div></div></div>
      <div class="card"><div class="field"><label>نام و نام خانوادگی</label><input class="inp" data-model="name" value="${esc(s.user.name)}" placeholder="نام شما"></div>
      <div class="field"><label>شماره موبایل</label><input class="inp" data-model="phone" dir="ltr" inputmode="tel" value="${esc(s.user.phone)}" placeholder="09123456789"></div>
      <p class="muted sm">اطلاعات شما فقط برای پر شدن خودکار فرم رزرو استفاده می‌شود.</p></div>
      <div class="menu-list">
        <button data-act="nav" data-to="${my ? '/owner' : '/owner/register'}">${ic('briefcase')}<span>${my ? 'پنل کسب‌وکار من' : 'ثبت‌نام کسب‌وکار'}</span>${ic('next')}</button>
        <button data-act="nav" data-to="/settings">${ic('settings')}<span>تنظیمات</span>${ic('next')}</button>
        <button data-act="nav" data-to="/about">${ic('info')}<span>درباره ما</span>${ic('next')}</button>
        <button data-act="nav" data-to="/contact">${ic('phone')}<span>تماس با ما</span>${ic('next')}</button>
      </div>`
    });
  });
})();
