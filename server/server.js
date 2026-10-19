/* سرور نوبت‌یاب — بدون هیچ وابستگی خارجی (فقط Node.js نسخه ۱۸ یا بالاتر)
   اجرا:  ADMIN_PASSWORD=رمزتان node server/server.js                           */
'use strict';
process.env.TZ = process.env.TZ || 'Asia/Tehran'; // ساعت ایران (باید قبل از هر Date تنظیم شود)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const WWW = path.resolve(process.env.WWW_DIR || path.join(__dirname, '..', 'www'));
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const MAX_VIDEO = 30 * 1024 * 1024;
const MAX_PHOTO = 700 * 1024;

const PHOTO_DIR = path.join(DATA_DIR, 'photos');
const VIDEO_DIR = path.join(DATA_DIR, 'videos');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
[DATA_DIR, PHOTO_DIR, VIDEO_DIR, BACKUP_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

/* ---------- منطق مشترک با اپ (تقویم شمسی، ساعت‌های خالی، قیمت) ---------- */
const ctx = { NB: { fa: String } };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['jalali.js', 'logic.js']) {
  vm.runInContext(fs.readFileSync(path.join(WWW, 'js', f), 'utf8'), ctx, { filename: f });
}
const NB = ctx.NB;
const J = NB.J;
const CAT_IDS = NB.CATS.map((c) => c.id);

