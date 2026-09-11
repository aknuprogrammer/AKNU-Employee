import React, { useState, useEffect } from 'react';
import { useActivities, useSubmitActivity, useUpdateActivity } from '../../hooks/useActivities';
import { useSectionEmployees } from '../../hooks/useAttendance';
import { useAuth } from '@/lib/auth-context';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { Plus, Edit2, Eye } from 'lucide-react';
import { toast } from 'sonner';

export const DailyActivity = () => {
  const { user } = useAuth();
  const defaultSectionId = user?.role === 'master_admin' ? 'all' : (user?.section_id?._id || user?.section_id || user?.employee_id?.section_id || '');
  const getToday = () => format(new Date(), "yyyy-MM-dd");

  const [filters, setFilters] = useState({
    section_id: defaultSectionId,
    date: getToday(),
    search: ''
  });

  // Keep filter date in sync with the current day (updates every minute)
  const [currentDate, setCurrentDate] = useState(new Date());
  useEffect(() => {
    const intervalId = setInterval(() => setCurrentDate(new Date()), 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const todayStr = format(currentDate, "yyyy-MM-dd");
    if (filters.date !== todayStr) {
      setFilters(prev => ({ ...prev, date: todayStr }));
    }
  }, [currentDate]);

  const { data: activities, isLoading } = useActivities(filters);
  const { data: employees } = useSectionEmployees(defaultSectionId);
  const submitMutation = useSubmitActivity();
  const updateMutation = useUpdateActivity();

  const [openNew, setOpenNew] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewActivity, setViewActivity] = useState(null);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    date: getToday(),
    task_description: '',
    status: 'Completed',
    remarks: ''
  });

  const handleOpenNew = () => {
    setEditId(null);
    setFormData(prev => ({
      ...prev,
      date: getToday(),
      task_description: '',
      status: 'Completed',
      remarks: ''
    }));
    setOpenNew(true);
  };

  // Update form date each day when not editing an existing entry
  useEffect(() => {
    if (!editId) {
      const todayStr = format(currentDate, "yyyy-MM-dd");
      setFormData(prev => ({ ...prev, date: todayStr }));
    }
  }, [currentDate, editId]);

  const handleEdit = (act) => {
    setEditId(act._id);
    setFormData({
      date: new Date(act.date).toISOString().split('T')[0],
      task_description: act.task_description,
      status: act.status,
      remarks: act.remarks || ''
    });
    setOpenNew(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({
        id: editId,
        ...formData
      }, {
        onSuccess: () => {
          toast.success('Activity updated successfully');
          setOpenNew(false);
        },
        onError: (err) => toast.error(err?.response?.data?.message || err.message)
      });
    } else {
      submitMutation.mutate({
        section_id: defaultSectionId,
        ...formData,
        employee_id: user._id || user.employee_id
      }, {
        onSuccess: () => {
          toast.success('Activity logged successfully');
          setOpenNew(false);
        },
        onError: (err) => toast.error(err?.response?.data?.message || err.message)
      });
    }
  };

  const isToday = (dateStr) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const itemDate = new Date(dateStr).toISOString().split('T')[0];
    return today === itemDate;
  };

  const isSaving = submitMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Performance</p>
          <h1 className="font-display text-4xl text-primary mt-1">Daily Activity</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Track daily tasks and progress
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
          {user?.role === 'master_admin' && (
            <ExportButton 
              data={activities} 
              filename="Daily_Activity"
              columns={[
                { header: 'Date', accessor: (a) => new Date(a.date).toLocaleDateString() },
                { header: 'Section', accessor: (a) => a.section_id?.name || '—' },
                { header: 'Employee', accessor: (a) => a.employee_id?.full_name || '—' },
                { header: 'Task Description', accessor: (a) => a.task_description },
                { header: 'Status', accessor: (a) => a.status },
                { header: 'Remarks', accessor: (a) => a.remarks || '—' },
                { header: 'Head Approval', accessor: (a) => a.approval_status }
              ]}
            />
          )}
          {user?.role !== 'master_admin' && (
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto" onClick={handleOpenNew}>
                <Plus className="h-4 w-4 mr-2" /> Log Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Edit Daily Activity' : 'Log Daily Activity'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={formData.date} readOnly className="bg-muted cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label>Task / Activity Description *</Label>
                  <Textarea value={formData.task_description} onChange={e => setFormData({...formData, task_description: e.target.value})} required rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Task Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Remarks (Optional)</Label>
                  <Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : (editId ? 'Update Activity' : 'Save Activity')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} singleDate={true} />

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary/100">
            <TableRow>
              <TableHead className="w-[80px]">S.No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Task Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Head Approval</TableHead>
              {user?.role !== 'master_admin' && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (!activities || activities.length === 0) && (
              <TableRow><TableCell colSpan={9} className="text-center py-8">No activities logged for this date.</TableCell></TableRow>
            )}
            {activities?.map((act, index) => {
              const myUserId = user._id || user.employee_id;
              const isMine = act.employee_id?._id?.toString() === myUserId?.toString() || act.employee_id === myUserId;
              const canEdit = isMine && isToday(act.date) && act.approval_status !== 'Approved';

              return (
                <TableRow key={act._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{new Date(act.date).toLocaleDateString()}</TableCell>
                  <TableCell>{act.section_id?.name || '—'}</TableCell>
                  <TableCell className="font-medium">{act.employee_id?.full_name}</TableCell>
                  <TableCell>{act.task_description.length > 80 ? `${act.task_description.slice(0, 80)}...` : act.task_description}</TableCell>
                  <TableCell><ApprovalBadge status={act.status} /></TableCell>
                  <TableCell>{act.remarks || '—'}</TableCell>
                  <TableCell><ApprovalBadge status={act.approval_status} /></TableCell>
                  {user?.role !== 'master_admin' && (
                    <TableCell className="text-right">
                      <div className="flex space-x-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setViewActivity(act); setViewModalOpen(true); }}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(act)}>
                            <Edit2 className="h-4 w-4 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* View Activity Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {viewActivity && (
            <div className="space-y-4 py-4">
              <div>
                <span className="font-medium">Employee:</span> {viewActivity.employee_id?.full_name || '—'}
              </div>
              <div>
                <span className="font-medium">Section:</span> {viewActivity.section_id?.name || '—'}
              </div>
              <div>
                <span className="font-medium">Date:</span> {new Date(viewActivity.date).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Task Description:</span>
                <p className="mt-1 whitespace-pre-wrap">{viewActivity.task_description}</p>
              </div>
              <div>
                <span className="font-medium">Remarks:</span>
                <p className="mt-1 whitespace-pre-wrap">{viewActivity.remarks || '—'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  {/* View Activity Modal */}
  <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Task Details</DialogTitle>
      </DialogHeader>
      {viewActivity && (
        <div className="space-y-4 py-4">
          <div>
            <span className="font-medium">Employee:</span> {viewActivity.employee_id?.full_name || '—'}
          </div>
          <div>
            <span className="font-medium">Section:</span> {viewActivity.section_id?.name || '—'}
          </div>
          <div>
            <span className="font-medium">Date:</span> {new Date(viewActivity.date).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Task Description:</span>
            <p className="mt-1 whitespace-pre-wrap">{viewActivity.task_description}</p>
          </div>
          <div>
            <span className="font-medium">Remarks:</span>
            <p className="mt-1 whitespace-pre-wrap">{viewActivity.remarks || '—'}</p>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
};

export default DailyActivity;
