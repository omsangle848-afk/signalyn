const { planFromReq, rateLimit, ip, send, readJson } = require('./_lib');

function fallback(product, plan) {
  const name = product.slice(0, 40);
  return {
    mock: true,
    icp: `Founders and growth teams who need "${name}" and are actively asking for recommendations online.`,
    signals: [
      { platform: 'Reddit', query: `looking for alternative to ${name}`, why: 'Direct switching intent' },
      { platform: 'X / Twitter', query: `anyone recommend a tool for ${name}`, why: 'Open recommendation request' },
      { platform: 'LinkedIn', query: `struggling with ${name} process`, why: 'Public pain point' },
    ].slice(0, plan.platforms > 3 ? 3 : 3),
    drafts: [
      { to: 'Reddit prospect', text: 'Saw your post about this. We built something that handles it end-to-end; happy to share a quick walkthrough if useful.' },
    ].slice(0, plan.drafts),
    note: 'Demo output. Add ANTHROPIC_API_KEY on the server for real AI results.',
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const { plan } = planFromReq(req);
  const limit = plan.id === 'free' ? 3 : 30;
  if (!rateLimit(ip(req) + ':analyze', limit, 60 * 60 * 1000)) {
    return send(res, 429, { error: 'Limit reached. Upgrade your plan for more runs.' });
  }

  const body = await readJson(req);
  const product = String(body.product || '').trim().slice(0, 600);
  if (product.length < 10) return send(res, 400, { error: 'Describe your product in at least 10 characters.' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(res, 200, { plan: plan.id, ...fallback(product, plan) });

  const prompt = `You are a B2B sales-intelligence analyst. A user describes their product:
"""${product}"""

Return ONLY valid JSON (no markdown) with this shape:
{"icp": "one-sentence ideal customer profile",
 "signals": [{"platform": "...", "query": "a realistic public post/search phrase a buyer would use", "why": "why it shows buying intent"}],
 "drafts": [{"to": "type of prospect", "text": "short, human, non-spammy outreach under 60 words"}]}
Rules: exactly ${Math.min(plan.platforms, 8)} signals across different platforms (Reddit, X, LinkedIn, YouTube comments, Product Hunt, Quora, Slack/Discord communities, G2 reviews...). Exactly ${plan.drafts} drafts. ${plan.deep ? 'Also add "competitors": [3 likely competitor names] and "risks": [2 short compliance tips about community rules].' : ''} Do not invent statistics.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) throw new Error('LLM HTTP ' + r.status);
    const j = await r.json();
    const text = (j.content || []).map((c) => c.text || '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    const out = JSON.parse(m ? m[0] : text);
    return send(res, 200, { plan: plan.id, mock: false, ...out });
  } catch (e) {
    return send(res, 200, { plan: plan.id, ...fallback(product, plan), note: 'AI busy, showing demo output.' });
  }
};
