import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  FileCheck,
  Info,
  Edit
} from "lucide-react";
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EARN_FIELDS = [
  "basic", "agp", "fp_inc", "da_50", "pers_pay", "adv_incr",
  "cca", "hra_10", "earn_misc", "honorarium", "da_arrears", "con_allow", "spl_allow"
];

const DED_FIELDS = [
  "income_tax", "pf_sub", "pf_loan", "lic", "lic_hs_loan", "prof_tax",
  "ehs", "cps", "gpf", "gis", "cm_relief_fund", "welfare_fund",
  "aknu_corpus", "university_club", "tmacs", "ded_misc", "epf", "esi"
];

const calculateNetPay = (row) => {
  let gross = 0;
  let totalDeductions = Number(row.recovery_dedu || 0);

  EARN_FIELDS.forEach(f => {
    gross += Number(row[f] || 0);
  });

  if (row.custom_earnings) {
    row.custom_earnings.forEach(item => {
      gross += Number(item.amount || 0);
    });
  }

  DED_FIELDS.forEach(f => {
    totalDeductions += Number(row[f] || 0);
  });

  if (row.custom_deductions) {
    row.custom_deductions.forEach(item => {
      totalDeductions += Number(item.amount || 0);
    });
  }

  return gross - totalDeductions;
};

const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(Number(val));
};

