const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const { sendPayslipEmail } = require('../utils/email');

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getPayslips = async (req, res) => {
  try {
    const payslips = await Payslip.find({}).populate({
      path: 'employee_id',
      select: 'full_name employee_code category',
      populate: { path: 'category', select: 'name' }
    });
    res.json(payslips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPayslipById = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id).populate({
      path: 'employee_id',
      populate: [
        { path: 'department_id', select: 'name' },
        { path: 'category', select: 'name' }
      ]
    });
    if (payslip) {
      res.json(payslip);
    } else {
      res.status(404).json({ message: 'Payslip not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPayslip = async (req, res) => {
  try {
    const { employee_id, month, year } = req.body;
    const employee = await Employee.findById(employee_id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Generate serial number based on count of payslips for this month
    const count = await Payslip.countDocuments({ month, year });
    const serialNumber = String(count + 1).padStart(4, '0');
    const payslip_number = `AKNU-${year}${String(month).padStart(2, "0")}-${employee.employee_code}-${serialNumber}`;

    const payslip = new Payslip({ ...req.body, payslip_number, generated_by: req.user._id });
    const createdPayslip = await payslip.save();

    // Send email to employee
    if (employee.email) {
      const monthName = MONTHS[payslip.month - 1];
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      // await sendPayslipEmail(employee.email, monthName, payslip.year, `${frontendUrl}/login`); // Commented out as of now
    }

    res.status(201).json(createdPayslip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const unlockPayslip = async (req, res) => {
  try {
    const { month, year, pin } = req.body;
    const employee_id = req.user.employee_id; // from logged in employee

    if (!month || !year || !employee_id) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Find payslip for this employee, month, year
    const payslip = await Payslip.findOne({ employee_id, month, year }).populate({
      path: 'employee_id',
      populate: [
        { path: 'department_id', select: 'name' },
        { path: 'category', select: 'name' }
      ]
    });

    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found. Please contact the accountant.' });
    }

    if (payslip.is_active === false) {
      return res.status(404).json({ message: 'Payslip not found. Please contact the accountant.' });
    }

    // Verify Aadhaar (Commented out as of now)
    /*
    const employee = payslip.employee_id;
    if (!employee.aadhaar_number || employee.aadhaar_number.length < 4) {
      return res.status(400).json({ message: 'No Aadhaar number on file for this employee. Please contact admin.' });
    }

    const actualLast4 = employee.aadhaar_number.slice(-4);
    if (actualLast4 !== pin) {
      return res.status(401).json({ message: 'Incorrect Aadhaar digits' });
    }
    */

    res.json(payslip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);
    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }
    
    // Do not allow updating employee_id, month, year, payslip_number directly
    const { employee_id, month, year, payslip_number, generated_by, createdAt, updatedAt, ...updateData } = req.body;
    
    Object.assign(payslip, updateData);
    const updatedPayslip = await payslip.save();
    res.json(updatedPayslip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const togglePayslipStatus = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id);
    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }
    
    payslip.is_active = req.body.is_active;
    const updatedPayslip = await payslip.save();
    res.json(updatedPayslip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getLatestPayslipByEmployee = async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ employee_id: req.params.employeeId })
      .sort({ year: -1, month: -1 });
    if (payslip) {
      res.json(payslip);
    } else {
      res.status(404).json({ message: 'No previous payslips found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ payslip_number: req.params.payslip_number })
      .populate({
        path: 'employee_id',
        populate: [
          { path: 'department_id', select: 'name' },
          { path: 'category', select: 'name' }
        ]
      });
    if (payslip) {
      res.json(payslip);
    } else {
      res.status(404).json({ message: 'Payslip verification failed. Invalid payslip number.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getConsolidatedPayslip = async (req, res) => {
  try {
    const { startMonth, startYear, endMonth, endYear, pin, employeeId } = req.body;
    const employee_id = employeeId || req.user.employee_id;

    if (!startMonth || !startYear || !endMonth || !endYear || !pin || !employee_id) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    const employee = await Employee.findById(employee_id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    if (!employee.aadhaar_number || employee.aadhaar_number.length < 4) {
      return res.status(400).json({ message: 'Aadhaar details missing. Contact admin.' });
    }

    if (employee.aadhaar_number.slice(-4) !== pin) {
      return res.status(401).json({ message: 'Incorrect Aadhaar digits' });
    }

    let query;
    if (startYear === endYear) {
      query = {
        employee_id,
        is_active: true,
        year: startYear,
        month: { $gte: startMonth, $lte: endMonth }
      };
    } else {
      query = {
        employee_id,
        is_active: true,
        $or: [
          { year: startYear, month: { $gte: startMonth } },
          { year: endYear, month: { $lte: endMonth } },
          { year: { $gt: startYear, $lt: endYear } }
        ]
      };
    }

    const payslips = await Payslip.find(query).populate({
      path: 'employee_id',
      populate: [
        { path: 'department_id', select: 'name' },
        { path: 'category', select: 'name' }
      ]
    }).sort({ year: 1, month: 1 });

    if (!payslips || payslips.length === 0) {
      return res.status(404).json({ message: 'No payslip records found for the selected period' });
    }

    const totals = {
      gross_salary: 0,
      total_deductions: 0,
      net_salary: 0
    };

    const monthlySummaries = payslips.map(p => {
      totals.gross_salary += (p.gross_salary || 0);
      totals.total_deductions += (p.total_deductions || 0);
      totals.net_salary += (p.net_salary || 0);
      
      return {
        month: p.month,
        year: p.year,
        gross_salary: p.gross_salary || 0,
        total_deductions: p.total_deductions || 0,
        net_salary: p.net_salary || 0
      };
    });

    return res.json({
      is_consolidated: true,
      payslip_number: `CON-${payslips[0].employee_id.employee_code}-${startYear}${String(startMonth).padStart(2,'0')}-${endYear}${String(endMonth).padStart(2,'0')}`,
      employee_id: payslips[0].employee_id,
      month: startMonth,
      year: startYear,
      endMonth: endMonth,
      endYear: endYear,
      createdAt: new Date().toISOString(),
      payslips: monthlySummaries,
      totals: totals,
      net_salary: totals.net_salary
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkGeneratePayslips = async (req, res) => {
  try {
    const { month, year, type, data } = req.body;
    if (!month || !year || !type) {
      return res.status(400).json({ message: 'Month, year, and type are required' });
    }

    const monthNum = Number(month);
    const yearNum = Number(year);

    const EARN_FIELDS = [
      "basic", "agp", "fp_inc", "da_50", "pers_pay", "adv_incr", 
      "cca", "hra_10", "earn_misc", "honorarium", "da_arrears", "con_allow", "spl_allow"
    ];

    const DED_FIELDS = [
      "income_tax", "pf_sub", "pf_loan", "lic", "lic_hs_loan", "prof_tax", 
      "ehs", "cps", "gpf", "gis", "cm_relief_fund", "welfare_fund", 
      "aknu_corpus", "university_club", "tmacs", "ded_misc", "epf", "esi"
    ];

    let successCount = 0;
    let skippedCount = 0;
    const skippedEmployees = [];
    const noHistoryEmployees = [];
    const errorEmployees = [];

    let serialCount = await Payslip.countDocuments({ month: monthNum, year: yearNum });

    if (type === 'clone') {
      let activeEmployees;
      if (req.body.employeeIds && Array.isArray(req.body.employeeIds)) {
        activeEmployees = await Employee.find({ _id: { $in: req.body.employeeIds }, is_active: true });
      } else {
        activeEmployees = await Employee.find({ is_active: true });
      }

      for (const emp of activeEmployees) {
        // Check for duplicates
        const existing = await Payslip.findOne({ employee_id: emp._id, month: monthNum, year: yearNum, is_active: true });
        if (existing) {
          skippedCount++;
          skippedEmployees.push({
            employee_code: emp.employee_code,
            full_name: emp.full_name,
            reason: 'Already generated'
          });
          continue;
        }

        // Find latest payslip
        const latest = await Payslip.findOne({ employee_id: emp._id, is_active: true }).sort({ year: -1, month: -1 });
        if (!latest) {
          noHistoryEmployees.push({
            employee_code: emp.employee_code,
            full_name: emp.full_name,
            reason: 'No previous payslip record'
          });
          continue;
        }

        // Clone
        const newPayslipData = {
          employee_id: emp._id,
          month: monthNum,
          year: yearNum,
          generated_by: req.user._id,
          recovery_dedu: latest.recovery_dedu || 0,
          recovery_dedu_breakdown: latest.recovery_dedu_breakdown || [],
          custom_earnings: latest.custom_earnings || [],
          custom_deductions: latest.custom_deductions || []
        };

        let gross = 0;
        let totalDeductions = newPayslipData.recovery_dedu;

        EARN_FIELDS.forEach(f => {
          const val = latest[f] || 0;
          newPayslipData[f] = val;
          gross += val;
        });

        if (newPayslipData.custom_earnings) {
          newPayslipData.custom_earnings.forEach(item => {
            gross += Number(item.amount) || 0;
          });
        }

        DED_FIELDS.forEach(f => {
          const val = latest[f] || 0;
          newPayslipData[f] = val;
          totalDeductions += val;
        });

        if (newPayslipData.custom_deductions) {
          newPayslipData.custom_deductions.forEach(item => {
            totalDeductions += Number(item.amount) || 0;
          });
        }

        newPayslipData.gross_salary = gross;
        newPayslipData.total_deductions = totalDeductions;
        newPayslipData.net_salary = gross - totalDeductions;

        serialCount++;
        const serialStr = String(serialCount).padStart(4, '0');
        newPayslipData.payslip_number = `AKNU-${yearNum}${String(monthNum).padStart(2, '0')}-${emp.employee_code}-${serialStr}`;

        const newPayslip = new Payslip(newPayslipData);
        await newPayslip.save();
        successCount++;

        // Send email (async/fire-and-forget)
        if (emp.email) {
          const monthName = MONTHS[monthNum - 1];
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          // sendPayslipEmail(emp.email, monthName, yearNum, `${frontendUrl}/login`).catch(err => {
          //   console.error(`Error sending email to ${emp.email}:`, err.message);
          // }); // Commented out as of now
        }
      }
    } else if (type === 'import') {
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ message: 'Data array is required for import' });
      }

      for (const row of data) {
        const code = String(row.employee_code || '').trim();
        if (!code) continue;

        const emp = await Employee.findOne({ employee_code: code, is_active: true });
        if (!emp) {
          errorEmployees.push({
            employee_code: code,
            reason: 'Employee not found or inactive'
          });
          continue;
        }

        // Check for duplicates
        const existing = await Payslip.findOne({ employee_id: emp._id, month: monthNum, year: yearNum, is_active: true });
        if (existing) {
          skippedCount++;
          skippedEmployees.push({
            employee_code: emp.employee_code,
            full_name: emp.full_name,
            reason: 'Already generated'
          });
          continue;
        }

        // Map salary values
        const newPayslipData = {
          employee_id: emp._id,
          month: monthNum,
          year: yearNum,
          generated_by: req.user._id,
          recovery_dedu: Number(row.recovery_dedu) || 0,
          recovery_dedu_breakdown: row.recovery_dedu_breakdown || [],
          custom_earnings: row.custom_earnings || [],
          custom_deductions: row.custom_deductions || []
        };

        let gross = 0;
        let totalDeductions = newPayslipData.recovery_dedu;

        EARN_FIELDS.forEach(f => {
          const val = Number(row[f]) || 0;
          newPayslipData[f] = val;
          gross += val;
        });

        if (newPayslipData.custom_earnings) {
          newPayslipData.custom_earnings.forEach(item => {
            gross += Number(item.amount) || 0;
          });
        }

        DED_FIELDS.forEach(f => {
          const val = Number(row[f]) || 0;
          newPayslipData[f] = val;
          totalDeductions += val;
        });

        if (newPayslipData.custom_deductions) {
          newPayslipData.custom_deductions.forEach(item => {
            totalDeductions += Number(item.amount) || 0;
          });
        }

        newPayslipData.gross_salary = gross;
        newPayslipData.total_deductions = totalDeductions;
        newPayslipData.net_salary = gross - totalDeductions;

        serialCount++;
        const serialStr = String(serialCount).padStart(4, '0');
        newPayslipData.payslip_number = `AKNU-${yearNum}${String(monthNum).padStart(2, '0')}-${emp.employee_code}-${serialStr}`;

        const newPayslip = new Payslip(newPayslipData);
        await newPayslip.save();
        successCount++;

        // Send email (async/fire-and-forget)
        if (emp.email) {
          const monthName = MONTHS[monthNum - 1];
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          // sendPayslipEmail(emp.email, monthName, yearNum, `${frontendUrl}/login`).catch(err => {
          //   console.error(`Error sending email to ${emp.email}:`, err.message);
          // }); // Commented out as of now
        }
      }
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }

    res.json({
      message: 'Bulk generation process complete',
      successCount,
      skippedCount,
      skippedEmployees,
      noHistoryCount: noHistoryEmployees.length,
      noHistoryEmployees,
      errorCount: errorEmployees.length,
      errorEmployees
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPayslips, getPayslipById, createPayslip, unlockPayslip, updatePayslip, togglePayslipStatus, getLatestPayslipByEmployee, verifyPayslip, getConsolidatedPayslip, bulkGeneratePayslips };

