const multer = require('multer');
const path = require('path');

// FR-15, NFR-12 - Upload lampiran bon/bukti pembelian
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // maks. 5 MB
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.'));
    }
  },
});

module.exports = upload;
