const {app, BrowserWindow, Menu, protocol, net, session, ipcMain, powerMonitor, dialog} = require('electron');
const {readFileSync, mkdtempSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {ORIGIN, trustedURL, assetPath, trustedSender} = require('./policy.cjs');
const {startupLog, startupWatch, graphicsSwitches} = require('./startup.cjs');
const smoke = process.argv.includes('--smoke-test');
const deck = process.argv.includes('--steam-deck') || process.env.SteamDeck === '1' || (() => {
  try { return /Jupiter|Galileo/i.test(readFileSync('/sys/devices/virtual/dmi/id/product_name', 'utf8')); } catch { return false; }
})();
app.setName('Zombie Bagarre');
app.setPath('userData', smoke ? mkdtempSync(path.join(tmpdir(), 'bagarre-smoke-')) : path.join(app.getPath('appData'), 'zombie-bagarre'));
const {log, file:logFile} = startupLog(path.join(app.getPath('userData'), 'diagnostics'));
log('LAUNCH', JSON.stringify({version:app.getVersion(),electron:process.versions.electron,platform:process.platform,arch:process.arch,deck,smoke}));
const startup = startupWatch({log, fail: reason => {
  if (!smoke && app.isReady()) dialog.showErrorBox('Zombie Bagarre could not start', `${reason}\n\nStartup details are saved in:\n${logFile}\n\nIf you used launch.sh, also include ~/.local/state/zombie-bagarre/launch.log when reporting this problem.`);
  app.exit(1);
}});
app.on('before-quit', () => startup.stop());
app.on('child-process-gone', (_event, details) => {log('CHILD PROCESS EXIT', JSON.stringify(details));startup.gpuExit(details);});
const graphicsMode = app.commandLine.getSwitchValue('graphics') || 'default';
try { for (const [name,value] of graphicsSwitches(process.platform,graphicsMode)) app.commandLine.appendSwitch(name,value); }
catch (error) { startup.fail(error.message); }
log('GRAPHICS REQUEST', JSON.stringify({mode:graphicsMode,angle:app.commandLine.getSwitchValue('use-angle') || 'automatic'}));
// Gamescope and Steam's overlay use Xwayland. Keep Chromium's normal GPU path,
// driver checks and renderer sandbox: no forced Vulkan or --no-sandbox flags.
if (process.platform === 'linux') app.commandLine.appendSwitch('ozone-platform', 'x11');
app.enableSandbox();
protocol.registerSchemesAsPrivileged([{scheme:'bagarre', privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let win;
if (!app.requestSingleInstanceLock()) { log('EXISTING INSTANCE', 'Asking the running game to show its window'); startup.stop(); app.quit(); }
else {
  app.on('second-instance', () => { if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); log('WINDOW', 'Existing window shown'); } });
  app.whenReady().then(async () => {
    startup.stage('creating the game window');
    app.getGPUInfo('basic').then(info => log('GPU INFO',JSON.stringify(info))).catch(error => log('GPU INFO FAILED',error.message));
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
    win = new BrowserWindow({width:1280,height:800,minWidth:800,minHeight:600,useContentSize:true,show:true,
      fullscreen:!smoke && !process.argv.includes('--windowed'),backgroundColor:'#162327',title:'Zombie Bagarre',
      icon:path.join(__dirname,'icon.png'),autoHideMenuBar:true,
      webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,
        webSecurity:true,webgl:true,backgroundThrottling:true,additionalArguments:[...(deck?['--bagarre-deck']:[]),...(smoke?['--bagarre-smoke']:[])]}});
    log('WINDOW CREATED', JSON.stringify({visible:win.isVisible(),bounds:win.getBounds()}));
    win.once('ready-to-show', () => log('WINDOW', 'First frame painted'));
    win.webContents.on('dom-ready', () => startup.stage('initializing the game and graphics'));
    win.webContents.on('console-message', details => {
      if(details.level === 'error') {
        log('RENDERER ERROR', details.message);
        if(smoke) startup.fail('Renderer error: ' + details.message);
      }
    });
    win.webContents.on('preload-error', (_event, _preload, error) => startup.fail('Desktop bridge failed: ' + error.message));
    win.webContents.on('render-process-gone', (_event, details) => {
      log('RENDERER EXIT', JSON.stringify(details));
      // A dead renderer cannot recover by remaining in Steam's Resume state.
      startup.fail('Game renderer stopped: ' + details.reason);
      app.exit(1);
    });
    win.webContents.on('did-fail-load', (_event, code, message, _url, isMainFrame) => {
      if(isMainFrame && code !== -3) startup.fail(`Game files failed to load (${code}): ${message}`);
    });
    win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    win.webContents.on('will-navigate', (event, url) => { if (!trustedURL(url)) event.preventDefault(); });
    win.webContents.on('will-attach-webview', event => event.preventDefault());
    const status = () => ({version:app.getVersion(),platform:process.platform,steamDeck:deck,fullscreen:win.isFullScreen(),graphicsMode,gpu:app.getGPUFeatureStatus().webgl2 || app.getGPUFeatureStatus().webgl || 'unknown'});
    for (const [channel, action] of Object.entries({
      'desktop:status':status,
      'desktop:fullscreen':() => {win.setFullScreen(!win.isFullScreen()); return win.isFullScreen();},
      'desktop:quit':() => app.quit(),
    })) ipcMain.handle(channel, (event) => { if (!trustedSender(event,win.webContents)) throw new Error('Untrusted frame'); return action(); });
    for (const event of ['enter-full-screen','leave-full-screen']) win.on(event, () => win.webContents.send('desktop:fullscreen-changed',win.isFullScreen()));
    for (const event of ['suspend','resume','lock-screen']) powerMonitor.on(event, () => win?.webContents.send('desktop:suspend'));
    ipcMain.on('desktop:loading', (event, message) => {
      if (trustedSender(event,win.webContents) && typeof message === 'string') startup.stage(message.slice(0,160));
    });
    ipcMain.on('desktop:ready', event => {
      if (!trustedSender(event,win.webContents)) return;
      startup.ready();
      log('GRAPHICS', JSON.stringify(status()));
      if (smoke) {console.log('SMOKE PASS: offline world, shaders, menu and desktop bridge initialized',JSON.stringify(status()));app.exit(0);}
    });
    startup.stage('loading the packaged game files');
    await win.loadURL(ORIGIN + '/');
  }).catch(error => startup.fail(error.stack || error.message));
  app.on('window-all-closed', () => app.quit());
}
