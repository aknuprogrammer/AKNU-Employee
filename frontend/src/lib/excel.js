import * as XLSX from "xlsx";

export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function downloadExcel(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

export function downloadEmployeeTemplate() {
  downloadExcel(
    [
      {
        employee_id: "AKNU001",
        full_name: "Sample Name",
        email: "sample@aknu.edu.in",
        designation: "Assistant Professor",
        department: "Academic - Sciences",
        category: "teaching",
        place_of_working: "Main Campus",
        pan_number: "ABCDE1234F",
        cfms_id: "CFMS1234",
        pran_number: "PRAN1234",
        aadhaar_number: "123456789012",
        joining_date: "2020-06-01",
      },
    ],
    "employee_import_template.xlsx",
  );
}
