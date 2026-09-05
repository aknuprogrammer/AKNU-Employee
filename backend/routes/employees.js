const express = require('express');
const router = express.Router();
const { getEmployees, getEmployeeById, createEmployee, updateEmployee, bulkImport } = require('../controllers/employeesController');
const { protect } = require('../middleware/auth');

router.route('/bulk').post(protect, bulkImport);
router.route('/').get(protect, getEmployees).post(protect, createEmployee);
router.route('/:id').get(protect, getEmployeeById).put(protect, updateEmployee);

module.exports = router;
