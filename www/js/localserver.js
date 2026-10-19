/* سرور آزمایشی داخل خود اپ (وقتی apiBase خالی است)
   همه‌ی اطلاعات فقط روی همین گوشی ذخیره می‌شود؛ برای انتشار واقعی از سرور اصلی استفاده کنید. */
(function () {
  var NB = (window.NB = window.NB || {});
  var J = NB.J, KEY = 'nb_localdb_v1', DB = null;
  var SEED = [["men-barber","آرایشگاه مردانه سبک","تهران","سعادت‌آباد، میدان کاج، پلاک ۱۲",35.7745,51.3795,4.8,214,"اصلاح تخصصی با تجهیزات روز و محیطی آرام. پذیرش فقط با نوبت.",10],["men-barber","باربرشاپ کلاسیک","مشهد","بلوار وکیل‌آباد، نبش وکیل‌آباد ۲۸",36.3135,59.542,4.6,98,"کوتاهی مو، فید و اصلاح ریش به سبک باربرشاپ.",0],["women-salon","سالن زیبایی رُز","تهران","پاسداران، نرسیده به بوستان‌ها، پلاک ۴۵",35.766,51.456,4.9,342,"رنگ و مش، کراتینه، شینیون و میکاپ عروس.",15],["beauty","استودیو ناخن مروارید","اصفهان","چهارباغ بالا، پاساژ نگین، طبقه دوم",32.6639,51.6746,4.7,156,"کاشت و طراحی ناخن با مواد درجه‌یک.",0],["gp-doctor","مطب دکتر احمدی (پزشک عمومی)","تهران","ونک، خیابان ملاصدرا، ساختمان پزشکان، واحد ۶",35.757,51.41,4.5,77,"ویزیت عمومی، تزریقات و پانسمان.",0],["dentist","کلینیک دندانپزشکی لبخند","شیراز","معالی‌آباد، کوچه ۱۱، پلاک ۷",29.629,52.524,4.8,183,"خدمات ترمیمی و زیبایی دندان با تجهیزات دیجیتال.",20],["skin","کلینیک پوست و لیزر آرامش","تبریز","ولیعصر، روبروی پارک ائل‌گلی، طبقه ۳",38.069,46.3,4.4,61,"لیزر الکساندرایت، مزوتراپی و مشاوره پوست.",10],["physio","مرکز فیزیوتراپی نوین","کرج","گوهردشت، فاز ۲، خیابان ۱۲۳",35.813,50.933,4.7,92,"درمان دردهای مفصلی و عضلانی با دستگاه‌های پیشرفته.",0],["psych","مشاوره دکتر رحیمی","تهران","شهرک غرب، بلوار دادمان، ساختمان آسمان",35.774,51.375,4.9,129,"مشاوره فردی، زوج و نوجوان. جلسات حضوری و آنلاین.",0],["vet","درمانگاه دامپزشکی مهر","اصفهان","خیابان نیکبخت، بعد از چهارراه نظر",32.649,51.66,4.6,54,"معاینه، واکسن و مراقبت از حیوانات خانگی.",0],["car","تعمیرگاه و کارواش سپهر","کرج","جاده مخصوص، بعد از پل کمالشهر",35.827,50.956,4.3,66,"تعویض روغن، کارواش و تنظیم موتور.",5],["gym","باشگاه بدنسازی قدرت","مشهد","احمدآباد، خیابان معلم ۵",36.305,59.57,4.5,143,"مربی شخصی، کلاس‌های گروهی و برنامه تغذیه.",0],["studio","آتلیه عکس قاب","شیراز","بلوار چمران، پاساژ هنر",29.61,52.53,4.8,88,"عکاسی پرتره، خانوادگی و بارداری.",0],["spa","اسپا و ماساژ سکوت","تهران","الهیه، خیابان فرشته، پلاک ۳",35.796,51.418,4.9,207,"ماساژ درمانی و آرامش‌بخش در فضایی لوکس.",10]];
  var ACTIVE = ['pending', 'confirmed', 'done'];
  var CAT_IDS = NB.CATS.map(function (c) { return c.id; });

  function HttpError(code, msg) { var e = new Error(msg); e.status = code; return e; }
  function bad(m, c) { throw HttpError(c || 400, m); }
  function rid(n) { var a = new Uint8Array(n || 8), s = '', i; (window.crypto || window.msCrypto).getRandomValues(a); for (i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2); return s; }
  function en(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }); }
  function cleanText(v, max, multi) {
    v = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    v = multi ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : v.replace(/\s+/g, ' ');
    return v.trim().slice(0, max);
  }
  function phoneOf(v) { var p = en(v).replace(/[\s-]/g, ''); return /^0\d{9,10}$/.test(p) ? p : null; }
  function timeOk(t) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
  function dateKeyOk(k) {
    if (!/^1[34]\d\d\/\d\d\/\d\d$/.test(k)) return false;
    var p = J.parse(k); return p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= J.monthLen(p.y, p.m);
  }
  function todayKey() { var t = J.today(); return J.key(t.y, t.m, t.d); }
  function vals(o) { return Object.keys(o).map(function (k) { return o[k]; }); }

  function load() {
    if (DB) return DB;
    try { DB = JSON.parse(localStorage.getItem(KEY)); } catch (e) { DB = null; }
    if (!DB || !DB.businesses) { DB = { businesses: {}, appointments: {}, reports: {}, settings: { requireApproval: false } }; seed(); persist(); }
    return DB;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { throw HttpError(507, 'حافظه‌ی نسخه‌ی آزمایشی پر شد؛ عکس‌ها را کمتر یا کوچک‌تر کنید'); }
  }
  NB.localReset = function () { try { localStorage.removeItem(KEY); } catch (e) {} DB = null; };

  /* ---------- نمایش ---------- */
  function ratingOf(b) {
    var n = (b.baseCount || 0) + b.reviews.length, sum = (b.baseRating || 0) * (b.baseCount || 0);
    b.reviews.forEach(function (r) { sum += r.stars; });
    return { avg: n ? Math.round(sum / n * 10) / 10 : 0, n: n };
  }
  function viewBiz(b, o) {
    o = o || {};
    var r = ratingOf(b);
    var v = {
      id: b.id, cat: b.cat, name: b.name, phone: b.phone, city: b.city, address: b.address, lat: b.lat, lng: b.lng, desc: b.desc,
      photos: (o.detail || o.mine || o.admin) ? b.photos.slice() : b.photos.slice(0, 1), video: null, services: b.services, hours: b.hours, offDates: b.offDates,
      weekDiscount: b.weekDiscount, dateDiscount: b.dateDiscount, slot: b.slot, cap: b.cap, advance: b.advance, auto: b.auto,
      created: b.created, rAvg: r.avg, rN: r.n, status: b.status, demo: !!b.demo
    };
    if (o.detail || o.mine || o.admin) v.reviews = b.reviews.slice(-30).map(function (x) { return { id: x.id, name: x.name, stars: x.stars, text: x.text, at: x.at }; });
    if (o.mine || o.admin) { v.statusNote = b.statusNote || ''; v.edited = !!b.edited; }
    if (o.mine) v.mine = true;
    return v;
  }
  function viewAppt(a, mine) {
    return { id: a.id, biz: a.biz, name: a.name, phone: a.phone, svc: a.svc, date: a.date, time: a.time, price: a.price, discount: a.discount, total: a.total, note: a.note, status: a.status, created: a.created, review: !!a.review, mine: !!mine };
  }
  function busyMap(b) {
    var map = {}, t = todayKey();
    vals(DB.appointments).forEach(function (a) { if (a.biz === b.id && ACTIVE.indexOf(a.status) >= 0 && a.date >= t) (map[a.date] = map[a.date] || []).push(a.time); });
    return map;
  }
  function ownBiz(u) { return u ? vals(DB.businesses).filter(function (b) { return b.ownerUser === u; })[0] : null; }
  function openReports(id) { return vals(DB.reports).filter(function (r) { return r.biz === id && r.open; }); }

  /* ---------- اعتبارسنجی ---------- */
  function cleanHours(h, old) {
    var out = {}, i;
    for (i = 0; i < 7; i++) {
      var s = (h && h[i]) || {}, o = (old && old[i]) || NB.defaultHours()[i];
      var x = { open: !!s.open, from: timeOk(s.from) ? s.from : o.from, to: timeOk(s.to) ? s.to : o.to, brk: !!s.brk, bfrom: timeOk(s.bfrom) ? s.bfrom : o.bfrom, bto: timeOk(s.bto) ? s.bto : o.bto };
      if (x.open && NB.toMin(x.from) >= NB.toMin(x.to)) bad('ساعت شروع باید قبل از ساعت پایان باشد (' + J.wdays[i] + ')');
      if (x.open && x.brk && NB.toMin(x.bfrom) >= NB.toMin(x.bto)) bad('ساعت استراحت نامعتبر است (' + J.wdays[i] + ')');
      out[i] = x;
    }
    return out;
  }
  function cleanDiscounts(o, keyOk) {
    var out = {};
    Object.keys(o && typeof o === 'object' ? o : {}).slice(0, 400).forEach(function (k) {
      var v = Math.round(+o[k] || 0);
      if (keyOk(k) && v > 0) out[k] = Math.min(v, 90);
    });
    return out;
  }
  function applyPhotos(b, list) {
    var keep = [];
    (Array.isArray(list) ? list.slice(0, 8) : []).forEach(function (p) {
      if (typeof p !== 'string') return;
      var m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(p);
      if (m) { if (m[1].length * 0.75 > 700 * 1024) bad('یکی از عکس‌ها بزرگ‌تر از ۷۰۰ کیلوبایت است'); keep.push(p); return; }
      if (b.photos.indexOf(p) >= 0) keep.push(p);
    });
    b.photos = keep;
  }
  function applyBiz(b, inp, creating) {
    var v;
    if ('name' in inp || creating) { v = cleanText(inp.name, 80); if (v.length < 3) bad('نام کسب‌وکار را وارد کنید (حداقل ۳ حرف)'); b.name = v; }
    if ('cat' in inp || creating) { if (CAT_IDS.indexOf(inp.cat) < 0) bad('نوع کسب‌وکار نامعتبر است'); b.cat = inp.cat; }
    if ('phone' in inp || creating) { var p = phoneOf(inp.phone); if (!p) bad('شماره تماس معتبر نیست'); b.phone = p; }
    if ('city' in inp || creating) b.city = NB.CITIES.indexOf(inp.city) >= 0 ? inp.city : 'سایر';
    if ('address' in inp || creating) { v = cleanText(inp.address, 250); if (v.length < 5) bad('آدرس را کامل‌تر بنویسید'); b.address = v; }
    if ('desc' in inp) b.desc = cleanText(inp.desc, 800, true);
    if ('lat' in inp || 'lng' in inp) {
      var la = inp.lat == null || inp.lat === '' ? null : +inp.lat, ln = inp.lng == null || inp.lng === '' ? null : +inp.lng;
      if (la != null && ln != null && isFinite(la) && isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) { b.lat = la; b.lng = ln; } else { b.lat = null; b.lng = null; }
    }
    if ('services' in inp || creating) {
      var list = [];
      (Array.isArray(inp.services) ? inp.services : []).slice(0, 40).forEach(function (s) {
        var name = cleanText(s && s.name, 60);
        if (!name) return;
        list.push({ id: /^[a-z0-9]{4,30}$/.test(s.id || '') ? s.id : rid(5), name: name, price: Math.max(0, Math.min(1e9, Math.round(+en(s.price) || 0))), active: s.active !== false });
      });
      if (!list.length) bad('حداقل یک خدمت اضافه کنید');
      b.services = list;
    }
    if ('hours' in inp || creating) {
      var h = cleanHours(inp.hours, b.hours);
      if (!vals(h).some(function (x) { return x.open; })) bad('حداقل یک روز باید باز باشد');
      b.hours = h;
    }
    if ('offDates' in inp) { var seen = {}; b.offDates = (Array.isArray(inp.offDates) ? inp.offDates : []).filter(function (k) { if (typeof k !== 'string' || !dateKeyOk(k) || seen[k]) return false; return (seen[k] = 1); }).slice(0, 400); }
    if ('weekDiscount' in inp) b.weekDiscount = cleanDiscounts(inp.weekDiscount, function (k) { return /^[0-6]$/.test(k); });
    if ('dateDiscount' in inp) b.dateDiscount = cleanDiscounts(inp.dateDiscount, dateKeyOk);
    if ('slot' in inp || creating) b.slot = [10, 15, 20, 30, 45, 60, 90, 120].indexOf(+inp.slot) >= 0 ? +inp.slot : 30;
    if ('cap' in inp || creating) b.cap = Math.max(1, Math.min(20, Math.round(+inp.cap) || 1));
    if ('advance' in inp || creating) b.advance = Math.max(1, Math.min(180, Math.round(+inp.advance) || 30));
    if ('auto' in inp || creating) b.auto = inp.auto !== false;
    if ('photos' in inp) applyPhotos(b, inp.photos);
  }
  function blankBiz(u) {
    return {
      id: rid(8), ownerUser: u, cat: 'men-barber', name: '', phone: '', city: 'تهران', address: '', lat: null, lng: null, desc: '', photos: [], video: null,
      services: [], hours: NB.defaultHours(), offDates: [], weekDiscount: {}, dateDiscount: {}, slot: 30, cap: 1, advance: 30, auto: true,
      baseRating: 0, baseCount: 0, reviews: [], status: 'pending', statusNote: '', edited: false, created: Date.now()
    };
  }
  function removeBiz(b) {
    Object.keys(DB.appointments).forEach(function (id) { if (DB.appointments[id].biz === b.id) delete DB.appointments[id]; });
    Object.keys(DB.reports).forEach(function (id) { if (DB.reports[id].biz === b.id) delete DB.reports[id]; });
    delete DB.businesses[b.id];
  }
  function seed() {
    SEED.forEach(function (d, i) {
      var b = blankBiz('demo' + i + 'xxxxxx');
      b.cat = d[0]; b.name = d[1]; b.city = d[2]; b.address = d[3]; b.lat = d[4]; b.lng = d[5]; b.baseRating = d[6]; b.baseCount = d[7]; b.desc = d[8]; b.phone = '0210000' + (1000 + i);
      b.services = NB.CATS.filter(function (c) { return c.id === d[0]; })[0].svc.map(function (s) { return { id: rid(5), name: s[0], price: s[1], active: true }; });
      if (d[9]) b.weekDiscount[1 + (i % 3)] = d[9];
      if (['gp-doctor', 'dentist', 'psych'].indexOf(d[0]) >= 0) { b.hours[0].from = '16:00'; b.hours[0].to = '21:00'; }
      if (d[0] === 'gp-doctor') b.hours[3].open = false;
      b.hours[6].open = d[0] === 'gym' || d[0] === 'car';
      b.hours[4].brk = true;
      b.status = 'approved'; b.demo = true;
      DB.businesses[b.id] = b;
    });
  }

  /* ---------- مسیرها ---------- */
  function route(method, p, inp, U, admin) {
    var m, b, a;
    function needUser() { return U || bad('شناسه کاربر نامعتبر است', 401); }

    if (method === 'GET' && p === '/api/sync') {
      var mine = ownBiz(U);
      var list = vals(DB.businesses).filter(function (x) { return x.status === 'approved' || (U && x.ownerUser === U); }).sort(function (x, y) { return y.created - x.created; });
      var out = { config: { requireApproval: DB.settings.requireApproval, now: Date.now() }, businesses: list.map(function (x) { return viewBiz(x, { mine: U && x.ownerUser === U }); }), appointments: [] };
      if (U) {
        var seen = {};
        vals(DB.appointments).forEach(function (x) { if (x.user === U) { out.appointments.push(viewAppt(x, true)); seen[x.id] = 1; } });
        if (mine) vals(DB.appointments).forEach(function (x) { if (x.biz === mine.id && !seen[x.id]) out.appointments.push(viewAppt(x, false)); });
      }
      return out;
    }

    if (method === 'GET' && (m = /^\/api\/businesses\/([a-f0-9]{16})$/.exec(p))) {
      b = DB.businesses[m[1]];
      if (!b || (b.status !== 'approved' && !(U && b.ownerUser === U) && !admin)) bad('کسب‌وکار پیدا نشد', 404);
      var v = viewBiz(b, { detail: true, mine: U && b.ownerUser === U });
      v.busy = busyMap(b);
      return v;
    }

    if (method === 'POST' && p === '/api/businesses') {
      needUser();
      if (ownBiz(U)) bad('شما قبلاً یک کسب‌وکار ثبت کرده‌اید', 409);
      b = blankBiz(U);
      applyBiz(b, inp, true);
      b.status = DB.settings.requireApproval ? 'pending' : 'approved';
      DB.businesses[b.id] = b;
      return viewBiz(b, { mine: true });
    }

    if ((m = /^\/api\/businesses\/([a-f0-9]{16})$/.exec(p)) && (method === 'PUT' || method === 'DELETE')) {
      needUser();
      b = DB.businesses[m[1]];
      if (!b || b.ownerUser !== U) bad('کسب‌وکار پیدا نشد', 404);
      if (method === 'DELETE') { removeBiz(b); return { ok: true }; }
      var before = JSON.stringify([b.name, b.desc, b.photos.length, b.cat]);
      applyBiz(b, inp, false);
      if (b.status === 'approved' && DB.settings.requireApproval && JSON.stringify([b.name, b.desc, b.photos.length, b.cat]) !== before) b.edited = true;
      if (inp._resubmit && b.status === 'rejected') { b.status = 'pending'; b.statusNote = ''; }
      return viewBiz(b, { mine: true });
    }

    if ((m = /^\/api\/businesses\/([a-f0-9]{16})\/video$/.exec(p)) && (method === 'PUT' || method === 'DELETE')) {
      needUser();
      b = DB.businesses[m[1]];
      if (!b || b.ownerUser !== U) bad('کسب‌وکار پیدا نشد', 404);
      if (method === 'PUT') bad('ارسال ویدیو فقط در نسخه‌ی کامل (با سرور) فعال است');
      return viewBiz(b, { mine: true });
    }

    if (method === 'POST' && (m = /^\/api\/businesses\/([a-f0-9]{16})\/reviews$/.exec(p))) {
      needUser();
      b = DB.businesses[m[1]];
      if (!b || b.status !== 'approved') bad('کسب‌وکار پیدا نشد', 404);
      a = DB.appointments[inp.appt];
      if (!a || a.user !== U || a.biz !== b.id) bad('فقط مشتریان این کسب‌وکار می‌توانند نظر بدهند', 403);
      if (a.review) bad('برای این نوبت قبلاً نظر ثبت کرده‌اید', 409);
      if (!(a.status === 'done' || (a.status === 'confirmed' && NB.apptStart(a) + 3600000 < Date.now()))) bad('بعد از انجام خدمت می‌توانید نظر بدهید');
      var stars = Math.round(+inp.stars);
      if (!(stars >= 1 && stars <= 5)) bad('امتیاز نامعتبر است');
      b.reviews.push({ id: rid(5), name: cleanText(a.name, 40), stars: stars, text: cleanText(inp.text, 300, true), at: Date.now(), user: U });
      a.review = true;
      return { ok: true };
    }

    if (method === 'POST' && (m = /^\/api\/businesses\/([a-f0-9]{16})\/report$/.exec(p))) {
      needUser();
      b = DB.businesses[m[1]];
      if (!b || b.status !== 'approved') bad('کسب‌وکار پیدا نشد', 404);
      var reason = cleanText(inp.reason, 300);
      if (reason.length < 3) bad('دلیل گزارش را بنویسید');
      if (vals(DB.reports).some(function (r) { return r.biz === b.id && r.user === U && r.open; })) bad('شما قبلاً این مورد را گزارش کرده‌اید', 409);
      var id = rid(5); DB.reports[id] = { id: id, biz: b.id, user: U, reason: reason, at: Date.now(), open: true };
      return { ok: true };
    }

    if (method === 'POST' && p === '/api/appointments') {
      needUser();
      b = DB.businesses[inp.biz];
      if (!b || b.status !== 'approved') bad('این کسب‌وکار در حال حاضر نوبت نمی‌دهد', 404);
      var name = cleanText(inp.name, 60), phone = phoneOf(inp.phone), date = String(inp.date || ''), time = String(inp.time || '');
      if (name.length < 3) bad('نام و نام خانوادگی را وارد کنید');
      if (!phone) bad('شماره تماس معتبر نیست');
      if (!dateKeyOk(date) || !timeOk(time)) bad('زمان نامعتبر است');
      var d = J.parse(date);
      if (!NB.inWindow(b, d.y, d.m, d.d)) bad('این روز قابل رزرو نیست');
      var orig = NB.takenTimes;
      NB.takenTimes = function (bizId, key) { return vals(DB.appointments).filter(function (x) { return x.biz === bizId && x.date === key && ACTIVE.indexOf(x.status) >= 0; }).map(function (x) { return x.time; }); };
      var slot;
      try { slot = NB.slotsFor(b, d.y, d.m, d.d).filter(function (s) { return s.time === time; })[0]; } finally { NB.takenTimes = orig; }
      if (!slot) bad('این ساعت وجود ندارد');
      if (!slot.free) bad('این ساعت دیگر خالی نیست؛ ساعت دیگری انتخاب کنید', 409);
      var ids = Array.isArray(inp.svc) ? inp.svc.map(String) : [];
      var pr = NB.priceFor(b, ids, date);
      if (!pr.svcs.length) bad('حداقل یک خدمت را انتخاب کنید');
      var act = vals(DB.appointments).filter(function (x) { return x.user === U && (x.status === 'pending' || x.status === 'confirmed') && NB.apptStart(x) > Date.now(); });
      if (act.length >= 10) bad('شما بیش از ۱۰ نوبت فعال دارید. ابتدا برخی را لغو کنید.', 429);
      if (act.some(function (x) { return x.biz === b.id && x.date === date && x.time === time; })) bad('شما برای این ساعت قبلاً نوبت دارید', 409);
      a = { id: rid(6), biz: b.id, user: U, name: name, phone: phone, svc: pr.names, date: date, time: time, price: pr.price, discount: pr.discount, total: pr.total, note: cleanText(inp.note, 200, true), status: b.auto ? 'confirmed' : 'pending', created: Date.now(), review: false };
      DB.appointments[a.id] = a;
      return viewAppt(a, true);
    }

    if (method === 'PATCH' && (m = /^\/api\/appointments\/([a-f0-9]{12})$/.exec(p))) {
      a = DB.appointments[m[1]];
      if (!a) bad('نوبت پیدا نشد', 404);
      b = DB.businesses[a.biz];
      var to = inp.status, isOwner = U && b && b.ownerUser === U, isCust = U && a.user === U;
      if (!isOwner && !isCust) bad('اجازه‌ی این کار را ندارید', 403);
      var FLOW = { pending: ['confirmed', 'rejected', 'cancelled'], confirmed: ['done', 'cancelled'] };
      if ((FLOW[a.status] || []).indexOf(to) < 0) bad('تغییر وضعیت ممکن نیست', 409);
      if (!isOwner && to !== 'cancelled') bad('اجازه‌ی این کار را ندارید', 403);
      if (!isOwner && NB.apptStart(a) < Date.now()) bad('زمان این نوبت گذشته است', 409);
      a.status = to;
      return viewAppt(a, isCust);
    }

    /* ----- مدیر ----- */
    if (method === 'POST' && p === '/api/admin/login') {
      var pw = (NB.cfg && NB.cfg.localAdminPassword) || 'admin1234';
      if (String(inp.password || '') !== pw) bad('رمز اشتباه است', 401);
      return { token: 'local-admin' };
    }
    if (p.indexOf('/api/admin/') === 0) {
      if (!admin) bad('دسترسی مدیر لازم است', 401);
      if (method === 'GET' && p === '/api/admin/stats') {
        var bs = vals(DB.businesses), t = todayKey(), week = Date.now() - 7 * 86400000, as = vals(DB.appointments);
        var count = function (st) { return bs.filter(function (x) { return x.status === st; }).length; };
        return {
          total: bs.length, pending: count('pending'), approved: count('approved'), rejected: count('rejected'), disabled: count('disabled'),
          edited: bs.filter(function (x) { return x.edited && x.status === 'approved'; }).length,
          reported: bs.filter(function (x) { return openReports(x.id).length; }).length,
          demo: bs.filter(function (x) { return x.demo; }).length,
          appointments: as.length, today: as.filter(function (x) { return x.date === t; }).length, week: as.filter(function (x) { return x.created > week; }).length,
          requireApproval: DB.settings.requireApproval
        };
      }
      if (method === 'GET' && p === '/api/admin/businesses') {
        return { businesses: vals(DB.businesses).sort(function (x, y) { return y.created - x.created; }).map(function (x) {
          var v = viewBiz(x, { admin: true }); v.photos = v.photos.slice(0, 1);
          v.reviews = []; v.reports = openReports(x.id).length; v.appts = vals(DB.appointments).filter(function (z) { return z.biz === x.id; }).length;
          return v;
        }) };
      }
      if ((m = /^\/api\/admin\/businesses\/([a-f0-9]{16})$/.exec(p))) {
        b = DB.businesses[m[1]];
        if (!b) bad('کسب‌وکار پیدا نشد', 404);
        if (method === 'GET') {
          var av = viewBiz(b, { admin: true });
          av.reports = vals(DB.reports).filter(function (r) { return r.biz === b.id; }).sort(function (x, y) { return y.at - x.at; }).map(function (r) { return { id: r.id, reason: r.reason, at: r.at, open: r.open }; });
          av.appts = vals(DB.appointments).filter(function (z) { return z.biz === b.id; }).length;
          return av;
        }
        if (method === 'PATCH') {
          if (['approved', 'pending', 'rejected', 'disabled'].indexOf(inp.status) < 0) bad('وضعیت نامعتبر است');
          b.status = inp.status; b.statusNote = cleanText(inp.note, 300);
          if (inp.status === 'approved') { b.edited = false; b.statusNote = ''; }
          return { ok: true, status: b.status };
        }
        if (method === 'DELETE') { removeBiz(b); return { ok: true }; }
      }
      if (method === 'DELETE' && (m = /^\/api\/admin\/businesses\/([a-f0-9]{16})\/photos\/(\d)$/.exec(p))) {
        b = DB.businesses[m[1]];
        if (!b || +m[2] >= b.photos.length) bad('عکس پیدا نشد', 404);
        b.photos.splice(+m[2], 1); return { ok: true };
      }
      if (method === 'DELETE' && /^\/api\/admin\/businesses\/([a-f0-9]{16})\/video$/.test(p)) return { ok: true };
      if (method === 'DELETE' && (m = /^\/api\/admin\/businesses\/([a-f0-9]{16})\/reviews\/([a-f0-9]{10})$/.exec(p))) {
        b = DB.businesses[m[1]];
        if (!b) bad('کسب‌وکار پیدا نشد', 404);
        b.reviews = b.reviews.filter(function (r) { return r.id !== m[2]; }); return { ok: true };
      }
      if (method === 'POST' && (m = /^\/api\/admin\/businesses\/([a-f0-9]{16})\/reports\/clear$/.exec(p))) {
        vals(DB.reports).forEach(function (r) { if (r.biz === m[1]) r.open = false; }); return { ok: true };
      }
      if (method === 'POST' && p === '/api/admin/demo/delete') { vals(DB.businesses).filter(function (x) { return x.demo; }).forEach(removeBiz); return { ok: true }; }
      if (method === 'PUT' && p === '/api/admin/settings') { DB.settings.requireApproval = !!inp.requireApproval; return { requireApproval: DB.settings.requireApproval }; }
    }
    return bad('مسیر پیدا نشد', 404);
  }

  NB.localApi = function (method, path, body, headers) {
    return new Promise(function (resolve, reject) {
      try {
        load();
        var U = /^[a-z0-9]{8,40}$/.test((headers && headers['X-User']) || '') ? headers['X-User'] : null;
        var admin = (headers && headers['X-Admin']) === 'local-admin';
        var inp = body && typeof body === 'object' ? JSON.parse(JSON.stringify(body)) : {};
        var out = route(method, path.split('?')[0], inp, U, admin);
        if (method !== 'GET') persist();
        resolve(JSON.parse(JSON.stringify(out)));
      } catch (e) { if (e.status === 507) DB = null; if (!e.status) console.error(e); reject(e.status ? e : Object.assign(new Error('خطای داخلی'), { status: 500 })); }
    });
  };
})();
