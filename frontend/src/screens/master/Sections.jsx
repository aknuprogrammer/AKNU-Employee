import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Edit, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Sections = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    section_head: ''
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const res = await api.get('/sections');
      return res.data.data;
    }
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/auth/users');
      return res.data.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) {
        return api.put(`/sections/${editingId}`, data);
      } else {
        return api.post('/sections', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sections']);
      toast.success(`Section ${editingId ? 'updated' : 'created'} successfully`);
      setOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message);
    }
  });

  const resetForm = () => {
    setFormData({ name: '', section_head: '' });
    setEditingId(null);
  };

  const handleEdit = (section) => {
    setFormData({
      name: section.name,
      section_head: section.section_head?._id || ''
    });
    setEditingId(section._id);
    setOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Master Data</p>
          <h1 className="font-display text-4xl text-primary mt-1">Sections Master</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage university sections and assign Section Heads.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={open} onOpenChange={(val) => {
            if (!val) resetForm();
            setOpen(val);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Section' : 'Create New Section'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Section Name</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. Examination Section"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign Section Head (Employee)</Label>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {formData.section_head
                          ? (() => {
                              const selectedUser = users?.find((u) => u._id === formData.section_head);
                              return selectedUser ? `${selectedUser.employee_id?.full_name} (${selectedUser.employee_id?.designation})` : "Select an employee...";
                            })()
                          : "Select an employee..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search employee..." />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            {users?.map((u) => (
                              <CommandItem
                                key={u._id}
                                value={`${u.employee_id?.full_name} ${u.employee_id?.designation}`}
                                onSelect={() => {
                                  setFormData({ ...formData, section_head: u._id });
                                  setPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.section_head === u._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {u.employee_id?.full_name} ({u.employee_id?.designation})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigning a head will upgrade their account role automatically.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Section'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary/100">
            <TableRow>
              <TableHead className="w-[80px]">S.No</TableHead>
              <TableHead>Section Name</TableHead>
              <TableHead>Current Head</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
            )}
            {!isLoading && sections?.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8">No sections found.</TableCell></TableRow>
            )}
            {sections?.map((section, index) => (
              <TableRow key={section._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{section.name}</TableCell>
                <TableCell>
                  {section.section_head ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {section.section_head.employee_id?.full_name?.charAt(0) || 'U'}
                      </div>
                      <span>{section.section_head.employee_id?.full_name || section.section_head.email}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-sm">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(section)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Sections;
