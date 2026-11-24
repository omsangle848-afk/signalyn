const { planFromReq, send } = require('./_lib');

module.exports = (req, res) => {
  const { plan, exp } = planFromReq(req);
  send(res, 200, { plan: plan.id, name: plan.name, expires: exp });
};
