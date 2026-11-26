// Sunday School Presenter (kids) — Electron main process (forked from Brethren Presenter v27, no mic)
const { app, BrowserWindow, protocol, net, ipcMain, screen, session, Menu, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const crypto = require('crypto');

protocol.registerSchemesAsPrivileged([{ scheme: 'bp', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

const RENDERER = path.join(__dirname, 'renderer');
let control = null, output = null, lastSlide = null, lastStyle = null;
const SMOKE = process.env.SS_SMOKE || '';
// debug log next to the app (…/dist/logs/speech-YYYY-MM-DD.log) so problems can be read later
let LOGDIR = null;
function logLine(msg) {
  try {
    if (!LOGDIR) { LOGDIR = path.join(app.getPath('userData'), 'logs'); fs.mkdirSync(LOGDIR, { recursive: true }); }
    const d = new Date(), day = d.toISOString().slice(0, 10);
    fs.appendFileSync(path.join(LOGDIR, 'app-' + day + '.log'), d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0') + ' ' + msg + '\n');
  } catch (e) {}
}

// ---- hymn data updates without reinstalling (A) ----
// renderer/data/content.json = {dataVersion, minApp, files:{name:sha256}, notes:[...]}. The app checks the same file on GitHub;
// a newer dataVersion is downloaded (hash checked) into userData/content and used from the next window load.
const CONTENT_RAW = process.env.SS_CONTENT_URL || 'https://raw.githubusercontent.com/brethrensundayschoolpresenter/brethren-sunday-school-presenter/main/renderer/data/';
const CONTENT_FILES = ['hymns.js', 'topics.js', 'stories.js'];
const CONTENT_DIR = () => path.join(app.getPath('userData'), 'content');
function readJSON(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }
function appAtLeast(min) {
  if (!min) return true;
  const a = app.getVersion().split('.').map(Number), m = String(min).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (m[i] || 0)) return (a[i] || 0) > (m[i] || 0);
  return true;
}
function bundledContent() { return readJSON(path.join(RENDERER, 'data', 'content.json')) || { dataVersion: 0 }; }
function downloadedContent() {
  const c = readJSON(path.join(CONTENT_DIR(), 'content.json'));
  return c && c.dataVersion > (bundledContent().dataVersion || 0) && appAtLeast(c.minApp) && CONTENT_FILES.every(f => fs.existsSync(path.join(CONTENT_DIR(), f))) ? c : null;
}
function activeContent() { return downloadedContent() || bundledContent(); }
function resolveFile(pathname) {
  const rel = decodeURIComponent(pathname);
  const m = rel.match(/^\/data\/(hymns|topics|stories)\.js$/);
  if (m && downloadedContent()) return path.join(CONTENT_DIR(), m[1] + '.js');
  const file = path.normalize(path.join(RENDERER, rel));
  return file.startsWith(RENDERER) ? file : null;
}
function getBuffer(url) {   // electron net.request works on Electron 22 and 33
  return new Promise((resolve, reject) => {
    const rq = net.request({ url, redirect: 'follow' });
    rq.on('response', res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); res.on('data', () => {}); return; }
      const parts = []; res.on('data', d => parts.push(d)); res.on('end', () => resolve(Buffer.concat(parts))); res.on('error', reject);
    });
    rq.on('error', reject); rq.end();
  });
}
let contentBusy = false;
async function checkContent() {
  if (contentBusy) return; contentBusy = true;
  try {
    const remote = JSON.parse((await getBuffer(CONTENT_RAW + 'content.json?t=' + Date.now())).toString('utf8'));
    const cur = activeContent().dataVersion || 0;
    if (!(remote.dataVersion > cur) || !appAtLeast(remote.minApp)) return;
    const dir = CONTENT_DIR(), tmp = dir + '-new';
    fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    for (const f of CONTENT_FILES) {
      const buf = await getBuffer(CONTENT_RAW + f + '?v=' + remote.dataVersion);
      const h = crypto.createHash('sha256').update(buf).digest('hex');
      if (!remote.files || remote.files[f] !== h) throw new Error('hash mismatch ' + f);
      fs.writeFileSync(path.join(tmp, f), buf);
    }
    fs.writeFileSync(path.join(tmp, 'content.json'), JSON.stringify(remote));
    fs.rmSync(dir, { recursive: true, force: true }); fs.renameSync(tmp, dir);
    logLine('CONTENT updated to ' + remote.dataVersion);
    if (control && !control.isDestroyed()) control.webContents.send('content', { version: remote.dataVersion, notes: remote.notes || [] });
  } catch (e) { logLine('CONTENT ' + e.message); }
  finally { contentBusy = false; }
}
ipcMain.on('reload-fresh', e => { try { e.sender.reloadIgnoringCache(); } catch (x) {} });
ipcMain.handle('content-info', () => { const c = activeContent(); return { version: c.dataVersion || 0, notes: c.notes || [] }; });

const LEGACY = parseInt(process.versions.electron, 10) < 25;   // Windows 7/8 build runs on Electron 22 (no protocol.handle)
function serveLegacy() {
  const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
  protocol.registerFileProtocol('bp', (req, cb) => {
    const u = new URL(req.url);
    const file = resolveFile(u.pathname);
    if (!file || !fs.existsSync(file)) return cb({ error: -6 });
    cb({ path: file, mimeType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin', 'Cache-Control': 'no-cache' } });
  });
}
function serve() {
  if (LEGACY || !protocol.handle) return serveLegacy();
  protocol.handle('bp', async req => {
    const u = new URL(req.url);
    const file = resolveFile(u.pathname);
    if (!file || !fs.existsSync(file)) return new Response('not found', { status: 404 });
    const r = await net.fetch(pathToFileURL(file).toString());
    const h = new Headers(r.headers);
    h.set('Content-Length', String(fs.statSync(file).size));
    h.set('Cross-Origin-Opener-Policy', 'same-origin');
    h.set('Cross-Origin-Embedder-Policy', 'require-corp');
    h.set('Cross-Origin-Resource-Policy', 'same-origin');
    h.set('Cache-Control', 'no-cache');
    if (file.endsWith('.mjs') || file.endsWith('.js')) h.set('Content-Type', 'text/javascript');
    if (file.endsWith('.wasm')) h.set('Content-Type', 'application/wasm');
    return new Response(r.body, { status: 200, headers: h });
  });
}

const prefs = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false };

function createControl() {
  control = new BrowserWindow({
    width: 1480, height: 900, minWidth: 1180, minHeight: 720, show: false,
    title: 'Brethren Sunday School Presenter', backgroundColor: '#fff7ec',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: prefs
  });
  control.loadURL('bp://renderer/index.html');
  control.once('ready-to-show', () => { control.maximize(); control.show(); openOutput(false); });
  control.webContents.on('did-finish-load', () => setTimeout(sendStatus, 400));   // 1.0.11: the button shows the projector state from the start
  control.on('closed', () => { control = null; if (output && !output.isDestroyed()) output.destroy(); app.quit(); });
}

function externalDisplay() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().find(d => d.id !== primary.id) || null;
}

function openOutput(userAsked) {
  const ext = externalDisplay();
  if (!ext && !userAsked) { sendStatus(); return; }   // no projector yet: wait for it
  if (output && !output.isDestroyed()) { placeOutput(); output.show(); return; }
  output = new BrowserWindow({
    width: 1280, height: 720, show: false, frame: !ext, backgroundColor: '#000000',
    title: 'شاشة العرض', autoHideMenuBar: true, webPreferences: prefs
  });
  output.loadURL('bp://renderer/output.html');
  output.once('ready-to-show', () => { placeOutput(); output.show(); if (control) control.focus(); });
  output.webContents.on('did-finish-load', () => { if (lastStyle) output.webContents.send('style', lastStyle); output.webContents.send('slide', lastSlide); });
  output.on('closed', () => { output = null; sendStatus(); });
  sendStatus();
}

function placeOutput() {
  if (!output || output.isDestroyed()) return;
  const ext = externalDisplay();
  if (ext) {
    output.setBounds(ext.bounds);
    output.setFullScreen(true);
  } else {
    output.setFullScreen(false);
  }
  sendStatus();
}

function sendStatus() {
  if (!control || control.isDestroyed()) return;
  control.webContents.send('status', {
    outputOpen: !!(output && !output.isDestroyed()),
    projector: !!externalDisplay(),
    displays: screen.getAllDisplays().length
  });
}

// ---------- automatic updates (Windows): new versions come from GitHub Releases ----------
function startUpdates() {
  if (!app.isPackaged || process.platform !== 'win32') return;
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { logLine('UPDATE no updater ' + e.message); return; }
  if (LEGACY) { autoUpdater.channel = 'win7'; autoUpdater.allowDowngrade = false; }   // Windows 7/8 copies only take Windows 7/8 updates (win7.yml)
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;            // the new version is installed when the app is closed
  const tell = m => { if (control && !control.isDestroyed()) control.webContents.send('update', m); };
  autoUpdater.on('update-available', i => { logLine('UPDATE available ' + i.version); tell({ state: 'downloading', version: i.version }); });
  let lastPct = -1;
  autoUpdater.on('download-progress', p => { const pct = Math.floor((p && p.percent) || 0); if (pct !== lastPct) { lastPct = pct; tell({ state: 'progress', percent: pct }); } });
  autoUpdater.on('update-downloaded', i => { logLine('UPDATE ready ' + i.version); tell({ state: 'ready', version: i.version }); });
  autoUpdater.on('error', e => logLine('UPDATE error ' + (e && e.message)));
  const check = () => autoUpdater.checkForUpdates().catch(e => logLine('UPDATE check failed ' + e.message));   // no internet = just try later
  setTimeout(check, 8000);
  setInterval(check, 6 * 60 * 60 * 1000);
}
// Mac copies are not signed by Apple, so they can't update themselves: tell the servant and send him to the download page
function startMacUpdateCheck() {
  if (!app.isPackaged || process.platform !== 'darwin') return;
  const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  const check = async () => {
    try {
      const r = JSON.parse((await getBuffer('https://api.github.com/repos/brethrensundayschoolpresenter/brethren-sunday-school-presenter/releases/latest')).toString('utf8'));
      const v = String(r.tag_name || '').replace(/^v/, '');
      if (v && newer(v, app.getVersion()) && (r.assets || []).some(x => /-Mac-/.test(x.name))) {
        logLine('UPDATE mac available ' + v);
        if (control && !control.isDestroyed()) control.webContents.send('update', { state: 'mac', version: v });
      }
    } catch (e) { logLine('UPDATE mac check failed ' + e.message); }
  };
  setTimeout(check, 8000);
  setInterval(check, 6 * 60 * 60 * 1000);
}
// links the app may open in the browser: WhatsApp / the church's Facebook page / Messenger / our download page
ipcMain.on('open-link', (e, u) => { if (/^https:\/\/(wa\.me|api\.whatsapp\.com|m\.me|www\.facebook\.com|www\.messenger\.com|brethrensundayschoolpresenter\.github\.io)\//.test(String(u))) shell.openExternal(u); });
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.on('update-now', () => { try { require('electron-updater').autoUpdater.quitAndInstall(true, true); } catch (e) {} });

app.whenReady().then(() => {
  serve();
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'fullscreen'));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => perm === 'fullscreen');
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Brethren Sunday School Presenter', submenu: [{ role: 'about', label: 'عن البرنامج' }, { type: 'separator' }, { role: 'hide', label: 'إخفاء' }, { role: 'quit', label: 'خروج' }] },
      { label: 'تعديل', submenu: [{ role: 'undo', label: 'تراجع' }, { role: 'cut', label: 'قص' }, { role: 'copy', label: 'نسخ' }, { role: 'paste', label: 'لصق' }, { role: 'selectAll', label: 'تحديد الكل' }] },
      { label: 'نافذة', submenu: [{ role: 'minimize', label: 'تصغير' }, { role: 'togglefullscreen', label: 'ملء الشاشة' }] }
    ]));
  } else Menu.setApplicationMenu(null);
  createControl();
  if (SMOKE) return startSmoke();   // release test on GitHub only (never set on users' machines)
  startUpdates(); startMacUpdateCheck();
  if (app.isPackaged || process.env.SS_CONTENT_TEST) { setTimeout(checkContent, 3000); setInterval(checkContent, 3 * 60 * 60 * 1000); }
  screen.on('display-added', () => { if (output && !output.isDestroyed()) placeOutput(); else openOutput(false); });
  screen.on('display-removed', () => { placeOutput(); });
  screen.on('display-metrics-changed', () => placeOutput());
});
app.on('window-all-closed', () => { if (!SMOKE) app.quit(); });

