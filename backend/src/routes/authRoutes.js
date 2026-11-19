//mendefiniskan end point autentikan yang dapat di akses oleh frontend

const express = require('express');//menyediakan router untuk endpoint
const rateLimit = require('express-rate-limit');
const { startGoogleLogin, googleCallback, me, logout } = require('../controllers/authController');
const { passport } = require('../config/googlePassport');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' },
});
router.get('/google', loginLimiter, passport.initialize(), startGoogleLogin);
router.get('/google/callback', passport.initialize(), googleCallback);

router.get('/me', authMiddleware, me);
router.post('/logout', logout);
module.exports = router;
