import React, { useState, useEffect } from 'react';
import { useSectionEmployees, useSubmitAttendance } from '../../hooks/useAttendance';
import { useAuth } from '@/lib/auth-context';
import { AttendanceGrid } from '../../components/registers/AttendanceGrid';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const EmployeeAttendance = () => {
  const { user } = useAuth();
  const sectionId = user?.employee_id?.section_id; 

  const { data: employees, isLoading } = useSectionEmployees(sectionId);
  const submitMutation = useSubmitAttendance();

  const [attendanceState, setAttendanceState] = useState({});

  // Initialize state with default 'Present' when employees load
  useEffect(() => {
    if (employees) {
      const initialState = {};
      employees.forEach(emp => {
        initialState[emp._id] = { status: 'Present', remarks: '' };
      });
      setAttendanceState(initialState);
    }
  }, [employees]);

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

    const payload = {
      date: new Date(),
      section_id: sectionId,
      type: 'employee',
      records
    };

    submitMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Attendance Finalized');
      },
      onError: (err) => {
        toast.error('Failed to submit: ' + err.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Section Management</p>
          <h1 className="font-display text-4xl text-primary mt-1">Employee Attendance</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Log attendance for your section • {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleSubmit} disabled={submitMutation.isPending || isLoading} className="w-full sm:w-auto">
            {submitMutation.isPending ? 'Saving...' : 'Finalize Attendance'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading employees...</div>
      ) : (
        <AttendanceGrid 
          employees={employees}
          attendanceState={attendanceState}
          onStatusChange={handleStatusChange}
          onRemarksChange={handleRemarksChange}
        />
      )}
    </div>
  );
};

export default EmployeeAttendance;
