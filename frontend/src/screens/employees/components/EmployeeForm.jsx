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
    designation: "",
    department_id: "",
    category: "",
    place_of_working: "",
    pan_number: "",
    cfms_id: "",
    pran_number: "",
    aadhaar_number: "",
    joining_date: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        employee_code: initialData.employee_code || "",
        full_name: initialData.full_name || "",
        email: initialData.email || "",
        designation: initialData.designation || "",
        department_id: initialData.department_id?._id || initialData.department_id?.id || initialData.department_id || "",
        category: initialData.category?._id || initialData.category?.id || initialData.category || "",
        place_of_working: initialData.place_of_working || "",
        pan_number: initialData.pan_number || "",
        cfms_id: initialData.cfms_id || "",
        pran_number: initialData.pran_number || "",
        aadhaar_number: initialData.aadhaar_number || "",
        joining_date: initialData.joining_date ? new Date(initialData.joining_date).toISOString().split('T')[0] : "",
      });
    }
  }, [initialData]);

  const createMutation = useCreateEmployee(onDone);
  const updateMutation = useUpdateEmployee(onDone);
  const saving = createMutation.isPending || updateMutation.isPending;

  const onSave = () => {
    if (!form.full_name || !form.aadhaar_number) {
      toast.error("Full Name and Aadhaar Number are mandatory fields.");
      return;
    }

    if (form.email && form.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        toast.error("Invalid email format. Sample: name@example.com");
        return;
      }
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(form.aadhaar_number)) {
      toast.error("Invalid Aadhaar format. It must be exactly 12 numeric digits.");
      return;
    }

    if (form.pan_number) {
      form.pan_number = form.pan_number.toUpperCase();
    }

    const payload = {
      employee_code: form.employee_code ? form.employee_code.trim() : "",
      full_name: form.full_name,
      email: form.email || null,
      designation: form.designation,
      department_id: form.department_id || null,
      category: form.category || null,
      place_of_working: form.place_of_working || null,
      pan_number: form.pan_number || null,
      cfms_id: form.cfms_id || null,
      pran_number: form.pran_number || null,
      aadhaar_number: form.aadhaar_number || null,
      joining_date: form.joining_date || null,
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
        {F("designation", "Designation")}
        <div className="space-y-1.5">
          <Label className="text-xs">Department</Label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen} modal={true}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full justify-between font-normal"
              >
                {form.department_id
                  ? depts.find((d) => d._id === form.department_id || d.id === form.department_id)?.name
                  : "Select or type to create..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search department..." 
                  value={comboboxSearch}
                  onValueChange={setComboboxSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="flex flex-col items-center p-4">
                      <p className="text-sm text-muted-foreground mb-2">No department found.</p>
                      <Button size="sm" onClick={handleCreateDepartment} disabled={createDeptMutation.isPending}>
                        Create "{comboboxSearch}"
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {depts.map((d) => {
                      const id = d._id || d.id;
                      return (
                        <CommandItem
                          key={id}
                          value={d.name}
                          onSelect={() => {
                            setForm({ ...form, department_id: id });
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${form.department_id === id ? "opacity-100" : "opacity-0"}`}
                          />
                          {d.name}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Popover open={catOpen} onOpenChange={setCatOpen} modal={true}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={catOpen}
                className="w-full justify-between font-normal"
              >
                {form.category
                  ? cats?.find((c) => c._id === form.category || c.id === form.category)?.name
                  : "Select or type to create..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search category..." 
                  value={catSearch}
                  onValueChange={setCatSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="flex flex-col items-center p-4">
                      <p className="text-sm text-muted-foreground mb-2">No category found.</p>
                      <Button size="sm" onClick={handleCreateCategory} disabled={createCatMutation.isPending}>
                        Create "{catSearch}"
                      </Button>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {cats?.map((c) => {
                      const id = c._id || c.id;
                      return (
                        <CommandItem
                          key={id}
                          value={c.name}
                          onSelect={() => {
                            setForm({ ...form, category: id });
                            setCatOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${form.category === id ? "opacity-100" : "opacity-0"}`}
                          />
                          {c.name}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {F("place_of_working", "Place of Working")}
        {F("pan_number", "PAN Number")}
        {F("cfms_id", "CFMS ID")}
        {F("pran_number", "PRAN Number")}
        {F("aadhaar_number", "Aadhaar Number (12 digits)")}
        {F("joining_date", "Joining Date", "date")}
      </div>
      <DialogFooter>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Employee"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
