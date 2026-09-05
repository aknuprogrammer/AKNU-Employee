import React, { useState } from 'react';
import { useAttendances } from '../../hooks/useAttendance';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';

export const GlobalAttendance = () => {
  const [filters, setFilters] = useState({
    section_id: 'all',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    search: ''
  });

  const { data: attendances, isLoading } = useAttendances(filters);

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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <ExportButton 
            data={attendances} 
            filename="Global_Attendance"
            columns={[
              { header: 'Date', accessor: (a) => new Date(a.date).toLocaleDateString() },
              { header: 'Section', accessor: (a) => a.section_id?.name || '—' },
              { header: 'Prepared By', accessor: (a) => a.prepared_by?.full_name || 'System' },
              { header: 'Total Present', accessor: (a) => a.records?.filter(r => r.status === 'Present').length || 0 },
              { header: 'Total Absent', accessor: (a) => a.records?.filter(r => r.status === 'Absent' || r.status === 'Leave').length || 0 },
              { header: 'Status', accessor: (a) => a.approval_status }
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (!attendances || attendances.length === 0) && (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No records found.</TableCell></TableRow>
            )}
            {attendances?.map((att, index) => {
              const presentCount = att.records?.filter(r => r.status === 'Present').length || 0;
              const absentCount = att.records?.length - presentCount;
              return (
                <TableRow key={att._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{new Date(att.date).toLocaleDateString()}</TableCell>
                  <TableCell>{att.section_id?.name || '—'}</TableCell>
                  <TableCell>{att.prepared_by?.full_name || att.prepared_by?.username || '—'}</TableCell>
                  <TableCell className="text-green-600 font-medium">{presentCount}</TableCell>
                  <TableCell className="text-red-600 font-medium">{absentCount}</TableCell>
                  <TableCell><ApprovalBadge status={att.approval_status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GlobalAttendance;
