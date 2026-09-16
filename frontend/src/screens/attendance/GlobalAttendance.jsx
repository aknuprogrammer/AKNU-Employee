import React, { useState } from 'react';
import { useAttendances } from '../../hooks/useAttendance';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { PrintButton } from '../../components/shared/PrintButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const GlobalAttendance = () => {
  const [filters, setFilters] = useState({
    section_id: 'all',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    search: ''
  });

  const { data: attendances, isLoading } = useAttendances(filters);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-700 border-green-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'Leave': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatPreparedBy = (user) => {
    if (!user) return 'System';
    const name = user.full_name || user.username || 'System';
    if (user.role === 'section_head' || user.is_section_head) {
      return `${name} (Section Head)`;
    }
    return name;
  };

  const flattenedRecords = attendances?.reduce((acc, att) => {
    if (!att.records) return acc;
    att.records.forEach(rec => {
      acc.push({
        date: att.date,
        section: att.section_id?.name || '—',
        employee_name: rec.employee_id?.full_name || 'Unknown',
        status: rec.status,
        remarks: rec.remarks || '—',
        prepared_by: formatPreparedBy(att.prepared_by)
      });
    });
    return acc;
  }, []) || [];

  const summaryRecords = attendances?.map((att, index) => {
    const presentCount = att.records?.filter(r => r.status === 'Present').length || 0;
    const absentCount = (att.records?.length || 0) - presentCount;
    return {
      sno: index + 1,
      date: new Date(att.date).toLocaleDateString(),
      section: att.section_id?.name || '—',
      prepared_by: formatPreparedBy(att.prepared_by),
      present_count: presentCount,
      absent_count: absentCount,
      status: att.approval_status
    };
  }) || [];

  const totalPresentCount = flattenedRecords.filter(r => r.status === 'Present').length;
  const totalAbsentCount = flattenedRecords.filter(r => r.status !== 'Present').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Section Management</p>
          <h1 className="font-display text-4xl text-primary mt-1">Global Attendance</h1>
          <p className="text-sm text-muted-foreground mt-2">
            View attendance logs across all sections
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportButton 
            data={summaryRecords} 
            filename="Global_Attendance_Summary"
            buttonText="Export Summary"
            columns={[
              { header: 'S.No', accessor: (a) => a.sno },
              { header: 'Date', accessor: (a) => a.date },
              { header: 'Section', accessor: (a) => a.section },
              { header: 'Prepared By', accessor: (a) => a.prepared_by },
              { header: 'Total Present', accessor: (a) => a.present_count },
              { header: 'Total Absent/Leave', accessor: (a) => a.absent_count },
              { header: 'Status', accessor: (a) => a.status }
            ]}
          />
          <ExportButton 
            data={flattenedRecords} 
            filename="Global_Attendance_Detailed"
            buttonText="Export Detailed"
            columns={[
              { header: 'Date', accessor: (a) => new Date(a.date).toLocaleDateString() },
              { header: 'Section', accessor: (a) => a.section },
              { header: 'Employee Name', accessor: (a) => a.employee_name },
              { header: 'Status', accessor: (a) => a.status },
              { header: 'Remarks', accessor: (a) => a.remarks },
              { header: 'Prepared By', accessor: (a) => a.prepared_by }
            ]}
          />
          <PrintButton
            data={summaryRecords}
            title="Global Attendance Report"
            buttonText="Print Report"
            metaInfo={[
              { label: 'Date Range', value: filters.startDate === filters.endDate ? filters.startDate : `${filters.startDate} to ${filters.endDate}` },
              { label: 'Scope', value: filters.section_id === 'all' ? 'All Sections' : 'Filtered Section' }
            ]}
            summary={[
              { label: 'Total Present', value: totalPresentCount },
              { label: 'Total Absent / Leave', value: totalAbsentCount },
              { label: 'Attendance Logs', value: summaryRecords.length }
            ]}
            columns={[
              { header: 'S.No', accessor: (a) => a.sno },
              { header: 'Date', accessor: (a) => a.date },
              { header: 'Section', accessor: (a) => a.section },
              { header: 'Prepared By', accessor: (a) => a.prepared_by },
              { header: 'Present', accessor: (a) => a.present_count },
              { header: 'Absent/Leave', accessor: (a) => a.absent_count },
              { header: 'Approval Status', accessor: (a) => a.status }
            ]}
          />
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary/100">
            <TableRow>
              <TableHead className="w-[80px]">S.No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Prepared By</TableHead>
              <TableHead>Total Present</TableHead>
              <TableHead>Total Absent/Leave</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (!attendances || attendances.length === 0) && (
              <TableRow><TableCell colSpan={8} className="text-center py-8">No records found.</TableCell></TableRow>
            )}
            {attendances?.map((att, index) => {
              const presentCount = att.records?.filter(r => r.status === 'Present').length || 0;
              const absentCount = att.records?.length - presentCount;
              return (
                <TableRow key={att._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{new Date(att.date).toLocaleDateString()}</TableCell>
                  <TableCell>{att.section_id?.name || '—'}</TableCell>
                  <TableCell>{formatPreparedBy(att.prepared_by)}</TableCell>
                  <TableCell className="text-green-600 font-medium">{presentCount}</TableCell>
                  <TableCell className="text-red-600 font-medium">{absentCount}</TableCell>
                  <TableCell><ApprovalBadge status={att.approval_status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(att)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle>Attendance Details - {selectedRecord?.section_id?.name}</DialogTitle>
            {selectedRecord?.records?.length > 0 && (
              <div className="flex items-center gap-2">
                <ExportButton
                  data={selectedRecord.records}
                  filename={`Attendance_${selectedRecord?.section_id?.name || 'Section'}_${new Date(selectedRecord.date).toISOString().split('T')[0]}`}
                  buttonText="Export"
                  columns={[
                    { header: 'S.No', accessor: (_, idx) => idx + 1 },
                    { header: 'Employee Name', accessor: (r) => r.employee_id?.full_name || 'Unknown' },
                    { header: 'Status', accessor: (r) => r.status },
                    { header: 'Remarks', accessor: (r) => r.remarks || '—' }
                  ]}
                />
                <PrintButton
                  data={selectedRecord.records}
                  title={`Attendance Sheet - ${selectedRecord?.section_id?.name}`}
                  buttonText="Print Sheet"
                  metaInfo={[
                    { label: 'Date', value: new Date(selectedRecord.date).toLocaleDateString() },
                    { label: 'Section', value: selectedRecord?.section_id?.name || '—' },
                    { label: 'Prepared By', value: formatPreparedBy(selectedRecord?.prepared_by) },
                    { label: 'Status', value: selectedRecord?.approval_status || '—' }
                  ]}
                  summary={[
                    { label: 'Present', value: selectedRecord.records.filter(r => r.status === 'Present').length },
                    { label: 'Absent/Leave', value: selectedRecord.records.filter(r => r.status !== 'Present').length },
                    { label: 'Total', value: selectedRecord.records.length }
                  ]}
                  columns={[
                    { header: 'S.No', accessor: (_, idx) => idx + 1 },
                    { header: 'Employee Name', accessor: (r) => r.employee_id?.full_name || 'Unknown' },
                    { header: 'Status', accessor: (r) => r.status },
                    { header: 'Remarks', accessor: (r) => r.remarks || '—' }
                  ]}
                />
              </div>
            )}
          </DialogHeader>
          <div className="mt-4">
            <div className="flex gap-6 mb-4 text-sm bg-muted/30 p-3 rounded-md">
              <div><span className="font-semibold">Date:</span> {selectedRecord && new Date(selectedRecord.date).toLocaleDateString()}</div>
              <div><span className="font-semibold">Prepared By:</span> {formatPreparedBy(selectedRecord?.prepared_by)}</div>
              <div><span className="font-semibold">Status:</span> {selectedRecord?.approval_status}</div>
            </div>
            <div className="border rounded-lg overflow-x-auto max-h-[60vh]">
              <Table>
                <TableHeader className="bg-primary/100 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[80px]">S.No</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRecord?.records?.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{record.employee_id?.full_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.remarks || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {(!selectedRecord?.records || selectedRecord.records.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No records found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalAttendance;
