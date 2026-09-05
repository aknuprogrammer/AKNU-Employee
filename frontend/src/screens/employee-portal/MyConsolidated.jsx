import { useState, useMemo } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { generatePayslipPDF, mapPayslipDataForPDF } from "@/lib/payslip-pdf";
import { ShieldCheck, Calendar, FileSpreadsheet, Lock, Sparkles } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MyConsolidated() {
  const [rangeType, setRangeType] = useState("3"); // "3" (Quarterly), "6" (Half-Yearly), "12" (Annual), "custom"
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [quarter, setQuarter] = useState("1"); // 1: Q1, 2: Q2, 3: Q3, 4: Q4
  const [half, setHalf] = useState("1"); // 1: Jan-Jun, 2: Jul-Dec
  const [annualType, setAnnualType] = useState("calendar"); // "calendar", "financial"
  const [startMonth, setStartMonth] = useState("1");
  const [startYear, setStartYear] = useState(String(new Date().getFullYear()));
  const [endMonth, setEndMonth] = useState("12");
  const [endYear, setEndYear] = useState(String(new Date().getFullYear()));
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const yearsList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      list.push(String(y));
    }
    return list;
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!pin) return toast.error("Please enter your 4-digit verification PIN");
    if (pin.length !== 4) return toast.error("PIN must be exactly 4 characters");

    let finalStartMonth, finalStartYear, finalEndMonth, finalEndYear;

    if (rangeType === "3") {
      finalStartYear = Number(year);
      finalEndYear = Number(year);
      if (quarter === "1") {
        finalStartMonth = 1; finalEndMonth = 3;
      } else if (quarter === "2") {
        finalStartMonth = 4; finalEndMonth = 6;
      } else if (quarter === "3") {
        finalStartMonth = 7; finalEndMonth = 9;
      } else {
        finalStartMonth = 10; finalEndMonth = 12;
      }
    } else if (rangeType === "6") {
      finalStartYear = Number(year);
      finalEndYear = Number(year);
      if (half === "1") {
        finalStartMonth = 1; finalEndMonth = 6;
      } else {
        finalStartMonth = 7; finalEndMonth = 12;
      }
    } else if (rangeType === "12") {
      if (annualType === "calendar") {
        finalStartYear = Number(year);
        finalEndYear = Number(year);
        finalStartMonth = 1;
        finalEndMonth = 12;
      } else {
        finalStartYear = Number(year) - 1;
        finalEndYear = Number(year);
        finalStartMonth = 4; // April
        finalEndMonth = 3;  // March
      }
    } else {
      finalStartMonth = Number(startMonth);
      finalStartYear = Number(startYear);
      finalEndMonth = Number(endMonth);
      finalEndYear = Number(endYear);

      // Sanity validation for custom ranges
      const startVal = finalStartYear * 12 + finalStartMonth;
      const endVal = finalEndYear * 12 + finalEndMonth;
      if (startVal > endVal) {
        return toast.error("Start period cannot be after end period");
      }
    }

    setLoading(true);
    try {
      const { data } = await api.post("/payslips/consolidated", {
        startMonth: finalStartMonth,
        startYear: finalStartYear,
        endMonth: finalEndMonth,
        endYear: finalEndYear,
        pin: pin.toUpperCase()
      });

      const mappedData = mapPayslipDataForPDF(data);
      const blobUrl = await generatePayslipPDF(mappedData, window.location.origin);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Consolidated_Payslip_${finalStartYear}_${finalStartMonth}_to_${finalEndYear}_${finalEndMonth}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.open(blobUrl, "_blank");
      toast.success("Consolidated payslip generated successfully!");
      setPin("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate consolidated payslip. Records may not exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-primary/5">
          <FileSpreadsheet className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl tracking-tight text-foreground">Consolidated Reports</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Generate aggregated salary reports across multiple pay periods.
        </p>
      </div>

      <Card className="w-full max-w-lg border-0 shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary shrink-0" /> Report Configuration
          </CardTitle>
          <CardDescription className="text-center text-sm">
            Choose a pay range and authenticate with your Aadhaar digits to verify identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="space-y-2">
              <Label>Report Range Option</Label>
              <Select value={rangeType} onValueChange={setRangeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months (Quarterly)</SelectItem>
                  <SelectItem value="6">6 Months (Half-Yearly)</SelectItem>
                  <SelectItem value="12">12 Months (Annual)</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rangeType === "3" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsList.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quarter</Label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1 (Jan - Mar)</SelectItem>
                      <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
                      <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
                      <SelectItem value="4">Q4 (Oct - Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {rangeType === "6" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsList.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Half-Year Period</Label>
                  <Select value={half} onValueChange={setHalf}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">First Half (Jan - Jun)</SelectItem>
                      <SelectItem value="2">Second Half (Jul - Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {rangeType === "12" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Annual Type</Label>
                  <Select value={annualType} onValueChange={setAnnualType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calendar">Calendar Year (Jan - Dec)</SelectItem>
                      <SelectItem value="financial">Financial Year (Apr - Mar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsList.map((y) => (
                        <SelectItem key={y} value={y}>
                          {annualType === "financial" ? `${Number(y) - 1}-${y.slice(-2)}` : y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {rangeType === "custom" && (
              <div className="space-y-4 p-4 border rounded-xl bg-muted/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Start Month</Label>
                    <Select value={startMonth} onValueChange={setStartMonth}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Start Year</Label>
                    <Select value={startYear} onValueChange={setStartYear}>
                      <SelectTrigger className="h-9">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">End Month</Label>
                    <Select value={endMonth} onValueChange={setEndMonth}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End Year</Label>
                    <Select value={endYear} onValueChange={setEndYear}>
                      <SelectTrigger className="h-9">
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
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-1.5 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 shrink-0" /> Security Verification (Last 4 Aadhaar Digits)
              </Label>
              <Input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-11 tracking-[0.4em] text-center font-mono text-lg focus-visible:ring-primary/30"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 shadow-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Generating consolidated PDF...</>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" /> Generate Consolidated PDF
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
