const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Student = require('../models/Student');

// @desc    Get employees for a specific section
// @route   GET /api/attendance/employees/:sectionId
// @access  Private
exports.getSectionEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ section_id: req.params.sectionId, is_active: true });
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get students for a specific section
// @route   GET /api/attendance/students/:sectionId
// @access  Private
exports.getSectionStudents = async (req, res) => {
  try {
    const students = await Student.find({ section_id: req.params.sectionId, is_active: true });
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit attendance
// @route   POST /api/attendance
// @access  Private
exports.submitAttendance = async (req, res) => {
  try {
    req.body.prepared_by = req.user.id; 
    // Section head submits attendance directly, so it is pre-approved
    if (req.user.role === 'section_head') {
      req.body.approval_status = 'Approved';
      req.body.approved_by = req.user.id;
      req.body.approved_at = Date.now();
    }
    const attendance = await Attendance.create(req.body);
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get pending attendances for a section head
// @route   GET /api/attendance/pending/:sectionId
// @access  Private (Section Head)
exports.getPendingAttendance = async (req, res) => {
  try {
    const attendances = await Attendance.find({ 
      section_id: req.params.sectionId, 
      approval_status: 'Pending' 
    }).populate('prepared_by', 'username');
    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve/Reject attendance
// @route   PUT /api/attendance/:id/approve
// @access  Private (Section Head)
exports.approveAttendance = async (req, res) => {
  try {
    const { approval_status, section_head_comments } = req.body;
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { 
        approval_status, 
        section_head_comments, 
        approved_by: req.user.id, 
        approved_at: Date.now() 
      },
      { new: true, runValidators: true }
    );
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance history with filtering
// @route   GET /api/attendance
// @access  Private
exports.getAttendances = async (req, res) => {
  try {
    const { section_id, startDate, endDate, search } = req.query;
    
    let query = {};
    if (section_id && section_id !== 'all') {
      query.section_id = section_id;
    }
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
    }

    const attendances = await Attendance.find(query)
        .populate('prepared_by', 'username full_name')
        .populate('section_id', 'name')
        .sort('-date');
        
    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