// SMOKE TEST — only when the release workflow sets SS_SMOKE=<result file>. Opens the real app, checks that the
// control + projector windows load with all the hymns and no crash, writes the result and quits.
// If it fails, the release is NOT published, so no user ever gets a broken version.
function startSmoke() {
  const out = process.env.SS_SMOKE, errors = [];
  let done = false;
  const finish = (ok, info) => {
    if (done) return; done = true;
    try { fs.writeFileSync(out, JSON.stringify({ ok, version: app.getVersion(), electron: process.versions.electron, info, errors }, null, 1)); } catch (e) {}
    app.exit(ok ? 0 : 1);
  };
  setTimeout(() => finish(false, 'timeout'), 90000);
  const watch = (w, name) => {
    w.webContents.on('render-process-gone', (e, d) => finish(false, name + ' crashed: ' + (d && d.reason)));
    w.webContents.on('console-message', (...a) => { const m = a[0] && a[0].message !== undefined ? a[0] : { level: a[1], message: a[2] };
      if (/uncaught|is not defined|is not a function|cannot read/i.test(String(m.message))) errors.push(name + ': ' + m.message); });
    w.webContents.on('did-fail-load', (e, code, desc) => finish(false, name + ' failed to load: ' + desc));
  };
  watch(control, 'control');
  control.webContents.once('did-finish-load', () => setTimeout(async () => {
    try {
      const r = await control.webContents.executeJavaScript(`({ hymns: (window.HYMNS || []).length, topics: (window.TOPICS || []).length,
        stories: Object.keys(window.STORIES || {}).length, books: (window.BOOKS || []).length,
        search: !!document.querySelector('input'), body: document.body.innerText.length })`);
      if (!output || output.isDestroyed()) openOutput(true);   // open the projector window even with no projector
      if (output && !output.isDestroyed()) watch(output, 'output');
      const outOk = await new Promise(res => { if (!output) return res(false); const t = setTimeout(() => res(!output.webContents.isLoading()), 8000);
        output.webContents.once('did-finish-load', () => { clearTimeout(t); res(true); }); if (!output.webContents.isLoading()) { clearTimeout(t); res(true); } });
      await new Promise(res => setTimeout(res, 2000));
      const ok = r.hymns > 900 && r.topics > 0 && r.stories > 0 && r.search && r.body > 100 && outOk && !errors.length;
      finish(ok, Object.assign(r, { output: outOk }));
    } catch (e) { finish(false, 'check failed: ' + e.message); }
  }, 5000));
}

