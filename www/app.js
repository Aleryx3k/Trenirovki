'use strict';
/* ---------- данные ---------- */
const KEY = 'workout-log-v1';
const DEFAULT_BW = 64;
let _ssc = null, _bc = null;
const QS = new URLSearchParams(location.search);

const GROUPS = ['Грудь', 'Спина', 'Плечи', 'Бицепс', 'Трицепс', 'Ноги', 'Пресс', 'Шея и трапеции'];
const LIB = {
  incdb: { name: 'Жим гантелей на наклонной (30°)', g: 'Грудь', rest: 90 },
  incbb: { name: 'Жим штанги на наклонной', g: 'Грудь', rest: 120 },
  benchbb: { name: 'Жим штанги лёжа', g: 'Грудь', rest: 120 },
  benchdb: { name: 'Жим гантелей лёжа', g: 'Грудь', rest: 90 },
  chestpress: { name: 'Жим в тренажёре (грудь)', g: 'Грудь', rest: 90 },
  chestfly: { name: 'Разводка гантелей лёжа', g: 'Грудь', rest: 60 },
  cablefly: { name: 'Сведение рук в кроссовере', g: 'Грудь', rest: 60 },
  pushup: { name: 'Отжимания от пола', g: 'Грудь', rest: 60, bw: true },
  pullup: { name: 'Подтягивания широким хватом', g: 'Спина', rest: 120, bw: true },
  chinup: { name: 'Подтягивания обратным хватом', g: 'Спина', rest: 120, bw: true },
  latpd: { name: 'Тяга верхнего блока к груди', g: 'Спина', rest: 90 },
  rowcable: { name: 'Тяга горизонтального блока', g: 'Спина', rest: 90 },
  rowdb: { name: 'Тяга гантели одной рукой', g: 'Спина', rest: 90 },
  rowbb: { name: 'Тяга штанги в наклоне', g: 'Спина', rest: 120 },
  tbar: { name: 'Тяга Т-грифа', g: 'Спина', rest: 120 },
  plover: { name: 'Пуловер на блоке', g: 'Спина', rest: 60 },
  hyper: { name: 'Гиперэкстензия', g: 'Спина', rest: 60, bw: true },
  ohpdb: { name: 'Жим гантелей сидя', g: 'Плечи', rest: 90 },
  ohpbb: { name: 'Жим штанги стоя', g: 'Плечи', rest: 120 },
  arnold: { name: 'Жим Арнольда', g: 'Плечи', rest: 90 },
  latraise: { name: 'Махи гантелями в стороны', g: 'Плечи', rest: 60 },
  cableraise: { name: 'Махи в сторону на блоке', g: 'Плечи', rest: 60 },
  reardelt: { name: 'Махи в наклоне (задняя дельта)', g: 'Плечи', rest: 60 },
  revfly: { name: 'Обратная разводка в тренажёре', g: 'Плечи', rest: 60 },
  facepull: { name: 'Тяга каната к лицу', g: 'Плечи', rest: 60 },
  curlbb: { name: 'Сгибания со штангой', g: 'Бицепс', rest: 75 },
  curldb: { name: 'Сгибания гантелей сидя', g: 'Бицепс', rest: 60 },
  hammer: { name: 'Молотки', g: 'Бицепс', rest: 60 },
  preacher: { name: 'Сгибания на скамье Скотта', g: 'Бицепс', rest: 60 },
  curlcable: { name: 'Сгибания на блоке', g: 'Бицепс', rest: 60 },
  conc: { name: 'Концентрированные сгибания', g: 'Бицепс', rest: 60 },
  skull: { name: 'Французский жим лёжа', g: 'Трицепс', rest: 75 },
  pushdown: { name: 'Разгибания на верхнем блоке', g: 'Трицепс', rest: 60 },
  tridb: { name: 'Разгибания из-за головы с гантелью', g: 'Трицепс', rest: 60 },
  closebp: { name: 'Жим узким хватом', g: 'Трицепс', rest: 90 },
  dips: { name: 'Отжимания на брусьях', g: 'Трицепс', rest: 90, bw: true },
  squat: { name: 'Присед со штангой', g: 'Ноги', rest: 150 },
  legpress: { name: 'Жим ногами', g: 'Ноги', rest: 120 },
  rdl: { name: 'Румынская тяга', g: 'Ноги', rest: 120 },
  lunge: { name: 'Выпады с гантелями', g: 'Ноги', rest: 90 },
  legext: { name: 'Разгибания ног в тренажёре', g: 'Ноги', rest: 60 },
  legcurl: { name: 'Сгибания ног лёжа', g: 'Ноги', rest: 60 },
  calf: { name: 'Подъём на носки стоя', g: 'Ноги', rest: 45 },
  glute: { name: 'Ягодичный мост', g: 'Ноги', rest: 90 },
  crunch: { name: 'Скручивания', g: 'Пресс', rest: 45, bw: true },
  legraise: { name: 'Подъём ног в висе', g: 'Пресс', rest: 60, bw: true },
  cablecrunch: { name: 'Скручивания на блоке', g: 'Пресс', rest: 60 },
  abwheel: { name: 'Ролик для пресса', g: 'Пресс', rest: 60, bw: true },
  shrug: { name: 'Шраги с гантелями', g: 'Шея и трапеции', rest: 60 },
  shrugbb: { name: 'Шраги со штангой', g: 'Шея и трапеции', rest: 60 },
  neck: { name: 'Сгибания шеи', g: 'Шея и трапеции', rest: 45 },
  neckext: { name: 'Разгибания шеи', g: 'Шея и трапеции', rest: 45 },
};
function libCopy() { const o = {}; for (const k in LIB) o[k] = Object.assign({}, LIB[k]); return o; }
const okId = id => typeof id === 'string' && /^[A-Za-z0-9_:.-]{1,60}$/.test(id) && !(id in Object.prototype);
const okIso = s => typeof s === 'string' && !isNaN(Date.parse(s));
const okDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= '2000-01-01' && s <= '2100-12-31' && fmtDate(parseDate(s)) === s;
const cn = (v, lo, hi, def) => { const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN; return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const cs = (v, n) => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '').slice(0, n);
const safeId = (v, n) => cs(v, n).replace(/[^\w:.-]/g, '_');
function cleanSet(s) {
  if (!s || typeof s !== 'object') return null;
  const o = { w: cn(s.w, 0, 2000, 0), r: Math.round(cn(s.r, 0, 999, 0)) };
  if (s.a != null) o.a = cn(s.a, 0, 2000, 0);
  if (s.m === 'a' || s.m === 'w') o.m = s.m;
  return o;
}
// приводит любые данные (из хранилища или файла) к безопасному виду: типы, диапазоны, идентификаторы
function cleanData(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
  if (!Array.isArray(d.plan)) d = Object.assign({}, d, { plan: seed().plan });
  const n = { v: 1 }, st = d.settings && typeof d.settings === 'object' ? d.settings : {};
  n.settings = { rest: Math.round(cn(st.rest, 15, 600, 90)), backup: okIso(st.backup) ? st.backup : null };
  if (['90', '180', '365', 'all'].indexOf(st.per) >= 0) n.settings.per = st.per;
  if (st.awake === false) n.settings.awake = false;
  if (st.theme === 'steel' || st.theme === 'chalk') n.settings.theme = st.theme;
  if (st.ssRest && typeof st.ssRest === 'object') {
    n.settings.ssRest = {};
    Object.keys(st.ssRest).forEach(k => { if (/^[\w+.:-]{1,200}$/.test(k) && !(k in Object.prototype)) n.settings.ssRest[k] = Math.round(cn(st.ssRest[k], 15, 600, 90)); });
  }
  n.ex = {};
  const sx = d.ex && typeof d.ex === 'object' && !Array.isArray(d.ex) ? d.ex : {};
  Object.keys(sx).forEach(k => {
    const e = sx[k];
    if (!okId(k) || !e || typeof e !== 'object') return;
    const o = { name: cs(e.name, 80).trim(), g: GROUPS.indexOf(e.g) >= 0 ? e.g : 'Другое', rest: Math.round(cn(e.rest, 15, 600, n.settings.rest)) };
    if (!o.name) return;
    if (e.bw === true) o.bw = true;
    if (e.hidden === true) o.hidden = true;
    if ([0.5, 1, 1.25, 2.5, 5].indexOf(e.step) >= 0) o.step = e.step;
    n.ex[k] = o;
  });
  n.plan = [];
  const ids = {};
  (Array.isArray(d.plan) ? d.plan : []).forEach((p, pi) => {
    if (!p || typeof p !== 'object') return;
    const items = [];
    (Array.isArray(p.items) ? p.items : []).forEach(it => {
      if (!it || typeof it !== 'object') return;
      const exs = (Array.isArray(it.ex) ? it.ex : []).filter(okId).slice(0, 4);
      if (!exs.length) return;
      const o = { ex: exs, sets: Math.round(cn(it.sets, 1, 20, 3)), reps: cs(it.reps, 20), w: cn(it.w, 0, 2000, 0), r: Math.round(cn(it.r, 0, 1000, 10)) };
      if (it.w2 != null) o.w2 = cn(it.w2, 0, 2000, 0);
      if (it.r2 != null) o.r2 = Math.round(cn(it.r2, 0, 1000, 10));
      if (Array.isArray(it.preset)) o.preset = it.preset.slice(0, 20).map(cleanSet).filter(Boolean);
      items.push(o);
    });
    let id = safeId(p.id, 20) || ('p' + pi);
    if (ids[id]) id += '_' + pi;
    ids[id] = 1;
    n.plan.push({ id, name: cs(p.name, 40) || ('День ' + (pi + 1)), wd: Math.round(cn(p.wd, 0, 6, 1)), items });
  });
  n.sessions = [];
  const seen = {};
  (Array.isArray(d.sessions) ? d.sessions : []).forEach(s => {
    if (!s || typeof s !== 'object') return;
    const day = okDate(s.d) ? s.d : (okIso(s.start) && okDate(fmtDate(new Date(s.start))) ? fmtDate(new Date(s.start)) : null);
    if (!day) return;
    let id = safeId(s.id, 40);
    if (!id || seen[id]) id = uid() + n.sessions.length;
    seen[id] = 1;
    const start = okIso(s.start) ? s.start : day + 'T12:00:00.000Z';
    const o = { id, dayId: safeId(s.dayId, 40) || 'free', d: day, start, end: okIso(s.end) ? s.end : start, entries: [] };
    if (s.name) o.name = cs(s.name, 120);
    const f = Math.round(cn(s.feel, 0, 5, 0));
    if (f >= 1 && f <= 5) o.feel = f;
    if (s.note) o.note = cs(s.note, 5000);
    (Array.isArray(s.entries) ? s.entries : []).forEach(e => {
      if (!e || !okId(e.exId)) return;
      const sets = (Array.isArray(e.sets) ? e.sets : []).slice(0, 100).map(cleanSet).filter(Boolean);
      if (!sets.length) return;
      const oe = { exId: e.exId, sets };
      if (typeof e.ss === 'string' && e.ss) oe.ss = safeId(e.ss, 60);
      o.entries.push(oe);
    });
    n.sessions.push(o);
  });
  n.body = [];
  (Array.isArray(d.body) ? d.body : []).forEach(b => {
    if (!b || !okDate(b.d)) return;
    const kg = typeof b.kg === 'number' ? b.kg : typeof b.kg === 'string' ? parseFloat(b.kg.replace(',', '.')) : NaN;
    if (isFinite(kg) && kg >= 30 && kg <= 250) n.body.push({ d: b.d, kg });
  });
  if (!n.body.length) n.body = [{ d: today(), kg: DEFAULT_BW }];
  n.active = null;
  const a = d.active;
  if (a && typeof a === 'object' && Array.isArray(a.entries) && okDate(a.d) && okIso(a.start)) {
    const entries = [];
    a.entries.forEach(e => {
      if (!e || !okId(e.exId)) return;
      const sets = (Array.isArray(e.sets) ? e.sets : []).slice(0, 100).map(s => {
        const o = cleanSet(s);
        if (!o) return null;
        o.done = !!s.done; o.t = isFinite(s.t) ? s.t : null;
        return o;
      }).filter(Boolean);
      if (!sets.length) return;
      const oe = { exId: e.exId, sets };
      if (e.reps) oe.reps = cs(e.reps, 30);
      if (typeof e.ss === 'string' && e.ss) oe.ss = safeId(e.ss, 60);
      entries.push(oe);
    });
    n.active = { id: safeId(a.id, 40) || uid(), dayId: safeId(a.dayId, 40) || 'free', name: cs(a.name, 120) || 'Тренировка', d: a.d, start: a.start, entries };
    const f = Math.round(cn(a.feel, 0, 5, 0));
    if (f >= 1 && f <= 5) n.active.feel = f;
    if (a.note) n.active.note = cs(a.note, 5000);
    if (a.rest && typeof a.rest.end === 'number' && isFinite(a.rest.end) && a.rest.end < Date.now() + 7200000) n.active.rest = { end: a.rest.end, total: cn(a.rest.total, 5, 3600, 90) };
  }
  return n;
}
function migrate(d) {
  d = cleanData(d);
  const def = d.settings.rest || 90;
  for (const k in LIB) {
    if (!d.ex[k]) d.ex[k] = Object.assign({}, LIB[k]);
    if (LIB[k].bw) d.ex[k].bw = true;
  }
  const known = id => { if (!d.ex[id]) d.ex[id] = { name: 'Упражнение (удалено)', g: 'Другое', rest: def, hidden: true }; };
  d.sessions.forEach(s => s.entries.forEach(e => known(e.exId)));
  d.plan.forEach(p => p.items.forEach(it => it.ex.forEach(known)));
  if (d.active) d.active.entries.forEach(e => known(e.exId));
  return d;
}

