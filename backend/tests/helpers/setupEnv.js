// Nilai env deterministik untuk seluruh test suite - tidak bergantung pada .env asli developer,
// supaya token JWT yang dibuat di test selalu bisa diverifikasi oleh authMiddleware.
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
