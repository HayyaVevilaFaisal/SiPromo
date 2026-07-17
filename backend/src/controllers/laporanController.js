const path = require('path');
const pool = require('../config/db');
const PDFDocument = require('pdfkit');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'unpar-logo.png');
const FONT = 'Times-Roman';
const FONT_BOLD = 'Times-Bold';
const ACCENT = '#1b4d3e';
const GOLD = '#c99a2e';
const GOLD_TINT = '#faf1da';
const GRAY = '#4b5563';
const BORDER = '#8a8f98';
const TEXT = '#1a1a1a';

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatTanggalPanjang(date) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// FR-18, UC-09 - Rekap laporan pembelian, penggunaan & stok per tahun ajaran
async function buildLaporan(tahunAjaranId) {
  // "Aktif" di sini = tahun ajaran (aktif/tidak diarsipkan) yang memuat transaksi pembelian/
  // penggunaan dengan tanggal PALING BARU - bukan sekadar tahun ajaran yang paling baru dibuat.
  // Dengan begitu, menambahkan tahun ajaran baru tanpa transaksi apa pun belum memindahkan status
  // "aktif" (dan rekap stok yang menyertainya) sampai transaksi pertama benar-benar tercatat di
  // periode itu - jadi rekap stok tidak pernah "hilang sementara" hanya karena periode baru sudah
  // dibuat lebih dulu untuk keperluan perencanaan. Kalau belum ada transaksi sama sekali di semua
  // tahun ajaran, fallback ke tahun ajaran dengan tanggal_mulai paling baru.
  const taRes = await pool.query(
    `SELECT ta.*, COALESCE(ta.tahun_ajaran_id = latest.tahun_ajaran_id, false) AS is_tahun_ajaran_aktif
     FROM tahun_ajaran ta
     LEFT JOIN (
       SELECT ta2.tahun_ajaran_id
       FROM tahun_ajaran ta2
       WHERE ta2.is_active = true
       ORDER BY GREATEST(
         COALESCE(
           (SELECT MAX(p.tanggal) FROM pembelian p
              JOIN header_pembelian hp ON hp.pembelian_id = p.pembelian_id
              WHERE hp.tahun_ajaran_id = ta2.tahun_ajaran_id AND p.is_active = true),
           '-infinity'
         ),
         COALESCE(
           (SELECT MAX(k.tanggal) FROM kegiatan k
              WHERE k.tahun_ajaran_id = ta2.tahun_ajaran_id AND k.is_active = true),
           '-infinity'
         )
       ) DESC, ta2.tanggal_mulai DESC
       LIMIT 1
     ) latest ON true
     WHERE ta.tahun_ajaran_id = $1`,
    [tahunAjaranId]
  );
  if (!taRes.rows[0]) return null;
  const tahunAjaranAktif = taRes.rows[0].is_tahun_ajaran_aktif;

  const pembelianRes = await pool.query(
    `SELECT dp.pembelian_id, p.tanggal, p.status, v.nama AS vendor_nama,
            a.nama AS aset_nama, d.nama AS dimensi_nama, dp.qty_in, dp.unit_price,
            (dp.qty_in * dp.unit_price) AS total_harga
     FROM detail_pembelian dp
     JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
     JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
     JOIN vendor v ON v.vendor_id = hp.vendor_id
     JOIN aset a ON a.aset_id = dp.aset_id
     LEFT JOIN dimensi_aset d ON d.dimensi_aset_id = a.dimensi_aset_id
     WHERE hp.tahun_ajaran_id = $1 AND p.is_active = true
     ORDER BY p.tanggal DESC, v.nama ASC`,
    [tahunAjaranId]
  );

  const penggunaanRes = await pool.query(
    `SELECT ak.kegiatan_id, k.nama AS kegiatan_nama, k.tanggal,
            a.nama AS aset_nama, d.nama AS dimensi_nama, ak.qty_out,
            latest.vendor_nama
     FROM aset_keluar ak
     JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
     JOIN aset a ON a.aset_id = ak.aset_id
     LEFT JOIN dimensi_aset d ON d.dimensi_aset_id = a.dimensi_aset_id
     LEFT JOIN (
       SELECT DISTINCT ON (dp.aset_id) dp.aset_id, v.nama AS vendor_nama
       FROM detail_pembelian dp
       JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
       JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
       JOIN vendor v ON v.vendor_id = hp.vendor_id
       ORDER BY dp.aset_id, p.tanggal DESC, dp.pembelian_id DESC
     ) latest ON latest.aset_id = a.aset_id
     WHERE k.tahun_ajaran_id = $1 AND k.is_active = true
     ORDER BY k.tanggal DESC, a.nama ASC`,
    [tahunAjaranId]
  );

  // Rekap stok hanya ditampilkan untuk tahun ajaran yang "aktif" (lihat definisi di atas) - sisa_stok
  // memakai stok saat ini secara langsung, tanpa rekonstruksi mundur. Untuk tahun ajaran lain,
  // rekonstruksi semacam itu butuh membalikkan transaksi-transaksi setelah periode tersebut, tapi
  // koreksi stok manual di luar alur pembelian/penggunaan (lewat halaman Ubah Aset, yang tidak
  // tercatat sebagai transaksi apa pun) membuat hasilnya tidak bisa diandalkan - jadi bagian ini
  // sengaja tidak ditampilkan sama sekali di luar tahun ajaran aktif.
  const stokRes = tahunAjaranAktif ? await pool.query(
    `WITH aktivitas_ta AS (
       -- Aset dengan pembelian/penggunaan AKTIF pada tahun ajaran ini, dipakai untuk menandai baris
       -- (bukan untuk membatasi baris - rekap ini sengaja mencakup SELURUH aset aktif, supaya aset
       -- yang stoknya sudah kritis tapi tidak tersentuh tahun ajaran ini tetap kelihatan).
       SELECT dp.aset_id FROM detail_pembelian dp
         JOIN header_pembelian hp ON hp.pembelian_id = dp.pembelian_id
         JOIN pembelian p ON p.pembelian_id = dp.pembelian_id
         WHERE hp.tahun_ajaran_id = $1 AND p.is_active = true
       UNION
       SELECT ak.aset_id FROM aset_keluar ak
         JOIN kegiatan k ON k.kegiatan_id = ak.kegiatan_id
         WHERE k.tahun_ajaran_id = $1 AND k.is_active = true
     )
     SELECT a.aset_id, a.nama, a.harga, a.threshold_qty,
            d.nama AS dimensi_nama, l.nama AS lokasi_nama, a.stok AS sisa_stok,
            (a.aset_id IN (SELECT aset_id FROM aktivitas_ta)) AS ada_perubahan
     FROM aset a
     LEFT JOIN dimensi_aset d ON d.dimensi_aset_id = a.dimensi_aset_id
     LEFT JOIN lokasi_penyimpanan l ON l.lokasi_penyimpanan_id = a.lokasi_penyimpanan_id
     WHERE a.is_active = true
     ORDER BY a.nama ASC`,
    [tahunAjaranId]
  ) : { rows: [] };

  const ringkasan = {
    total_nilai_pembelian: pembelianRes.rows.reduce((sum, r) => sum + Number(r.total_harga), 0),
    jumlah_transaksi_pembelian: new Set(pembelianRes.rows.map((r) => r.pembelian_id)).size,
    total_qty_masuk: pembelianRes.rows.reduce((sum, r) => sum + Number(r.qty_in), 0),
    total_qty_keluar: penggunaanRes.rows.reduce((sum, r) => sum + Number(r.qty_out), 0),
    jumlah_kegiatan: new Set(penggunaanRes.rows.map((r) => r.kegiatan_id)).size,
    total_sisa_stok: stokRes.rows.reduce((sum, r) => sum + Number(r.sisa_stok), 0),
  };

  return {
    tahun_ajaran: taRes.rows[0],
    ringkasan,
    rincian_pembelian: pembelianRes.rows,
    rincian_penggunaan: penggunaanRes.rows,
    rekap_stok: stokRes.rows,
  };
}

