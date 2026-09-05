const express = require('express');
const router = express.Router();
const { getPayslips, getPayslipById, createPayslip, unlockPayslip, updatePayslip, togglePayslipStatus, getLatestPayslipByEmployee, verifyPayslip, getConsolidatedPayslip, bulkGeneratePayslips } = require('../controllers/payslipsController');
const { protect } = require('../middleware/auth');

router.get('/verify/:payslip_number', verifyPayslip);
router.post('/consolidated', protect, getConsolidatedPayslip);
router.get('/', protect, getPayslips);
router.get('/latest/:employeeId', protect, getLatestPayslipByEmployee);
router.get('/:id', protect, getPayslipById);
router.post('/bulk', protect, bulkGeneratePayslips);
router.post('/', protect, createPayslip);
router.put('/:id', protect, updatePayslip);
router.patch('/:id/status', protect, togglePayslipStatus);
router.post('/unlock', protect, unlockPayslip);

module.exports = router;
