const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { login, me } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// NFR-11 - Batasi percobaan login untuk mencegah brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', authMiddleware, me);

module.exports = router;
