import { useState, useEffect } from "react";
import { form16Service } from "../form16/services/form16Service";
import { useMyForm16Years } from "../form16/hooks/useForm16";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Lock, FileText, Download, ShieldAlert } from "lucide-react";

export default function MyForm16() {
  const { user } = useAuth();
  const { data: availableYears = [], isLoading: loadingYears } = useMyForm16Years();
  const [academicYear, setAcademicYear] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (availableYears.length > 0 && !academicYear) {
      setAcademicYear(availableYears[0]);
    }
  }, [availableYears, academicYear]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!academicYear) return toast.error("Please fill all fields");

    setLoading(true);
    try {
      const blob = await form16Service.unlockForm16({
        academic_year: academicYear,
        pin: "",
      });
      
      const blobUrl = URL.createObjectURL(blob);
      
      // Force download file
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Form16_${academicYear.replace('/', '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Open in a new tab
      window.open(blobUrl, "_blank");
      toast.success("Form 16 unlocked and downloaded successfully!");
      setPin(""); // Clear pin after success
    } catch (err) {
      console.error(err);
      let message = "Verification failed. Document not found or Aadhaar digits incorrect.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) message = parsed.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const hasNoYears = !loadingYears && availableYears.length === 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl tracking-tight text-foreground">Tax Vault</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Authenticate with your credentials to unlock and download your Form 16 PDF.
        </p>
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl text-center">Unlock Form 16</CardTitle>
          <CardDescription className="text-center text-sm">
            Select the academic year and verify your identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingYears ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Loading available academic years...
            </div>
          ) : hasNoYears ? (
            <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/20 text-center gap-3">
              <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-foreground">No Form 16 Available</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  There are no active Form 16 certificates uploaded for you at this time. Please contact the accountant if you believe this is an error.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUnlock} className="space-y-5">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Commented out PIN input as of now
              <div className="space-y-2">
                <Label className="text-muted-foreground font-semibold">Aadhaar Number (Last 4 digits)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                  <Input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="pl-10 text-center tracking-[0.5em] text-2xl h-12 font-mono transition-shadow focus-visible:ring-primary/50"
                  />
                </div>
              </div>
              */}
              
              <Button type="submit" className="w-full h-12 text-md gap-2" disabled={loading}>
                {loading ? (
                  "Verifying..."
                ) : (
                  <>
                    <Download className="w-5 h-5" /> Unlock & Download PDF
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="bg-muted/30 border-t px-6 py-4">
          <p className="text-xs text-center w-full text-muted-foreground flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" /> Securely streamed from private server storage
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
