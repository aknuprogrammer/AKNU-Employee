const mongoose = require('mongoose');

const Form16Schema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  academic_year: { type: String, required: true }, // e.g., "2025-26"
  pdf_filename: { type: String, required: true }, // Saved filename on disk
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure unique combination of employee and academic year
Form16Schema.index({ employee_id: 1, academic_year: 1 }, { unique: true });

module.exports = mongoose.model('Form16', Form16Schema);
