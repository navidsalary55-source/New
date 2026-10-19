/* منطق مشترک اپ و سرور: دسته‌بندی‌ها، روزها، ساعت‌های خالی، قیمت‌گذاری.
   این فایل هم داخل اپ و هم داخل سرور اجرا می‌شود تا قوانین نوبت‌دهی یکسان باشد. */
(function () {
  var NB = (window.NB = window.NB || {});
  var J = NB.J;

  /* ---------- دسته‌بندی‌ها ---------- */
  // services: [نام، قیمت (تومان)، ]
  NB.CATS = [
    { id: 'men-barber', name: 'آرایشگاه مردانه', emoji: '💈', c1: '#0ea5a4', c2: '#0f766e', svc: [['اصلاح سر و صورت', 250000], ['کوتاهی مو', 200000], ['اصلاح ریش', 100000], ['رنگ مو', 450000], ['کراتینه و پروتئین', 900000]] },
    { id: 'women-salon', name: 'آرایشگاه زنانه', emoji: '💇‍♀️', c1: '#ec4899', c2: '#be185d', svc: [['کوتاهی مو', 400000], ['رنگ و مش', 1800000], ['براشینگ', 300000], ['کراتینه', 2500000], ['شینیون', 1500000]] },
    { id: 'beauty', name: 'ناخن و زیبایی', emoji: '💅', c1: '#f472b6', c2: '#a855f7', svc: [['مانیکور', 300000], ['کاشت ناخن', 900000], ['پدیکور', 400000], ['اپیلاسیون', 350000], ['فیشیال صورت', 700000]] },
    { id: 'gp-doctor', name: 'دکتر عمومی', emoji: '🩺', c1: '#3b82f6', c2: '#1d4ed8', svc: [['ویزیت عمومی', 500000], ['ویزیت و تزریقات', 600000], ['مشاوره تلفنی', 300000]] },
    { id: 'dentist', name: 'دندانپزشک', emoji: '🦷', c1: '#06b6d4', c2: '#0e7490', svc: [['معاینه و مشاوره', 400000], ['جرم‌گیری', 800000], ['پر کردن دندان', 1500000], ['عصب‌کشی', 3500000], ['ارتودنسی (ویزیت)', 600000]] },
    { id: 'skin', name: 'پوست، مو و لیزر', emoji: '✨', c1: '#f59e0b', c2: '#d97706', svc: [['ویزیت پوست', 700000], ['لیزر موهای زائد', 1200000], ['مزوتراپی', 2500000], ['پاکسازی پوست', 900000]] },
    { id: 'eye', name: 'چشم‌پزشک و اپتومتری', emoji: '👁️', c1: '#8b5cf6', c2: '#6d28d9', svc: [['ویزیت چشم‌پزشکی', 700000], ['تست بینایی', 300000], ['انتخاب عینک', 200000]] },
    { id: 'physio', name: 'فیزیوتراپی', emoji: '🦴', c1: '#10b981', c2: '#047857', svc: [['ارزیابی و ویزیت', 500000], ['جلسه فیزیوتراپی', 600000], ['کاپینگ و طب سوزنی', 700000]] },
    { id: 'psych', name: 'روان‌شناس و مشاور', emoji: '🧠', c1: '#6366f1', c2: '#4338ca', svc: [['جلسه مشاوره فردی', 1200000], ['مشاوره خانواده', 1500000], ['مشاوره آنلاین', 900000]] },
    { id: 'vet', name: 'دامپزشک', emoji: '🐾', c1: '#84cc16', c2: '#4d7c0f', svc: [['معاینه حیوان خانگی', 500000], ['واکسیناسیون', 400000], ['شست‌وشو و اصلاح', 600000]] },
    { id: 'car', name: 'خودرو (تعمیر و کارواش)', emoji: '🚗', c1: '#64748b', c2: '#334155', svc: [['تعویض روغن', 600000], ['کارواش کامل', 350000], ['بالانس و تنظیم باد', 400000], ['عیب‌یابی', 500000]] },
    { id: 'lab', name: 'آزمایشگاه و تصویربرداری', emoji: '🧪', c1: '#14b8a6', c2: '#0f766e', svc: [['آزمایش خون', 400000], ['سونوگرافی', 800000], ['نوار قلب', 300000], ['رادیولوژی', 500000]] },
    { id: 'spa', name: 'ماساژ و اسپا', emoji: '💆', c1: '#a78bfa', c2: '#7c3aed', svc: [['ماساژ سوئدی', 1200000], ['ماساژ سنگ داغ', 1600000], ['اسپا و سونا', 900000]] },
    { id: 'law', name: 'وکیل و مشاوره حقوقی', emoji: '⚖️', c1: '#78716c', c2: '#44403c', svc: [['مشاوره حقوقی', 1000000], ['بررسی قرارداد', 1500000], ['جلسه پرونده', 1200000]] },
    { id: 'gym', name: 'باشگاه و مربی ورزشی', emoji: '🏋️', c1: '#ef4444', c2: '#b91c1c', svc: [['جلسه تمرین شخصی', 700000], ['ارزیابی بدنی', 300000], ['برنامه تمرینی', 500000]] },
    { id: 'studio', name: 'آتلیه و عکاسی', emoji: '📸', c1: '#f97316', c2: '#c2410c', svc: [['عکس پرسنلی', 300000], ['عکس خانوادگی', 1500000], ['عکس بارداری', 2500000]] },
    { id: 'tattoo', name: 'تتو و آرایش دائم', emoji: '🖋️', c1: '#18181b', c2: '#52525b', svc: [['مشاوره طرح', 0], ['تتو کوچک', 1500000], ['میکروبلیدینگ ابرو', 3500000]] },
    { id: 'edu', name: 'آموزش و کلاس خصوصی', emoji: '🎓', c1: '#0ea5e9', c2: '#0369a1', svc: [['جلسه خصوصی', 600000], ['جلسه آزمایشی', 0], ['مشاوره تحصیلی', 500000]] }
  ];
  NB.cat = function (id) { for (var i = 0; i < NB.CATS.length; i++) if (NB.CATS[i].id === id) return NB.CATS[i]; return NB.CATS[0]; };
  NB.CITIES = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'قم', 'رشت', 'کرمان', 'ارومیه', 'یزد', 'ساری', 'سایر'];


  /* ---------- ساعت و روز ---------- */
  function toMin(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function fromMin(m) { var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }
  NB.toMin = toMin; NB.fromMin = fromMin;

  NB.defaultHours = function () {
    var h = {}, i;
    for (i = 0; i < 7; i++) h[i] = { open: i !== 6, from: '09:00', to: '20:00', brk: false, bfrom: '13:00', bto: '15:00' };
    return h;
  };

  // وضعیت یک روز برای کسب‌وکار
  NB.dayInfo = function (b, y, m, d) {
    var k = J.key(y, m, d), wd = J.wd(y, m, d), h = (b.hours && b.hours[wd]) || {};
    var info = { key: k, wd: wd, hours: h, off: false, reason: '', discount: 0 };
    if (!h.open) { info.off = true; info.reason = 'weekly'; }
    if ((b.offDates || []).indexOf(k) >= 0) { info.off = true; info.reason = 'date'; }
    info.discount = Math.max(+((b.dateDiscount || {})[k] || 0), +((b.weekDiscount || {})[wd] || 0));
    return info;
  };
  NB.isPastDay = function (y, m, d) { return J.cmp({ y: y, m: m, d: d }, J.today()) < 0; };
  NB.inWindow = function (b, y, m, d) {
    var diff = J.diffDays(J.today(), { y: y, m: m, d: d });
    return diff >= 0 && diff <= (b.advance || 30);
  };
  // لیست ساعت‌های اشغال‌شده (هر نوبت یک عضو). هر محیط (اپ/سرور) آن را تعریف می‌کند.
  NB.takenTimes = NB.takenTimes || function () { return []; };

  NB.slotsFor = function (b, y, m, d) {
    var info = NB.dayInfo(b, y, m, d), out = [];
    if (info.off) return out;
    var h = info.hours, step = b.slot || 30, from = toMin(h.from), to = toMin(h.to), t, taken = NB.takenTimes(b.id, info.key);
    var now = new Date(), isToday = J.cmp({ y: y, m: m, d: d }, J.today()) === 0, nowMin = now.getHours() * 60 + now.getMinutes();
    for (t = from; t + step <= to; t += step) {
      if (h.brk && t < toMin(h.bto) && t + step > toMin(h.bfrom)) continue;
      if (isToday && t <= nowMin + 10) continue;
      var c = taken.filter(function (x) { return x === fromMin(t); }).length;
      out.push({ time: fromMin(t), free: c < (b.cap || 1), left: (b.cap || 1) - c });
    }
    return out;
  };
  NB.freeCount = function (b, y, m, d) { return NB.slotsFor(b, y, m, d).filter(function (s) { return s.free; }).length; };

  // قیمت نهایی یک رزرو
  NB.priceFor = function (b, svcIds, dateKey) {
    var svcs = b.services.filter(function (s) { return s.active !== false && svcIds.indexOf(s.id) >= 0; });
    var sum = svcs.reduce(function (a, s) { return a + s.price; }, 0), p = J.parse(dateKey);
    var disc = NB.dayInfo(b, p.y, p.m, p.d).discount, off = Math.round(sum * disc / 100);
    return { svcs: svcs, names: svcs.map(function (s) { return s.name; }), price: sum, discount: disc, total: sum - off };
  };
  NB.apptStart = function (a) {
    var p = J.parse(a.date), g = J.toGregorian(p.y, p.m, p.d), t = a.time.split(':');
    g.setHours(+t[0], +t[1], 0, 0);
    return g.getTime();
  };
  NB.STATUS = {
    pending: ['در انتظار تأیید', 'warn'], confirmed: ['تأیید شده', 'ok'], done: ['انجام شد', 'info'],
    rejected: ['رد شده', 'bad'], cancelled: ['لغو شده', 'bad']
  };
  NB.BIZ_STATUS = {
    pending: ['در انتظار تأیید مدیر', 'warn'], approved: ['فعال', 'ok'], rejected: ['رد شده', 'bad'], disabled: ['غیرفعال', 'bad']
  };
})();
