const Category = require('../models/Category');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    
    // Check if exists
    let cat = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (cat) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    cat = new Category({ name });
    const created = await cat.save();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCategories, createCategory };
