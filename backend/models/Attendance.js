const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  type: { type: String, enum: ['employee', 'student'], required: true },
  prepared_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // For Student attendance specific fields
  course: { type: String },
  year_semester: { type: String },
  subject: { type: String },
  period: { type: String },
  taken_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  
  records: [{
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    status: { type: String, enum: ['Present', 'Absent', 'On Leave', 'OD'], required: true },
    remarks: { type: String }
  }],
  
  approval_status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  section_head_comments: { type: String },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