export default function BulkPayslips({ isEmbedded = false, onViewList }) {
  const { isAccountant } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [selectedFormat, setSelectedFormat] = useState("teaching_regular");

  // Data loaded from server
  const [employees, setEmployees] = useState([]);
  const [existingPayslips, setExistingPayslips] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const catName = (emp.category?.name || "").toLowerCase();
      const code = (emp.employee_code || "").trim();

      if (selectedFormat === "teaching_regular") {
        if (catName === "teaching regular" || catName === "regular teaching") return true;
        return catName === "teaching" && code.startsWith("TS");
      }
      if (selectedFormat === "non_teaching_regular") {
        if (catName === "non-teaching regular" || catName === "non teaching regular" || catName === "regular non-teaching" || catName === "regular non teaching") return true;
        return (catName === "non teaching" || catName === "non-teaching") && code.startsWith("NTS");
      }
      if (selectedFormat === "adhoc_teaching") {
        if (catName === "adhoc teaching" || catName === "teaching adhoc") return true;
        return catName === "teaching" && !code.startsWith("TS") && !code.startsWith("NTS");
      }
      if (selectedFormat === "adhoc_non_teaching") {
        if (catName === "adhoc non-teaching" || catName === "adhoc non teaching" || catName === "non-teaching adhoc" || catName === "non teaching adhoc") return true;
        return (catName === "non teaching" || catName === "non-teaching") && !code.startsWith("TS") && !code.startsWith("NTS");
      }
      return true;
    });
  }, [employees, selectedFormat]);

  // Pagination State for Carry Forward Tab
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEmployees]);

  // File Upload State
  const [uploadData, setUploadData] = useState([]);

  // Selection state for Carry Forward
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  // Execution States
  const [generating, setGenerating] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [results, setResults] = useState(null);

  const yearsList = useMemo(() => {
    return ["2030", "2029", "2028", "2027", "2026", "2025"];
  }, []);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [empRes, payslipRes] = await Promise.all([
        api.get("/employees"),
        api.get("/payslips")
      ]);
      setEmployees(empRes.data || []);
      setExistingPayslips(payslipRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load records from server");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAccountant) {
      fetchData();
    }
  }, [isAccountant]);

  // Lookup Maps
  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      map[e.employee_code] = e;
    });
    return map;
  }, [employees]);

  const employeeByNameMap = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      if (e.full_name) {
        map[e.full_name.toLowerCase().trim()] = e;
      }
    });
    return map;
  }, [employees]);

  const existingPayslipsMap = useMemo(() => {
    const map = {};
    existingPayslips.forEach(p => {
      if (p.is_active !== false) {
        const empCode = p.employee_id?.employee_code || (p.employee_id && typeof p.employee_id === 'object' ? p.employee_id.employee_code : '');
        if (empCode) {
          map[`${empCode}-${p.month}-${p.year}`] = p;
        }
      }
    });
    return map;
  }, [existingPayslips]);

  const latestPayslipsMap = useMemo(() => {
    const map = {};
    existingPayslips.forEach(p => {
      if (p.is_active !== false) {
        const empId = p.employee_id?._id || p.employee_id;
        const currentLatest = map[empId];
        if (!currentLatest || new Date(p.createdAt) > new Date(currentLatest.createdAt)) {
          map[empId] = p;
        }
      }
    });
    return map;
  }, [existingPayslips]);

  const eligibleEmployees = useMemo(() => {
    return filteredEmployees.filter(emp => {
      const alreadyExists = existingPayslipsMap[`${emp.employee_code}-${Number(month)}-${Number(year)}`];
      const latest = latestPayslipsMap[emp._id];
      return !alreadyExists && latest;
    });
  }, [filteredEmployees, month, year, existingPayslipsMap, latestPayslipsMap]);

  useEffect(() => {
    setSelectedEmployeeIds(eligibleEmployees.map(emp => emp._id));
  }, [eligibleEmployees]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEmployeeIds(eligibleEmployees.map(emp => emp._id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  // Preview numbers for Copy from Previous Month
  const carryForwardPreview = useMemo(() => {
    const targetMonth = Number(month);
    const targetYear = Number(year);

    let toGenerate = selectedEmployeeIds.length;
    let duplicates = 0;
    let noHistory = 0;

    filteredEmployees.forEach(emp => {
      const alreadyExists = existingPayslipsMap[`${emp.employee_code}-${targetMonth}-${targetYear}`];
      if (alreadyExists) {
        duplicates++;
      } else {
        const latest = latestPayslipsMap[emp._id];
        if (!latest) {
          noHistory++;
        }
      }
    });

    return { toGenerate, duplicates, noHistory };
  }, [filteredEmployees, month, year, existingPayslipsMap, latestPayslipsMap, selectedEmployeeIds]);

  const validateRowData = (row) => {
    const code = String(row.employee_code || '').trim();
    const name = String(row.full_name || '').trim();

    const dbEmp = (code ? employeeMap[code] : null) || (name ? employeeByNameMap[name.toLowerCase().trim()] : null);
    let status = "ready";
    let message = "Ready to generate";

    if (dbEmp) {
      row.employee_code = dbEmp.employee_code;
      row.full_name = dbEmp.full_name;

      const catName = (dbEmp.category?.name || "").toLowerCase();
      const dbCode = (dbEmp.employee_code || "").trim();
      let isCategoryMatch = false;

      if (selectedFormat === "teaching_regular") {
        isCategoryMatch = (catName === "teaching regular" || catName === "regular teaching") || (catName === "teaching" && dbCode.startsWith("TS"));
      } else if (selectedFormat === "non_teaching_regular") {
        isCategoryMatch = (catName === "non-teaching regular" || catName === "non teaching regular" || catName === "regular non-teaching" || catName === "regular non teaching") || ((catName === "non teaching" || catName === "non-teaching") && dbCode.startsWith("NTS"));
      } else if (selectedFormat === "adhoc_teaching") {
        isCategoryMatch = (catName === "adhoc teaching" || catName === "teaching adhoc") || (catName === "teaching" && !dbCode.startsWith("TS") && !dbCode.startsWith("NTS"));
      } else if (selectedFormat === "adhoc_non_teaching") {
        isCategoryMatch = (catName === "adhoc non-teaching" || catName === "adhoc non teaching" || catName === "non-teaching adhoc" || catName === "non teaching adhoc") || ((catName === "non teaching" || catName === "non-teaching") && !dbCode.startsWith("TS") && !dbCode.startsWith("NTS"));
      }

      if (!isCategoryMatch) {
        status = "error";
        message = `Incorrect category (expected ${selectedFormat.replace('_', ' ')})`;
      }
    }

    if (!dbEmp) {
      status = "error";
      if (!code && !name) {
        message = "Missing Employee ID and Name";
      } else if (code) {
        message = "Employee ID not found in database";
      } else {
        message = "Employee Name not found in database";
      }
    } else if (status !== "error") {
      const alreadyExists = existingPayslipsMap[`${dbEmp.employee_code}-${Number(month)}-${Number(year)}`];
      if (alreadyExists) {
        status = "duplicate";
        message = "Already generated (will skip)";
      }
    }

    return {
      ...row,
      _status: status,
      _message: message
    };
  };

  // Create Excel Template
  const handleDownloadTemplate = () => {
    try {
      toast.loading("Creating template file...", { id: "template-gen" });

      let templateRows = [];
      let headers = [];

      if (selectedFormat === "teaching_regular") {
        headers = [
          "employee_code", "employee_name", "course", "basic", "agp", "da", "hra",
          "conveyance_allowance", "honorarium", "arrears", "er_cps_10", "er_ehs", "tds",
          "gpf_subscription", "cps_share_20", "lic", "gis", "mobile_bill", "prof_tax",
          "ehs_share", "marriage_loan", "vehicle_loan", "loss_of_pay", "advance_recovery", "recovery"
        ];
        templateRows = filteredEmployees.map(emp => {
          const p = latestPayslipsMap[emp._id] || {};
          const breakdown = p.recovery_dedu_breakdown || [];
          return {
            "employee_code": emp.employee_code,
            "employee_name": emp.full_name,
            "course": emp.place_of_working || "",
            "basic": p.basic || 0,
            "agp": p.agp || 0,
            "da": p.da_50 || 0,
            "hra": p.hra_10 || 0,
            "conveyance_allowance": p.con_allow || 0,
            "honorarium": p.honorarium || 0,
            "arrears": p.da_arrears || 0,
            "er_cps_10": (p.custom_earnings || []).find(e => e.name === "ER CPS 10%")?.amount || 0,
            "er_ehs": (p.custom_earnings || []).find(e => e.name === "ER EHS")?.amount || 0,
            "tds": p.income_tax || 0,
            "gpf_subscription": p.gpf || 0,
            "cps_share_20": p.cps || 0,
            "lic": p.lic || 0,
            "gis": p.gis || 0,
            "mobile_bill": p.ded_misc || 0,
            "prof_tax": p.prof_tax || 0,
            "ehs_share": p.ehs || 0,
            "marriage_loan": breakdown.find(b => b.name?.toLowerCase().includes("marriage"))?.amount || 0,
            "vehicle_loan": breakdown.find(b => b.name?.toLowerCase().includes("vehicle"))?.amount || 0,
            "loss_of_pay": breakdown.find(b => b.name?.toLowerCase().includes("loss"))?.amount || 0,
            "advance_recovery": breakdown.find(b => b.name?.toLowerCase().includes("advance"))?.amount || 0,
            "recovery": breakdown.find(b => b.name?.toLowerCase() === "recovery")?.amount || 0,
          };
        });
      } else if (selectedFormat === "non_teaching_regular") {
        headers = [
          "employee_code", "employee_name", "scales", "basic", "da", "hra", "cca",
          "cps_pf_er", "er_ehs", "gpf_pf_subscription", "cps_pf_ee_er", "prof_tax",
          "gis", "vehicle_loan", "lic", "festival_marriage_advance", "ehs_share", "tds", "mobile_bill"
        ];
        templateRows = filteredEmployees.map(emp => {
          const p = latestPayslipsMap[emp._id] || {};
          const breakdown = p.recovery_dedu_breakdown || [];
          return {
            "employee_code": emp.employee_code,
            "employee_name": emp.full_name,
            "scales": emp.designation || "",
            "basic": p.basic || 0,
            "da": p.da_50 || 0,
            "hra": p.hra_10 || 0,
            "cca": p.cca || 0,
            "cps_pf_er": (p.custom_earnings || []).find(e => e.name === "ER CPS/PF")?.amount || 0,
            "er_ehs": (p.custom_earnings || []).find(e => e.name === "ER EHS")?.amount || 0,
            "gpf_pf_subscription": p.gpf || p.pf_sub || 0,
            "cps_pf_ee_er": p.cps || 0,
            "prof_tax": p.prof_tax || 0,
            "gis": p.gis || 0,
            "vehicle_loan": breakdown.find(b => b.name?.toLowerCase().includes("vehicle"))?.amount || 0,
            "lic": p.lic || 0,
            "festival_marriage_advance": breakdown.find(b => b.name?.toLowerCase().includes("festival") || b.name?.toLowerCase().includes("marriage"))?.amount || 0,
            "ehs_share": p.ehs || 0,
            "tds": p.income_tax || 0,
            "mobile_bill": p.ded_misc || 0,
          };
        });
      } else if (selectedFormat === "adhoc_teaching") {
        headers = [
          "employee_code", "employee_name", "qualification", "department", "leaves_remaining",
          "loss_of_pay_days", "monthly_pay", "loss_of_pay_amount", "festival_adv_recovery", "prof_tax"
        ];
        templateRows = filteredEmployees.map(emp => {
          const p = latestPayslipsMap[emp._id] || {};
          const breakdown = p.recovery_dedu_breakdown || [];
          return {
            "employee_code": emp.employee_code,
            "employee_name": emp.full_name,
            "qualification": emp.designation || "",
            "department": emp.department_id?.name || "",
            "leaves_remaining": 12,
            "loss_of_pay_days": 0,
            "monthly_pay": p.basic || 0,
            "loss_of_pay_amount": breakdown.find(b => b.name?.toLowerCase().includes("loss"))?.amount || 0,
            "festival_adv_recovery": breakdown.find(b => b.name?.toLowerCase().includes("festival"))?.amount || 0,
            "prof_tax": p.prof_tax || 0,
          };
        });
      } else if (selectedFormat === "adhoc_non_teaching") {
        headers = [
          "employee_code", "employee_name", "department", "leaves_remaining",
          "loss_of_pay_days", "monthly_pay", "loss_of_pay_amount", "festival_adv_recovery", "prof_tax"
        ];
        templateRows = filteredEmployees.map(emp => {
          const p = latestPayslipsMap[emp._id] || {};
          const breakdown = p.recovery_dedu_breakdown || [];
          return {
            "employee_code": emp.employee_code,
            "employee_name": emp.full_name,
            "department": emp.department_id?.name || "",
            "leaves_remaining": 12,
            "loss_of_pay_days": 0,
            "monthly_pay": p.basic || 0,
            "loss_of_pay_amount": breakdown.find(b => b.name?.toLowerCase().includes("loss"))?.amount || 0,
            "festival_adv_recovery": breakdown.find(b => b.name?.toLowerCase().includes("festival"))?.amount || 0,
            "prof_tax": p.prof_tax || 0,
          };
        });
      }

      if (templateRows.length === 0) {
        const blankRow = {};
        headers.forEach(h => {
          blankRow[h] = "";
        });
        templateRows.push(blankRow);
      }

      const ws = XLSX.utils.json_to_sheet(templateRows, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Salaries");
      XLSX.writeFile(wb, `AKNU_${selectedFormat}_Format_${year}_${MONTHS[Number(month) - 1]}.xlsx`);

      toast.success("Template downloaded!", { id: "template-gen" });
    } catch (err) {
      console.error(err);
      toast.error("Could not download template", { id: "template-gen" });
    }
  };

  // Upload excel spreadsheet
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsedData = XLSX.utils.sheet_to_json(ws);

        if (parsedData.length === 0) {
          toast.error("The spreadsheet is empty");
          return;
        }

        const targetMonth = Number(month);
        const targetYear = Number(year);

        let standardColumns = [
          "employee_code", "employee_name", "e.no.", "e no", "emp no", "emp. no.", "employee code", "employee name",
          "name", "s.no.", "s.no", "sl. no.", "sl no", "s no", "serial number", "Emp. No.", "Name of the Employee & Designation", "S No",
          "gross salary", "gross_salary", "total deductions", "total_deductions", "totoal deductions", "totoal_deductions", "net salary", "net_salary", "net pay", "gross earnings", "gross", "net", "deductions", "total", "totoal"
        ];
        if (selectedFormat === "teaching_regular") {
          standardColumns = [
            ...standardColumns,
            "course", "basic", "agp", "da", "d.a. 50%", "da 50%", "da 50", "hra", "h.r.a. 10%", "hra 10%", "hra 10",
            "conveyance_allowance", "conveyance", "other /php allow./cov ey allow.", "other php allow cov ey allow", "conveyance allowance",
            "honorarium", "arrears", "lic hon post arrears", "hon.post arrears", "i/c hon.post s arrears", "i/c hon.posts arrears", "hon.post s arrears", "recovery",
            "er_cps_10", "er cps 10%", "er_ehs", "er ehs", "tds", "income tax", "gpf_subscription", "gpf subscription", "pf subscription 9%", "pf subscription",
            "cps_share_20", "cps share ee & er 20%", "cps share 20%", "cps share 20", "lic", "gis", "mobile_bill", "mobile bill",
            "prof_tax", "prof. tax", "professional tax", "ehs_share", "ehs share", "ehs share (ee & er)",
            "marriage_loan", "marriage loan", "vehicle_loan", "vehicle loan", "loss_of_pay", "loss of pay",
            "advance_recovery", "advance recovery"
          ];
        } else if (selectedFormat === "non_teaching_regular") {
          standardColumns = [
            ...standardColumns,
            "scales", "basic", "da", "hra", "da 37.31%", "hra 16%", "cca", "c.c.a.", "leaves",
            "cps_pf_er", "cps 10% / pf subscription er", "cps 10%/pf subscription er", "er_ehs", "ehs er",
            "gpf_pf_subscription", "gpf subscription", "pf subscription", "gpf pf subscription", "gpf_subscription", "gpf",
            "cps_pf_ee_er", "cps 20% / pf subscription ee & er", "cps 20 / pf subscription ee & er", "cps pf ee er", "cps 20%/pf subscription ee", "cps 20% / pf subscription ee", "cps 20% pf subscription ee", "cps 20%/pf subscription ee & er",
            "prof_tax", "prof. tax", "professional tax", "gis", "group insurance", "group insurance / gis", "vehicle_loan", "vehicle loan", "vehicle loan installments", "lic",
            "festival_marriage_advance", "festival recovery / marriage adv.", "festival recovery/marriage adv.", "festival adv. recovery", "festival adv recovery", "festival recovery /", "festival adv. recovery /", "festival advance recovery", "festival marriage advance", "festival/marriage advance", "festival recovery / marriage adv.",
            "ehs_share", "ehs share", "ehs share ee & er both shares", "ehs ee & er", "ehs ee & er both", "ehs ee & er both shares", "ehs share ee & er both",
            "tds", "mobile_bill", "mobile bill", "mobile bill deductions", "mobile bill deduction"
          ];
        } else if (selectedFormat === "adhoc_teaching" || selectedFormat === "adhoc_non_teaching") {
          standardColumns = [
            ...standardColumns,
            "qualification", "department", "leaves_remaining", "leaves remaining",
            "loss_of_pay_days", "no. of days loss of pay for this month", "monthly_pay", "monthly pay", "monthly pay (rs.)",
            "remuneration per month", "remuneration", "remuneration pm", "remuneration p.m.", "name of the employee",
            "loss_of_pay_amount", "loss of pay", "loss of pay (rs.)", "deductions: loss of pay (rs.)",
            "festival_adv_recovery", "recovery of festival adv.", "recovery of festival adv", "prof_tax", "professional tax", "professional tax (rs.)",
            "gross to be paid", "gross_to_be_paid", "gross", "gross paid", "gross paid (rs.)", "gross_paid", "professiona 1 tax", "professiona l tax", "professiona1 tax", "festival adv.rec.", "festival advrec", "festival adv rec"
          ];
        }

        const validated = parsedData.map(row => {
          const cleanStr = (s) => String(s || '').toLowerCase().trim().replace(/_/g, ' ').replace(/[\.\(\):,\-\/]/g, '').replace(/\s+/g, ' ');
          const matchedKeys = new Set();
          const findVal = (variants) => {
            const cleanVariants = variants.map(v => cleanStr(v));
            for (const key of Object.keys(row)) {
              if (cleanVariants.includes(cleanStr(key))) {
                matchedKeys.add(key);
                return row[key];
              }
            }
            return undefined;
          };

          const findNumVal = (variants) => {
            const val = findVal(variants);
            if (val === undefined || val === null || val === '') return 0;
            const num = parseFloat(String(val).replace(/,/g, ''));
            return isNaN(num) ? 0 : Number(num.toFixed(2));
          };

          const rawCode = findVal(["employee code", "employee_code", "code", "empid", "emp no", "e no", "e.no."]);
          const code = String(rawCode || '').trim();
          const name = String(findVal([
            "employee name",
            "employee_name",
            "name",
            "name of the employee",
            "name of the employee designation",
            "name of the employee & designation",
            "name of the employee and designation"
          ]) || '').trim();

          const mappedRow = {
            employee_code: code,
            full_name: name,
          };

          // Initialize standard fields to 0
          EARN_FIELDS.forEach(f => { mappedRow[f] = 0; });
          DED_FIELDS.forEach(f => { mappedRow[f] = 0; });

          let recoveryDedu = 0;
          const breakdown = [];
          const customEarnings = [];
          const customDeductions = [];

          if (selectedFormat === "teaching_regular") {
            mappedRow.basic = findNumVal(["basic"]);
            mappedRow.agp = findNumVal(["agp"]);
            mappedRow.da_50 = findNumVal(["da", "d a", "da 50%", "da 50", "d.a. 50%"]);
            mappedRow.hra_10 = findNumVal(["hra", "h r a", "hra 10%", "hra 10", "h.r.a. 10%"]);
            mappedRow.con_allow = findNumVal(["conveyance allowance", "conveyance_allowance", "other /php allow./cov ey allow.", "other php allow cov ey allow", "conveyance"]);
            mappedRow.honorarium = findNumVal(["honorarium"]);
            mappedRow.da_arrears = findNumVal(["arrears", "lic hon post arrears", "hon.post arrears", "i/c hon.post s arrears", "i/c hon.posts arrears", "hon.post s arrears"]);

            const erCps = findNumVal(["er cps 10", "er cps 10%"]);
            if (erCps > 0) customEarnings.push({ name: "ER CPS 10%", amount: erCps });

            const erEhs = findNumVal(["er ehs"]);
            if (erEhs > 0) customEarnings.push({ name: "ER EHS", amount: erEhs });

            mappedRow.income_tax = findNumVal(["tds", "income tax"]);
            mappedRow.gpf = findNumVal(["gpf subscription", "gpf", "pf subscription 9%", "pf subscription"]);
            mappedRow.cps = findNumVal(["cps share 20", "cps share 20%", "cps share ee & er 20%"]);
            mappedRow.lic = findNumVal(["lic"]);
            mappedRow.gis = findNumVal(["gis"]);
            mappedRow.ded_misc = findNumVal(["mobile bill", "mobile_bill"]);
            mappedRow.prof_tax = findNumVal(["prof tax", "prof. tax", "professional tax"]);
            mappedRow.ehs = findNumVal(["ehs share", "ehs share both shares", "ehs share (ee & er)"]);

            // Recovery columns (marriage_loan, vehicle_loan, loss_of_pay, advance_recovery, recovery)
            const marriage = findNumVal(["marriage loan", "marriage_loan"]);
            const vehicle = findNumVal(["vehicle loan", "vehicle_loan"]);
            const lop = findNumVal(["loss of pay", "loss_of_pay"]);
            const advance = findNumVal(["advance recovery", "advance_recovery"]);
            const recovery = findNumVal(["recovery"]);

            recoveryDedu = marriage + vehicle + lop + advance + recovery;
            if (marriage > 0) breakdown.push({ name: "Marriage Loan", amount: marriage });
            if (vehicle > 0) breakdown.push({ name: "Vehicle Loan", amount: vehicle });
            if (lop > 0) breakdown.push({ name: "Loss of Pay", amount: lop });
            if (advance > 0) breakdown.push({ name: "Advance Recovery", amount: advance });
            if (recovery > 0) breakdown.push({ name: "Recovery", amount: recovery });

          } else if (selectedFormat === "non_teaching_regular") {
            mappedRow.basic = findNumVal(["basic"]);
            mappedRow.da_50 = findNumVal(["da", "d a", "da 37.31%", "da 37.31", "d.a. 37.31%"]);
            mappedRow.hra_10 = findNumVal(["hra", "h r a", "hra 16%", "hra 16", "h.r.a. 16%"]);
            mappedRow.cca = findNumVal(["cca", "c.c.a.", "cca"]);

            const erCps = findNumVal(["cps pf er", "cps 10%/pf subscription er", "cps 10% / pf subscription er", "cps 10% pf subscription er"]);
            if (erCps > 0) customEarnings.push({ name: "ER CPS/PF", amount: erCps });

            const erEhs = findNumVal(["ehs er", "er ehs", "ehs_er"]);
            if (erEhs > 0) customEarnings.push({ name: "ER EHS", amount: erEhs });

            mappedRow.gpf = findNumVal(["gpf subscription", "pf subscription", "gpf pf subscription", "gpf", "gpf/pf subscription"]);
            mappedRow.cps = findNumVal(["cps 20 / pf subscription ee & er", "cps pf ee er", "cps 20% / pf subscription ee & er", "cps 20%/pf subscription ee", "cps 20% / pf subscription ee", "cps 20% pf subscription ee", "cps 20%/pf subscription ee & er"]);
            mappedRow.prof_tax = findNumVal(["prof tax", "prof. tax", "professional tax"]);
            mappedRow.gis = findNumVal(["gis", "group insurance", "group insurance / gis"]);
            mappedRow.lic = findNumVal(["lic"]);
            mappedRow.ehs = findNumVal(["ehs share ee & er both shares", "ehs ee & er", "ehs share", "ehs ee & er both", "ehs ee & er both shares", "ehs share ee & er both"]);
            mappedRow.income_tax = findNumVal(["tds", "income tax"]);
            mappedRow.ded_misc = findNumVal(["mobile bill", "mobile bill deductions", "mobile bill deduction"]);

            const vehicle = findNumVal(["vehicle loan", "vehicle loan installments", "vehicle loan installments (135)", "vehicle loan installments"]);
            const festivalMarriage = findNumVal(["festival recovery/marriage adv.", "festival recovery marriage adv", "festival_marriage_advance", "festival recovery", "festival adv. recovery", "festival adv recovery", "festival recovery /", "festival adv. recovery /", "festival advance recovery", "festival marriage advance", "festival/marriage advance", "festival recovery / marriage adv."]);

            recoveryDedu = vehicle + festivalMarriage;
            if (vehicle > 0) breakdown.push({ name: "Vehicle Loan", amount: vehicle });
            if (festivalMarriage > 0) breakdown.push({ name: "Festival/Marriage Advance", amount: festivalMarriage });

          } else if (selectedFormat === "adhoc_teaching" || selectedFormat === "adhoc_non_teaching") {
            const remuneration = findNumVal(["monthly pay", "monthly pay (rs.)", "remuneration per month", "remuneration", "remuneration pm", "remuneration p.m."]);
            mappedRow.basic = remuneration;

            mappedRow.prof_tax = findNumVal(["professional tax", "professional tax (rs.)", "professiona 1 tax", "professiona l tax", "professiona1 tax"]);

            const lop = findNumVal(["loss of pay", "loss of pay (rs.)", "deductions: loss of pay (rs.)", "loss_of_pay_amount"]);
            const festival = findNumVal(["recovery of festival adv.", "recovery of festival adv", "festival_adv_recovery", "festival adv.rec.", "festival advrec", "festival adv rec", "recovery of festival adv. (6/10)", "recovery of festival adv 610", "recovery of festival adv (6/10)"]);

            recoveryDedu = lop + festival;
            if (lop > 0) breakdown.push({ name: "Loss of Pay", amount: lop });
            if (festival > 0) breakdown.push({ name: "Festival Advance Recovery", amount: festival });
          }

          mappedRow.recovery_dedu = recoveryDedu;
          mappedRow.recovery_dedu_breakdown = breakdown;

          // Parse extra columns as custom earnings / deductions
          Object.keys(row).forEach(key => {
            if (matchedKeys.has(key)) return;

            const cleanKey = cleanStr(key);

            // Skip any computed/summary/total/leaves/scales columns dynamically (including typos like "totoal")
            if (
              cleanKey.includes("total") ||
              cleanKey.includes("totoal") ||
              cleanKey.includes("gross") ||
              cleanKey.includes("net") ||
              cleanKey.includes("leaves") ||
              cleanKey.includes("leave") ||
              cleanKey.includes("scale") ||
              cleanKey.includes("scales")
            ) {
              return;
            }

            if (selectedFormat === "adhoc_teaching" || selectedFormat === "adhoc_non_teaching") {
              const skipKeywords = ["da", "hra", "cca", "cps", "gpf", "gis", "ehs", "pf", "lic", "basic"];
              if (skipKeywords.some(kw => cleanKey === kw || cleanKey.includes(kw))) {
                return;
              }
            }

            const isStandard = standardColumns.some(stdCol => cleanStr(stdCol) === cleanKey);
            if (isStandard) return;

            const val = Number(Number(row[key]).toFixed(2)) || 0;
            if (val <= 0) return;

            const keyLower = key.toLowerCase();
            if (keyLower.startsWith("earn:") || keyLower.startsWith("earn_")) {
              const cleanedName = key.substring(5).trim();
              customEarnings.push({ name: cleanedName, amount: val });
            } else if (keyLower.startsWith("ded:") || keyLower.startsWith("ded_")) {
              const cleanedName = key.substring(4).trim();
              customDeductions.push({ name: cleanedName, amount: val });
            } else {
              const hasEarnKeyword = ["allowance", "earning", "bonus", "pay", "da", "hra"].some(kw => keyLower.includes(kw));
              const hasDedKeyword = ["tax", "fee", "rent", "society", "fund", "recovery", "loan", "deduction", "epf", "esi", "lic", "pf", "gis", "ehs", "cps", "bill"].some(kw => keyLower.includes(kw));
              if (hasDedKeyword && !hasEarnKeyword) {
                customDeductions.push({ name: key.trim(), amount: val });
              } else {
                customEarnings.push({ name: key.trim(), amount: val });
              }
            }
          });

          mappedRow.custom_earnings = customEarnings;
          mappedRow.custom_deductions = customDeductions;

          return validateRowData(mappedRow);
        });

        // Check if there are any rows with incorrect category
        const incorrectCategoryRows = validated.filter(r => r._status === "error" && r._message.startsWith("Incorrect category"));
        if (incorrectCategoryRows.length > 0) {
          toast.error("Please upload the correct category payslips.");
          setUploadData([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }

        setUploadData(validated);
        toast.success(`Loaded ${validated.length} rows successfully`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to read file. Please ensure it is a valid Excel spreadsheet (.xlsx)");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Run Copy Salaries
  const handleExecuteCarryForward = async () => {
    try {
      setGenerating(true);
      setProgressVal(20);

      const payload = {
        month: Number(month),
        year: Number(year),
        type: 'clone',
        employeeIds: filteredEmployees.map(e => e._id)
      };

      setProgressVal(50);
      const { data } = await api.post("/payslips/bulk", payload);
      setProgressVal(85);

      setResults(data);
      setProgressVal(100);

      toast.success(`Successfully created ${data.successCount} payslips.`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to copy salaries");
    } finally {
      setGenerating(false);
    }
  };

  // Run Excel Import
  const handleExecuteImport = async () => {
    const readyRows = uploadData.filter(r => r._status === "ready");
    const duplicates = uploadData.filter(r => r._status === "duplicate");

    if (readyRows.length === 0) {
      toast.error("No valid rows ready to generate");
      return;
    }

    try {
      setGenerating(true);
      setProgressVal(20);

      const payload = {
        month: Number(month),
        year: Number(year),
        type: 'import',
        data: readyRows
      };

      setProgressVal(55);
      const { data } = await api.post("/payslips/bulk", payload);
      setProgressVal(90);

      data.skippedCount += duplicates.length;
      duplicates.forEach(d => {
        data.skippedEmployees.push({
          employee_code: d.employee_code,
          full_name: d.full_name || 'N/A',
          reason: 'Duplicate'
        });
      });

      setResults(data);
      setProgressVal(100);
      toast.success(`Successfully imported ${data.successCount} payslips.`);

      fetchData();
      setUploadData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Excel import failed");
    } finally {
      setGenerating(false);
    }
  };

  if (!isAccountant) return <div className="p-8 text-center text-muted-foreground">Access denied.</div>;

  return (
    <div className="space-y-6">

      {/* 1. Header (Flat) */}
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-accent">Payroll</p>
            <h1 className="font-display text-4xl text-primary mt-1">Bulk Payslips</h1>
            <p className="text-sm text-muted-foreground mt-2">Generate monthly salary records for all employees in a single batch.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/payslips">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Payslips
              </Link>
            </Button>
          </div>
        </div>
      )}

      {loadingData ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <p className="text-xs">Loading payroll directory...</p>
        </div>
      ) : generating ? (
        /* 2. LOADING STATE */
        <Card className="border shadow-sm bg-card">
          <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            <div>
              <p className="text-sm font-semibold text-primary">Generating Payslips...</p>
              <p className="text-xs text-muted-foreground mt-1">Calculating payroll. Please do not close this page.</p>
            </div>
            <div className="w-full max-w-xs space-y-1">
              <Progress value={progressVal} className="h-1.5 w-full" />
              <p className="text-[9px] font-mono text-muted-foreground text-right">{progressVal}% complete</p>
            </div>
          </CardContent>
        </Card>
      ) : results ? (
        /* 3. COMPLETION RESULTS SCREEN (Standard layout) */
        <div className="space-y-6 animate-in zoom-in-95 duration-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-card text-center shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Created</p>
              <p className="text-3xl font-bold text-primary mt-1">{results.successCount}</p>
            </div>
            <div className="border rounded-lg p-4 bg-card text-center shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Already Done</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{results.skippedCount}</p>
            </div>
            <div className="border rounded-lg p-4 bg-card text-center shadow-sm">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Needs Setup</p>
              <p className="text-3xl font-bold text-muted-foreground mt-1">{results.noHistoryCount || 0}</p>
            </div>
          </div>

          {/* List of Skipped Duplicates */}
          {results.skippedCount > 0 && (
            <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Already Had Payslips ({results.skippedCount})
              </h4>
              <div className="max-h-40 overflow-y-auto border rounded bg-background divide-y custom-scrollbar text-xs">
                {results.skippedEmployees.map((e, idx) => (
                  <div key={idx} className="flex justify-between p-2">
                    <span className="font-mono text-muted-foreground">{e.employee_code}</span>
                    <span className="font-medium text-foreground">{e.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of No History Skipped */}
          {results.noHistoryCount > 0 && (
            <div className="space-y-2 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Info className="h-4 w-4 text-primary" /> New Employees (Needs Manual Entry) ({results.noHistoryCount})
              </h4>
              <div className="max-h-40 overflow-y-auto border rounded bg-background divide-y custom-scrollbar text-xs">
                {results.noHistoryEmployees.map((e, idx) => (
                  <div key={idx} className="flex justify-between p-2">
                    <span className="font-mono text-muted-foreground">{e.employee_code}</span>
                    <span className="font-medium text-foreground">{e.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setResults(null)}>
              Generate For Another Month
            </Button>
            <Button size="sm" onClick={() => {
              if (isEmbedded && onViewList) {
                onViewList();
              } else {
                navigate("/payslips");
              }
              setTimeout(() => {
                setResults(null);
              }, 100);
            }}>
              View Payslips List
            </Button>
          </div>
        </div>
      ) : (
        /* 4. FLAT BATCH CONTROLS DIRECTLY ON PAGE */
        <Tabs defaultValue="carryforward" className="space-y-6">

          {/* Controls Bar - tabs above, selects below (Flat) */}
          <div className="space-y-4 pb-4 border-b border-muted/80">
            <TabsList className="bg-transparent border-b border-muted/80 rounded-none w-full justify-start h-auto p-0 gap-6">
              <TabsTrigger
                value="carryforward"
                className="rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-0 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-foreground transition-all text-sm -mb-[1px]"
              >
                Copy Last Month
              </TabsTrigger>
              <TabsTrigger
                value="excel"
                className="rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-0 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-foreground transition-all text-sm -mb-[1px]"
              >
                Excel Sheet Upload
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Salary Month</Label>
                <div className="w-40">
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Salary Year</Label>
                <div className="w-28">
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsList.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Staff Category Format</Label>
                <div className="w-56">
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching_regular">Regular Teaching Staff</SelectItem>
                      <SelectItem value="non_teaching_regular">Regular Non-Teaching Staff</SelectItem>
                      <SelectItem value="adhoc_teaching">Adhoc Teaching Staff</SelectItem>
                      <SelectItem value="adhoc_non_teaching">Adhoc Non-Teaching Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* METHOD 1: Copy Salaries */}
          <TabsContent value="carryforward" className="space-y-6 outline-none">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/20 border p-4 rounded-lg">
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-semibold text-primary">Copy Salary details from Last Month</h4>
                <p className="text-xs text-muted-foreground">This will clone salary figures from each employee's latest historic payslip.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-9 bg-background">
                  <Download className="h-4 w-4 mr-1.5 text-primary" /> Export Last Month Excel
                </Button>

                {/* Micro preview numbers */}
                <div className="flex gap-4 text-xs bg-background border p-2 rounded-lg shadow-sm h-9 items-center">
                  <div>
                    <span className="font-semibold text-success">{carryForwardPreview.toGenerate}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">Ready</span>
                  </div>
                  <div className="border-l pl-4">
                    <span className="font-semibold text-amber-600">{carryForwardPreview.duplicates}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">Skipped</span>
                  </div>
                  <div className="border-l pl-4">
                    <span className="font-semibold text-muted-foreground">{carryForwardPreview.noHistory}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">Needs Setup</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flat Employees List Table */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary">Preview Staff Status</h3>
              <div className="border rounded-lg bg-card overflow-hidden">
                <Table>
                  <TableHeader className="bg-primary/100">
                    <TableRow>
                      <TableHead className="w-12 py-2 text-center">
                        <Checkbox className="border border-white h-4 w-4 border-2"
                          checked={eligibleEmployees.length > 0 && eligibleEmployees.every(emp => selectedEmployeeIds.includes(emp._id))}
                          onCheckedChange={handleSelectAll}
                          disabled={eligibleEmployees.length === 0}
                        />
                      </TableHead>
                      <TableHead className="w-16 text-xs py-2">S.No.</TableHead>
                      <TableHead className="w-32 text-xs py-2">Employee ID</TableHead>
                      <TableHead className="text-xs py-2">Employee Name</TableHead>
                      <TableHead className="text-right text-xs py-2">Gross</TableHead>
                      <TableHead className="text-right text-xs py-2">Deductions</TableHead>
                      <TableHead className="text-right text-xs py-2">Net Salary</TableHead>
                      <TableHead className="text-right text-xs py-2">Status</TableHead>
                      <TableHead className="text-right text-xs py-2 w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmployees.map((emp, idx) => {
                      const alreadyExists = existingPayslipsMap[`${emp.employee_code}-${Number(month)}-${Number(year)}`];
                      const latest = latestPayslipsMap[emp._id];
                      const isEligible = !alreadyExists && latest;

                      let badgeVariant = "secondary";
                      let badgeText = "No previous history";

                      if (alreadyExists) {
                        badgeVariant = "warning";
                        badgeText = "Already Done (will skip)";
                      } else if (latest) {
                        badgeVariant = "success";
                        badgeText = `Ready (Copy ${MONTHS[latest.month - 1]} ${latest.year})`;
                      }

                      return (
                        <TableRow key={emp._id} className="hover:bg-muted/5">
                          <TableCell className="w-12 py-2 text-center">
                            <Checkbox
                              checked={selectedEmployeeIds.includes(emp._id)}
                              disabled={!isEligible}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEmployeeIds(prev => [...prev, emp._id]);
                                } else {
                                  setSelectedEmployeeIds(prev => prev.filter(id => id !== emp._id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-xs py-2">{(currentPage - 1) * PAGE_SIZE + idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs py-2">{emp.employee_code}</TableCell>
                          <TableCell className="font-medium text-xs py-2">{emp.full_name}</TableCell>
                          <TableCell className="text-right font-mono text-xs py-2">
                            {latest ? formatCurrency(latest.gross_salary) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs py-2">
                            {latest ? formatCurrency(latest.total_deductions) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs py-2">
                            {latest ? formatCurrency(latest.net_salary) : "—"}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Badge variant={badgeVariant} className="text-[10px] py-0.5 px-2 rounded-full font-medium">{badgeText}</Badge>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit amounts for this month"
                              onClick={() => navigate(`/payslips/new?employee=${emp._id}&month=${month}&year=${year}`)}
                            >
                              <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredEmployees.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-4 text-xs">No employees found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                  <div>
                    Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)} of {filteredEmployees.length} entries
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                    <div className="flex items-center px-2 font-medium">Page {currentPage} of {totalPages}</div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                onClick={handleExecuteCarryForward}
                disabled={carryForwardPreview.toGenerate === 0}
                size="sm"
              >
                <RefreshCw className="h-4.5 w-4.5 mr-1.5" /> Copy & Generate {carryForwardPreview.toGenerate} Payslips
              </Button>
            </div>
          </TabsContent>

          {/* METHOD 2: Excel Import */}
          <TabsContent value="excel" className="space-y-6 outline-none">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Step 1: Download */}
              <div className="border rounded-lg p-4 bg-muted/10 flex flex-col justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Step 1</span>
                  <h4 className="text-xs font-bold text-foreground">Download pre-filled format</h4>
                  <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                    Gets an Excel spreadsheet pre-filled with active staff codes and last salary amounts.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="mt-4">
                  <Download className="h-3.5 w-3.5 mr-1.5 text-primary" /> Download Format (.xlsx)
                </Button>
              </div>

              {/* Step 2: Upload */}
              <div className="border rounded-lg p-4 bg-muted/10 flex flex-col justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Step 2</span>
                  <h4 className="text-xs font-bold text-foreground">Upload filled sheet</h4>
                  <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                    Select your Excel spreadsheet file from your computer to run the generation.
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="mt-4 w-full text-xs text-muted-foreground file:mr-3 file:py-1 file:px-2.5 file:rounded file:border file:border-muted-foreground/20 file:text-[11px] file:font-semibold file:bg-background file:text-foreground hover:file:bg-muted/10 cursor-pointer"
                />
              </div>
            </div>

            {/* Upload Data Preview */}
            {uploadData.length > 0 && (
              <div className="space-y-4 border-t pt-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-foreground">
                    <FileCheck className="h-4 w-4 text-success" /> Uploaded Spreadsheet Preview ({uploadData.length} entries)
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setUploadData([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }} className="h-7 text-xs text-muted-foreground">
                    Clear Upload
                  </Button>
                </div>

                <div className="border rounded-lg bg-card overflow-hidden">
                  <Table>
                    <TableHeader className="bg-primary/100">
                      <TableRow>
                        <TableHead className="w-16 text-xs py-2">S.No.</TableHead>
                        <TableHead className="text-xs py-2 w-28">Employee ID</TableHead>
                        <TableHead className="text-xs py-2">Name</TableHead>
                        <TableHead className="text-xs py-2 text-right">Basic Pay</TableHead>
                        <TableHead className="text-xs py-2 text-right">Net Pay</TableHead>
                        <TableHead className="text-xs py-2 text-right">Status</TableHead>
                        <TableHead className="text-right text-xs py-2 w-20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadData.map((row, idx) => {
                        let badgeVariant = "secondary";
                        if (row._status === "ready") badgeVariant = "success";
                        if (row._status === "duplicate") badgeVariant = "warning";
                        if (row._status === "error") badgeVariant = "destructive";

                        return (
                          <TableRow key={idx} className="hover:bg-muted/5">
                            <TableCell className="text-xs py-2">{idx + 1}</TableCell>
                            <TableCell className="font-mono text-xs py-2">{row.employee_code || "—"}</TableCell>
                            <TableCell className="font-medium text-xs py-2 truncate max-w-[150px]">{row.full_name || "—"}</TableCell>
                            <TableCell className="text-right font-mono text-xs py-2">Rs. {Number(row.basic || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-mono text-xs py-2 font-semibold text-primary">Rs. {Number(calculateNetPay(row)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right py-2">
                              <Badge variant={badgeVariant} className="text-[10px] py-0.5 px-2 font-medium">{row._message}</Badge>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Edit amounts for this month"
                                onClick={() => {
                                  const dbEmp = (row.employee_code ? employeeMap[row.employee_code] : null) || (row.full_name ? employeeByNameMap[row.full_name.toLowerCase().trim()] : null);
                                  if (dbEmp) {
                                    navigate(`/payslips/new?employee=${dbEmp._id}&month=${month}&year=${year}`);
                                  } else {
                                    navigate(`/payslips/new?month=${month}&year=${year}`);
                                  }
                                }}
                              >
                                <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button
                    onClick={handleExecuteImport}
                    disabled={uploadData.filter(r => r._status === "ready").length === 0}
                    size="sm"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" /> Upload & Generate {uploadData.filter(r => r._status === "ready").length} Payslips
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
