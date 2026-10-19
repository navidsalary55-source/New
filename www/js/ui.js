/* ابزارهای رابط کاربری: آیکون‌ها، فرمت‌ها، تقویم، پنجره‌ها، مسیریابی */
(function () {
  var NB = (window.NB = window.NB || {});

  /* ---------- ابزارهای عمومی ---------- */
  NB.$ = function (s, r) { return (r || document).querySelector(s); };
  NB.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  NB.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  NB.fa = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  // تبدیل ارقام فارسی/عربی به انگلیسی
  NB.en = function (s) {
    return String(s == null ? '' : s)
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; })
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; });
  };
  NB.num = function (s) { var v = parseFloat(NB.en(s).replace(/[,٬\s]/g, '')); return isNaN(v) ? 0 : v; };
  NB.money = function (n) { return NB.fa(Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬')); };
  NB.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  NB.debounce = function (f, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { f.apply(null, a); }, ms); }; };
  NB.setPath = function (o, path, v) {
    var p = path.split('.'), i;
    for (i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = v;
  };
  NB.getPath = function (o, path) {
    var p = path.split('.'), i;
    for (i = 0; i < p.length && o != null; i++) o = o[p[i]];
    return o;
  };

  /* ---------- آیکون‌ها ---------- */
  var IC = {
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    back: '<polyline points="9 18 15 12 9 6"/>',
    next: '<polyline points="15 18 9 12 15 6"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
    chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'
  };
  NB.icon = function (n, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';
  };

  /* ---------- ستاره‌ها ---------- */
  NB.stars = function (r) {
    var out = '', i;
    for (i = 1; i <= 5; i++) out += '<span class="st' + (r >= i - 0.25 ? ' on' : '') + '">' + NB.icon('star') + '</span>';
    return '<span class="stars">' + out + '</span>';
  };

  /* ---------- پیام کوتاه ---------- */
  var toastT;
  NB.toast = function (msg, kind) {
    var t = NB.$('#toast');
    t.textContent = msg;
    t.className = 'show ' + (kind || '');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.className = ''; }, 2600);
  };

  /* ---------- پنجره‌های روی صفحه (با پشتیبانی از دکمه برگشت) ---------- */
  var ovStack = [], pendingCb = null;
  function pushOv(closeFn) {
    ovStack.push(closeFn);
    try { history.pushState({ ov: ovStack.length }, ''); } catch (e) {}
  }
  NB.closeOv = function () {
    if (ovStack.length) { try { history.back(); } catch (e) { var f = ovStack.pop(); f && f(); } }
  };
  NB.closeAllOv = function (cb) {
    if (!ovStack.length) { cb && cb(); return; }
    pendingCb = cb || null;
    history.back();
  };
  window.addEventListener('popstate', function () {
    if (ovStack.length) {
      var f = ovStack.pop();
      f && f();
      if (ovStack.length) { history.back(); return; }
      if (pendingCb) { var cb = pendingCb; pendingCb = null; setTimeout(cb, 0); }
    }
  });

  NB.sheet = function (html, opts) {
    opts = opts || {};
    var root = NB.$('#ov');
    var el = document.createElement('div');
    el.className = 'ov-wrap';
    el.innerHTML = '<div class="ov-bg" data-act="closeOv"></div><div class="sheet' + (opts.tall ? ' tall' : '') + '"><div class="sheet-grab"></div>' + html + '</div>';
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    pushOv(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 220);
      opts.onClose && opts.onClose();
    });
    return el;
  };

  NB.confirm = function (msg, okText, danger) {
    return new Promise(function (res) {
      var done = false;
      var el = NB.sheet(
        '<div class="dlg"><p>' + NB.esc(msg) + '</p><div class="row gap"><button class="btn ' + (danger ? 'btn-danger' : 'btn-pri') + ' grow" data-dlg="1">' + NB.esc(okText || 'تأیید') + '</button><button class="btn btn-ghost grow" data-act="closeOv">انصراف</button></div></div>',
        { onClose: function () { if (!done) res(false); } }
      );
      el.querySelector('[data-dlg]').addEventListener('click', function () { done = true; res(true); NB.closeOv(); });
    });
  };

  NB.lightbox = function (src, isVideo) {
    var el = document.createElement('div');
    el.className = 'lightbox';
    el.innerHTML = '<button class="lb-x" data-act="closeOv">' + NB.icon('x') + '</button>' + (isVideo ? '<video src="' + src + '" controls autoplay playsinline></video>' : '<img src="' + src + '" alt="">');
    NB.$('#ov').appendChild(el);
    pushOv(function () { el.remove(); });
  };

  NB.drawer = {
    open: function () {
      var el = NB.$('#drawer');
      NB.drawer.render && NB.drawer.render();
      if (el.classList.contains('open')) return;
      el.classList.add('open');
      pushOv(function () { el.classList.remove('open'); });
    }
  };

  /* ---------- اکشن‌ها (رویداد کلیک عمومی) ---------- */
  NB.acts = {
    closeOv: function () { NB.closeOv(); },
    drawer: function () { NB.drawer.open(); },
    back: function () { if (history.length > 1) history.back(); else NB.go('/home'); }
  };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var f = NB.acts[t.dataset.act];
    if (f) { f(t.dataset, t, e); }
  });
  // لینک‌های داخل منو: ابتدا منو بسته می‌شود
  NB.nav = function (path) { NB.closeAllOv(function () { NB.go(path); }); };
  NB.acts.nav = function (d) { NB.nav(d.to); };

  /* ---------- اتصال فرم‌ها به آبجکت جاری ---------- */
  NB.cur = null; // آبجکتی که فیلدهای data-model روی آن نوشته می‌شوند
  NB.onModel = null;
  function onInput(e) {
    var t = e.target;
    if (!t.dataset || !t.dataset.model || !NB.cur) return;
    var v;
    if (t.type === 'checkbox') v = t.checked;
    else if (t.dataset.num != null) v = NB.num(t.value);
    else v = t.value;
    NB.setPath(NB.cur, t.dataset.model, v);
    NB.onModel && NB.onModel(t.dataset.model, v, t);
  }
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);

  /* ---------- تقویم ---------- */
  NB.calState = {};
  // opts: id, cell(y,m,d) -> {dis, off, badge, mark, cls}, canPrev(y,m), canNext(y,m), selected
  NB.calendar = function (opts) {
    var st = NB.calState[opts.id];
    if (!st) { var t = J_today(); st = NB.calState[opts.id] = { y: t.y, m: t.m }; }
    var y = st.y, m = st.m, len = NB.J.monthLen(y, m), off = NB.J.wd(y, m, 1), i, h = '';
    var prevOk = opts.canPrev ? opts.canPrev(y, m) : true;
    var nextOk = opts.canNext ? opts.canNext(y, m) : true;
    h += '<div class="cal"><div class="cal-head">' +
      '<button class="cal-nav" ' + (prevOk ? 'data-act="calNav" data-cal="' + opts.id + '" data-dir="-1"' : 'disabled') + '>' + NB.icon('back') + '</button>' +
      '<div class="cal-title">' + NB.J.months[m - 1] + ' ' + NB.fa(y) + '</div>' +
      '<button class="cal-nav" ' + (nextOk ? 'data-act="calNav" data-cal="' + opts.id + '" data-dir="1"' : 'disabled') + '>' + NB.icon('next') + '</button></div>';
    h += '<div class="cal-grid cal-wd">';
    for (i = 0; i < 7; i++) h += '<div class="' + (i === 6 ? 'fri' : '') + '">' + NB.J.wshort[i] + '</div>';
    h += '</div><div class="cal-grid">';
    for (i = 0; i < off; i++) h += '<div class="cal-e"></div>';
    for (i = 1; i <= len; i++) {
      var k = NB.J.key(y, m, i), c = opts.cell(y, m, i) || {};
      var cls = 'cal-d' + (c.dis ? ' dis' : '') + (c.off ? ' off' : '') + (c.today ? ' today' : '') + (opts.selected === k ? ' sel' : '') + (c.cls ? ' ' + c.cls : '') + ((off + i - 1) % 7 === 6 ? ' fri' : '');
      h += '<button class="' + cls + '"' + (c.dis ? ' disabled' : ' data-act="' + (opts.act || 'calPick') + '" data-k="' + k + '" data-cal="' + opts.id + '"') + '><span class="n">' + NB.fa(i) + '</span>' + (c.badge ? '<span class="bd">' + c.badge + '</span>' : (c.mark ? '<span class="mk ' + c.mark + '"></span>' : '')) + '</button>';
    }
    h += '</div></div>';
    return h;
  };
  function J_today() { return NB.J.today(); }
  NB.acts.calNav = function (d) {
    var st = NB.calState[d.cal], dir = +d.dir;
    st.m += dir;
    if (st.m > 12) { st.m = 1; st.y++; }
    if (st.m < 1) { st.m = 12; st.y--; }
    NB.rerender();
  };

  /* ---------- مسیریاب ---------- */
  var routes = [], lastHash = null;
  NB.route = function (pattern, fn) {
    var keys = [], re = new RegExp('^' + pattern.replace(/:[^/]+/g, function (m) { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
    routes.push({ re: re, keys: keys, fn: fn });
  };
  NB.go = function (path) {
    if (location.hash === '#' + path) NB.rerender(true); else location.hash = '#' + path;
  };
  NB.replace = function (path) { history.replaceState(null, '', '#' + path); NB.dispatch(); };
  NB.path = function () { return (location.hash || '#/home').slice(1).split('?')[0] || '/home'; };
  NB.query = function () {
    var q = (location.hash.split('?')[1] || ''), o = {};
    q.split('&').forEach(function (p) { if (p) { var a = p.split('='); o[a[0]] = decodeURIComponent(a[1] || ''); } });
    return o;
  };
  NB.dispatch = function (keepScroll) {
    var path = NB.path(), first = path !== lastHash, i, m, params, v = NB.$('#view'), sy = v.scrollTop;
    lastHash = path;
    for (i = 0; i < routes.length; i++) {
      m = routes[i].re.exec(path);
      if (m) {
        params = {};
        routes[i].keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        try { routes[i].fn(params, first); if (first && NB.onRoute) NB.onRoute(path); } catch (err) { console.error(err); NB.page({ title: 'خطا', html: '<div class="empty"><div class="e-ic">⚠️</div><p>مشکلی پیش آمد.</p><button class="btn btn-pri" data-act="nav" data-to="/home">بازگشت به خانه</button></div>' }); }
        if (first) v.scrollTop = 0; else if (keepScroll !== false) v.scrollTop = sy;
        return;
      }
    }
    NB.go('/home');
  };
  NB.rerender = function (force) { if (force) lastHash = null; NB.dispatch(); };
  window.addEventListener('hashchange', function () { NB.dispatch(); });

  // نمایش یک صفحه: {title, html, back, tabs: 'customer'|'owner'|null, actions}
  NB.page = function (o) {
    NB.$('#title').textContent = o.title || NB.cfg.appName;
    NB.$('#backBtn').hidden = !o.back;
    NB.$('#menuBtn').hidden = !!o.back;
    NB.$('#barActions').innerHTML = o.actions || '';
    NB.$('#view').innerHTML = o.html || '';
    NB.$('#view').className = 'view' + (o.tabs ? ' has-tabs' : '') + (o.fab ? ' has-fab' : '');
    NB.renderTabs(o.tabs, o.tab);
    var bar = NB.$('#bar');
    bar.className = o.plain ? 'plain' : '';
  };

  NB.renderTabs = function (kind, active) {
    var el = NB.$('#tabs'), items;
    if (!kind) { el.innerHTML = ''; el.hidden = true; return; }
    if (kind === 'admin') items = [['dash', 'chart', 'داشبورد', '/admin/home'], ['list', 'list', 'کسب‌وکارها', '/admin/list'], ['set', 'settings', 'تنظیمات', '/admin/settings']];
    else if (kind === 'customer') items = [['home', 'home', 'خانه', '/home'], ['calendar', 'calendar', 'نوبت‌های من', '/appts'], ['heart', 'heart', 'علاقه‌مندی', '/fav'], ['user', 'user', 'پروفایل', '/profile'], ['biz', 'briefcase', NB.myBiz && NB.myBiz() ? 'کسب‌وکار من' : 'ثبت کسب‌وکار', NB.myBiz && NB.myBiz() ? '/owner' : '/owner/register']];
    else items = [['dash', 'chart', 'داشبورد', '/owner'], ['appts', 'list', 'نوبت‌ها', '/owner/appts'], ['plan', 'calendar', 'برنامه', '/owner/plan'], ['svc', 'tag', 'خدمات', '/owner/services'], ['prof', 'briefcase', 'کسب‌وکار', '/owner/profile']];
    el.hidden = false;
    el.innerHTML = items.map(function (it) {
      return '<button class="tab' + (active === it[0] ? ' on' : '') + '" data-act="nav" data-to="' + it[3] + '">' + NB.icon(it[1]) + '<span>' + it[2] + '</span></button>';
    }).join('');
  };

  NB.cfg = window.NB_CONFIG;
})();
