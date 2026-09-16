const mongoose = require('mongoose');
const User = require('../models/User');
const PortalUser = require('../models/PortalUser');
const Section = require('../models/Section');

/**
 * Resolves the section ObjectId for a section head user.
 * Supports users from both User and PortalUser collections.
 */
async function getSectionHeadSectionId(user) {
  if (!user) return null;

  // 1. Direct section_id on user object
  if (user.section_id) {
    return user.section_id._id || user.section_id;
  }

  // 2. Direct employee_id.section_id on user object
  if (user.employee_id?.section_id) {
    return user.employee_id.section_id._id || user.employee_id.section_id;
  }

  const userId = user._id || user.id;
  if (!userId) return null;

  // 3. Check User collection with employee_id populated
  try {
    const fullUser = await User.findById(userId).populate('employee_id');
    if (fullUser?.employee_id?.section_id) {
      return fullUser.employee_id.section_id._id || fullUser.employee_id.section_id;
    }
  } catch (e) {
    // ignore error and proceed
  }

  // 4. Check PortalUser collection
  try {
    const portalUser = await PortalUser.findById(userId);
    if (portalUser?.section_id) {
      return portalUser.section_id._id || portalUser.section_id;
    }
  } catch (e) {
    // ignore error and proceed
  }

  // 5. Check Section collection where section_head is this user
  try {
    const section = await Section.findOne({ section_head: userId });
    if (section) {
      return section._id;
    }
  } catch (e) {
    // ignore error and proceed
  }

  return null;
}

module.exports = {
  getSectionHeadSectionId,
};
