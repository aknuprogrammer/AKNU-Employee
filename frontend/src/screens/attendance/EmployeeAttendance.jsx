import React, { useState, useEffect } from 'react';
import { useSectionEmployees, useSubmitAttendance, useAttendances, useUpdateAttendance } from '../../hooks/useAttendance';
import { useAuth } from '@/lib/auth-context';
import { AttendanceGrid } from '../../components/registers/AttendanceGrid';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, Plus, Eye, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const EmployeeAttendance = () => {
  const { user } = useAuth();
  // Support both PortalUser (user.section_id) and normal User (user.employee_id.section_id)
  const sectionId = user?.section_id?._id || user?.section_id || user?.employee_id?.section_id; 

  const getTodayDate = () => format(new Date(), "yyyy-MM-dd");
  const [filters, setFilters] = useState({
    section_id: sectionId,
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    search: ''
  });

    // Keep currentDate in sync with the real day (updates every minute)
  useEffect(() => {
    const intervalId = setInterval(() => setCurrentDate(new Date()), 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const { data: employees, isLoading: isLoadingEmp } = useSectionEmployees(sectionId);
  const { data: attendances, isLoading: isLoadingAttHistory } = useAttendances(filters);
  
  const todayStr = getTodayDate();
  const { data: todayAttendances, isLoading: isLoadingTodayAtt } = useAttendances({ section_id: sectionId, startDate: todayStr, endDate: todayStr });
  
  const submitMutation = useSubmitAttendance();
  const updateMutation = useUpdateAttendance();

  const [attendanceState, setAttendanceState] = useState({});
  const [existingRecordId, setExistingRecordId] = useState(null);
  // Use current date at the moment of submission rather than a fixed state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isTakeAttendanceOpen, setIsTakeAttendanceOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (employees && !isLoadingTodayAtt) {
      let initialState = {};
      const existingAtt = todayAttendances && todayAttendances.length > 0 ? todayAttendances[0] : null;

      if (existingAtt) {
         setExistingRecordId(existingAtt._id);
         const recordMap = {};
         existingAtt.records.forEach(r => {
           const empIdStr = r.employee_id._id ? r.employee_id._id.toString() : r.employee_id.toString();
           recordMap[empIdStr] = { status: r.status, remarks: r.remarks || '' };
         });

         employees.forEach(emp => {
           const mapped = recordMap[emp._id.toString()];
           initialState[emp._id] = mapped ? mapped : { status: 'Present', remarks: '' };
         });
      } else {
         setExistingRecordId(null);
         employees.forEach(emp => {
           initialState[emp._id] = { status: 'Present', remarks: '' };
         });
      }
      setAttendanceState(initialState);
    }
  }, [employees, todayAttendances, isLoadingTodayAtt]);

  const handleStatusChange = (empId, status) => {
    setAttendanceState(prev => ({
      ...prev,
      [empId]: { ...prev[empId], status, remarks: status === 'Present' ? '' : prev[empId].remarks }
    }));
  };

  const handleRemarksChange = (empId, remarks) => {
    setAttendanceState(prev => ({
      ...prev,
      [empId]: { ...prev[empId], remarks }
    }));
  };

  const handleSubmit = () => {
    // Validate
    const invalid = Object.values(attendanceState).find(a => a.status !== 'Present' && !a.remarks);
    if (invalid) {
      toast.error('Please provide remarks for all absent/leave employees');
      return;
    }

    const records = Object.entries(attendanceState).map(([employee_id, data]) => ({
      employee_id,
      status: data.status,
      remarks: data.remarks
    }));

    if (existingRecordId) {
      updateMutation.mutate({
        id: existingRecordId,
        records
      }, {
        onSuccess: () => {
          toast.success('Attendance Updated Successfully');
          setIsTakeAttendanceOpen(false);
        },
        onError: (err) => toast.error('Failed to update: ' + err.message)
      });
    } else {
      const payload = {
        date: new Date(),
        section_id: sectionId,
        type: 'employee',
        records
      };

      submitMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Attendance Finalized');
          setIsTakeAttendanceOpen(false);
        },
        onError: (err) => toast.error('Failed to submit: ' + err.message)
      });
    }
  };

  const formatPreparedBy = (u) => {
    if (!u) return 'System';
    const name = u.full_name || u.username || 'System';
    if (u.role === 'section_head' || u.is_section_head) {
      return `${name} (Section Head)`;
    }
    return name;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-700 border-green-200';
      case 'Absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'Leave': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const itemDate = new Date(dateStr).toISOString().split('T')[0];
    return today === itemDate;
  };

  const isLoadingForm = isLoadingEmp || isLoadingTodayAtt;
  const isSaving = submitMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Section Management</p>
          <h1 className="font-display text-4xl text-primary mt-1">Employee Attendance</h1>
          <p className="text-sm text-muted-foreground mt-2">
            View attendance history and log today's attendance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
          <Button onClick={() => setIsTakeAttendanceOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Take Attendance
          </Button>
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary/100">
            <TableRow>
              <TableHead className="w-[80px]">S.No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Prepared By</TableHead>
              <TableHead>Total Present</TableHead>
              <TableHead>Total Absent/Leave</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingAttHistory && (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoadingAttHistory && (!attendances || attendances.length === 0) && (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No attendance records found.</TableCell></TableRow>
            )}
            {attendances?.map((att, index) => {
              const presentCount = att.records?.filter(r => r.status === 'Present').length || 0;
              const absentCount = att.records?.length - presentCount;
              return (
                <TableRow key={att._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{new Date(att.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatPreparedBy(att.prepared_by)}</TableCell>
                  <TableCell className="text-green-600 font-medium">{presentCount}</TableCell>
                  <TableCell className="text-red-600 font-medium">{absentCount}</TableCell>
                  <TableCell><ApprovalBadge status={att.approval_status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(att)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {isToday(att.date) && (
                      <Button variant="ghost" size="sm" onClick={() => setIsTakeAttendanceOpen(true)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Take/Edit Attendance Modal */}
      <Dialog open={isTakeAttendanceOpen} onOpenChange={setIsTakeAttendanceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Attendance</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center mb-4">
            <Button variant={"outline"} disabled className="w-[240px] justify-start text-left font-normal bg-muted cursor-not-allowed">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(new Date(), "PPP")}
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || isLoadingForm} className="w-full sm:w-auto">
              {isSaving ? 'Saving...' : (existingRecordId ? 'Update Attendance' : 'Finalize Attendance')}
            </Button>
          </div>

          {isLoadingForm ? (
            <div className="py-8 text-center text-muted-foreground">Loading attendance data...</div>
          ) : (
            <AttendanceGrid 
              employees={employees}
              attendanceState={attendanceState}
              onStatusChange={handleStatusChange}
              onRemarksChange={handleRemarksChange}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Historical Attendance Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Attendance Details - {selectedRecord?.section_id?.name}</DialogTitle>
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

export default EmployeeAttendance;
