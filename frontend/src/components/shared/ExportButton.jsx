import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const ExportButton = ({
  data,
  filename = "export",
  columns = [],
  buttonText = "Export XLSX",
  className = "w-full sm:w-auto",
  variant = "outline"
}) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    try {
      // Format data based on provided columns mapper or use raw data
      const formattedData = columns.length > 0 
        ? data.map((item, idx) => {
            const row = {};
            columns.forEach(col => {
              const val = col.accessor ? col.accessor(item, idx) : (item[col.key] ?? '');
              row[col.header] = val !== undefined && val !== null ? val : '';
            });
            return row;
          })
        : data;

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      
      const fileNameStr = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileNameStr);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export Error:', error);
    }
  };

  return (
    <Button variant={variant} size="sm" onClick={handleExport} className={className} type="button">
      <Download className="h-4 w-4 mr-2" /> {buttonText}
    </Button>
  );
};

export default ExportButton;
