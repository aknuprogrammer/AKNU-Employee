const PFAccountSlip = require('../models/PFAccountSlip');
const Employee = require('../models/Employee');
const fs = require('fs');
const path = require('path');
const { sendPFAccountSlipEmail } = require('../utils/email');
const AdmZip = require('adm-zip');

// Helper to check for Admin/Accountant role
const checkAdminOrAccountant = (req, res) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'accountant')) {
    res.status(403).json({ message: 'Access denied. Administrator or Accountant privilege required.' });
    return false;
  }
  return true;
};

// Get all PF Account Slips (Admin/Accountant)
const getPFAccountSlips = async (req, res) => {
  try {
    if (!checkAdminOrAccountant(req, res)) return;

    const list = await PFAccountSlip.find({})
      .populate('employee_id', 'full_name employee_code designation')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload new PF Account Slip (Admin/Accountant)
const uploadPFAccountSlip = async (req, res) => {
  try {
    if (!checkAdminOrAccountant(req, res)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return;
    }

    const { employee_id, financial_year } = req.body;
    if (!employee_id || !financial_year) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Employee and Financial Year are required.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required.' });
    }

    const employee = await Employee.findById(employee_id);
    if (!employee) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Check if PF Slip already exists for this employee and financial year
    let existing = await PFAccountSlip.findOne({ employee_id, financial_year });

    if (existing) {
      // Delete the old file from disk
      const oldPath = path.join(__dirname, '..', 'uploads', 'pf-slips', existing.pdf_filename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.error("Failed to delete old file:", err);
        }
      }

      // Update existing record
      existing.pdf_filename = req.file.filename;
      existing.uploaded_by = req.user._id;
      const updated = await existing.save();

      // Send email to employee
      if (employee.email) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // sendPFAccountSlipEmail(employee.email, financial_year, `${frontendUrl}/login`).catch(err => {
        //   console.error("Failed to send PF Account Slip email:", err);
        // }); // Commented out as of now
      }

      return res.json(updated);
    } else {
      // Create new record
      const pfSlip = new PFAccountSlip({
        employee_id,
        financial_year,
        pdf_filename: req.file.filename,
        uploaded_by: req.user._id
      });
      const saved = await pfSlip.save();

      // Send email to employee
      if (employee.email) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // sendPFAccountSlipEmail(employee.email, financial_year, `${frontendUrl}/login`).catch(err => {
        //   console.error("Failed to send PF Account Slip email:", err);
        // }); // Commented out as of now
      }

      return res.status(201).json(saved);
    }
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Failed to delete temp file:", err);
      }
    }
    res.status(500).json({ message: error.message });
  }
};

