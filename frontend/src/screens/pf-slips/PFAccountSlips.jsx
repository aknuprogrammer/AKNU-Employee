import { useState, useMemo } from "react";
import { useEmployeesList } from "../employees/hooks/useEmployees";
import { usePFAccountSlipsList, useUploadPFAccountSlip, useTogglePFAccountSlipStatus, useDeletePFAccountSlip, useBulkUploadPFAccountSlip } from "./hooks/usePFAccountSlips";
import { pfAccountSlipsService } from "./services/pfAccountSlipsService";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, FileText, Ban, CheckCircle, Trash2, Check, ChevronsUpDown, UploadCloud } from "lucide-react";
import { toast } from "sonner";

const FINANCIAL_YEARS = [
  "2029-30",
  "2028-29",
  "2027-28",
  "2026-27",
  "2025-26"
];

export default function PFAccountSlips() {
  const { isAccountant } = useAuth();
  const [q, setQ] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  
  // Upload form state
  const [employeeId, setEmployeeId] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [file, setFile] = useState(null);

  // Bulk upload form state
  const [bulkYear, setBulkYear] = useState("2025-26");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  // Queries & Mutations
  const { data: employees = [] } = useEmployeesList();
  const { data: pfSlipsList = [], isLoading } = usePFAccountSlipsList(isAccountant);
  const toggleMutation = useTogglePFAccountSlipStatus();
  const deleteMutation = useDeletePFAccountSlip();
  const uploadMutation = useUploadPFAccountSlip(() => {
    // Reset form and close dialog on success
    setEmployeeId("");
    setFile(null);
    setIsUploadOpen(false);
  });

  const bulkUploadMutation = useBulkUploadPFAccountSlip(
    (data) => {
      setBulkResult(data);
      setBulkFile(null);
      toast.success("ZIP file processed successfully!");
    },
    (error) => {
      toast.error(error.response?.data?.message || "Failed to process ZIP file");
    }
  );

  const activeEmployees = useMemo(() => {
    return [...employees]
      .filter(e => e.is_active)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [employees]);

  const selectedEmp = activeEmployees.find(e => e._id === employeeId || e.id === employeeId);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please upload a PDF file only.");
        e.target.value = null;
        setFile(null);
        return;
      }
      if (selectedFile.size > 500 * 1024) {
        toast.error("File size exceeds the 500KB limit.");
        e.target.value = null;
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) return toast.error("Please select an employee.");
    if (!financialYear) return toast.error("Please select a financial year.");
    if (!file) return toast.error("Please select a PDF file.");

    const formData = new FormData();
    formData.append("employee_id", employeeId);
    formData.append("financial_year", financialYear);
    formData.append("pdf", file);

    uploadMutation.mutate(formData);
  };

  const handleBulkFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
        toast.error("Please upload a ZIP file only.");
        e.target.value = null;
        setBulkFile(null);
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("ZIP file size exceeds the 50MB limit.");
        e.target.value = null;
        setBulkFile(null);
        return;
      }
      setBulkFile(selectedFile);
    }
  };

  const handleBulkSubmit = (e) => {
    e.preventDefault();
    if (!bulkYear) return toast.error("Please select a financial year.");
    if (!bulkFile) return toast.error("Please select a ZIP file.");

    const formData = new FormData();
    formData.append("financial_year", bulkYear);
    formData.append("zip", bulkFile);

    setBulkResult(null);
    bulkUploadMutation.mutate(formData);
  };

  const handleDownload = async (id, empCode, finYear) => {
    try {
      toast.loading("Downloading PDF...", { id: "pdf-dl" });
      const blob = await pfAccountSlipsService.downloadPFAccountSlipAdmin(id);
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `PF_Slip_${empCode}_${finYear.replace('/', '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started", { id: "pdf-dl" });
    } catch (err) {
      console.error(err);
      let message = "Failed to download PDF. File may not exist.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) message = parsed.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      toast.error(message, { id: "pdf-dl" });
    }
  };

  const handleToggleActive = (id, currentStatus) => {
    toggleMutation.mutate({ id, is_active: !currentStatus });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this PF Account Slip permanently?")) {
      deleteMutation.mutate(id);
    }
  };

  // Search filter
  const filteredPFSlipsList = useMemo(() => {
    if (!q) return pfSlipsList;
    const query = q.toLowerCase();
    return pfSlipsList.filter(item => {
      const emp = item.employee_id || {};
      return (
        (emp.full_name || "").toLowerCase().includes(query) ||
        (emp.employee_code || "").toLowerCase().includes(query) ||
        (item.financial_year || "").toLowerCase().includes(query)
      );
    });
  }, [pfSlipsList, q]);

  if (!isAccountant) return <div className="text-muted-foreground">Access restricted.</div>;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-accent">PF Documents</p>
            <h1 className="font-display text-4xl text-primary mt-1">PF Account Slips</h1>
            <p className="text-sm text-muted-foreground mt-2">Upload and manage annual Provident Fund (PF) Account Slips for university employees.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkOpen} onOpenChange={(open) => {
              setIsBulkOpen(open);
              if (!open) setBulkResult(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UploadCloud className="h-4 w-4 mr-2" /> Bulk Upload (ZIP)
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Upload PF Account Slips (ZIP)</DialogTitle>
                  <CardDescription>
                    Upload a ZIP file containing signed PDFs. Filenames inside must match employee codes (e.g. <code>EMP101.pdf</code>) or CFMS IDs / PAN numbers.
                  </CardDescription>
                </DialogHeader>

                {!bulkResult ? (
                  <form onSubmit={handleBulkSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                      <Label>Financial Year</Label>
                      <Select value={bulkYear} onValueChange={setBulkYear}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year..." />
                        </SelectTrigger>
                        <SelectContent>
                          {FINANCIAL_YEARS.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>ZIP Archive</Label>
                      <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors cursor-pointer relative">
                        <input
                          type="file"
                          accept=".zip"
                          required
                          onChange={handleBulkFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <UploadCloud className="w-10 h-10 text-muted-foreground/70" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {bulkFile ? bulkFile.name : "Select ZIP archive file"}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          ZIP file size limit is 50MB
                        </span>
                      </div>
                    </div>

                    <DialogFooter className="pt-4">
                      <Button type="submit" className="w-full" disabled={bulkUploadMutation.isPending}>
                        {bulkUploadMutation.isPending ? "Uploading & Processing..." : "Start Import"}
                      </Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 border rounded-lg bg-muted/20">
                        <div className="text-2xl font-bold">{bulkResult.summary.total}</div>
                        <div className="text-xs text-muted-foreground">Total Files</div>
                      </div>
                      <div className="p-3 border rounded-lg bg-success/10 text-success">
                        <div className="text-2xl font-bold">{bulkResult.summary.successCount}</div>
                        <div className="text-xs">Success</div>
                      </div>
                      <div className="p-3 border rounded-lg bg-destructive/10 text-destructive">
                        <div className="text-2xl font-bold">{bulkResult.summary.failCount}</div>
                        <div className="text-xs">Failed</div>
                      </div>
                    </div>

                    {bulkResult.failures && bulkResult.failures.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-destructive">Failed Matches ({bulkResult.failures.length})</Label>
                        <div className="border rounded-md max-h-48 overflow-y-auto p-2 bg-muted/10 divide-y divide-border text-xs">
                          {bulkResult.failures.map((fail, index) => (
                            <div key={index} className="py-1.5 flex justify-between gap-4">
                              <span className="font-mono text-muted-foreground truncate max-w-[200px]" title={fail.file}>
                                {fail.file}
                              </span>
                              <span className="text-destructive font-medium text-right flex-1">
                                {fail.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <DialogFooter className="pt-4">
                      <Button onClick={() => {
                        setBulkResult(null);
                        setIsBulkOpen(false);
                      }} className="w-full">
                        Done & Refresh
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Upload PF Slip
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload PF Account Slip</DialogTitle>
                  <CardDescription>
                    Upload an official PF account slip PDF file for an employee.
                  </CardDescription>
                </DialogHeader>
                <form onSubmit={handleUploadSubmit} className="space-y-4 py-2">
                  <div className="space-y-1.5 flex flex-col">
                    <Label>Employee</Label>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboboxOpen}
                          className="w-full justify-between font-normal bg-background px-3"
                        >
                          {employeeId && selectedEmp
                            ? `${selectedEmp.employee_code} - ${selectedEmp.full_name}`
                            : "Select employee..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder="Search employee..." />
                          <CommandList>
                            <CommandEmpty>No employee found.</CommandEmpty>
                            <CommandGroup>
                              {activeEmployees.map((e) => {
                                const id = e._id || e.id;
                                return (
                                  <CommandItem
                                    key={id}
                                    value={`${e.employee_code} ${e.full_name}`}
                                    onSelect={() => {
                                      setEmployeeId(id);
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${employeeId === id ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {e.employee_code} - {e.full_name}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Financial Year</Label>
                    <Select value={financialYear} onValueChange={setFinancialYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCIAL_YEARS.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>PDF Document</Label>
                    <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept=".pdf"
                        required
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-8 h-8 text-muted-foreground/70" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {file ? file.name : "Select PF Slip PDF"}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        Only PDF files allowed (Max 500KB)
                      </span>
                    </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
                      {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, employee code, or year..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="border rounded-lg bg-card overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/100">
              <TableRow>
                <TableHead className="w-16">S.No.</TableHead>
                <TableHead>Employee Id</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Financial Year</TableHead>
                <TableHead>Uploaded On</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading PF Account Slips database records...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredPFSlipsList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No PF Account Slips found.
                  </TableCell>
                </TableRow>
              )}
              {filteredPFSlipsList.map((item, idx) => {
                const emp = item.employee_id || {};
                const isActive = item.is_active !== false;
                return (
                  <TableRow key={item._id || item.id} className={!isActive ? "opacity-60 bg-muted/30" : ""}>
                    <TableCell className="text-xs font-medium">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{emp.employee_code || "—"}</TableCell>
                    <TableCell className="font-medium">{emp.full_name || "—"}</TableCell>
                    <TableCell>{item.financial_year}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        isActive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      }`}>
                        {isActive ? "Active" : "Disabled"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(item._id || item.id, emp.employee_code, item.financial_year)}
                            >
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Download/View PDF</p></TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(item._id || item.id, isActive)}
                            >
                              {isActive ? (
                                <Ban className="w-4 h-4 text-destructive" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-success" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isActive ? "Disable Document" : "Enable Document"}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item._id || item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Delete Document</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
