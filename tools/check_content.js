#!/usr/bin/env node
// Safety check: run BEFORE any data publish (publish_content.py runs it by itself).
// Refuses broken data so a bad hymn / topic / story / Key never reaches the desktop or mobile users.
//   node tools/check_content.js                 -> checks renderer/data (desktop data)
//   node tools/check_content.js --site <site>   -> also checks <site>/app/data (mobile data + keys.js + bible.js)
//   add --allow-remove if hymns were removed on purpose (otherwise a smaller hymn count is refused)
//   add --allow-unhide if a hidden hymn ("x":1) is shown again on purpose; --allow-big-change if more than 15 hymns' slides
//   (or 5 titles) change on purpose — both are refused by default because a Mac rebuild would do exactly that
// Exit code 0 = safe, 1 = refused (the reason is printed).
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const args = process.argv.slice(2);
const site = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;
const allowRemove = args.includes('--allow-remove');
const allowTopicRemove = args.includes('--allow-topic-remove');
const allowUnhide = args.includes('--allow-unhide');        // a hidden hymn ("x":1) shown again on purpose
const allowBig = args.includes('--allow-big-change');       // more than 15 hymns' slides/titles changed on purpose (e.g. the 27 Nov layout job)
const errs = [];
const bad = m => errs.push(m);

