const Register = require('../models/Register');

// @desc    Get registers by type and section
// @route   GET /api/registers
// @access  Private
exports.getRegisters = async (req, res) => {
  try {
    const { type, section_id, startDate, endDate, search } = req.query;
    let query = {};
    if (type) query.type = type;
    if (section_id && section_id !== 'all') query.section_id = section_id;

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { reference_number: searchRegex },
        { party_name: searchRegex },
        { subject: searchRegex },
        { reason: searchRegex },
        { place_of_visit: searchRegex }
      ];
    }

    const registers = await Register.find(query)
      .populate('forwarded_to', 'full_name designation')
      .populate('employee_id', 'full_name designation')
      .populate('section_id', 'name')
      .sort('-date');
    res.status(200).json({ success: true, data: registers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a register entry (Inward, Outward, Movement)
// @route   POST /api/registers
// @access  Private
exports.createRegister = async (req, res) => {
  try {
    const attachments = req.files ? req.files.map(f => `uploads/registers/${f.filename}`) : [];
    const register = await Register.create({ ...req.body, attachments });
    res.status(201).json({ success: true, data: register });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update register entry (e.g. actual_in_time for movement, or status)
// @route   PUT /api/registers/:id
// @access  Private
exports.updateRegister = async (req, res) => {
  try {
    const register = await Register.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!register) {
      return res.status(404).json({ success: false, message: 'Register entry not found' });
    }
    res.status(200).json({ success: true, data: register });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Approve register entry
// @route   PUT /api/registers/:id/approve
// @access  Private (Section Head)
exports.approveRegister = async (req, res) => {
  try {
    const { status, section_head_comments } = req.body;
    const register = await Register.findByIdAndUpdate(
      req.params.id,
      { status, section_head_comments },
      { new: true, runValidators: true }
    );
    if (!register) {
      return res.status(404).json({ success: false, message: 'Register entry not found' });
    }
    res.status(200).json({ success: true, data: register });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
