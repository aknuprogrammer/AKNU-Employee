import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, Eye, EyeOff } from "lucide-react";
import api from "@/services/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

export default function PortalUserForm({ initialData = null, onDone }) {
  const { user } = useAuth();
  const isSectionHead = user?.role === 'section_head' || user?.is_section_head === true;
  const qc = useQueryClient();
  const [deptOpen, setDeptOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    department_id: "",
    section_id: "",
    role: "section_member",
    is_section_head: false,
  });

  const [deptSearch, setDeptSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");

  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await api.get(`/departments?t=${Date.now()}`);
      return data || [];
    }
  });

  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data } = await api.get(`/sections?t=${Date.now()}`);
      return data.data || []; // sections API wraps in { success, data }
    }
  });

  const headSectionId = user?.section_id?._id || user?.section_id || sections?.[0]?._id || "";
  const headSectionName = user?.section_id?.name || sections?.find(s => s._id === headSectionId)?.name || sections?.[0]?.name || "";

  const createDeptMutation = useMutation({
    mutationFn: async (name) => {
      const { data } = await api.post('/departments', { name });
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["departments"], (old) => [...(old || []), data]);
      setForm(prev => ({ ...prev, department_id: data._id || data.id }));
      setDeptOpen(false);
      setDeptSearch("");
      toast.success("Department created");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create department");
    }
  });

  const createSectionMutation = useMutation({
    mutationFn: async (name) => {
      const { data } = await api.post('/sections', { name });
      return data.data; // sections API wraps in { success, data }
    },
    onSuccess: (data) => {
      qc.setQueryData(["sections"], (old) => [...(old || []), data]);
      setForm(prev => ({ ...prev, section_id: data._id || data.id }));
      setSectionOpen(false);
      setSectionSearch("");
      toast.success("Section created");
      qc.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create section");
    }
  });

  useEffect(() => {
    if (initialData) {
      const currentRole = initialData.role || (initialData.is_section_head ? 'section_head' : 'section_member');
      setForm({
        full_name: initialData.full_name || "",
        email: initialData.email || "",
        password: initialData.plain_password || "",
        department_id: initialData.department_id?._id || initialData.department_id || "",
        section_id: isSectionHead ? headSectionId : (initialData.section_id?._id || initialData.section_id || ""),
        role: isSectionHead && currentRole === 'section_head' ? 'section_member' : currentRole,
        is_section_head: false,
      });
    } else if (isSectionHead && headSectionId) {
      setForm(prev => ({
        ...prev,
        section_id: headSectionId,
        department_id: prev.department_id || user?.department_id?._id || user?.department_id || "",
        role: prev.role === 'section_head' ? 'section_member' : (prev.role || 'section_member'),
        is_section_head: false,
      }));
    }
  }, [initialData, isSectionHead, headSectionId, user]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (initialData) {
        if (!payload.password) delete payload.password; // don't send empty password
        const { data } = await api.put(`/portal-users/${initialData._id}`, payload);
        return data;
      } else {
        const { data } = await api.post('/portal-users', payload);
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portalUsers"] });
      toast.success(initialData ? "User updated" : "User created");
      if (!initialData) {
        setForm({
          full_name: "",
          email: "",
          password: "",
          department_id: isSectionHead ? (user?.department_id?._id || user?.department_id || "") : "",
          section_id: isSectionHead ? headSectionId : "",
          role: "section_member",
          is_section_head: false,
        });
      }
      if (onDone) onDone();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to save user");
    }
  });

  const onSave = () => {
    if (!form.full_name || !form.email) return toast.error("Name and Email are required");
    if (!initialData && !form.password) return toast.error("Password is required for new users");
    
    let assignedRole = form.role || 'section_member';
    if (isSectionHead && assignedRole === 'section_head') {
      assignedRole = 'section_member';
    }

    const payload = { 
      ...form,
      role: assignedRole,
      is_section_head: !isSectionHead && assignedRole === 'section_head',
    };
    if (isSectionHead) {
      payload.section_id = headSectionId;
    }
    mutation.mutate(payload);
  };

  const F = (k, label, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        placeholder={label}
        className="h-9"
      />
    </div>
  );

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{initialData ? "Edit User" : "New User"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
        {F("full_name", "Full Name *")}
        {F("email", "Email *", "email")}
        
        <div className="space-y-1.5">
          <Label className="text-xs">{initialData ? "Password" : "Password *"}</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={initialData ? "Leave blank or edit password" : "Password *"}
              className="h-9 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Department (Optional)</Label>
          <Popover open={deptOpen} onOpenChange={setDeptOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={deptOpen}
                className="w-full justify-between h-9 font-normal px-3"
              >
                <span className="truncate">
                  {form.department_id
                    ? depts?.find((d) => d._id === form.department_id)?.name || "Select Department"
                    : "Select Department"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
              <Command>
                <CommandInput placeholder="Search department..." value={deptSearch} onValueChange={setDeptSearch} />
                <CommandList onWheel={(e) => e.stopPropagation()}>
                  <CommandEmpty>
                    <div className="flex flex-col items-center justify-center p-2 gap-2">
                      <p className="text-sm text-muted-foreground">No department found.</p>
                      {deptSearch && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={(e) => { e.preventDefault(); createDeptMutation.mutate(deptSearch); }}
                          disabled={createDeptMutation.isPending}
                        >
                          Create "{deptSearch}"
                        </Button>
                      )}
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {depts?.map((d) => (
                      <CommandItem
                        key={d._id}
                        value={d.name}
                        onSelect={() => {
                          setForm({ ...form, department_id: d._id });
                          setDeptOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${form.department_id === d._id ? "opacity-100" : "opacity-0"}`}
                        />
                        {d.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {isSectionHead ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Section Name *</Label>
            <Input 
              type="text" 
              value={headSectionName || "Loading..."} 
              disabled 
              readOnly 
              className="h-9 bg-muted text-foreground font-medium cursor-not-allowed select-none" 
            />
            <p className="text-[11px] text-muted-foreground">Locked to your assigned section</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs">Section Name *</Label>
            <Popover open={sectionOpen} onOpenChange={setSectionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sectionOpen}
                  className="w-full justify-between h-9 font-normal px-3"
                >
                  <span className="truncate">
                    {form.section_id
                      ? sections?.find((s) => s._id === form.section_id)?.name || "Select Section"
                      : "Select Section"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                <Command>
                  <CommandInput placeholder="Search section..." value={sectionSearch} onValueChange={setSectionSearch} />
                  <CommandList onWheel={(e) => e.stopPropagation()}>
                    <CommandEmpty>
                      <div className="flex flex-col items-center justify-center p-2 gap-2">
                        <p className="text-sm text-muted-foreground">No section found.</p>
                        {sectionSearch && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={(e) => { e.preventDefault(); createSectionMutation.mutate(sectionSearch); }}
                            disabled={createSectionMutation.isPending}
                          >
                            Create "{sectionSearch}"
                          </Button>
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {sections?.map((s) => (
                        <CommandItem
                          key={s._id}
                          value={s.name}
                          onSelect={() => {
                            setForm({ ...form, section_id: s._id });
                            setSectionOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${form.section_id === s._id ? "opacity-100" : "opacity-0"}`}
                          />
                          {s.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Role in Section *</Label>
          <Select 
            value={isSectionHead && form.role === 'section_head' ? 'section_member' : (form.role || "section_member")} 
            onValueChange={(v) => setForm({ 
              ...form, 
              role: v, 
              is_section_head: v === "section_head" 
            })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="section_member">Section Member</SelectItem>
              <SelectItem value="junior_assistant">Junior Assistant (Inward/Outward)</SelectItem>
              {!isSectionHead && <SelectItem value="section_head">Section Head</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={onSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : "Save User"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