async function getLaporan(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;
    if (!tahunAjaranId) return res.status(400).json({ message: 'Parameter tahunAjaranId wajib diisi' });

    const laporan = await buildLaporan(tahunAjaranId);
    if (!laporan) return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });

    res.json(laporan);
  } catch (err) { next(err); }
}

// Tabel kolom-tetap dengan header berulang tiap ganti halaman - dipakai untuk ketiga rincian di PDF.
// Bergaris penuh (horizontal & vertikal) dengan header berlatar pucat, meniru gaya tabel dokumen
// resmi (surat edaran UNPAR) - bukan header blok warna solid ala aplikasi web.
// Tinggi tiap baris dihitung dinamis (bukan tetap) supaya sel yang teksnya membungkus ke 2 baris
// (mis. nama vendor panjang) tidak tumpang tindih dengan baris di bawahnya.
function renderTable(doc, { columns, rows, startY, emptyMessage }) {
  const startX = doc.page.margins.left;
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const padX = 5;
  const padY = 6;
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;

  function measureHeight(values, font, size) {
    doc.font(font).fontSize(size);
    let maxH = 0;
    columns.forEach((col, i) => {
      const h = doc.heightOfString(String(values[i]), { width: col.width - padX * 2 });
      if (h > maxH) maxH = h;
    });
    return maxH + padY * 2;
  }

  function drawColumnDividers(y, h) {
    let x = startX;
    doc.strokeColor(BORDER).lineWidth(0.5);
    columns.forEach((col) => {
      doc.moveTo(x, y).lineTo(x, y + h).stroke();
      x += col.width;
    });
    doc.moveTo(x, y).lineTo(x, y + h).stroke();
  }

  // Kolom sempit (mis. "Dimensi", "Threshold") bisa membuat label header terpotong/patah
  // di tengah kata pada ukuran font standar - cari ukuran font terbesar yang membuat SEMUA
  // label header muat dalam satu baris, supaya tidak ada tulisan header yang terputus.
  function fitHeaderFontSize(labels) {
    let size = 8;
    while (size > 6) {
      doc.font(FONT_BOLD).fontSize(size);
      const fits = labels.every((label, i) => doc.widthOfString(label) <= columns[i].width - padX * 2);
      if (fits) return size;
      size -= 0.5;
    }
    return 6;
  }

  function drawHeader(y) {
    const labels = columns.map((c) => c.label.toUpperCase());
    const headerFontSize = fitHeaderFontSize(labels);
    const h = measureHeight(labels, FONT_BOLD, headerFontSize);
    doc.rect(startX, y, tableWidth, h).fillAndStroke(GOLD_TINT, BORDER);
    let x = startX;
    doc.font(FONT_BOLD).fontSize(headerFontSize).fillColor(TEXT);
    columns.forEach((col, i) => {
      doc.text(labels[i], x + padX, y + padY, { width: col.width - padX * 2, align: col.headerAlign || 'center', lineBreak: false });
      x += col.width;
    });
    drawColumnDividers(y, h);
    doc.fillColor(TEXT);
    return y + h;
  }

  let y = drawHeader(startY);

  if (rows.length === 0) {
    const h = 22;
    doc.rect(startX, y, tableWidth, h).stroke(BORDER);
    doc.font(FONT).fontSize(9).fillColor(GRAY).text(emptyMessage, startX + padX, y + 6);
    return y + h;
  }

  rows.forEach((row) => {
    const values = columns.map((col) => col.render(row));
    const rowHeight = measureHeight(values, FONT, 8.5);

    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = drawHeader(doc.page.margins.top);
    }
    let x = startX;
    doc.font(FONT).fontSize(8.5);
    columns.forEach((col, i) => {
      doc.fillColor(col.color ? col.color(row) : TEXT);
      doc.text(values[i], x + padX, y + padY, { width: col.width - padX * 2, align: col.align || 'left' });
      x += col.width;
    });
    drawColumnDividers(y, rowHeight);
    doc.strokeColor(BORDER).lineWidth(0.5)
      .moveTo(startX, y + rowHeight).lineTo(startX + tableWidth, y + rowHeight).stroke();
    y += rowHeight;
  });

  doc.fillColor(TEXT);
  return y;
}

