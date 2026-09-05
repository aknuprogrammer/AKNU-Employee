import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmployeeDetails({ employee }) {
  if (!employee) return null;

  const DetailRow = ({ label, value }) => (
    <div className="py-2 border-b last:border-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="font-display">Employee Details</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2">
        <DetailRow label="Employee ID" value={employee.employee_code} />
        <DetailRow label="Full Name" value={employee.full_name} />
        <DetailRow label="Email" value={employee.email} />
        <DetailRow label="Designation" value={employee.designation} />
        <DetailRow label="Department" value={employee.department_id?.name} />
        <DetailRow label="Category" value={employee.category?.name} />
        <DetailRow label="Place of Working" value={employee.place_of_working} />
        <DetailRow label="PAN Number" value={employee.pan_number} />
        <DetailRow label="CFMS ID" value={employee.cfms_id} />
        <DetailRow label="PRAN Number" value={employee.pran_number} />
        <DetailRow label="Aadhaar Number" value={employee.aadhaar_number} />
        <DetailRow 
          label="Joining Date" 
          value={employee.joining_date ? new Date(employee.joining_date).toLocaleDateString("en-GB") : null} 
        />
        <DetailRow label="Status" value={employee.is_active ? "Active" : "Disabled"} />
      </div>
    </DialogContent>
  );
}
