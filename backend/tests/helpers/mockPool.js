const jwt = require('jsonwebtoken');

// Token JWT valid untuk dipakai sebagai header Authorization di test functional (Supertest).
function authHeader(payload = { id: 1, email: 'pic.promosi@if.unpar.ac.id', nama: 'PIC Promosi' }) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

// Client transaksi tiruan untuk controller yang memakai pool.connect() (pembelian & penggunaan).
// `responses` adalah array berurutan sesuai urutan pemanggilan client.query() yang diharapkan
// (mis. BEGIN, INSERT ..., SELECT ... FOR UPDATE, ..., COMMIT) - tiap elemen berupa nilai resolve
// ({ rows: [...] }) atau instance Error untuk mensimulasikan query yang gagal.
function createMockClient(responses = []) {
  const query = jest.fn();
  responses.forEach((response) => {
    if (response instanceof Error) query.mockRejectedValueOnce(response);
    else query.mockResolvedValueOnce(response);
  });
  // Panggilan client.query() ekstra di luar yang didaftarkan (mis. BEGIN/COMMIT/ROLLBACK yang
  // tidak eksplisit dicantumkan) jatuh ke fallback ini supaya tidak melempar "no mock value".
  query.mockResolvedValue({ rows: [] });
  return { query, release: jest.fn() };
}

module.exports = { authHeader, createMockClient };
