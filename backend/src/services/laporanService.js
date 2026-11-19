const path = require('path');

const pool = require('../config/db');

const PDFDocument = require('pdfkit');


const LOGO_PATH = path.join(
  __dirname,
  '..',
  'assets',
  'unpar-logo-report.png'
);

const FONT = 'Report-Cambria';

const FONT_BOLD = 'Report-Cambria-Bold';

const ACCENT = '#1b4d3e';

const GOLD = '#c99a2e';

const TABLE_TINT = '#faf1da';

const GRAY = '#4b5563';

const BORDER = '#8a8f98';

const TEXT = '#1a1a1a';


// Mengubah nilai angka menjadi format Rupiah.
function formatRupiah(value) {

  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;

}


// Mengubah tanggal menjadi format tanggal panjang Indonesia.
function formatTanggalPanjang(date) {

  return date.toLocaleDateString(
    'id-ID',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }
  );

}


// FR-18, UC-09
// Membuat data laporan berdasarkan Tahun Ajaran.
async function buildLaporan(tahunAjaranId) {

  // Menentukan apakah Tahun Ajaran yang dipilih
  // merupakan Tahun Ajaran aktif berdasarkan
  // transaksi pembelian atau penggunaan terbaru.
  const taRes = await pool.query(
    `
      SELECT
        ta.*,

        COALESCE(
          ta.tahun_ajaran_id =
          latest.tahun_ajaran_id,
          false
        ) AS is_tahun_ajaran_aktif

      FROM tahun_ajaran ta

      LEFT JOIN (

        SELECT
          ta2.tahun_ajaran_id

        FROM tahun_ajaran ta2

        -- WHERE ta2.is_active = true -- Aturan master lama

        ORDER BY

          GREATEST(

            COALESCE(
              (
                SELECT MAX(p.tanggal)

                FROM pembelian p

                JOIN header_pembelian hp
                  ON hp.pembelian_id =
                     p.pembelian_id

                WHERE hp.tahun_ajaran_id =
                      ta2.tahun_ajaran_id
              ),
              '-infinity'
            ),

            COALESCE(
              (
                SELECT MAX(k.tanggal)

                FROM kegiatan k

                WHERE k.tahun_ajaran_id =
                      ta2.tahun_ajaran_id
              ),
              '-infinity'
            ),

            COALESCE(
              (
                SELECT MAX(so.tanggal)
                FROM stok_opname so
                WHERE so.tahun_ajaran_id = ta2.tahun_ajaran_id
              ),
              '-infinity'
            )

          ) DESC,

          ta2.tanggal_mulai DESC

        LIMIT 1

      ) latest
        ON true

      WHERE ta.tahun_ajaran_id = $1
    `,
    [tahunAjaranId]
  );


  // Jika Tahun Ajaran tidak ditemukan.
  if (!taRes.rows[0]) {

    return null;

  }


  // Menyimpan status Tahun Ajaran aktif.
  const tahunAjaranAktif =
    taRes.rows[0].is_tahun_ajaran_aktif;


  // Mengambil rincian pembelian
  // pada Tahun Ajaran yang dipilih.
  const pembelianRes = await pool.query(
    `
      SELECT
        dp.pembelian_id,
        p.tanggal,
        p.status,
        v.nama AS vendor_nama,
        a.nama AS aset_nama,
        d.nama AS level_nama,
        dp.qty_in,
        dp.unit_price,

        (
          dp.qty_in *
          dp.unit_price
        ) AS total_harga

      FROM detail_pembelian dp

      JOIN pembelian p
        ON p.pembelian_id =
           dp.pembelian_id

      JOIN header_pembelian hp
        ON hp.pembelian_id =
           dp.pembelian_id

      JOIN vendor v
        ON v.vendor_id =
           hp.vendor_id

      JOIN aset a
        ON a.aset_id =
           dp.aset_id

      LEFT JOIN level_aset d
        ON d.level_aset_id =
           a.level_aset_id

      WHERE hp.tahun_ajaran_id = $1

      ORDER BY
        p.tanggal DESC,
        v.nama ASC
    `,
    [tahunAjaranId]
  );


  // Mengambil rincian penggunaan
  // pada Tahun Ajaran yang dipilih.
  const penggunaanRes = await pool.query(
    `
      SELECT
        ak.kegiatan_id,
        k.nama AS kegiatan_nama,
        k.tanggal,
        a.nama AS aset_nama,
        d.nama AS level_nama,
        ak.qty_out,
        latest.vendor_nama

      FROM aset_keluar ak

      JOIN kegiatan k
        ON k.kegiatan_id =
           ak.kegiatan_id

      JOIN aset a
        ON a.aset_id =
           ak.aset_id

      LEFT JOIN level_aset d
        ON d.level_aset_id =
           a.level_aset_id

      LEFT JOIN (

        SELECT DISTINCT ON (dp.aset_id)
          dp.aset_id,
          v.nama AS vendor_nama

        FROM detail_pembelian dp

        JOIN pembelian p
          ON p.pembelian_id =
             dp.pembelian_id

        JOIN header_pembelian hp
          ON hp.pembelian_id =
             dp.pembelian_id

        JOIN vendor v
          ON v.vendor_id =
             hp.vendor_id

        -- Sebelumnya semua status pembelian ikut menentukan vendor.
        WHERE p.status = 'Lunas'

        ORDER BY
          dp.aset_id,
          p.tanggal DESC,
          dp.pembelian_id DESC

      ) latest
        ON latest.aset_id =
           a.aset_id

      WHERE k.tahun_ajaran_id = $1

      ORDER BY
        k.tanggal DESC,
        a.nama ASC
    `,
    [tahunAjaranId]
  );


  // Riwayat penyesuaian stok untuk tahun ajaran terpilih.
  // Selisih dihitung dari stok fisik - stok sistem, bukan disimpan di tabel.
  const opnameRes = await pool.query(
    `
      SELECT
        so.stok_opname_id,
        so.tanggal::text AS tanggal,
        so.catatan,
        d.aset_id,
        a.nama AS aset_nama,
        d.stok_sistem,
        d.stok_fisik,
        (d.stok_fisik - d.stok_sistem) AS selisih
      FROM stok_opname so
      JOIN detail_stok_opname d
        ON d.stok_opname_id = so.stok_opname_id
      JOIN aset a ON a.aset_id = d.aset_id
      WHERE so.tahun_ajaran_id = $1
      ORDER BY so.tanggal DESC, so.stok_opname_id DESC, a.nama ASC
    `,
    [tahunAjaranId]
  );


  // Rekap stok hanya ditampilkan
  // untuk Tahun Ajaran yang dianggap aktif.
  const stokRes =
    tahunAjaranAktif
      ? await pool.query(
          `
            WITH aktivitas_ta AS (

              SELECT
                dp.aset_id

              FROM detail_pembelian dp

              JOIN header_pembelian hp
                ON hp.pembelian_id =
                   dp.pembelian_id

              JOIN pembelian p
                ON p.pembelian_id =
                   dp.pembelian_id

              -- WHERE hp.tahun_ajaran_id = $1 -- Kode lama
              WHERE hp.tahun_ajaran_id = $1 AND p.status = 'Lunas'

              UNION


              SELECT
                ak.aset_id

              FROM aset_keluar ak

              JOIN kegiatan k
                ON k.kegiatan_id =
                   ak.kegiatan_id

              WHERE k.tahun_ajaran_id = $1

              UNION

              SELECT d.aset_id
              FROM detail_stok_opname d
              JOIN stok_opname so ON so.stok_opname_id = d.stok_opname_id
              WHERE so.tahun_ajaran_id = $1

            )

            SELECT
              a.aset_id,
              a.nama,
              a.harga,
              a.threshold_qty,
              d.nama AS level_nama,
              l.nama AS lokasi_nama,
              a.stok AS sisa_stok,

              (
                a.aset_id IN (
                  SELECT aset_id
                  FROM aktivitas_ta
                )
              ) AS ada_perubahan

            FROM aset a

            LEFT JOIN level_aset d
              ON d.level_aset_id =
                 a.level_aset_id

            LEFT JOIN lokasi_penyimpanan l
              ON l.lokasi_penyimpanan_id =
                 a.lokasi_penyimpanan_id

            -- WHERE a.is_active = true -- Aturan master lama

            ORDER BY a.nama ASC
          `,
          [tahunAjaranId]
        )
      : {
          rows: [],
        };


  const kelompokOpname = [];
  const kelompokById = new Map();
  for (const row of opnameRes.rows) {
    row.aset_hilang = Math.max(-Number(row.selisih), 0);
    row.aset_berlebih = Math.max(Number(row.selisih), 0);
    let kelompok = kelompokById.get(row.stok_opname_id);
    if (!kelompok) {
      kelompok = {
        stok_opname_id: row.stok_opname_id, tanggal: row.tanggal,
        catatan: row.catatan, total_aset_hilang: 0, total_aset_berlebih: 0, rincian: [],
      };
      kelompokById.set(row.stok_opname_id, kelompok);
      kelompokOpname.push(kelompok);
    }
    kelompok.rincian.push(row);
    kelompok.total_aset_hilang += row.aset_hilang;
    kelompok.total_aset_berlebih += row.aset_berlebih;
  }

  // Membuat ringkasan laporan.
  const ringkasan = {

    total_nilai_pembelian:
      pembelianRes.rows.reduce(
        (sum, row) =>
          sum + Number(row.total_harga),
        0
      ),

    jumlah_transaksi_pembelian:
      new Set(
        pembelianRes.rows.map(
          (row) => row.pembelian_id
        )
      ).size,

//     total_qty_masuk:
//       pembelianRes.rows.reduce(
//         (sum, row) =>
//           sum + Number(row.qty_in),
//         0
//       ),
// 
    total_qty_masuk:
      pembelianRes.rows.filter(row => row.status === 'Lunas').reduce(
        (sum, row) =>
          sum + Number(row.qty_in),
        0
      ),

    total_qty_keluar:
      penggunaanRes.rows.reduce(
        (sum, row) =>
          sum + Number(row.qty_out),
        0
      ),

    jumlah_kegiatan:
      new Set(
        penggunaanRes.rows.map(
          (row) => row.kegiatan_id
        )
      ).size,

    jumlah_stok_opname: new Set(
      opnameRes.rows.map((row) => row.stok_opname_id)
    ).size,

    jumlah_detail_berselisih: opnameRes.rows.filter(
      (row) => Number(row.selisih) !== 0
    ).length,

    total_aset_hilang: kelompokOpname.reduce((sum, row) => sum + row.total_aset_hilang, 0),
    total_aset_berlebih: kelompokOpname.reduce((sum, row) => sum + row.total_aset_berlebih, 0),

    total_penyesuaian_stok: opnameRes.rows.reduce(
      (sum, row) => sum + Number(row.selisih), 0
    ),

    total_sisa_stok:
      stokRes.rows.reduce(
        (sum, row) =>
          sum + Number(row.sisa_stok),
        0
      ),

  };


  // Mengembalikan seluruh data laporan.
  return {

    tahun_ajaran:
      taRes.rows[0],

    ringkasan,

    rincian_pembelian:
      pembelianRes.rows,

    rincian_penggunaan:
      penggunaanRes.rows,

    rincian_stok_opname:
      opnameRes.rows,

    kelompok_stok_opname: kelompokOpname,

    rekap_stok:
      stokRes.rows,

  };

}


