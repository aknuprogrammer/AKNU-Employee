import React, { useState, useEffect } from 'react';
import { useSectionEmployees, useSubmitAttendance, useAttendances, useUpdateAttendance } from '../../hooks/useAttendance';
import { useAuth } from '@/lib/auth-context';
import { AttendanceGrid } from '../../components/registers/AttendanceGrid';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { PrintButton } from '../../components/shared/PrintButton';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, Plus, Eye, Edit2, Camera, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AttachmentViewer } from '../../components/registers/AttachmentViewer';

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

  // Verification Photos state (Uploaded to Cloudinary)
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const handlePhotoChange = (e) => {
    const selected = Array.from(e.target.files);
    const oversized = selected.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error('Each photo must be ≤ 5 MB');
      return;
    }
    setPhotos(selected);
    const previews = selected.map(f => URL.createObjectURL(f));
    setPhotoPreviews(previews);
  };

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
        records,
        photos
      };

      submitMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Attendance Finalized');
          setIsTakeAttendanceOpen(false);
          setPhotos([]);
          setPhotoPreviews([]);
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

  const summaryRecords = attendances?.map((att, index) => {
    const presentCount = att.records?.filter(r => r.status === 'Present').length || 0;
    const absentCount = (att.records?.length || 0) - presentCount;
    return {
      sno: index + 1,
      date: new Date(att.date).toLocaleDateString(),
      prepared_by: formatPreparedBy(att.prepared_by),
      present_count: presentCount,
      absent_count: absentCount,
      status: att.approval_status
    };
  }) || [];

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
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          <ExportButton 
            data={summaryRecords} 
            filename="Attendance_Records"
            buttonText="Export XLSX"
            columns={[
              { header: 'S.No', accessor: (a) => a.sno },
              { header: 'Date', accessor: (a) => a.date },
              { header: 'Prepared By', accessor: (a) => a.prepared_by },
              { header: 'Total Present', accessor: (a) => a.present_count },
              { header: 'Total Absent/Leave', accessor: (a) => a.absent_count },
              { header: 'Status', accessor: (a) => a.status }
            ]}
          />
          <PrintButton
            data={summaryRecords}
            title="Section Attendance Report"
            buttonText="Print Report"
            metaInfo={[
              { label: 'Date Range', value: filters.startDate === filters.endDate ? filters.startDate : `${filters.startDate} to ${filters.endDate}` }
            ]}
            columns={[
              { header: 'S.No', accessor: (a) => a.sno },
              { header: 'Date', accessor: (a) => a.date },
              { header: 'Prepared By', accessor: (a) => a.prepared_by },
              { header: 'Present', accessor: (a) => a.present_count },
              { header: 'Absent/Leave', accessor: (a) => a.absent_count },
              { header: 'Status', accessor: (a) => a.status }
            ]}
          />
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
              <TableHead>Photo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingAttHistory && (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoadingAttHistory && (!attendances || attendances.length === 0) && (
              <TableRow><TableCell colSpan={8} className="text-center py-8">No attendance records found.</TableCell></TableRow>
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
                  <TableCell>
                    <AttachmentViewer attachments={att.photos} label="Photo" />
                  </TableCell>
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

          {/* Verification Photo Upload Section */}
          {!existingRecordId && (
            <div className="bg-muted/30 p-3.5 rounded-lg border mb-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Camera className="h-4 w-4 text-primary" />
                  Verification Photo(s) (Optional)
                </Label>
                <span className="text-[11px] text-muted-foreground">Upload roll-call proof or faculty photo to Cloudinary</span>
              </div>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="bg-background text-xs cursor-pointer"
              />
              {photoPreviews.length > 0 && (
                <div className="flex gap-2 pt-1.5 overflow-x-auto">
                  {photoPreviews.map((src, idx) => (
                    <div key={idx} className="h-16 w-16 rounded-md border overflow-hidden shrink-0 bg-background relative shadow-sm">
                      <img src={src} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle>Attendance Details - {selectedRecord?.section_id?.name || 'Section'}</DialogTitle>
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
                  title={`Attendance Sheet - ${selectedRecord?.section_id?.name || 'Section'}`}
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
            <div className="flex flex-wrap gap-4 sm:gap-6 mb-4 text-sm bg-muted/30 p-3 rounded-md">
              <div><span className="font-semibold">Date:</span> {selectedRecord && new Date(selectedRecord.date).toLocaleDateString()}</div>
              <div><span className="font-semibold">Prepared By:</span> {formatPreparedBy(selectedRecord?.prepared_by)}</div>
              <div><span className="font-semibold">Status:</span> {selectedRecord?.approval_status}</div>
            </div>

            {/* Verification Photos Preview */}
            {selectedRecord?.photos && selectedRecord.photos.length > 0 && (
              <div className="mb-4 p-3 border rounded-lg bg-muted/20">
                <p className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-foreground">
                  <Camera className="h-4 w-4 text-primary" />
                  Attendance Verification Photos ({selectedRecord.photos.length})
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {selectedRecord.photos.map((photoUrl, idx) => (
                    <a
                      key={idx}
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block h-24 w-32 rounded-lg border overflow-hidden bg-background shrink-0 hover:ring-2 hover:ring-primary transition-all shadow-sm"
                    >
                      <img src={photoUrl} alt={`Verification ${idx + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-x-auto max-h-[50vh]">
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
