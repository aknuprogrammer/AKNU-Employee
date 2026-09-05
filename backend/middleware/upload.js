const path = require('path');
const multer = require('multer');

// Define storage location
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files under backend/uploads/registers
    cb(null, path.join(__dirname, '..', 'uploads', 'registers'));
  },
  filename: function (req, file, cb) {
    // Use timestamp + original name to avoid collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File type filter
function fileFilter(req, file, cb) {
  const allowed = /\.(jpg|jpeg|png|pdf)$/i;
  if (allowed.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only jpg, jpeg, png, pdf are allowed.'), false);
  }
}

// 3MB limit per file
const limits = { fileSize: 3 * 1024 * 1024 }; // 3MB

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
