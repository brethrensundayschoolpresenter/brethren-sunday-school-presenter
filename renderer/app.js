// Sunday School Presenter (kids) — control logic (forked from Brethren Presenter v27, no mic)
const H = window.HYMNS, B = window.BIBLE, BK = window.BOOKS;
const HV = H.filter(h => !h.x);   // hidden hymns ("x":1) stay in the data so numbers never shift, but are not listed or searched
KE.build(HV, B, BK);
const $ = id => document.getElementById(id);

let SET = { font: 'K Baloo', fontB: 'K Naskh', scale: 1, fill: true, pair: 'wblue', c1: '#ffffff', c2: '#bfe3f7', design: 'flowers' };
let HAD_SET = false;   // settings saved before = the app was used before (an update, not a first install)
try { HAD_SET = !!localStorage.getItem('ss_set2'); } catch (e) {}
try { Object.assign(SET, JSON.parse(localStorage.getItem('ss_set2') || '{}')); } catch (e) {}
const st = { tab: 'hymns', cur: null, slides: [], cue: -1, live: -1, liveKey: null, liveSlide: null, out: null, blank: false, browse: null };

// ---------- helpers ----------
const bookName = bi => BK[bi][0];
const arD = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const ref = (b, c, v) => `${bookName(b)} ${arD(c + 1)}: ${arD(v + 1)}`;
const esc = s => String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const plain = s => KE.norm(s);
const verseName = l => l === 'ق' ? 'القرار' : l ? 'العدد ' + l : '';
const slideName = (s, i) => s.label ? (s.label === 'ق' ? 'القرار' : 'العدد ' + arD(s.label)) : 'شريحة ' + arD(i + 1);
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }


