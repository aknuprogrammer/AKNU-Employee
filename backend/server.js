require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/payslips', require('./routes/payslips'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/form16', require('./routes/form16'));
app.use('/api/pf-slips', require('./routes/pfAccountSlips'));

// Basic Route
app.get('/', (req, res) => {
  res.send('Aknu-Payslip API is running');
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    // Drop old employee_code_1 index if it exists to allow sparse index rebuilding
    try {
      const Employee = require('./models/Employee');
      const indexes = await Employee.collection.indexes();
      const hasCodeIndex = indexes.some(idx => idx.name === 'employee_code_1');
      if (hasCodeIndex) {
        await Employee.collection.dropIndex('employee_code_1');
        console.log('🗑️ Dropped old employee_code_1 index to enable sparse index.');
      }
    } catch (err) {
      console.warn('⚠️ Could not drop old employee_code index (it may already be dropped):', err.message);
    }

    // Auto-seed default ADMIN account if none exists
    const User = require('./models/User');
    const existing = await User.findOne({ role: 'admin' });
      if (!existing) {
        await User.create({
          email: 'admin@aknu.edu',
          full_name: 'System Administrator',
          role: 'admin',
          password: 'Admin@1234'
        });
        console.log('🌱 Default admin created → email: admin@aknu.edu  password: Admin@1234');
      }

      // Auto-seed Departments
      const Department = require('./models/Department');
      const defaultDepts = ['Regular', 'Adhoc', 'Contract', 'Paper Wise'];
      for (const name of defaultDepts) {
        if (!(await Department.findOne({ name }))) {
          await Department.create({ name });
        }
      }

      // Auto-seed Categories
      const Category = require('./models/Category');
      const defaultCats = ['Teaching', 'Non Teaching', 'Guest Faculty', 'Daily Wage'];
      for (const name of defaultCats) {
        if (!(await Category.findOne({ name }))) {
          await Category.create({ name });
        }
      }

      // Auto-provision user accounts for all existing employees
      const Employee = require('./models/Employee');
      const { ensureUserExistsForEmployee } = require('./controllers/employeesController');
      const employees = await Employee.find({});
      let provisionedCount = 0;
      for (const emp of employees) {
        try {
          const userCreated = await ensureUserExistsForEmployee(emp);
          if (userCreated) provisionedCount++;
        } catch (err) {
          console.error(`Error provisioning user for employee ${emp.full_name}:`, err.message);
        }
      }
      if (employees.length > 0) {
        console.log(`🌱 Auto-provisioned/synced ${provisionedCount} employee user accounts.`);
      }

      const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