function load(file) {
  const src = fs.readFileSync(file, 'utf8');
  const ctx = { window: {} };
  try { vm.runInNewContext(src, ctx, { filename: file, timeout: 5000 }); } catch (e) { bad(path.basename(file) + ': mesh byeshta3al (' + e.message + ')'); }
  return ctx.window;
}
function prevCount(dir) {   // hymn count in the last commit, to catch hymns lost by mistake
  try {
    const rel = path.relative(cp.execSync('git rev-parse --show-toplevel', { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), path.join(dir, 'hymns.js'));
    const src = cp.execSync('git show HEAD:' + JSON.stringify(rel).slice(1, -1), { cwd: dir, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const ctx = { window: {} }; vm.runInNewContext(src, ctx); return (ctx.window.HYMNS || []).length;
  } catch (e) { return 0; }
}

function prevHymns(dir) {  // the hymns in the last commit (= what users have now)
  try {
    const rel = path.relative(cp.execSync('git rev-parse --show-toplevel', { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), path.join(dir, 'hymns.js'));
    const src = cp.execSync('git show HEAD:' + JSON.stringify(rel).slice(1, -1), { cwd: dir, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const ctx = { window: {} }; vm.runInNewContext(src, ctx); return ctx.window.HYMNS || [];
  } catch (e) { return []; }
}
function prevTopics(dir) {  // topic names in the last commit
  try {
    const top = cp.execSync('git rev-parse --show-toplevel', { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const src = cp.execSync('git show HEAD:' + path.relative(top, path.join(dir, 'topics.js')), { cwd: dir, maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const ctx = { window: {} }; vm.runInNewContext(src, ctx); return (ctx.window.TOPICS || []).map(t => t.name);
  } catch (e) { return []; }
}
function checkDir(dir, label, withKeys) {
  const before = errs.length;
  const H = load(path.join(dir, 'hymns.js')).HYMNS;
  const T = load(path.join(dir, 'topics.js')).TOPICS;
  const S = load(path.join(dir, 'stories.js')).STORIES;
  if (!Array.isArray(H) || H.length < 100) { bad(label + ': HYMNS fadya aw na2sa'); return; }
  const nums = new Set();
  // the apps find a hymn by its place (H[num-1]): every hymn must sit exactly at num-1, or favourites/forsas/Keys open the wrong hymn
  H.forEach((h, i) => { if (!h || h.num !== i + 1) bad(label + ': tarnema f makan ghalat (makan ' + (i + 1) + ' feeh #' + (h && h.num) + ') — mamnoo3 tetmese7 aw tet7arak tarnema; e3melha "x":1 (mestakhabeya)'); });
  for (const h of H) {
    const n = h && h.num;
    if (!Number.isInteger(n) || n < 1) { bad(label + ': tarnema rakamha ghalat ' + JSON.stringify(n)); continue; }
    if (nums.has(n)) bad(label + ': tarnema mokarrara #' + n);
    nums.add(n);
    if (!h.title || typeof h.title !== 'string' || !h.title.trim()) bad(label + ': tarnema men gher 3enwan #' + n);
    if (!Array.isArray(h.slides) || !h.slides.length) { bad(label + ': «' + h.title + '» men gher slides'); continue; }
    h.slides.forEach((s, i) => {
      if (!s || !Array.isArray(s.lines) || !s.lines.length || s.lines.some(l => typeof l !== 'string')) bad(label + ': «' + h.title + '» slide ' + (i + 1) + ' bayza');
      else if (!s.lines.join('').trim()) bad(label + ': «' + h.title + '» slide ' + (i + 1) + ' fadya');
    });
  }
  // 28 Nov: a Mac rebuild (build_hymns.py) does not know "x":1 nor the 27 Nov slides -> it would show hidden hymns again and change hundreds of hymns
  const PH = prevHymns(dir);
  if (PH.length) {
    const unhid = PH.filter(p => p.x && H[p.num - 1] && !H[p.num - 1].x).map(p => '«' + p.title + '»');
    if (unhid.length && !allowUnhide) bad(label + ': tarnema kanet mestakhabeya ("x":1) w ba2et zahra: ' + unhid.slice(0, 5).join('، ') + (unhid.length > 5 ? ' …(' + unhid.length + ')' : '') + ' — law 2asdak zawed --allow-unhide. (Mac rebuild? mamnoo3 yetneshr)');
    let ch = 0, tch = 0;
    PH.forEach(p => { const h = H[p.num - 1]; if (!h) return; if (JSON.stringify(h.slides) !== JSON.stringify(p.slides)) ch++; if (h.title !== p.title) tch++; });
    if ((ch > 15 || tch > 5) && !allowBig) bad(label + ': ta3deel kebeer: ' + ch + ' tarnema slides-ha et8ayaret w ' + tch + ' 3enwan — law 2asdak zawed --allow-big-change. (Mac rebuild? mamnoo3 yetneshr; GitHub data = source of truth)');
  }
  const prev = prevCount(dir);
  if (prev && H.length < prev && !allowRemove) bad(label + ': 3adad el taranem 2al men ' + prev + ' le ' + H.length + ' (law 2asdak zawed --allow-remove)');
  const prevT = prevTopics(dir);   // a topic lost by mistake (it happened once) is refused
  if (Array.isArray(T)) for (const pt of prevT) if (!T.some(t => t.name === pt) && !allowTopicRemove) bad(label + ': el mawdoo3 «' + pt + '» ettshal (law 2asdak zawed --allow-topic-remove)');
  if (!Array.isArray(T) || !T.length) bad(label + ': TOPICS fadya');
  else {
    const ids = new Set();
    for (const t of T) {
      if (ids.has(t.id)) bad(label + ': topic mokarrar ' + t.id); ids.add(t.id);
      if (!t.name) bad(label + ': topic men gher esm ' + t.id);
      for (const n of t.nums || []) if (!nums.has(n)) bad(label + ': topic «' + t.name + '» feeh tarnema mesh mawgooda #' + n);
    }
  }
  if (!S || typeof S !== 'object' || !Object.keys(S).length) bad(label + ': STORIES fadya');
  else for (const [k, s] of Object.entries(S)) if (!s || !s.name || !s.text) bad(label + ': 2essa na2sa ' + k);
  if (withKeys) {
    const K = load(path.join(dir, 'keys.js')).KEYS;
    if (!K || typeof K !== 'object') bad(label + ': KEYS bayza');
    else for (const [n, v] of Object.entries(K)) {
      const t = (H.find(h => h.num === +n) || {}).title || ('#' + n);
      if (!nums.has(+n)) bad(label + ': Key l tarnema mesh mawgooda #' + n);
      if (!Array.isArray(v) || !/^[A-G][#b]?m?$/.test(v[0])) bad(label + ': Key ghalat fe «' + t + '»: ' + JSON.stringify(v));
      else if (!Number.isInteger(v[1]) || v[1] < -11 || v[1] > 11) bad(label + ': transpose ghalat fe «' + t + '»: ' + v[1]);
    }
    const B = load(path.join(dir, 'bible.js'));
    if (!Object.keys(B).length) bad(label + ': bible.js fadya');
  }
  if (errs.length === before) console.log('OK ' + label + ': ' + H.length + ' tarnema, ' + T.length + ' topic, ' + Object.keys(S).length + ' 2essa' + (withKeys ? ', ' + Object.keys(load(path.join(dir, 'keys.js')).KEYS).length + ' Key' : ''));
}

checkDir(path.join(__dirname, '..', 'renderer', 'data'), 'desktop', false);
if (site) checkDir(path.join(site, 'app', 'data'), 'mobile', true);
if (errs.length) { console.error('\nREFUSED — mat-publish-sh:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('SAFE — momken te-publish.');
