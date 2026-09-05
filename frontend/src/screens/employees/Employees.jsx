import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useEmployeesList, useDepartments, useCategories, useToggleEmployeeStatus, useBulkImportEmployees } from "./hooks/useEmployees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Upload, Download, Ban, CheckCircle, Eye, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { parseExcel, downloadEmployeeTemplate } from "@/lib/excel";
import EmployeeForm from "./components/EmployeeForm";
import EmployeeDetails from "./components/EmployeeDetails";

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;

  if (typeof val === "number" || /^\d{5}(\.\d+)?$/.test(String(val))) {
    const serial = Number(val);
    const utcMs = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    return new Date(y, m, day);
  }

  const str = String(val).trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [_, y, m, d] = ymdMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

function formatDateToYYYYMMDD(date) {
  if (!date || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}



export default function EmployeesPage() {
  const { isAccountant, isEmployee, user } = useAuth();
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [openNew, setOpenNew] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("teaching_regular");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const { data: depts } = useDepartments();
  const { data: cats } = useCategories();
  const { data: employees, isLoading } = useEmployeesList();
  const toggleMutation = useToggleEmployeeStatus();
  const bulkImportMutation = useBulkImportEmployees();

  const filtered = (employees ?? []).filter((e) => {
    // 1. Filter by Category
    const catName = (e.category?.name || "").toLowerCase();
    const code = (e.employee_code || "").trim();
    
    if (filterCategory !== "all") {
      if (filterCategory === "teaching_regular") {
        const isMatch = (catName === "teaching regular" || catName === "regular teaching") || (catName === "teaching" && code.startsWith("TS"));
        if (!isMatch) return false;
      } else if (filterCategory === "non_teaching_regular") {
        const isMatch = (catName === "non-teaching regular" || catName === "non teaching regular" || catName === "regular non-teaching" || catName === "regular non teaching") || ((catName === "non teaching" || catName === "non-teaching") && code.startsWith("NTS"));
        if (!isMatch) return false;
      } else if (filterCategory === "adhoc_teaching") {
        const isMatch = (catName === "adhoc teaching" || catName === "teaching adhoc") || (catName === "teaching" && !code.startsWith("TS") && !code.startsWith("NTS"));
        if (!isMatch) return false;
      } else if (filterCategory === "adhoc_non_teaching") {
        const isMatch = (catName === "adhoc non-teaching" || catName === "adhoc non teaching" || catName === "non-teaching adhoc" || catName === "non teaching adhoc") || ((catName === "non teaching" || catName === "non-teaching") && !code.startsWith("TS") && !code.startsWith("NTS"));
        if (!isMatch) return false;
      }
    }

    // 2. Filter by search query
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (e.employee_code || "").toLowerCase().includes(s) ||
      (e.full_name || "").toLowerCase().includes(s) ||
      (e.designation || "").toLowerCase().includes(s)
    );
  }).sort((a, b) => {
    if (a.is_active === b.is_active) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return a.is_active ? -1 : 1;
  });

  useEffect(() => {
    setPage(1);
  }, [q, filterCategory]);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedEmployees = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleActive = (id, current) => {
    toggleMutation.mutate({ id, is_active: !current });
  };

  const onBulkImport = async (e) => {
    e.preventDefault();
    const file = e.target.elements?.file?.files?.[0];
    if (!file) return toast.error("Please select a file");
      try {
        const rows = await parseExcel(file);
        const payload = [];

        let catText = "Teaching Regular";
        if (selectedCategory === "non_teaching_regular") catText = "Non-Teaching Regular";
        else if (selectedCategory === "adhoc_teaching") catText = "Adhoc Teaching";
        else if (selectedCategory === "adhoc_non_teaching") catText = "Adhoc Non-Teaching";

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const empCode = String(r.employee_id ?? r.employee_code ?? "").trim();
          const fullName = String(r.full_name ?? "").trim();
          const email = String(r.email ?? "").trim() || null;
          let pan = String(r.pan_number ?? "").trim() || null;
          const cfms = String(r.cfms_id ?? "").trim() || null;
          const pran = String(r.pran_number ?? "").trim() || null;
          const aadhaar = String(r.aadhaar_number ?? "").trim() || null;

          // Skip completely empty rows
          if (!fullName && !email) continue;

          const rowNum = i + 2; // Excel row (header is 1)

          if (!fullName || !aadhaar) {
            return toast.error(`Row ${rowNum}: Full Name and Aadhaar are mandatory.`);
          }
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return toast.error(`Row ${rowNum}: Invalid email format. Sample: name@example.com`);
          }
          if (!/^\d{12}$/.test(aadhaar)) {
            return toast.error(`Row ${rowNum}: Invalid Aadhaar format. It must be exactly 12 numeric digits.`);
          }
          if (pan) {
            pan = pan.toUpperCase();
          }

          payload.push({
            employee_code: empCode || "",
            full_name: fullName,
            email,
            designation: String(r.designation ?? ""),
            department_text: String(r.department ?? ""),
            category_text: catText,
            place_of_working: String(r.place_of_working ?? "") || null,
            pan_number: pan,
            cfms_id: cfms,
            pran_number: pran,
            aadhaar_number: aadhaar,
            joining_date: r.joining_date ? formatDateToYYYYMMDD(parseExcelDate(r.joining_date)) : null,
          });
        }

        if (!payload.length) return toast.error("No valid rows found in file");
      bulkImportMutation.mutate(payload, {
        onSuccess: () => setBulkModalOpen(false)
      });
    } catch (err) {
      toast.error("Failed to parse file");
      console.error(err);
    }
  };

  if (!isAccountant) return <div className="text-muted-foreground">Access restricted.</div>;

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Records</p>
          <h1 className="font-display text-4xl text-primary mt-1">Employees</h1>
          <p className="text-sm text-muted-foreground mt-2">Manage the university employee directory, add new staff, and import bulk records.</p>
          {isEmployee && (
            <h2 className="text-lg font-medium mt-2">
              {user?.employee_id?.section_id?.name || "Your Section"}
            </h2>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={downloadEmployeeTemplate} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkModalOpen(true)} className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" /> Bulk Import
          </Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Add Employee
              </Button>
            </DialogTrigger>
            <EmployeeForm
              depts={depts ?? []}
              cats={cats ?? []}
              onDone={() => setOpenNew(false)}
            />
          </Dialog>

          <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import Employees</DialogTitle>
              </DialogHeader>
              <form onSubmit={onBulkImport} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Staff Category Format</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                <div className="space-y-2">
                  <Label>Select Excel or CSV File</Label>
                  <Input type="file" name="file" accept=".xlsx,.xls,.csv" required />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setBulkModalOpen(false)} disabled={bulkImportMutation.isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={bulkImportMutation.isPending}>
                    {bulkImportMutation.isPending ? "Importing..." : "Import"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingEmployee} onOpenChange={(v) => !v && setEditingEmployee(null)}>
            <EmployeeForm
              depts={depts ?? []}
              cats={cats ?? []}
              initialData={editingEmployee}
              onDone={() => setEditingEmployee(null)}
            />
          </Dialog>

          <Dialog open={!!viewingEmployee} onOpenChange={(v) => !v && setViewingEmployee(null)}>
            <EmployeeDetails employee={viewingEmployee} />
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-56">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="teaching_regular">Regular Teaching Staff</SelectItem>
              <SelectItem value="non_teaching_regular">Regular Non-Teaching Staff</SelectItem>
              <SelectItem value="adhoc_teaching">Adhoc Teaching Staff</SelectItem>
              <SelectItem value="adhoc_non_teaching">Adhoc Non-Teaching Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary/100">
            <TableRow>
              <TableHead className="w-16">S.No.</TableHead>
              <TableHead>Employee Id</TableHead>
              <TableHead>Employee Name</TableHead>
              <TableHead>Designation</TableHead>
              {!isEmployee && <TableHead>Department</TableHead>}
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Place of Working</TableHead>
              <TableHead className="text-center">Joining Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && paginatedEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No employees yet.
                </TableCell>
              </TableRow>
            )}
            {paginatedEmployees.map((e, idx) => (
              <TableRow key={e._id || e.id} className={!e.is_active ? "opacity-60 bg-muted/30" : ""}>
                <TableCell className="text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                <TableCell className="font-medium">{e.full_name}</TableCell>
                <TableCell>{e.designation || "—"}</TableCell>
                {!isEmployee && <TableCell>{e.department_id?.name ?? "—"}</TableCell>}
                <TableCell>
                  <Badge variant="secondary">{e.category?.name ?? "—"}</Badge>
                </TableCell>
                <TableCell className="text-center">{e.place_of_working || "—"}</TableCell>
                <TableCell className="text-center">
                  {e.joining_date ? new Date(e.joining_date).toLocaleDateString("en-GB") : "—"}
                </TableCell>
                <TableCell className="text-center">
                  {e.is_active ? (
                    <Badge className="bg-success text-success-foreground">Active</Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingEmployee(e)}
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>View details</p></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingEmployee(e)}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Edit employee</p></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(e._id || e.id, e.is_active)}
                        >
                          {e.is_active ? (
                            <Ban className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{e.is_active ? "Disable employee" : "Enable employee"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
          <div>
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <div className="flex items-center px-2 font-medium">Page {page} of {totalPages}</div>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
