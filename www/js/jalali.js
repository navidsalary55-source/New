/* تقویم شمسی (جلالی) — بر پایه الگوریتم jalaali-js (MIT) */
(function () {
  var NB = (window.NB = window.NB || {});
  var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy) {
    var bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump = 0, leap, leapG, march, n, i;
    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }
  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }
  function j2d(jy, jm, jd) {
    var r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    var g = d2g(jdn), jy = g.gy - 621, r = jalCal(jy), jdn1f = g2d(g.gy, 3, r.march), jd, jm, k;
    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { y: jy, m: jm, d: jd }; }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { y: jy, m: jm, d: jd };
  }

  var J = (NB.J = {});
  J.months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  // هفته از شنبه شروع می‌شود: ۰=شنبه ... ۶=جمعه
  J.wdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  J.wshort = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  J.isLeap = function (y) { return jalCal(y).leap === 0; };
  J.monthLen = function (y, m) { return m <= 6 ? 31 : m <= 11 ? 30 : J.isLeap(y) ? 30 : 29; };
  J.toGregorian = function (y, m, d) { var g = d2g(j2d(y, m, d)); return new Date(g.gy, g.gm - 1, g.gd); };
  J.fromDate = function (dt) { return d2j(g2d(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())); };
  J.today = function () { return J.fromDate(new Date()); };
  // اندیس روز هفته (۰=شنبه)
  J.wd = function (y, m, d) { return (J.toGregorian(y, m, d).getDay() + 1) % 7; };
  J.key = function (y, m, d) { return y + '/' + (m < 10 ? '0' : '') + m + '/' + (d < 10 ? '0' : '') + d; };
  J.parse = function (k) { var p = String(k).split('/'); return { y: +p[0], m: +p[1], d: +p[2] }; };
  // مقایسه: منفی اگر a < b
  J.cmp = function (a, b) { return a.y - b.y || a.m - b.m || a.d - b.d; };
  J.addDays = function (o, n) { return J.fromDate(new Date(J.toGregorian(o.y, o.m, o.d).getTime() + n * 86400000 + 3600000 * 3)); };
  J.diffDays = function (a, b) { return j2d(b.y, b.m, b.d) - j2d(a.y, a.m, a.d); };
  J.label = function (k) {
    var o = typeof k === 'string' ? J.parse(k) : k;
    return J.wdays[J.wd(o.y, o.m, o.d)] + ' ' + NB.fa(o.d) + ' ' + J.months[o.m - 1] + ' ' + NB.fa(o.y);
  };
  J.short = function (k) {
    var o = typeof k === 'string' ? J.parse(k) : k;
    return NB.fa(o.d) + ' ' + J.months[o.m - 1];
  };
})();
