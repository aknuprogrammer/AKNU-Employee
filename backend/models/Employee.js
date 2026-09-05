const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  employee_code: { type: String, unique: true, sparse: true },
  full_name: { type: String, required: true },
  email: { type: String },
  designation: { type: String },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  place_of_working: { type: String },
  pan_number: { type: String },
  cfms_id: { type: String },
  pran_number: { type: String },
  aadhaar_number: { type: String, minlength: 12, maxlength: 12 },
  joining_date: { type: Date },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
