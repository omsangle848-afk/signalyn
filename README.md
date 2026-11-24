# Signalyn

AI buyer-intent radar: describe your product, get ideal-customer profile, buying signals to watch, and outreach drafts. 3D landing page, Claude backend, Razorpay plans (₹99 / ₹499 / ₹999).

## Stack
- Frontend: plain HTML/CSS + Three.js (3D network, tilt cards, scroll camera)
- Backend: Vercel serverless functions in `/api` (zero npm dependencies)
- LLM: Anthropic Claude API
- Payments: Razorpay Orders + HMAC signature verification
- Plan access: signed 30-day token (HMAC), issued only after verified payment

## Run locally
```
node server.js     # http://localhost:3000
```
Without keys the AI returns demo output and payments are disabled.

## Deploy free on Vercel
1. Push this repo to GitHub.
2. vercel.com -> Add New Project -> import the repo -> Deploy (no build settings needed).
3. Project -> Settings -> Environment Variables: add everything from `.env.example`.
4. Redeploy. Test payments with Razorpay **test** keys first, then switch to live keys.

(Netlify/Render also work, but the `/api` functions are written for Vercel.)

## Known limits (upgrade path)
- No database: plan = signed token in the browser; per-hour limits are best-effort per serverless instance. For real accounts, usage quotas and renewals, add Supabase (free tier) and store users, payments and usage.
- Razorpay webhooks are not wired; add `/api/webhook` if you want refunds/failed-payment handling.
- Lead "signals" are AI-suggested search phrases. Live scraping of platforms needs each platform's official API and terms.
