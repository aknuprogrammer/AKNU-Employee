import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import aknuLogo from "../assets/aknu_logo.png";
import nannayaLogo from "../assets/nannaya_logo.png";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

export async function generatePayslipPDF(data, verifyBaseUrl) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Load images
  const imgAknu = await loadImg(aknuLogo);
  const imgNan = await loadImg(nannayaLogo);
  const verifyUrl = `${verifyBaseUrl}/verify/${encodeURIComponent(data.payslip_number)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0 });

  // 1. Header Section
  // AKNU Logo
  doc.addImage(imgAknu, "PNG", 15, 12, 20, 20);

  // Nannaya Logo (placed right of the title, closer)
  // doc.addImage(imgNan, "PNG", 130, 12, 20, 20);

  // QR Code (Top Right)
  doc.addImage(qrDataUrl, "PNG", W - 30, 12, 18, 18);
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text("Scan to verify", W - 21, 33, { align: "center" });

  // Title
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ADIKAVI NANNAYA UNIVERSITY", 40, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Accredited by NAAC with 'B+' Grade, ISO 9001:2025 Certified", 40, 24);
  const subtitle = data.is_consolidated 
    ? `Consolidated Payslip: ${MONTHS[data.month - 1]} ${data.year} to ${MONTHS[data.endMonth - 1]} ${data.endYear}`
    : `Payslip For the Month: ${MONTHS[data.month - 1]} ${data.year}`;
  doc.text(subtitle, 40, 29);

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(15, 38, W - 15, 38);

  // 2. Employee Summary & Net Pay Box
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("EMPLOYEE SUMMARY", 15, 45);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);

  const emp = data.employee;
  const startY = 50;
  const lh = 6; // line height

  // Left Column
  let currentY = startY;
  doc.text("Employee Name", 15, currentY);
  doc.text(`:   ${emp.full_name}`, 45, currentY);
  currentY += lh;

  if (emp.employee_code && emp.employee_code.trim() !== '') {
    doc.text("Employee ID", 15, currentY);
    doc.text(`:   ${emp.employee_code}`, 45, currentY);
    currentY += lh;
  }

  doc.text("CFMS ID", 15, currentY);
  doc.text(`:   ${emp.cfms_id || "—"}`, 45, currentY);
  currentY += lh;

  doc.text("Pay Period", 15, currentY);
  doc.text(`:   ${MONTHS[data.month - 1]} ${data.year}`, 45, currentY);
  currentY += lh;

  // doc.text("Pay Date", 15, currentY);
  // doc.text(`:   ${new Date(data.createdAt).toLocaleDateString("en-IN")}`, 45, currentY);

  // Right Column (Net Pay Box)
  const boxX = W / 2 + 10;
  const boxY = 43;
  const boxW = 80;
  const boxH = 26;
  doc.setFillColor(238, 248, 241); // Light green
  doc.setDrawColor(200, 220, 200);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "FD");

  // Green accent line
  doc.setFillColor(76, 175, 80);
  doc.rect(boxX + 4, boxY + 5, 1.5, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(`Rs. ${fmt(data.net_salary)}`, boxX + 8, boxY + 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Total Net Pay", boxX + 8, boxY + 19);

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 78, W - 15, 78);

  // 3. Additional Details
  doc.setTextColor(50, 50, 50);
  doc.text("Designation", 15, 83);
  doc.text(`:   ${emp.designation || "—"}`, 45, 83);
  doc.text("Category", 15, 88);
  doc.text(`:   ${emp.category_name || "—"}`, 45, 88);
  doc.text("Aadhaar", 15, 93);
  doc.text(`:   ${emp.aadhaar_number ? `XXXX-XXXX-${emp.aadhaar_number.slice(-4)}` : "—"}`, 45, 93);

  doc.text("Department", W / 2 + 10, 83);
  doc.text(`:   ${emp.department_name || "—"}`, W / 2 + 40, 83);
  doc.text("PAN", W / 2 + 10, 88);
  doc.text(`:   ${emp.pan_number || "—"}`, W / 2 + 40, 88);
  doc.text("PRAN", W / 2 + 10, 93);
  doc.text(`:   ${emp.pran_number || "—"}`, W / 2 + 40, 93);

  // 4. Table Rendering
  if (data.is_consolidated) {
    const tblBody = [];
    (data.payslips || []).forEach((p, idx) => {
      tblBody.push([
        String(idx + 1),
        `${MONTHS[p.month - 1]} ${p.year}`,
        `Rs. ${fmt(p.gross_salary)}`,
        `Rs. ${fmt(p.total_deductions)}`,
        `Rs. ${fmt(p.net_salary)}`
      ]);
    });

    // Grand Total Row
    tblBody.push([
      "",
      { content: "GRAND TOTAL", styles: { fontStyle: "bold" } },
      { content: `Rs. ${fmt(data.totals?.gross_salary || 0)}`, styles: { fontStyle: "bold", halign: "right" } },
      { content: `Rs. ${fmt(data.totals?.total_deductions || 0)}`, styles: { fontStyle: "bold", halign: "right" } },
      { content: `Rs. ${fmt(data.totals?.net_salary || 0)}`, styles: { fontStyle: "bold", halign: "right" } }
    ]);

    autoTable(doc, {
      startY: 104,
      margin: { left: 14, right: 14 },
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 1.5, textColor: [40, 40, 40] },
      headStyles: { fontStyle: "bold", textColor: [20, 20, 20], fillColor: [250, 250, 250] },
      head: [["S.No", "MONTH & YEAR", { content: "GROSS EARNINGS", styles: { halign: "right" } }, { content: "TOTAL DEDUCTIONS", styles: { halign: "right" } }, { content: "NET PAYABLE", styles: { halign: "right" } }]],
      body: tblBody,
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: 47 },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 40, halign: "right" },
        4: { cellWidth: 40, halign: "right" },
      },
    });
  } else {
    // 4. Earnings and Deductions Table
    const EARN_MAPPING = [
      ["Basic", "basic"], ["AGP", "agp"], ["FP. Inc", "fp_inc"], ["D.A", "da_50"],
      ["Pers. Pay", "pers_pay"], ["Adv. Incr.", "adv_incr"], ["C.C.A", "cca"],
      ["H.R.A", "hra_10"], ["Misc.", "earn_misc"], ["Honorarium", "honorarium"],
      ["DA Arrears", "da_arrears"], ["Con. Allow", "con_allow"], ["Spl. Allow", "spl_allow"]
    ];

    const DED_MAPPING = [
      ["Income Tax", "income_tax"], ["P.F. Sub.", "pf_sub"], ["P.F. Loan", "pf_loan"],
      ["L.I.C.", "lic"], ["LIC Hs. Loan", "lic_hs_loan"], ["Prof Tax", "prof_tax"],
      ["EHS", "ehs"], ["CPS", "cps"], ["GPF", "gpf"], ["GIS", "gis"],
      ["CM Relief Fund", "cm_relief_fund"], ["Welfare Fund", "welfare_fund"],
      ["AKNU Corpus", "aknu_corpus"], ["University Club", "university_club"],
      ["Teachers Mutual Aided Cooperative Society", "tmacs"], ["Miscellaneous", "ded_misc"],
      ["EPF", "epf"], ["ESI", "esi"]
    ];

    const activeEarnings = [];
    EARN_MAPPING.forEach(([label, key]) => {
      const val = Number(data.earnings?.[key]) || 0;
      if (val > 0) {
        activeEarnings.push([label, `Rs. ${fmt(val)}`]);
      }
    });

    // Add custom earnings
    if (data.custom_earnings && data.custom_earnings.length > 0) {
      data.custom_earnings.forEach(item => {
        const val = Number(item.amount) || 0;
        if (val > 0) {
          activeEarnings.push([item.name || "Custom Earn", `Rs. ${fmt(val)}`]);
        }
      });
    }

    const activeDeductions = [];
    DED_MAPPING.forEach(([label, key]) => {
      const val = Number(data.deductions?.[key]) || 0;
      if (val > 0) {
        activeDeductions.push([label, `Rs. ${fmt(val)}`]);
      }
    });

    // Add custom deductions
    if (data.custom_deductions && data.custom_deductions.length > 0) {
      data.custom_deductions.forEach(item => {
        const val = Number(item.amount) || 0;
        if (val > 0) {
          activeDeductions.push([item.name || "Custom Ded", `Rs. ${fmt(val)}`]);
        }
      });
    }

    // Include custom recovery deductions
    if (data.recovery_dedu_breakdown && data.recovery_dedu_breakdown.length > 0) {
      data.recovery_dedu_breakdown.forEach(item => {
        const val = Number(item.amount) || 0;
        if (val > 0) {
          activeDeductions.push([item.name || "Recovery Dedu", `Rs. ${fmt(val)}`]);
        }
      });
    } else {
      const val = Number(data.recovery_dedu) || 0;
      if (val > 0) {
        activeDeductions.push(["Recovery Dedu", `Rs. ${fmt(val)}`]);
      }
    }

    const maxRows = Math.max(activeEarnings.length, activeDeductions.length);
    const tblBody = [];
    for (let i = 0; i < maxRows; i++) {
      const eName = activeEarnings[i] ? activeEarnings[i][0] : "";
      const eVal = activeEarnings[i] ? activeEarnings[i][1] : "";
      const dName = activeDeductions[i] ? activeDeductions[i][0] : "";
      const dVal = activeDeductions[i] ? activeDeductions[i][1] : "";
      tblBody.push([eName, eVal, dName, dVal]);
    }

    // Push gross and total deductions to body
    tblBody.push([
      { content: "Gross Earnings", styles: { fontStyle: "bold" } },
      { content: `Rs. ${fmt(data.gross_salary)}`, styles: { fontStyle: "bold" } },
      { content: "Total Deductions", styles: { fontStyle: "bold" } },
      { content: `Rs. ${fmt(data.total_deductions)}`, styles: { fontStyle: "bold" } }
    ]);

    autoTable(doc, {
      startY: 104,
      margin: { left: 14, right: 14 },
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 1.5, textColor: [40, 40, 40] },
      headStyles: { fontStyle: "bold", textColor: [20, 20, 20], fillColor: [250, 250, 250] },
      head: [["EARNINGS", { content: "AMOUNT", styles: { halign: "right" } }, "DEDUCTIONS", { content: "AMOUNT", styles: { halign: "right" } }]],
      body: tblBody,
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 41, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 50 },
        3: { cellWidth: 41, halign: "right", fontStyle: "bold" },
      },
    });
  }

  const tableStartY = 104;
  const afterTbl = doc.lastAutoTable.finalY;

  // Add border around the table
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, tableStartY, W - 28, afterTbl - tableStartY, 2, 2);

  const afterTblBox = afterTbl + 6;

  // 5. Final Net Payable Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(15, afterTblBox, W - 30, 15, 2, 2, "FD");

  // Highlight block for amount
  doc.setFillColor(238, 248, 241);
  doc.roundedRect(W - 45, afterTblBox, 30, 15, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("TOTAL NET PAYABLE", 20, afterTblBox + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Gross Earnings - Total Deductions", 20, afterTblBox + 11);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(`Rs. ${fmt(data.net_salary)}`, W - 30, afterTblBox + 9, { align: "center" });

  // 6. Footer (placed strictly at the bottom)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);

  // The standard A4 height is 297mm. Set footer to ~10mm from bottom.
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.text("-- This is a system-generated document. --", W / 2, pageHeight - 12, { align: "center" });

  if (data.returnBlobUrl) {
    return doc.output('bloburl');
  }

  doc.save(`AKNU-Payslip-${MONTHS[data.month - 1]}-${data.year}.pdf`);
}

export function mapPayslipDataForPDF(data) {
  const emp = data.employee_id || {};

  if (data.is_consolidated) {
    return {
      payslip_number: data.payslip_number,
      month: data.month,
      year: data.year,
      endMonth: data.endMonth,
      endYear: data.endYear,
      is_consolidated: true,
      createdAt: data.createdAt,
      returnBlobUrl: true,
      employee: {
        employee_code: emp.employee_code,
        full_name: emp.full_name,
        designation: emp.designation,
        department_name: emp.department_id?.name ?? null,
        category_name: emp.category?.name ?? null,
        aadhaar_number: emp.aadhaar_number,
        place_of_working: emp.place_of_working,
        pan_number: emp.pan_number,
        cfms_id: emp.cfms_id,
        pran_number: emp.pran_number,
      },
      payslips: data.payslips || [],
      totals: data.totals || { gross_salary: 0, total_deductions: 0, net_salary: 0 },
      net_salary: Number(data.net_salary || (data.totals?.net_salary || 0))
    };
  }

  const EARN_MAP = {
    basic: "Basic",
    agp: "AGP",
    fp_inc: "FP. Inc",
    da_50: "D.A",
    pers_pay: "Pers. Pay",
    adv_incr: "Adv. Incr.",
    cca: "C.C.A",
    hra_10: "H.R.A",
    earn_misc: "Misc.",
    honorarium: "Honorarium",
    da_arrears: "DA Arrears",
    con_allow: "Con. Allow",
    spl_allow: "Spl. Allow",
  };

  const DED_MAP = {
    income_tax: "Income Tax",
    pf_sub: "P.F. Sub.",
    pf_loan: "P.F. Loan",
    lic: "L.I.C.",
    lic_hs_loan: "LIC Hs. Loan",
    prof_tax: "Prof Tax",
    ehs: "EHS",
    cps: "CPS",
    gpf: "GPF",
    gis: "GIS",
    cm_relief_fund: "CM Relief Fund",
    welfare_fund: "Welfare Fund",
    aknu_corpus: "AKNU Corpus",
    university_club: "University Club",
    tmacs: "Teachers Mutual Aided Cooperative Society",
    ded_misc: "Miscellaneous",
    epf: "EPF",
    esi: "ESI",
  };

  return {
    payslip_number: data.payslip_number,
    month: data.month,
    year: data.year,
    endMonth: data.endMonth,
    endYear: data.endYear,
    is_consolidated: data.is_consolidated,
    createdAt: data.createdAt,
    returnBlobUrl: true,
    employee: {
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      designation: emp.designation,
      department_name: emp.department_id?.name ?? null,
      category_name: emp.category?.name ?? null,
      aadhaar_number: emp.aadhaar_number,
      place_of_working: emp.place_of_working,
      pan_number: emp.pan_number,
      cfms_id: emp.cfms_id,
      pran_number: emp.pran_number,
    },
    earnings: Object.fromEntries(Object.keys(EARN_MAP).map(k => [k, Number(data[k]) || 0])),
    deductions: Object.fromEntries(Object.keys(DED_MAP).map(k => [k, Number(data[k]) || 0])),
    custom_earnings: data.custom_earnings || [],
    custom_deductions: data.custom_deductions || [],
    recovery_dedu_breakdown: data.recovery_dedu_breakdown || [],
    recovery_dedu: Number(data.recovery_dedu) || 0,
    gross_salary: Number(data.gross_salary),
    total_deductions: Number(data.total_deductions),
    net_salary: Number(data.net_salary),
  };
}

