const Department = require('../models/Department');

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({});
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Department name is required' });
    
    // Check if exists
    let dept = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (dept) {
      return res.status(400).json({ message: 'Department already exists' });
    }

    dept = new Department({ name });
    const created = await dept.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDepartments, createDepartment };
