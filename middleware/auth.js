const crypto = require('crypto');
const h = s => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(h(a), h(b));
exports.check = (u, p) => {
  const okU = same(u, process.env.ADMIN_USER || 'xiaohua');
  const okP = same(p, process.env.ADMIN_PASS || 'xiaohua');
  return okU && okP;
};
exports.requireAdmin = (req, res, next) =>
  req.session.admin ? next() : res.redirect('/admin/login');