// Baris "label : nilai" dengan tinggi dihitung dinamis (bukan tetap), supaya label yang
// membungkus ke 2 baris (mis. "Total Sisa Stok Saat Ini") tidak tumpang tindih dengan baris berikutnya.
function drawLabelValue(doc, label, value, y, labelWidth, contentWidth) {
  const left = doc.page.margins.left;
  doc.font(FONT_BOLD).fontSize(9.5);
  const labelHeight = doc.heightOfString(label, { width: labelWidth });
  doc.font(FONT).fontSize(9.5);
  const valueHeight = doc.heightOfString(`: ${value}`, { width: contentWidth - labelWidth });
  const lineHeight = Math.max(labelHeight, valueHeight);

  doc.font(FONT_BOLD).fontSize(9.5).fillColor(TEXT).text(label, left, y, { width: labelWidth });
  doc.font(FONT).fontSize(9.5).fillColor(TEXT).text(`: ${value}`, left + labelWidth, y, { width: contentWidth - labelWidth });
  return y + lineHeight + 5;
}

function drawSectionTitle(doc, text, y) {
  const startX = doc.page.margins.left;
  doc.font(FONT_BOLD).fontSize(11).fillColor(TEXT).text(text, startX, y);
  return y + 18;
}

// Baris subtotal polos (tanpa warna latar) - hanya garis tipis di atas & teks tebal,
// supaya warna tetap eksklusif untuk header kolom tabel.
function drawSubtotalBar(doc, label, value, y, tableWidth) {
  const startX = doc.page.margins.left;
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(startX, y).lineTo(startX + tableWidth, y).stroke();
  doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT)
    .text(`${label} ${value}`, startX, y + 6, { width: tableWidth - 10, align: 'right' });
  doc.font(FONT);
  return y + 20;
}

