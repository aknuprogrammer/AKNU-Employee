import React, { useState } from 'react';
import { useRegisters, useSubmitRegister, useUpdateRegister } from '../../hooks/useRegisters';
import { useSectionEmployees } from '../../hooks/useAttendance';
import { useAuth } from '@/lib/auth-context';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const MovementRegister = () => {
  const { user } = useAuth();
  const showSection = user?.role !== 'employee';
  const defaultSectionId = user?.role === 'master_admin' ? 'all' : (user?.employee_id?.section_id || '');

  const [filters, setFilters] = useState({
    section_id: defaultSectionId,
    startDate: '',
    endDate: '',
    search: ''
  });

  const { data: registers, isLoading } = useRegisters('Movement', filters);
  const { data: employees } = useSectionEmployees(user?.employee_id?.section_id);
  const submitMutation = useSubmitRegister();
  const updateMutation = useUpdateRegister();

  const [openNew, setOpenNew] = useState(false);
  
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    employee_id: '',
    reason: '',
    place_of_visit: '',
    out_time: getCurrentTime(),
    expected_in_time: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate({
      type: 'Movement',
      section_id: user?.employee_id?.section_id,
      ...formData,
      employee_id: user?.role === 'employee' ? user.employee_id : formData.employee_id
    }, {
      onSuccess: () => {
        toast.success('Movement logged successfully');
        setOpenNew(false);
        setFormData({ ...formData, employee_id: '', reason: '', place_of_visit: '', expected_in_time: '', out_time: getCurrentTime() });
      },
      onError: (err) => toast.error(err.message)
    });
  };

  const markReturnTime = (id) => {
    updateMutation.mutate({
      id,
      actual_in_time: getCurrentTime()
    }, {
      onSuccess: () => toast.success('Return time marked'),
      onError: (err) => toast.error(err.message)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Registers</p>
          <h1 className="font-display text-4xl text-primary mt-1">Movement Register</h1>
          {user?.role === 'employee' && (
            <p className="text-sm text-muted-foreground mt-2">Section: {user?.employee_id?.section_id?.name}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Track employee out-of-office movements
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {user?.role === 'master_admin' && (
            <ExportButton 
              data={registers} 
              filename="Movement_Register"
              columns={[
                { header: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
                ...(showSection ? [{ header: 'Section', accessor: (r) => r.section_id?.name || '—' }] : []),
                { header: 'Employee', accessor: (r) => r.employee_id?.full_name || '—' },
                { header: 'Reason', accessor: (r) => r.reason },
                { header: 'Place', accessor: (r) => r.place_of_visit },
                { header: 'Out Time', accessor: (r) => r.out_time },
                { header: 'In Time', accessor: (r) => r.actual_in_time || '—' },
                { header: 'Status', accessor: (r) => r.status }
              ]}
            />
          )}
          {user?.role !== 'master_admin' && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> Log Movement
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Employee Movement</DialogTitle>
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
                  <Label>Reason</Label>
                  <Input value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Place of Visit</Label>
                  <Input value={formData.place_of_visit} onChange={e => setFormData({...formData, place_of_visit: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Out Time</Label>
                    <Input type="time" value={formData.out_time} onChange={e => setFormData({...formData, out_time: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected In Time</Label>
                    <Input type="time" value={formData.expected_in_time} onChange={e => setFormData({...formData, expected_in_time: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? 'Saving...' : 'Save Movement'}
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
              <TableHead>Date</TableHead>
              {showSection && <TableHead>Section</TableHead>}
              <TableHead>Employee</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Place</TableHead>
              <TableHead>Out Time</TableHead>
              <TableHead>In Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (!registers || registers.length === 0) && (
              <TableRow><TableCell colSpan={9} className="text-center py-8">No records found.</TableCell></TableRow>
            )}
            {registers?.map((reg, index) => (
              <TableRow key={reg._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{new Date(reg.date).toLocaleDateString()}</TableCell>
                {showSection && <TableCell>{reg.section_id?.name || '—'}</TableCell>}
                <TableCell className="font-medium">{reg.employee_id?.full_name}</TableCell>
                <TableCell>{reg.reason}</TableCell>
                <TableCell>{reg.place_of_visit}</TableCell>
                <TableCell>{reg.out_time}</TableCell>
                <TableCell>
                  {reg.actual_in_time ? (
                    reg.actual_in_time
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => markReturnTime(reg._id)} disabled={updateMutation.isPending}>
                      <Clock className="h-3 w-3 mr-1" /> Mark Return
                    </Button>
                  )}
                </TableCell>
                <TableCell><ApprovalBadge status={reg.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MovementRegister;
