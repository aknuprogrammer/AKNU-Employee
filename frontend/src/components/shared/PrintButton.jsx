import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';

export const PrintButton = ({
  data = [],
  columns = [],
  title = "Report",
  subtitle = "",
  metaInfo = [],
  summary = [],
  buttonText = "Print",
  className = "w-full sm:w-auto",
  variant = "outline",
  size = "sm"
}) => {
  const handlePrint = () => {
    if (!data || data.length === 0) {
      toast.error('No data available to print');
      return;
    }

    try {
      const now = new Date();
      const printDateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Generate table headers
      const tableHeadersHtml = columns
        .map(col => `<th style="padding: 8px 10px; border: 1px solid #cbd5e1; background-color: #f1f5f9; text-align: left; font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase;">${col.header}</th>`)
        .join('');

      // Generate table rows
      const tableRowsHtml = data
        .map((item, idx) => {
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          const cellsHtml = columns
            .map(col => {
              const val = col.accessor ? col.accessor(item, idx) : (item[col.key] ?? '—');
              return `<td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px; color: #334155; vertical-align: top;">${val !== undefined && val !== null ? val : '—'}</td>`;
            })
            .join('');
          return `<tr style="background-color: ${rowBg}; page-break-inside: avoid;">${cellsHtml}</tr>`;
        })
        .join('');

      // Generate meta info list
      const metaHtml = metaInfo.length > 0
        ? `<div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 12px; background: #f8fafc; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 11px;">
            ${metaInfo.map(m => `<div><strong style="color: #0f172a;">${m.label}:</strong> <span style="color: #475569;">${m.value}</span></div>`).join('')}
          </div>`
        : '';

      // Generate summary cards
      const summaryHtml = summary.length > 0
        ? `<div style="display: flex; gap: 12px; margin-bottom: 12px;">
            ${summary.map(s => `
              <div style="flex: 1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; text-align: center;">
                <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600;">${s.label}</div>
                <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${s.value}</div>
              </div>
            `).join('')}
          </div>`
        : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title} - AKNU</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm 10mm 12mm 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 10px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-banner {
              text-align: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }
            .univ-title {
              font-size: 20px;
              font-weight: 800;
              color: #1e3a8a;
              letter-spacing: 0.05em;
              margin: 0 0 2px 0;
              text-transform: uppercase;
            }
            .univ-subtitle {
              font-size: 10px;
              color: #475569;
              margin: 0 0 4px 0;
            }
            .report-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin: 6px 0 0 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            .footer-signatures {
              margin-top: 36px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #334155;
              page-break-inside: avoid;
            }
            .sig-block {
              text-align: center;
              width: 180px;
              border-top: 1px dashed #94a3b8;
              padding-top: 4px;
            }
            .print-footer {
              margin-top: 16px;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
              font-size: 9px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1 class="univ-title">ADIKAVI NANNAYA UNIVERSITY</h1>
            <p class="univ-subtitle">Accredited by NAAC with 'B+' Grade • ISO 9001:2025 Certified • Rajamahendravaram, Andhra Pradesh</p>
            <div class="report-title">${title}</div>
            ${subtitle ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">${subtitle}</div>` : ''}
          </div>

          ${metaHtml}
          ${summaryHtml}

          <table>
            <thead>
              <tr>${tableHeadersHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sig-block">Prepared By</div>
            <div class="sig-block">Section Head Verification</div>
            <div class="sig-block">Master Admin / Authority</div>
          </div>

          <div class="print-footer">
            <span>Generated on: ${printDateStr}</span>
            <span>Adikavi Nannaya University ERP Portal</span>
          </div>
        </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 400);

    } catch (err) {
      console.error('Print Error:', err);
      toast.error('Failed to prepare print document');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      className={className}
      type="button"
    >
      <Printer className="h-4 w-4 mr-2" />
      {buttonText}
    </Button>
  );
};

export default PrintButton;
