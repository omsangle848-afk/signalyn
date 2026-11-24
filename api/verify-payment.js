const { PLANS, send, readJson, signToken, crypto } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const b = await readJson(req);
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return send(res, 503, { error: 'Payments not configured' });
  if (!b.razorpay_order_id || !b.razorpay_payment_id || !b.razorpay_signature) {
    return send(res, 400, { error: 'Missing payment fields' });
  }

  const expected = crypto.createHmac('sha256', keySecret)
    .update(b.razorpay_order_id + '|' + b.razorpay_payment_id).digest('hex');
  const a = Buffer.from(expected), c = Buffer.from(String(b.razorpay_signature));
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return send(res, 400, { error: 'Invalid signature' });

  // Plan comes from the order we created (looked up at Razorpay), not from the browser
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const r = await fetch('https://api.razorpay.com/v1/orders/' + encodeURIComponent(b.razorpay_order_id), {
      headers: { authorization: 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64') },
    });
    const order = await r.json();
    const plan = PLANS[order?.notes?.plan];
    if (!r.ok || !plan || order.status !== 'paid') return send(res, 400, { error: 'Order not paid' });
    const token = signToken({ plan: plan.id, pay: b.razorpay_payment_id }, 30);
    return send(res, 200, { ok: true, plan: plan.id, name: plan.name, token });
  } catch {
    return send(res, 500, { error: 'Verification failed' });
  }
};
