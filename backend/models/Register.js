const mongoose = require('mongoose');

const RegisterSchema = new mongoose.Schema({
  type: { type: String, enum: ['Inward', 'Outward', 'Movement'], required: true },
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  date: { type: Date, required: true },
  
  // Shared fields for Inward/Outward
  reference_number: { type: String },
  party_name: { type: String }, // Sender or Recipient
  subject: { type: String },
  
  // Inward specific
  forwarded_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  
  // Outward specific
  dispatch_mode: { type: String },
  dispatch_details: { type: String },

  // Movement specific
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  reason: { type: String },
  place_of_visit: { type: String },
  out_time: { type: String },
  expected_in_time: { type: String },
  actual_in_time: { type: String },

  // Workflow
  status: { type: String, enum: ['Pending Review', 'Pending Approval', 'Approved', 'Acknowledged', 'Rejected', 'Dispatched'], default: 'Pending Approval' },
  section_head_comments: { type: String },
  attachments: [{ type: String }], // file paths or URLs
}, { timestamps: true });

module.exports = mongoose.model('Register', RegisterSchema);
