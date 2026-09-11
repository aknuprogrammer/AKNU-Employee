const express = require('express');
const router = express.Router();
const { getSectionEmployees, getSectionStudents, submitAttendance, updateAttendance, getPendingAttendance, approveAttendance, getAttendances } = require('../controllers/attendanceController');

const mockProtect = (req, res, next) => {
    req.user = { id: '60d0fe4f5311236168a109ca', role: 'admin' };
    next();
};

router.get('/employees/:sectionId', mockProtect, getSectionEmployees);
router.get('/students/:sectionId', mockProtect, getSectionStudents);
router.post('/', mockProtect, submitAttendance);
router.get('/', mockProtect, getAttendances);
router.route('/:id').put(mockProtect, updateAttendance);
router.get('/pending/:sectionId', mockProtect, getPendingAttendance);
router.put('/:id/approve', mockProtect, approveAttendance);

module.exports = router;
