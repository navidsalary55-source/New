/* داده‌ها: ارتباط با سرور، حافظه‌ی موقت، وضعیت کاربر */
(function () {
  var NB = (window.NB = window.NB || {});
  var KEY = 'nb_state_v2', CKEY = 'nb_cache_v2', S = null;
  var ACTIVE = ['pending', 'confirmed', 'done'];

  /* ---------- وضعیت محلی (فقط تنظیمات و شناسه‌ی کاربر روی گوشی می‌ماند) ---------- */
  function fresh() {
    return {
      v: 2, settings: { dark: false, font: 1, mode: 'customer', city: null },
      user: { id: NB.uid(), name: '', phone: '' }, favorites: [], admin: null,
      businesses: [], appointments: [], busy: {}, config: { requireApproval: true }, lastSync: 0, online: true
    };
  }
  NB.load = function () {
    var saved = null, cache = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    try { cache = JSON.parse(localStorage.getItem(CKEY)); } catch (e) {}
    S = fresh();
    if (saved && saved.user) {
      S.settings = Object.assign(S.settings, saved.settings || {});
      S.user = Object.assign(S.user, saved.user);
      S.favorites = saved.favorites || [];
      S.admin = saved.admin || null;
    }
    if (cache && cache.businesses && cache.uid === S.user.id) {
      S.businesses = cache.businesses.map(ingest);
      S.appointments = cache.appointments || [];
      S.config = cache.config || S.config;
    }
    NB.save();
    return Promise.resolve(S);
  };
  NB.S = function () { return S; };
  var saveT;
  NB.save = function () {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify({ v: 2, settings: S.settings, user: S.user, favorites: S.favorites, admin: S.admin })); } catch (e) {}
    }, 150);
  };
  function writeCache() {
    try { localStorage.setItem(CKEY, JSON.stringify({ uid: S.user.id, businesses: S.businesses, appointments: S.appointments, config: S.config })); } catch (e) {}
  }
  NB.resetLocal = function () {
    try { localStorage.removeItem(KEY); localStorage.removeItem(CKEY); } catch (e) {}
    S = fresh(); NB.save();
  };
  // بازیابی حساب با کد دسترسی (برای صاحب کسب‌وکار روی گوشی جدید)
  NB.restoreAccount = function (code) {
    code = String(code || '').trim().toLowerCase();
    if (!/^[a-z0-9]{8,40}$/.test(code)) return Promise.reject(new Error('کد وارد شده معتبر نیست'));
    var old = S.user.id;
    S.user.id = code; NB.save();
    return NB.sync(true).then(function () {
      if (!NB.myBiz()) { S.user.id = old; NB.save(); return NB.sync(true).then(function () { throw new Error('با این کد کسب‌وکاری پیدا نشد'); }); }
      S.settings.mode = 'owner'; NB.save();
    });
  };

  /* ---------- ارتباط با سرور ---------- */
  NB.base = function () {
    var c = (NB.cfg.apiBase || '').replace(/\/+$/, '');
    if (c) return c;
    if (!window.Capacitor && /^https?:$/.test(location.protocol)) return location.origin;
    return '';
  };
  NB.isLocal = function () { return !NB.base(); };
  NB.url = function (p) { if (!p) return ''; if (/^(data:|https?:)/.test(p)) return p; return NB.base() + p; };

  NB.api = function (method, path, body, opts) {
    opts = opts || {};
    var base = NB.base();
    var h = { 'X-User': S.user.id };
    if (!base) { // نسخه‌ی آزمایشی بدون سرور
      if (S.admin && path.indexOf('/api/admin/') === 0) h['X-Admin'] = S.admin;
      if (opts.raw) return Promise.reject(Object.assign(new Error('ارسال ویدیو فقط در نسخه‌ی کامل (با سرور) فعال است'), { status: 400 }));
      return NB.localApi(method, path, body, h);
    }
    if (!opts.raw) h['Content-Type'] = 'application/json';
    if (S.admin && path.indexOf('/api/admin/') === 0) h['X-Admin'] = S.admin;
    if (opts.headers) Object.assign(h, opts.headers);
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { ctl && ctl.abort(); }, opts.timeout || 25000);
    return fetch(base + path, { method: method, headers: h, signal: ctl ? ctl.signal : undefined, body: body == null ? undefined : (opts.raw ? body : JSON.stringify(body)) })
      .then(function (r) {
        clearTimeout(timer);
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) {
            var e = new Error(j.error || 'خطایی رخ داد'); e.status = r.status;
            if (r.status === 401 && path.indexOf('/api/admin/') === 0 && path !== '/api/admin/login') { S.admin = null; NB.save(); e.adminExpired = true; }
            throw e;
          }
          return j;
        });
      }, function () {
        clearTimeout(timer);
        var e = new Error('اتصال به اینترنت یا سرور برقرار نشد'); e.status = 0; e.network = true; throw e;
      });
  };

  /* ---------- ورود داده‌ی سرور به حافظه ---------- */
  function ingest(b) {
    b.photos = (b.photos || []).map(NB.url);
    if (b.video && b.video.url) b.video = Object.assign({}, b.video, { url: NB.url(b.video.url) });
    b.offDates = b.offDates || []; b.weekDiscount = b.weekDiscount || {}; b.dateDiscount = b.dateDiscount || {};
    b.reviews = b.reviews || []; b.services = b.services || [];
    return b;
  }
  NB.ingest = ingest;
  var syncing = null;
  function sig() { return JSON.stringify([S.businesses, S.appointments, S.config]); }
  NB.sync = function (force) {
    if (syncing) return syncing;
    if (!force && (Date.now() - S.lastSync < 12000 || NB.hasPending())) return Promise.resolve(false);
    var before = sig();
    syncing = NB.api('GET', '/api/sync').then(function (d) {
      // جزئیاتی که قبلاً گرفته شده (نظرات) را برای کسب‌وکارهای دیده‌شده نگه می‌داریم
      var old = {}; S.businesses.forEach(function (b) { old[b.id] = b; });
      S.businesses = d.businesses.map(function (b) {
        ingest(b);
        if (old[b.id] && old[b.id]._detail && !b.mine) { b.reviews = old[b.id].reviews; b._detail = true; }
        return b;
      });
      S.appointments = d.appointments;
      S.config = d.config; S.lastSync = Date.now(); S.online = true;
      var uid = S.user.id; void uid;
      writeCache();
      return sig() !== before;
    }, function (e) { S.online = false; throw e; });
    var done = function () { syncing = null; };
    syncing.then(done, done);
    return syncing;
  };
  var detailAt = {};
  NB.ensureDetail = function (id, force) {
    if (!force && detailAt[id] && Date.now() - detailAt[id] < 8000) return Promise.resolve(false);
    detailAt[id] = Date.now();
    return NB.api('GET', '/api/businesses/' + id).then(function (d) {
      var busy = d.busy || {}; delete d.busy;
      ingest(d);
      var b = NB.biz(id);
      if (b) {
        var keep = { mine: b.mine };
        Object.keys(d).forEach(function (k) { if (!(b.mine && NB.hasPending())) b[k] = d[k]; });
        Object.assign(b, keep);
      } else { S.businesses.push(d); b = d; }
      b._detail = true;
      S.busy[id] = { at: Date.now(), map: busy };
      return true;
    });
  };

  /* ---------- دسترسی‌ها ---------- */
  NB.biz = function (id) { for (var i = 0; i < S.businesses.length; i++) if (S.businesses[i].id === id) return S.businesses[i]; return null; };
  NB.myBiz = function () { for (var i = 0; i < S.businesses.length; i++) if (S.businesses[i].mine) return S.businesses[i]; return null; };
  NB.pub = function () { return S.businesses.filter(function (b) { return b.status === 'approved'; }); };
  NB.rating = function (b) { return { avg: b.rAvg || 0, n: b.rN || 0 }; };
  NB.minPrice = function (b) {
    var p = b.services.filter(function (s) { return s.active !== false; }).map(function (s) { return s.price; });
    return p.length ? Math.min.apply(null, p) : 0;
  };
  NB.isFav = function (id) { return S.favorites.indexOf(id) >= 0; };
  NB.toggleFav = function (id) {
    var i = S.favorites.indexOf(id);
    if (i >= 0) S.favorites.splice(i, 1); else S.favorites.push(id);
    NB.save();
  };
  NB.newBiz = function (catId) {
    var c = NB.cat(catId || 'men-barber');
    return {
      id: 'draft', cat: c.id, name: '', phone: S.user.phone || '', city: 'تهران', address: '', lat: null, lng: null,
      desc: '', photos: [], video: null,
      services: c.svc.map(function (s) { return { id: NB.uid(), name: s[0], price: s[1], active: true }; }),
      hours: NB.defaultHours(), offDates: [], weekDiscount: {}, dateDiscount: {}, slot: 30, cap: 1, advance: 30, auto: true, reviews: []
    };
  };

  /* ---------- ساعت‌های اشغال ---------- */
  NB.takenTimes = function (bizId, key) {
    var bm = S.busy[bizId];
    if (bm) return (bm.map[key] || []).slice();
    return S.appointments.filter(function (a) { return a.biz === bizId && a.date === key && ACTIVE.indexOf(a.status) >= 0; }).map(function (a) { return a.time; });
  };
  // نوبت‌های دارای جزئیات (برای صاحب کسب‌وکار)
  NB.apptsOn = function (bizId, key) {
    return S.appointments.filter(function (a) { return a.biz === bizId && a.date === key && ACTIVE.indexOf(a.status) >= 0; });
  };

  /* ---------- ذخیره‌ی کسب‌وکار (صاحب کسب‌وکار) ---------- */
  var FIELDS = ['cat', 'name', 'phone', 'city', 'address', 'desc', 'lat', 'lng', 'photos', 'services', 'hours', 'offDates', 'weekDiscount', 'dateDiscount', 'slot', 'cap', 'advance', 'auto'];
  NB.bizPayload = function (b) { var o = {}; FIELDS.forEach(function (k) { o[k] = b[k]; }); return o; };
  var pend = {}, timers = {}, inflight = 0;
  NB.hasPending = function () { return Object.keys(pend).length > 0 || inflight > 0; };
  function flushBiz(id) {
    var b = pend[id];
    if (!b) return Promise.resolve();
    delete pend[id]; clearTimeout(timers[id]);
    inflight++;
    var hadData = (b.photos || []).some(function (p) { return /^data:/.test(p); });
    return NB.api('PUT', '/api/businesses/' + id, NB.bizPayload(b), { timeout: 60000 }).then(function (r) {
      b.photos = (r.photos || []).map(NB.url);
      b.status = r.status; b.statusNote = r.statusNote; b.edited = r.edited;
      b.video = r.video ? Object.assign({}, r.video, { url: NB.url(r.video.url) }) : null;
      writeCache();
      if (hadData) NB.rerender();
    }).catch(function (e) { NB.toast(e.message, 'bad'); }).then(function () { inflight--; });
  }
  NB.saveBiz = function (b, now) {
    b = b || NB.cur;
    if (!b || !b.mine) b = NB.myBiz();
    if (!b) return Promise.resolve();
    pend[b.id] = b; clearTimeout(timers[b.id]);
    if (now) return flushBiz(b.id);
    timers[b.id] = setTimeout(function () { flushBiz(b.id); }, 900);
    return Promise.resolve();
  };
  NB.flushAll = function () { return Promise.all(Object.keys(pend).map(flushBiz)); };

  NB.createBiz = function (d, videoFile) {
    return NB.api('POST', '/api/businesses', NB.bizPayload(d), { timeout: 90000 }).then(function (b) {
      ingest(b);
      S.businesses = S.businesses.filter(function (x) { return x.id !== b.id; });
      S.businesses.push(b);
      if (!videoFile) return b;
      return NB.uploadVideo(b, videoFile).catch(function (e) { NB.toast('کسب‌وکار ثبت شد اما ویدیو آپلود نشد: ' + e.message, 'bad'); return b; });
    });
  };
  NB.uploadVideo = function (b, file) {
    if (file.size > 30 * 1048576) return Promise.reject(new Error('حجم ویدیو بیشتر از ۳۰ مگابایت است'));
    return NB.api('PUT', '/api/businesses/' + b.id + '/video', file, { raw: true, timeout: 600000, headers: { 'Content-Type': file.type || 'video/mp4', 'X-Name': encodeURIComponent(file.name || 'video') } }).then(function (r) {
      b.video = r.video ? Object.assign({}, r.video, { url: NB.url(r.video.url) }) : null;
      b.status = r.status; b.edited = r.edited;
      return b;
    });
  };
  NB.deleteVideo = function (b) {
    return NB.api('DELETE', '/api/businesses/' + b.id + '/video').then(function () { b.video = null; });
  };
  NB.deleteBiz = function (b) {
    return NB.api('DELETE', '/api/businesses/' + b.id).then(function () {
      S.businesses = S.businesses.filter(function (x) { return x.id !== b.id; });
      S.appointments = S.appointments.filter(function (a) { return a.biz !== b.id || a.mine; });
      S.favorites = S.favorites.filter(function (i) { return i !== b.id; });
      NB.save(); writeCache();
    });
  };

  /* ---------- نوبت‌ها ---------- */
  NB.book = function (b, data) {
    return NB.api('POST', '/api/appointments', { biz: b.id, svc: data.svc, date: data.date, time: data.time, name: data.name, phone: data.phone, note: data.note }).then(function (a) {
      S.appointments.push(a);
      var bm = S.busy[b.id];
      if (bm) (bm.map[a.date] = bm.map[a.date] || []).push(a.time);
      writeCache();
      return a;
    });
  };
  NB.setApptStatus = function (id, status) {
    return NB.api('PATCH', '/api/appointments/' + id, { status: status }).then(function (r) {
      var a = S.appointments.filter(function (x) { return x.id === id; })[0];
      if (a) a.status = r.status;
      writeCache();
      return a;
    });
  };

  /* ---------- همگام‌سازی خودکار ---------- */
  var AUTO = ['/home', '/fav', '/appts', '/profile', '/owner', '/owner/appts'];
  function isAuto(path) { return AUTO.indexOf(path) >= 0 || /^\/(cat|biz)\//.test(path) || path === '/search'; }
  NB.onRoute = function (path) {
    NB.flushAll && NB.flushAll();
    var m = /^\/(biz|book)\/([a-f0-9]{16})$/.exec(path), auto = isAuto(path);
    if (!auto && !m) return;
    var p = m ? NB.ensureDetail(m[2]).catch(function () { return false; }) : Promise.resolve(false);
    Promise.all([auto ? NB.sync().catch(function () { return false; }) : false, p]).then(function (r) {
      if ((r[0] || r[1]) && NB.path() === path && !NB.$('#ov').children.length) NB.rerender();
    });
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') NB.sync(true).then(function (c) { if (c && isAuto(NB.path()) && !NB.$('#ov').children.length) NB.rerender(); }, function () {});
  });
  setInterval(function () {
    if (document.visibilityState === 'visible' && isAuto(NB.path())) NB.sync().then(function (c) { if (c && !NB.$('#ov').children.length) NB.rerender(); }, function () {});
  }, 45000);
})();
