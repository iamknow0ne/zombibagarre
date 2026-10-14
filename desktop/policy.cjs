const path = require('node:path');
const ORIGIN = 'bagarre://game';
function trustedURL(value) {
  try { const u = new URL(value); return u.protocol === 'bagarre:' && u.host === 'game' && !u.username && !u.password; }
  catch { return false; }
}
function assetPath(value, root) {
  if (!trustedURL(value)) return null;
  try {
    const name = decodeURIComponent(new URL(value).pathname);
    if (name.includes('\0') || name.includes('\\')) return null;
    const target = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    return target.startsWith(path.resolve(root) + path.sep) ? target : null;
  } catch { return null; }
}
function trustedSender(event, contents) {
  return event.sender === contents && event.senderFrame === contents.mainFrame && trustedURL(event.senderFrame?.url);
}
module.exports = {ORIGIN, trustedURL, assetPath, trustedSender};

// WebAssembly/blob scripts belong only to our packaged emulator frame. The
// main game keeps its stricter script policy and native IPC remains main-frame only.
function contentPolicy(url){
 const retro=trustedURL(url)&&new URL(url).pathname==='/retro/play.html';
 return `default-src 'self'; script-src 'self'${retro?" blob: 'wasm-unsafe-eval' 'unsafe-eval'":''}; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'${retro?' blob:':''}; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-src ${retro?"'none'":"bagarre://game/retro/play.html"}; frame-ancestors ${retro?"'self'":"'none'"}`;
}
module.exports.contentPolicy=contentPolicy;
