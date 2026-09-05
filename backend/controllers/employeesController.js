const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const Category = require('../models/Category');
const jwt = require('jsonwebtoken');
const { sendWelcomeEmail } = require('../utils/email');



const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({})
      .populate('department_id', 'name')
      .populate('category', 'name');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('department_id', 'name');
    if (employee) {
      res.json(employee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ensureUserExistsForEmployee = async (employee) => {
  const aadhar = String(employee.aadhaar_number || '').trim();
  if (!aadhar || aadhar.length < 4) {
    // If no Aadhaar number is registered or if it's too short, skip provisioning the User account.
    return null;
  }

  const password = aadhar;
  let user = await User.findOne({ employee_id: employee._id });

  if (!user) {
    const userFields = {
      username: employee.full_name,
      password: password,
      role: 'employee',
      employee_id: employee._id,
      password_setup: true
    };
    if (employee.email && employee.email.trim() !== '') {
      userFields.email = employee.email.trim().toLowerCase();
    }
    user = await User.create(userFields);
  } else {
    let isModified = false;
    if (user.username !== employee.full_name) {
      user.username = employee.full_name;
      isModified = true;
    }
    
    const isPassCorrect = await user.matchPassword(password);
    if (!isPassCorrect) {
      user.password = password;
      isModified = true;
    }
    
    if (employee.email && employee.email.trim() !== '') {
      if (user.email !== employee.email.trim().toLowerCase()) {
        user.email = employee.email.trim().toLowerCase();
        isModified = true;
      }
    } else if (user.email) {
      user.email = undefined;
      isModified = true;
    }

    if (isModified) {
      await user.save();
    }
  }
  return user;
};

const createEmployee = async (req, res) => {
  try {
    if (!req.body.employee_code || String(req.body.employee_code).trim() === '') {
      req.body.employee_code = undefined;
    } else {
      req.body.employee_code = String(req.body.employee_code).trim();
    }
    const employee = new Employee(req.body);
    const createdEmployee = await employee.save();

    // Auto-provision User
    await ensureUserExistsForEmployee(createdEmployee).catch(err => {
      console.error('Error auto-provisioning user on create:', err);
    });

    res.status(201).json(createdEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (employee) {
      if (!req.body.employee_code || String(req.body.employee_code).trim() === '') {
        req.body.employee_code = undefined;
      } else {
        req.body.employee_code = String(req.body.employee_code).trim();
      }
      Object.assign(employee, req.body);
      const updatedEmployee = await employee.save();
      
      // Auto-provision or update User record
      await ensureUserExistsForEmployee(updatedEmployee).catch(err => {
        console.error('Error auto-provisioning user on update:', err);
      });

      res.json(updatedEmployee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const bulkImport = async (req, res) => {
  try {
    const { employees } = req.body;
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    for (const emp of employees) {
      if (!emp.employee_code || String(emp.employee_code).trim() === '') {
        emp.employee_code = undefined;
      } else {
        emp.employee_code = String(emp.employee_code).trim();
      }

      if (emp.department_text) {
        let d = await Department.findOne({ name: { $regex: new RegExp(`^${emp.department_text.trim()}$`, 'i') } });
        if (!d) d = await Department.create({ name: emp.department_text.trim() });
        emp.department_id = d._id;
      }
      if (emp.category_text) {
        let c = await Category.findOne({ name: { $regex: new RegExp(`^${emp.category_text.trim()}$`, 'i') } });
        if (!c) c = await Category.create({ name: emp.category_text.trim() });
        emp.category = c._id;
      }
    }

    const created = await Employee.insertMany(employees, { ordered: false });
    
    // Auto-provision Users
    for (const emp of created) {
      await ensureUserExistsForEmployee(emp).catch(() => null);
    }

    res.status(201).json({ message: `Imported ${created.length} employees`, count: created.length });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateIds = error.writeErrors?.map(e => e.err.op.employee_code).filter(Boolean) || [];
      const msg = duplicateIds.length > 0 
        ? `These Employee IDs already exist: ${duplicateIds.join(', ')}`
        : 'One or more employees already exist.';
      return res.status(400).json({ message: msg });
    }
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getEmployees, getEmployeeById, createEmployee, updateEmployee, bulkImport, ensureUserExistsForEmployee };
