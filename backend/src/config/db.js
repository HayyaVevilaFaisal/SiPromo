const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => console.log('Terhubung ke PostgreSQL'));
pool.on('error', (err) => console.error('Kesalahan koneksi PostgreSQL:', err));

module.exports = pool;
