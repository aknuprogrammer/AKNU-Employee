const PortalUser = require('../models/PortalUser');
const User = require('../models/User');
const Department = require('../models/Department');
const Section = require('../models/Section');
exports.getPortalUsers = async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role === 'section_head') {
      const fullUser = await User.findById(req.user._id).populate('employee_id');
      if (fullUser?.employee_id?.section_id) {
        filter.section_id = fullUser.employee_id.section_id;
      }
    }
    const users = await PortalUser.find(filter)
      .populate('department_id', 'name')
      .populate('section_id', 'name')
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPortalUser = async (req, res) => {
  try {
    const { full_name, email, department_id, section_id, is_section_head, password } = req.body;
    
    // Check if email already exists
    const existing = await PortalUser.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    let finalSectionId = section_id || null;
    if (req.user && req.user.role === 'section_head') {
      const fullUser = await User.findById(req.user._id).populate('employee_id');
      if (fullUser?.employee_id?.section_id) {
        finalSectionId = fullUser.employee_id.section_id;
      }
    }

    const newUser = new PortalUser({
      full_name,
      email,
      department_id: department_id || null,
      section_id: finalSectionId,
      is_section_head: is_section_head || false,
      password
    });

    await newUser.save();
    
    // Remove password from response
    const savedUser = newUser.toObject();
    delete savedUser.password;

    res.status(201).json({ success: true, data: savedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePortalUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, department_id, section_id, is_section_head, password } = req.body;

    const user = await PortalUser.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (full_name) user.full_name = full_name;
    if (email) user.email = email;
    if (department_id !== undefined) user.department_id = department_id || null;
    if (section_id !== undefined && req.user?.role !== 'section_head') {
      user.section_id = section_id || null;
    }
    if (is_section_head !== undefined) user.is_section_head = is_section_head;
    if (password) user.password = password; // pre-save hook will hash it

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePortalUser = async (req, res) => {
  try {
    const { id } = req.params;
    await PortalUser.findByIdAndDelete(id);
    res.json({ success: true, message: 'Portal User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkImportPortalUsers = async (req, res) => {
  try {
    const usersData = req.body; // Array of objects
    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid data provided' });
    }

    let finalSectionId = null;
    let isSectionHeadUpload = false;

    // If section_head is uploading, lock all imports to their section
    if (req.user && req.user.role === 'section_head') {
      const fullUser = await User.findById(req.user._id).populate('employee_id');
      if (fullUser?.employee_id?.section_id) {
        finalSectionId = fullUser.employee_id.section_id;
        isSectionHeadUpload = true;
      }
    }

    // Cache to avoid multiple DB hits for the same dept/section string
    const deptCache = {};
    const secCache = {};

    let successCount = 0;
    let errors = [];

    for (let i = 0; i < usersData.length; i++) {
      const row = usersData[i];
      try {
        const { full_name, email, department_text, section_text, department, section, is_section_head, password } = row;
        // Allow either 'department_text'/'section_text' (old) or 'department'/'section' (new) column names
        const deptName = department_text || department;
        const secName = section_text || section;

        if (!full_name || !email || !password) {
          errors.push(`Row ${i + 2}: Missing required fields (Full Name, Email, Password)`);
          continue;
        }

        const existing = await PortalUser.findOne({ email });
        if (existing) {
          errors.push(`Row ${i + 2}: Email ${email} already exists`);
          continue;
        }

        let deptId = null;
        if (deptName) {
          const dt = deptName.trim();
          const dtLower = dt.toLowerCase();
          if (deptCache[dtLower]) {
            deptId = deptCache[dtLower];
          } else {
            const dept = await Department.findOne({ name: { $regex: new RegExp(`^${dtLower}$`, 'i') } });
            if (dept) {
              deptId = dept._id;
              deptCache[dtLower] = deptId;
            } else {
              // Create new department dynamically
              const newDept = new Department({ name: dt });
              await newDept.save();
              deptId = newDept._id;
              deptCache[dtLower] = deptId;
            }
          }
        }

        let secId = finalSectionId;
        if (!isSectionHeadUpload && secName) {
          const st = secName.trim();
          const stLower = st.toLowerCase();
          if (secCache[stLower]) {
            secId = secCache[stLower];
          } else {
            const sec = await Section.findOne({ name: { $regex: new RegExp(`^${stLower}$`, 'i') } });
            if (sec) {
              secId = sec._id;
              secCache[stLower] = secId;
            } else {
              // Create new section dynamically
              const newSec = new Section({ name: st, department_id: deptId });
              await newSec.save();
              secId = newSec._id;
              secCache[stLower] = secId;
            }
          }
        }

        const newUser = new PortalUser({
          full_name,
          email,
          department_id: deptId,
          section_id: secId,
          is_section_head: isSectionHeadUpload ? false : (is_section_head || false),
          password
        });

        await newUser.save();
        successCount++;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${successCount} portal users.`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
