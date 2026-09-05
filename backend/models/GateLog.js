const mongoose = require('mongoose');

const GateLogSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  person_category: { type: String, enum: ['Employee', 'Student', 'Visitor', 'Vendor'], required: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  name: { type: String },
  id_number: { type: String },
  vehicle_number: { type: String },
  purpose: { type: String },
  whom_to_meet: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  section_to_visit: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  in_time: { type: Date, required: true, default: Date.now },
  out_time: { type: Date },
  logged_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('GateLog', GateLogSchema);
