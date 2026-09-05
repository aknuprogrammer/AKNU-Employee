const User = require('../models/User');
const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');
const { ensureUserExistsForEmployee } = require('./employeesController');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '2h',
  });
};

const registerUser = async (req, res) => {
  try {
    const { aadhaar_number, password } = req.body;
    if (!aadhaar_number || !password) {
      return res.status(400).json({ message: 'Aadhaar number and password are required' });
    }

    // Verify Aadhaar number exists in Employee collection
    const employee = await Employee.findOne({ aadhaar_number });
    if (!employee) {
      return res.status(400).json({ message: 'Aadhaar number not found in our records. Please contact the administrator.' });
    }

    // Check if employee has an email
    if (!employee.email) {
      return res.status(400).json({ message: 'No email address registered for this employee. Please contact the administrator.' });
    }

    // Check if User already exists with this employee_id
    let user = await User.findOne({ employee_id: employee._id });
    if (user && user.password_setup) {
      return res.status(400).json({ message: 'Account already registered. Please login.' });
    }

    if (user) {
      // User is already auto-provisioned but not fully set up.
      // Update password and set password_setup = true.
      user.password = password;
      user.password_setup = true;
      await user.save();
    } else {
      // User does not exist, create new
      user = await User.create({
        email: employee.email,
        password,
        role: 'employee',
        employee_id: employee._id,
        password_setup: true
      });
    }

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginInput = email || req.body.identifier;

    if (!loginInput || !password) {
      return res.status(400).json({ message: 'Name/Email and Aadhaar/Password are required' });
    }

    let user = null;

    if (loginInput.includes('@')) {
      // Find by email (primarily for admin/accountant)
      user = await User.findOne({ email: loginInput.toLowerCase() });
      if (user && (await user.matchPassword(password))) {
        return res.json({
          _id: user._id,
          email: user.email || '',
          username: user.username || '',
          role: user.role,
          token: generateToken(user._id),
        });
      }
    }

    // Check if password is a 12-digit number (Aadhaar for employees)
    if (/^\d{12}$/.test(password.trim())) {
      const employee = await Employee.findOne({ aadhaar_number: password.trim() });
      if (employee) {
        const dbNameStr = (employee.full_name || '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const inputNameStr = loginInput.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const dbEmail = (employee.email || '').trim().toLowerCase();
        const inputEmail = loginInput.trim().toLowerCase();

        // Fuzzy match: either db name includes input, input includes db name, or exact email match
        if (
          dbNameStr.includes(inputNameStr) || 
          inputNameStr.includes(dbNameStr) || 
          (dbEmail && dbEmail === inputEmail)
        ) {
          user = await ensureUserExistsForEmployee(employee);
          if (user) {
            return res.json({
              _id: user._id,
              email: user.email || '',
              username: user.username || '',
              role: user.role,
              token: generateToken(user._id),
            });
          }
        }
      }
    }

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('employee_id');
    if (user) {
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setupPassword = async (req, res) => {
  try {
    const { token, aadhaar_number, password } = req.body;
    if (!token || !aadhaar_number || !password) return res.status(400).json({ message: 'Token, Aadhaar number, and password are required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.email) return res.status(400).json({ message: 'Invalid token' });

    const user = await User.findOne({ email: decoded.email }).populate('employee_id');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.employee_id || user.employee_id.aadhaar_number !== aadhaar_number) {
      return res.status(400).json({ message: 'Aadhaar number does not match our records' });
    }

    user.password = password;
    user.password_setup = true;
    await user.save();

    res.json({ message: 'Password setup successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Token is invalid or expired' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ employee_id: { $exists: true } }).select('-password').populate('employee_id');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { registerUser, authUser, getUserProfile, setupPassword, getUsers };
