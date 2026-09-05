const express = require('express');
const router = express.Router();
const { getRegisters, createRegister, updateRegister, approveRegister } = require('../controllers/registerController');
const upload = require('../middleware/upload');

const mockProtect = (req, res, next) => {
    req.user = { id: '60d0fe4f5311236168a109ca', role: 'admin' };
    next();
};

router.route('/')
  .get(mockProtect, getRegisters)
  .post(mockProtect, upload.array('attachments', 5), createRegister);

router.route('/:id')
  .put(mockProtect, updateRegister);

router.put('/:id/approve', mockProtect, approveRegister);

module.exports = router;
