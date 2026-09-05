import React, { useState } from 'react';
import { useActivities, useSubmitActivity } from '../../hooks/useActivities';
import { useSectionEmployees } from '../../hooks/useAttendance';
import { useAuth } from '@/lib/auth-context';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export const DailyActivity = () => {
  const { user } = useAuth();
  const defaultSectionId = user?.role === 'master_admin' ? 'all' : (user?.employee_id?.section_id || '');

  const [filters, setFilters] = useState({
    section_id: defaultSectionId,
    startDate: new Date().toISOString().split('T')[0], // Default to today
    endDate: new Date().toISOString().split('T')[0],
    search: ''
  });

  const { data: activities, isLoading } = useActivities(filters);
  const { data: employees } = useSectionEmployees(user?.employee_id?.section_id);
  const submitMutation = useSubmitActivity();

  const [openNew, setOpenNew] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    task_description: '',
    status: 'Completed',
    remarks: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate({
      section_id: user?.employee_id?.section_id,
      ...formData,
      employee_id: user?.role === 'employee' ? user.employee_id : formData.employee_id
    }, {
      onSuccess: () => {
        toast.success('Activity logged successfully');
        setOpenNew(false);
        setFormData({ ...formData, employee_id: '', task_description: '', remarks: '', status: 'Completed' });
      },
      onError: (err) => toast.error(err.message)
    });
  };

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
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Log Activity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Daily Activity</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                {user?.role !== 'employee' && (
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={formData.employee_id} onValueChange={v => setFormData({...formData, employee_id: v})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map(emp => (
                          <SelectItem key={emp._id} value={emp._id}>{emp.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Task / Activity Description</Label>
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
                  <Button type="submit" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? 'Saving...' : 'Save Activity'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary/100">
            <TableRow>
              <TableHead className="w-[80px]">S.No</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Task Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Head Approval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (!activities || activities.length === 0) && (
              <TableRow><TableCell colSpan={7} className="text-center py-8">No activities logged for this date.</TableCell></TableRow>
            )}
            {activities?.map((act, index) => (
              <TableRow key={act._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{act.section_id?.name || '—'}</TableCell>
                <TableCell className="font-medium">{act.employee_id?.full_name}</TableCell>
                <TableCell>{act.task_description}</TableCell>
                <TableCell><ApprovalBadge status={act.status} /></TableCell>
                <TableCell>{act.remarks || '—'}</TableCell>
                <TableCell><ApprovalBadge status={act.approval_status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DailyActivity;