ipcMain.on('slide', (e, s) => { lastSlide = s; if (output && !output.isDestroyed()) output.webContents.send('slide', s); });
ipcMain.on('style', (e, s) => { lastStyle = s; if (output && !output.isDestroyed()) output.webContents.send('style', s); });
ipcMain.on('open-output', () => openOutput(true));
ipcMain.on('output-fullscreen', () => { if (output && !output.isDestroyed()) output.setFullScreen(!output.isFullScreen()); });
ipcMain.on('key', (e, k) => { if (control && !control.isDestroyed()) control.webContents.send('key', k); });
ipcMain.handle('status', () => ({ outputOpen: !!(output && !output.isDestroyed()), projector: !!externalDisplay() }));

// meetings history (اجتماع اليوم / السجل) -> userData/meetings.json
const MEET_FILE = () => path.join(app.getPath('userData'), 'meetings.json');
ipcMain.handle('meet-load', () => { try { return JSON.parse(fs.readFileSync(MEET_FILE(), 'utf8')); } catch (e) { return null; } });
ipcMain.on('meet-save', (e, data) => { try { const f = MEET_FILE(); fs.writeFileSync(f + '.tmp', JSON.stringify(data)); fs.renameSync(f + '.tmp', f); } catch (err) { logLine('meet-save failed ' + err.message); } });
