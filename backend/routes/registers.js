const express = require('express');
const router = express.Router();
const { getRegisters, createRegister, updateRegister, approveRegister, viewAttachment } = require('../controllers/registerController');
const { cloudUpload } = require('../config/cloudinary');

const { protect } = require('../middleware/auth');

router.get('/attachment', viewAttachment);

router.route('/')
  .get(protect, getRegisters)
  .post(protect, cloudUpload.array('attachments', 5), createRegister);

router.route('/:id')
  .put(protect, updateRegister);

router.put('/:id/approve', protect, approveRegister);

module.exports = router;
