// Functional test - komponen NotificationModal (UC-05, notifikasi restock).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, expect } from 'vitest';
import NotificationModal from '../../src/components/layout/NotificationModal';

describe('NotificationModal', () => {
  test('menampilkan pesan kosong saat tidak ada notifikasi', () => {
    render(<NotificationModal data={[]} onClose={() => {}} />);
    expect(screen.getByText('Tidak ada notifikasi baru.')).toBeInTheDocument();
  });

  test('menampilkan daftar notifikasi dengan nama aset, sisa stok, dan threshold', () => {
    const data = [
      { pesan_notifikasi_id: 1, aset_nama: 'Tumbler Informatika', stok: 8, threshold_qty: 10 },
      { pesan_notifikasi_id: 2, aset_nama: 'Totebag Informatika', stok: 18, threshold_qty: 20 },
    ];
    render(<NotificationModal data={data} onClose={() => {}} />);

    expect(screen.getByText('Tumbler Informatika')).toBeInTheDocument();
    expect(screen.getByText('Totebag Informatika')).toBeInTheDocument();
    expect(screen.getAllByText(/tersisa/)).toHaveLength(2);
  });

  test('memanggil onClose saat area di luar modal (overlay) diklik', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<NotificationModal data={[]} onClose={onClose} />);

    // Overlay adalah elemen pertama, position:fixed menutupi seluruh layar
    await user.click(container.firstChild);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
