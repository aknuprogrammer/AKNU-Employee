const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const {
  getPFAccountSlips,
  uploadPFAccountSlip,
  togglePFAccountSlipStatus,
  deletePFAccountSlip,
  downloadPFAccountSlipAdmin,
  unlockPFAccountSlip,
  getMyPFAccountSlipYears,
  bulkUploadPFAccountSlip
} = require('../controllers/pfAccountSlipsController');

// Multer Storage Configuration for PF Slips
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'pf-slips');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pf-slip-' + uniqueSuffix + path.extname(file.originalname));
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
  limits: { fileSize: 500 * 1024 } // 500KB file size limit
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
    cb(null, 'bulk-pfslips-' + uniqueSuffix + path.extname(file.originalname));
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
router.get('/', protect, getPFAccountSlips);
router.post('/', protect, upload.single('pdf'), uploadPFAccountSlip);
router.post('/bulk', protect, uploadZip.single('zip'), bulkUploadPFAccountSlip);
router.patch('/:id/status', protect, togglePFAccountSlipStatus);
router.delete('/:id', protect, deletePFAccountSlip);
router.get('/:id/download', protect, downloadPFAccountSlipAdmin);

// Employee routes
router.get('/my-years', protect, getMyPFAccountSlipYears);
router.post('/unlock', protect, unlockPFAccountSlip);

module.exports = router;
