// Production + local server: node server.js  ->  http://localhost:3000
// Works on Render/Railway/any Node host. (On Vercel, /api/*.js run as serverless functions instead.)
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const API = path.join(__dirname, 'api'), PUB = path.join(__dirname, 'public');

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/healthz') { res.statusCode = 200; return res.end('ok'); }
    if (url.startsWith('/api/')) {
      const file = path.join(API, url.slice(5) + '.js');
      if (!file.startsWith(API + path.sep) || path.basename(file).startsWith('_') || !fs.existsSync(file)) {
        res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end('{}');
      }
      return await require(file)(req, res);
    }
    const f = path.join(PUB, url === '/' ? 'index.html' : url.slice(1));
    if (!f.startsWith(PUB + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
      res.statusCode = 404; return res.end('Not found');
    }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); }
    res.end('{"error":"Server error"}');
  }
}).listen(process.env.PORT || 3000, () => console.log('Signalyn running on port ' + (process.env.PORT || 3000)));
