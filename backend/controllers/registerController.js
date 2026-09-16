const Register = require('../models/Register');
const mongoose = require('mongoose');
const { getSectionHeadSectionId } = require('../utils/userUtils');

// @desc    Get registers by type and section
// @route   GET /api/registers
// @access  Private
exports.getRegisters = async (req, res) => {
  try {
    const { type, section_id, startDate, endDate, search } = req.query;
    let query = {};
    if (type) query.type = type;

    if (req.user && (req.user.role === 'section_head' || req.user.is_section_head)) {
      const userSectionId = await getSectionHeadSectionId(req.user);
      query.section_id = userSectionId ? userSectionId : new mongoose.Types.ObjectId();
    } else if (section_id && section_id !== 'all') {
      query.section_id = section_id;
    }

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

    let registers = await Register.find(query)
      .populate('forwarded_to', 'full_name designation section_id')
      .populate('employee_id', 'full_name designation section_id')
      .populate('section_id', 'name')
      .sort('-date')
      .lean();

    const PortalUser = require('../models/PortalUser');
    const Section = require('../models/Section');
    for (let reg of registers) {
      if (reg.forwarded_to) {
        if (!reg.forwarded_to.full_name) {
          const pu = await PortalUser.findById(reg.forwarded_to).populate('section_id', 'name').select('full_name section_id role').lean();
          if (pu) reg.forwarded_to = pu;
        } else if (reg.forwarded_to.section_id && !reg.forwarded_to.section_id.name) {
          const sec = await Section.findById(reg.forwarded_to.section_id).select('name').lean();
          if (sec) reg.forwarded_to.section_id = sec;
        }
      }
      if (reg.employee_id) {
        if (!reg.employee_id.full_name) {
          const pu = await PortalUser.findById(reg.employee_id).populate('section_id', 'name').select('full_name section_id role').lean();
          if (pu) reg.employee_id = pu;
        } else if (reg.employee_id.section_id && !reg.employee_id.section_id.name) {
          const sec = await Section.findById(reg.employee_id.section_id).select('name').lean();
          if (sec) reg.employee_id.section_id = sec;
        }
      }
    }

    res.status(200).json({ success: true, data: registers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');

// @desc    Create a register entry (Inward, Outward, Movement)
// @route   POST /api/registers
// @access  Private
exports.createRegister = async (req, res) => {
  try {
    let attachments = [];
    if (req.files && req.files.length > 0) {
      const typeFolder = (req.body.type || 'register').toLowerCase();
      const uploadPromises = req.files.map(f =>
        uploadToCloudinary(f.buffer, {
          folder: `aknu_portal/registers/${typeFolder}`,
        })
      );
      const results = await Promise.all(uploadPromises);
      attachments = results.map(r => r.secure_url);
    }
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

// @desc    View/Download attachment securely (handles Cloudinary signed PDF delivery)
// @route   GET /api/registers/attachment
// @access  Public
exports.viewAttachment = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send('Attachment URL is required');
    }

    // Check if it is a Cloudinary URL
    const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)\.([a-zA-Z0-9]+)$/);
    if (match) {
      const publicId = match[1];
      const format = match[2];
      const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
        resource_type: 'image',
        type: 'upload',
      });
      return res.redirect(signedUrl);
    }

    // Fallback: redirect directly to original URL
    res.redirect(url);
  } catch (error) {
    console.error('Error viewing attachment:', error);
    res.status(500).send('Failed to generate attachment URL: ' + error.message);
  }
};
