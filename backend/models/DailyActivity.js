const mongoose = require('mongoose');

const DailyActivitySchema = new mongoose.Schema({
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  date: { type: Date, required: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  task_description: { type: String, required: true },
  status: { type: String, enum: ['Completed', 'Pending', 'In Progress'], required: true },
  remarks: { type: String },
  
  approval_status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  section_head_comments: { type: String },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('DailyActivity', DailyActivitySchema);
