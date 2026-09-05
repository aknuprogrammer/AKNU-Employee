const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  section_head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Section', SectionSchema);