function seed() {
  const ex = libCopy();
  const pu = (n, last) => {
    const p = [];
    for (let i = 0; i < n; i++) p.push({ a: 0, r: 8 });
    if (last) p.push({ a: 22.5, r: 8 });
    return p;
  };
  const plan = [
    { id: 'A', name: 'Вторник', wd: 2, items: [
      { ex: ['incdb'], sets: 4, reps: '8–12', w: 10, r: 12 },
      { ex: ['pullup'], sets: 4, reps: '3×8 + гравитрон', preset: pu(3, true) },
      { ex: ['legpress'], sets: 3, reps: '12–15', w: 50, r: 12 },
      { ex: ['latraise'], sets: 3, reps: '15', w: 8, r: 15 },
      { ex: ['facepull', 'shrug'], sets: 3, reps: '12–15', w: 10, r: 15, w2: 12, r2: 12 },
    ] },
    { id: 'B', name: 'Четверг', wd: 4, items: [
      { ex: ['incbb'], sets: 3, reps: '6–8', w: 25, r: 8 },
      { ex: ['latpd'], sets: 3, reps: '10–12', w: 40, r: 10 },
      { ex: ['legpress'], sets: 3, reps: '10–12', w: 55, r: 10 },
      { ex: ['latraise'], sets: 4, reps: '12–15', w: 8, r: 12 },
      { ex: ['shrug', 'neck'], sets: 3, reps: '12–15', w: 14, r: 12, w2: 0, r2: 12 },
    ] },
    { id: 'C', name: 'Суббота', wd: 6, items: [
      { ex: ['incdb'], sets: 3, reps: '10–12', w: 10, r: 12 },
      { ex: ['pullup'], sets: 3, reps: 'до отказа', preset: pu(3, false) },
      { ex: ['legpress'], sets: 3, reps: '12–15', w: 50, r: 12 },
      { ex: ['latraise'], sets: 3, reps: '15–20', w: 8, r: 15 },
      { ex: ['facepull', 'shrug'], sets: 3, reps: '12–15', w: 10, r: 15, w2: 12, r2: 12 },
    ] },
  ];
  return { v: 1, ex, plan, sessions: [], body: [{ d: today(), kg: DEFAULT_BW }], settings: { rest: 90, backup: null }, active: null };
}

let S;
let loadWarn = false;
function load() {
  let t = null;
  try {
    t = localStorage.getItem(KEY);
    if (t) {
      const p = JSON.parse(t);
      if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('shape');
      const m = migrate(p);
      if (Array.isArray(p.sessions) && p.sessions.length && !m.sessions.length) throw new Error('empty');
      return m;
    }
  } catch (e) {
    if (t) {
      try { localStorage.setItem(KEY + '-corrupt', t); } catch (e2) {}
      loadWarn = true;
      try { const au = localStorage.getItem(KEY + '-auto'); if (au) return migrate(JSON.parse(au)); } catch (e3) {}
    }
  }
  return seed();
}
function snapshot() {
  try { localStorage.setItem(KEY + '-auto', JSON.stringify(S)); localStorage.setItem(KEY + '-auto-at', new Date().toISOString()); } catch (e) {}
}
function save() {
  _ssc = null; _bc = null;
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { toast('Не удалось сохранить данные'); return false; }
}

/* ---------- утилиты ---------- */
function today() { const d = new Date(); return fmtDate(d); }
function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
function human(s) { const d = parseDate(s); return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()]; }
function short(s) { const d = parseDate(s); return d.getDate() + ' ' + MON[d.getMonth()]; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function num(v) { const s = String(v == null ? '' : v).trim().replace(',', '.'); return /^-?\d+\.?\d*$|^-?\.\d+$/.test(s) ? parseFloat(s) : 0; }
const normQ = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const lab = d => short(d) + (d.slice(0, 4) !== today().slice(0, 4) ? ' ’' + d.slice(2, 4) : '');
function nf(n) { return (Math.round(n * 100) / 100).toString().replace('.', ','); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function plural(n, f) { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; }
const FEEL = ['😫', '😕', '😐', '🙂', '💪'];
function feelRow(act, cur, id) {
  return `<div class="feel">${FEEL.map((f, i) => `<button class="${cur === i + 1 ? 'on' : ''}" data-act="${act}" data-v="${i + 1}" data-id="${id || ''}">${f}</button>`).join('')}</div>`;
}
function bwMode(s) { return s.m || (s.a > 0 ? 'a' : 'w'); }
function mmss(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec % 60).padStart(2, '0'); }

function bodyAt(date) {
  if (!_bc || _bc.src !== S.body || _bc.n !== S.body.length) _bc = { src: S.body, n: S.body.length, list: S.body.slice().sort((a, b) => a.d.localeCompare(b.d)) };
  const arr = _bc.list;
  let r = null;
  for (const b of arr) if (b.d <= date) r = b.kg;
  return r != null ? r : (arr.length ? arr[0].kg : DEFAULT_BW);
}
function effW(exId, set, date) {
  const ex = S.ex[exId];
  if (ex && ex.bw) return Math.max(0, bodyAt(date) - (set.a || 0) + (set.w || 0));
  return set.w || 0;
}
function e1rm(w, r) { return r <= 1 ? w : w * (1 + r / 30); }
function sessionVolume(s) {
  let v = 0;
  for (const e of s.entries) for (const st of e.sets) v += effW(e.exId, st, s.d) * st.r;
  return v;
}
function fixSS(s) { const n = {}; s.entries.forEach(e => { if (e.ss) n[e.ss] = (n[e.ss] || 0) + 1; }); s.entries.forEach(e => { if (e.ss && n[e.ss] < 2) delete e.ss; }); }
function sortedSessions() {
  if (!_ssc || _ssc.src !== S.sessions || _ssc.n !== S.sessions.length) _ssc = { src: S.sessions, n: S.sessions.length, list: S.sessions.slice().sort((a, b) => (a.d + a.start).localeCompare(b.d + b.start)) };
  return _ssc.list.slice();
}
function lastEntryFor(exId, beforeKey) {
  const arr = sortedSessions();
  for (let i = arr.length - 1; i >= 0; i--) {
    const s = arr[i];
    if (beforeKey && (s.d + s.start) >= beforeKey) continue;
    const e = s.entries.find(x => x.exId === exId);
    if (e && e.sets.length) return e;
  }
  return null;
}
function setLabel(exId, st) {
  const ex = S.ex[exId];
  if (ex && ex.bw) return (st.a ? 'помощь −' + nf(st.a) : 'свой вес') + (st.w ? ' +' + nf(st.w) : '') + ' × ' + st.r;
  return nf(st.w) + ' × ' + st.r;
}

/* ---------- шаблоны тренировок ---------- */
const TPL_GROUPS = [
  { title: 'Full Body · 3 дня в неделю', note: 'Чередуй A, B, C через день. Всё тело за тренировку, 7 упражнений, около 50 минут.', items: [
    { id: 'fb-a', name: 'Full Body A', desc: 'Присед, жим лёжа, тяга сверху, жим плеч', ex: [['squat', 3, '6–8'], ['benchbb', 3, '6–8'], ['latpd', 3, '8–12'], ['ohpdb', 3, '8–12'], ['curldb', 2, '10–12'], ['pushdown', 2, '10–12'], ['crunch', 3, '12–15']] },
    { id: 'fb-b', name: 'Full Body B', desc: 'Жим ногами, наклонный жим, тяга, румынская тяга', ex: [['legpress', 3, '10–12'], ['incdb', 3, '8–12'], ['rowcable', 3, '8–12'], ['rdl', 3, '8–10'], ['latraise', 3, '12–15'], ['hammer', 2, '10–12'], ['legraise', 3, '10–15']] },
    { id: 'fb-c', name: 'Full Body C', desc: 'Выпады, подтягивания, наклонный жим штанги', ex: [['lunge', 3, '10–12'], ['pullup', 3, '6–10'], ['incbb', 3, '6–10'], ['rowdb', 3, '10–12'], ['facepull', 3, '12–15'], ['tridb', 2, '10–12'], ['calf', 3, '12–15']] },
  ] },
  { title: 'Верх / Низ · 4 дня в неделю', note: 'Верх, низ, отдых, верх, низ. Каждая мышца дважды в неделю.', items: [
    { id: 'ul-ua', name: 'Верх A (сила)', desc: 'Жим лёжа, тяга, жим стоя, подтягивания', ex: [['benchbb', 4, '5–8'], ['rowcable', 4, '6–8'], ['ohpbb', 3, '6–8'], ['pullup', 3, '6–10'], ['curlbb', 2, '8–10'], ['skull', 2, '8–10']] },
    { id: 'ul-la', name: 'Низ A (сила)', desc: 'Присед, румынская тяга, жим ногами', ex: [['squat', 4, '5–8'], ['rdl', 3, '8–10'], ['legpress', 3, '10–12'], ['legcurl', 3, '10–12'], ['calf', 4, '10–15'], ['cablecrunch', 3, '10–15']] },
    { id: 'ul-ub', name: 'Верх B (объём)', desc: 'Наклонный жим, тяга сверху, плечи, руки', ex: [['incdb', 4, '8–12'], ['latpd', 4, '8–12'], ['ohpdb', 3, '8–12'], ['rowdb', 3, '10–12'], ['latraise', 3, '12–15'], ['facepull', 2, '12–15'], ['hammer', 2, '10–12'], ['pushdown', 2, '10–12']] },
    { id: 'ul-lb', name: 'Низ B (объём)', desc: 'Жим ногами, выпады, ягодичный мост', ex: [['legpress', 4, '10–12'], ['lunge', 3, '10–12'], ['glute', 3, '8–12'], ['legext', 3, '12–15'], ['legcurl', 3, '10–12'], ['calf', 4, '12–15'], ['legraise', 3, '10–15']] },
  ] },
  { title: 'Push / Pull / Legs · 3–6 дней', note: 'Жимы, тяги, ноги. 3 дня по кругу или 6 дней, если есть время.', items: [
    { id: 'ppl-push', name: 'Push (жимы)', desc: 'Грудь, плечи, трицепс', ex: [['benchbb', 4, '6–8'], ['incdb', 3, '8–12'], ['ohpdb', 3, '8–12'], ['latraise', 4, '12–15'], ['cablefly', 3, '12–15'], ['pushdown', 3, '10–12'], ['skull', 2, '8–12']] },
    { id: 'ppl-pull', name: 'Pull (тяги)', desc: 'Спина, задняя дельта, бицепс', ex: [['pullup', 4, '6–10'], ['rowcable', 3, '8–12'], ['rowdb', 3, '8–12'], ['facepull', 3, '12–15'], ['shrug', 3, '10–15'], ['curlbb', 3, '8–10'], ['hammer', 2, '10–12']] },
    { id: 'ppl-legs', name: 'Legs (ноги)', desc: 'Квадрицепс, бицепс бедра, икры, пресс', ex: [['squat', 4, '6–8'], ['rdl', 3, '8–10'], ['legpress', 3, '10–12'], ['legcurl', 3, '10–12'], ['legext', 3, '12–15'], ['calf', 4, '10–15'], ['crunch', 3, '12–15']] },
  ] },
  { title: 'Starting Strength · 5×5 (Сила)', note: 'Классическая линейная силовая программа. 3 дня в неделю, акцент на базовые движения 5 по 5.', items: [
    { id: 'ss-a', name: '5×5 День A', desc: 'Присед, жим лёжа, тяга в наклоне, пресс', ex: [['squat', 5, '5'], ['benchbb', 5, '5'], ['rowbb', 5, '5'], ['cablecrunch', 3, '10–12']] },
    { id: 'ss-b', name: '5×5 День B', desc: 'Присед, армейский жим, подтягивания, брусья', ex: [['squat', 5, '5'], ['ohpbb', 5, '5'], ['pullup', 4, '5–8'], ['dips', 3, '8–10']] },
  ] },
  { title: 'Золотая эра · Сплит Арнольда', note: 'Классический 3-дневный сплит Арнольда Шварценеггера с суперсетами мышц-антагонистов.', items: [
    { id: 'arnold-cb', name: 'Грудь и спина (Арнольд)', desc: 'Антагонистические суперсеты: жимы + подтягивания и тяги', ex: [['benchbb', 4, '8–10'], ['pullup', 4, '8–10'], ['incdb', 3, '10–12'], ['rowcable', 3, '10–12'], ['cablefly', 3, '12–15'], ['plover', 3, '12–15']] },
    { id: 'arnold-sa', name: 'Плечи и руки (Арнольд)', desc: 'Жимы, махи и суперсеты на бицепс + трицепс', ex: [['ohpdb', 4, '8–12'], ['latraise', 4, '12–15'], ['curlbb', 3, '8–10'], ['skull', 3, '8–10'], ['hammer', 3, '10–12'], ['pushdown', 3, '10–12']] },
    { id: 'arnold-l', name: 'Ноги и пресс (Арнольд)', desc: 'Приседания, румынская тяга, жим ногами, икры, пресс', ex: [['squat', 4, '8–10'], ['rdl', 4, '8–10'], ['legpress', 3, '10–12'], ['legcurl', 3, '10–12'], ['calf', 4, '15'], ['legraise', 3, '15']] },
  ] },
  { title: 'Калистеника · Турники и брусья', note: 'Офлайн-программа со своим весом: тренировки дома или на спортплощадке без отягощений.', items: [
    { id: 'cal-upper', name: 'Воркаут: Верх тела', desc: 'Подтягивания, брусья, подтягивания обратным хватом, отжимания, пресс', ex: [['pullup', 4, '6–10'], ['dips', 4, '8–12'], ['chinup', 3, '6–10'], ['pushup', 4, '15–20'], ['legraise', 4, '10–15']] },
    { id: 'cal-lower', name: 'Воркаут: Низ и кор', desc: 'Выпады, гиперэкстензия, икры, пресс и ролик', ex: [['lunge', 4, '12–15'], ['hyper', 4, '12–15'], ['calf', 4, '15–20'], ['abwheel', 4, '8–12'], ['crunch', 4, '15–20']] },
  ] },
  { title: 'Бро-сплит · 5 дней (по группам)', note: 'Классика бодибилдинга: отдельная группа мышц в каждый тренировочный день.', items: [
    { id: 'bro-chest', name: 'Грудь (День 1)', desc: 'Жим лёжа, наклонный жим гантелей, тренажёр, бабочка, брусья', ex: [['benchbb', 4, '8–10'], ['incdb', 4, '8–12'], ['chestpress', 3, '10–12'], ['cablefly', 3, '12–15'], ['dips', 3, '8–10']] },
    { id: 'bro-back', name: 'Спина (День 2)', desc: 'Подтягивания, тяга штанги, верхний блок, тяга к поясу, гиперэкстензия', ex: [['pullup', 4, '6–10'], ['rowbb', 4, '8–10'], ['latpd', 4, '8–12'], ['rowcable', 3, '10–12'], ['hyper', 3, '12–15']] },
    { id: 'bro-shoulders', name: 'Плечи (День 3)', desc: 'Армейский жим, жим Арнольда, махи в стороны, задняя дельта, шраги', ex: [['ohpbb', 4, '8–10'], ['arnold', 3, '10–12'], ['latraise', 4, '12–15'], ['reardelt', 4, '12–15'], ['shrug', 4, '12–15']] },
    { id: 'bro-arms', name: 'Руки (День 4)', desc: 'Суперсеты бицепс + трицепс: штанга, узкий жим, молотки, французский жим', ex: [['curlbb', 4, '8–10'], ['closebp', 4, '8–10'], ['hammer', 3, '10–12'], ['skull', 3, '8–10'], ['curlcable', 3, '12–15'], ['pushdown', 3, '10–12']] },
    { id: 'bro-legs', name: 'Ноги и пресс (День 5)', desc: 'Присед, жим ногами, румынская тяга, сгибания ног, икры, пресс', ex: [['squat', 4, '8–10'], ['legpress', 4, '10–12'], ['rdl', 4, '8–10'], ['legcurl', 3, '10–12'], ['calf', 4, '15'], ['cablecrunch', 4, '12–15']] },
  ] },
];
// пары суперсетов: индексы упражнений внутри шаблона (идут подряд, отдых после пары)
const TPL_SS = {
  'fb-a': [[4, 5]], 'fb-b': [[1, 2]], 'fb-c': [[1, 2], [5, 6]],
  'ul-ua': [[4, 5]], 'ul-la': [[4, 5]], 'ul-ub': [[0, 1], [2, 3], [4, 5], [6, 7]], 'ul-lb': [[3, 4], [5, 6]],
  'ppl-push': [[3, 4], [5, 6]], 'ppl-pull': [[3, 4], [5, 6]], 'ppl-legs': [[3, 4], [5, 6]],
  'arnold-cb': [[0, 1], [2, 3], [4, 5]], 'arnold-sa': [[2, 3], [4, 5]],
  'bro-arms': [[0, 1], [2, 3], [4, 5]],
};
TPL_GROUPS.forEach(g => g.items.forEach(t => (TPL_SS[t.id] || []).forEach(p => { t.ex[p[0]][3] = t.ex[p[1]][3] = 's' + p[0]; })));
function planDefault(exId) {
  for (const d of S.plan) for (const it of d.items) {
    const k = it.ex.indexOf(exId);
    if (k >= 0) return (k === 0 ? it.w : it.w2) || 0;
  }
  return 0;
}
const START_W = {
  benchbb: 35, benchdb: 12, chestpress: 30, chestfly: 6, cablefly: 10,
  rowcable: 35, rowdb: 14, rowbb: 30, tbar: 25, plover: 15,
  ohpdb: 10, ohpbb: 25, arnold: 8, cableraise: 5, reardelt: 5, revfly: 20,
  curlbb: 20, curldb: 8, hammer: 8, preacher: 15, curlcable: 15, conc: 8,
  skull: 15, pushdown: 20, tridb: 10, closebp: 30,
  squat: 40, rdl: 40, lunge: 8, legext: 25, legcurl: 20, calf: 30, glute: 40,
  cablecrunch: 20, shrugbb: 30,
  latpd: 40, legpress: 50, incdb: 10, latraise: 8, incbb: 25, facepull: 10, shrug: 14,
};
function startW(exId) { return planDefault(exId) || START_W[exId] || 0; }
function tplAll() {
  const plan = { title: 'Моя программа', note: 'Твои дни тренировок. Меняются в «Ещё».', items: S.plan.map(d => ({
    id: 'plan:' + d.id, name: d.name + ' (' + d.id + ')', desc: d.items.map(it => it.ex.map(x => S.ex[x].name).join(' + ')).join(', '),
    ex: [].concat(...d.items.map((it, ii) => it.ex.map(x => [x, it.sets, it.reps, it.ex.length > 1 ? ii : -1]))) })) };
  return (S.plan.length ? [plan] : []).concat(TPL_GROUPS);
}
function findTpl(id) { for (const g of tplAll()) for (const t of g.items) if (t.id === id) return t; return null; }
function tplRows(ex) {
  const row = x => `<div class="pitem"><div class="grow"><b>${esc(S.ex[x[0]].name)}</b><div class="muted small">${esc(S.ex[x[0]].g)}</div></div><span class="muted">${x[1]} × ${esc(String(x[2]))}</span></div>`;
  let h = '', i = 0;
  while (i < ex.length) {
    const g = ex[i][3];
    if (g != null && g !== -1) {
      let k = i; while (k < ex.length && ex[k][3] === g) k++;
      h += `<div class="ssblock"><div class="sslabel">Суперсет: подряд, отдых после пары</div>${ex.slice(i, k).map(row).join('')}</div>`;
      i = k;
    } else { h += row(ex[i]); i++; }
  }
  return h;
}
function drawTpl() {
  let el = document.getElementById('sheet');
  if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); sheetOpened(); }
  const sel = ui.tpl.sel && findTpl(ui.tpl.sel);
  if (sel) {
    el.innerHTML = `<div class="sheet-bg" data-act="tpl-close"></div><div class="sheet-body"><div class="row sb"><h2 style="margin:0">${esc(sel.name)}</h2><button class="sm" data-act="tpl-back">Назад</button></div>
      <div class="muted small">${sel.ex.length} упражнений · около ${Math.round(sel.ex.reduce((a, x) => a + x[1], 0) * 2.5)} мин</div>
      <div class="plist">${tplRows(sel.ex)}</div>
      <button class="primary block big" data-act="tpl-start" data-id="${sel.id}">Начать тренировку</button></div>`;
    return;
  }
  el.innerHTML = `<div class="sheet-bg" data-act="tpl-close"></div><div class="sheet-body"><div class="row sb"><h2 style="margin:0">Выбери тренировку</h2><button class="sm" data-act="tpl-close">Закрыть</button></div>
    <div class="plist">${tplAll().map(g => `<div class="tg-title">${esc(g.title)}</div><div class="muted small" style="margin-bottom:4px">${esc(g.note)}</div>` +
      g.items.map(t => `<div class="pitem" data-act="tpl-open" data-id="${t.id}"><div class="grow"><b>${esc(t.name)}</b><div class="muted small">${esc(t.desc.length > 70 ? t.desc.slice(0, 70) + '…' : t.desc)}</div></div><span class="muted">${t.ex.length} упр. ›</span></div>`).join('')).join('')}</div>
    <button class="block" data-act="tpl-empty">Пустая тренировка (выбирать по ходу)</button></div>`;
}
function openTpl() { ui.tpl = { sel: null }; drawTpl(); }
function startTemplate(id) {
  closePicker();
  if (id.indexOf('plan:') === 0) { startSession(id.slice(5)); return; }
  const t = findTpl(id);
  const entries = t.ex.map(x => {
    const exId = x[0], prev = lastEntryFor(exId), ex = S.ex[exId], r0 = parseInt(x[2], 10) || 10, sets = [];
    for (let i = 0; i < x[1]; i++) {
      const src = prev ? prev.sets[Math.min(i, prev.sets.length - 1)] : null;
      const st = ex.bw ? { a: src ? (src.a || 0) : 0, w: src ? (src.w || 0) : 0, r: src ? src.r : r0, m: src && src.a > 0 ? 'a' : 'w' } : { w: src ? src.w : startW(exId), r: src ? src.r : r0 };
      st.done = false; sets.push(st);
    }
    const o = { exId, reps: String(x[2]), sets };
    if (x[3] != null && x[3] !== -1) o.ss = id + ':' + x[3];
    return o;
  });
  S.active = { id: uid(), dayId: 'tpl:' + id, name: t.name, d: today(), start: new Date().toISOString(), entries };
  ui.open = 0; save(); ui.tab = 'train'; render();
}

