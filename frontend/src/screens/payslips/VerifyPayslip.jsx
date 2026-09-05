import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Award, Calendar, Loader2 } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function VerifyPayslip() {
  const { payslipNumber } = useParams();

  const { data: payslip, isLoading, error } = useQuery({
    queryKey: ["verify-payslip", payslipNumber],
    queryFn: async () => {
      const { data } = await api.get(`/payslips/verify/${payslipNumber}`);
      return data;
    },
    retry: false
  });

  const emp = payslip?.employee_id || {};
  const monthName = payslip ? MONTHS[payslip.month - 1] : "";

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 px-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium animate-pulse">Authenticating payslip record...</p>
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-card overflow-hidden">
          <div className="h-1.5 w-full bg-destructive" />
          <CardHeader className="text-center pb-4 pt-8">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-foreground font-display">Verification Failed</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2">
              This document could not be authenticated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center px-6 pb-8">
            <div className="p-3.5 bg-destructive/5 rounded-xl border border-destructive/10 text-destructive text-sm font-mono break-all">
              {payslipNumber}
            </div>
            <p className="text-sm text-muted-foreground">
              The payslip number scanned is invalid or does not exist in the database. Please check the document or contact the university portal administration.
            </p>
            <div className="pt-4">
              <Button asChild className="w-full h-11">
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg border-0 shadow-2xl bg-card overflow-hidden">
        <div className="h-1.5 w-full bg-success" />
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-success" />
          </div>
          <CardTitle className="text-2xl text-foreground font-display">Document Authenticated</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Award className="w-4 h-4 text-success shrink-0" /> Verified official digital copy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-8">
          <div className="p-3.5 bg-success/5 rounded-xl border border-success/10 text-success text-center text-sm font-mono break-all font-semibold">
            {payslip.payslip_number}
          </div>

          <div className="space-y-4">
            <div className="border-b pb-2">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Employee Details</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Employee Name</p>
                <p className="font-semibold text-foreground mt-0.5">{emp.full_name || "—"}</p>
              </div>
              {emp.employee_code && emp.employee_code.trim() !== '' && (
                <div>
                  <p className="text-xs text-muted-foreground">Employee Code</p>
                  <p className="font-semibold text-foreground mt-0.5">{emp.employee_code}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="font-medium text-foreground mt-0.5">{emp.department_id?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium text-foreground mt-0.5">{emp.category?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="font-medium text-foreground mt-0.5">{emp.designation || "—"}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Pay Period</p>
                  <p className="font-medium text-foreground mt-0.5">{monthName} {payslip.year}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="border-b pb-2">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Salary Summary</h3>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Gross Earnings</p>
                <p className="font-mono text-sm font-semibold text-success mt-1">{formatCurrency(payslip.gross_salary)}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Deductions</p>
                <p className="font-mono text-sm font-semibold text-destructive mt-1">{formatCurrency(payslip.total_deductions)}</p>
              </div>
              <div className="p-3 bg-success/10 rounded-xl ring-1 ring-success/20">
                <p className="text-[10px] text-success font-bold uppercase tracking-wider">Net Payable</p>
                <p className="font-mono text-sm font-bold text-success mt-1">{formatCurrency(payslip.net_salary)}</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground italic pt-4">
            This digital record has been cryptographically generated and is verified directly against Adikavi Nannaya University records.
          </p>

          <div className="pt-2">
            <Button asChild className="w-full h-11" variant="outline">
              <Link to="/login">Go to Login Portal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