// Toggle active/inactive status
const togglePFAccountSlipStatus = async (req, res) => {
  try {
    if (!checkAdminOrAccountant(req, res)) return;

    const pfSlip = await PFAccountSlip.findById(req.params.id);
    if (!pfSlip) {
      return res.status(404).json({ message: 'PF Account Slip record not found' });
    }
    pfSlip.is_active = req.body.is_active;
    await pfSlip.save();
    res.json(pfSlip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete PF Slip record and physical file
const deletePFAccountSlip = async (req, res) => {
  try {
    if (!checkAdminOrAccountant(req, res)) return;

    const pfSlip = await PFAccountSlip.findById(req.params.id);
    if (!pfSlip) {
      return res.status(404).json({ message: 'PF Account Slip record not found' });
    }

    // Delete the file from disk
    const filePath = path.join(__dirname, '..', 'uploads', 'pf-slips', pfSlip.pdf_filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete physical file:", err);
      }
    }

    await PFAccountSlip.findByIdAndDelete(req.params.id);
    res.json({ message: 'PF Account Slip record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Secure download for Admin/Accountant
const downloadPFAccountSlipAdmin = async (req, res) => {
  try {
    if (!checkAdminOrAccountant(req, res)) return;

    const pfSlip = await PFAccountSlip.findById(req.params.id);
    if (!pfSlip) {
      return res.status(404).json({ message: 'PF Account Slip record not found.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'pf-slips', pfSlip.pdf_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'PDF file not found on server.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Secure unlock/stream for Employee
const unlockPFAccountSlip = async (req, res) => {
  try {
    const { financial_year, pin } = req.body;
    const employee_id = req.user.employee_id;

    if (!financial_year || !employee_id) {
      return res.status(400).json({ message: 'Financial Year is required.' });
    }

    // Verify employee Aadhaar (Commented out as of now)
    /*
    const employee = await Employee.findById(employee_id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee profile not found.' });
    }

    if (!employee.aadhaar_number || employee.aadhaar_number.length < 4) {
      return res.status(400).json({ message: 'Aadhaar number not on file. Please contact administrator.' });
    }

    const actualLast4 = employee.aadhaar_number.slice(-4);
    if (actualLast4 !== pin) {
      return res.status(401).json({ message: 'Incorrect Aadhaar digits. Verification failed.' });
    }
    */

    // Find active PF Slip record
    const pfSlip = await PFAccountSlip.findOne({ employee_id, financial_year, is_active: true });
    if (!pfSlip) {
      return res.status(404).json({ message: 'No PF Account Slip is found for the specified year.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'pf-slips', pfSlip.pdf_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'No PF Account Slip is found for the specified year.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="PF_Slip_${financial_year}.pdf"`);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available financial years for the logged-in employee
const getMyPFAccountSlipYears = async (req, res) => {
  try {
    const employee_id = req.user.employee_id;
    if (!employee_id) {
      return res.status(400).json({ message: 'Employee ID not found in user session.' });
    }

    const records = await PFAccountSlip.find({ employee_id, is_active: true })
      .select('financial_year')
      .sort({ financial_year: -1 });

    // Deduplicate and return an array of financial year strings
    const years = [...new Set(records.map(r => r.financial_year))];
    res.json(years);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk Upload PF Account Slips from ZIP (Admin/Accountant)
const bulkUploadPFAccountSlip = async (req, res) => {
  try {
    if (!checkAdminOrAccountant(req, res)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return;
    }

    const { financial_year } = req.body;
    if (!financial_year) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Financial Year is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'ZIP file is required.' });
    }

    const zipPath = req.file.path;
    let zip;
    try {
      zip = new AdmZip(zipPath);
    } catch (err) {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      return res.status(400).json({ message: 'Invalid ZIP file archive.' });
    }

    const zipEntries = zip.getEntries();
    const successList = [];
    const failureList = [];

    // Ensure uploads/pf-slips folder exists
    const destDir = path.join(__dirname, '..', 'uploads', 'pf-slips');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    for (const entry of zipEntries) {
      // Skip directories or non-PDF files
      if (entry.isDirectory || !entry.entryName.toLowerCase().endsWith('.pdf')) {
        continue;
      }

      // Extract filename without path and extension
      const baseName = path.basename(entry.entryName);
      const identifier = path.parse(baseName).name.trim();

      if (!identifier) {
        failureList.push({ file: baseName, reason: 'Empty filename.' });
        continue;
      }

      // Look up employee by employee_code, pan_number, or cfms_id
      const employee = await Employee.findOne({
        $or: [
          { employee_code: { $regex: new RegExp('^' + identifier + '$', 'i') } },
          { pan_number: { $regex: new RegExp('^' + identifier + '$', 'i') } },
          { cfms_id: { $regex: new RegExp('^' + identifier + '$', 'i') } }
        ]
      });

      if (!employee) {
        failureList.push({ file: baseName, reason: `No active employee found matching code, PAN, or CFMS ID '${identifier}'.` });
        continue;
      }

      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFilename = 'pf-slip-' + uniqueSuffix + '.pdf';
        const finalPath = path.join(destDir, newFilename);

        // Decompress entry to buffer and save to final path
        const pdfBuffer = entry.getData();
        fs.writeFileSync(finalPath, pdfBuffer);

        // Save DB record (replace existing if any)
        let existing = await PFAccountSlip.findOne({ employee_id: employee._id, financial_year });
        if (existing) {
          // Delete old file
          const oldPath = path.join(destDir, existing.pdf_filename);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch (err) {
              console.error("Failed to delete old file:", err);
            }
          }
          existing.pdf_filename = newFilename;
          existing.uploaded_by = req.user._id;
          await existing.save();
        } else {
          await PFAccountSlip.create({
            employee_id: employee._id,
            financial_year,
            pdf_filename: newFilename,
            uploaded_by: req.user._id
          });
        }

        // Notify employee (asynchronous, fire-and-forget to avoid blocking loop)
        if (employee.email) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          // sendPFAccountSlipEmail(employee.email, financial_year, `${frontendUrl}/login`).catch(err => {
          //   console.error("Failed to send PF Account Slip bulk email:", err);
          // }); // Commented out as of now
        }

        successList.push({ file: baseName, employee: `${employee.employee_code} - ${employee.full_name}` });
      } catch (err) {
        failureList.push({ file: baseName, reason: `Internal error: ${err.message}` });
      }
    }

    // Clean up uploaded temp ZIP file
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    res.json({
      success: true,
      message: 'Bulk processing completed.',
      summary: {
        total: successList.length + failureList.length,
        successCount: successList.length,
        failCount: failureList.length
      },
      successes: successList,
      failures: failureList
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPFAccountSlips,
  uploadPFAccountSlip,
  togglePFAccountSlipStatus,
  deletePFAccountSlip,
  downloadPFAccountSlipAdmin,
  unlockPFAccountSlip,
  getMyPFAccountSlipYears,
  bulkUploadPFAccountSlip
};
