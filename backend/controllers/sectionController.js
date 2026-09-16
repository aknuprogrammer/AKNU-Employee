const Section = require('../models/Section');
const User = require('../models/User');
const Employee = require('../models/Employee');
const mongoose = require('mongoose');
const { getSectionHeadSectionId } = require('../utils/userUtils');

exports.getSections = async (req, res) => {
  try {
    let filter = {};
    if (req.user && (req.user.role === 'section_head' || req.user.is_section_head)) {
      const userSectionId = await getSectionHeadSectionId(req.user);
      filter._id = userSectionId ? userSectionId : new mongoose.Types.ObjectId();
    }

    const sections = await Section.find(filter).populate({
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
    if (req.user && (req.user.role === 'section_head' || req.user.is_section_head)) {
      return res.status(403).json({ success: false, message: 'Section Heads cannot create new sections' });
    }
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
    if (req.user && (req.user.role === 'section_head' || req.user.is_section_head)) {
      const userSectionId = await getSectionHeadSectionId(req.user);
      if (!userSectionId || userSectionId.toString() !== req.params.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this section' });
      }
    }
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
