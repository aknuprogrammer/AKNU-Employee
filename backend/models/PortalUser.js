const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PortalUserSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  section_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  is_section_head: { type: Boolean, default: false },
  role: { 
    type: String, 
    enum: ['section_head', 'junior_assistant', 'section_member'], 
    default: 'section_member' 
  },
  password: { type: String, required: true },
  plain_password: { type: String }, // Visible to Master Admin and Section Head
}, { timestamps: true });

PortalUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

PortalUserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('PortalUser', PortalUserSchema);
