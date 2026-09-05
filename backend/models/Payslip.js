const mongoose = require('mongoose');

const PayslipSchema = new mongoose.Schema({
  payslip_number: { type: String, required: true, unique: true },
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  
  // Earnings
  basic: { type: Number, default: 0 },
  agp: { type: Number, default: 0 },
  fp_inc: { type: Number, default: 0 },
  da_50: { type: Number, default: 0 },
  pers_pay: { type: Number, default: 0 },
  adv_incr: { type: Number, default: 0 },
  cca: { type: Number, default: 0 },
  hra_10: { type: Number, default: 0 },
  earn_misc: { type: Number, default: 0 },
  honorarium: { type: Number, default: 0 },
  da_arrears: { type: Number, default: 0 },
  con_allow: { type: Number, default: 0 },
  spl_allow: { type: Number, default: 0 }, // Spl. Allow
  
  // Deductions
  income_tax: { type: Number, default: 0 },
  pf_sub: { type: Number, default: 0 },
  pf_loan: { type: Number, default: 0 },
  lic: { type: Number, default: 0 },
  lic_hs_loan: { type: Number, default: 0 },
  prof_tax: { type: Number, default: 0 },
  ehs: { type: Number, default: 0 },
  cps: { type: Number, default: 0 },
  gpf: { type: Number, default: 0 },
  gis: { type: Number, default: 0 },
  recovery_dedu: { type: Number, default: 0 },
  recovery_dedu_breakdown: [
    {
      name: { type: String, required: true },
      amount: { type: Number, default: 0 }
    }
  ],
  cm_relief_fund: { type: Number, default: 0 },
  welfare_fund: { type: Number, default: 0 },
  aknu_corpus: { type: Number, default: 0 },
  university_club: { type: Number, default: 0 },
  tmacs: { type: Number, default: 0 },
  ded_misc: { type: Number, default: 0 },
  epf: { type: Number, default: 0 }, // EPF
  esi: { type: Number, default: 0 }, // ESI

  // Custom Fields
  custom_earnings: [
    {
      name: { type: String, required: true },
      amount: { type: Number, default: 0 }
    }
  ],
  custom_deductions: [
    {
      name: { type: String, required: true },
      amount: { type: Number, default: 0 }
    }
  ],
  
  // Totals
  gross_salary: { type: Number, required: true },
  total_deductions: { type: Number, required: true },
  net_salary: { type: Number, required: true },
  
  generated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

PayslipSchema.index(
  { employee_id: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { is_active: true } }
);

module.exports = mongoose.model('Payslip', PayslipSchema);

