require('dotenv').config();

const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    const result = await pool.query(`
      SELECT current_database() AS database_name
    `);

    console.log(
      `Berhasil terhubung ke database PostgreSQL: ${result.rows[0].database_name}`
    );

    app.listen(PORT, () => {
      console.log(
        `Server Aset Promosi berjalan di http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      'Gagal terhubung ke PostgreSQL:',
      error.message
    );

    process.exit(1);
  }
}

startServer();