/* ---------- тренировка ---------- */
function startSession(dayId) {
  const entries = [];
  const day = dayId ? S.plan.find(d => d.id === dayId) : null;
  if (day) day.items.forEach((it, ii) => {
    it.ex.forEach((exId, k) => {
      const prev = lastEntryFor(exId);
      const ex = S.ex[exId];
      const sets = [];
      for (let i = 0; i < it.sets; i++) {
        const base = (k === 0 ? { w: it.w, r: it.r } : { w: it.w2, r: it.r2 });
        let src = null;
        if (prev) src = prev.sets[Math.min(i, prev.sets.length - 1)];
        else if (it.preset && it.preset[i]) src = it.preset[i];
        let st;
        if (ex.bw) st = { a: src ? (src.a || 0) : 0, w: src ? (src.w || 0) : 0, r: src ? src.r : 8 };
        else st = { w: src ? src.w : (base.w || 0), r: src ? src.r : (base.r || 10) };
        if (ex.bw) st.m = st.a > 0 ? 'a' : 'w';
        st.done = false;
        sets.push(st);
      }
      entries.push(it.ex.length > 1 ? { exId, reps: it.reps, sets, ss: day.id + ':' + ii } : { exId, reps: it.reps, sets });
    });
  });
  S.active = { id: uid(), dayId: day ? day.id : 'free', name: day ? day.name : 'Своя тренировка', d: today(), start: new Date().toISOString(), entries };
  ui.open = 0;
  save();
  ui.tab = 'train'; render();
  if (!entries.length) openPicker('session');
}

function finishSession() {
  const a = S.active;
  const entries = [];
  for (const e of a.entries) {
    const sets = e.sets.filter(s => s.done && s.r > 0).map(s => {
      const o = { w: s.w || 0, r: s.r };
      if (S.ex[e.exId].bw) o.a = s.a || 0;
      return o;
    });
    if (sets.length) entries.push(e.ss ? { exId: e.exId, sets, ss: e.ss } : { exId: e.exId, sets });
  }
  const ssn = {};
  entries.forEach(e => { if (e.ss) ssn[e.ss] = (ssn[e.ss] || 0) + 1; });
  entries.forEach(e => { if (e.ss && ssn[e.ss] < 2) delete e.ss; });
  if (!entries.length) { toast('Отметь ✓ хотя бы один подход с повторами'); return; }
  const total = a.entries.reduce((n, e) => n + e.sets.length, 0), lost = total - entries.reduce((n, e) => n + e.sets.length, 0);
  if (lost > 0 && !confirm(lost + ' ' + plural(lost, ['подход', 'подхода', 'подходов']) + ' ' + plural(lost, ['не отмечен', 'не отмечены', 'не отмечены']) + ' ✓ (или без повторов) и ' + plural(lost, ['не сохранится', 'не сохранятся', 'не сохранятся']) + '. Завершить тренировку?')) return;
  let startMs = new Date(a.start).getTime(), endMs = Date.now();
  const ts = [].concat(...a.entries.map(e => e.sets.filter(s => s.done && s.t).map(s => s.t)));
  if (ts.length && endMs - startMs > 3 * 3600 * 1000) { startMs = Math.min(...ts) - 90 * 1000; endMs = Math.max(...ts) + 60 * 1000; }
  const sess = { id: a.id, dayId: a.dayId, name: a.name, d: fmtDate(new Date(startMs)), start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString(), entries };
  if (a.feel) sess.feel = a.feel;
  if (a.note && a.note.trim()) sess.note = a.note.trim();
  S.sessions.push(sess);
  S.active = null;
  stopRest();
  save();
  snapshot();
  ui.tab = 'train'; ui.sub = { view: 'summary', id: sess.id };
  render();
}

function summaryData(sess) {
  const key = sess.d + sess.start;
  const vol = sessionVolume(sess);
  const prevSame = sess.dayId === 'free' ? null : (sortedSessions().filter(s => s.dayId === sess.dayId && (s.d + s.start) < key).pop() || null);
  const prevVol = prevSame ? sessionVolume(prevSame) : null;
  let sets = 0, reps = 0;
  const prs = [];
  const rows = sess.entries.map(e => {
    let bestW = 0, bestE = 0, v = 0;
    e.sets.forEach(st => {
      if (!(st.r > 0)) return;
      sets++; reps += st.r;
      const w = effW(e.exId, st, sess.d);
      v += w * st.r; bestW = Math.max(bestW, w); bestE = Math.max(bestE, e1rm(w, st.r));
    });
    let oldW = 0, oldE = 0, had = false;
    for (const s of S.sessions) {
      if ((s.d + s.start) >= key) continue;
      const pe = s.entries.find(x => x.exId === e.exId);
      if (!pe) continue;
      had = true;
      pe.sets.forEach(st => { if (!(st.r > 0)) return; const w = effW(e.exId, st, s.d); oldW = Math.max(oldW, w); oldE = Math.max(oldE, e1rm(w, st.r)); });
    }
    const pr = had && (bestW > oldW + 0.01 || bestE > oldE + 0.01);
    if (pr) prs.push(e.exId);
    const prevE = lastEntryFor(e.exId, key);
    return { e, v, pr, first: !had, prevE };
  });
  const dur = sess.end ? Math.max(0, Math.round((new Date(sess.end) - new Date(sess.start)) / 60000)) : 0;
  return { vol, prevVol, sets, reps, rows, dur, prs, prevSame };
}

