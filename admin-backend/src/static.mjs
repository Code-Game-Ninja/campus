import fs from 'node:fs';
import path from 'node:path';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function safePath(root, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^[/\\]+/, '');
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  return resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${path.sep}`) ? resolved : null;
}

export function serveStatic(root, request, response, pathname) {
  if (!['GET', 'HEAD'].includes(request.method)) return false;
  const requested = safePath(root, pathname);
  if (!requested) return false;

  let filePath = requested;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    if (path.extname(pathname)) return false;
    filePath = safePath(root, '/') || filePath;
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  const isIndex = path.basename(filePath) === 'index.html';
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cache-Control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  if (request.method === 'HEAD') response.end();
  else fs.createReadStream(filePath).pipe(response);
  return true;
}
