const {app, BrowserWindow, Menu, protocol, net, session, ipcMain, powerMonitor} = require('electron');
const {readFileSync, mkdtempSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {ORIGIN, trustedURL, assetPath, trustedSender} = require('./policy.cjs');
const smoke = process.argv.includes('--smoke-test');
const deck = process.argv.includes('--steam-deck') || process.env.SteamDeck === '1' || (() => {
  try { return /Jupiter|Galileo/i.test(readFileSync('/sys/devices/virtual/dmi/id/product_name', 'utf8')); } catch { return false; }
})();
app.setName('Zombie Bagarre');
app.setPath('userData', smoke ? mkdtempSync(path.join(tmpdir(), 'bagarre-smoke-')) : path.join(app.getPath('appData'), 'zombie-bagarre'));
// Gamescope and Steam's overlay use Xwayland. Keep Chromium's normal GPU path,
// driver checks and renderer sandbox: no forced Vulkan or --no-sandbox flags.
if (process.platform === 'linux') app.commandLine.appendSwitch('ozone-platform', 'x11');
app.enableSandbox();
protocol.registerSchemesAsPrivileged([{scheme:'bagarre', privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let win;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    const root = path.join(app.getAppPath(), 'dist');
    protocol.handle('bagarre', request => {
      const target = assetPath(request.url, root);
      if (!target || !['GET','HEAD'].includes(request.method)) return new Response('Not found', {status:404});
      return net.fetch(pathToFileURL(target).href);
    });
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => callback(['fullscreen','pointerLock'].includes(permission)));
    session.defaultSession.setPermissionCheckHandler((_contents, permission, origin) => trustedURL(origin) && ['fullscreen','pointerLock'].includes(permission));
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => callback({responseHeaders:{...details.responseHeaders,
      'Content-Security-Policy':["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-src 'none'; frame-ancestors 'none'"]}}));
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({width:1280,height:800,minWidth:800,minHeight:600,useContentSize:true,
      fullscreen:!smoke && !process.argv.includes('--windowed'),backgroundColor:'#162327',title:'Zombie Bagarre',
      icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,
      webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,
        webSecurity:true,webgl:true,backgroundThrottling:true,additionalArguments:[...(deck?['--bagarre-deck']:[]),...(smoke?['--bagarre-smoke']:[])]}});
    win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    win.webContents.on('will-navigate', (event, url) => { if (!trustedURL(url)) event.preventDefault(); });
    win.webContents.on('will-attach-webview', event => event.preventDefault());
    const status = () => ({version:app.getVersion(),platform:process.platform,steamDeck:deck,fullscreen:win.isFullScreen(),gpu:app.getGPUFeatureStatus().webgl2 || app.getGPUFeatureStatus().webgl || 'unknown'});
    for (const [channel, action] of Object.entries({
      'desktop:status':status,
      'desktop:fullscreen':() => {win.setFullScreen(!win.isFullScreen()); return win.isFullScreen();},
      'desktop:quit':() => app.quit(),
    })) ipcMain.handle(channel, (event) => { if (!trustedSender(event,win.webContents)) throw new Error('Untrusted frame'); return action(); });
    for (const event of ['enter-full-screen','leave-full-screen']) win.on(event, () => win.webContents.send('desktop:fullscreen-changed',win.isFullScreen()));
    for (const event of ['suspend','resume','lock-screen']) powerMonitor.on(event, () => win?.webContents.send('desktop:suspend'));
    let smokeTimer;
    if (smoke) {
      smokeTimer=setTimeout(() => { console.error('SMOKE FAIL: game did not finish initialization'); app.exit(1); },120000);
      win.webContents.on('console-message', details => { if(details.level==='error'){ console.error('RENDERER ERROR:',details.message); app.exit(1); } });
      win.webContents.on('render-process-gone', (_event, details) => {console.error('RENDERER EXIT:',details.reason);app.exit(1);});
      win.webContents.on('did-fail-load', (_event, code, message) => {console.error('LOAD FAIL:',code,message);app.exit(1);});
    }
    ipcMain.on('desktop:ready', event => {
      if (!trustedSender(event,win.webContents)) return;
      if (smoke) {clearTimeout(smokeTimer);console.log('SMOKE PASS: offline world, shaders, menu and desktop bridge initialized',JSON.stringify(status()));app.exit(0);}
    });
    await win.loadURL(ORIGIN + '/');
  }).catch(error => {console.error(error);app.exit(1);});
  app.on('window-all-closed', () => app.quit());
}
