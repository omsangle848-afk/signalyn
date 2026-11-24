// Local dev server: node server.js  ->  http://localhost:3000
// (On Vercel this file is not used; /api/*.js become serverless functions.)
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url.startsWith('/api/')) {
    const file = path.join(__dirname, 'api', url.slice(5) + '.js');
    if (!file.startsWith(path.join(__dirname, 'api')) || url.includes('_lib') || !fs.existsSync(file)) {
      res.statusCode = 404; return res.end('{}');
    }
    return require(file)(req, res);
  }
  const rel = url === '/' ? 'index.html' : url.slice(1);
  const f = path.join(__dirname, 'public', rel);
  if (!f.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('http://localhost:3000'));
