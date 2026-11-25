#!/usr/bin/env node
// Safety check: run BEFORE any data publish (publish_content.py runs it by itself).
// Refuses broken data so a bad hymn / topic / story / Key never reaches the desktop or mobile users.
//   node tools/check_content.js                 -> checks renderer/data (desktop data)
//   node tools/check_content.js --site <site>   -> also checks <site>/app/data (mobile data + keys.js + bible.js)
//   add --allow-remove if hymns were removed on purpose (otherwise a smaller hymn count is refused)
// Exit code 0 = safe, 1 = refused (the reason is printed).
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const args = process.argv.slice(2);
const site = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;
const allowRemove = args.includes('--allow-remove');
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

function checkDir(dir, label, withKeys) {
  const before = errs.length;
  const H = load(path.join(dir, 'hymns.js')).HYMNS;
  const T = load(path.join(dir, 'topics.js')).TOPICS;
  const S = load(path.join(dir, 'stories.js')).STORIES;
  if (!Array.isArray(H) || H.length < 100) { bad(label + ': HYMNS fadya aw na2sa'); return; }
  const nums = new Set();
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
  const prev = prevCount(dir);
  if (prev && H.length < prev && !allowRemove) bad(label + ': 3adad el taranem 2al men ' + prev + ' le ' + H.length + ' (law 2asdak zawed --allow-remove)');
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
