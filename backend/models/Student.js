const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  roll_number: { type: String, required: true, unique: true },
  full_name: { type: String, required: true },
  course: { type: String },
  branch: { type: String },
  year_semester: { type: String },
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
