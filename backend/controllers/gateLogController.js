const GateLog = require('../models/GateLog');

// @desc    Get all gate logs
// @route   GET /api/gatelogs
// @access  Private
exports.getGateLogs = async (req, res) => {
  try {
    const logs = await GateLog.find()
        .populate('employee_id', 'full_name designation')
        .populate('student_id', 'full_name course')
        .populate('section_to_visit', 'name')
        .sort('-in_time');
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log entry
// @route   POST /api/gatelogs/entry
// @access  Private
exports.logEntry = async (req, res) => {
  try {
    req.body.logged_by = req.user.id;
    const log = await GateLog.create(req.body);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Log exit
// @route   PUT /api/gatelogs/:id/exit
// @access  Private
exports.logExit = async (req, res) => {
  try {
    const log = await GateLog.findByIdAndUpdate(
      req.params.id,
      { out_time: Date.now() },
      { new: true }
    );
    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
