/* پنل صاحب کسب‌وکار: ثبت‌نام، داشبورد، نوبت‌ها، برنامه کاری، خدمات، پروفایل کسب‌وکار */
(function () {
  const NB = window.NB, J = NB.J, esc = NB.esc, fa = NB.fa, ic = NB.icon;
  const S = () => NB.S();

  /* ---------- ابزارها ---------- */
  NB.readImage = (file) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const max = 960, k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });

  // استخراج مختصات از لینک نقشه یا متن
  NB.parseCoords = (txt) => {
    const s = NB.en(String(txt || '')).replace(/٫/g, '.').replace(/،/g, ',');
    const re = /(-?\d{1,3}\.\d{3,})\s*[,\s/;&=]+\s*(?:lng=|lon=|mlon=)?\s*(-?\d{1,3}\.\d{3,})/;
    const m = re.exec(s);
    if (!m) return null;
    let a = parseFloat(m[1]), b = parseFloat(m[2]);
    if ((a > 44 && a < 64 && b > 24 && b < 40)) { const t = a; a = b; b = t; }
    if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
    return { lat: a, lng: b };
  };

  const validPhone = (p) => /^0\d{9,10}$/.test(NB.en(p || '').replace(/\s|-/g, ''));

  /* ---------- بلوک‌های مشترک فرم ---------- */
  const catGrid = (o) => `<div class="cat-pick">${NB.CATS.map((c) => `<button class="cp ${o.cat === c.id ? 'on' : ''}" data-act="pickCat" data-id="${c.id}"><span style="background:linear-gradient(135deg,${c.c1},${c.c2})">${c.emoji}</span><small>${esc(c.name)}</small></button>`).join('')}</div>`;

  const infoBlock = (o, withCat) => `${withCat ? '<label class="lbl">نوع کسب‌وکار</label>' + catGrid(o) : ''}
    <div class="field"><label>نام کسب‌وکار</label><input class="inp" data-model="name" value="${esc(o.name)}" placeholder="مثلاً آرایشگاه مردانه سبک"></div>
    <div class="field"><label>شماره تماس</label><input class="inp" dir="ltr" inputmode="tel" data-model="phone" value="${esc(o.phone)}" placeholder="09123456789 یا 02112345678"></div>
    <div class="field"><label>شهر</label><select class="inp" data-model="city">${NB.CITIES.map((c) => `<option ${c === o.city ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>آدرس کامل</label><textarea class="inp" rows="2" data-model="address" placeholder="محله، خیابان، کوچه، پلاک، طبقه">${esc(o.address)}</textarea></div>
    <div class="field"><label>درباره‌ی کسب‌وکار (اختیاری)</label><textarea class="inp" rows="3" data-model="desc" placeholder="چند خط درباره خدمات، تجربه و امکانات بنویسید">${esc(o.desc)}</textarea></div>`;

  const locationBlock = (o) => `<div class="card flat"><div class="row between"><b>${ic('pin', 'xs')} موقعیت روی نقشه</b>${o.lat != null ? '<span class="chip ok">ثبت شده</span>' : '<span class="chip warn">ثبت نشده</span>'}</div>
    ${o.lat != null ? `<p class="muted sm" dir="ltr">${(+o.lat).toFixed(5)}, ${(+o.lng).toFixed(5)}</p>` : '<p class="muted sm">با ثبت موقعیت، مشتری‌ها می‌توانند مسیریابی کنند.</p>'}
    <div class="row gap wrap"><button class="btn btn-pri btn-sm" data-act="gps">${ic('nav')} موقعیت فعلی من</button><button class="btn btn-ghost btn-sm" data-act="manualLoc">لینک نقشه / مختصات</button>${o.lat != null ? '<button class="btn btn-ghost btn-sm" data-act="clearLoc">پاک کردن</button>' : ''}</div></div>`;

  const photosBlock = (o) => `<div class="photos">${o.photos.map((p, i) => `<div class="ph"><img src="${p}" alt="">${i === 0 ? '<span class="cover-tag">کاور</span>' : `<button class="ph-b" data-act="phCover" data-i="${i}" title="کاور">${ic('star')}</button>`}<button class="ph-x" data-act="phDel" data-i="${i}">${ic('x')}</button></div>`).join('')}
    ${o.photos.length < 8 ? `<label class="ph add">${ic('camera')}<small>افزودن عکس</small><input type="file" id="fPhoto" accept="image/*" multiple hidden></label>` : ''}</div><p class="muted sm">حداکثر ۸ عکس. عکس اول به‌عنوان کاور نمایش داده می‌شود.</p>`;

  const videoBlock = (o) => `<div class="card flat"><div class="row between"><b>${ic('video', 'xs')} ویدیوی معرفی <small class="muted">(اختیاری)</small></b></div>
    ${o.video ? `<div class="row between mt"><span class="sm">${esc(o.video.name || 'ویدیو')} · ${fa((o.video.size / 1048576).toFixed(1))} مگابایت</span><button class="btn btn-danger-o btn-sm" data-act="vidDel">حذف</button></div>` : `<label class="btn btn-ghost btn-sm mt">${ic('plus')} انتخاب ویدیو<input type="file" id="fVideo" accept="video/*" hidden></label><p class="muted sm">حداکثر ۴۰ مگابایت.</p>`}</div>`;

  const hoursBlock = (o) => `${J.wdays.map((n, i) => {
    const h = o.hours[i];
    return `<div class="hrow ${h.open ? '' : 'off'}"><div class="row between"><b>${n}</b><label class="sw"><input type="checkbox" data-model="hours.${i}.open" data-re="1" ${h.open ? 'checked' : ''}><span></span></label></div>
      ${h.open ? `<div class="row gap vc"><input type="time" class="inp" data-model="hours.${i}.from" value="${h.from}"><span>تا</span><input type="time" class="inp" data-model="hours.${i}.to" value="${h.to}"></div>
        <label class="chk"><input type="checkbox" data-model="hours.${i}.brk" data-re="1" ${h.brk ? 'checked' : ''}> زمان استراحت (نوبت داده نمی‌شود)</label>
        ${h.brk ? `<div class="row gap vc"><input type="time" class="inp" data-model="hours.${i}.bfrom" value="${h.bfrom}"><span>تا</span><input type="time" class="inp" data-model="hours.${i}.bto" value="${h.bto}"></div>` : ''}` : '<div class="muted sm">تعطیل (روز تعطیل هفتگی)</div>'}</div>`;
  }).join('')}<button class="btn btn-ghost btn-sm mt" data-act="copyHours">کپی ساعت اولین روز باز به همه روزها</button>`;

  const slotBlock = (o) => `<div class="field"><label>مدت هر نوبت</label><select class="inp" data-model="slot" data-num>${[10, 15, 20, 30, 45, 60, 90, 120].map((v) => `<option value="${v}" ${o.slot === v ? 'selected' : ''}>${fa(v)} دقیقه</option>`).join('')}</select></div>
    <div class="field"><label>ظرفیت هر ساعت (چند نفر هم‌زمان؟)</label><select class="inp" data-model="cap" data-num>${[1, 2, 3, 4, 5, 8, 10].map((v) => `<option value="${v}" ${o.cap === v ? 'selected' : ''}>${fa(v)} نفر</option>`).join('')}</select></div>
    <div class="field"><label>مشتری تا چند روز آینده می‌تواند نوبت بگیرد؟</label><select class="inp" data-model="advance" data-num>${[7, 14, 30, 60, 90].map((v) => `<option value="${v}" ${o.advance === v ? 'selected' : ''}>${fa(v)} روز</option>`).join('')}</select></div>
    <label class="chk big"><input type="checkbox" data-model="auto" ${o.auto ? 'checked' : ''}> تأیید خودکار نوبت‌ها <small class="muted">(اگر خاموش باشد، هر نوبت باید توسط شما تأیید شود)</small></label>`;

  const servicesBlock = (o) => `${o.services.map((s, i) => `<div class="svc-e"><input class="inp" data-model="services.${i}.name" value="${esc(s.name)}" placeholder="نام خدمت">
    <div class="row gap vc"><input class="inp" data-num inputmode="numeric" dir="ltr" data-model="services.${i}.price" value="${s.price || ''}" placeholder="قیمت (${NB.cfg.currency})"><label class="chk"><input type="checkbox" data-model="services.${i}.active" ${s.active !== false ? 'checked' : ''}> فعال</label><button class="icon-btn danger" data-act="delSvc" data-i="${i}">${ic('trash')}</button></div></div>`).join('')}
    <button class="btn btn-ghost btn-block" data-act="addSvc">${ic('plus')} افزودن خدمت</button>`;

  /* ---------- اکشن‌های مشترک فرم ---------- */
  NB.acts.pickCat = (d) => {
    const o = NB.cur;
    if (o.cat !== d.id) {
      o.cat = d.id;
      if (!o._svcTouched) o.services = NB.cat(d.id).svc.map((s) => ({ id: NB.uid(), name: s[0], price: s[1], active: true }));
    }
    NB.rerender();
  };
  NB.acts.addSvc = () => { NB.cur.services.push({ id: NB.uid(), name: '', price: 0, active: true }); NB.cur._svcTouched = true; NB.saveBiz(); NB.rerender(); };
  NB.acts.delSvc = (d) => { NB.cur.services.splice(+d.i, 1); NB.cur._svcTouched = true; NB.saveBiz(); NB.rerender(); };
  NB.acts.copyHours = () => {
    const o = NB.cur, src = o.hours[[0, 1, 2, 3, 4, 5, 6].find((i) => o.hours[i].open)];
    if (!src) return NB.toast('حداقل یک روز باید باز باشد', 'bad');
    for (let i = 0; i < 7; i++) if (o.hours[i].open) Object.assign(o.hours[i], { from: src.from, to: src.to, brk: src.brk, bfrom: src.bfrom, bto: src.bto });
    NB.saveBiz(); NB.rerender(); NB.toast('ساعت‌ها کپی شد');
  };
  NB.acts.gps = () => {
    if (!navigator.geolocation) return NB.toast('این دستگاه موقعیت‌یابی ندارد', 'bad');
    NB.toast('در حال دریافت موقعیت…');
    navigator.geolocation.getCurrentPosition((p) => {
      NB.cur.lat = +p.coords.latitude.toFixed(6); NB.cur.lng = +p.coords.longitude.toFixed(6); NB.saveBiz(); NB.rerender(); NB.toast('موقعیت ثبت شد ✓');
    }, () => NB.toast('دسترسی به موقعیت ممکن نشد. لینک نقشه یا مختصات را دستی وارد کنید.', 'bad'), { enableHighAccuracy: true, timeout: 20000 });
  };
  NB.acts.clearLoc = () => { NB.cur.lat = null; NB.cur.lng = null; NB.saveBiz(); NB.rerender(); };
  NB.acts.manualLoc = () => {
    const el = NB.sheet(`<h3 class="sh-t">ثبت موقعیت</h3><p class="muted sm">لینک مکان را از گوگل‌مپ، نشان یا بلد کپی کنید و اینجا بچسبانید، یا مختصات را مثل <span dir="ltr">35.7001, 51.4001</span> بنویسید. (لینک‌های کوتاه پشتیبانی نمی‌شوند؛ در آن صورت مختصات را وارد کنید.)</p>
      <textarea class="inp" id="loc" rows="3" dir="ltr" placeholder="https://www.google.com/maps/@35.70,51.40,17z"></textarea><button class="btn btn-pri btn-block mt" id="locOk">ثبت</button>`);
    el.querySelector('#locOk').addEventListener('click', () => {
      const c = NB.parseCoords(el.querySelector('#loc').value);
      if (!c) return NB.toast('مختصاتی پیدا نشد. فرمت: 35.70010, 51.40010', 'bad');
      NB.cur.lat = c.lat; NB.cur.lng = c.lng; NB.saveBiz(); NB.closeOv(); setTimeout(() => NB.rerender(), 60); NB.toast('موقعیت ثبت شد ✓');
    });
  };
  NB.acts.phDel = (d) => { NB.cur.photos.splice(+d.i, 1); NB.saveBiz(); NB.rerender(); };
  NB.acts.phCover = (d) => { const p = NB.cur.photos.splice(+d.i, 1)[0]; NB.cur.photos.unshift(p); NB.saveBiz(); NB.rerender(); };
  NB.acts.vidDel = async () => {
    if (NB.cur._wiz) { NB.cur._videoFile = null; NB.cur.video = null; return NB.rerender(); }
    try { await NB.deleteVideo(NB.cur); NB.rerender(); } catch (e) { NB.toast(e.message, 'bad'); }
  };

  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'fPhoto' && NB.cur) {
      const files = Array.from(t.files).slice(0, 8 - NB.cur.photos.length);
      NB.toast('در حال پردازش عکس‌ها…');
      for (const f of files) { try { NB.cur.photos.push(await NB.readImage(f)); } catch (err) { NB.toast('یکی از فایل‌ها عکس معتبر نبود', 'bad'); } }
      NB.rerender();
      if (NB.cur.mine) NB.saveBiz(NB.cur, true);
    }
    if (t.id === 'fVideo' && NB.cur && t.files[0]) {
      const f = t.files[0];
      if (f.size > 30 * 1048576) return NB.toast('حجم ویدیو بیشتر از ۳۰ مگابایت است', 'bad');
      if (NB.cur._wiz) { NB.cur._videoFile = f; NB.cur.video = { name: f.name, size: f.size }; NB.rerender(); return; }
      const b = NB.cur;
      NB.toast('در حال آپلود ویدیو… لطفاً صبر کنید');
      try { await NB.uploadVideo(b, f); NB.rerender(); NB.toast('ویدیو اضافه شد ✓'); }
      catch (err) { NB.toast(err.message, 'bad'); }
    }
  });

  // هر تغییر فیلد: ذخیره + در صورت نیاز بازرسم
  NB.onModel = (path, v, el) => {
    const o = NB.cur;
    if (!o) return;
    if (o === S().user) NB.save();
    else if (o.cat != null) { if (path === 'phone') o.phone = NB.en(v); NB.saveBiz(o); }
    if (el && el.dataset.re) NB.rerender();
  };

  /* ---------- ثبت‌نام (ویزارد ۵ مرحله‌ای) ---------- */
  let WZ = null;
  const STEPS = ['نوع کسب‌وکار', 'آدرس و موقعیت', 'عکس و ویدیو', 'ساعت کاری', 'خدمات'];
  NB.route('/owner/register', (p, first) => {
    if (NB.myBiz()) return NB.go('/owner');
    if (first || !WZ) { WZ = { step: 1, d: NB.newBiz('men-barber') }; WZ.d._wiz = true; WZ.d.phone = S().user.phone || ''; }
    NB.cur = WZ.d;
    const d = WZ.d, st = WZ.step;
    let body = '';
    if (st === 1) body = `<h2>کسب‌وکار شما چیست؟</h2>${infoBlockTop(d)}`;
    if (st === 2) body = `<h2>کجا هستید؟</h2><div class="field"><label>شهر</label><select class="inp" data-model="city">${NB.CITIES.map((c) => `<option ${c === d.city ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label>آدرس کامل</label><textarea class="inp" rows="3" data-model="address" placeholder="محله، خیابان، کوچه، پلاک، طبقه">${esc(d.address)}</textarea></div>${locationBlock(d)}`;
    if (st === 3) body = `<h2>عکس‌ها و ویدیو</h2><p class="muted">عکس‌های باکیفیت، مشتری بیشتری جذب می‌کند.</p>${photosBlock(d)}${videoBlock(d)}<div class="field mt"><label>معرفی کوتاه (اختیاری)</label><textarea class="inp" rows="3" data-model="desc" placeholder="چند خط درباره خدمات و امکانات">${esc(d.desc)}</textarea></div>`;
    if (st === 4) body = `<h2>ساعت کاری و تعطیلات</h2><p class="muted">روزهایی که کلید را خاموش کنید، تعطیل هفتگی حساب می‌شوند. تعطیلی‌ها و روزهای تخفیف خاص را بعداً از بخش «برنامه» تنظیم می‌کنید.</p>${hoursBlock(d)}<div class="card flat mt">${slotBlock(d)}</div>`;
    if (st === 5) body = `<h2>خدمات و قیمت‌ها</h2><p class="muted">خدمات پیشنهادی را ویرایش کنید یا خدمت جدید اضافه کنید.</p>${servicesBlock(d)}`;
    NB.page({
      title: 'ثبت‌نام کسب‌وکار', back: true, fab: true,
      html: `<div class="wiz"><div class="prog">${STEPS.map((s, i) => `<span class="${i + 1 <= st ? 'on' : ''}"></span>`).join('')}</div><div class="muted sm center">مرحله ${fa(st)} از ${fa(STEPS.length)} — ${STEPS[st - 1]}</div>${body}</div>
      <div class="bottom-bar"><button class="btn btn-ghost" ${st === 1 ? 'disabled' : ''} data-act="wzPrev">قبلی</button><button class="btn btn-pri grow" data-act="wzNext">${st === STEPS.length ? 'ثبت کسب‌وکار 🎉' : 'مرحله بعد'}</button></div>`
    });
  });
  const infoBlockTop = (d) => `${catGrid(d)}<div class="field mt"><label>نام کسب‌وکار</label><input class="inp" data-model="name" value="${esc(d.name)}" placeholder="مثلاً آرایشگاه مردانه سبک"></div>
    <div class="field"><label>شماره تماس</label><input class="inp" dir="ltr" inputmode="tel" data-model="phone" value="${esc(d.phone)}" placeholder="09123456789"></div>`;
  NB.acts.wzPrev = () => { if (WZ.step > 1) { WZ.step--; NB.rerender(); NB.$('#view').scrollTop = 0; } };
  NB.acts.wzNext = () => {
    const d = WZ.d, st = WZ.step, bad = (m) => NB.toast(m, 'bad');
    if (st === 1) { if ((d.name || '').trim().length < 3) return bad('نام کسب‌وکار را وارد کنید'); if (!validPhone(d.phone)) return bad('شماره تماس معتبر نیست'); }
    if (st === 2) { if ((d.address || '').trim().length < 5) return bad('آدرس را کامل‌تر بنویسید'); }
    if (st === 3) { if (!d.photos.length) return bad('حداقل یک عکس اضافه کنید'); }
    if (st === 4) { if (!Object.values(d.hours).some((h) => h.open)) return bad('حداقل یک روز باید باز باشد'); }
    if (st < STEPS.length) { WZ.step++; NB.rerender(); NB.$('#view').scrollTop = 0; return; }
    d.services = d.services.filter((s) => (s.name || '').trim());
    if (!d.services.length) return bad('حداقل یک خدمت اضافه کنید');
    d.phone = NB.en(d.phone).replace(/\s|-/g, '');
    if (WZ.busy) return;
    WZ.busy = true;
    NB.toast('در حال ثبت کسب‌وکار…');
    NB.createBiz(d, d._videoFile).then((nb) => {
      if (!S().user.phone) S().user.phone = nb.phone;
      S().settings.mode = 'owner'; NB.save();
      WZ = null; NB.cur = null;
      NB.toast(nb.status === 'approved' ? 'کسب‌وکار شما ثبت و فعال شد 🎉' : 'کسب‌وکار ثبت شد و پس از تأیید مدیر نمایش داده می‌شود 🎉');
      NB.go('/owner');
    }).catch((e) => { WZ.busy = false; NB.toast(e.message, 'bad'); });
  };

  const statusBanner = (b) => {
    const t = { pending: ['warn', '⏳ کسب‌وکار شما در انتظار تأیید مدیر است. تا زمان تأیید، برای مشتریان نمایش داده نمی‌شود.'], rejected: ['bad', '❌ کسب‌وکار شما تأیید نشد. اطلاعات را اصلاح کنید و دوباره برای بررسی ارسال کنید.'], disabled: ['bad', '⛔ کسب‌وکار شما توسط مدیر غیرفعال شده و برای مشتریان نمایش داده نمی‌شود.'] }[b.status];
    if (!t && !b.edited) return '';
    const c = NB.cfg.contact;
    if (!t) return `<div class="banner warn"><b>تغییرات شما در انتظار بررسی مدیر است.</b><div class="sm">کسب‌وکار همچنان نمایش داده می‌شود؛ در صورت مغایرت با قوانین ممکن است غیرفعال شود.</div></div>`;
    return `<div class="banner ${t[0]}"><b>${t[1]}</b>${b.statusNote ? `<div class="sm">توضیح مدیر: ${esc(b.statusNote)}</div>` : ''}
      <div class="row gap wrap mt">${b.status === 'rejected' ? '<button class="btn btn-pri btn-sm" data-act="resubmit">ارسال مجدد برای بررسی</button>' : ''}<button class="btn btn-ghost btn-sm" data-act="nav" data-to="/contact">تماس با پشتیبانی</button></div></div>`;
  };
  NB.acts.resubmit = async () => {
    const b = NB.myBiz();
    try { const r = await NB.api('PUT', '/api/businesses/' + b.id, Object.assign(NB.bizPayload(b), { _resubmit: true })); b.status = r.status; b.statusNote = r.statusNote; NB.toast('برای بررسی ارسال شد'); NB.rerender(); }
    catch (e) { NB.toast(e.message, 'bad'); }
  };
  NB.acts.copyText = (d) => { NB.share(d.t); };

  /* ---------- نگهبان مسیرهای پنل ---------- */
  const guard = (fn) => (p, first) => { const b = NB.myBiz(); if (!b) return NB.go('/owner/register'); S().settings.mode = 'owner'; NB.cur = b; fn(b, p, first); };
  const mine = (b) => S().appointments.filter((a) => a.biz === b.id);
  const todayKey = () => { const t = J.today(); return J.key(t.y, t.m, t.d); };

  /* ---------- کارت نوبت (برای صاحب کسب‌وکار) ---------- */
  const oAppt = (a) => {
    const st = NB.effStatus(a);
    return `<div class="appt"><div class="row between"><b>${esc(a.name)}</b>${NB.chip(st)}</div>
      <div class="ap-l">${ic('calendar', 'xs')} ${J.label(a.date)} · ساعت ${fa(a.time)}</div><div class="ap-l">${ic('tag', 'xs')} ${esc(a.svc.join('، '))}</div>
      <div class="ap-l">${ic('percent', 'xs')} ${NB.money(a.total)} ${NB.cfg.currency}${a.discount ? ` <small class="ok-t">(${fa(a.discount)}٪ تخفیف)</small>` : ''}</div>
      ${a.note ? `<div class="ap-l muted">${ic('msg', 'xs')} ${esc(a.note)}</div>` : ''}
      <div class="row gap wrap mt"><a class="btn btn-ghost btn-sm" href="tel:${esc(a.phone)}">${ic('phone')} ${fa(a.phone)}</a>
        ${st === 'pending' ? `<button class="btn btn-pri btn-sm" data-act="apSet" data-id="${a.id}" data-v="confirmed">تأیید</button><button class="btn btn-danger-o btn-sm" data-act="apSet" data-id="${a.id}" data-v="rejected">رد</button>` : ''}
        ${st === 'confirmed' ? `<button class="btn btn-pri btn-sm" data-act="apSet" data-id="${a.id}" data-v="done">انجام شد</button><button class="btn btn-danger-o btn-sm" data-act="apSet" data-id="${a.id}" data-v="cancelled">لغو</button>` : ''}
      </div></div>`;
  };
  NB.acts.apSet = async (d) => {
    const a = S().appointments.find((x) => x.id === d.id);
    if (!a) return;
    if ((d.v === 'rejected' || d.v === 'cancelled') && !(await NB.confirm('این نوبت ' + (d.v === 'rejected' ? 'رد' : 'لغو') + ' شود؟', 'بله', true))) return;
    try { await NB.setApptStatus(a.id, d.v); NB.toast('انجام شد ✓'); NB.rerender(); } catch (e) { NB.toast(e.message, 'bad'); }
  };

  /* ---------- داشبورد ---------- */
  NB.route('/owner', guard((b) => {
    const all = mine(b), tk = todayKey(), t = J.today();
    const today = all.filter((a) => a.date === tk && ['pending', 'confirmed', 'done'].includes(NB.effStatus(a))).sort((x, y) => x.time.localeCompare(y.time));
    const pending = all.filter((a) => a.status === 'pending').sort((x, y) => NB.apptStart(x) - NB.apptStart(y));
    const upcoming = all.filter((a) => ['pending', 'confirmed'].includes(NB.effStatus(a)) && NB.apptStart(a) > Date.now()).length;
    const rev = all.filter((a) => NB.effStatus(a) === 'done' && J.parse(a.date).y === t.y && J.parse(a.date).m === t.m).reduce((s, a) => s + a.total, 0);
    const r = NB.rating(b);
    NB.page({
      title: 'پنل کسب‌وکار', tabs: 'owner', tab: 'dash',
      html: `${statusBanner(b)}<div class="o-hero"><div class="cv-sm lg" style="background:linear-gradient(135deg,${NB.cat(b.cat).c1},${NB.cat(b.cat).c2})">${b.photos[0] ? `<img src="${b.photos[0]}" alt="">` : NB.cat(b.cat).emoji}</div><div><b class="lg">${esc(b.name)}</b><div class="muted sm">${esc(b.city)} · ${NB.openNow(b) ? '<span class="ok-t">اکنون باز</span>' : 'اکنون بسته'}</div></div><button class="btn btn-ghost btn-sm" data-act="nav" data-to="/biz/${b.id}">پیش‌نمایش</button></div>
      <div class="stats"><div class="stat"><b>${fa(today.length)}</b><span>نوبت امروز</span></div><div class="stat warn"><b>${fa(pending.length)}</b><span>در انتظار تأیید</span></div><div class="stat"><b>${fa(upcoming)}</b><span>نوبت پیش‌رو</span></div><div class="stat ok"><b>${NB.money(rev)}</b><span>درآمد ${J.months[t.m - 1]} (${NB.cfg.currency})</span></div></div>
      ${r.n ? `<div class="card row between"><span>امتیاز مشتری‌ها</span><span>${NB.stars(r.avg)} <b>${fa(r.avg.toFixed(1).replace('.', '٫'))}</b> <small class="muted">(${fa(r.n)})</small></span></div>` : ''}
      ${pending.length ? `<div class="sec-h"><h2>⏳ منتظر تأیید شما</h2></div><div class="list">${pending.slice(0, 5).map(oAppt).join('')}</div>` : ''}
      <div class="sec-h"><h2>نوبت‌های امروز — ${J.short(tk)}</h2></div>
      <div class="list">${today.length ? today.map(oAppt).join('') : NB.emptyState('☕', 'امروز نوبتی ثبت نشده است.')}</div>
      <div class="menu-list"><button data-act="nav" data-to="/owner/plan">${ic('calendar')}<span>روزهای تعطیل و تخفیف</span>${ic('next')}</button><button data-act="nav" data-to="/owner/services">${ic('tag')}<span>خدمات و قیمت‌ها</span>${ic('next')}</button></div>`
    });
  }));

  /* ---------- نوبت‌ها ---------- */
  let OF = 'today';
  NB.route('/owner/appts', guard((b, p, first) => {
    if (first) OF = 'today';
    const tk = todayKey(), up = (a) => ['pending', 'confirmed'].includes(NB.effStatus(a)) && NB.apptStart(a) > Date.now() - 3600000;
    const f = {
      today: (a) => a.date === tk && !['cancelled', 'rejected'].includes(a.status),
      up: (a) => up(a), pending: (a) => a.status === 'pending',
      done: (a) => NB.effStatus(a) === 'done', cancel: (a) => ['cancelled', 'rejected'].includes(a.status)
    };
    const list = mine(b).filter(f[OF]).sort((x, y) => OF === 'done' || OF === 'cancel' ? NB.apptStart(y) - NB.apptStart(x) : NB.apptStart(x) - NB.apptStart(y));
    const L = [['today', 'امروز'], ['up', 'پیش‌رو'], ['pending', 'در انتظار'], ['done', 'انجام‌شده'], ['cancel', 'لغو/رد']];
    NB.page({ title: 'نوبت‌ها', tabs: 'owner', tab: 'appts', html: `<div class="chips scroll">${L.map((x) => `<button class="chip-btn ${OF === x[0] ? 'on' : ''}" data-act="ofSet" data-v="${x[0]}">${x[1]}${x[0] === 'pending' ? ` (${fa(mine(b).filter(f.pending).length)})` : ''}</button>`).join('')}</div><div class="list pt">${list.length ? list.map(oAppt).join('') : NB.emptyState('📭', 'موردی وجود ندارد.')}</div>` });
  }));
  NB.acts.ofSet = (d) => { OF = d.v; NB.rerender(); };

  /* ---------- برنامه: تقویم، ساعت کاری، تخفیف ---------- */
  let PT = 'cal';
  NB.route('/owner/plan', guard((b, p, first) => {
    if (first) { PT = 'cal'; delete NB.calState.plan; }
    const t = J.today();
    let body = '';
    if (PT === 'cal') {
      body = `<p class="muted sm pad">روی هر روز بزنید تا آن را تعطیل کنید، تخفیف بگذارید یا نوبت‌هایش را ببینید.</p><div class="card">${NB.calendar({
        id: 'plan', act: 'planDay',
        cell: (y, m, d) => {
          const info = NB.dayInfo(b, y, m, d), n = NB.apptsOn(b.id, info.key).length, past = NB.isPastDay(y, m, d);
          return { off: info.off, today: J.cmp({ y, m, d }, t) === 0, cls: (past ? 'past ' : '') + (info.discount > 0 && !info.off ? 'has-disc' : ''), badge: n ? fa(n) + ' نوبت' : (info.discount > 0 && !info.off ? fa(info.discount) + '٪' : '') };
        }
      })}<div class="legend"><span><i class="lgd dis"></i> تعطیل</span><span><i class="lgd gd"></i> تخفیف</span></div></div>`;
    }
    if (PT === 'hours') body = `<div class="card">${hoursBlock(b)}</div><div class="card">${slotBlock(b)}</div>`;
    if (PT === 'disc') {
      const dd = Object.keys(b.dateDiscount).filter((k) => b.dateDiscount[k] > 0).sort();
      body = `<div class="card"><h3>${ic('percent', 'xs')} تخفیف هفتگی</h3><p class="muted sm">درصد تخفیف برای هر روز هفته (۰ = بدون تخفیف)</p>${J.wdays.map((n, i) => `<div class="svc-r"><span>${n}</span><span class="row gap vc"><input class="inp tiny" dir="ltr" inputmode="numeric" data-num data-model="weekDiscount.${i}" value="${b.weekDiscount[i] || ''}" placeholder="۰"><b>٪</b></span></div>`).join('')}</div>
        <div class="card"><h3>🎁 تخفیف‌های تاریخ‌دار</h3>${dd.length ? dd.map((k) => `<div class="svc-r"><span>${J.label(k)}</span><span class="row gap vc"><b class="ok-t">${fa(b.dateDiscount[k])}٪</b><button class="icon-btn danger" data-act="delDisc" data-k="${k}">${ic('trash')}</button></span></div>`).join('') : '<p class="muted sm">هنوز موردی نیست. از تب «تقویم» روی روز مورد نظر بزنید.</p>'}</div>`;
    }
    NB.page({
      title: 'برنامه کاری', tabs: 'owner', tab: 'plan',
      html: `<div class="seg"><button class="${PT === 'cal' ? 'on' : ''}" data-act="ptSet" data-v="cal">تقویم</button><button class="${PT === 'hours' ? 'on' : ''}" data-act="ptSet" data-v="hours">ساعت کاری</button><button class="${PT === 'disc' ? 'on' : ''}" data-act="ptSet" data-v="disc">تخفیف‌ها</button></div>${body}`
    });
  }));
  NB.acts.ptSet = (d) => { PT = d.v; NB.rerender(); };
  NB.acts.delDisc = (d) => { delete NB.cur.dateDiscount[d.k]; NB.saveBiz(); NB.rerender(); };
  NB.acts.planDay = (d) => {
    const b = NB.myBiz(), k = d.k, p = J.parse(k), info = NB.dayInfo(b, p.y, p.m, p.d), list = NB.apptsOn(b.id, k).sort((x, y) => x.time.localeCompare(y.time));
    const dateOff = b.offDates.indexOf(k) >= 0, past = NB.isPastDay(p.y, p.m, p.d);
    const el = NB.sheet(`<h3 class="sh-t">${J.label(k)}</h3>
      ${info.reason === 'weekly' ? '<p class="muted sm">این روز در برنامه هفتگی، تعطیل است. (از تب «ساعت کاری» می‌توانید تغییرش دهید.)</p>' : ''}
      ${info.reason !== 'weekly' && !past ? `<button class="btn ${dateOff ? 'btn-pri' : 'btn-danger-o'} btn-block" id="tgOff">${dateOff ? 'باز کردن این روز' : 'تعطیل کردن این روز'}</button>` : ''}
      ${!past && !info.off ? `<div class="field mt"><label>تخفیف این روز (درصد)</label><div class="row gap"><input class="inp" id="dp" dir="ltr" inputmode="numeric" value="${b.dateDiscount[k] || ''}" placeholder="مثلاً ۲۰"><button class="btn btn-pri" id="dpOk">ثبت</button></div></div>` : ''}
      <h4 class="mt">نوبت‌های این روز (${fa(list.length)})</h4>${list.length ? list.map((a) => `<div class="svc-r"><span><b>${fa(a.time)}</b> — ${esc(a.name)}</span><a href="tel:${esc(a.phone)}">${ic('phone', 'xs')}</a></div>`).join('') : '<p class="muted sm">نوبتی ثبت نشده.</p>'}`);
    const done = () => { NB.saveBiz(); NB.closeOv(); setTimeout(() => NB.rerender(), 60); };
    const tg = el.querySelector('#tgOff');
    if (tg) tg.addEventListener('click', async () => {
      if (!dateOff && list.length && !(await NB.confirm(`در این روز ${fa(list.length)} نوبت ثبت شده. تعطیل شود؟ (نوبت‌ها لغو نمی‌شوند؛ با مشتری‌ها هماهنگ کنید.)`, 'تعطیل شود', true))) return;
      if (dateOff) b.offDates.splice(b.offDates.indexOf(k), 1); else b.offDates.push(k);
      NB.closeOv(); NB.saveBiz(); setTimeout(() => NB.rerender(), 60);
    });
    const ok = el.querySelector('#dpOk');
    if (ok) ok.addEventListener('click', () => {
      const v = Math.round(NB.num(el.querySelector('#dp').value));
      if (v < 0 || v > 90) return NB.toast('تخفیف باید بین ۰ تا ۹۰ باشد', 'bad');
      if (v) b.dateDiscount[k] = v; else delete b.dateDiscount[k];
      done(); NB.toast(v ? 'تخفیف ثبت شد' : 'تخفیف حذف شد');
    });
  };

  /* ---------- خدمات ---------- */
  NB.route('/owner/services', guard((b) => {
    NB.page({ title: 'خدمات و قیمت‌ها', tabs: 'owner', tab: 'svc', html: `<div class="pad"><p class="muted sm">تغییرات به‌صورت خودکار ذخیره می‌شود. قیمت‌ها به ${NB.cfg.currency} است.</p>${servicesBlock(b)}</div>` });
  }));

  /* ---------- پروفایل کسب‌وکار ---------- */
  NB.route('/owner/profile', guard((b) => {
    NB.page({
      title: 'اطلاعات کسب‌وکار', tabs: 'owner', tab: 'prof',
      html: `<div class="pad">${statusBanner(b)}<div class="card"><h3>اطلاعات پایه</h3>${infoBlock(b, true)}</div>
      <div class="card"><h3>موقعیت مکانی</h3>${locationBlock(b)}</div>
      <div class="card"><h3>${ic('image', 'xs')} عکس‌ها</h3>${photosBlock(b)}</div>${videoBlock(b)}
      <div class="card"><h3>تنظیمات نوبت‌دهی</h3>${slotBlock(b)}</div>
      <div class="card"><h3>🔑 کد بازیابی حساب</h3><p class="muted sm">اگر برنامه را حذف کردید یا گوشی را عوض کردید، با این کد می‌توانید دوباره وارد کسب‌وکار خود شوید. آن را جای امنی نگه دارید و به کسی ندهید.</p>
        <div class="code-box" dir="ltr">${esc(S().user.id)}</div><button class="btn btn-ghost btn-block mt" data-act="copyText" data-t="${esc(S().user.id)}">${ic('share')} کپی / ارسال کد</button></div>
      <button class="btn btn-danger-o btn-block" data-act="delBiz">حذف کسب‌وکار</button></div>`
    });
  }));
  NB.acts.delBiz = async () => {
    const b = NB.myBiz();
    if (!(await NB.confirm('کسب‌وکار «' + b.name + '» و همه نوبت‌هایش حذف شود؟ این کار قابل بازگشت نیست.', 'حذف کن', true))) return;
    try { await NB.deleteBiz(b); } catch (e) { return NB.toast(e.message, 'bad'); }
    S().settings.mode = 'customer'; NB.save(); NB.cur = null; NB.toast('کسب‌وکار حذف شد'); NB.go('/home');
  };
})();
