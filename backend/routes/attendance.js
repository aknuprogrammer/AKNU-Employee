const express = require('express');
const router = express.Router();
const { getSectionEmployees, getSectionStudents, submitAttendance, updateAttendance, getPendingAttendance, approveAttendance, getAttendances } = require('../controllers/attendanceController');
const { cloudUpload } = require('../config/cloudinary');

const { protect } = require('../middleware/auth');

router.get('/employees/:sectionId', protect, getSectionEmployees);
router.get('/students/:sectionId', protect, getSectionStudents);
router.post('/', protect, cloudUpload.array('photos', 5), submitAttendance);
router.get('/', protect, getAttendances);
router.route('/:id').put(protect, updateAttendance);
router.get('/pending/:sectionId', protect, getPendingAttendance);
router.put('/:id/approve', protect, approveAttendance);

module.exports = router;
