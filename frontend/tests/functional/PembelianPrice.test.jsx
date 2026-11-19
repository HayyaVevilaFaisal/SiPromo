import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect } from 'vitest';
import PembelianAsetForm from '../../src/pages/PembelianAset/PembelianAsetForm';
vi.mock('../../src/components/common/PageHeader', () => ({ default: () => null }));
const assets = [{ aset_id: 1, nama: 'Pin', harga: '4500.00' }, { aset_id: 2, nama: 'Tas', harga: '7000.00' }];
function Harness({ editing = false }) {
  const [form, setForm] = useState({ vendor_id: '', tanggal: '', status: 'Lunas', catatan: '', daftar_aset: [{ aset_id: editing ? 1 : '', qty_in: 2, unit_price: editing ? 3000 : '' }] });
  return <PembelianAsetForm editing={editing} form={form} setForm={setForm} asetList={assets} vendorList={[]} onSubmit={e => e.preventDefault()} />;
}
test('pilih aset autofill harga, edit harga menghitung total, ganti aset mengambil harga baru', async () => {
  render(<Harness />);
  const user = userEvent.setup();
  const asset = screen.getAllByRole('combobox')[2];
  await user.selectOptions(asset, '1');
  const price = screen.getByRole('spinbutton', { name: 'Harga satuan aset 1' });
  expect(price).toHaveValue(4500);
  expect(screen.getByText('TOTAL NILAI : Rp9.000')).toBeInTheDocument();
  await user.clear(price);
  await user.type(price, '5000');
  expect(screen.getByText('TOTAL NILAI : Rp10.000')).toBeInTheDocument();
  await user.selectOptions(asset, '2');
  expect(price).toHaveValue(7000);
});
test('edit menampilkan harga transaksi tersimpan, meskipun harga aset sudah berubah', () => {
  render(<Harness editing />);
  expect(screen.getByRole('spinbutton', { name: 'Harga satuan aset 1' })).toHaveValue(3000);
  expect(screen.getByText('TOTAL NILAI : Rp6.000')).toBeInTheDocument();
});
