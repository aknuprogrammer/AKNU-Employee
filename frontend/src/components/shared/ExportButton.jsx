import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const ExportButton = ({ data, filename = "export", columns = [] }) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    try {
      // Format data based on provided columns mapper or use raw data
      const formattedData = columns.length > 0 
        ? data.map(item => {
            const row = {};
            columns.forEach(col => {
              row[col.header] = col.accessor(item);
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
    <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto">
      <Download className="h-4 w-4 mr-2" /> Export XLSX
    </Button>
  );
};

export default ExportButton;
