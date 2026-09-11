const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Student = require('../models/Student');
const PortalUser = require('../models/PortalUser');

// @desc    Get employees for a specific section
// @route   GET /api/attendance/employees/:sectionId
// @access  Private
exports.getSectionEmployees = async (req, res) => {
  try {
    const employees = await PortalUser.find({ section_id: req.params.sectionId });
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

// @desc    Update attendance
// @route   PUT /api/attendance/:id
// @access  Private
exports.updateAttendance = async (req, res) => {
  try {
    const { records } = req.body;
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { records },
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

    let attendances = await Attendance.find(query)
        .populate('section_id', 'name')
        .sort('-date')
        .lean();
        
    const User = require('../models/User');
    const PortalUser = require('../models/PortalUser');
    const Employee = require('../models/Employee');

    for (let att of attendances) {
      // 1. Populate prepared_by
      if (att.prepared_by) {
        let prepUser = await User.findById(att.prepared_by).select('username full_name role').lean();
        if (!prepUser) {
          prepUser = await PortalUser.findById(att.prepared_by).select('username full_name role is_section_head').lean();
        }
        att.prepared_by = prepUser || { _id: att.prepared_by, full_name: 'Unknown' };
      }

      // 2. Populate records.employee_id
      if (att.records && att.records.length > 0) {
        const empIds = att.records.map(r => r.employee_id).filter(Boolean);
        const emps = await Employee.find({ _id: { $in: empIds } }).select('full_name').lean();
        const portalUsers = await PortalUser.find({ _id: { $in: empIds } }).select('full_name').lean();
        
        const userMap = {};
        emps.forEach(e => userMap[e._id.toString()] = e);
        portalUsers.forEach(u => userMap[u._id.toString()] = u);
        
        att.records.forEach(rec => {
          if (rec.employee_id) {
            rec.employee_id = userMap[rec.employee_id.toString()] || { _id: rec.employee_id, full_name: 'Unknown' };
          }
        });
      }
    }
        
    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
