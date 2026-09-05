const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment } = require('../controllers/departmentsController');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getDepartments).post(protect, createDepartment);

module.exports = router;
