const mongoose = require('mongoose');

const PFAccountSlipSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  financial_year: { type: String, required: true }, // e.g., "2025-26"
  pdf_filename: { type: String, required: true }, // Saved filename on disk
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure unique combination of employee and financial year
PFAccountSlipSchema.index({ employee_id: 1, financial_year: 1 }, { unique: true });

module.exports = mongoose.model('PFAccountSlip', PFAccountSlipSchema);
