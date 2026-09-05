import React, { useState } from 'react';
import { useRegisters, useSubmitRegister } from '../../hooks/useRegisters';
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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export const OutwardRegister = () => {
  const { user } = useAuth();
  const defaultSectionId = user?.role === 'master_admin' ? 'all' : (user?.employee_id?.section_id || '');
  
  const [filters, setFilters] = useState({
    section_id: defaultSectionId,
    startDate: '',
    endDate: '',
    search: ''
  });

  const { data: registers, isLoading } = useRegisters('Outward', filters);
  const submitMutation = useSubmitRegister();

  const [openNew, setOpenNew] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference_number: '',
    party_name: '',
    subject: '',
    dispatch_mode: '',
    dispatch_details: ''
  });
  // State for selected files
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const oversized = selected.filter(f => f.size > 3 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error('Each file must be ≤ 3 MB');
      return;
    }
    setFiles(selected);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
      submitMutation.mutate({
        type: 'Outward',
        section_id: user?.employee_id?.section_id,
        ...formData,
        attachments: files
    }, {
      onSuccess: () => {
        toast.success('Outward entry added successfully');
        setOpenNew(false);
        setFormData({ ...formData, reference_number: '', party_name: '', subject: '', dispatch_mode: '', dispatch_details: '' });
      },
      onError: (err) => toast.error(err.message)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Registers</p>
          <h1 className="font-display text-4xl text-primary mt-1">Outward Register</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Track outgoing documents
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {user?.role === 'master_admin' && (
            <ExportButton 
              data={registers} 
              filename="Outward_Register"
              columns={[
                { header: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
                { header: 'Section', accessor: (r) => r.section_id?.name || '—' },
                { header: 'Outward No', accessor: (r) => r.reference_number },
                { header: 'Recipient', accessor: (r) => r.party_name },
                { header: 'Subject', accessor: (r) => r.subject },
                { header: 'Mode', accessor: (r) => r.dispatch_mode },
                { header: 'Status', accessor: (r) => r.status }
              ]}
            />
          )}
          {user?.role !== 'master_admin' && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> New Entry
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Outward Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Date Dispatched</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Outward Number</Label>
                  <Input value={formData.reference_number} onChange={e => setFormData({...formData, reference_number: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Recipient Name / Organization</Label>
                  <Input value={formData.party_name} onChange={e => setFormData({...formData, party_name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Mode of Dispatch</Label>
                  <Select value={formData.dispatch_mode} onValueChange={v => setFormData({...formData, dispatch_mode: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="By Hand">By Hand</SelectItem>
                      <SelectItem value="Post">Post</SelectItem>
                      <SelectItem value="Courier">Courier</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dispatch Details / Tracking</Label>
                  <Input value={formData.dispatch_details} onChange={e => setFormData({...formData, dispatch_details: e.target.value})} />
                </div>
                {/* File upload input */}
                <div className="space-y-2">
                  <Label>Attachments</Label>
                  <Input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? 'Saving...' : 'Save Entry'}
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
              <TableHead>Section</TableHead>
              <TableHead>Outward No.</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && (!registers || registers.length === 0) && (
              <TableRow><TableCell colSpan={8} className="text-center py-8">No records found.</TableCell></TableRow>
            )}
            {registers?.map((reg, index) => (
              <TableRow key={reg._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{new Date(reg.date).toLocaleDateString()}</TableCell>
                <TableCell>{reg.section_id?.name || '—'}</TableCell>
                <TableCell className="font-mono">{reg.reference_number}</TableCell>
                <TableCell>{reg.party_name}</TableCell>
                <TableCell>{reg.subject}</TableCell>
                <TableCell>{reg.dispatch_mode}</TableCell>
                <TableCell><ApprovalBadge status={reg.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OutwardRegister;
