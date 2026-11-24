const { PLANS, send, readJson, rateLimit, ip } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!rateLimit(ip(req) + ':order', 10, 10 * 60 * 1000)) return send(res, 429, { error: 'Too many attempts' });

  const { plan: planId } = await readJson(req);
  const plan = PLANS[planId];
  if (!plan) return send(res, 400, { error: 'Unknown plan' });

  const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return send(res, 503, { error: 'Payments not configured yet (add Razorpay keys).' });

  try {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
      },
      body: JSON.stringify({
        amount: plan.price * 100, // paise; price is decided on the SERVER, never trusted from client
        currency: 'INR',
        receipt: `sig_${plan.id}_${Date.now()}`,
        notes: { plan: plan.id },
      }),
    });
    const order = await r.json();
    if (!r.ok) return send(res, 502, { error: order.error?.description || 'Razorpay error' });
    return send(res, 200, { keyId, orderId: order.id, amount: order.amount, currency: order.currency, plan: plan.id, name: plan.name });
  } catch (e) {
    return send(res, 500, { error: 'Could not create order' });
  }
};
