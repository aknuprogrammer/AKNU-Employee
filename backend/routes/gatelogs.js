const express = require('express');
const router = express.Router();
const { getGateLogs, logEntry, logExit } = require('../controllers/gateLogController');

const mockProtect = (req, res, next) => {
    req.user = { id: '60d0fe4f5311236168a109ca', role: 'admin' };
    next();
};

router.route('/')
  .get(mockProtect, getGateLogs);

router.post('/entry', mockProtect, logEntry);
router.put('/:id/exit', mockProtect, logExit);

module.exports = router;