/* ---------- таймер отдыха ---------- */
let restTimer = null, restEnd = 0, restTotal = 90, wakeLock = null, noticeAsked = false, noticeCancelled = false, noticeSeq = 0;
const NP = () => (window.Capacitor && window.Capacitor.Plugins) || {};
function hideRest() { document.getElementById('rest').classList.add('hidden'); document.body.classList.remove('resting'); }
// вибрация: родная (плагин Haptics), иначе браузерная
function buzz() {
  try { const H = NP().Haptics; if (H && H.vibrate) { const p = H.vibrate({ duration: 500 }); if (p && p.catch) p.catch(() => { try { navigator.vibrate && navigator.vibrate(500); } catch (e) {} }); return; } } catch (e) {}
  try { navigator.vibrate && navigator.vibrate(500); } catch (e) {}
}
// уведомление о конце отдыха: сработает, даже если приложение свёрнуто или экран выключен
async function scheduleRestNotice() {
  const LN = NP().LocalNotifications;
  if (!LN) return;
  const my = ++noticeSeq;
  try {
    if (!noticeAsked) {
      noticeAsked = true;
      let p = await LN.checkPermissions();
      if (p.display !== 'granted') p = await LN.requestPermissions();
      if (p.display !== 'granted') toast('Разреши уведомления, иначе сигнал в фоне не придёт');
    }
    await LN.createChannel({ id: 'rest2', name: 'Конец отдыха', description: 'Вибрация, когда отдых закончился', importance: 4, vibration: true, sound: 'silent.wav', visibility: 1 });
    if (my !== noticeSeq) return;
    await LN.cancel({ notifications: [{ id: 1001 }] });
    if (my !== noticeSeq) return;
    await LN.schedule({ notifications: [{ id: 1001, title: 'Отдых закончился', body: 'Пора на следующий подход', channelId: 'rest2', smallIcon: 'ic_stat_rest', schedule: { at: new Date(restEnd), allowWhileIdle: true } }] });
    noticeCancelled = false;
  } catch (e) {}
}
function cancelRestNotice() {
  noticeSeq++;
  try { const LN = NP().LocalNotifications; if (LN) LN.cancel({ notifications: [{ id: 1001 }] }).catch(() => {}); } catch (e) {}
}
function saveRest() {
  if (!S.active) return;
  if (restEnd > Date.now()) S.active.rest = { end: restEnd, total: restTotal }; else delete S.active.rest;
  save();
}
function showRest() {
  const rb = document.getElementById('rest');
  rb.classList.remove('hidden');
  document.body.classList.add('resting');
  document.body.style.setProperty('--rest-pad', (rb.offsetHeight + 96) + 'px');
  if (restTimer) clearInterval(restTimer);
  restTimer = setInterval(tickRest, 250);
}
function startRest(sec) {
  restTotal = Math.min(3600, Math.max(5, +sec || S.settings.rest || 90));
  restEnd = Date.now() + restTotal * 1000;
  noticeCancelled = false;
  showRest(); saveRest(); scheduleRestNotice(); tickRest();
}
function extendRest(sec) {
  restEnd = Math.max(restEnd, Date.now()) + sec * 1000;
  restTotal += sec; noticeCancelled = false;
  showRest(); saveRest(); scheduleRestNotice(); tickRest();
}
function resumeRest() {
  const r = S.active && S.active.rest;
  if (!r) return;
  if (r.end <= Date.now()) { delete S.active.rest; save(); return; }
  restEnd = r.end; restTotal = r.total || 90; noticeCancelled = false;
  showRest(); scheduleRestNotice(); tickRest();
}
function tickRest() {
  const left = (restEnd - Date.now()) / 1000, visible = document.visibilityState === 'visible';
  const t = document.getElementById('restText');
  document.getElementById('rest').style.setProperty('--p', Math.max(0, Math.min(100, left / restTotal * 100)));
  if (left <= 1.5 && !noticeCancelled && visible) { noticeCancelled = true; cancelRestNotice(); }
  if (left <= 0) {
    t.textContent = 'Подход!';
    if (visible && left > -3) buzz();
    clearInterval(restTimer); restTimer = null;
    if (S.active && S.active.rest) { delete S.active.rest; save(); }
    setTimeout(() => { if (!restTimer) hideRest(); }, 4000);
  } else t.textContent = 'Отдых ' + mmss(left);
}
function stopRest() {
  if (restTimer) clearInterval(restTimer);
  restTimer = null;
  cancelRestNotice();
  if (S && S.active && S.active.rest) { delete S.active.rest; save(); }
  hideRest();
  keepAwake();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !document.getElementById('rest').classList.contains('hidden')) tickRest();
});