// Tabel memakai ukuran tetap; label panjang dibungkus, bukan diperkecil.
// Baris biasa tetap utuh. Teks yang melebihi satu halaman dipecah per baris.
function renderTable(doc, { columns, rows, startY, emptyMessage }) {
  const left = doc.page.margins.left;
  const width = columns.reduce((sum, col) => sum + col.width, 0);
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const padding = 5;
  const size = 10;
  const lineHeight = 13;

  function wrap(value, cellWidth, font = FONT) {
    doc.font(font).fontSize(size);
    const lines = [];
    for (const paragraph of String(value ?? '-').split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (doc.widthOfString(candidate) <= cellWidth) { line = candidate; continue; }
        if (line) { lines.push(line); line = ''; }
        for (const char of word) {
          if (line && doc.widthOfString(line + char) > cellWidth) { lines.push(line); line = ''; }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines.length ? lines : [''];
  }

  function drawCells(cells, y, height, header = false) {
    let x = left;
    if (header) doc.rect(left, y, width, height).fill(TABLE_TINT);
    doc.lineWidth(0.5).strokeColor(BORDER).rect(left, y, width, height).stroke();
    cells.forEach((lines, index) => {
      const col = columns[index];
      if (index) doc.moveTo(x, y).lineTo(x, y + height).stroke();
      doc.font(header ? FONT_BOLD : FONT).fontSize(size).fillColor(TEXT);
      const textY = y + padding + (height - padding * 2 - lines.length * lineHeight) / 2;
      lines.forEach((line, i) => doc.text(line, x + padding, textY + i * lineHeight, {
        width: col.width - padding * 2, align: header ? 'center' : col.align || 'left', lineBreak: false,
      }));
      x += col.width;
    });
  }

  const headers = columns.map(col => wrap(col.label.toUpperCase(), col.width - padding * 2, FONT_BOLD));
  const headerHeight = Math.max(...headers.map(lines => lines.length)) * lineHeight + padding * 2;
  const cellsFor = row => columns.map(col => wrap(col.render(row), col.width - padding * 2));
  const heightFor = row => row.tableBand
    ? wrap(row.tableBand, width - padding * 2, FONT_BOLD).length * lineHeight + padding * 2
    : Math.max(...cellsFor(row).map(lines => lines.length)) * lineHeight + padding * 2;
  const newPage = () => {
    doc.addPage();
    drawCells(headers, doc.page.margins.top, headerHeight, true);
    return doc.page.margins.top + headerHeight;
  };
  let y = startY;
  const firstHeight = rows.length ? heightFor(rows[0]) : 26;
  if (y + headerHeight + Math.min(firstHeight, 100) > bottom()) {
    doc.addPage(); y = doc.page.margins.top;
  }
  drawCells(headers, y, headerHeight, true);
  y += headerHeight;
  if (!rows.length) {
    doc.rect(left, y, width, 28).strokeColor(BORDER).stroke();
    doc.font(FONT).fontSize(size).fillColor(GRAY).text(emptyMessage, left + padding, y + 8, { width: width - padding * 2, lineBreak: false });
    return y + 28;
  }

  rows.forEach((row, index) => {
    const isBand = Boolean(row.tableBand);
    const cells = isBand ? [wrap(row.tableBand, width - padding * 2, FONT_BOLD)] : cellsFor(row);
    let remaining = Math.max(...cells.map(lines => lines.length));
    const height = remaining * lineHeight + padding * 2;
    const nextHeight = row.groupHeader && rows[index + 1] ? Math.min(heightFor(rows[index + 1]), 100) : 0;
    if (y + height + nextHeight > bottom() && height <= bottom() - doc.page.margins.top - headerHeight) y = newPage();
    let offset = 0;
    while (remaining > 0) {
      const capacity = Math.floor((bottom() - y - padding * 2) / lineHeight);
      if (capacity < 1) { y = newPage(); continue; }
      const count = Math.min(remaining, capacity);
      const fragmentHeight = count * lineHeight + padding * 2;
      const fragment = cells.map(lines => lines.slice(offset, offset + count));
      if (isBand) {
        doc.rect(left, y, width, fragmentHeight).fillAndStroke(TABLE_TINT, BORDER);
        doc.font(FONT_BOLD).fontSize(size).fillColor(TEXT);
        fragment[0].forEach((line, i) => doc.text(line, left + padding, y + padding + i * lineHeight, { width: width - padding * 2, lineBreak: false }));
      } else drawCells(fragment, y, fragmentHeight);
      y += fragmentHeight;
      offset += count;
      remaining -= count;
      if (remaining) y = newPage();
    }
  });
  return y;
}

// Label, titik dua, dan isi berada pada kolom terpisah agar baris lanjutan sejajar.
function drawLabelValue(doc, label, value, y, labelWidth, contentWidth) {
  const left = doc.page.margins.left;
  const colonWidth = 10;
  const valueWidth = contentWidth - labelWidth - colonWidth;
  const options = { lineGap: 2 };
  doc.font(FONT).fontSize(11);
  const labelHeight = doc.heightOfString(label, { ...options, width: labelWidth - 8 });
  const valueHeight = doc.heightOfString(String(value), { ...options, width: valueWidth });
  doc.fillColor(TEXT).text(label, left, y, { ...options, width: labelWidth - 8 });
  doc.text(':', left + labelWidth, y, { width: colonWidth, lineBreak: false });
  doc.text(String(value), left + labelWidth + colonWidth, y, { ...options, width: valueWidth });
  return y + Math.max(labelHeight, valueHeight) + 6;
}

// Sisakan ruang untuk judul, header tabel, dan baris pertama.
function drawSectionTitle(doc, text, y) {
  if (y + 150 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  doc.font(FONT_BOLD).fontSize(12).fillColor(TEXT)
    .text(text, doc.page.margins.left, y, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
  return y + 24;
}

function drawSubtotalBar(doc, label, value, y, tableWidth) {
  if (y + 30 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  const left = doc.page.margins.left;
  doc.strokeColor(BORDER).lineWidth(0.5).moveTo(left, y).lineTo(left + tableWidth, y).stroke();
  doc.font(FONT_BOLD).fontSize(10).fillColor(TEXT)
    .text(`${label} ${value}`, left, y + 9, { width: tableWidth, align: 'right' });
  return Math.max(y + 30, doc.y + 6);
}

// Menyesuaikan lebar seluruh kolom
// agar pas dengan lebar halaman.
function scaleColumns(columns, totalWidth) {
  // Lebar tanggal cukup untuk dd/mm/yyyy agar tahun tidak terpisah baris.
  const fixedWidth = columns.reduce((sum, col) => sum + (col.label === 'Tanggal' ? 68 : 0), 0);
  const flexibleWeight = columns.reduce((sum, col) => sum + (col.label === 'Tanggal' ? 0 : col.width), 0);
  return columns.map(col => ({
    ...col,
    width: col.label === 'Tanggal' ? 68 : col.width / flexibleWeight * (totalWidth - fixedWidth),
  }));
}

// FR-19, NFR-14, UC-10
// Membuat dokumen PDF berdasarkan data laporan.
function createLaporanPdf(laporan) {

  const {
    tahun_ajaran: ta,
    ringkasan,
    rincian_pembelian,
    rincian_penggunaan,
    rincian_stok_opname,
    rekap_stok,
  } = laporan;


  const doc =
    new PDFDocument({
      margins: { top: 54, bottom: 64, left: 50, right: 50 },
      info: { Title: `Laporan Aset Promosi - ${ta.semester} ${ta.tahun}`, Author: 'Program Studi Informatika, Universitas Katolik Parahyangan' },
      size: 'A4',
      bufferPages: true,
    });


  // Font disertakan agar bentuk huruf konsisten di server dan perangkat pembaca.
  doc.registerFont(FONT, path.join(__dirname, '..', 'assets', 'fonts', 'Cambria.ttc'), 'Cambria');
  doc.registerFont(FONT_BOLD, path.join(__dirname, '..', 'assets', 'fonts', 'Cambria-Bold.ttf'));

  const left =
    doc.page.margins.left;


  const contentWidth =
    doc.page.width -
    doc.page.margins.left -
    doc.page.margins.right;


  // Halaman lanjutan memiliki identitas ringkas dan area isi yang konsisten.
  doc.on('pageAdded', () => {
    doc.page.margins.top = 82;
    doc.font(FONT_BOLD).fontSize(9).fillColor(TEXT)
      .text('LAPORAN ASET PROMOSI', left, 40, { width: contentWidth / 2, lineBreak: false });
    doc.font(FONT).fontSize(9).text(`${ta.semester} ${ta.tahun}`, left + contentWidth / 2, 40,
      { width: contentWidth / 2, align: 'right', lineBreak: false });
    doc.moveTo(left, 60).lineTo(left + contentWidth, 60).lineWidth(0.5).strokeColor(BORDER).stroke();
    doc.x = left; doc.y = doc.page.margins.top;
  });

  // Kop institusi: logo, nama universitas, dan unit penerbit laporan.
  doc.image(LOGO_PATH, left, 44, { fit: [68, 72], align: 'center', valign: 'center' });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(ACCENT)
    .text('UNIVERSITAS KATOLIK PARAHYANGAN', left + 82, 58, { width: contentWidth - 82 });
  doc.font('Helvetica').fontSize(11).fillColor(TEXT)
    .text('Program Studi Informatika', left + 82, 82, { width: contentWidth - 82 });
  doc.moveTo(left, 126).lineTo(left + contentWidth, 126).lineWidth(1).strokeColor(TEXT).stroke();
  doc.font(FONT_BOLD).fontSize(14).fillColor(TEXT)
    .text('LAPORAN ASET PROMOSI', left, 146, { width: contentWidth, align: 'center' });

  // Metadata laporan.
  let y = 184;


  const metaLabelWidth = 145;


  y = drawLabelValue(
    doc,
    'Perihal',
    'Rekap pembelian, penggunaan, stok opname, dan stok aset promosi',
    y,
    metaLabelWidth,
    contentWidth
  );


  y = drawLabelValue(
    doc,
    'Tahun Ajaran',
    `${ta.semester} ${ta.tahun}`, 
    y,
    metaLabelWidth,
    contentWidth
  );


  y = drawLabelValue(doc, 'Periode', `${formatTanggalPanjang(new Date(ta.tanggal_mulai))} – ${formatTanggalPanjang(new Date(ta.tanggal_selesai))}`, y, metaLabelWidth, contentWidth);

  y = drawLabelValue(
    doc,
    'Tanggal Cetak',
    formatTanggalPanjang(
      new Date()
    ),
    y,
    metaLabelWidth,
    contentWidth
  );


  y += 12;


  // Ringkasan pembelian.
  y = drawLabelValue(
    doc,
    'Total Nilai Pembelian',
    `${formatRupiah(ringkasan.total_nilai_pembelian)} (${ringkasan.jumlah_transaksi_pembelian} transaksi, ${ringkasan.total_qty_masuk} unit masuk)`,
    y,
    metaLabelWidth,
    contentWidth
  );


  // Ringkasan penggunaan.
  y = drawLabelValue(
    doc,
    'Total Unit Digunakan',
    `${ringkasan.total_qty_keluar} unit (${ringkasan.jumlah_kegiatan} kegiatan)`,
    y,
    metaLabelWidth,
    contentWidth
  );


  y = drawLabelValue(
    doc,
    'Stok Opname',
    `${ringkasan.jumlah_stok_opname} pemeriksaan; unit hilang ${ringkasan.total_aset_hilang} unit; unit berlebih ${ringkasan.total_aset_berlebih} unit; ${ringkasan.jumlah_detail_berselisih} baris aset berselisih`,
    y,
    metaLabelWidth,
    contentWidth
  );


  // Sisa stok hanya ditampilkan
  // pada Tahun Ajaran aktif.
  if (ta.is_tahun_ajaran_aktif) {

    y = drawLabelValue(
      doc,
      'Total Sisa Stok Saat Ini',
      `${ringkasan.total_sisa_stok} unit`,
      y,
      metaLabelWidth,
      contentWidth
    );

  }


  y += 8;


  // Rincian Pembelian.
  y = drawSectionTitle(
    doc,
    'Rincian Pembelian Aset',
    y
  );


  const pembelianCols =
    scaleColumns(
      [
        {
          label: 'Tanggal',
          width: 58,

          render: (row) =>
            new Date(
              row.tanggal
            ).toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }
            ),
        },

        {
          label: 'Vendor',
          width: 64,
          render: (row) =>
            row.vendor_nama,
        },

        {
          label: 'Status',
          width: 46,
          render: (row) =>
            row.status,
        },

        {
          label: 'Aset',
          width: 76,
          render: (row) =>
            row.aset_nama,
        },

        {
          label: 'Level',
          width: 50,
          render: (row) =>
            row.level_nama || '-',
        },

        {
          label: 'Qty',
          width: 30,
          align: 'right',
          render: (row) =>
            String(row.qty_in),
        },

        {
          label: 'Harga Satuan',
          width: 65,
          align: 'right',
          render: (row) =>
            formatRupiah(
              row.unit_price
            ),
        },

        {
          label: 'Total',
          width: 75,
          align: 'right',
          render: (row) =>
            formatRupiah(
              row.total_harga
            ),
        },
      ],
      contentWidth
    );


  y = renderTable(
    doc,
    {
      columns:
        pembelianCols,

      rows:
        rincian_pembelian,

      startY: y,

      emptyMessage:
        'Belum ada data pembelian.',
    }
  );


  if (
    rincian_pembelian.length > 0
  ) {

    y = drawSubtotalBar(
      doc,
      'Subtotal Pembelian:',
      formatRupiah(
        ringkasan.total_nilai_pembelian
      ),
      y,
      contentWidth
    );

  }


  y += 20;


  // Rincian Penggunaan.
  y = drawSectionTitle(
    doc,
    'Rincian Pencatatan Penggunaan Aset',
    y
  );


  const penggunaanCols =
    scaleColumns(
      [
        {
          label: 'Tanggal',
          width: 55,

          render: (row) =>
            new Date(
              row.tanggal
            ).toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }
            ),
        },

        {
          label: 'Kegiatan',
          width: 120,
          render: (row) =>
            row.kegiatan_nama,
        },

        {
          label: 'Aset',
          width: 110,
          render: (row) =>
            row.aset_nama,
        },

        {
          label: 'Level',
          width: 55,
          render: (row) =>
            row.level_nama || '-',
        },

        {
          label: 'Qty Keluar',
          width: 60,
          align: 'right',
          render: (row) =>
            String(row.qty_out),
        },

        {
          label: 'Vendor',
          width: 95,
          render: (row) =>
            row.vendor_nama || '-',
        },
      ],
      contentWidth
    );


  y = renderTable(
    doc,
    {
      columns:
        penggunaanCols,

      rows:
        rincian_penggunaan,

      startY: y,

      emptyMessage:
        'Belum ada data penggunaan.',
    }
  );


  if (
    rincian_penggunaan.length > 0
  ) {

    y = drawSubtotalBar(
      doc,
      'Subtotal Unit Keluar:',
      `${ringkasan.total_qty_keluar} unit`,
      y,
      contentWidth
    );

  }


  y += 20;


  // Riwayat stok opname tetap tersedia untuk tahun ajaran sebelumnya.
  if (y > doc.page.height - doc.page.margins.bottom - 100) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  y = drawSectionTitle(doc, 'Rincian Stok Opname', y);

  const opnameCols = scaleColumns(
    [
      {
        label: 'Tanggal', width: 66,
        render: (row) => new Date(`${row.tanggal}T00:00:00`).toLocaleDateString('id-ID'),
      },
      { label: 'Aset', width: 150, render: (row) => row.aset_nama },
      { label: 'Stok Sistem', width: 85, align: 'right', render: (row) => String(row.stok_sistem) },
      { label: 'Stok Fisik', width: 85, align: 'right', render: (row) => String(row.stok_fisik) },
      { label: 'Unit Hilang', width: 70, align: 'right', render: (row) => String(Math.max(-Number(row.selisih), 0)) },
      { label: 'Unit Berlebih', width: 75, align: 'right', render: (row) => String(Math.max(Number(row.selisih), 0)) },
      {
        label: 'Selisih', width: 75, align: 'right',
        render: (row) => `${Number(row.selisih) > 0 ? '+' : ''}${row.selisih}`,
      },
    ],
    contentWidth
  );

  y = renderTable(doc, {
    columns: opnameCols,
    rows: (laporan.kelompok_stok_opname || []).flatMap((group) => [
      { tableBand: `Pencatatan ${new Date(`${group.tanggal}T00:00:00`).toLocaleDateString('id-ID')} | Catatan: ${group.catatan || '-'}`, groupHeader: true },
      ...group.rincian,
      { tableBand: `Subtotal pencatatan: Unit hilang ${group.total_aset_hilang} unit | Unit berlebih ${group.total_aset_berlebih} unit` },
    ]).concat((laporan.kelompok_stok_opname || []).length ? [{ tableBand: `Total ${ta.semester} ${ta.tahun}: Unit hilang ${ringkasan.total_aset_hilang} unit | Unit berlebih ${ringkasan.total_aset_berlebih} unit` }] : []),
    startY: y,
    emptyMessage: 'Belum ada pencatatan stok opname.',
  });

  y += 20;


  // Rekap Stok.
  if (
    ta.is_tahun_ajaran_aktif
  ) {

    if (
      y >
      doc.page.height -
      doc.page.margins.bottom -
      100
    ) {

      doc.addPage();

      y =
        doc.page.margins.top;

    }


    y = drawSectionTitle(
      doc,
      'Rekap Stok Aset (Saat Ini)',
      y
    );


    const stokCols =
      scaleColumns(
        [
          {
            label: 'Aset',
            width: 135,
            render: (row) =>
              row.nama,
          },

          {
            label: 'Level',
            width: 50,
            render: (row) =>
              row.level_nama ||
              '-',
          },

          {
            label: 'Sisa Stok',
            width: 55,
            align: 'right',
            render: (row) =>
              String(
                row.sisa_stok
              ),
          },

          {
            label: 'Threshold',
            width: 55,
            align: 'right',
            render: (row) =>
              String(
                row.threshold_qty
              ),
          },

          {
            label: 'Lokasi',
            width: 90,
            render: (row) =>
              row.lokasi_nama ||
              '-',
          },

          {
            label: 'Status',
            width: 55,

            render: (row) =>
              row.sisa_stok <
              row.threshold_qty
                ? 'Kritis'
                : 'Aman',
          },

        ],
        contentWidth
      );


    y = renderTable(
      doc,
      {
        columns: stokCols,

        rows: rekap_stok,

        startY: y,

        emptyMessage:
          'Belum ada data stok.',
      }
    );


    if (
      rekap_stok.length > 0
    ) {

      drawSubtotalBar(
        doc,
        'Subtotal Sisa Stok:',
        `${ringkasan.total_sisa_stok} unit`,
        y,
        contentWidth
      );

    }

  }


  // Warna dan proporsi footer dipertahankan seperti format laporan awal.
  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
    doc.switchToPage(i);
    const barHeight = 20;
    const barY = doc.page.height - barHeight;
    const greenWidth = doc.page.width * 0.62;
    doc.rect(0, barY, greenWidth, barHeight).fill(ACCENT);
    doc.rect(greenWidth, barY, doc.page.width - greenWidth, barHeight).fill(GOLD);
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font(FONT).fontSize(8).fillColor('#ffffff')
      .text('SiPromo - Program Studi Informatika UNPAR', 14, barY + 6,
        { width: greenWidth - 24, lineBreak: false });
    doc.text(`Halaman ${i + 1} dari ${pageRange.count}`, greenWidth + 10, barY + 6,
      { width: doc.page.width - greenWidth - 24, align: 'right', lineBreak: false });
    doc.page.margins.bottom = originalBottom;
  }

  // Mengembalikan dokumen PDF.
  // Controller yang akan mengirim dokumen ke response.
  return doc;

}


module.exports = {
  buildLaporan,
  createLaporanPdf,
};
