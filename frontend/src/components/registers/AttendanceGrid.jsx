import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export const AttendanceGrid = ({ employees, attendanceState, onStatusChange, onRemarksChange }) => {
  return (
    <div className="border rounded-lg bg-card overflow-x-auto">
      <Table>
        <TableHeader className="bg-primary/100">
          <TableRow>
            <TableHead>Employee Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees?.map((emp) => (
            <TableRow key={emp._id}>
              <TableCell className="font-medium">{emp.full_name}</TableCell>
              <TableCell>
                <Select
                  value={attendanceState[emp._id]?.status || 'Present'}
                  onValueChange={(val) => onStatusChange(emp._id, val)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="OD">OD (On Duty)</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Required if absent/leave"
                  value={attendanceState[emp._id]?.remarks || ''}
                  onChange={(e) => onRemarksChange(emp._id, e.target.value)}
                  disabled={attendanceState[emp._id]?.status === 'Present'}
                />
              </TableCell>
            </TableRow>
          ))}
          {(!employees || employees.length === 0) && (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No employees found in your section.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