/* ---------- графики ---------- */
function niceTicks(min, max, n) {
  const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
  for (let v = lo; v <= hi + step / 2; v += step) t.push(Math.round(v * 1000) / 1000);
  return t;
}
function lineChart(pts, opts) {
  opts = opts || {};
  const W = 600, H = 220, L = 58, R = 14, T = 12, B = 36;
  if (!pts.length) return '<div class="empty">Нет данных</div>';
  const ys = pts.map(p => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const tk = niceTicks(min, max, 3); min = tk[0]; max = tk[tk.length - 1];
  const x = i => L + (pts.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (pts.length - 1));
  const y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
  let g = '';
  tk.forEach(v => {
    const yy = y(v);
    g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${nf(v)}</text>`;
  });
  const step = Math.max(1, Math.ceil(pts.length / 4));
  pts.forEach((p, i) => {
    const last = pts.length - 1;
    if (i === last || (i % step === 0 && last - i >= Math.ceil(step * 0.7))) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="${pts.length > 1 && i === last ? 'end' : pts.length > 1 && i === 0 ? 'start' : 'middle'}">${esc(p.x)}</text>`;
  });
  const col = opts.color || 'var(--c1)';
  const path = pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(p.y)).join(' ');
  const dr = pts.length > 90 ? 0 : pts.length > 35 ? 2.5 : 4;
  const dots = dr ? pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="${dr}" style="fill:${col}"/>`).join('') : '';
  const area = pts.length > 1 ? `<path d="${path} L${x(pts.length - 1)} ${y(min)} L${x(0)} ${y(min)} Z" style="fill:${col};opacity:.13"/>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}${area}<path d="${path}" fill="none" style="stroke:${col}" stroke-width="2.5" stroke-linejoin="round"/>${dots}</svg>`;
}
function barChart(pts, color) {
  const W = 600, H = 210, L = 62, R = 8, T = 12, B = 36;
  if (!pts.length) return '<div class="empty">Нет данных</div>';
  const tk = niceTicks(0, Math.max(...pts.map(p => p.y)) || 1, 3), max = tk[tk.length - 1];
  const bw = (W - L - R) / pts.length;
  const lstep = Math.max(1, Math.ceil(pts.length / 4));
  let g = '';
  tk.forEach(v => {
    const yy = T + (H - T - B) * (1 - v / max);
    g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${Math.round(v)}</text>`;
  });
  pts.forEach((p, i) => {
    const h = (H - T - B) * p.y / max;
    g += `<rect x="${L + i * bw + 4}" y="${H - B - h}" width="${bw - 8}" height="${h}" rx="5" style="fill:${color || 'var(--c2)'}"/>`;
    if (i === pts.length - 1 || (i % lstep === 0 && pts.length - 1 - i >= Math.ceil(lstep * 0.7))) g += `<text x="${i === pts.length - 1 && pts.length > 1 ? W - R : L + i * bw + bw / 2}" y="${H - 8}" text-anchor="${i === pts.length - 1 && pts.length > 1 ? 'end' : 'middle'}">${esc(p.x)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function weekStart(d) {
  const x = parseDate(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return fmtDate(x);
}

/* ---------- экраны ---------- */
const ui = { tab: 'train', sub: null, pex: null, open: null, pick: null, tpl: null, ed: null, exq: '', exg: 'Все' };
const $app = () => document.getElementById('app');

let wakeLockReq = false;
function keepAwake() {
  try {
    const want = !!S.active && S.settings.awake !== false;
    if (want && !wakeLock && !wakeLockReq && navigator.wakeLock) {
      wakeLockReq = true;
      navigator.wakeLock.request('screen').then(l => {
        wakeLockReq = false;
        const stillWant = !!S.active && S.settings.awake !== false;
        if (!stillWant) {
          try { l.release(); } catch (e) {}
          return;
        }
        wakeLock = l;
        l.addEventListener('release', () => { wakeLock = null; });
      }).catch(() => { wakeLockReq = false; });
    } else if (!want && wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
document.addEventListener('focusin', ev => {
  const t = ev.target;
  if (t && t.matches && t.matches('input[inputmode]')) setTimeout(() => { try { t.select(); } catch (e) {} }, 0);
});
let elapsedTimer = null;
function tickElapsed() {
  const el = document.getElementById('elapsed');
  if (el && S.active) el.textContent = mmss((Date.now() - new Date(S.active.start)) / 1000);
}
function syncElapsed() {
  if (S.active) {
    tickElapsed();
    if (!elapsedTimer) elapsedTimer = setInterval(tickElapsed, 1000);
  } else if (elapsedTimer) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}
function render() {
  keepAwake();
  syncElapsed();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  const f = { train: vTrain, history: vHistory, progress: vProgress, more: vMore }[ui.tab];
  $app().innerHTML = f();
  window.scrollTo(0, 0);
}

function stepper(k, e, s, val, step) {
  return `<div class="stepper"><button data-act="step" data-k="${k}" data-e="${e}" data-s="${s}" data-d="${-step}">−</button>` +
    `<input type="text" inputmode="decimal" value="${val}" data-k="${k}" data-e="${e}" data-s="${s}">` +
    `<button data-act="step" data-k="${k}" data-e="${e}" data-s="${s}" data-d="${step}">+</button></div>`;
}

function weekInfo() {
  const ws = weekStart(today()), done = {}, names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  S.sessions.forEach(s => { if (s.d >= ws) done[s.d] = true; });
  const planWd = new Set(S.plan.map(p => p.wd)), days = [];
  for (let i = 0; i < 7; i++) {
    const d = parseDate(ws); d.setDate(d.getDate() + i);
    const ds = fmtDate(d);
    days.push({ n: names[i], done: !!done[ds], today: ds === today(), plan: planWd.has(d.getDay()) });
  }
  return { days, count: Object.keys(done).length, target: S.plan.length || 3 };
}

function vTrain() {
  if (ui.sub && ui.sub.view === 'summary') return vSummary(ui.sub.id);
  if (S.active) return vActive();
  const wi = weekInfo(), tp = S.plan.find(d => d.wd === new Date().getDay());
  const C = 138.2, dash = C * Math.min(1, wi.count / wi.target);
  const ring = `<div class="ring"><svg viewBox="0 0 52 52"><circle class="bg" cx="26" cy="26" r="22"/><circle class="fg" cx="26" cy="26" r="22" stroke-dasharray="${dash} ${C}"/></svg><b>${wi.count}/${wi.target}</b></div>`;
  let h = `<section class="hero"><div class="hero-top"><div><div class="hero-sub">${human(today())}</div><div class="hero-title">${tp ? esc(tp.name) : 'День отдыха'}</div></div>${ring}</div>
    <div class="wk">${wi.days.map(d => `<div class="wkd ${d.done ? 'done' : ''} ${d.plan ? 'plan' : ''} ${d.today ? 'today' : ''}">${d.n}<i>${d.done ? '✓' : ''}</i></div>`).join('')}</div>
    <button class="btn-start" data-act="tpls">Начать тренировку</button>
    ${tp ? `<button class="btn-alt" data-act="start" data-day="${tp.id}">По плану: ${esc(tp.name)}</button>` : ''}</section>`;
  const wsd = weekStart(today());
  const vol = S.sessions.filter(s => s.d >= wsd).reduce((a, s) => a + sessionVolume(s), 0);
  const c30 = new Date(); c30.setDate(c30.getDate() - 30); const m30 = S.sessions.filter(s => s.d >= fmtDate(c30)).length;
  h += `<div class="stats"><div class="stat"><b>${Math.round(vol).toLocaleString('ru-RU')}</b><span>кг за неделю</span></div>
    <div class="stat"><b>${nf(bodyAt(today()))}</b><span>вес тела, кг</span></div>
    <div class="stat"><b>${m30}</b><span>тренировок за 30 дн.</span></div></div>`;
  const last = sortedSessions().pop();
  if (last) {
    const nm = last.name || (S.plan.find(x => x.id === last.dayId) || {}).name || 'Своя тренировка';
    h += `<div class="card last" data-act="lastopen" data-id="${last.id}"><div class="badge">${esc(nm.slice(0, 1))}</div><div class="grow"><h3>${esc(nm)}</h3>
      <div class="muted small">${human(last.d)} · ${Math.round(sessionVolume(last)).toLocaleString('ru-RU')} кг · ${last.entries.length} упр.</div></div><span class="muted">›</span></div>`;
  }
  h += backupBanner();
  return h;
}

function backupBanner() {
  const b = S.settings.backup;
  if (!S.sessions.length) return '';
  const days = b ? (Date.now() - new Date(b)) / 864e5 : 999;
  if (days < 7) return '';
  return `<div class="card" style="border-color:var(--warn)"><b>Сохрани копию данных</b>
    <div class="muted small" style="margin:4px 0 10px">${b ? 'Последняя копия была ' + Math.floor(days) + ' дн. назад.' : 'Копия ещё ни разу не создавалась.'} Если данные приложения сотрутся, историю не восстановить.</div>
    <button class="block" data-act="export">Сохранить копию</button></div>`;
}

const STEPS = [0.5, 1, 1.25, 2.5, 5];
function exStep(id) {
  const ex = S.ex[id];
  if (ex.step) return ex.step;
  if (ex.bw) return 2.5;
  return /гантел|Махи|Молотки|Концентр|Разводка|Арнольд/.test(ex.name) ? 1 : 2.5;
}
function exRest(id) { return S.ex[id].rest || S.settings.rest || 90; }

function cardClosed(e, ei) {
  const done = e.sets.filter(s => s.done);
  const fin = done.length && done.length === e.sets.length;
  const sum = done.length ? done.map(s => setLabel(e.exId, s)).join(' · ') : 'не начато';
  return `<div class="card closed" data-act="open" data-e="${ei}" data-card="${ei}"><div class="list-item"><div class="grow"><h3>${fin ? '✓ ' : ''}${esc(S.ex[e.exId].name)}</h3>
    <div class="muted small">${done.length}/${e.sets.length} подх. · ${esc(sum)}</div></div><span class="muted">›</span></div></div>`;
}

function blockRange(ents, ei) {
  const g = ents[ei].ss;
  if (!g) return [ei, ei];
  let a = ei, b = ei;
  while (a > 0 && ents[a - 1].ss === g) a--;
  while (b < ents.length - 1 && ents[b + 1].ss === g) b++;
  return [a, b];
}
function ssRest(ids) {
  const m = S.settings.ssRest && S.settings.ssRest[ids.join('+')];
  return m || Math.max.apply(null, ids.map(exRest));
}
function setRow(e, ei, si) {
  const ex = S.ex[e.exId], s = e.sets[si];
  let h = `<div class="set ${s.done ? 'done' : ''}">`;
  if (ex.bw) { const m = bwMode(s); h += `<div><button class="modebtn" data-act="bwmode" data-e="${ei}" data-s="${si}">${si + 1} · ${m === 'a' ? 'помощь' : 'доп. вес'} ⇄</button>${stepper(m, ei, si, s[m] || 0, exStep(e.exId))}</div>`; }
  else h += `<div><div class="lbl">${si + 1} · вес, кг</div>${stepper('w', ei, si, s.w, exStep(e.exId))}</div>`;
  return h + `<div><div class="lbl">повторы</div>${stepper('r', ei, si, s.r, 1)}</div>
    <button class="ok" data-act="done" data-e="${ei}" data-s="${si}">${s.done ? '✓' : '○'}</button></div>`;
}
function cardOpen(e, ei) {
  const ex = S.ex[e.exId];
  const prev = lastEntryFor(e.exId);
  let h = `<div class="card open" data-card="${ei}"><div class="ex-head"><div class="ex-tag">${esc(ex.g || '')}</div><h3>${esc(ex.name)}</h3>
    ${e.reps ? `<div class="muted small">План: ${e.sets.length} × ${esc(e.reps)}</div>` : ''}
    <div class="row rest-edit"><span class="muted small grow">Отдых после подхода</span>
    <button class="sm" data-act="reststep" data-e="${ei}" data-d="-15">−</button><b>${exRest(e.exId)} с</b><button class="sm" data-act="reststep" data-e="${ei}" data-d="15">+</button></div>
    <div class="row rest-edit"><span class="muted small grow">Шаг кнопок веса</span><button class="sm" data-act="stepcycle" data-e="${ei}"><b>${nf(exStep(e.exId))} кг</b></button></div></div>`;
  if (prev) h += `<div class="prev">Прошлый раз: ${prev.sets.map(p => setLabel(e.exId, p)).join(' · ')}</div>`;
  e.sets.forEach((s, si) => { h += setRow(e, ei, si); });
  h += `<div class="row" style="flex-wrap:wrap"><button class="sm ghost" data-act="addset" data-e="${ei}">+ подход</button>${e.sets.length > 1 ? `<button class="sm ghost" data-act="delset" data-e="${ei}">− подход</button>` : ''}
    ${ei > 0 ? `<button class="sm ghost" data-act="sslink" data-e="${ei}">Суперсет с предыдущим</button>` : ''}
    <button class="sm ghost danger" data-act="skipex" data-e="${ei}">Убрать</button></div></div>`;
  return h;
}
function cardBlockOpen(s, en) {
  const ents = S.active.entries.slice(s, en + 1), ids = ents.map(x => x.exId);
  const rounds = Math.max.apply(null, ents.map(x => x.sets.length));
  let h = `<div class="card open" data-card="${s}"><div class="ex-head"><div class="ex-tag">Суперсет</div><h3>${ents.map(x => esc(S.ex[x.exId].name)).join(' + ')}</h3>
    <div class="muted small">Упражнения подряд без отдыха, отдых после каждого круга</div>
    <div class="row rest-edit"><span class="muted small grow">Отдых после круга</span>
    <button class="sm" data-act="ssrest" data-e="${s}" data-d="-15">−</button><b>${ssRest(ids)} с</b><button class="sm" data-act="ssrest" data-e="${s}" data-d="15">+</button></div>
    ${ents.map((x, k) => `<div class="row rest-edit"><span class="muted small grow">Шаг: ${esc(S.ex[x.exId].name)}</span><button class="sm" data-act="stepcycle" data-e="${s + k}"><b>${nf(exStep(x.exId))} кг</b></button></div>`).join('')}</div>`;
  ents.forEach(x => {
    const prev = lastEntryFor(x.exId);
    if (prev) h += `<div class="prev"><b>${esc(S.ex[x.exId].name)}</b>, прошлый раз: ${prev.sets.map(p => setLabel(x.exId, p)).join(' · ')}</div>`;
  });
  for (let r = 0; r < rounds; r++) {
    h += `<div class="round"><div class="round-t">Круг ${r + 1}</div>`;
    ents.forEach((x, k) => { if (x.sets[r]) h += `<div class="ssname">${esc(S.ex[x.exId].name)}</div>${setRow(x, s + k, r)}`; });
    h += '</div>';
  }
  h += `<div class="row" style="flex-wrap:wrap"><button class="sm ghost" data-act="ssadd" data-e="${s}">+ круг</button>${rounds > 1 ? `<button class="sm ghost" data-act="ssdel" data-e="${s}">− круг</button>` : ''}
    <button class="sm ghost" data-act="ssunlink" data-e="${s}">Разделить</button>
    ${ents.map((x, k) => `<button class="sm ghost danger" data-act="skipex" data-e="${s + k}">Убрать «${esc(S.ex[x.exId].name)}»</button>`).join('')}</div></div>`;
  return h;
}
function cardBlockClosed(s, en) {
  const ents = S.active.entries.slice(s, en + 1);
  const total = ents.reduce((n, x) => n + x.sets.length, 0), done = ents.reduce((n, x) => n + x.sets.filter(y => y.done).length, 0);
  return `<div class="card closed" data-act="open" data-e="${s}" data-card="${s}"><div class="list-item"><div class="grow"><div class="ex-tag">Суперсет</div>
    <h3>${done === total && total ? '✓ ' : ''}${ents.map(x => esc(S.ex[x.exId].name)).join(' + ')}</h3><div class="muted small">${done}/${total} подх.</div></div><span class="muted">›</span></div></div>`;
}

function vActive() {
  const a = S.active;
  const day = S.plan.find(d => d.id === a.dayId);
  if (ui.open == null || ui.open >= a.entries.length) ui.open = a.entries.length - 1;
  const totalSets = a.entries.reduce((n, e) => n + e.sets.length, 0), doneSets = a.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  let h = `<div class="row sb"><h1 style="margin-bottom:12px">${esc(a.name || (day ? day.name : 'Тренировка'))}</h1><span class="timepill" id="elapsed">0:00</span></div>
    <div class="pbar"><i style="width:${totalSets ? Math.round(doneSets / totalSets * 100) : 0}%"></i></div>`;
  if (a.d !== today()) h += '<div class="muted small" style="margin:-6px 0 10px">Начата ' + human(a.d) + '. Завершите или отмените, если уже не актуально.</div>';
  if (!a.entries.length) h += '<div class="empty">Пока нет упражнений. Выбери первое.</div>';
  for (let i = 0; i < a.entries.length;) {
    const [bs, be] = blockRange(a.entries, i), open = ui.open >= bs && ui.open <= be;
    if (be > bs) h += open ? cardBlockOpen(bs, be) : cardBlockClosed(bs, be);
    else h += open ? cardOpen(a.entries[bs], bs) : cardClosed(a.entries[bs], bs);
    i = be + 1;
  }
  h += `<button class="primary block big" data-act="addex">${a.entries.length ? 'Следующее упражнение →' : 'Выбрать упражнение'}</button>
    <div class="card" style="margin-top:12px"><div class="lbl2" style="margin-top:0">Самочувствие</div>${feelRow('afeel', a.feel)}
      <textarea data-anote="1" rows="2" placeholder="Заметка к тренировке (необязательно)" style="margin-top:10px">${esc(a.note || '')}</textarea></div>
    <button class="block" data-act="finish">Завершить тренировку</button>
    <div style="height:10px"></div>
    <button class="block ghost danger" data-act="discard">Отменить тренировку</button>`;
  return h;
}

/* ---------- выбор упражнения ---------- */
function groupsList() {
  const g = GROUPS.slice();
  if (Object.values(S.ex).some(x => x.g === 'Другое')) g.push('Другое');
  return g;
}
function pickList() {
  const p = ui.pick, q = normQ(p.q);
  if (!p._cache) {
    const used = {}, last = {};
    sortedSessions().forEach((s, i) => {
      s.entries.forEach(e => {
        used[e.exId] = i + 1;
        if (e.sets && e.sets.length) last[e.exId] = e;
      });
    });
    p._cache = { used, last };
  }
  const { used, last } = p._cache;
  let ids = Object.keys(S.ex).filter(k => !S.ex[k].hidden && (p.g === 'Все' || S.ex[k].g === p.g) && (!q || normQ(S.ex[k].name).includes(q)));
  if (p.g === 'Все' && !q) ids.sort((a, b) => (used[b] || 0) - (used[a] || 0));
  if (!ids.length) return '<div class="empty">Ничего не найдено</div>';
  return ids.map(k => {
    const prev = last[k];
    return `<div class="pitem" data-act="pick-ex" data-id="${k}"><div class="grow"><b>${esc(S.ex[k].name)}</b>
      <div class="muted small">${esc(S.ex[k].g)}${prev ? ' · было ' + esc(setLabel(k, prev.sets[0])) : ''}</div></div><span class="plus">+</span></div>`;
  }).join('');
}
function drawSheet() {
  let el = document.getElementById('sheet');
  if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); sheetOpened(); }
  const p = ui.pick;
  if (p.creating) {
    el.innerHTML = `<div class="sheet-bg" data-act="pick-close"></div><div class="sheet-body"><div class="row sb"><h2 style="margin:0">Своё упражнение</h2><button class="sm" data-act="pick-back">Назад</button></div>
      <div class="lbl2">Название</div><input id="newName" placeholder="Например, Жим Свенда">
      <div class="lbl2">Группа мышц</div><select id="newG">${groupsList().filter(g => g !== 'Другое').map(g => `<option ${g === (p.g !== 'Все' ? p.g : '') ? 'selected' : ''}>${g}</option>`).join('')}<option>Другое</option></select>
      <label class="check"><input type="checkbox" id="newBw"> Со своим весом (подтягивания, отжимания)</label>
      <button class="primary block" data-act="pick-create">Добавить в тренировку</button></div>`;
    return;
  }
  el.innerHTML = `<div class="sheet-bg" data-act="pick-close"></div><div class="sheet-body">
    <div class="row sb"><h2 style="margin:0">Упражнение</h2><button class="sm" data-act="pick-close">Закрыть</button></div>
    <input id="pickQ" placeholder="Поиск" value="${esc(p.q)}" autocomplete="off">
    <div class="chips">${['Все'].concat(groupsList()).map(g => `<button class="chip ${p.g === g ? 'on' : ''}" data-act="pick-g" data-g="${g}">${g}</button>`).join('')}</div>
    <div class="plist" id="pickList">${pickList()}</div>
    <button class="block" data-act="pick-new">+ Своё упражнение</button></div>`;
}
function openPicker(mode, di) { ui.pick = { mode, di, q: '', g: 'Все', creating: false }; drawSheet(); }
let sheetPushed = false, skipPop = 0, pendingPush = false;
function pushSheetState() { try { history.pushState({ sheet: 1 }, ''); sheetPushed = true; } catch (e) {} }
// запись в истории браузера нужна, чтобы кнопка «Назад» закрывала окно, а не приложение
function sheetOpened() {
  if (sheetPushed || pendingPush) return;
  if (skipPop > 0) { pendingPush = true; return; }   // сначала дожидаемся прошлого history.back(), иначе оно сотрёт новую запись
  pushSheetState();
}
window.addEventListener('popstate', () => {
  if (skipPop > 0) {
    skipPop--;
    if (skipPop === 0 && pendingPush) { pendingPush = false; if (document.getElementById('sheet')) pushSheetState(); }
    return;
  }
  if (!sheetPushed) return;
  sheetPushed = false; ui.pick = null; ui.tpl = null; ui.ed = null;
  const el = document.getElementById('sheet'); if (el) el.remove();
});
function closePicker() {
  ui.pick = null; ui.tpl = null; ui.ed = null; pendingPush = false;
  const el = document.getElementById('sheet'); if (el) el.remove();
  if (sheetPushed) { sheetPushed = false; skipPop++; try { history.back(); } catch (e) { skipPop--; } }
}
function addEntry(id) {
  const ex = S.ex[id], prev = lastEntryFor(id), p0 = prev ? prev.sets[0] : null;
  const st = ex.bw ? { a: p0 ? (p0.a || 0) : 0, w: p0 ? (p0.w || 0) : 0, r: p0 ? p0.r : 8, done: false } : { w: p0 ? p0.w : startW(id), r: p0 ? p0.r : 10, done: false };
  if (ex.bw) st.m = st.a > 0 ? 'a' : 'w';
  S.active.entries.push({ exId: id, sets: [st] });
  ui.open = S.active.entries.length - 1;
  save(); render();
  const c = document.querySelector('[data-card="' + ui.open + '"]'); if (c) c.scrollIntoView({ block: 'start' });
}
function pickExercise(id) {
  const p = ui.pick; closePicker();
  if (p.mode === 'plan') {
    const prev = lastEntryFor(id);
    S.plan[p.di].items.push({ ex: [id], sets: 3, reps: '10–12', w: prev ? prev.sets[0].w : startW(id), r: prev ? prev.sets[0].r : 10 });
    save(); render(); return;
  }
  addEntry(id);
}

function vSummary(id) {
  const sess = S.sessions.find(s => s.id === id);
  if (!sess) { ui.sub = null; return vTrain(); }
  const d = summaryData(sess);
  const day = S.plan.find(x => x.id === sess.dayId);
  let cmp = '';
  if (sess.dayId === 'free') cmp = '<div class="muted">Свободная тренировка: сравнение с прошлым разом смотри по каждому упражнению.</div>';
  else if (d.prevVol != null) {
    const diff = d.vol - d.prevVol, pct = d.prevVol ? diff / d.prevVol * 100 : 0;
    cmp = `<div class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(pct))}% к прошлой «${esc(sess.name || (day ? day.name : ''))}» (${Math.round(d.prevVol)} кг)</div>`;
  } else cmp = '<div class="muted">Первая такая тренировка — сравнивать пока не с чем.</div>';
  let h = `<section class="hero"><div class="hero-sub">${human(sess.d)} · ${esc(sess.name || (day ? day.name : 'Тренировка'))}</div>
    <div class="bignum">${Math.round(d.vol).toLocaleString('ru-RU')}<small>кг</small></div><div class="hero-sub">общий объём</div>
    <div style="margin-top:6px">${cmp}</div>
    ${d.prs.length ? `<div style="margin-top:10px"><span class="pr" style="margin-left:0">Рекорд</span> ${d.prs.map(x => esc(S.ex[x].name)).join(', ')}</div>` : ''}</section>
    <div class="kpis"><div class="kpi"><b>${d.dur} мин</b><span>время</span></div><div class="kpi"><b>${d.sets}</b><span>подходов</span></div><div class="kpi"><b>${d.reps}</b><span>повторов</span></div></div>`;
  if (sess.feel || sess.note) h += `<div class="card">${sess.feel ? `<span style="font-size:24px">${FEEL[sess.feel - 1]}</span> ` : ''}${sess.note ? esc(sess.note) : ''}</div>`;
  h += backupBanner();
  d.rows.forEach(r => {
    h += `<div class="card"><div class="row sb"><h3>${esc(S.ex[r.e.exId].name)}${r.pr ? '<span class="pr">Рекорд</span>' : ''}</h3><span class="muted small">${Math.round(r.v)} кг</span></div>
      <div style="margin-top:6px">${r.e.sets.map(st => `<div>${setLabel(r.e.exId, st)}</div>`).join('')}</div>
      ${r.prevE ? `<div class="muted small" style="margin-top:6px">Прошлый раз: ${r.prevE.sets.map(p => setLabel(r.e.exId, p)).join(' · ')}</div>` : ''}</div>`;
  });
  h += `<button class="primary block big" data-act="closesum">Готово</button>`;
  return h;
}

function vHistory() {
  if (ui.sub && ui.sub.view === 'hdetail') return vHDetail(ui.sub.id);
  const list = sortedSessions().reverse();
  let h = '<h1>История</h1>';
  if (!list.length) return h + '<div class="empty">Тренировок пока нет.</div>';
  h += list.map(s => {
    const day = S.plan.find(x => x.id === s.dayId);
    return `<div class="card" data-act="hopen" data-id="${s.id}"><div class="list-item"><div><h3>${human(s.d)} · ${esc(s.name || (day ? day.name : 'Своя тренировка'))}${s.feel && FEEL[s.feel - 1] ? ' ' + FEEL[s.feel - 1] : ''}</h3>
      <div class="muted small">${s.entries.length} упр. · ${Math.round(sessionVolume(s)).toLocaleString('ru-RU')} кг объём</div></div><span class="muted">›</span></div></div>`;
  }).join('');
  return h;
}

function vHDetail(id) {
  const s = S.sessions.find(x => x.id === id);
  if (!s) { ui.sub = null; return vHistory(); }
  let h = `<div class="row"><button class="sm" data-act="hback">‹ Назад</button></div><h1 style="margin-top:12px">${human(s.d)}</h1>
    <div class="card"><div class="row"><div class="grow muted small">Дата</div><input type="date" style="width:auto" value="${s.d}" data-act-change="hdate" data-id="${s.id}"></div></div>
    <div class="card"><div class="lbl2" style="margin-top:0">Самочувствие</div>${feelRow('hfeel', s.feel, s.id)}
      <textarea data-note="${s.id}" rows="2" placeholder="Заметка к тренировке" style="margin-top:10px">${esc(s.note || '')}</textarea></div>`;
  s.entries.forEach((e, ei) => {
    const bw = S.ex[e.exId].bw;
    h += `<div class="card"><h3>${esc(S.ex[e.exId].name)}${e.ss ? ' <span class="pill">суперсет</span>' : ''}</h3><div style="margin-top:8px">`;
    e.sets.forEach((st, si) => {
      const m = bwMode(st);
      const key = bw ? m : 'w', val = bw ? (m === 'a' ? (st.a || 0) : (st.w || 0)) : st.w;
      h += `<div class="row" style="margin-bottom:8px"><span class="muted" style="width:20px">${si + 1}</span>
        <div class="grow"><input inputmode="decimal" value="${val}" data-hs="${key}" data-id="${s.id}" data-e="${ei}" data-s="${si}">
          ${bw ? `<button class="modebtn" data-act="hbw" data-id="${s.id}" data-e="${ei}" data-s="${si}" style="width:100%;margin-top:3px">${m === 'a' ? 'помощь' : 'доп. вес'} ⇄</button>` : '<div class="muted small" style="text-align:center">кг</div>'}</div>
        <div class="grow"><input inputmode="numeric" value="${st.r}" data-hs="r" data-id="${s.id}" data-e="${ei}" data-s="${si}"><div class="muted small" style="text-align:center">повторы</div></div>
        <button class="sm danger" data-act="hdelset" data-id="${s.id}" data-e="${ei}" data-s="${si}">✕</button></div>`;
    });
    h += '</div></div>';
  });
  h += `<button class="block danger" data-act="hdelete" data-id="${s.id}">Удалить тренировку</button>`;
  return h;
}

function exercisesWithData() {
  const set = new Set();
  S.sessions.forEach(s => s.entries.forEach(e => set.add(e.exId)));
  return Object.keys(S.ex).filter(k => set.has(k));
}

const PERIODS = [['90', '3 мес'], ['180', '6 мес'], ['365', 'Год'], ['all', 'Всё']];
function vProgress() {
  const per = S.settings.per || 'all';
  let cut = '';
  if (per !== 'all') { const cd = new Date(); cd.setDate(cd.getDate() - parseInt(per, 10)); cut = fmtDate(cd); }
  let h = `<h1>Прогресс</h1><div class="chips" style="margin-bottom:12px">${PERIODS.map(p => `<button class="chip ${per === p[0] ? 'on' : ''}" data-act="period" data-p="${p[0]}">${p[1]}</button>`).join('')}</div>`;
  const exs = exercisesWithData();
  if (!S.sessions.length) h += '<div class="empty">Графики появятся после первой тренировки.</div>';
  else {
    if (!ui.pex || !exs.includes(ui.pex)) ui.pex = exs[0];
    h += `<select data-act-change="pex">${exs.map(k => `<option value="${k}" ${k === ui.pex ? 'selected' : ''}>${esc(S.ex[k].name)}</option>`).join('')}</select><div style="height:12px"></div>`;
    const pts = [], pw = [];
    sortedSessions().forEach(s => {
      if (s.d < cut) return;
      const e = s.entries.find(x => x.exId === ui.pex);
      if (!e) return;
      let be = 0, bw = 0, ok = false;
      e.sets.forEach(st => { if (!(st.r > 0)) return; ok = true; const w = effW(ui.pex, st, s.d); be = Math.max(be, e1rm(w, st.r)); bw = Math.max(bw, w); });
      if (!ok) return;
      pts.push({ x: lab(s.d), y: Math.round(be * 10 + 1e-6) / 10 });
      pw.push({ x: lab(s.d), y: bw });
    });
    const note = pts.length < 3 ? '<div class="muted small">Данных мало — график станет информативным после 3+ тренировок.</div>' : '';
    const delta = pts.length > 1 ? pts[pts.length - 1].y - pts[0].y : null;
    h += `<div class="card"><div class="row sb"><h3>Расчётный максимум (1ПМ)</h3>${delta != null ? `<span class="${delta > 0 ? 'up' : delta < 0 ? 'down' : 'muted'}">${delta > 0 ? '+' : ''}${nf(delta)} кг</span>` : ''}</div>${lineChart(pts)}${note}</div>
      <div class="card"><h3>Лучший рабочий вес</h3>${lineChart(pw, { color: 'var(--c2)' })}</div>`;
    const monthly = per === '365' || per === 'all', agg = {};
    S.sessions.forEach(s => { if (s.d < cut) return; const k = monthly ? s.d.slice(0, 7) : weekStart(s.d); agg[k] = (agg[k] || 0) + sessionVolume(s); });
    let keys = Object.keys(agg).sort();
    if (cut && keys.length > 1) { const f0 = keys[0], partial = monthly ? (f0 === cut.slice(0, 7) && cut.slice(8) !== '01') : f0 < cut; if (partial) keys = keys.slice(1); }
    if (keys.length > 1) {
      const a0 = keys[0], b0 = keys[keys.length - 1], full = [];
      if (monthly) { let y = +a0.slice(0, 4), m = +a0.slice(5, 7); const y2 = +b0.slice(0, 4), m2 = +b0.slice(5, 7); while (y < y2 || (y === y2 && m <= m2)) { full.push(y + '-' + String(m).padStart(2, '0')); if (++m > 12) { m = 1; y++; } } }
      else { const dd = parseDate(a0), end = parseDate(b0); while (dd <= end) { full.push(fmtDate(dd)); dd.setDate(dd.getDate() + 7); } }
      keys = full;
    }
    const cy = today().slice(0, 4);
    const wpts = keys.slice(monthly ? (per === 'all' ? -36 : -13) : -26).map(k => ({ x: monthly ? MON[+k.slice(5, 7) - 1] + (k.slice(0, 4) !== cy ? ' ’' + k.slice(2, 4) : '') : lab(k), y: Math.round(agg[k] || 0) }));
    h += `<div class="card"><h3>Объём по ${monthly ? 'месяцам' : 'неделям'}, кг</h3>${barChart(wpts)}</div>`;
  }
  const all = S.body.slice().sort((a, b) => a.d.localeCompare(b.d));
  const bp = all.filter(b => b.d >= cut).map(b => ({ x: lab(b.d), y: b.kg }));
  h += `<div class="card"><div class="row sb"><h3>Вес тела</h3><span class="muted small">цель 70–72 кг</span></div>${lineChart(bp, { color: 'var(--c3)' })}
    <div class="row" style="margin-top:10px"><input id="bodyD" type="date" value="${today()}" style="flex:1.3"><input id="bodyIn" inputmode="decimal" placeholder="Вес, кг" style="flex:1"><button class="primary" data-act="addbody">OK</button></div>
    <div style="margin-top:8px">${all.slice().reverse().slice(0, 6).map(b => `<div class="row sb" style="padding:6px 0;border-top:1px solid var(--line)"><span class="muted">${human(b.d)}</span><b class="num">${nf(b.kg)} кг</b><button class="sm danger" data-act="delbody" data-d="${b.d}">✕</button></div>`).join('')}</div></div>`;
  return h;
}

function vMore() {
  if (ui.sub && ui.sub.view === 'plan') return vPlan();
  if (ui.sub && ui.sub.view === 'exlist') return vExercises();
  const b = S.settings.backup;
  const autoAt = (() => { try { return localStorage.getItem(KEY + '-auto-at'); } catch (e) { return null; } })();
  const cur = document.documentElement.dataset.theme;
  const th = [['steel', 'Сталь', 'linear-gradient(135deg,#1a2a3a,#7ba5c9)'], ['chalk', 'Магний', 'linear-gradient(135deg,#2a151a,#e8b862)']];
  return `<h1>Ещё</h1>
    <div class="card"><h3>Оформление</h3><div class="themes">${th.map(t => `<button class="theme-opt ${cur === t[0] ? 'on' : ''}" data-act="theme" data-t="${t[0]}"><i style="background:${t[2]}"></i>${t[1]}</button>`).join('')}</div></div>
    <div class="card"><h3>План тренировок</h3><div class="muted small" style="margin:4px 0 10px">Упражнения, подходы и повторы.</div><button class="block" data-act="plan">Редактировать план</button></div>
    <div class="card"><h3>Упражнения</h3><div class="muted small" style="margin:4px 0 10px">Переименовать, сменить группу, добавить своё или удалить лишнее.</div><button class="block" data-act="exlist">Открыть список</button></div>
    <div class="card"><h3>Отдых по умолчанию</h3><div class="muted small">Для новых упражнений. У каждого упражнения своё время отдыха, оно меняется прямо в тренировке.</div><div class="row" style="margin-top:8px"><input id="restIn" type="text" inputmode="numeric" value="${S.settings.rest}"><span class="muted">секунд</span><button data-act="saverest">OK</button></div></div>
    <div class="card"><div class="row sb"><div class="grow"><h3>Экран не гаснет</h3><div class="muted small">Во время тренировки, чтобы не разблокировать телефон между подходами. Расходует больше заряда.</div></div>
      <button class="sm ${S.settings.awake === false ? '' : 'primary'}" data-act="awake">${S.settings.awake === false ? 'Выкл' : 'Вкл'}</button></div></div>
    <div class="card"><h3>Сигнал конца отдыха</h3><div class="muted small" style="margin-top:4px">Если сигнал не приходит при выключенном экране: «Настройки» → «Приложения» → «Тренировки» → «Батарея» → «Без ограничений», и разреши уведомления. Режим «Не беспокоить» глушит вибрацию.</div></div>
    <div class="card"><h3>Копия данных</h3><div class="muted small" style="margin:4px 0 10px">${b ? 'Последняя копия: ' + new Date(b).toLocaleDateString('ru-RU') : 'Копий ещё не было.'} Делай копию раз в пару недель и отправляй себе в мессенджер.</div>
      <div class="row"><button class="grow primary" data-act="export">Сохранить</button><button class="grow" data-act="import">Восстановить</button></div>
      <input type="file" id="file" accept=".json,application/json" class="hidden">
      <div class="muted small" style="margin-top:12px">Автокопия внутри приложения обновляется после каждой тренировки${autoAt ? ' (последняя: ' + new Date(autoAt).toLocaleDateString('ru-RU') + ')' : ''}. Она спасёт при сбое, но не при удалении приложения.</div>
      ${autoAt ? '<button class="block ghost" data-act="autorestore" style="margin-top:6px">Вернуть из автокопии</button>' : ''}</div>
    <div class="card"><h3>Сбросить всё</h3><button class="block danger" data-act="reset">Удалить все данные</button></div>`;
}

function exUsed(id) { return S.sessions.some(s => s.entries.some(e => e.exId === id)); }
function exListHtml() {
  const q = normQ(ui.exq || ''), g = ui.exg || 'Все';
  const ids = Object.keys(S.ex).filter(k => !S.ex[k].hidden && (g === 'Все' || S.ex[k].g === g) && (!q || normQ(S.ex[k].name).includes(q)));
  if (!ids.length) return '<div class="empty">Ничего не найдено</div>';
  return ids.map(k => `<div class="pitem" data-act="exedit" data-id="${k}"><div class="grow"><b>${esc(S.ex[k].name)}</b>
    <div class="muted small">${esc(S.ex[k].g)}${k[0] === 'x' ? ' · своё' : ''}${S.ex[k].bw ? ' · со своим весом' : ''}</div></div><span class="muted">›</span></div>`).join('');
}
function vExercises() {
  if ((ui.exg || 'Все') !== 'Все' && !groupsList().includes(ui.exg)) ui.exg = 'Все';
  return `<div class="row"><button class="sm" data-act="exback">‹ Назад</button></div><h1 style="margin-top:12px">Упражнения</h1>
    <input id="exQ" placeholder="Поиск" value="${esc(ui.exq || '')}" autocomplete="off" style="margin-bottom:10px">
    <div class="chips" style="margin-bottom:6px">${['Все'].concat(groupsList()).map(g => `<button class="chip ${(ui.exg || 'Все') === g ? 'on' : ''}" data-act="exg" data-g="${g}">${g}</button>`).join('')}</div>
    <div class="card" id="exList" style="padding:4px 12px">${exListHtml()}</div>
    <button class="primary block" data-act="exnew">+ Новое упражнение</button>`;
}
function drawEx() {
  let el = document.getElementById('sheet');
  if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); sheetOpened(); }
  const id = ui.ed.id, custom = !id || id[0] === 'x', used = !!id && exUsed(id);
  const ex = id ? S.ex[id] : { name: '', g: ui.exg && ui.exg !== 'Все' ? ui.exg : GROUPS[0], rest: S.settings.rest || 90 };
  const gl = groupsList(); if (!gl.includes('Другое')) gl.push('Другое');
  el.innerHTML = `<div class="sheet-bg" data-act="pick-close"></div><div class="sheet-body"><div class="row sb"><h2 style="margin:0">${id ? 'Упражнение' : 'Новое упражнение'}</h2><button class="sm" data-act="pick-close">Закрыть</button></div>
    <div class="plist">
    <div class="lbl2">Название</div><input id="exName" value="${esc(ex.name)}" autocomplete="off">
    <div class="lbl2">Группа мышц</div><select id="exG">${gl.map(g => `<option ${g === ex.g ? 'selected' : ''}>${g}</option>`).join('')}</select>
    <div class="lbl2">Отдых после подхода, секунд</div><input id="exRest" inputmode="numeric" value="${ex.rest || 90}">
    <label class="check"><input type="checkbox" id="exBw" ${ex.bw ? 'checked' : ''} ${used || !custom ? 'disabled' : ''}> Со своим весом (подтягивания, отжимания)</label>
    ${id && !custom ? '<div class="muted small">Базовое упражнение входит в шаблоны: его можно переименовать, но нельзя удалить.</div>' : ''}
    ${used ? '<div class="muted small">Тип «со своим весом» нельзя менять: у упражнения есть история.</div>' : ''}</div>
    <button class="primary block" data-act="exsave">Сохранить</button>
    ${id && custom ? '<button class="block danger" data-act="exdel">Удалить упражнение</button>' : ''}</div>`;
}
function vPlan() {
  let h = `<div class="row"><button class="sm" data-act="pback">‹ Назад</button></div><h1 style="margin-top:12px">План</h1>`;
  S.plan.forEach((d, di) => {
    h += `<div class="card"><h3>${esc(d.name)}</h3><div class="muted small" style="margin-bottom:8px">Блок: упражнение · подходы · повторы (текст)</div>`;
    d.items.forEach((it, ii) => {
      h += `<div style="margin-bottom:12px"><div class="plan-row"><div><b>${esc(it.ex.map(x => S.ex[x].name).join(' + '))}</b></div>
        <input type="text" inputmode="numeric" value="${it.sets}" data-p="sets" data-d="${di}" data-i="${ii}"><input value="${esc(it.reps)}" data-p="reps" data-d="${di}" data-i="${ii}"></div>
        <div class="row"><button class="sm" data-act="pup" data-d="${di}" data-i="${ii}">↑</button><button class="sm" data-act="pdown" data-d="${di}" data-i="${ii}">↓</button>
        <button class="sm danger" data-act="pdel" data-d="${di}" data-i="${ii}">Убрать</button></div></div>`;
    });
    h += `<button class="block ghost" data-act="padd" data-d="${di}">+ Упражнение</button></div>`;
  });
  return h;
}

/* ---------- экспорт / импорт ---------- */
async function doExport() {
  const name = 'workout-backup-' + today() + '.json';
  const text = JSON.stringify(S, null, 1);
  const cap = window.Capacitor;
  try {
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      const P = cap.Plugins;
      const r = await P.Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
      await P.Share.share({ title: 'Копия тренировок', url: r.uri });
    } else {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    S.settings.backup = new Date().toISOString(); if (save()) toast('Копия сохранена'); render();
  } catch (e) {
    if (!/cancel/i.test(String(e && e.message))) toast('Не удалось сохранить копию');
  }
}
function resetFileInput() { const f = document.getElementById('file'); if (f) f.value = ''; }
function doImport(file) {
  const rd = new FileReader();
  rd.onerror = () => { toast('Не удалось прочитать файл'); resetFileInput(); };
  rd.onload = () => {
    let n, rawCount = 0;
    try {
      const d = JSON.parse(rd.result);
      if (!d || typeof d !== 'object' || Array.isArray(d) || !d.ex || !Array.isArray(d.plan) || !Array.isArray(d.sessions)) throw new Error('bad');
      rawCount = d.sessions.length;
      n = migrate(d);
    } catch (e) { toast('Файл не похож на копию тренировок'); resetFileInput(); return; }
    const lost = S.active && !n.active ? ' Идущая тренировка будет потеряна.' : '';
    const skipped = (rawCount > n.sessions.length) ? ' Повреждённых записей в файле: ' + (rawCount - n.sessions.length) + ', они будут пропущены.' : '';
    if (!confirm('Заменить все текущие данные данными из файла (' + n.sessions.length + ' ' + plural(n.sessions.length, ['тренировка', 'тренировки', 'тренировок']) + ')?' + skipped + lost)) { resetFileInput(); return; }
    stopRest();
    const prev = S;
    S = n;
    if (!save()) { S = prev; render(); toast('Файл слишком большой для памяти приложения, данные не изменены'); resetFileInput(); return; }
    S.settings.backup = new Date().toISOString(); save(); snapshot(); ui.sub = null; applyTheme(); render(); resumeRest(); toast('Данные восстановлены'); resetFileInput();
  };
  rd.readAsText(file);
}

/* ---------- события ---------- */
function toast(t) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div'); el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:150px;background:#fff;color:#000;padding:10px 16px;border-radius:12px;z-index:50;font-size:14px';
    document.body.appendChild(el);
  }
  el.textContent = t; el.style.display = 'block';
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 2200);
}

function setVal(k, ei, si, v) {
  const e = S.active.entries[ei], st = e.sets[si];
  st[k] = k === 'r' ? Math.min(999, Math.max(0, Math.round(num(v)))) : Math.min(2000, Math.max(0, num(v)));
  if (S.ex[e.exId].bw) { if (k === 'a') st.w = 0; else if (k === 'w') st.a = 0; }
}

document.addEventListener('click', ev => {
  const tb = ev.target.closest('#tabs button');
  if (tb) { ui.tab = tb.dataset.tab; ui.sub = null; render(); return; }
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, ds = el.dataset;
  const ei = +ds.e, si = +ds.s;
  switch (act) {
    case 'start': startSession(ds.day); break;
    case 'step': {
      const inp = el.parentElement.querySelector('input');
      const k = ds.k; const step = parseFloat(ds.d);
      const cur = S.active.entries[ei].sets[si][k] || 0;
      let nv = Math.round((cur + step) * 100) / 100; if (nv < 0) nv = 0;
      setVal(k, ei, si, nv); inp.value = S.active.entries[ei].sets[si][k]; save(); break;
    }
    case 'done': {
      const st = S.active.entries[ei].sets[si];
      st.done = !st.done; st.t = st.done ? Date.now() : null; save();
      if (st.done) {
        const ents = S.active.entries, br = blockRange(ents, ei);
        if (br[1] > br[0]) {
          const mem = ents.slice(br[0], br[1] + 1);
          if (mem.every(x => !x.sets[si] || x.sets[si].done)) {
            startRest(ssRest(mem.map(x => x.exId)));
          }
        } else {
          startRest(exRest(ents[ei].exId));
        }
      }
      const keep = window.scrollY; render(); window.scrollTo(0, keep); break;
    }
    case 'addset': {
      const e = S.active.entries[ei]; const last = e.sets[e.sets.length - 1];
      e.sets.push(Object.assign({}, last, { done: false, t: null })); save(); const k1 = window.scrollY; render(); window.scrollTo(0, k1); break;
    }
    case 'delset': { const ls = S.active.entries[ei].sets; if (ls[ls.length - 1].done && !confirm('Последний подход уже отмечен ✓. Удалить его?')) break; S.active.entries[ei].sets.pop(); save(); const k2 = window.scrollY; render(); window.scrollTo(0, k2); break; }
    case 'skipex': {
      const ex = S.active.entries[ei] && S.ex[S.active.entries[ei].exId];
      if (confirm(ex ? `Убрать «${ex.name}» из этой тренировки?` : 'Убрать упражнение из этой тренировки?')) {
        S.active.entries.splice(ei, 1);
        fixSS(S.active);
        ui.open = S.active.entries.length ? Math.min(ei, S.active.entries.length - 1) : null;
        save(); render();
      }
      break;
    }
    case 'addex': openPicker('session'); break;
    case 'tpls': openTpl(); break;
    case 'awake': S.settings.awake = S.settings.awake === false; save(); render(); break;
    case 'lastopen': ui.tab = 'history'; ui.sub = { view: 'hdetail', id: ds.id }; render(); break;
    case 'theme': S.settings.theme = ds.t; save(); applyTheme(); render(); break;
    case 'tpl-open': ui.tpl.sel = ds.id; drawTpl(); break;
    case 'tpl-back': ui.tpl.sel = null; drawTpl(); break;
    case 'tpl-close': closePicker(); break;
    case 'tpl-start': startTemplate(ds.id); break;
    case 'tpl-empty': closePicker(); startSession(''); break;
    case 'open': ui.open = ei; render(); { const c = document.querySelector('[data-card="' + ei + '"]'); if (c) c.scrollIntoView({ block: 'start' }); } break;
    case 'reststep': { const exx = S.ex[S.active.entries[ei].exId]; exx.rest = Math.min(600, Math.max(15, (exx.rest || 90) + parseInt(ds.d, 10))); save(); const k3 = window.scrollY; render(); window.scrollTo(0, k3); break; }
    case 'stepcycle': { const exs = S.ex[S.active.entries[ei].exId]; const cur = exStep(S.active.entries[ei].exId); exs.step = STEPS[(STEPS.indexOf(cur) + 1) % STEPS.length] || 1; save(); const k4 = window.scrollY; render(); window.scrollTo(0, k4); break; }
    case 'period': S.settings.per = ds.p; save(); { const k9 = window.scrollY; render(); window.scrollTo(0, k9); } break;
    case 'delbody': {
      if (S.body.length <= 1) {
        toast('Нельзя удалить последнюю запись веса');
        break;
      }
      if (confirm('Удалить запись веса за ' + human(ds.d) + '?')) {
        S.body = S.body.filter(b => b.d !== ds.d);
        if (!S.body.length) S.body = [{ d: today(), kg: DEFAULT_BW }];
        save();
        const ka = window.scrollY;
        render();
        window.scrollTo(0, ka);
      }
      break;
    }
    case 'exlist': ui.sub = { view: 'exlist' }; render(); break;
    case 'exback': ui.sub = null; render(); break;
    case 'exg': ui.exg = ds.g; render(); break;
    case 'exedit': ui.ed = { id: ds.id }; drawEx(); break;
    case 'exnew': ui.ed = { id: null }; drawEx(); break;
    case 'exsave': {
      const nm = document.getElementById('exName').value.trim().slice(0, 80);
      if (!nm) { toast('Введи название'); break; }
      const rest = Math.min(600, Math.max(15, Math.round(num(document.getElementById('exRest').value)) || 90));
      const bwEl = document.getElementById('exBw');
      let eid = ui.ed.id;
      if (!eid) { eid = 'x' + uid(); S.ex[eid] = { name: nm, g: 'Другое', rest }; }
      const ex = S.ex[eid]; ex.name = nm; ex.g = document.getElementById('exG').value; ex.rest = rest;
      if (!bwEl.disabled) { if (bwEl.checked) ex.bw = true; else delete ex.bw; }
      save(); closePicker(); render(); break;
    }
    case 'exdel': {
      const eid = ui.ed.id;
      if (S.active && S.active.entries.some(e => e.exId === eid)) { toast('Сначала заверши тренировку'); break; }
      const inPlan = S.plan.some(p => p.items.some(it => it.ex.includes(eid)));
      if (!confirm('Удалить «' + S.ex[eid].name + '»?' + (exUsed(eid) ? ' История тренировок с ним сохранится.' : '') + (inPlan ? ' Из плана оно тоже уберётся.' : ''))) break;
      S.plan.forEach(p => { p.items.forEach(it => { it.ex = it.ex.filter(x => x !== eid); }); p.items = p.items.filter(it => it.ex.length); });
      if (exUsed(eid)) S.ex[eid].hidden = true; else delete S.ex[eid];
      save(); closePicker(); render(); break;
    }
    case 'autorestore': {
      let au = null; try { au = JSON.parse(localStorage.getItem(KEY + '-auto')); } catch (e) {}
      if (!au || !Array.isArray(au.sessions)) { toast('Автокопия недоступна'); break; }
      if (confirm('Заменить текущие данные автокопией (' + au.sessions.length + ' тренировок)?')) { stopRest(); const prevS = S; S = migrate(au); if (!save()) { S = prevS; render(); break; } ui.sub = null; applyTheme(); toast('Данные возвращены'); render(); resumeRest(); }
      break;
    }
    case 'bwmode': {
      const bs = S.active.entries[ei].sets[si];
      if (bwMode(bs) === 'w') { bs.a = bs.w || 0; bs.w = 0; bs.m = 'a'; } else { bs.w = bs.a || 0; bs.a = 0; bs.m = 'w'; }
      save(); const k5 = window.scrollY; render(); window.scrollTo(0, k5); break;
    }
    case 'afeel': S.active.feel = S.active.feel === +ds.v ? 0 : +ds.v; save(); { const k6 = window.scrollY; render(); window.scrollTo(0, k6); } break;
    case 'hfeel': { const hs = S.sessions.find(x => x.id === ds.id); hs.feel = hs.feel === +ds.v ? 0 : +ds.v; save(); const k7 = window.scrollY; render(); window.scrollTo(0, k7); break; }
    case 'hbw': {
      const hb = S.sessions.find(x => x.id === ds.id).entries[ei].sets[si];
      if (bwMode(hb) === 'w') {
        hb.a = hb.w || 0;
        hb.w = 0;
        hb.m = 'a';
      } else {
        hb.w = hb.a || 0;
        hb.a = 0;
        hb.m = 'w';
      }
      save(); const k8 = window.scrollY; render(); window.scrollTo(0, k8); break;
    }
    case 'sslink': {
      const ents = S.active.entries, pv = ents[ei - 1];
      if (!pv) break;
      const g = pv.ss || ('g' + uid());
      pv.ss = g; ents[ei].ss = g;
      const br = blockRange(ents, ei);
      const maxSets = Math.max.apply(null, ents.slice(br[0], br[1] + 1).map(x => x.sets.length));
      for (let k = br[0]; k <= br[1]; k++) {
        while (ents[k].sets.length < maxSets) {
          const l = ents[k].sets[ents[k].sets.length - 1] || { w: 0, r: 10 };
          ents[k].sets.push(Object.assign({}, l, { done: false, t: null }));
        }
      }
      ui.open = br[0]; save(); render();
      { const fc = document.querySelector('[data-card="' + br[0] + '"]'); if (fc) fc.scrollIntoView({ block: 'start' }); }
      break;
    }
    case 'ssunlink': { const ents = S.active.entries, br = blockRange(ents, ei); for (let k = br[0]; k <= br[1]; k++) delete ents[k].ss; save(); const kb = window.scrollY; render(); window.scrollTo(0, kb); break; }
    case 'ssadd': {
      const ents = S.active.entries, br = blockRange(ents, ei);
      for (let k = br[0]; k <= br[1]; k++) { const l = ents[k].sets[ents[k].sets.length - 1]; ents[k].sets.push(Object.assign({}, l, { done: false, t: null })); }
      save(); const kc = window.scrollY; render(); window.scrollTo(0, kc); break;
    }
    case 'ssdel': {
      const ents = S.active.entries, br = blockRange(ents, ei), mem = ents.slice(br[0], br[1] + 1);
      const mx = Math.max.apply(null, mem.map(x => x.sets.length));
      if (mx <= 1) { toast('Нужен хотя бы один круг'); break; }
      if (mem.some(x => x.sets.length === mx && x.sets[mx - 1].done) && !confirm('Последний круг уже отмечен ✓. Удалить его?')) break;
      mem.forEach(x => { if (x.sets.length === mx) x.sets.pop(); });
      save(); const kd = window.scrollY; render(); window.scrollTo(0, kd); break;
    }
    case 'ssrest': {
      const ents = S.active.entries, br = blockRange(ents, ei), ids = ents.slice(br[0], br[1] + 1).map(x => x.exId);
      S.settings.ssRest = S.settings.ssRest || {};
      S.settings.ssRest[ids.join('+')] = Math.min(600, Math.max(15, ssRest(ids) + parseInt(ds.d, 10)));
      save(); const ke = window.scrollY; render(); window.scrollTo(0, ke); break;
    }
    case 'pick-close': closePicker(); break;
    case 'pick-g': ui.pick.g = ds.g; drawSheet(); break;
    case 'pick-ex': pickExercise(ds.id); break;
    case 'pick-new': ui.pick.creating = true; drawSheet(); break;
    case 'pick-back': ui.pick.creating = false; drawSheet(); break;
    case 'pick-create': {
      const nm = document.getElementById('newName').value.trim().slice(0, 80);
      if (!nm) { toast('Введи название'); break; }
      const nid = 'x' + uid();
      S.ex[nid] = { name: nm, g: document.getElementById('newG').value, rest: S.settings.rest || 90 };
      if (document.getElementById('newBw').checked) S.ex[nid].bw = true;
      save(); pickExercise(nid); break;
    }
    case 'finish': finishSession(); break;
    case 'discard': if (confirm('Отменить тренировку? Введённые данные пропадут.')) { S.active = null; stopRest(); save(); render(); } break;
    case 'closesum': ui.sub = null; render(); break;
    case 'rest-add': extendRest(15); break;
    case 'rest-stop': stopRest(); break;
    case 'hopen': ui.hscroll = window.scrollY; ui.sub = { view: 'hdetail', id: ds.id }; render(); break;
    case 'hback': ui.sub = null; render(); window.scrollTo(0, ui.hscroll || 0); break;
    case 'hdelete': if (confirm('Удалить эту тренировку навсегда?')) { S.sessions = S.sessions.filter(s => s.id !== ds.id); save(); ui.sub = null; render(); } break;
    case 'hdelset': {
      const hs = S.sessions.find(x => x.id === ds.id), he = hs.entries[ei];
      const lastSet = he.sets.length === 1, lastEx = lastSet && hs.entries.length === 1;
      const ask = lastEx ? 'Это единственный подход тренировки. Тренировка будет удалена целиком. Удалить?'
        : lastSet ? 'Это последний подход упражнения «' + S.ex[he.exId].name + '». Упражнение уберётся из тренировки. Удалить?'
        : 'Удалить подход ' + (si + 1) + '?';
      if (!confirm(ask)) break;
      he.sets.splice(si, 1);
      if (!he.sets.length) hs.entries.splice(ei, 1);
      if (!hs.entries.length) { S.sessions = S.sessions.filter(x => x.id !== ds.id); ui.sub = null; } else fixSS(hs);
      save(); render(); break;
    }
    case 'addbody': {
      const v = num(document.getElementById('bodyIn').value);
      if (v < 30 || v > 250) { toast('Введи вес в кг'); break; }
      const d = document.getElementById('bodyD').value || today(); if (!okDate(d)) { toast('Проверь дату'); break; } const ex = S.body.find(b => b.d === d);
      if (ex) ex.kg = v; else S.body.push({ d, kg: v });
      save(); render(); break;
    }
    case 'saverest': {
      const el = document.getElementById('restIn');
      const val = Math.min(600, Math.max(15, Math.round(num(el ? el.value : 0) || 90)));
      S.settings.rest = val;
      if (el) el.value = val;
      save();
      toast('Сохранено');
      break;
    }
    case 'export': doExport(); break;
    case 'import': { const f = document.getElementById('file'); f.onchange = () => { if (f.files[0]) doImport(f.files[0]); }; f.click(); break; }
    case 'reset': if (confirm('Удалить ВСЕ данные без возможности восстановления?') && confirm('Точно удалить?')) { stopRest(); S = seed(); try { ['-auto', '-auto-at', '-corrupt'].forEach(s => localStorage.removeItem(KEY + s)); } catch (e) {} save(); ui.sub = null; applyTheme(); render(); } break;
    case 'plan': ui.sub = { view: 'plan' }; render(); break;
    case 'pback': ui.sub = null; render(); break;
    case 'pup': case 'pdown': {
      const items = S.plan[+ds.d].items; const i = +ds.i; const j = act === 'pup' ? i - 1 : i + 1;
      if (j < 0 || j >= items.length) break;
      [items[i], items[j]] = [items[j], items[i]]; save(); render(); break;
    }
    case 'pdel': if (confirm('Убрать из плана? История останется.')) { S.plan[+ds.d].items.splice(+ds.i, 1); save(); render(); } break;
    case 'padd': openPicker('plan', +ds.d); break;
  }
});

document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.anote) { S.active.note = t.value; save(); return; }
  if (t.dataset.note) { S.sessions.find(x => x.id === t.dataset.note).note = t.value; save(); return; }
  if (t.id === 'exQ') { ui.exq = t.value; document.getElementById('exList').innerHTML = exListHtml(); return; }
  if (t.id === 'pickQ') { ui.pick.q = t.value; document.getElementById('pickList').innerHTML = pickList(); return; }
  if (S.active && t.dataset.k && t.dataset.e != null && ui.tab === 'train') { setVal(t.dataset.k, +t.dataset.e, +t.dataset.s, t.value); save(); }
  else if (t.dataset.hs) {
    const s = S.sessions.find(x => x.id === t.dataset.id); const st = s.entries[+t.dataset.e].sets[+t.dataset.s];
    const k = t.dataset.hs; st[k] = k === 'r' ? Math.min(999, Math.max(0, Math.round(num(t.value)))) : Math.min(2000, Math.max(0, num(t.value))); save();
  } else if (t.dataset.p) {
    const it = S.plan[+t.dataset.d] && S.plan[+t.dataset.d].items[+t.dataset.i];
    if (it) {
      if (t.dataset.p === 'sets') it.sets = Math.min(20, Math.max(1, Math.round(num(t.value)) || 1));
      else it.reps = t.value.slice(0, 20);
      save();
    }
  }
});
document.addEventListener('change', ev => {
  const t = ev.target; const a = t.dataset.actChange;
  if (t.dataset.k != null && t.dataset.e != null && S.active && S.active.entries[+t.dataset.e]) t.value = S.active.entries[+t.dataset.e].sets[+t.dataset.s][t.dataset.k] || 0;
  if (t.dataset.hs) { const hs = S.sessions.find(x => x.id === t.dataset.id); if (hs) t.value = hs.entries[+t.dataset.e].sets[+t.dataset.s][t.dataset.hs] || 0; }
  if (t.dataset.p === 'sets') { const it = S.plan[+t.dataset.d] && S.plan[+t.dataset.d].items[+t.dataset.i]; if (it) t.value = it.sets; }
  if (a === 'pex') { ui.pex = t.value; render(); }
  if (a === 'hdate') {
    const s = S.sessions.find(x => x.id === t.dataset.id);
    if (s && okDate(t.value)) {
      const oldStartMs = s.start ? new Date(s.start).getTime() : 0;
      const oldEndMs = s.end ? new Date(s.end).getTime() : 0;
      const durMs = (oldStartMs && oldEndMs && oldEndMs >= oldStartMs) ? (oldEndMs - oldStartMs) : 0;
      s.d = t.value;
      if (s.start && typeof s.start === 'string' && s.start.indexOf('T') >= 0) {
        s.start = t.value + s.start.slice(s.start.indexOf('T'));
      } else {
        s.start = t.value + 'T12:00:00.000Z';
      }
      if (durMs > 0) {
        s.end = new Date(new Date(s.start).getTime() + durMs).toISOString();
      } else if (s.end && typeof s.end === 'string' && s.end.indexOf('T') >= 0) {
        s.end = t.value + s.end.slice(s.end.indexOf('T'));
      }
      save(); render();
    } else if (s) t.value = s.d;
  }
});


function applyTheme() {
  let t = QS.get('theme') || (S.settings && S.settings.theme) || 'steel';
  if (t !== 'steel' && t !== 'chalk') t = 'steel';
  document.documentElement.dataset.theme = t;
  const m = { steel: '#0c1117', chalk: '#170b0e' }[t];
  const tc = document.querySelector('meta[name=theme-color]'); if (tc && m) tc.content = m;
}

S = load();
applyTheme();
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
render();
resumeRest();
if (loadWarn) toast('Данные были повреждены. Копия сохранена внутри приложения, сообщи об этом.');
