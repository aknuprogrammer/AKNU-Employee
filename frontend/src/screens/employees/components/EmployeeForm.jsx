import { useState, useEffect } from "react";
import { useCreateEmployee, useUpdateEmployee, useCreateDepartment, useCreateCategory } from "../hooks/useEmployees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeForm({ depts, cats, onDone, initialData = null }) {
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxSearch, setComboboxSearch] = useState("");
  const createDeptMutation = useCreateDepartment();

  const [catOpen, setCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const createCatMutation = useCreateCategory();

  const [form, setForm] = useState({
    employee_code: "",
    full_name: "",
    email: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        employee_code: initialData.employee_code || "",
        full_name: initialData.full_name || "",
        email: initialData.email || "",
      });
    }
  }, [initialData]);

  const createMutation = useCreateEmployee(onDone);
  const updateMutation = useUpdateEmployee(onDone);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSave = () => {
    if (!form.full_name) {
      toast.error("Full Name is a mandatory field.");
      return;
    }

    if (form.email && form.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        toast.error("Invalid email format. Sample: name@example.com");
        return;
      }
    }

    const payload = {
      employee_code: form.employee_code ? form.employee_code.trim() : "",
      full_name: form.full_name,
      email: form.email || null,
    };

    if (initialData) {
      updateMutation.mutate({ id: initialData._id || initialData.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCreateDepartment = () => {
    if (!comboboxSearch.trim()) return;
    createDeptMutation.mutate(comboboxSearch, {
      onSuccess: (newDept) => {
        setForm({ ...form, department_id: newDept._id || newDept.id });
        setComboboxOpen(false);
        setComboboxSearch("");
      }
    });
  };

  const handleCreateCategory = () => {
    if (!catSearch.trim()) return;
    createCatMutation.mutate(catSearch, {
      onSuccess: (newCat) => {
        setForm({ ...form, category: newCat._id || newCat.id });
        setCatOpen(false);
        setCatSearch("");
      }
    });
  };

  const F = (k, label, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
      />
    </div>
  );

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display">
          {initialData ? "Edit Employee" : "New Employee"}
        </DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
        {F("full_name", "Full Name *")}
        {F("employee_code", "Employee Id (Optional)")}
        {F("email", "Email (Optional)", "email")}
      </div>
      <DialogFooter>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Employee"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
