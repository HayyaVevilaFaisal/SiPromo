// Middleware penanganan error terpusat
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.statusCode || 500;
  // Error tak terduga (500) tidak boleh membocorkan detail internal (mis. pesan error database)
  const message = status === 500 ? 'Terjadi kesalahan pada server' : err.message;
  res.status(status).json({ message });
}

module.exports = errorHandler;
