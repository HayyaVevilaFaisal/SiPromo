//membantu melindungi dari CSRF
const { SESSION_COOKIE, frontendOrigin } = require('../utils/authCookies');
// cookie dikirim otomatis oleh browser. mutasi dengan sesi cookie harus berasal dari frontend yang dikonfigurasi, termasuk ketika origin lain masih satu site.
module.exports = (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.cookies?.[SESSION_COOKIE]) {
    if (req.get('Origin') !== frontendOrigin()) {
      return res.status(403).json({ message: 'Origin permintaan tidak diizinkan' });
    }
  }
  next();
};
