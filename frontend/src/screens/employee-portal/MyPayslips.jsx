import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { generatePayslipPDF, mapPayslipDataForPDF } from "@/lib/payslip-pdf";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Lock, FileText, Download, Check, ChevronsUpDown } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MyPayslips() {
  const { user } = useAuth();
  const [month, setMonth] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!month || !year) return toast.error("Please fill all fields");

    setLoading(true);
    try {
      const { data } = await api.post("/payslips/unlock", {
        month: Number(month),
        year: Number(year),
        pin: "",
      });
      
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
      toast.success("Payslip unlocked successfully!");
      setPin(""); // Clear pin after success
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid details. Payslip not found or PIN incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl tracking-tight text-foreground">Secure Vault</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Authenticate to decrypt and download your official payslips.
        </p>
      </div>

      <Card className="w-full max-w-md border-0 shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl text-center">Unlock Payslip</CardTitle>
          <CardDescription className="text-center text-sm">
            Enter the period and your Aadhaar details to verify identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between font-normal bg-background"
                    >
                      {month ? MONTHS[Number(month) - 1] : "Select month..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Search month..." />
                      <CommandList>
                        <CommandEmpty>No month found.</CommandEmpty>
                        <CommandGroup>
                          {MONTHS.map((m, i) => (
                            <CommandItem
                              key={i}
                              value={m}
                              onSelect={() => {
                                setMonth(String(i + 1));
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${month === String(i + 1) ? "opacity-100" : "opacity-0"}`}
                              />
                              {m}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
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
                "Decrypting..."
              ) : (
                <>
                  <Download className="w-5 h-5" /> Download Payslip
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t px-6 py-4">
          <p className="text-xs text-center w-full text-muted-foreground flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" /> Encrypted with 256-bit AES standard
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