const hName = num => H[num - 1].title;
// the two colours that alternate (one of the ready pairs, or his own two colours)
function curPair() { return SET.pair === 'custom' ? { a: SET.c1, b: SET.c2 } : (DECO.PAIRS.find(p => p.id === SET.pair) || DECO.PAIRS[0]); }
function slideColors(i) {
  const im = useImgs();
  if (im) { const g = im[i % im.length]; return { bg: `url("${g.out}") center / cover no-repeat ${g.avg}`, fg: g.fg, img: true }; }
  const p = curPair(), bg = i % 2 ? p.b : p.a; return { bg, fg: DECO.textOn(bg) };
}
// ---------- background pictures (16:9): saved on this computer only, blurred + dimmed so the words read; text colour picked from the result ----------
let BGI = [];
try { BGI = JSON.parse(localStorage.getItem('ss_bgimgs') || '[]'); } catch (e) {}
const saveBGI = () => { try { localStorage.setItem('ss_bgimgs', JSON.stringify(BGI)); return true; } catch (e) { toast('الصورة كبيرة على الحفظ — جرّب صورة تانية'); return false; } };
const useImgs = () => SET.useImg && BGI.length ? BGI : null;
const loadImg = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
// cover-crop to 1920x1080 (the original, kept so «أفتح / أغمق» can redo it)
async function bgOriginal(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImg(url), W = 1920, Hh = 1080, c = document.createElement('canvas'); c.width = W; c.height = Hh;
    const k = Math.max(W / im.naturalWidth, Hh / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
    c.getContext('2d').drawImage(im, (W - w) / 2, (Hh - h) / 2, w, h);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(url); }
}
// blur + a dark veil tinted with the picture's own colour; then the text is white or black, whichever reads better
async function bgProcess(g) {
  const im = await loadImg(g.orig), W = 1920, Hh = 1080, c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const x = c.getContext('2d');
  x.filter = 'blur(16px)'; x.drawImage(im, -48, -27, W + 96, Hh + 54); x.filter = 'none';
  const sm = document.createElement('canvas'); sm.width = 32; sm.height = 18; const sx = sm.getContext('2d'); sx.drawImage(c, 0, 0, 32, 18);
  const px = sx.getImageData(0, 0, 32, 18).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < px.length; i += 4) { r += px[i]; gg += px[i + 1]; b += px[i + 2]; }
  const n = px.length / 4; r /= n; gg /= n; b /= n;
  const dim = g.dim != null ? g.dim : 0.55;                       // 0 = the picture as it is … 0.85 = very dark
  x.fillStyle = `rgba(${Math.round(r * 0.25)},${Math.round(gg * 0.25)},${Math.round(b * 0.25)},${dim})`; x.fillRect(0, 0, W, Hh);
  // measure the middle (where the words are) after the veil
  sx.clearRect(0, 0, 32, 18); sx.drawImage(c, 0, 0, 32, 18); const q = sx.getImageData(6, 4, 20, 10).data; let L = 0;
  for (let i = 0; i < q.length; i += 4) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; L += 0.2126 * f(q[i]) + 0.7152 * f(q[i + 1]) + 0.0722 * f(q[i + 2]); }
  L /= q.length / 4;
  g.fgAuto = L > 0.3 ? '#111111' : '#ffffff';
  if (!g.fgSet) g.fg = g.fgAuto;                                   // a colour he picked himself stays
  g.avg = `rgb(${Math.round(r * (1 - dim * 0.75))},${Math.round(gg * (1 - dim * 0.75))},${Math.round(b * (1 - dim * 0.75))})`;
  g.out = c.toDataURL('image/jpeg', 0.82);
  return g;
}
function bgPick() {
  let inp = $('bgFile');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'bgFile'; inp.accept = 'image/*'; inp.style.display = 'none'; document.body.appendChild(inp); inp.onchange = async () => { const f = inp.files[0]; inp.value = ''; if (f) bgAdd(f); }; }
  inp.click();
}
async function bgAdd(file) {
  try {
    toast('بجهّز الصورة…');
    const g = await bgProcess({ orig: await bgOriginal(file), dim: 0.55 });
    BGI.push(g); if (BGI.length > 2) BGI.shift();
    if (!saveBGI()) { BGI.pop(); return; }
    SET.useImg = true; relook(); bgChips(); toast(BGI.length > 1 ? 'الصورتين هيتبادلوا زي اللونين' : 'الصورة بقت خلفية الترانيم — تقدر تضيف صورة تانية تتبادل معاها');
  } catch (e) { toast('مش قادر أفتح الصورة دي'); }
}
async function bgDim(d) {
  if (!BGI.length) return;
  for (const g of BGI) { g.dim = Math.max(0, Math.min(0.85, +((g.dim != null ? g.dim : 0.55) + d).toFixed(2))); await bgProcess(g); }
  saveBGI(); SET.useImg = true; relook(); bgChips();
}
function bgChips() {
  const el = $('bgChips'); if (!el) return;
  el.innerHTML = BGI.map((g, i) => `<div class="bgw"><span class="bgt${SET.useImg ? ' on' : ''}" data-i="${i}" title="استخدم الصور" style="background:url('${g.out}') center/cover"><b style="color:${g.fg}">أبجد</b><button data-x="${i}" title="شيل الصورة">×</button></span>`
      + `<div class="bgfg"><span>لون الكلام</span><input type="color" data-fg="${i}" value="${g.fg}" title="لون الكلام على الصورة دي"><button data-auto="${i}" class="${g.fgSet ? '' : 'on'}" title="البرنامج بيختار لون الكلام لوحده على حسب الصورة">${g.fgSet ? '' : '✓ '}تلقائي</button></div></div>`).join('')
    + (BGI.length < 2 ? `<button class="bgadd" id="bgAdd">+ ${BGI.length ? 'صورة تانية' : 'صورة'}</button>` : '');
  $('bgDimRow').style.display = BGI.length ? '' : 'none';
  if ($('bgAdd')) $('bgAdd').onclick = bgPick;
  el.querySelectorAll('.bgt').forEach(t => t.onclick = e => { if (e.target.dataset.x != null) return; SET.useImg = true; relook(); bgChips(); });
  el.querySelectorAll('[data-fg]').forEach(c => { c.oninput = () => { const g = BGI[+c.dataset.fg]; g.fg = c.value; g.fgSet = true; SET.useImg = true; relook(); const t = c.closest('.bgw').querySelector('.bgt b'); if (t) t.style.color = c.value; }; c.onchange = () => { saveBGI(); bgChips(); }; });
  el.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { const g = BGI[+b.dataset.auto]; g.fgSet = false; g.fg = g.fgAuto || g.fg; saveBGI(); relook(); bgChips(); });
  el.querySelectorAll('[data-x]').forEach(b => b.onclick = e => { e.stopPropagation(); BGI.splice(+b.dataset.x, 1); saveBGI(); if (!BGI.length) SET.useImg = false; relook(); bgChips(); });
  document.querySelectorAll('[data-pair]').forEach(b => b.classList.toggle('on', !SET.useImg && b.dataset.pair === SET.pair));
}
function hymnSlides(num) {
  const h = H[num - 1];
  return h.slides.map((s, i) => ({
    theme: 'h', ...slideColors(i), seed: num * 31 + i,
    num: s.label === 'ق' ? 'القرار' : (s.label ? 'العدد ' + arD(s.label) : ''),
    html: s.lines.map(l => `<div class="ln" dir="auto">${esc(l)}</div>`).join(''),
    lab: slideName(s, i) + (s.part ? ' (تكملة)' : ''),
    ref: `${hName(num)} · ${slideName(s, i)}`
  })).concat([{ theme: 'b', end: true, html: '', lab: 'شاشة سودا (النهاية)', ref: `${hName(num)} · خلصت — شاشة سودا` }]);
}
function chapterSlides(b, c) {
  return B[b].chapters[c].map((t, v) => ({ theme: 'bible', bg: '#111111', fg: '#ffffff', seed: b * 1000 + c * 50 + v, html: `${esc(t)}<div class="r">${ref(b, c, v)}</div>`, lab: 'آية ' + arD(v + 1), ref: ref(b, c, v) }));
}
function decoOf(s) { return s && !s.end && !s.img ? DECO.svg(SET.design, s.seed || 0, s.bg) : ''; }
function paint(el, s) {
  el.classList.remove('th-w', 'th-b', 'th-bible', 'th-h'); el.style.background = ''; el.style.color = '';
  if (!s) { el.innerHTML = ''; return; }
  if (s.end) { el.classList.add('th-b'); el.innerHTML = el.id === 'cueScr' ? '<div class="endlab">آخر الترنيمة — الشاشة هتبقى سودا</div>' : ''; return; }
  el.classList.add('th-' + s.theme); if (s.bg) { el.style.background = s.bg; el.style.color = s.fg; }
  el.innerHTML = decoOf(s) + (s.num ? `<span class="vn">${s.num}</span>` : '') + `<div class="tx">${s.html}</div>`;
  if (el.classList.contains('screen')) fitBox(el);
}
// suggested Bible story + the hymn's idea + the verses its words echo (button "قصة مقترحة" turns it on/off)
// HDEEP[num] = {i: idea, v: [[ref, phrase]], s: [title, ref, why]} — refs like "لو 15 20-24" (Van Dyke abbreviations)
function deepRef(r) {
  const m = String(r || '').match(/^(\S+) (\d+) (\d+)(?:-(\d+))?$/); if (!m) return null;
  const b = bookByName(m[1]); if (b < 0 || !B[b]) return null;
  const c = +m[2] - 1, v = +m[3] - 1, v2 = m[4] ? +m[4] - 1 : v;
  if (!B[b].chapters[c] || B[b].chapters[c][v] === undefined) return null;
  return { b, c, v, v2 };
}
function refTxt(p) { return ref(p.b, p.c, p.v) + (p.v2 > p.v ? '–' + arD(p.v2 + 1) : ''); }
function showStory(num) {
  const el = $('story'), d = num && window.HDEEP ? window.HDEEP[num] : null;
  const old = !d && num && window.HSTORY && window.STORIES ? window.STORIES[window.HSTORY[num]] : null;
  if ((!d && !old) || SET.story === false) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = ''; el.onclick = null; el.title = '';
  if (old) {
    el.innerHTML = `<div class="sth st-open"><span class="hl">قصة مقترحة</span> <b>${esc(old.name)}</b> <span class="stref">${esc(old.disp)} ‹ افتحها</span></div><div class="stt">${esc(old.text)}</div>`;
    el.querySelector('.st-open').onclick = () => openStory(old); return;
  }
  const sp = deepRef(d.s[1]);
  const vs = (d.v || []).map(([r, ph]) => [deepRef(r), ph]).filter(x => x[0]);
  el.innerHTML = `<div class="sti"><span class="hl">فكرة الترنيمة</span> ${esc(d.i)}</div>`
    + (vs.length ? `<div class="stv"><span class="hl">آيات في الترنيمة</span> ${vs.map(([p, ph], k) => `<a class="vch" data-k="${k}" title="افتح الآية في الكتاب المقدس">«${esc(ph)}» <small>${esc(refTxt(p))}</small></a>`).join('')}</div>` : '')
    + (sp ? `<div class="sts st-open" title="اضغط لفتح القصة في الكتاب المقدس من أول آية"><div class="sth"><span class="hl">قصة مقترحة</span> <b>${esc(d.s[0])}</b> <span class="stref">${esc(refTxt(sp))} ‹ افتحها</span></div><div class="stt">${esc(d.s[2])}</div></div>` : '');
  el.querySelectorAll('.vch').forEach(a => a.onclick = () => openAt(vs[+a.dataset.k][0], vs[+a.dataset.k][1]));
  const so = el.querySelector('.st-open'); if (so) so.onclick = () => openAt(sp, d.s[0]);
}
// open a Bible passage (from a hymn) on its first verse, remembering the hymn so "رجوع للترنيمة" brings it back
function openAt(p, label) {
  if (!p) { toast('مش لاقي الشاهد ده'); return; }
  if (st.cur && st.cur.kind === 'hymn') st.back = { num: st.cur.num, cue: st.cue, tab: st.tab, q: $('q').value, story: label };
  st.sug = { b: p.b, c: p.c, v: p.v, v2: p.v2 };    // these verses stay highlighted (like the mobile app)
  setTab('bible'); browseChapters(p.b); loadChapter(p.b, p.c, p.v);
  const n = $('slides').children[p.v]; if (n) n.scrollIntoView({ block: 'start' });
}
function openStory(story) {
  const p = KE.parse(story.ref.replace(/(\d+):(\d+)/, '$1 $2'), H, B);
  if (!p || p.type !== 'verse') { toast('مش لاقي الشاهد ده'); return; }
  openAt({ b: p.b, c: p.c, v: p.v, v2: p.v }, story.name);
}
function goBack() {
  const b = st.back; if (!b) return; st.back = null;
  setTab(b.tab === 'bible' ? 'hymns' : b.tab);
  if (b.q && (b.tab === 'hymns')) { $('q').value = b.q; search(); }
  loadHymn(b.num, Math.max(0, b.cue));
}
// lines stay whole: shrink the words until they fit the box (preview screens + slide cards)
function fitBox(el) {
  const tx = el.querySelector('.tx'); if (!tx) return;
  tx.style.fontSize = ''; const base = parseFloat(getComputedStyle(tx).fontSize);
  const padW = el.clientWidth - 24, padH = el.classList.contains('screen') ? el.clientHeight - 24 : 1e9;
  let k = 1; while (k > 0.4 && (tx.scrollWidth > padW || tx.scrollHeight > padH)) { k -= 0.05; tx.style.fontSize = (base * k) + 'px'; }
}
// ---------- load ----------
function loadHymn(num, cueIdx, hit) {
  st.back = null; st.hit = hit == null ? -1 : hit;
  st.cur = { kind: 'hymn', num }; st.slides = hymnSlides(num);
  const tp = hymnTopics(num);
  const ti = (window.TOPICS || []).map((t, i) => t.nums.includes(num) ? i : -1).filter(i => i >= 0);
  $('curTitle').innerHTML = `<span class="hl">${esc(hName(num))}</span>` + (ti.length ? `<small class="tps">${ti.map(i => `<a class="tpl" data-ti="${i}" title="افتح الموضوع ده">${esc(window.TOPICS[i].name)}</a>`).join(' · ')}</small>` : '');
  $('curTitle').querySelectorAll('.tpl').forEach(a => a.onclick = e => { e.stopPropagation(); openTopic(+a.dataset.ti); });
  addPlanBtn();
  showStory(num);
  renderSlides(); setCue(cueIdx || 0);
}
function loadChapter(b, c, v) {
  if (st.sug && (st.sug.b !== b || st.sug.c !== c)) st.sug = null;
  st.cur = { kind: 'bible', b, c }; st.slides = chapterSlides(b, c);
  $('curTitle').innerHTML = `<span class="hl">${bookName(b)} ${arD(c + 1)}</span>` + (st.back ? `<button class="btn backbtn" id="backBtn"><svg class="ic"><use href="#i-prev"/></svg>رجوع للترنيمة: ${esc(hName(st.back.num))}</button>` : '');
  if (st.back) $('backBtn').onclick = goBack;
  addPlanBtn();
  showStory(null);
  renderSlides(); setCue(v || 0);
}
const key = () => JSON.stringify(st.cur);
function renderSlides() {
  const el = $('slides'); el.innerHTML = '';
  el.classList.toggle('list', !!(st.cur && st.cur.kind === 'bible'));   // verses = lines one under the other
  st.slides.forEach((s, i) => {
    const d = document.createElement('div'); d.className = 'slide th-' + s.theme + (s.end ? ' end' : '');
    if (s.bg && !s.end) { d.style.background = s.bg; d.style.color = s.fg; }
    d.innerHTML = (s.end ? '' : decoOf(s)) + `<span class="lab">${s.lab}</span><div class="tx">${s.html}</div>`;
    d.title = 'ضغطة = جهّزها (ولو الترنيمة معروضة تظهر على طول) · ضغطتين = اعرضها';
    if (st.cur && st.cur.kind === 'hymn' && i === st.hit) d.classList.add('hit');
    if (st.cur && st.cur.kind === 'bible' && st.sug && st.sug.b === st.cur.b && st.sug.c === st.cur.c && i >= st.sug.v && i <= st.sug.v2) d.classList.add('sug');
    d.onclick = () => pick(i);
    d.ondblclick = () => { setCue(i); play(); };
    el.appendChild(d);
  });
  if (!el.classList.contains('list')) requestAnimationFrame(() => [...el.children].forEach(fitBox));
  mark();
}
function setCue(i) {
  if (i < 0 || i >= st.slides.length) return;
  st.cue = i; paint($('cueScr'), st.slides[i]); $('cueRef').textContent = st.slides[i].ref; mark();
  const n = $('slides').children[i]; if (n) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function mark() {
  const same = st.liveKey === key();
  [...$('slides').children].forEach((d, i) => { d.classList.toggle('cue', i === st.cue); d.classList.toggle('onair', same && i === st.live && !st.blank); });
}

// ---------- live / output ----------
const onAir = () => st.liveKey === key() && st.live >= 0 && !st.blank;
function step(d) {
  if (onAir()) { const i = st.live + d; if (i < 0 || i >= st.slides.length) { toast(d > 0 ? 'دي آخر شريحة' : 'دي أول شريحة'); return; } setCue(i); play(); }
  else setCue(st.cue + d);
}
function pick(i) { setCue(i); if (onAir()) play(); }
// how to get a second screen, per system (Mac has no ويندوز + P)
const EXTEND_TIP = window.bp && window.bp.platform === 'darwin' ? 'وصّل البروجكتور واعمل Extend من System Settings › Displays، وشاشة العرض هتفتح عليه لوحدها' : 'وصّل البروجكتور واعمل Extend (ويندوز + P) وشاشة العرض هتفتح عليه لوحدها';
function play() {
  if (st.cue < 0 || !st.slides[st.cue]) { toast('اختار حاجة الأول'); return; }
  const s = st.slides[st.cue];
  st.live = st.cue; st.liveKey = key(); st.liveSlide = s; st.blank = false; $('blankBtn').classList.remove('on');
  paint($('liveScr'), s); $('liveRef').textContent = s.ref;
  sendOut(s); mark(); record(s); window._lastShown = s.ref;
  if (!outputReady() && !play.told) { play.told = true; toast('اتعرضت هنا بس — ' + EXTEND_TIP); }   // once per session (people rehearse with no projector)
  if (st.cue + 1 < st.slides.length) setCue(st.cue + 1);
}
function blank() {
  st.blank = !st.blank; const s = st.blank ? null : st.liveSlide;
  paint($('liveScr'), s); sendOut(s); $('blankBtn').classList.toggle('on', st.blank); mark();
  toast(st.blank ? 'الشاشة اتخفت' : 'الكلام رجع على الشاشة');
}
const APP = !!window.bp;
let outOpen = false;
function openOut() {
  if (APP) { window.bp.openOutput(); return; }
  st.out = window.open('', 'ss_out', 'width=1280,height=720');
  if (!st.out) { toast('المتصفح منع الشباك — اسمح بالـ popups'); return; }
  const d = st.out.document;
  d.open(); d.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><base href="${location.href}"><link rel="stylesheet" href="fonts/fonts.css"><title>شاشة العرض</title><style>
  html,body{margin:0;height:100%;background:#000;color:#fff;overflow:hidden}
  body.th-w{background:#fff}
  #t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6vh 7vw;font-family:var(--f),sans-serif;font-size:calc(var(--s) * 6.5vh);font-weight:600;line-height:1.8;transition:opacity .25s}
  #t.th-w,#t.th-b{font-size:calc(var(--s) * 8vh);font-weight:800;line-height:1.55}
  #t.th-w{background:#fff;color:#000}#t.th-b{background:#000;color:#fff}
  .vn{position:absolute;top:2.5vh;left:4vw;color:#e00;font-weight:800;font-size:.55em}
  .r{font-size:.5em;color:#999;margin-top:1.2em}
  #hint{position:fixed;inset:auto 0 0 0;padding:14px;background:#222;color:#ddd;font:600 16px "K Cairo",sans-serif;text-align:center}
  </style></head><body><div id="t"></div><div id="hint">اسحب الشباك ده على شاشة البروجكتور، وبعدين اضغط هنا مرتين أو زرار F عشان يملا الشاشة</div></body></html>`); d.close();
  const fs = () => { st.out.document.documentElement.requestFullscreen().catch(() => {}); const h = st.out.document.getElementById('hint'); if (h) h.remove(); st.out.document.body.style.cursor = 'none'; };
  st.out.document.addEventListener('dblclick', fs);
  st.out.document.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') fs(); else onKey(e); });
  outOpen = true; applySet();
  sendOut(st.blank ? null : st.liveSlide);
  $('outLbl').textContent = 'شاشة العرض مفتوحة';
}
function sendOut(s) {
  if (APP) { window.bp.slide(s ? { theme: s.theme, bg: s.bg || '', fg: s.fg || '', deco: decoOf(s), num: s.num || '', html: s.html, end: !!s.end } : null); return; }
  if (!st.out || st.out.closed) return;
  const t = st.out.document.getElementById('t'); if (!t) return;
  t.style.opacity = 0;
  setTimeout(() => { paint(t, s); st.out.document.body.className = s && !s.end ? 'th-' + s.theme : ''; t.style.opacity = 1; }, 180);
}
const outputReady = () => APP ? outOpen : !!(st.out && !st.out.closed);
if (APP) {
  document.documentElement.classList.toggle('mac', window.bp.platform === 'darwin');
  window.bp.on('status', s => {
    outOpen = s.outputOpen;
    // the projector screen opens by itself when a projector is connected (Extend); without one this button only opens a test window
    $('outLbl').textContent = s.outputOpen ? (s.projector ? 'شغالة على البروجكتور' : 'شاشة التجربة مفتوحة') : (s.projector ? 'افتح على البروجكتور' : 'تجربة شاشة العرض');
    $('openOut').title = s.projector ? 'شاشة العرض بتفتح على البروجكتور لوحدها' : 'مفيش بروجكتور متوصل — الزرار ده بيفتح شاشة تجربة. لما توصّل البروجكتور واعمل Extend ' + (window.bp.platform === 'darwin' ? 'من System Settings › Displays' : '(ويندوز + P)') + ' شاشة العرض هتفتح عليه لوحدها';
    $('openOut').classList.toggle('primary', !s.outputOpen);
  });
  window.bp.on('key', k => onKey({ key: k.key, code: k.code, target: document.body, preventDefault() {} }));
}

// ---------- his own fonts (a .ttf/.otf file from this computer, e.g. a font he downloaded himself): saved on this computer only ----------
let UF = []; try { UF = JSON.parse(localStorage.getItem('ss_ufonts') || '[]'); } catch (e) { UF = []; }
const ufFam = f => 'U ' + f.id;
async function ufRegister(f, doc) {
  try { const ff = new FontFace(ufFam(f), `url(${f.data})`); await ff.load(); (doc || document).fonts.add(ff); return true; } catch (e) { return false; }
}
function ufMenus() {
  const opt = f => `<option value="${ufFam(f)}">${esc(f.name)}</option>`;
  $('ufontsG').innerHTML = UF.map(opt).join(''); $('ufontsGB').innerHTML = UF.map(opt).join('');
  $('ufontsG').style.display = $('ufontsGB').style.display = UF.length ? '' : 'none';
  $('ufList').innerHTML = UF.map(f => `<span class="uf" style="font-family:'${ufFam(f)}'">${esc(f.name)}<button data-uf="${f.id}" title="شيل الخط ده">×</button></span>`).join('');
  $('ufList').querySelectorAll('[data-uf]').forEach(b => b.onclick = () => {
    UF = UF.filter(f => f.id !== b.dataset.uf); try { localStorage.setItem('ss_ufonts', JSON.stringify(UF)); } catch (e) {}
    const gone = x => x && x.startsWith('U ') && !UF.some(f => ufFam(f) === x);
    if (gone(SET.font)) SET.font = 'K Baloo'; if (gone(SET.fontB)) SET.fontB = 'K Naskh';
    ufMenus(); relook(); toast('الخط اتشال');
  });
}
function ufPick() {
  let inp = $('ufFile');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'ufFile'; inp.accept = '.ttf,.otf,.woff,.woff2'; inp.style.display = 'none'; document.body.appendChild(inp); inp.onchange = () => { if (inp.files[0]) ufAdd(inp.files[0]); inp.value = ''; }; }
  inp.click();
}
async function ufAdd(file) {
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) { toast('اختار ملف خط (.ttf أو .otf)'); return; }
  if (file.size > 3 * 1024 * 1024) { toast('ملف الخط كبير أوي (أكتر من 3 ميجا) — اختار وزن واحد بس من الخط'); return; }
  const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(file); });
  const f = { id: Date.now().toString(36), name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 40), data };
  if (!data || !(await ufRegister(f))) { toast('الملف ده مش خط ينفع يتفتح'); return; }
  UF.push(f);
  try { localStorage.setItem('ss_ufonts', JSON.stringify(UF)); } catch (e) { UF.pop(); toast('مفيش مكان يتحفظ فيه الخط ده — شيل خط تاني الأول'); return; }
  SET.font = ufFam(f); ufMenus(); relook(); toast('الخط «' + f.name + '» اتضاف واتختار للترانيم');
}
$('ufAdd').onclick = ufPick; ufMenus();
UF.forEach(f => ufRegister(f).then(() => { if (SET.font === ufFam(f) || SET.fontB === ufFam(f)) applySet(); }));
if ((SET.font || '').startsWith('U ') && !UF.some(f => ufFam(f) === SET.font)) SET.font = 'K Baloo';
if ((SET.fontB || '').startsWith('U ') && !UF.some(f => ufFam(f) === SET.fontB)) SET.fontB = 'K Naskh';
// ---------- font / size ----------
function applySet() {
  const used = UF.filter(f => ufFam(f) === SET.font || ufFam(f) === SET.fontB).map(f => ({ fam: ufFam(f), data: f.data }));
  if (APP) window.bp.style({ font: SET.font, fontB: SET.fontB, scale: SET.scale, fill: SET.fill !== false, ufonts: used });
  $('storyBtn').classList.toggle('on', SET.story !== false);
  $('fillBtn').textContent = 'ملء الشاشة: ' + (SET.fill !== false ? 'شغال' : 'مقفول');
  for (const d of [document, st.out && !st.out.closed ? st.out.document : null]) if (d) { d.documentElement.style.setProperty('--f', `"${SET.font}"`); d.documentElement.style.setProperty('--fb', `"${SET.fontB}"`); d.documentElement.style.setProperty('--s', SET.scale); }
  $('fprev').style.fontFamily = `"${SET.font}"`; $('fbprev').style.fontFamily = `"${SET.fontB}"`;
  $('fontSel').value = SET.font; $('fontBSel').value = SET.fontB; $('szVal').textContent = Math.round(SET.scale * 100) + '%';
  document.querySelectorAll('[data-pair]').forEach(b => b.classList.toggle('on', !(SET.useImg && BGI.length) && b.dataset.pair === SET.pair));
  document.querySelectorAll('[data-design]').forEach(b => b.classList.toggle('on', b.dataset.design === SET.design));
  $('c1').value = SET.c1; $('c2').value = SET.c2;
  try { localStorage.setItem('ss_set2', JSON.stringify(SET)); } catch (e) {}
}
// theme / decoration changed: rebuild the open hymn and repaint what is on the screen
function relook() {
  applySet();
  if (st.cur && st.cur.kind === 'hymn') { const c = st.cue, l = st.live, same = st.liveKey === key(); st.slides = hymnSlides(st.cur.num); renderSlides(); setCue(Math.max(0, c)); if (same && l >= 0) { st.liveSlide = st.slides[l]; if (!st.blank) { paint($('liveScr'), st.liveSlide); sendOut(st.liveSlide); } } }
  else if (st.cur) { renderSlides(); setCue(Math.max(0, st.cue)); if (st.liveSlide && !st.blank) { paint($('liveScr'), st.liveSlide); sendOut(st.liveSlide); } }
}
$('fontSel').onchange = e => { SET.font = e.target.value; applySet(); };
$('fontBSel').onchange = e => { SET.fontB = e.target.value; applySet(); };
// colour pairs + designs (buttons are built here)
$('pairChips').innerHTML = DECO.PAIRS.map(p => `<button data-pair="${p.id}"><i style="background:${p.a}"></i><i style="background:${p.b}"></i>${p.name}</button>`).join('');
$('designChips').innerHTML = DECO.DESIGNS.map(d => `<button data-design="${d.id}">${d.name}</button>`).join('');
document.querySelectorAll('[data-pair]').forEach(b => b.onclick = () => { SET.pair = b.dataset.pair; SET.useImg = false; relook(); bgChips(); });
$('bgDk').onclick = () => bgDim(0.1); $('bgLt').onclick = () => bgDim(-0.1);
bgChips();
document.querySelectorAll('[data-design]').forEach(b => b.onclick = () => { SET.design = b.dataset.design; relook(); });
$('c1').oninput = e => { SET.c1 = e.target.value; SET.pair = 'custom'; SET.useImg = false; relook(); bgChips(); };
$('c2').oninput = e => { SET.c2 = e.target.value; SET.pair = 'custom'; SET.useImg = false; relook(); bgChips(); };
$('fillBtn').onclick = () => { SET.fill = SET.fill === false; applySet(); toast(SET.fill ? 'الكلام هيكبر لحد ما يملا الشاشة' : 'الكلام بالحجم العادي'); };
$('storyBtn').onclick = () => { SET.story = SET.story === false; applySet(); if (st.cur && st.cur.kind === 'hymn') showStory(st.cur.num); toast(SET.story ? 'القصة المقترحة ظاهرة تحت كل ترنيمة' : 'القصة المقترحة اتقفلت'); };
$('szUp').onclick = () => { SET.scale = Math.min(1.6, +(SET.scale + 0.1).toFixed(1)); applySet(); };
$('szDn').onclick = () => { SET.scale = Math.max(0.6, +(SET.scale - 0.1).toFixed(1)); applySet(); };
$('setBtn').onclick = e => { e.stopPropagation(); $('pop').classList.toggle('open'); };
$('pop').onclick = e => e.stopPropagation();
document.addEventListener('click', () => $('pop').classList.remove('open'));

// ---------- library ----------
function item(no, title, sub, fn) {
  const d = document.createElement('div'); d.className = 'item';
  d.innerHTML = `${no !== '' && typeof no !== 'number' ? `<div class="no">${no}</div>` : ''}<div><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}</div>`;
  d.onclick = () => { [...$('results').querySelectorAll('.item')].forEach(x => x.classList.remove('sel')); d.classList.add('sel'); fn(); };
  $('results').appendChild(d); return d;
}
// result with the line that matched (the typed piece highlighted)
function itemH(title, subHtml, fn) { const d = item('', title, '', fn); if (subHtml) { const s = document.createElement('div'); s.className = 's'; s.innerHTML = subHtml; d.querySelector('div').appendChild(s); } return d; }
function hiLine(lines, q) {
  const qn = KE.norm(q); let best = lines[0] || '';
  for (const l of lines) if (KE.norm(l).includes(qn)) { best = l; break; }
  // highlight by matching the normalised text back onto the original letters
  const map = []; let flat = '';
  for (let i = 0; i < best.length; i++) { const c = KE.norm(best[i]); if (c && c !== ' ') { map.push(i); flat += c; } else if (best[i] === ' ' && flat && flat[flat.length - 1] !== ' ') { map.push(i); flat += ' '; } }
  const at = flat.indexOf(qn);
  if (at < 0 || !qn) return esc(best.slice(0, 80));
  const a0 = map[at], a1 = map[Math.min(map.length - 1, at + qn.length - 1)] + 1;
  return esc(best.slice(0, a0)) + '<mark>' + esc(best.slice(a0, a1)) + '</mark>' + esc(best.slice(a1));
}
function sec(t) { const d = document.createElement('div'); d.className = 'sec'; d.textContent = t; $('results').appendChild(d); }
function empty(t) { const d = document.createElement('div'); d.className = 'empty'; d.innerHTML = t; $('results').appendChild(d); }
function crumb(parts) {
  const c = $('crumb'); c.innerHTML = '';
  parts.forEach((p, i) => {
    if (i) { const s = document.createElement('span'); s.textContent = '‹'; c.appendChild(s); }
    if (p.fn) { const b = document.createElement('button'); b.textContent = p.t; b.onclick = p.fn; c.appendChild(b); }
    else { const s = document.createElement('span'); s.textContent = p.t; c.appendChild(s); }
  });
}

function browseBooks() {
  st.browse = null; crumb([]); $('results').innerHTML = '';
  const t = SET.testament || 'new';
  const seg = document.createElement('div'); seg.className = 'seg testament';
  [['old', 'العهد القديم'], ['new', 'العهد الجديد']].forEach(([k, l]) => {
    const b = document.createElement('button'); b.textContent = l; if (k === t) b.className = 'on';
    b.onclick = () => { SET.testament = k; applySet(); browseBooks(); };
    seg.appendChild(b);
  });
  $('results').appendChild(seg);
  if (t === 'old') grid(BK.slice(0, 39).map((n, i) => [n[0], () => browseChapters(i)]), true);
  else grid(BK.slice(39).map((n, i) => [n[0], () => browseChapters(i + 39)]), true);
}
function browseChapters(b) {
  st.browse = b; $('results').innerHTML = '';
  crumb([{ t: 'كل الأسفار', fn: browseBooks }, { t: bookName(b) }]);
  sec('اختار الإصحاح');
  grid(B[b].chapters.map((_, c) => [arD(c + 1), () => { loadChapter(b, c, 0); }]));
}
function grid(items, wide) {
  const g = document.createElement('div'); g.className = 'grid';
  if (wide) g.style.gridTemplateColumns = 'repeat(2,1fr)';
  items.forEach(([t, fn]) => { const b = document.createElement('button'); b.textContent = t; b.onclick = fn; g.appendChild(b); });
  $('results').appendChild(g);
}

// any script's digits -> 0-9, and drop invisible direction marks the Arabic keyboard can add
const latinDigits = s => String(s).replace(/\p{Cf}/gu, '').replace(/\p{Nd}/gu, d => String(d.codePointAt(0) & 0xF));
function search() {
  const q = latinDigits($('q').value.trim()); $('results').innerHTML = ''; $('results').scrollTop = 0;
  if (st.tab === 'today') { crumb([]); showToday(); return; }
  if (st.tab === 'plan') { crumb([]); showPlanTab(); return; }
  if (st.tab === 'history') { showHistory(); return; }
  if (st.tab === 'topics') { showTopics(); return; }
  if (st.tab === 'hymns') {
    crumb([]);
    if (!q) { alphaList(HV.map(h => h.num)); return; }
    // names first, then any piece of the words, then the looser word-by-word match
    const seen = new Set(), tit = KE.searchTitles(q, 15), frag = KE.searchFragments(q, 60), res = KE.searchHymnText(q, 60);
    if (!tit.length && !frag.length && !res.length) { empty('مالقيتش ترنيمة فيها الكلام ده<br>جرّب كلمة تانية'); return; }
    const snip = (num, i) => { const s = H[num - 1].slides[i]; return s ? hiLine(s.lines, q) : ''; };
    tit.filter(r => r.score >= 1).forEach(r => { seen.add(r.num); item('', hName(r.num), '', () => loadHymn(r.num)); });
    frag.forEach(r => { if (seen.has(r.num)) return; seen.add(r.num); itemH(hName(r.num), snip(r.num, r.i), () => loadHymn(r.num, 0, r.i)); });
    tit.filter(r => r.score < 1).forEach(r => { if (seen.has(r.num)) return; seen.add(r.num); item('', hName(r.num), '', () => loadHymn(r.num)); });
    res.forEach(r => {
      if (seen.has(r.num) || seen.size >= 60) return; seen.add(r.num);
      itemH(hName(r.num), snip(r.num, r.i), () => loadHymn(r.num, 0, r.i));
    });
  } else {
    if (!q) { browseBooks(); return; }
    crumb([{ t: 'كل الأسفار', fn: () => { $('q').value = ''; browseBooks(); } }, { t: 'نتايج البحث' }]);
    const ab = abbrevRef(q);
    if (ab) { sec('الشاهد'); item('', ref(ab.b, ab.c, ab.v), plain(B[ab.b].chapters[ab.c][ab.v]).slice(0, 90) + ' — دوس Enter تعرضها', () => openRef(ab)); }
    const p = ab ? null : KE.parse(q, H, B);
    if (p && p.type === 'verse') { sec('الشاهد'); item('', ref(p.b, p.c, p.v), plain(B[p.b].chapters[p.c][p.v]).slice(0, 90), () => loadChapter(p.b, p.c, p.v)); }
    const res = KE.searchBible(q, 40);
    if (res.length) sec('آيات فيها الكلام ده');
    res.forEach(r => item('', ref(r.b, r.c, r.v), plain(B[r.b].chapters[r.c][r.v]).slice(0, 110), () => loadChapter(r.b, r.c, r.v)));
    if (!res.length && !ab && !(p && p.type === 'verse')) empty('مالقيتش حاجة<br>جرّب كلمة تانية أو اكتب الشاهد زي: يوحنا 3 16');
  }
}
// alphabetical list with a highlighted letter for each group (no numbers)
const firstLetter = t => { const c = KE.norm(t).charAt(0); return /[a-z]/.test(c) ? 'English' : c || '#'; };
// inside each letter the newest hymns come first (date of their PowerPoint), then A→Z
const ABC = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي', LRANK = l => { const i = ABC.indexOf(l); return i < 0 ? (l === 'English' ? 99 : 98) : i; };   // letters in Arabic alphabet order (not by hymn number)
function alphaList(nums) {
  nums = nums.filter(n => H[n - 1] && !H[n - 1].x);   // a hidden hymn never shows, even if a topic still has it
  const L0 = n => firstLetter(H[n - 1].title), D0 = n => H[n - 1].d || '';
  const sorted = nums.slice().sort((a, b) => a - b), order = [...new Set(sorted.map(L0))].sort((x, y) => LRANK(x) - LRANK(y));
  sorted.sort((a, b) => order.indexOf(L0(a)) - order.indexOf(L0(b)) || (D0(b) > D0(a) ? 1 : D0(b) < D0(a) ? -1 : a - b));
  let cur = null;
  sorted.forEach(n => {
    const L = firstLetter(H[n - 1].title);
    if (L !== cur) { cur = L; const d = document.createElement('div'); d.className = 'letter'; d.innerHTML = `<span>${L}</span>`; $('results').appendChild(d); }
    item('', hName(n), '', () => loadHymn(n));
  });
}
// topics (المواضيع) — based on the Bible: sections → topics (each with its key verse) → hymns A→Z
function topicVerse(t) {
  if (!t.ref) return null;
  const p = KE.parse(t.ref.replace(/(\d+):(\d+)/, '$1 $2'), H, B);
  return p && p.type === 'verse' ? p : null;
}
function showTopics(open) {
  const T = window.TOPICS || [];
  if (open != null) {
    $('results').scrollTop = 0;
    const t = T[open]; crumb([{ t: 'كل المواضيع', fn: () => { $('results').innerHTML = ''; showTopics(); } }, { t: t.name }]);
    alphaList(t.nums); return;
  }
  crumb([]);
  let sec = null;
  T.forEach((t, i) => {
    if (!t.nums.length) return;
    if (t.section !== sec) { sec = t.section; const d = document.createElement('div'); d.className = 'letter'; d.innerHTML = `<span>${esc(sec)}</span>`; $('results').appendChild(d); }
    item('', t.name, arD(t.nums.filter(n => H[n - 1] && !H[n - 1].x).length) + ' ترنيمة', () => { $('results').innerHTML = ''; showTopics(i); });
  });
}
// a topic name under the hymn title is a link: opens that topic in the topics tab
function openTopic(i) { setTab('topics'); $('results').innerHTML = ''; showTopics(i); }
// the topics a hymn belongs to (shown under its title)
function hymnTopics(num) { return (window.TOPICS || []).filter(t => t.nums.includes(num)).map(t => t.name); }
function setTab(t) {
  st.tab = t; st.kbAt = null; document.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === t));
  $('q').value = ''; $('q').placeholder = t === 'hymns' ? 'اسم الترنيمة أو أي كلام منها…' : 'اكتب الشاهد (يوحنا 3 16) أو أي كلام من الآية…';
  document.querySelector('.search').style.display = (t === 'today' || t === 'history' || t === 'topics' || t === 'plan') ? 'none' : '';
  search(); if (t === 'hymns' || t === 'bible') $('q').focus();
}

// ---------- meetings: اجتماع اليوم + السجل ----------
// every hymn / verse shown goes into today's meeting (named by the computer's date), saved to disk
let MEET = { meetings: [] }, meetSaveT = null;
const pad = n => String(n).padStart(2, '0');
const todayId = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const meetTitle = d => 'خدمة ' + d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function curMeeting() {
  const id = todayId();
  let m = MEET.meetings.find(x => x.day === id && !x.closed);
  if (!m) { const d = new Date(); m = { id: id + '-' + d.getTime(), day: id, title: meetTitle(d), started: d.getTime(), items: [] }; MEET.meetings.unshift(m); }
  return m;
}
function saveMeet() {
  clearTimeout(meetSaveT);
  meetSaveT = setTimeout(() => {
    if (window.bp && window.bp.meetSave) window.bp.meetSave(MEET);
    else try { localStorage.setItem('kenesa_meet', JSON.stringify(MEET)); } catch (e) {}
  }, 400);
}
async function loadMeet() {
  let d = null;
  if (window.bp && window.bp.meetLoad) d = await window.bp.meetLoad();
  else try { d = JSON.parse(localStorage.getItem('kenesa_meet') || 'null'); } catch (e) {}
  if (d && Array.isArray(d.meetings)) MEET = d;
  if (st.tab === 'today' || st.tab === 'history') search();
}
function record(s) {
  if (!s || s.end || !st.cur) return;
  const m = curMeeting(), last = m.items[m.items.length - 1], t = Date.now();
  if (st.cur.kind === 'hymn') {
    const lab = String(st.live);
    if (last && last.k === 'h' && last.num === st.cur.num) { if (!last.v.includes(lab)) last.v.push(lab); last.t2 = t; }
    else m.items.push({ k: 'h', num: st.cur.num, title: H[st.cur.num - 1].title, v: [lab], t, t2: t });
  } else {
    const b = st.cur.b, c = st.cur.c, v = st.live;
    if (last && last.k === 'b' && last.b === b && last.c === c && v >= last.from - 1 && v <= last.to + 1) { last.from = Math.min(last.from, v); last.to = Math.max(last.to, v); last.t2 = t; }
    else m.items.push({ k: 'b', b, c, from: v, to: v, t, t2: t });
  }
  saveMeet();
  if (st.tab === 'today') search();
}
const hymnOf = it => { if (it.title) { const h = H.find(x => x.title === it.title); if (h) return h.num; } return H[it.num - 1] ? it.num : 0; };
const timeOf = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
function itemLabel(it) {
  const noT = x => String(x).replace(/[\u064B-\u0652\u0670]/g, '');
  if (it.k === 'h') { const n = hymnOf(it); if (!n) return ['ترنيمة اتشالت', '']; return [noT(H[n - 1].title), it.v.length + (it.v.length === 1 ? ' شريحة' : ' شرايح')]; }
  const r = bookName(it.b) + ' ' + (it.c + 1) + ':' + (it.from + 1) + (it.to > it.from ? '-' + (it.to + 1) : '');
  return [r, noT(B[it.b].chapters[it.c][it.from]).slice(0, 70)];
}
function openItem(it) {
  if (it.k === 'h') { const n = hymnOf(it); if (n) loadHymn(n, Math.max(0, +it.v[0] || 0)); }
  else loadChapter(it.b, it.c, it.from);
}
function listItems(m) {
  if (!m.items.length) { empty('<b>🌱</b>لسه مفيش حاجة اتعرضت النهارده'); return; }
  m.items.forEach(it => { const [t, s] = itemLabel(it); const d = item('', t, s, () => openItem(it)); const w = document.createElement('span'); w.className = 'when'; w.textContent = timeOf(it.t); d.appendChild(w); });
}
// ---------- «فرصة» prepared on the mobile web app («فرصي»), opened here from the file the servant sends himself ----------
let PLAN = null;
try { PLAN = JSON.parse(localStorage.getItem('ss_plan') || 'null'); } catch (e) {}
const savePlan = () => { try { if (PLAN) localStorage.setItem('ss_plan', JSON.stringify(PLAN)); else localStorage.removeItem('ss_plan'); } catch (e) {} };
const MON_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const planDate = s => { const [y, m, d] = String(s || '').split('-').map(Number); return y ? arD(d) + ' ' + MON_AR[m - 1] + ' ' + arD(y) : ''; };
const planName = f => f.title || 'فرصة ' + planDate(f.date);
function planPick() {
  let inp = $('planFile');
  if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'planFile'; inp.accept = '.json,application/json'; inp.style.display = 'none'; document.body.appendChild(inp); inp.onchange = () => { if (inp.files[0]) planFromFile(inp.files[0]); inp.value = ''; }; }
  inp.click();
}
async function planFromFile(file) {
  let list = null;
  try { const d = JSON.parse(await file.text()); if (d && d.app === 'ssw-forsa' && Array.isArray(d.forsas)) list = d.forsas.filter(f => f && Array.isArray(f.items)); } catch (e) {}
  if (!list || !list.length) { toast('الملف ده مش فرصة من «فرصي» على الموبايل'); return; }
  setTab('plan');
  if (list.length === 1) { planUse(list[0]); return; }
  // a full backup: choose which فرصة (the next one first)
  const t = todayId(), sorted = list.slice().sort((a, b) => (a.date >= t) !== (b.date >= t) ? (a.date >= t ? -1 : 1) : a.date >= t ? (a.date > b.date ? 1 : -1) : (a.date < b.date ? 1 : -1));
  $('results').innerHTML = ''; crumb([{ t: 'فرصي', fn: () => search() }, { t: 'اختار الفرصة' }]);
  sorted.forEach(f => item('', planName(f), planDate(f.date) + (f.place ? ' · ' + f.place : '') + ' · ' + f.items.length + (f.items.length === 1 ? ' حاجة' : ' حاجات'), () => planUse(f)));
}
// «+ للفرصة»: build a فرصة here on the computer (hymns / verses written on a paper) — saved on this computer only
function addPlanBtn() {
  const b = document.createElement('button'); b.className = 'btn addplan'; b.type = 'button';
  b.innerHTML = '+ للفرصة'; b.title = st.cur && st.cur.kind === 'bible' ? 'ضيف الآية المتجهزة للفرصة (تلاقيها في «فرصي»)' : 'ضيف الترنيمة دي للفرصة (تلاقيها في «فرصي»)';
  b.onclick = e => { e.stopPropagation(); planAdd(); };
  const hl = $('curTitle').querySelector('.hl'); if (hl) hl.after(b); else $('curTitle').appendChild(b);
}
function planAdd() {
  if (!st.cur) return;
  if (!PLAN) PLAN = { title: 'فرصة ' + planDate(todayId()), date: todayId(), items: [], here: true };
  let it;
  if (st.cur.kind === 'hymn') it = { t: 'h', n: st.cur.num, title: H[st.cur.num - 1].title };
  else { const v = Math.max(0, st.cue); it = { t: 'b', b: st.cur.b, c: st.cur.c, v, v2: v }; }
  const same = PLAN.items.some(x => x.t === it.t && (it.t === 'h' ? (x.title === it.title || x.n === it.n) : (x.b === it.b && x.c === it.c && x.v === it.v)));
  if (same) { toast('دي موجودة في الفرصة خلاص'); return; }
  PLAN.items.push(it); savePlan(); if (st.tab === 'plan') search();
  toast('اتضافت للفرصة (' + arD(PLAN.items.length) + ') — تلاقيها في «فرصي»');
}
// «فرصي»: hold the ≡ and drag the row (like the mobile); the other rows slide out of the way
function planDrag() {
  const box = $('results');
  box.querySelectorAll('.plan-it .dh').forEach(h => h.addEventListener('pointerdown', e => {
    if (e.button > 0) return; e.preventDefault(); e.stopPropagation();
    const row = h.closest('.plan-it'), rows = [...box.querySelectorAll('.plan-it')], from = rows.indexOf(row);
    const mid = rows.map(r => r.offsetTop + r.offsetHeight / 2), gap = rows.length > 1 ? Math.max(0, rows[1].offsetTop - rows[0].offsetTop - rows[0].offsetHeight) : 0, step = row.offsetHeight + gap;
    let y0 = e.clientY, st0 = box.scrollTop, cy = e.clientY, to = from, raf = 0, done = false;
    try { h.setPointerCapture(e.pointerId); } catch (x) {}
    row.classList.add('pdrag'); rows.forEach(r => { if (r !== row) r.classList.add('pslide'); });
    const place = () => {
      const dy = cy - y0 + box.scrollTop - st0, c = mid[from] + dy; row.style.transform = 'translateY(' + dy + 'px)';
      to = from; for (let i = 0; i < rows.length; i++) { if (i < from && c < mid[i]) { to = i; break; } if (i > from && c > mid[i]) to = i; }
      rows.forEach((r, i) => { if (r === row) return; r.style.transform = from < i && i <= to ? 'translateY(' + -step + 'px)' : to <= i && i < from ? 'translateY(' + step + 'px)' : ''; });
    };
    const tick = () => { raf = 0; if (done) return; const b = box.getBoundingClientRect(), v = cy < b.top + 50 ? -8 : cy > b.bottom - 50 ? 8 : 0; if (v) { box.scrollTop += v; place(); raf = requestAnimationFrame(tick); } };
    const move = ev => { cy = ev.clientY; place(); if (!raf) raf = requestAnimationFrame(tick); };
    const end = () => {
      done = true; removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
      rows.forEach(r => { r.style.transform = ''; r.classList.remove('pslide', 'pdrag'); });
      if (to !== from) { const a = PLAN.items, [x] = a.splice(from, 1); a.splice(to, 0, x); const sel = st.planSel; if (sel === from) st.planSel = to; else if (sel != null && from < sel && sel <= to) st.planSel--; else if (sel != null && to <= sel && sel < from) st.planSel++; const y = box.scrollTop; savePlan(); search(); box.scrollTop = y; }
    };
    addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  }));
}
function planMove(i, d) { const j = i + d, a = PLAN.items; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; if (st.planSel === i) st.planSel = j; else if (st.planSel === j) st.planSel = i; savePlan(); search(); }
function planDel(i) { PLAN.items.splice(i, 1); if (st.planSel === i) st.planSel = null; else if (st.planSel > i) st.planSel--; savePlan(); search(); }
function planUse(f) { PLAN = f; st.planSel = null; savePlan(); setTab('plan'); search(); toast('الفرصة جاهزة: ' + planName(f)); }
function planOpen(it, i) {
  st.planSel = i;
  if (it.t === 'h') { const n = hymnOf({ title: it.title, num: it.n }); if (n) loadHymn(n, 0); else toast('الترنيمة دي مش لاقيها'); }
  else if (B[it.b] && B[it.b].chapters[it.c]) {   // stay on «فرصي» so the next item is one click away
    st.sug = { b: it.b, c: it.c, v: it.v, v2: it.v2 != null ? it.v2 : it.v }; st.back = null;
    loadChapter(it.b, it.c, it.v); const n = $('slides').children[it.v]; if (n) n.scrollIntoView({ block: 'start' });
  }
}
function showPlan() {
  const f = PLAN, box = document.createElement('div'); box.className = 'plan';
  box.innerHTML = `<div class="plan-h"><span class="hl">الفرصة اللي اتحضّرت</span> <b>${esc(planName(f))}</b><small>${esc(planDate(f.date))}${f.place ? ' · ' + esc(f.place) : ''}</small><button class="btn plan-x" title="شيل الفرصة دي">شيلها</button></div>`;
  $('results').appendChild(box);
  box.querySelector('.plan-x').onclick = () => { PLAN = null; st.planSel = null; savePlan(); search(); };
  if (!f.items.length) empty('<b>📝</b>الفرصة فاضية — افتح أي ترنيمة أو آية ودوس «+ للفرصة» فوق.');
  f.items.forEach((it, i) => {
    let t, s;
    if (it.t === 'h') { const n = hymnOf({ title: it.title, num: it.n }); t = n ? H[n - 1].title : (it.title || 'ترنيمة'); s = 'ترنيمة'; }
    else { const v2 = it.v2 != null ? it.v2 : it.v; t = B[it.b] ? ref(it.b, it.c, it.v) + (v2 > it.v ? '–' + arD(v2 + 1) : '') : 'شاهد'; s = B[it.b] && B[it.b].chapters[it.c] ? String(B[it.b].chapters[it.c][it.v] || '').replace(/[\u064B-\u0652\u0670]/g, '').slice(0, 70) : ''; }
    const d = item(arD(i + 1), t, s, () => planOpen(it, i)); d.classList.add('plan-it'); if (st.planSel === i) d.classList.add('sel');
    const ctl = document.createElement('span'); ctl.className = 'plan-ctl';
    ctl.innerHTML = `<button data-m="x" title="شيلها من الفرصة">×</button>`;
    ctl.querySelector('button').onclick = e => { e.stopPropagation(); planDel(i); };
    const dh = document.createElement('span'); dh.className = 'dh'; dh.title = 'امسكها واسحبها لفوق أو لتحت';
    dh.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"/></svg>'; dh.onclick = e => e.stopPropagation();
    if (it.note) { const n = document.createElement('div'); n.className = 'plan-n'; n.textContent = it.note; const q = d.querySelector('div:last-child'); if (q) q.appendChild(n); }
    ctl.prepend(dh); d.appendChild(ctl);
  });
  planDrag();
  if (f.note) { const n = document.createElement('div'); n.className = 'plan-note'; n.innerHTML = `<b>ملاحظاتك:</b> ${esc(f.note).replace(/\n/g, '<br>')}`; $('results').appendChild(n); }
}
// drop the file on the window = open it
document.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.items].some(x => x.kind === 'file')) e.preventDefault(); });
document.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f && /\.json$/i.test(f.name)) { e.preventDefault(); planFromFile(f); } });
// «فرصي» tab: the فرصة from the phone, or how to open one
function showPlanTab() {
  if (PLAN) { showPlan(); const o = document.createElement('button'); o.className = 'plan-open'; o.style.marginTop = '10px'; o.innerHTML = '<b>فرصة تانية؟</b> افتح ملف تاني من «فرصي» (أو اسحبه هنا)'; o.onclick = planPick; $('results').appendChild(o); return; }
  const o = document.createElement('button'); o.className = 'plan-open'; o.innerHTML = '<b>عندك فرصة محضّرها على الموبايل؟</b> افتح الملف اللي بعته لنفسك من «فرصي» (أو اسحبه هنا)'; o.onclick = planPick; $('results').appendChild(o);
  empty('<b>📱</b>على الموبايل: افتح الفرصة في «فرصي» ودوس «هتعرضها على الكمبيوتر؟»، وابعتها لنفسك واتساب.<br>وعلى الكمبيوتر افتح الملف من هنا، تلاقي الترانيم والشواهد بالترتيب وملاحظاتك.<br><br><b>📝</b>أو حضّرها هنا على الكمبيوتر: افتح أي ترنيمة أو آية ودوس «+ للفرصة» فوق، وهتتجمّع هنا بالترتيب.');
}
function showToday() {
  const m = curMeeting(), head = document.createElement('div'); head.className = 'meethead';
  head.innerHTML = `<b>${esc(m.title)}</b>`;
  const nb = document.createElement('button'); nb.className = 'btn'; nb.textContent = 'خدمة جديدة';
  nb.onclick = () => { if (!m.items.length) { toast('الخدمة دي لسه فاضية'); return; } m.closed = true; curMeeting(); saveMeet(); search(); toast('بدأنا خدمة جديدة'); };
  head.appendChild(nb); $('results').appendChild(head);
  listItems(m);
}
function showHistory(openId) {
  const list = MEET.meetings.filter(m => m.items.length);
  if (openId) {
    const m = MEET.meetings.find(x => x.id === openId); if (!m) return showHistory();
    crumb([{ t: 'كل الخدمات', fn: () => { $('results').innerHTML = ''; showHistory(); } }, { t: m.title }]);
    listItems(m); return;
  }
  crumb([]);
  if (!list.length) { empty('<b>📒</b>لسه مفيش خدمات متسجلة'); return; }
  list.forEach(m => item('', m.title, (m.items.length === 1 ? 'حاجة واحدة' : m.items.length + ' حاجات') + ' · بدأ ' + timeOf(m.started), () => { $('results').innerHTML = ''; showHistory(m.id); }));
}


// ---------- events ----------
// Bible: "١كو ٣ ١", "تك 1 1", "يو ٣: ١٦", "امثال8 1" (Van Dyke abbreviations or full names)
const ABBR = { 'تك':0,'خر':1,'لا':2,'عد':3,'تث':4,'يش':5,'قض':6,'را':7,'1صم':8,'2صم':9,'1مل':10,'2مل':11,'1اخ':12,'2اخ':13,'عز':14,'نح':15,'اس':16,'اي':17,'مز':18,'ام':19,'جا':20,'نش':21,'اش':22,'ار':23,'مرا':24,'حز':25,'دا':26,'هو':27,'يوء':28,'يوئ':28,'عا':29,'عو':30,'يون':31,'مي':32,'نا':33,'حب':34,'صف':35,'حج':36,'زك':37,'مل':38,
  'مت':39,'مر':40,'لو':41,'يو':42,'اع':43,'رو':44,'1كو':45,'2كو':46,'غل':47,'اف':48,'في':49,'كو':50,'1تس':51,'2تس':52,'1تي':53,'2تي':54,'تي':55,'فل':56,'عب':57,'يع':58,'1بط':59,'2بط':60,'1يو':61,'2يو':62,'3يو':63,'يه':64,'رؤ':65 };
function bookByName(w) {
  const raw = w.replace(/\s+/g, '');
  if (ABBR[raw] !== undefined) return ABBR[raw];
  if (/^يو[ءئ]$|^يؤ$/.test(raw)) return 28;
  const n = KE.norm(raw).replace(/\s+/g, '');
  for (const k in ABBR) if (!/[ءئؤ]/.test(k) && KE.norm(k).replace(/\s+/g, '') === n) return ABBR[k];
  const full = KE.norm(w);
  for (let i = 0; i < BK.length; i++) if (BK[i].some(x => KE.norm(x) === full)) return i;
  return -1;
}
function abbrevRef(q) {
  const m = latinDigits(q).replace(/[\u064B-\u0652]/g, '').trim().match(/^([1-3]?\s*[\u0621-\u064A][\u0621-\u064A\s]*?)\s*[.:،,-]?\s*(\d+)(?:\s*[\s.:،,-]\s*(\d+))?\s*$/);
  if (!m) return null;
  const b = bookByName(m[1]); if (b < 0) return null;
  const c = +m[2] - 1, v = m[3] ? +m[3] - 1 : 0;
  if (!B[b] || !B[b].chapters[c] || B[b].chapters[c][v] === undefined) return null;
  return { b, c, v };
}
function openRef(r) { if (st.tab !== 'bible') setTab('bible'); loadChapter(r.b, r.c, r.v); play(); toast(ref(r.b, r.c, r.v) + ' — اتعرضت · رقم + Enter = آية تانية'); }
const isB = e => e.code === 'KeyB' || e.key === 'b' || e.key === 'B' || e.key === 'لا';
const LIST_TABS = ['today', 'history', 'plan', 'topics'];
function onKey(e) {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'SELECT') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.getElementById('tourBox') && e.key === 'Escape') return;
  if (isB(e)) { e.preventDefault(); blank(); return; }          // B (also "لا" on the Arabic keyboard)
  // typing anywhere goes straight into the search box
  if ((st.tab === 'hymns' || st.tab === 'bible') && e.key.length === 1 && e.code !== 'Space') { $('q').value = ''; $('q').focus(); return; }
  // «النهارده» / «السجل» / «فرصي» / «المواضيع»: ↓ ↑ walk the list on the right, Enter opens the one you are on and shows it.
  // ← → PageUp PageDown Space (and the clicker) always stay for the slides.
  if (LIST_TABS.includes(st.tab) && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || (e.key === 'Enter' && $('results').querySelector('.item.kb')))) {
    const its = [...$('results').querySelectorAll('.item')]; if (!its.length) return;
    e.preventDefault();
    if (e.key === 'Enter') { const on = $('results').querySelector('.item.kb'); const i = its.indexOf(on); on.classList.remove('kb'); st.kbAt = i; const before = key(); on.click(); if (st.cur && key() !== before) play(); return; }
    let i = its.findIndex(x => x.classList.contains('kb')); if (i < 0) i = st.kbAt != null && st.kbAt < its.length ? st.kbAt : -1;
    i = i < 0 ? (e.key === 'ArrowDown' ? 0 : its.length - 1) : Math.max(0, Math.min(its.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
    its.forEach(x => x.classList.remove('kb')); its[i].classList.add('kb'); its[i].scrollIntoView({ block: 'nearest' }); st.kbAt = i;
    return;
  }
  // verses: ↓ ↑ flip like ← → (on the screen = the next verse shows right away), and the list follows
  if (st.cur && st.cur.kind === 'bible' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1);
    const n = $('slides').children[st.cue]; if (n) n.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (e.key === 'Enter' && st.cur) { e.preventDefault(); play(); return; }
  if (e.code === 'Space') { e.preventDefault(); play(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
}
document.addEventListener('keydown', onKey);
let qT, qPending = false; $('q').addEventListener('input', () => { [...$('results').querySelectorAll('.kb')].forEach(x => x.classList.remove('kb')); clearTimeout(qT); qPending = true; qT = setTimeout(() => { qPending = false; search(); }, 220); });
$('q').addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('q').blur(); return; }
  // ↓ ↑ walk the results, Enter opens the one you are on (a hymn opens from its start and shows on the screen)
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const its = [...$('results').querySelectorAll('.item')]; if (!its.length) return;
    e.preventDefault();
    let i = its.findIndex(x => x.classList.contains('kb'));
    i = i < 0 ? (e.key === 'ArrowDown' ? 0 : its.length - 1) : Math.max(0, Math.min(its.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
    its.forEach(x => x.classList.remove('kb')); its[i].classList.add('kb'); its[i].scrollIntoView({ block: 'nearest' });
    return;
  }
  if (e.key !== 'Enter') return;
  if (qPending) { clearTimeout(qT); qPending = false; search(); }
  const q = latinDigits($('q').value.trim()); let done = false;
  if (st.tab === 'bible' && /^\d+$/.test(q) && st.cur && st.cur.kind === 'bible') {
    const v = +q - 1;
    if (B[st.cur.b].chapters[st.cur.c][v] !== undefined) { setCue(v); play(); done = true; } else toast('الإصحاح ده مافيهوش العدد ده');
  } else if (st.tab === 'bible' && abbrevRef(q)) { openRef(abbrevRef(q)); done = true; }
  else {
    const f = $('results').querySelector('.item.kb') || $('results').querySelector('.item');
    if (f) { const before = key(); f.click(); if (key() !== before && st.cur) { play(); $('q').blur(); } }
  }
  if (done) { $('q').value = ''; $('q').blur(); search(); }
});
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => setTab(b.dataset.tab));
$('openOut').onclick = openOut;
$('blankBtn').onclick = blank;
$('playBtn').onclick = play;
$('nextBtn').onclick = () => step(1);
$('prevBtn').onclick = () => step(-1);
// automatic update (Windows): tell the servant quietly, never interrupt the meeting
if (APP && window.bp.on) window.bp.on('update', u => {
  if (u.state === 'downloading' || u.state === 'progress') {   // a fixed button (not a toast) so the servant knows to leave the app open
    const b = $('updBtn'); b.style.display = '';
    b.textContent = 'نسخة جديدة بتتنزل' + (u.percent != null ? ' ' + u.percent + '%' : '…') + ' — سيب البرنامج مفتوح';
    b.onclick = () => toast('النسخة الجديدة بتتنزل؛ أول ما تخلص الزرار هيقولك «حدّث».');
  }
  if (u.state === 'ready') {
    const b = $('updBtn'); b.style.display = ''; b.textContent = 'نسخة جديدة جاهزة — حدّث';
    b.onclick = () => { if (confirm('البرنامج هيتقفل ويفتح تاني بالنسخة الجديدة. تمام؟')) window.bp.updateNow(); };
  }
  if (u.state === 'mac') {   // Mac: no self-update (not signed by Apple) — download the new copy from the site
    const b = $('updBtn'); b.style.display = ''; b.textContent = 'نسخة جديدة — نزّلها';
    b.onclick = () => window.bp.openLink('https://brethrensundayschoolpresenter.github.io/#mac');
  }
});
// suggestions / mistakes / a hymn to add go to WhatsApp (the hymn on screen is written in the message)
const WA = 'https://wa.me/201227120955';
function suggest() {
  const h = st.cur && st.cur.kind === 'hymn' && H[st.cur.num - 1] ? H[st.cur.num - 1].title : '';
  const url = WA + '?text=' + encodeURIComponent(h ? 'ترنيمة: ' + h + '\n' : 'برنامج ترانيم مدارس الأحد:\n');
  if (APP && window.bp.openLink) window.bp.openLink(url); else window.open(url, '_blank');
}
$('sugBtn').onclick = suggest;
if (APP && window.bp.on) window.bp.on('content', c => {
  const b = $('dataBtn'); b.style.display = ''; b.textContent = '✨ ترانيم جديدة — اعرضها';
  b.title = (c.notes || []).map(x => x.replace(/<[^>]+>/g, '')).join('\n');
  b.onclick = () => { if (window.bp.reloadFresh) window.bp.reloadFresh(); else location.reload(); };
  // nothing shown on the screen since the app opened -> take the new hymns right away (no button needed)
  if (st.live < 0 && !document.querySelector('.modal.open, dialog[open]')) { setTimeout(() => { if (st.live < 0) b.onclick(); }, 1500); return; }
  toast('وصل تحديث للترانيم ✨ — دوس الزرار الأصفر فوق، أو هيظهر لوحده المرة الجاية');
});
// "what's new" after an update: shown once per new version, never on a first install
const WHATSNEW = {
  '1.0.17': ['الترانيم الجديدة بتشتغل لوحدها أول ما توصل، لو مفيش حاجة معروضة على الشاشة.', 'رسالة «اتعرضت هنا بس» (لما مفيش بروجكتور) بقت بتظهر مرة واحدة بس، وعلى الماك بتقولك الخطوات الصح.'],
  '1.0.14': ['«فرصي» بقت تبويب لوحدها جنب «النهارده»: افتح فيها الفرصة اللي حضّرتها على الموبايل في «فرصي».', '«ابعت اقتراح» بيفتح واتساب: ابعت أي غلطة، أو لو عايز تضيف ترنيمة ابعتها لنا مكتوبة تكست أو باوربوينت.'],
  '1.0.13': ['«الشكل والخط»: تقدر تحط صورة في خلفية الترانيم (أو صورتين يتبادلوا زي اللونين) — البرنامج بيغمّقها ويعملها blur عشان الكلام يبان، ويختار لون الكلام لوحده (وتقدر تغيّره تحت كل صورة). الصور بتتحفظ على الجهاز ده بس.', '«ابعت اقتراح» بقى بيفتح واتساب على طول: ابعت أي غلطة، أو لو عايز تضيف ترنيمة ابعتها لنا مكتوبة تكست أو باوربوينت.', '«فرصي»: افتح الفرصة اللي حضّرتها على الموبايل في «فرصي» — ابعت الملف لنفسك واتساب وافتحه هنا، وتلاقي الترانيم والشواهد بالترتيب وملاحظاتك.', 'لما تفتح آية أو قصة من الترنيمة، الآيات المقترحة بتبقى متعلّم عليها بالأصفر في الكتاب المقدس.', 'في الكتاب المقدس الأسهم فوق وتحت بتقلّب الآيات زي الأسهم يمين وشمال، ولو الآية معروضة اللي بعدها بتظهر على طول.'],
  '1.0.12': [
    'بعد أي تحديث بتظهرلك رسالة لوحدها: «ترنيمة جديدة اتضافت» وتقدر تفتحها منها على طول، أو «الترانيم اتحدّثت»، أو «البرنامج اتحدّث».'
  ],
  '1.0.11': [
    (window.bp && window.bp.platform === 'darwin' ? 'شاشة العرض بتفتح على البروجكتور لوحدها أول ما توصّله وتعمل Extend من System Settings › Displays، ومش محتاج تدوس حاجة.' : 'شاشة العرض بتفتح على البروجكتور لوحدها أول ما توصّله وتعمل Extend (ويندوز + P)، ومش محتاج تدوس حاجة.'),
    'الزرار اللي فوق بقى بيقولك حالتها: «شغالة على البروجكتور»، ولو مفيش بروجكتور اسمه «تجربة شاشة العرض».'
  ],
  '1.0.10': [
    'تحت كل ترنيمة: فكرة الترنيمة، والآيات اللي كلامها مأخوذ منها (اضغط على أي آية تفتحها)، وقصة مقترحة ليها مع سبب اختيارها.',
    'المواضيع اتراجعت لكل الترانيم على حسب كلامها.'
  ],
  '1.0.9': [
    'زرار جديد فوق: <b>طريقة الاستخدام</b> — شرح سريع لكل حاجة في البرنامج.',
    'اكتب على طول من غير ما تدوس على البحث، وانزل في النتايج بالأسهم <b>↓ ↑</b> ودوس <b>Enter</b> — الترنيمة بتتفتح من أولها وتظهر.',
    'جوه كل حرف، الترانيم الأحدث بقت الأول.',
    'الكتاب المقدس: اكتب الاختصار زي <b>يو ٣ ١٦</b> أو <b>١كو ١٣ ٤</b> ودوس Enter، وبعدها أي رقم + Enter = آية تانية في نفس الإصحاح.',
    'شاشة "على الشاشة الآن" بقت فوق وكبيرة، و"التالي" صغيرة تحتها. وزرار السابق بقى يمين والتالي شمال زي الأسهم.',
    'البرنامج بقى مظبوط على الشاشات الصغيرة (اللابتوب).'
  ],
  '1.0.7': [
    'تحديثات الترانيم بقت بتوصل لوحدها وانت فاتح البرنامج على النت — من غير تسطيب ومن غير ما البرنامج يقفل.',
    'لما يوصل تحديث للترانيم هيظهر فوق زرار <b>✨ ترانيم جديدة</b> — دوس عليه وهتلاقيها في القايمة على طول.',
    'تحديث البرنامج نفسه بقى بيتسطّب في الخلفية من غير شاشة تسطيب.'
  ],
  '1.0.5': [
    'زرار جديد فوق: <b>ابعت اقتراح</b> — لو لقيت غلطة في ترنيمة أو عندك فكرة، ابعتها على طول واتساب.',
    'الشاشة دي هتظهرلك بعد كل تحديث عشان تعرف الجديد في البرنامج.'
  ]
};
// popup after an update (opens by itself once, never on a first install):
//  app changed  -> «البرنامج اتحدّث» (+ new hymns / hymn fixes as their own lines)
//  only hymns   -> «ترنيمة جديدة اتضافت» (names, click = open it) or «الترانيم اتحدّثت» (the notes)
async function showNews() {
  let v = '', ci = null;
  try { v = APP && window.bp.version ? await window.bp.version() : ''; } catch (e) {}
  try { ci = APP && window.bp.contentInfo ? await window.bp.contentInfo() : null; } catch (e) {}
  if (!v) return;
  let seenV = null, seenD = 0, seenN = 0;
  try {
    seenV = localStorage.getItem('ss_seen_ver'); seenD = +(localStorage.getItem('ss_seen_data') || 0); seenN = +(localStorage.getItem('ss_seen_count') || 0);
    localStorage.setItem('ss_seen_ver', v); if (ci) localStorage.setItem('ss_seen_data', String(ci.version)); localStorage.setItem('ss_seen_count', String(H.length));
  } catch (e) { return; }
  if (!HAD_SET) return;   // first install: nothing to announce
  const vnum = s => String(s || '0').split('.').map(Number).reduce((a, x) => a * 1000 + (x || 0), 0);
  const appItems = [];
  if (seenV && seenV !== v) Object.keys(WHATSNEW).filter(k => vnum(k) <= vnum(v) && vnum(k) > vnum(seenV)).sort((a, b) => vnum(b) - vnum(a)).forEach(k => appItems.push(...WHATSNEW[k]));
  const newH = seenN && H.length > seenN ? H.slice(seenN) : [];
  const notes = ci && ci.version > seenD ? (ci.notes || []).filter(t => !newH.some(h => t.includes(h.title))) : [];
  if (!appItems.length && !newH.length && !notes.length) return;
  const title = appItems.length ? 'البرنامج اتحدّث' : newH.length ? (newH.length > 1 ? 'ترانيم جديدة اتضافت' : 'ترنيمة جديدة اتضافت') : 'الترانيم اتحدّثت';
  $('newsTitle').textContent = '✨ ' + title;
  $('newsVer').textContent = (appItems.length ? 'النسخة ' + v : '') + (ci && ci.version > seenD ? (appItems.length ? ' · ' : '') + 'تحديث الترانيم ' + ci.version : '');
  let html = '';
  if (newH.length) html += (appItems.length ? `<li class="nh-t">${newH.length > 1 ? 'ترانيم جديدة اتضافت' : 'ترنيمة جديدة اتضافت'}:</li>` : '') + newH.map(h => `<li class="nh"><a data-n="${h.num}">«${esc(h.title)}» <span>افتحها ‹</span></a></li>`).join('');
  html += notes.map(x => '<li>' + x + '</li>').join('');
  if (appItems.length && (newH.length || notes.length)) html += '<li class="nh-t">جديد في البرنامج:</li>';
  html += appItems.map(x => '<li>' + x + '</li>').join('');
  $('newsList').innerHTML = html;
  $('newsList').querySelectorAll('a[data-n]').forEach(a => a.onclick = () => { $('news').classList.remove('open'); setTab('hymns'); loadHymn(+a.dataset.n, 0); });
  $('news').classList.add('open');
}
$('newsOk').onclick = () => $('news').classList.remove('open');
$('newsSug').onclick = () => { $('news').classList.remove('open'); suggest(); };
showNews();
applySet();
setTab('hymns');
loadMeet();
