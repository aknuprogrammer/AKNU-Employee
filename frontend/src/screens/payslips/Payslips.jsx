import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { Plus, FileText, Edit, Ban, CheckCircle, Search, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTogglePayslipStatus } from "./hooks/usePayslips";
import { generatePayslipPDF, mapPayslipDataForPDF } from "@/lib/payslip-pdf";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BulkPayslips from "./BulkPayslips";



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

const YEARS = ["2030", "2029", "2028", "2027", "2026", "2025"];

export default function PayslipsPage() {
  const { isAccountant, user } = useAuth();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [activeTab, setActiveTab] = useState("individual");
  const qc = useQueryClient();
  const toggleMutation = useTogglePayslipStatus();

  const { data: payslips, isLoading } = useQuery({
    queryKey: ["payslips"],
    queryFn: async () => {
      const { data } = await api.get("/payslips");
      return data ?? [];
    },
    enabled: isAccountant,
  });

  const toggleActive = (id, current) => {
    toggleMutation.mutate({ id, is_active: !current });
  };

  const handleViewPdf = async (id) => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-gen" });
      const { data } = await api.get(`/payslips/${id}`);
      const mappedData = mapPayslipDataForPDF(data);
      const blobUrl = await generatePayslipPDF(mappedData, window.location.origin);

      // Force explicit download with correct filename
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `AKNU-Payslip-${MONTHS[mappedData.month - 1]}-${mappedData.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.open(blobUrl, "_blank");
      toast.success("PDF opened", { id: "pdf-gen" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF", { id: "pdf-gen" });
    }
  };

  if (!isAccountant) return <div className="text-muted-foreground">Access restricted.</div>;

  const filteredPayslips = (payslips ?? []).filter((p) => {
    const emp = p.employee_id;

    if (filterCategory !== "all") {
      const catName = (emp?.category?.name || "").toLowerCase().trim();
      const code = (emp?.employee_code || "").trim();

      if (filterCategory === "teaching_regular") {
        const match = catName === "teaching regular" || catName === "regular teaching" || (catName === "teaching" && code.startsWith("TS"));
        if (!match) return false;
      } else if (filterCategory === "non_teaching_regular") {
        const match = catName === "non-teaching regular" || catName === "non teaching regular" || catName === "regular non-teaching" || catName === "regular non teaching" || ((catName === "non teaching" || catName === "non-teaching") && code.startsWith("NTS"));
        if (!match) return false;
      } else if (filterCategory === "adhoc_teaching") {
        const match = catName === "adhoc teaching" || catName === "teaching adhoc" || (catName === "teaching" && !code.startsWith("TS") && !code.startsWith("NTS"));
        if (!match) return false;
      } else if (filterCategory === "adhoc_non_teaching") {
        const match = catName === "adhoc non-teaching" || catName === "adhoc non teaching" || catName === "non-teaching adhoc" || catName === "non teaching adhoc" || ((catName === "non teaching" || catName === "non-teaching") && !code.startsWith("TS") && !code.startsWith("NTS"));
        if (!match) return false;
      }
    }

    if (filterMonth !== "all") {
      if (Number(p.month) !== Number(filterMonth)) return false;
    }

    if (filterYear !== "all") {
      if (Number(p.year) !== Number(filterYear)) return false;
    }

    if (!q) return true;
    const s = q.toLowerCase();
    const monthName = MONTHS[p.month - 1] || "";
    return (
      (p.payslip_number || "").toLowerCase().includes(s) ||
      (emp?.full_name || "").toLowerCase().includes(s) ||
      (emp?.employee_code || "").toLowerCase().includes(s) ||
      monthName.toLowerCase().includes(s) ||
      String(p.year).includes(s)
    );
  });

  const sortedPayslips = filteredPayslips.slice().sort((a, b) => {
    // Treat undefined as true for backwards compatibility with old records
    const aActive = a.is_active !== false;
    const bActive = b.is_active !== false;
    if (aActive === bActive) {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return aActive ? -1 : 1;
  });

  useEffect(() => {
    setPage(1);
  }, [q, filterCategory, filterMonth, filterYear]);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(sortedPayslips.length / PAGE_SIZE);
  const paginatedPayslips = sortedPayslips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Payroll</p>
          <h1 className="font-display text-4xl text-primary mt-1">Payslips</h1>
          <p className="text-sm text-muted-foreground mt-2">View, generate, and manage monthly salary slips for all employees.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-transparent border-b border-muted/80 rounded-none w-full justify-start h-auto p-0 gap-6">
          <TabsTrigger 
            value="individual" 
            className="rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-0 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-foreground transition-all text-sm -mb-[1px]"
          >
            Individual Payslips
          </TabsTrigger>
          <TabsTrigger 
            value="bulk" 
            className="rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 pt-0 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-foreground transition-all text-sm -mb-[1px]"
          >
            Bulk Payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6 outline-none">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:max-w-4xl flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payslips..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="teaching_regular">Regular Teaching</SelectItem>
                  <SelectItem value="non_teaching_regular">Regular Non Teaching</SelectItem>
                  <SelectItem value="adhoc_teaching">Adhoc Teaching</SelectItem>
                  <SelectItem value="adhoc_non_teaching">Adhoc Non Teaching</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-full sm:w-[150px] bg-background">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-full sm:w-[120px] bg-background">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link to="/payslips/new">
                <Plus className="h-4 w-4 mr-2" /> New Payslip
              </Link>
            </Button>
          </div>

          <div className="border rounded-lg bg-card overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary/100">
                <TableRow>
                  <TableHead className="w-16">S.No.</TableHead>
                  <TableHead>Payslip #</TableHead>
                  <TableHead>Employee Id</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Gross</TableHead>
                  <TableHead className="text-center">Net</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && paginatedPayslips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No payslips yet.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedPayslips.map((p, idx) => {
                  const emp = p.employee_id;
                  const isActive = p.is_active !== false;
                  return (
                    <TableRow key={p._id || p.id} className={!isActive ? "opacity-60 bg-muted/30" : ""}>
                      <TableCell className="text-xs font-medium">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{p.payslip_number}</TableCell>
                      <TableCell className="font-mono text-xs">{emp?.employee_code || "—"}</TableCell>
                      <TableCell className="font-medium text-xs">{emp?.full_name || "—"}</TableCell>
                      <TableCell>
                        {MONTHS[p.month - 1]} {p.year}
                      </TableCell>
                      <TableCell className="text-center">
                        ₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(p.gross_salary))}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        ₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(p.net_salary))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.currentTarget.blur(); handleViewPdf(p._id || p.id); }}>
                                <FileText className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View PDF</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild onClick={(e) => e.currentTarget.blur()}>
                                <Link to={`/payslips/${p._id || p.id}/edit`}>
                                  <Edit className="w-4 h-4 text-muted-foreground" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Payslip</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.currentTarget.blur(); toggleActive(p._id || p.id, isActive); }}>
                                {isActive ? (
                                  <Ban className="w-4 h-4 text-destructive" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-success" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isActive ? "Disable Payslip" : "Enable Payslip"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
              <div>
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, sortedPayslips.length)} of {sortedPayslips.length} entries
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <div className="flex items-center px-2 font-medium">Page {page} of {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="outline-none">
          <BulkPayslips 
            isEmbedded={true} 
            onViewList={() => {
              qc.invalidateQueries({ queryKey: ["payslips"] });
              setActiveTab("individual");
            }} 
          />
        </TabsContent>
      </Tabs>

    </div>
    </TooltipProvider>
  );
}


