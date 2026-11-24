// Shared helpers: zero dependencies (works on Vercel free tier without npm install)
const crypto = require('crypto');

const PLANS = {
  starter: { id: 'starter', name: 'Starter', price: 99, drafts: 3, platforms: 5, deep: false },
  pro:     { id: 'pro',     name: 'Pro',     price: 499, drafts: 8, platforms: 12, deep: true },
  scale:   { id: 'scale',   name: 'Scale',   price: 999, drafts: 15, platforms: 20, deep: true },
};
const FREE = { id: 'free', name: 'Free trial', price: 0, drafts: 1, platforms: 3, deep: false };

const b64u = (b) => Buffer.from(b).toString('base64url');
const secret = () => process.env.JWT_SECRET || 'dev-only-change-me';

function signToken(payload, days = 30) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + days * 86400 };
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const data = head + '.' + b64u(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return data + '.' + sig;
}

function verifyToken(token) {
  try {
    const [h, p, s] = String(token || '').split('.');
    if (!h || !p || !s) return null;
    const expected = crypto.createHmac('sha256', secret()).update(h + '.' + p).digest('base64url');
    const a = Buffer.from(s), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const body = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (body.exp < Math.floor(Date.now() / 1000)) return null;
    return body;
  } catch { return null; }
}

function planFromReq(req) {
  const auth = req.headers['authorization'] || '';
  const tok = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const body = verifyToken(tok);
  if (body && PLANS[body.plan]) return { plan: PLANS[body.plan], exp: body.exp };
  return { plan: FREE, exp: null };
}

// Simple per-instance rate limit (best-effort on serverless; use Redis/Supabase for strict limits)
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}

function ip(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return {}; }
}

module.exports = { PLANS, FREE, signToken, verifyToken, planFromReq, rateLimit, ip, send, readJson, crypto };
