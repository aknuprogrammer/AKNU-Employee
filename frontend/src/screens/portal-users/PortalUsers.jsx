import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Upload, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "sonner";
import PortalUserForm from "./components/PortalUserForm";
import { useAuth } from "@/lib/auth-context";
import { parseExcel, downloadPortalUserTemplate } from "@/lib/excel";

export default function PortalUsersPage() {
  const { user: authUser } = useAuth();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["portalUsers"],
    queryFn: async () => {
      const { data } = await api.get('/portal-users');
      return data.data || [];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/portal-users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portalUsers"] });
      toast.success("User deleted");
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/portal-users/bulk', payload);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate dependent data first so that when portal users are refetched, the related names are available
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["sections"] });
      // Then invalidate portal users list
      qc.invalidateQueries({ queryKey: ["portalUsers"] });
      // Force immediate refetch to get latest data
      qc.refetchQueries({ queryKey: ["portalUsers"] });
      toast.success(data.message || "Bulk import successful");
      if (data.errors && data.errors.length > 0) {
        // Show the first few errors if any
        data.errors.slice(0, 3).forEach(err => toast.error(err));
      }
      setBulkModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || error.message || "Import failed");
    }
  });

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate(id);
    }
  };

  const onBulkImport = async (e) => {
    e.preventDefault();
    const file = e.target.elements?.file?.files?.[0];
    if (!file) return toast.error("Please select a file");
    
    try {
      const rows = await parseExcel(file);
      const payload = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        
        const fullName = String(r.full_name ?? "").trim();
        const email = String(r.email ?? "").trim();
        const dept = String(r.department ?? r.department_text ?? r.Department ?? "").trim();
        const section = String(r.section ?? r.section_text ?? r.Section ?? "").trim();
        let isHead = false;
        const headVal = String(r.is_section_head ?? r["Is Section Head"] ?? "").toLowerCase();
        if (headVal === "true" || headVal === "yes" || headVal === "1") {
          isHead = true;
        }
        const password = String(r.password ?? "").trim();

        // Skip empty rows
        if (!fullName && !email) continue;

        payload.push({
          full_name: fullName,
          email,
          department_text: dept,
          section_text: section,
          is_section_head: isHead,
          password
        });
      }

      if (!payload.length) return toast.error("No valid rows found in file");
      
      bulkImportMutation.mutate(payload);
    } catch (err) {
      toast.error("Failed to parse file");
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Administration</p>
          <h1 className="font-display text-4xl text-primary mt-1">
            {authUser?.role === "section_head" ? "Employees" : "Global Employees"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Manage users who can access the Daily Activity, Movement Register, and Attendance modules.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={downloadPortalUserTemplate} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkModalOpen(true)} className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" /> Bulk Import
          </Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Add User
              </Button>
            </DialogTrigger>
            <PortalUserForm onDone={() => setOpenNew(false)} />
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-x-auto">
        <Table>
          <TableHeader className="bg-primary/100">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">No portal users found.</TableCell>
              </TableRow>
            ) : (
              users?.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department_id?.name || "—"}</TableCell>
                  <TableCell>{u.section_id?.name || "—"}</TableCell>
                  <TableCell>{u.is_section_head ? "Head" : "Member"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditingUser(u)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(u._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(v) => !v && setEditingUser(null)}>
        <PortalUserForm initialData={editingUser} onDone={() => setEditingUser(null)} />
      </Dialog>

      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Portal Users</DialogTitle>
          </DialogHeader>
          <form onSubmit={onBulkImport} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Excel or CSV File</Label>
              <Input type="file" name="file" accept=".xlsx,.xls,.csv" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setBulkModalOpen(false)} disabled={bulkImportMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={bulkImportMutation.isPending}>
                {bulkImportMutation.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
