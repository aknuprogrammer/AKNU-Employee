import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePendingAttendance, useApproveAttendance } from '../../hooks/useAttendance';
import { useRegisters, useApproveRegister } from '../../hooks/useRegisters';
import { useActivities, useApproveActivity } from '../../hooks/useActivities';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { toast } from 'sonner';

export const PendingApprovals = () => {
  const { user } = useAuth();
  const sectionId = user?.section_id?._id || user?.section_id || user?.employee_id?.section_id;
  
  const { data: attendanceLogs, isLoading: loadingAtt } = usePendingAttendance(sectionId);
  const { data: activities, isLoading: loadingAct } = useActivities({ section_id: sectionId, status: 'Pending' });
  
  const approveAttMutation = useApproveAttendance();
  const approveActMutation = useApproveActivity();

  const [selectedActivities, setSelectedActivities] = useState([]);

  const handleSelectAllActivities = (checked) => {
    if (checked) {
      setSelectedActivities(activities?.map(a => a._id) || []);
    } else {
      setSelectedActivities([]);
    }
  };

  const handleSelectActivity = (id, checked) => {
    if (checked) {
      setSelectedActivities(prev => [...prev, id]);
    } else {
      setSelectedActivities(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkApproveActivities = async () => {
    if (selectedActivities.length === 0) return toast.error('No activities selected');
    
    let successCount = 0;
    for (const id of selectedActivities) {
      try {
        await approveActMutation.mutateAsync({ id, status: 'Approved', comments: 'Bulk Approved by Section Head' });
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }
    
    toast.success(`Successfully approved ${successCount} activities`);
    setSelectedActivities([]);
  };

  const handleApproveAttendance = (id) => {
    approveAttMutation.mutate({ id, status: 'Approved', comments: 'Approved by Section Head' }, {
      onSuccess: () => toast.success('Attendance Approved')
    });
  };

  const handleApproveActivity = (id) => {
    approveActMutation.mutate({ id, status: 'Approved', comments: 'Approved by Section Head' }, {
      onSuccess: () => toast.success('Activity Approved')
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Workflow</p>
          <h1 className="font-display text-4xl text-primary mt-1">Pending Approvals</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Review and approve submissions from your section.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Employee Attendance Approvals</h2>
        <div className="border rounded-lg bg-card overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/100">
              <TableRow>
                <TableHead className="w-[80px]">S.No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Employees</TableHead>
                <TableHead>Prepared By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingAtt && <TableRow><TableCell colSpan={6} className="text-center py-4">Loading...</TableCell></TableRow>}
              {!loadingAtt && (!attendanceLogs || attendanceLogs.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">All caught up!</TableCell></TableRow>
              )}
              {attendanceLogs?.map((log, index) => (
                <TableRow key={log._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                  <TableCell>{log.records?.length} records</TableCell>
                  <TableCell>{log.prepared_by?.username || 'System'}</TableCell>
                  <TableCell><ApprovalBadge status={log.approval_status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleApproveAttendance(log._id)} disabled={approveAttMutation.isPending}>
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Daily Activity Approvals</h2>
          {selectedActivities.length > 0 && (
            <Button onClick={handleBulkApproveActivities} size="sm">
              Approve Selected ({selectedActivities.length})
            </Button>
          )}
        </div>
        <div className="border rounded-lg bg-card overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/100">
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={activities?.length > 0 && selectedActivities.length === activities.length}
                    onCheckedChange={handleSelectAllActivities}
                  />
                </TableHead>
                <TableHead className="w-[80px]">S.No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingAct && <TableRow><TableCell colSpan={7} className="text-center py-4">Loading...</TableCell></TableRow>}
              {!loadingAct && (!activities || activities.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">All caught up!</TableCell></TableRow>
              )}
              {activities?.map((act, index) => (
                <TableRow key={act._id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedActivities.includes(act._id)}
                      onCheckedChange={(c) => handleSelectActivity(act._id, c)}
                    />
                  </TableCell>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{new Date(act.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{act.employee_id?.full_name}</TableCell>
                  <TableCell>{act.task_description}</TableCell>
                  <TableCell><ApprovalBadge status={act.approval_status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleApproveActivity(act._id)} disabled={approveActMutation.isPending}>
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovals;
