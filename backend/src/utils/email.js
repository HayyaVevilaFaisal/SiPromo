function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
module.exports = { normalizeEmail, isValidEmail };