// Kolom didefinisikan sebagai bobot relatif, lalu diskalakan supaya total lebar tabel
// selalu pas dengan lebar konten halaman (rata kiri-kanan), bukan menyisakan celah di kanan.
function scaleColumns(columns, totalWidth) {
  const sumWeights = columns.reduce((sum, c) => sum + c.width, 0);
  return columns.map((c) => ({ ...c, width: (c.width / sumWeights) * totalWidth }));
}

// FR-19, NFR-14, UC-10 - Ekspor laporan ke PDF, mengikuti gaya kop surat resmi UNPAR
async function exportLaporanPdf(req, res, next) {
  try {
    const { tahunAjaranId } = req.query;
    if (!tahunAjaranId) return res.status(400).json({ message: 'Parameter tahunAjaranId wajib diisi' });

    const laporan = await buildLaporan(tahunAjaranId);
    if (!laporan) return res.status(404).json({ message: 'Tahun ajaran tidak ditemukan' });

    const { tahun_ajaran: ta, ringkasan, rincian_pembelian, rincian_penggunaan, rekap_stok } = laporan;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-aset-promosi-${ta.tahun.replace('/', '-')}-${ta.semester}.pdf`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    doc.pipe(res);

    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // --- Kop surat ---
    doc.image(LOGO_PATH, left, 38, { width: 46 });
    doc.font(FONT_BOLD).fontSize(13).fillColor(ACCENT)
      .text('UNIVERSITAS KATOLIK PARAHYANGAN', left + 58, 40, { width: contentWidth - 58 });
    doc.font(FONT).fontSize(10).fillColor(GRAY)
      .text('Program Studi Informatika', left + 58, 58);

    // --- Judul ---
    doc.font(FONT_BOLD).fontSize(15).fillColor(TEXT)
      .text('LAPORAN ASET PROMOSI', left, 116, { width: contentWidth, align: 'center' });

    // --- Metadata ---
    let y = 152;
    const metaLabelWidth = 105;
    y = drawLabelValue(doc, 'Perihal', `Rekap pembelian, penggunaan, dan stok aset promosi tahun ajaran ${ta.semester} ${ta.tahun}`, y, metaLabelWidth, contentWidth);
    y = drawLabelValue(doc, 'Tahun Ajaran', `${ta.semester} ${ta.tahun} (${formatTanggalPanjang(new Date(ta.tanggal_mulai))} - ${formatTanggalPanjang(new Date(ta.tanggal_selesai))})`, y, metaLabelWidth, contentWidth);
    y = drawLabelValue(doc, 'Tanggal Cetak', formatTanggalPanjang(new Date()), y, metaLabelWidth, contentWidth);
    y += 12;

    // --- Ringkasan: ditulis sebagai teks formal biasa (bukan tabel/kartu) - warna disisakan
    // khusus untuk header kolom tabel di bawah, bukan untuk bagian ini.
    y = drawLabelValue(doc, 'Total Nilai Pembelian', `${formatRupiah(ringkasan.total_nilai_pembelian)} (${ringkasan.jumlah_transaksi_pembelian} transaksi, ${ringkasan.total_qty_masuk} unit masuk)`, y, metaLabelWidth, contentWidth);
    y = drawLabelValue(doc, 'Total Unit Digunakan', `${ringkasan.total_qty_keluar} unit (${ringkasan.jumlah_kegiatan} kegiatan)`, y, metaLabelWidth, contentWidth);
    if (ta.is_tahun_ajaran_aktif) {
      y = drawLabelValue(doc, 'Total Sisa Stok Saat Ini', `${ringkasan.total_sisa_stok} unit (aset terkait tahun ajaran ini)`, y, metaLabelWidth, contentWidth);
    }
    y += 8;

    // --- Rincian Pembelian Aset ---
    y = drawSectionTitle(doc, 'Rincian Pembelian Aset', y);
    const pembelianCols = scaleColumns([
      { label: 'Tanggal', width: 58, render: (r) => new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
      { label: 'Vendor', width: 72, render: (r) => r.vendor_nama },
      { label: 'Status', width: 50, render: (r) => r.status },
      { label: 'Aset', width: 85, render: (r) => r.aset_nama },
      { label: 'Dimensi', width: 40, render: (r) => r.dimensi_nama || '-' },
      { label: 'Qty', width: 35, align: 'right', render: (r) => String(r.qty_in) },
      { label: 'Harga Satuan', width: 65, align: 'right', render: (r) => formatRupiah(r.unit_price) },
      { label: 'Total', width: 75, align: 'right', render: (r) => formatRupiah(r.total_harga) },
    ], contentWidth);
    y = renderTable(doc, { columns: pembelianCols, rows: rincian_pembelian, startY: y, emptyMessage: 'Belum ada data pembelian.' });
    if (rincian_pembelian.length > 0) {
      y = drawSubtotalBar(doc, 'Subtotal Pembelian:', formatRupiah(ringkasan.total_nilai_pembelian), y, contentWidth);
    }
    y += 20;

    // --- Rincian Pencatatan Penggunaan Aset ---
    y = drawSectionTitle(doc, 'Rincian Pencatatan Penggunaan Aset', y);
    const penggunaanCols = scaleColumns([
      { label: 'Tanggal', width: 55, render: (r) => new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
      { label: 'Kegiatan', width: 120, render: (r) => r.kegiatan_nama },
      { label: 'Aset', width: 110, render: (r) => r.aset_nama },
      { label: 'Dimensi', width: 55, render: (r) => r.dimensi_nama || '-' },
      { label: 'Qty Keluar', width: 60, align: 'right', render: (r) => String(r.qty_out) },
      { label: 'Vendor', width: 95, render: (r) => r.vendor_nama || '-' },
    ], contentWidth);
    y = renderTable(doc, { columns: penggunaanCols, rows: rincian_penggunaan, startY: y, emptyMessage: 'Belum ada data penggunaan.' });
    if (rincian_penggunaan.length > 0) {
      y = drawSubtotalBar(doc, 'Subtotal Unit Keluar:', `${ringkasan.total_qty_keluar} unit`, y, contentWidth);
    }
    y += 20;

    // --- Rekap Stok Aset ---
    if (ta.is_tahun_ajaran_aktif) {
      if (y > doc.page.height - doc.page.margins.bottom - 100) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      y = drawSectionTitle(doc, 'Rekap Stok Aset (Saat Ini)', y);
      const stokCols = scaleColumns([
        { label: 'Aset', width: 135, render: (r) => r.nama },
        { label: 'Dimensi', width: 50, render: (r) => r.dimensi_nama || '-' },
        { label: 'Sisa Stok', width: 55, align: 'right', render: (r) => String(r.sisa_stok) },
        { label: 'Threshold', width: 55, align: 'right', render: (r) => String(r.threshold_qty) },
        { label: 'Lokasi', width: 90, render: (r) => r.lokasi_nama || '-' },
        { label: 'Status', width: 55, render: (r) => (r.sisa_stok < r.threshold_qty ? 'Kritis' : 'Aman') },
        { label: 'Aktivitas', width: 55, render: (r) => (r.ada_perubahan ? 'Ada' : '-') },
      ], contentWidth);
      y = renderTable(doc, { columns: stokCols, rows: rekap_stok, startY: y, emptyMessage: 'Belum ada data stok.' });
      if (rekap_stok.length > 0) {
        drawSubtotalBar(doc, 'Subtotal Sisa Stok:', `${ringkasan.total_sisa_stok} unit`, y, contentWidth);
      }
    }

    // --- Footer dua warna di setiap halaman, sampai ke tepi kertas (meniru kop resmi UNPAR) ---
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);
      const barHeight = 20;
      const barY = doc.page.height - barHeight;
      const greenWidth = doc.page.width * 0.62;
      doc.rect(0, barY, greenWidth, barHeight).fill(ACCENT);
      doc.rect(greenWidth, barY, doc.page.width - greenWidth, barHeight).fill(GOLD);
      // Menulis di dalam margin bawah biasanya memicu pdfkit menambah halaman baru
      // secara otomatis; nonaktifkan sementara agar footer tidak membuat halaman kosong.
      const originalBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font(FONT).fontSize(7.5).fillColor('#ffffff')
        .text('SiPromo - Program Studi Informatika UNPAR', 14, barY + 6, { width: greenWidth - 24, lineBreak: false });
      doc.text(`Halaman ${i + 1} dari ${pageRange.count}`, greenWidth + 10, barY + 6, { width: doc.page.width - greenWidth - 24, align: 'right', lineBreak: false });
      doc.page.margins.bottom = originalBottomMargin;
    }

    doc.end();
  } catch (err) { next(err); }
}

module.exports = { getLaporan, exportLaporanPdf };
