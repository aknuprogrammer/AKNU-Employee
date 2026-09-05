const DailyActivity = require('../models/DailyActivity');

// @desc    Get daily activities for a section
// @route   GET /api/activities/:sectionId
// @access  Private
exports.getActivities = async (req, res) => {
  try {
    const { date, startDate, endDate, status, section_id, search } = req.query;
    
    let query = {};
    if (section_id && section_id !== 'all') {
      query.section_id = section_id;
    }
    
    if (date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const dEnd = new Date(date);
        dEnd.setHours(23, 59, 59, 999);
        query.date = { $gte: d, $lte: dEnd };
    } else if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
    }
    
    if (status) query.approval_status = status;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { task_description: searchRegex },
        { remarks: searchRegex }
      ];
    }

    const activities = await DailyActivity.find(query)
        .populate('employee_id', 'full_name designation')
        .populate('section_id', 'name')
        .sort('-date');
        
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a daily activity entry
// @route   POST /api/activities
// @access  Private
exports.createActivity = async (req, res) => {
  try {
    const activity = await DailyActivity.create(req.body);
    res.status(201).json({ success: true, data: activity });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Approve/Reject daily activity
// @route   PUT /api/activities/:id/approve
// @access  Private (Section Head)
exports.approveActivity = async (req, res) => {
  try {
    const { approval_status, section_head_comments } = req.body;
    const activity = await DailyActivity.findByIdAndUpdate(
      req.params.id,
      { 
        approval_status, 
        section_head_comments,
        approved_by: req.user.id,
        approved_at: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }
    res.status(200).json({ success: true, data: activity });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
