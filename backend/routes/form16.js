const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const {
  getForm16s,
  uploadForm16,
  toggleForm16Status,
  deleteForm16,
  downloadForm16Admin,
  unlockForm16,
  getMyForm16Years,
  bulkUploadForm16
} = require('../controllers/form16Controller');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'form16');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'form16-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File Filter (Only accept PDFs)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 } // 100KB file size limit
});

// Multer Storage for ZIP files
const zipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bulk-form16-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const zipFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.toLowerCase().endsWith('.zip')) {
    cb(null, true);
  } else {
    cb(new Error('Only ZIP files are allowed.'), false);
  }
};

const uploadZip = multer({
  storage: zipStorage,
  fileFilter: zipFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Accountant/Admin routes
router.get('/', protect, getForm16s);
router.post('/', protect, upload.single('pdf'), uploadForm16);
router.post('/bulk', protect, uploadZip.single('zip'), bulkUploadForm16);
router.patch('/:id/status', protect, toggleForm16Status);
router.delete('/:id', protect, deleteForm16);
router.get('/:id/download', protect, downloadForm16Admin);

// Employee routes
router.get('/my-years', protect, getMyForm16Years);
router.post('/unlock', protect, unlockForm16);

module.exports = router;
