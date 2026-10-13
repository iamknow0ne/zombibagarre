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
