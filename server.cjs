const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, 'dist');
const port = Number(process.env.PORT || 4174);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  fs.readFile(file, (error, content) => {
    if (error) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(content);
  });
});
server.listen(port, '127.0.0.1', () => console.log(`Owner prototype: http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
