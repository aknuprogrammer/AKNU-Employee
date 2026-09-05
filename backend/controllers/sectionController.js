const Section = require('../models/Section');
const User = require('../models/User');

exports.getSections = async (req, res) => {
  try {
    const sections = await Section.find().populate({
      path: 'section_head',
      populate: { path: 'employee_id' }
    });
    res.status(200).json({ success: true, data: sections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSection = async (req, res) => {
  try {
    const section = await Section.create(req.body);
    if (req.body.section_head) {
      await User.findByIdAndUpdate(req.body.section_head, { role: 'section_head' });
    }
    res.status(201).json({ success: true, data: section });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }
    if (req.body.section_head) {
      await User.findByIdAndUpdate(req.body.section_head, { role: 'section_head' });
    }
    res.status(200).json({ success: true, data: section });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
