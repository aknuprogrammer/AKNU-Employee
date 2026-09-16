import React, { useState } from 'react';
import { useRegisters, useSubmitRegister } from '../../hooks/useRegisters';
import { useSectionEmployees } from '../../hooks/useAttendance';
import { useAuth } from '@/lib/auth-context';
import { FilterBar } from '../../components/shared/FilterBar';
import { ExportButton } from '../../components/shared/ExportButton';
import { PrintButton } from '../../components/shared/PrintButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ApprovalBadge } from '../../components/registers/ApprovalBadge';
import { AttachmentViewer } from '../../components/registers/AttachmentViewer';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export const InwardRegister = () => {
  const { user } = useAuth();
  // Section Head and Junior Assistant belong to a specific section. 
  // Master Admin will use 'all' or selected filter.
  const userSectionId = user?.section_id?._id || user?.section_id || user?.employee_id?.section_id || '';
  const defaultSectionId = user?.role === 'master_admin' ? 'all' : userSectionId;
  
  const [filters, setFilters] = useState({
    section_id: defaultSectionId,
    startDate: '',
    endDate: '',
    search: ''
  });

  const { data: registers, isLoading } = useRegisters('Inward', filters);
  // Fetch employees only if we have a specific section to assign forwarding to
  // Assuming a junior_assistant only forwards to people in their own section
  const { data: employees } = useSectionEmployees(userSectionId);
  const submitMutation = useSubmitRegister();

  const [openNew, setOpenNew] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference_number: '',
    party_name: '',
    subject: '',
    forwarded_to: ''
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

  const formatForwardedTo = (fwd) => {
    if (!fwd) return '—';
    const name = fwd.full_name || '—';
    const sec = fwd.section_id?.name || '';
    return sec ? `${name} (${sec})` : name;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate({
      type: 'Inward',
      section_id: userSectionId,
      ...formData,
      attachments: files
    }, {
      onSuccess: () => {
        toast.success('Inward entry added successfully');
        setOpenNew(false);
        setFormData({ ...formData, reference_number: '', party_name: '', subject: '', forwarded_to: '' });
        setFiles([]);
      },
      onError: (err) => toast.error(err.message)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Registers</p>
          <h1 className="font-display text-4xl text-primary mt-1">Inward Register</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Track incoming documents
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          {user?.role === 'master_admin' && (
            <>
              <ExportButton 
                data={registers} 
                filename="Inward_Register"
                buttonText="Export XLSX"
                columns={[
                  { header: 'S.No', accessor: (_, idx) => idx + 1 },
                  { header: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
                  { header: 'Section', accessor: (r) => r.section_id?.name || '—' },
                  { header: 'Inward No', accessor: (r) => r.reference_number },
                  { header: 'Sender', accessor: (r) => r.party_name },
                  { header: 'Subject', accessor: (r) => r.subject },
                  { header: 'Forwarded To', accessor: (r) => formatForwardedTo(r.forwarded_to) },
                  { header: 'Status', accessor: (r) => r.status }
                ]}
              />
              <PrintButton
                data={registers}
                title="Inward Register Report"
                buttonText="Print Report"
                metaInfo={[
                  { label: 'Date Range', value: `${filters.startDate} to ${filters.endDate}` },
                  { label: 'Scope', value: filters.section_id === 'all' ? 'All Sections' : 'Filtered Section' }
                ]}
                summary={[
                  { label: 'Total Inward Letters', value: registers?.length || 0 }
                ]}
                columns={[
                  { header: 'S.No', accessor: (_, idx) => idx + 1 },
                  { header: 'Date', accessor: (r) => new Date(r.date).toLocaleDateString() },
                  { header: 'Section', accessor: (r) => r.section_id?.name || '—' },
                  { header: 'Inward No', accessor: (r) => r.reference_number },
                  { header: 'Sender / Party', accessor: (r) => r.party_name },
                  { header: 'Subject', accessor: (r) => r.subject },
                  { header: 'Forwarded To', accessor: (r) => formatForwardedTo(r.forwarded_to) },
                  { header: 'Status', accessor: (r) => r.status }
                ]}
              />
            </>
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
                <DialogTitle>New Inward Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Date Received</Label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Inward Number</Label>
                  <Input value={formData.reference_number} onChange={e => setFormData({...formData, reference_number: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Sender Name / Organization</Label>
                  <Input value={formData.party_name} onChange={e => setFormData({...formData, party_name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Forward To</Label>
                  <Select value={formData.forwarded_to} onValueChange={v => setFormData({...formData, forwarded_to: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map(emp => {
                        const secName = emp.section_id?.name || (typeof emp.section_id === 'string' ? emp.section_id : '') || (user?.section_id?.name || 'Section');
                        return (
                          <SelectItem key={emp._id} value={emp._id}>
                            {emp.full_name} ({secName})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
              <TableHead>Inward No.</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Forwarded To</TableHead>
              <TableHead>Attachment</TableHead>
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
                <TableCell>{reg.section_id?.name || '—'}</TableCell>
                <TableCell className="font-mono">{reg.reference_number}</TableCell>
                <TableCell>{reg.party_name}</TableCell>
                <TableCell>{reg.subject}</TableCell>
                <TableCell>{formatForwardedTo(reg.forwarded_to)}</TableCell>
                <TableCell><AttachmentViewer attachments={reg.attachments} /></TableCell>
                <TableCell><ApprovalBadge status={reg.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default InwardRegister;
