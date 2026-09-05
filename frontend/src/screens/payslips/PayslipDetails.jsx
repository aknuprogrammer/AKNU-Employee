import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { generatePayslipPDF, mapPayslipDataForPDF } from "@/lib/payslip-pdf";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function PayslipDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["payslip", id],
    queryFn: async () => {
      const { data } = await api.get(`/payslips/${id}`);
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;

    const buildPdf = async () => {
      try {
        const mappedData = mapPayslipDataForPDF(data);
        mappedData.returnBlobUrl = true;
        const url = await generatePayslipPDF(mappedData, window.location.origin);
        setPdfUrl(url);
      } catch (e) {
        console.error(e);
        toast.error("Failed to generate PDF preview");
      }
    };
    
    buildPdf();
  }, [data]);

  if (isLoading) return <div className="text-muted-foreground p-8">Loading…</div>;
  if (!data) return <div className="text-muted-foreground p-8">Payslip not found.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4 no-print">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/payslips">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to payslips
          </Link>
        </Button>
      </div>

      <div className="flex-1 rounded-lg border bg-card overflow-hidden">
        {pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#view=FitH`} 
            className="w-full h-full border-0" 
            title="Payslip PDF Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Generating PDF preview...
          </div>
        )}
      </div>
    </div>
  );
}