/* ---------- پایگاه داده (یک فایل JSON با ذخیره‌ی امن) ---------- */
const DB_FILE = path.join(DATA_DIR, 'data.json');
let DB = { businesses: {}, appointments: {}, reports: {}, settings: { requireApproval: true }, secret: crypto.randomBytes(32).toString('hex') };
try { DB = Object.assign(DB, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* اولین اجرا */ }
DB.settings = Object.assign({ requireApproval: true }, DB.settings);
let saveTimer = null;
function flush() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(DB));
  fs.renameSync(tmp, DB_FILE);
}
function save() { if (!saveTimer) saveTimer = setTimeout(() => { saveTimer = null; try { flush(); } catch (e) { console.error('save failed', e); } }, 300); }
function backup() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const d = new Date(), name = `data-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    const f = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(f)) fs.copyFileSync(DB_FILE, f);
    const all = fs.readdirSync(BACKUP_DIR).filter((x) => x.startsWith('data-')).sort();
    while (all.length > 14) fs.unlinkSync(path.join(BACKUP_DIR, all.shift()));
  } catch (e) { console.error('backup failed', e); }
}
backup(); setInterval(backup, 6 * 3600 * 1000).unref();
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { try { flush(); } catch (e) {} process.exit(0); });

/* ---------- رمز مدیر ---------- */
let ADMIN_PW = process.env.ADMIN_PASSWORD;
if (!ADMIN_PW) {
  const f = path.join(DATA_DIR, 'admin-password.txt');
  try { ADMIN_PW = fs.readFileSync(f, 'utf8').trim(); } catch (e) {
    ADMIN_PW = crypto.randomBytes(9).toString('hex').slice(0, 12);
    fs.writeFileSync(f, ADMIN_PW + '\n', { mode: 0o600 });
    console.log('\n  رمز مدیر به‌صورت خودکار ساخته شد:  ' + ADMIN_PW + '\n  (ذخیره در ' + f + ' — برای تغییر، متغیر ADMIN_PASSWORD را بگذارید)\n');
  }
}
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
function pwOk(p) { return crypto.timingSafeEqual(sha(p), sha(ADMIN_PW)); }
function sign(payload) { return crypto.createHmac('sha256', DB.secret).update(payload).digest('hex'); }
function makeToken() { const exp = String(Date.now() + 12 * 3600 * 1000); return exp + '.' + sign(exp); }
function tokenOk(t) {
  if (typeof t !== 'string') return false;
  const [exp, sig] = t.split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}

/* ---------- ابزارها ---------- */
class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const bad = (m, c = 400) => { throw new HttpError(c, m); };
const rid = (n = 8) => crypto.randomBytes(n).toString('hex');
const en = (s) => String(s == null ? '' : s).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 1776).replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632);
const cleanText = (v, max, multiline) => {
  v = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F‎‏‪-‮]/g, '');
  v = multiline ? v.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : v.replace(/\s+/g, ' ');
  return v.trim().slice(0, max);
};
const phoneOf = (v) => { const p = en(v).replace(/[\s-]/g, ''); return /^0\d{9,10}$/.test(p) ? p : null; };
const timeOk = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const dateKeyOk = (k) => {
  if (!/^1[34]\d\d\/\d\d\/\d\d$/.test(k)) return false;
  const p = J.parse(k);
  return p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= J.monthLen(p.y, p.m);
};
const todayKey = () => { const t = J.today(); return J.key(t.y, t.m, t.d); };
const rmFile = (p) => { try { fs.unlinkSync(p); } catch (e) { /* نبود */ } };

function ipOf(req) {
  if (TRUST_PROXY) { const x = req.headers['x-forwarded-for']; if (x) return String(x).split(',')[0].trim(); }
  return req.socket.remoteAddress || '?';
}
const hits = new Map();
function rate(key, max, windowMs) {
  const now = Date.now(), h = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (h.length >= max) { hits.set(key, h); return false; }
  h.push(now); hits.set(key, h); return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > 3600000) hits.delete(k); }, 600000).unref();

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const len = +req.headers['content-length'] || 0;
    if (len > limit) { req.resume(); return reject(new HttpError(413, 'حجم فایل بیشتر از حد مجاز است')); }
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > limit) { reject(new HttpError(413, 'حجم فایل بیشتر از حد مجاز است')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req, limit = 10 * 1024 * 1024) {
  const b = await readBody(req, limit);
  if (!b.length) return {};
  try { const j = JSON.parse(b.toString('utf8')); return j && typeof j === 'object' ? j : {}; } catch (e) { return bad('درخواست نامعتبر است'); }
}

/* ---------- نوبت‌ها: ساعت‌های اشغال ---------- */
const ACTIVE = ['pending', 'confirmed', 'done'];
NB.takenTimes = (bizId, key) => {
  const out = [];
  for (const a of Object.values(DB.appointments)) if (a.biz === bizId && a.date === key && ACTIVE.includes(a.status)) out.push(a.time);
  return out;
};

/* ---------- نمایش داده‌ها ---------- */
function ratingOf(b) {
  const n = (b.baseCount || 0) + b.reviews.length;
  let sum = (b.baseRating || 0) * (b.baseCount || 0);
  b.reviews.forEach((r) => { sum += r.stars; });
  return { avg: n ? Math.round(sum / n * 10) / 10 : 0, n };
}
function viewBiz(b, o) {
  o = o || {};
  const r = ratingOf(b);
  const v = {
    id: b.id, cat: b.cat, name: b.name, phone: b.phone, city: b.city, address: b.address, lat: b.lat, lng: b.lng, desc: b.desc,
    photos: b.photos, video: b.video || null, services: b.services, hours: b.hours, offDates: b.offDates,
    weekDiscount: b.weekDiscount, dateDiscount: b.dateDiscount, slot: b.slot, cap: b.cap, advance: b.advance, auto: b.auto,
    created: b.created, rAvg: r.avg, rN: r.n, status: b.status, demo: !!b.demo
  };
  if (o.detail || o.mine || o.admin) v.reviews = b.reviews.slice(-30).map((x) => ({ id: x.id, name: x.name, stars: x.stars, text: x.text, at: x.at }));
  if (o.mine || o.admin) { v.statusNote = b.statusNote || ''; v.edited = !!b.edited; }
  if (o.mine) v.mine = true;
  return v;
}
function viewAppt(a, mine) {
  return { id: a.id, biz: a.biz, name: a.name, phone: a.phone, svc: a.svc, date: a.date, time: a.time, price: a.price, discount: a.discount, total: a.total, note: a.note, status: a.status, created: a.created, review: !!a.review, mine: !!mine };
}
function busyMap(b) {
  const map = {}, t = todayKey();
  for (const a of Object.values(DB.appointments)) {
    if (a.biz === b.id && ACTIVE.includes(a.status) && a.date >= t) (map[a.date] = map[a.date] || []).push(a.time);
  }
  return map;
}
const ownBiz = (u) => (u ? Object.values(DB.businesses).find((b) => b.ownerUser === u) : null);

/* ---------- اعتبارسنجی کسب‌وکار ---------- */
function imageType(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
function videoType(buf) {
  if (buf.length > 12 && buf.slice(4, 8).toString() === 'ftyp') return 'mp4';
  if (buf.length > 12 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'webm';
  return null;
}
function applyPhotos(b, list) {
  const keep = [];
  for (const p of Array.isArray(list) ? list.slice(0, 8) : []) {
    if (typeof p !== 'string') continue;
    const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(p);
    if (m) {
      const buf = Buffer.from(m[1], 'base64'), ext = imageType(buf);
      if (!ext || buf.length > MAX_PHOTO) bad('یکی از عکس‌ها نامعتبر یا بزرگ‌تر از ۷۰۰ کیلوبایت است');
      const name = `${b.id}_${rid(6)}.${ext}`;
      fs.writeFileSync(path.join(PHOTO_DIR, name), buf);
      keep.push('/media/photos/' + name);
      continue;
    }
    const n = /\/media\/photos\/([a-z0-9_]+\.(?:jpg|png|webp))$/.exec(p);
    if (n && n[1].startsWith(b.id + '_') && fs.existsSync(path.join(PHOTO_DIR, n[1]))) keep.push('/media/photos/' + n[1]);
  }
  for (const old of b.photos || []) if (!keep.includes(old)) rmFile(path.join(PHOTO_DIR, path.basename(old)));
  b.photos = keep;
}
function cleanHours(h, old) {
  const out = {};
  for (let i = 0; i < 7; i++) {
    const s = (h && h[i]) || {}, o = (old && old[i]) || NB.defaultHours()[i];
    const x = { open: !!s.open, from: timeOk(s.from) ? s.from : o.from, to: timeOk(s.to) ? s.to : o.to, brk: !!s.brk, bfrom: timeOk(s.bfrom) ? s.bfrom : o.bfrom, bto: timeOk(s.bto) ? s.bto : o.bto };
    if (x.open && NB.toMin(x.from) >= NB.toMin(x.to)) bad('ساعت شروع باید قبل از ساعت پایان باشد (' + J.wdays[i] + ')');
    if (x.open && x.brk && NB.toMin(x.bfrom) >= NB.toMin(x.bto)) bad('ساعت استراحت نامعتبر است (' + J.wdays[i] + ')');
    out[i] = x;
  }
  return out;
}
function cleanDiscounts(o, keyOk) {
  const out = {};
  Object.keys(o && typeof o === 'object' ? o : {}).slice(0, 400).forEach((k) => {
    const v = Math.round(+o[k] || 0);
    if (keyOk(k) && v > 0) out[k] = Math.min(v, 90);
  });
  return out;
}
// ورودی کاربر را تمیز می‌کند و روی b می‌نویسد
function applyBiz(b, inp, creating) {
  if ('name' in inp || creating) { const v = cleanText(inp.name, 80); if (v.length < 3) bad('نام کسب‌وکار را وارد کنید (حداقل ۳ حرف)'); b.name = v; }
  if ('cat' in inp || creating) { if (!CAT_IDS.includes(inp.cat)) bad('نوع کسب‌وکار نامعتبر است'); b.cat = inp.cat; }
  if ('phone' in inp || creating) { const p = phoneOf(inp.phone); if (!p) bad('شماره تماس معتبر نیست'); b.phone = p; }
  if ('city' in inp || creating) { b.city = NB.CITIES.includes(inp.city) ? inp.city : 'سایر'; }
  if ('address' in inp || creating) { const v = cleanText(inp.address, 250); if (v.length < 5) bad('آدرس را کامل‌تر بنویسید'); b.address = v; }
  if ('desc' in inp) b.desc = cleanText(inp.desc, 800, true);
  if ('lat' in inp || 'lng' in inp) {
    const la = inp.lat == null || inp.lat === '' ? null : +inp.lat, ln = inp.lng == null || inp.lng === '' ? null : +inp.lng;
    if (la != null && ln != null && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && isFinite(la) && isFinite(ln)) { b.lat = la; b.lng = ln; } else { b.lat = null; b.lng = null; }
  }
  if ('services' in inp || creating) {
    const list = [];
    (Array.isArray(inp.services) ? inp.services : []).slice(0, 40).forEach((s) => {
      const name = cleanText(s && s.name, 60);
      if (!name) return;
      list.push({ id: /^[a-z0-9]{4,30}$/.test(s.id || '') ? s.id : rid(5), name, price: Math.max(0, Math.min(1e9, Math.round(+en(s.price) || 0))), active: s.active !== false });
    });
    if (!list.length) bad('حداقل یک خدمت اضافه کنید');
    b.services = list;
  }
  if ('hours' in inp || creating) {
    const h = cleanHours(inp.hours, b.hours);
    if (!Object.values(h).some((x) => x.open)) bad('حداقل یک روز باید باز باشد');
    b.hours = h;
  }
  if ('offDates' in inp) b.offDates = Array.from(new Set((Array.isArray(inp.offDates) ? inp.offDates : []).filter((k) => typeof k === 'string' && dateKeyOk(k)))).slice(0, 400);
  if ('weekDiscount' in inp) b.weekDiscount = cleanDiscounts(inp.weekDiscount, (k) => /^[0-6]$/.test(k));
  if ('dateDiscount' in inp) b.dateDiscount = cleanDiscounts(inp.dateDiscount, dateKeyOk);
  if ('slot' in inp || creating) b.slot = [10, 15, 20, 30, 45, 60, 90, 120].includes(+inp.slot) ? +inp.slot : 30;
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
  (b.photos || []).forEach((p) => rmFile(path.join(PHOTO_DIR, path.basename(p))));
  if (b.video) rmFile(path.join(VIDEO_DIR, path.basename(b.video.url)));
  for (const [id, a] of Object.entries(DB.appointments)) if (a.biz === b.id) delete DB.appointments[id];
  for (const [id, r] of Object.entries(DB.reports)) if (r.biz === b.id) delete DB.reports[id];
  delete DB.businesses[b.id];
}
const openReports = (bizId) => Object.values(DB.reports).filter((r) => r.biz === bizId && r.open);

/* ---------- مسیرها ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function serveFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const h = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': cache || 'no-cache', 'X-Content-Type-Options': 'nosniff' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      let start = m[1] ? +m[1] : st.size - +m[2], end = m[1] && m[2] ? +m[2] : st.size - 1;
      if (start >= st.size || end >= st.size || start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); return res.end(); }
      res.writeHead(206, Object.assign(h, { 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 }));
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, Object.assign(h, { 'Content-Length': st.size }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

async function api(req, res, url, ip) {
  const method = req.method, p = url.pathname, q = url.searchParams;
  const uHeader = req.headers['x-user'], U = /^[a-z0-9]{8,40}$/.test(uHeader || '') ? uHeader : null;
  const admin = tokenOk(req.headers['x-admin']);
  const needUser = () => U || bad('شناسه کاربر نامعتبر است', 401);
  const needAdmin = () => admin || bad('دسترسی مدیر لازم است', 401);
  let m;

  if (method === 'GET' && p === '/api/health') return send(res, 200, { ok: true });

  if (method === 'GET' && p === '/api/sync') {
    const mine = ownBiz(U);
    const list = Object.values(DB.businesses).filter((b) => b.status === 'approved' || (U && b.ownerUser === U)).sort((a, b) => b.created - a.created).slice(0, 1500);
    const out = { config: { requireApproval: DB.settings.requireApproval, now: Date.now() }, businesses: list.map((b) => viewBiz(b, { mine: U && b.ownerUser === U })), appointments: [] };
    if (U) {
      const seen = new Set();
      for (const a of Object.values(DB.appointments)) {
        if (a.user === U) { out.appointments.push(viewAppt(a, true)); seen.add(a.id); }
      }
      if (mine) for (const a of Object.values(DB.appointments)) if (a.biz === mine.id && !seen.has(a.id)) out.appointments.push(viewAppt(a, false));
    }
    return send(res, 200, out);
  }

  if (method === 'GET' && (m = /^\/api\/businesses\/([a-f0-9]{16})$/.exec(p))) {
    const b = DB.businesses[m[1]];
    if (!b || (b.status !== 'approved' && !(U && b.ownerUser === U) && !admin)) bad('کسب‌وکار پیدا نشد', 404);
    const v = viewBiz(b, { detail: true, mine: U && b.ownerUser === U });
    v.busy = busyMap(b);
    return send(res, 200, v);
  }

  if (method === 'POST' && p === '/api/businesses') {
    needUser();
    if (!rate('create:' + ip, 8, 24 * 3600 * 1000)) bad('تعداد ثبت‌نام از این شبکه زیاد بوده است. فردا دوباره تلاش کنید.', 429);
    if (ownBiz(U)) bad('شما قبلاً یک کسب‌وکار ثبت کرده‌اید', 409);
    const inp = await readJson(req);
    const b = blankBiz(U);
    applyBiz(b, inp, true);
    b.status = DB.settings.requireApproval ? 'pending' : 'approved';
    DB.businesses[b.id] = b; save();
    return send(res, 201, viewBiz(b, { mine: true }));
  }

  if ((m = /^\/api\/businesses\/([a-f0-9]{16})$/.exec(p)) && (method === 'PUT' || method === 'DELETE')) {
    needUser();
    const b = DB.businesses[m[1]];
    if (!b || b.ownerUser !== U) bad('کسب‌وکار پیدا نشد', 404);
    if (method === 'DELETE') { removeBiz(b); save(); return send(res, 200, { ok: true }); }
    const inp = await readJson(req);
    const before = JSON.stringify([b.name, b.desc, b.photos.length, b.cat]);
    applyBiz(b, inp, false);
    if (b.status === 'approved' && DB.settings.requireApproval && JSON.stringify([b.name, b.desc, b.photos.length, b.cat]) !== before) b.edited = true;
    if (inp._resubmit && b.status === 'rejected') { b.status = 'pending'; b.statusNote = ''; }
    save();
    return send(res, 200, viewBiz(b, { mine: true }));
  }

  if ((m = /^\/api\/businesses\/([a-f0-9]{16})\/video$/.exec(p)) && (method === 'PUT' || method === 'DELETE')) {
    needUser();
    const b = DB.businesses[m[1]];
    if (!b || b.ownerUser !== U) bad('کسب‌وکار پیدا نشد', 404);
    if (b.video) { rmFile(path.join(VIDEO_DIR, path.basename(b.video.url))); b.video = null; }
    if (method === 'PUT') {
      const buf = await readBody(req, MAX_VIDEO), ext = videoType(buf);
      if (!ext) bad('فرمت ویدیو پشتیبانی نمی‌شود (MP4 یا WebM)');
      const name = `${b.id}_${rid(6)}.${ext}`;
      fs.writeFileSync(path.join(VIDEO_DIR, name), buf);
      let fname = 'video'; try { fname = decodeURIComponent(req.headers['x-name'] || 'video'); } catch (e) { /* ignore */ }
      b.video = { url: '/media/videos/' + name, size: buf.length, name: cleanText(fname, 80) };
      if (DB.settings.requireApproval && b.status === 'approved') b.edited = true;
    }
    save();
    return send(res, 200, viewBiz(b, { mine: true }));
  }

  if (method === 'POST' && (m = /^\/api\/businesses\/([a-f0-9]{16})\/reviews$/.exec(p))) {
    needUser();
    const b = DB.businesses[m[1]];
    if (!b || b.status !== 'approved') bad('کسب‌وکار پیدا نشد', 404);
    const inp = await readJson(req, 100000), a = DB.appointments[inp.appt];
    if (!a || a.user !== U || a.biz !== b.id) bad('فقط مشتریان این کسب‌وکار می‌توانند نظر بدهند', 403);
    if (a.review) bad('برای این نوبت قبلاً نظر ثبت کرده‌اید', 409);
    if (!(a.status === 'done' || (a.status === 'confirmed' && NB.apptStart(a) + 3600000 < Date.now()))) bad('بعد از انجام خدمت می‌توانید نظر بدهید');
    const stars = Math.round(+inp.stars);
    if (!(stars >= 1 && stars <= 5)) bad('امتیاز نامعتبر است');
    b.reviews.push({ id: rid(5), name: cleanText(a.name, 40), stars, text: cleanText(inp.text, 300, true), at: Date.now(), user: U });
    a.review = true; save();
    return send(res, 201, { ok: true });
  }

  if (method === 'POST' && (m = /^\/api\/businesses\/([a-f0-9]{16})\/report$/.exec(p))) {
    needUser();
    const b = DB.businesses[m[1]];
    if (!b || b.status !== 'approved') bad('کسب‌وکار پیدا نشد', 404);
    if (!rate('report:' + U, 10, 24 * 3600 * 1000)) bad('تعداد گزارش‌ها زیاد است', 429);
    const inp = await readJson(req, 20000), reason = cleanText(inp.reason, 300);
    if (reason.length < 3) bad('دلیل گزارش را بنویسید');
    if (Object.values(DB.reports).some((r) => r.biz === b.id && r.user === U && r.open)) bad('شما قبلاً این مورد را گزارش کرده‌اید', 409);
    const id = rid(5); DB.reports[id] = { id, biz: b.id, user: U, reason, at: Date.now(), open: true }; save();
    return send(res, 201, { ok: true });
  }

  if (method === 'POST' && p === '/api/appointments') {
    needUser();
    if (!rate('appt:' + U, 20, 3600 * 1000) || !rate('appt-ip:' + ip, 60, 3600 * 1000)) bad('تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.', 429);
    const inp = await readJson(req, 50000), b = DB.businesses[inp.biz];
    if (!b || b.status !== 'approved') bad('این کسب‌وکار در حال حاضر نوبت نمی‌دهد', 404);
    const name = cleanText(inp.name, 60), phone = phoneOf(inp.phone), date = String(inp.date || ''), time = String(inp.time || '');
    if (name.length < 3) bad('نام و نام خانوادگی را وارد کنید');
    if (!phone) bad('شماره تماس معتبر نیست');
    if (!dateKeyOk(date) || !timeOk(time)) bad('زمان نامعتبر است');
    const d = J.parse(date);
    if (!NB.inWindow(b, d.y, d.m, d.d)) bad('این روز قابل رزرو نیست');
    const slot = NB.slotsFor(b, d.y, d.m, d.d).find((s) => s.time === time);
    if (!slot) bad('این ساعت وجود ندارد');
    if (!slot.free) bad('این ساعت دیگر خالی نیست؛ ساعت دیگری انتخاب کنید', 409);
    const ids = Array.isArray(inp.svc) ? inp.svc.map(String) : [];
    const pr = NB.priceFor(b, ids, date);
    if (!pr.svcs.length) bad('حداقل یک خدمت را انتخاب کنید');
    const mineActive = Object.values(DB.appointments).filter((a) => a.user === U && (a.status === 'pending' || a.status === 'confirmed') && NB.apptStart(a) > Date.now());
    if (mineActive.length >= 10) bad('شما بیش از ۱۰ نوبت فعال دارید. ابتدا برخی را لغو کنید.', 429);
    if (mineActive.some((a) => a.biz === b.id && a.date === date && a.time === time)) bad('شما برای این ساعت قبلاً نوبت دارید', 409);
    const a = { id: rid(6), biz: b.id, user: U, name, phone, svc: pr.names, date, time, price: pr.price, discount: pr.discount, total: pr.total, note: cleanText(inp.note, 200, true), status: b.auto ? 'confirmed' : 'pending', created: Date.now(), review: false };
    DB.appointments[a.id] = a; save();
    return send(res, 201, viewAppt(a, true));
  }

  if (method === 'PATCH' && (m = /^\/api\/appointments\/([a-f0-9]{12})$/.exec(p))) {
    const a = DB.appointments[m[1]];
    if (!a) bad('نوبت پیدا نشد', 404);
    const b = DB.businesses[a.biz], inp = await readJson(req, 5000), to = inp.status;
    const isOwner = U && b && b.ownerUser === U, isCust = U && a.user === U;
    if (!isOwner && !isCust) bad('اجازه‌ی این کار را ندارید', 403);
    const FLOW = { pending: ['confirmed', 'rejected', 'cancelled'], confirmed: ['done', 'cancelled'] };
    if (!(FLOW[a.status] || []).includes(to)) bad('تغییر وضعیت ممکن نیست', 409);
    if (!isOwner && to !== 'cancelled') bad('اجازه‌ی این کار را ندارید', 403);
    if (!isOwner && NB.apptStart(a) < Date.now()) bad('زمان این نوبت گذشته است', 409);
    a.status = to; save();
    return send(res, 200, viewAppt(a, isCust));
  }

  /* ----- مدیر ----- */
  if (method === 'POST' && p === '/api/admin/login') {
    if (!rate('login:' + ip, 6, 15 * 60 * 1000)) bad('تعداد تلاش‌ها زیاد بود. ۱۵ دقیقه بعد دوباره امتحان کنید.', 429);
    const inp = await readJson(req, 2000);
    if (!pwOk(String(inp.password || ''))) bad('رمز اشتباه است', 401);
    return send(res, 200, { token: makeToken() });
  }
  if (p.startsWith('/api/admin/')) {
    needAdmin();
    if (method === 'GET' && p === '/api/admin/stats') {
      const bs = Object.values(DB.businesses), t = todayKey(), week = Date.now() - 7 * 86400000, as = Object.values(DB.appointments);
      const count = (st) => bs.filter((b) => b.status === st).length;
      return send(res, 200, {
        total: bs.length, pending: count('pending'), approved: count('approved'), rejected: count('rejected'), disabled: count('disabled'),
        edited: bs.filter((b) => b.edited && b.status === 'approved').length,
        reported: bs.filter((b) => openReports(b.id).length).length,
        demo: bs.filter((b) => b.demo).length,
        appointments: as.length, today: as.filter((a) => a.date === t).length, week: as.filter((a) => a.created > week).length,
        requireApproval: DB.settings.requireApproval
      });
    }
    if (method === 'GET' && p === '/api/admin/businesses') {
      const list = Object.values(DB.businesses).sort((a, b) => b.created - a.created).map((b) => {
        const v = viewBiz(b, { admin: true });
        v.reviews = []; v.reports = openReports(b.id).length; v.appts = Object.values(DB.appointments).filter((a) => a.biz === b.id).length;
        return v;
      });
      return send(res, 200, { businesses: list });
    }
    if ((m = /^\/api\/admin\/businesses\/([a-f0-9]{16})$/.exec(p))) {
      const b = DB.businesses[m[1]];
      if (!b) bad('کسب‌وکار پیدا نشد', 404);
      if (method === 'GET') {
        const v = viewBiz(b, { admin: true });
        v.reports = Object.values(DB.reports).filter((r) => r.biz === b.id).sort((x, y) => y.at - x.at).map((r) => ({ id: r.id, reason: r.reason, at: r.at, open: r.open }));
        v.appts = Object.values(DB.appointments).filter((a) => a.biz === b.id).length;
        return send(res, 200, v);
      }
      if (method === 'PATCH') {
        const inp = await readJson(req, 5000);
        if (!['approved', 'pending', 'rejected', 'disabled'].includes(inp.status)) bad('وضعیت نامعتبر است');
        b.status = inp.status; b.statusNote = cleanText(inp.note, 300);
        if (inp.status === 'approved') { b.edited = false; b.statusNote = ''; }
        save();
        return send(res, 200, { ok: true, status: b.status });
      }
      if (method === 'DELETE') { removeBiz(b); save(); return send(res, 200, { ok: true }); }
    }
    if (method === 'DELETE' && (m = /^\/api\/admin\/businesses\/([a-f0-9]{16})\/photos\/(\d)$/.exec(p))) {
      const b = DB.businesses[m[1]], i = +m[2];
      if (!b || i >= b.photos.length) bad('عکس پیدا نشد', 404);
      rmFile(path.join(PHOTO_DIR, path.basename(b.photos[i]))); b.photos.splice(i, 1); save();
      return send(res, 200, { ok: true });
    }
    if (method === 'DELETE' && (m = /^\/api\/admin\/businesses\/([a-f0-9]{16})\/video$/.exec(p))) {
      const b = DB.businesses[m[1]];
      if (!b) bad('کسب‌وکار پیدا نشد', 404);
      if (b.video) { rmFile(path.join(VIDEO_DIR, path.basename(b.video.url))); b.video = null; save(); }
      return send(res, 200, { ok: true });
    }
    if (method === 'DELETE' && (m = /^\/api\/admin\/businesses\/([a-f0-9]{16})\/reviews\/([a-f0-9]{10})$/.exec(p))) {
      const b = DB.businesses[m[1]];
      if (!b) bad('کسب‌وکار پیدا نشد', 404);
      b.reviews = b.reviews.filter((r) => r.id !== m[2]); save();
      return send(res, 200, { ok: true });
    }
    if (method === 'POST' && (m = /^\/api\/admin\/businesses\/([a-f0-9]{16})\/reports\/clear$/.exec(p))) {
      Object.values(DB.reports).forEach((r) => { if (r.biz === m[1]) r.open = false; }); save();
      return send(res, 200, { ok: true });
    }
    if (method === 'POST' && p === '/api/admin/demo/delete') {
      Object.values(DB.businesses).filter((b) => b.demo).forEach(removeBiz); save();
      return send(res, 200, { ok: true });
    }
    if (method === 'PUT' && p === '/api/admin/settings') {
      const inp = await readJson(req, 2000);
      DB.settings.requireApproval = !!inp.requireApproval; save();
      return send(res, 200, { requireApproval: DB.settings.requireApproval });
    }
  }
  return bad('مسیر پیدا نشد', 404);
}

/* ---------- سرور HTTP ---------- */
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User, X-Admin, X-Name');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const ip = ipOf(req);
  let url;
  try { url = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); }
  try {
    if (!rate('all:' + ip, 600, 60 * 1000)) { res.writeHead(429); return res.end('Too many requests'); }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url, ip);
    let m;
    if ((m = /^\/media\/(photos|videos)\/([a-z0-9_]+\.(?:jpg|png|webp|mp4|webm))$/.exec(url.pathname)) && (req.method === 'GET' || req.method === 'HEAD')) {
      return serveFile(req, res, path.join(m[1] === 'photos' ? PHOTO_DIR : VIDEO_DIR, m[2]), 'public, max-age=604800, immutable');
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(WWW, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(WWW + path.sep) || path.basename(file).startsWith('.')) { res.writeHead(403); return res.end(); }
      return serveFile(req, res, file);
    }
    res.writeHead(405); res.end();
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.code, { error: e.message });
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'خطای داخلی سرور' });
  }
});
server.requestTimeout = 120000;

/* ---------- داده‌ی نمونه (فقط برای تست) ---------- */
if (process.env.SEED_DEMO === '1' && !Object.keys(DB.businesses).length) {
  require('./seed-data.js').forEach((d, i) => {
    const b = blankBiz('demo' + i + 'xxxxxx');
    b.cat = d[0]; b.name = d[1]; b.city = d[2]; b.address = d[3]; b.lat = d[4]; b.lng = d[5]; b.baseRating = d[6]; b.baseCount = d[7]; b.desc = d[8]; b.phone = '0210000' + (1000 + i);
    b.services = NB.CATS.find((c) => c.id === d[0]).svc.map((s) => ({ id: rid(5), name: s[0], price: s[1], active: true }));
    if (d[9]) b.weekDiscount[1 + (i % 3)] = d[9];
    if (['gp-doctor', 'dentist', 'psych'].includes(d[0])) { b.hours[0].from = '16:00'; b.hours[0].to = '21:00'; }
    if (d[0] === 'gp-doctor') b.hours[3].open = false;
    b.hours[6].open = d[0] === 'gym' || d[0] === 'car';
    b.hours[4].brk = true;
    b.status = 'approved'; b.demo = true;
    DB.businesses[b.id] = b;
  });
  flush();
  console.log('داده‌ی نمونه اضافه شد (SEED_DEMO)');
}

server.listen(PORT, HOST, () => console.log(`نوبت‌یاب روی پورت ${PORT} اجرا شد — ${DATA_DIR}`));
