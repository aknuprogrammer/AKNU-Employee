import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/lib/auth-context";
import { useEmployeesList } from "../employees/hooks/useEmployees";
import { usePayslipDetails, useUpdatePayslip } from "./hooks/usePayslips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { toast } from "sonner";
import { Calculator, User, Calendar, Receipt, IndianRupee, Check, ChevronsUpDown, ArrowLeft, Trash2 } from "lucide-react";



const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EARN_MAP = {
  basic: "Basic",
  agp: "AGP",
  fp_inc: "FP. Inc",
  da_50: "D.A",
  pers_pay: "Pers. Pay",
  adv_incr: "Adv. Incr.",
  cca: "C.C.A",
  hra_10: "H.R.A",
  earn_misc: "Misc.",
  honorarium: "Honorarium",
  da_arrears: "DA Arrears",
  con_allow: "Con. Allow",
  spl_allow: "Spl. Allow",
};

const DED_MAP = {
  income_tax: "Income Tax",
  pf_sub: "P.F. Sub.",
  pf_loan: "P.F. Loan",
  lic: "L.I.C.",
  lic_hs_loan: "LIC Hs. Loan",
  prof_tax: "Prof Tax",
  ehs: "EHS",
  cps: "CPS",
  gpf: "GPF",
  gis: "GIS",
  cm_relief_fund: "CM Relief Fund",
  welfare_fund: "Welfare Fund",
  aknu_corpus: "AKNU Corpus",
  university_club: "University Club",
  tmacs: "Teachers Mutual Aided Cooperative Society",
  ded_misc: "Miscellaneous",
  epf: "EPF",
  esi: "ESI",
};

const EARN_FIELDS = Object.keys(EARN_MAP);
const DED_FIELDS = Object.keys(DED_MAP);

export default function NewPayslip() {
  const { isAccountant, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const now = new Date();

  const [employeeId, setEmployeeId] = useState(searchParams.get("employee") ?? "");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [month, setMonth] = useState(searchParams.get("month") ?? String(now.getMonth() + 1));
  const [year, setYear] = useState(searchParams.get("year") ?? String(now.getFullYear()));
  const [v, setV] = useState(
    Object.fromEntries([...EARN_FIELDS, ...DED_FIELDS].map((k) => [k, ""]))
  );
  const DEFAULT_RECOVERY_FIELDS = useMemo(() => ["Marriage Loan", "Vehicle Loan", "Loss of Pay", "Advance Recovery"], []);
  const [recoveryDeduList, setRecoveryDeduList] = useState(() =>
    DEFAULT_RECOVERY_FIELDS.map(name => ({ name, amount: "" }))
  );
  const [customEarningsList, setCustomEarningsList] = useState([]);
  const [customDeductionsList, setCustomDeductionsList] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: allEmployees, isLoading } = useEmployeesList();
  const employees = useMemo(() => {
    return [...(allEmployees?.filter((e) => e.is_active) ?? [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allEmployees]);

  const { data: payslipDetail } = usePayslipDetails(isEdit ? id : null);
  const updateMutation = useUpdatePayslip();

  useEffect(() => {
    if (isEdit && payslipDetail) {
      setEmployeeId(payslipDetail.employee_id?._id || payslipDetail.employee_id?.id || payslipDetail.employee_id);
      setMonth(String(payslipDetail.month));
      setYear(String(payslipDetail.year));
      
      const newV = { ...v };
      [...EARN_FIELDS, ...DED_FIELDS].forEach(k => {
        const val = payslipDetail[k] || 0;
        newV[k] = val > 0 ? new Intl.NumberFormat("en-IN").format(val) : "";
      });
      setV(newV);

      if (payslipDetail.recovery_dedu_breakdown && payslipDetail.recovery_dedu_breakdown.length > 0) {
        setRecoveryDeduList(
          payslipDetail.recovery_dedu_breakdown.map(item => ({
            name: item.name,
            amount: item.amount > 0 ? new Intl.NumberFormat("en-IN").format(item.amount) : ""
          }))
        );
      } else if (payslipDetail.recovery_dedu > 0) {
        setRecoveryDeduList([
          { name: "Recovery Deduction", amount: new Intl.NumberFormat("en-IN").format(payslipDetail.recovery_dedu) }
        ]);
      } else {
        setRecoveryDeduList(DEFAULT_RECOVERY_FIELDS.map(name => ({ name, amount: "" })));
      }

      if (payslipDetail.custom_earnings && payslipDetail.custom_earnings.length > 0) {
        setCustomEarningsList(
          payslipDetail.custom_earnings.map(item => ({
            name: item.name,
            amount: item.amount > 0 ? new Intl.NumberFormat("en-IN").format(item.amount) : ""
          }))
        );
      } else {
        setCustomEarningsList([]);
      }

      if (payslipDetail.custom_deductions && payslipDetail.custom_deductions.length > 0) {
        setCustomDeductionsList(
          payslipDetail.custom_deductions.map(item => ({
            name: item.name,
            amount: item.amount > 0 ? new Intl.NumberFormat("en-IN").format(item.amount) : ""
          }))
        );
      } else {
        setCustomDeductionsList([]);
      }
    }
  }, [isEdit, payslipDetail, DEFAULT_RECOVERY_FIELDS]);

  useEffect(() => {
    async function autoFill() {
      if (!isEdit && employeeId) {
        try {
          const { data } = await api.get(`/payslips/latest/${employeeId}`);
          if (data) {
            const newV = { ...v };
            let hasData = false;
            [...EARN_FIELDS, ...DED_FIELDS].forEach((k) => {
              const val = data[k] || 0;
              if (val > 0) {
                newV[k] = new Intl.NumberFormat("en-IN").format(val);
                hasData = true;
              }
            });
            if (hasData) {
              setV(newV);
              toast.success("Autofilled previous month's data");
            }

            if (data.recovery_dedu_breakdown && data.recovery_dedu_breakdown.length > 0) {
              setRecoveryDeduList(
                data.recovery_dedu_breakdown.map(item => ({
                  name: item.name,
                  amount: item.amount > 0 ? new Intl.NumberFormat("en-IN").format(item.amount) : ""
                }))
              );
            } else if (data.recovery_dedu > 0) {
              setRecoveryDeduList([
                { name: "Recovery Deduction", amount: new Intl.NumberFormat("en-IN").format(data.recovery_dedu) }
              ]);
            } else {
              setRecoveryDeduList(DEFAULT_RECOVERY_FIELDS.map(name => ({ name, amount: "" })));
            }

            if (data.custom_earnings && data.custom_earnings.length > 0) {
              setCustomEarningsList(
                data.custom_earnings.map(item => ({
                  name: item.name,
                  amount: item.amount > 0 ? new Intl.NumberFormat("en-IN").format(item.amount) : ""
                }))
              );
            } else {
              setCustomEarningsList([]);
            }

            if (data.custom_deductions && data.custom_deductions.length > 0) {
              setCustomDeductionsList(
                data.custom_deductions.map(item => ({
                  name: item.name,
                  amount: item.amount > 0 ? new Intl.NumberFormat("en-IN").format(item.amount) : ""
                }))
              );
            } else {
              setCustomDeductionsList([]);
            }
          }
        } catch (err) {
          // If 404 (no previous payslip), silently ignore
          if (err.response?.status !== 404) {
            console.error("Autofill error:", err);
          }
        }
      }
    }
    autoFill();
  }, [employeeId, isEdit, DEFAULT_RECOVERY_FIELDS]); // We only trigger on employeeId change

  const selectedEmp = employees?.find((e) => e._id === employeeId || e.id === employeeId);

  const parseNum = (val) => Number(Number(String(val || "").replace(/,/g, "")).toFixed(2)) || 0;

  const handleAmountChange = (k, value) => {
    let clean = value.replace(/[^0-9\.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) {
      clean = parts[0] + "." + parts.slice(1).join("");
    }
    setV({ ...v, [k]: clean });
  };

  const customEarningsSum = useMemo(() => customEarningsList.reduce((s, item) => s + parseNum(item.amount), 0), [customEarningsList]);
  const customDeductionsSum = useMemo(() => customDeductionsList.reduce((s, item) => s + parseNum(item.amount), 0), [customDeductionsList]);

  const gross = useMemo(() => EARN_FIELDS.reduce((s, k) => s + parseNum(v[k]), 0) + customEarningsSum, [v, customEarningsSum]);
  const totalRecovery = useMemo(() => recoveryDeduList.reduce((s, item) => s + parseNum(item.amount), 0), [recoveryDeduList]);
  const totalDed = useMemo(() => DED_FIELDS.reduce((s, k) => s + parseNum(v[k]), 0) + totalRecovery + customDeductionsSum, [v, totalRecovery, customDeductionsSum]);
  const net = gross - totalDed;

  const save = async () => {
    if (!selectedEmp) return toast.error("Select an employee");
    setSaving(true);
    const numeric = Object.fromEntries(
      [...EARN_FIELDS, ...DED_FIELDS].map((k) => [k, parseNum(v[k])]),
    );
    
    const payload = {
      month: Number(month),
      year: Number(year),
      ...numeric,
      recovery_dedu: totalRecovery,
      recovery_dedu_breakdown: recoveryDeduList
        .map(item => ({ name: item.name.trim(), amount: parseNum(item.amount) }))
        .filter(item => item.amount > 0 || item.name !== ""),
      custom_earnings: customEarningsList
        .map(item => ({ name: item.name.trim(), amount: parseNum(item.amount) }))
        .filter(item => item.amount > 0 || item.name !== ""),
      custom_deductions: customDeductionsList
        .map(item => ({ name: item.name.trim(), amount: parseNum(item.amount) }))
        .filter(item => item.amount > 0 || item.name !== ""),
      gross_salary: gross,
      total_deductions: totalDed,
      net_salary: net,
    };

    try {
      if (isEdit) {
        updateMutation.mutate({ id, data: payload }, {
          onSuccess: () => {
            setSaving(false);
            navigate('/payslips');
          },
          onError: () => setSaving(false)
        });
      } else {
        payload.employee_id = selectedEmp._id || selectedEmp.id;
        
        await api.post("/payslips", payload);
        setSaving(false);
        toast.success("Payslip created");
        navigate(`/payslips`);
      }
    } catch (error) {
      setSaving(false);
      toast.error(error.response?.data?.message || "Failed to save payslip");
    }
  };

  if (!isAccountant) return <div className="text-muted-foreground">Access restricted.</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center gap-3 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 -ml-2">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div className="p-3 bg-primary/10 rounded-xl">
          <Receipt className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {isEdit ? "Edit" : "Generate"}
          </p>
          <h1 className="font-display text-3xl text-primary mt-1">
            {isEdit ? "Edit Payslip" : "New Payslip"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Modify an existing salary record." : "Create a new monthly salary record for an employee."}
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-black/5">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" /> Employee Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1 space-y-1.5">
              <Label>Employee</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    disabled={isEdit}
                    className="w-full justify-between font-normal bg-background px-3"
                  >
                    {employeeId && selectedEmp
                      ? `${selectedEmp.employee_code} - ${selectedEmp.full_name}`
                      : "Select employee..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search employee..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((e) => {
                          const id = e._id || e.id;
                          return (
                            <CommandItem
                              key={id}
                              value={`${e.employee_code} ${e.full_name}`}
                              onSelect={() => {
                                setEmployeeId(id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${employeeId === id ? "opacity-100" : "opacity-0"}`}
                              />
                              {e.employee_code} - {e.full_name}
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
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md ring-1 ring-black/5 overflow-hidden">
          <div className="h-1 w-full bg-success/80" />
          <CardHeader className="bg-muted/10 border-b pb-3 pt-4">
            <CardTitle className="font-display text-lg text-success flex items-center gap-2">
              <IndianRupee className="w-5 h-5" /> Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-4">
            {EARN_FIELDS.map((k) => (
              <div key={k} className="flex justify-between items-center p-2 rounded hover:bg-muted/40 transition-colors">
                <Label className="text-sm font-medium text-muted-foreground cursor-pointer" htmlFor={`earn-${k}`}>{EARN_MAP[k]}</Label>
                <div className="relative w-32">
                  <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">₹</span>
                  <Input
                    id={`earn-${k}`}
                    type="text"
                    placeholder="0"
                    value={v[k]}
                    onChange={(e) => handleAmountChange(k, e.target.value)}
                    className="text-right pl-6 h-9 font-mono text-sm border-muted-foreground/20 focus-visible:ring-success/30"
                  />
                </div>
              </div>
            ))}
            <div className="border-t my-4 pt-4">
              <div className="flex justify-between items-center px-2 mb-3">
                <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Custom Earnings</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomEarningsList([...customEarningsList, { name: "", amount: "" }])}
                  className="h-8 text-xs gap-1 border-dashed hover:border-solid text-success hover:text-success/90"
                >
                  + Add Earning
                </Button>
              </div>

              <div className="space-y-2">
                {customEarningsList.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-1.5 rounded hover:bg-muted/40 transition-colors">
                    <Input
                      type="text"
                      placeholder="Earning Label (e.g. Special Allowance)"
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...customEarningsList];
                        newList[idx].name = e.target.value;
                        setCustomEarningsList(newList);
                      }}
                      className="flex-1 h-9 text-sm"
                    />
                    <div className="relative w-32 shrink-0">
                      <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">₹</span>
                      <Input
                        type="text"
                        placeholder="0"
                        value={item.amount}
                        onChange={(e) => {
                          let clean = e.target.value.replace(/[^0-9\.]/g, "");
                          const parts = clean.split(".");
                          if (parts.length > 2) {
                            clean = parts[0] + "." + parts.slice(1).join("");
                          }
                          const newList = [...customEarningsList];
                          newList[idx].amount = clean;
                          setCustomEarningsList(newList);
                        }}
                        className="text-right pl-6 h-9 font-mono text-sm border-muted-foreground/20 focus-visible:ring-success/30"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newList = customEarningsList.filter((_, i) => i !== idx);
                        setCustomEarningsList(newList);
                      }}
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

             <div className="border-t mt-4 pt-4 flex justify-between items-center px-2">
               <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Gross Salary</span>
               <span className="font-mono text-lg font-bold text-success">₹ {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gross)}</span>
             </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md ring-1 ring-black/5 overflow-hidden">
          <div className="h-1 w-full bg-destructive/80" />
          <CardHeader className="bg-muted/10 border-b pb-3 pt-4">
            <CardTitle className="font-display text-lg text-destructive flex items-center gap-2">
              <Calculator className="w-5 h-5" /> Deductions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-4">
            {DED_FIELDS.map((k) => (
              <div key={k} className="flex justify-between items-center p-2 rounded hover:bg-muted/40 transition-colors">
                <Label className="text-sm font-medium text-muted-foreground cursor-pointer" htmlFor={`ded-${k}`}>{DED_MAP[k]}</Label>
                <div className="relative w-32">
                  <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">₹</span>
                  <Input
                    id={`ded-${k}`}
                    type="text"
                    placeholder="0"
                    value={v[k]}
                    onChange={(e) => handleAmountChange(k, e.target.value)}
                    className="text-right pl-6 h-9 font-mono text-sm border-muted-foreground/20 focus-visible:ring-destructive/30"
                  />
                </div>
              </div>
            ))}

            <div className="border-t my-4 pt-4">
              <div className="flex justify-between items-center px-2 mb-3">
                <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Custom Deductions</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomDeductionsList([...customDeductionsList, { name: "", amount: "" }])}
                  className="h-8 text-xs gap-1 border-dashed hover:border-solid text-destructive hover:text-destructive/90"
                >
                  + Add Deduction
                </Button>
              </div>

              <div className="space-y-2 mb-4">
                {customDeductionsList.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-1.5 rounded hover:bg-muted/40 transition-colors">
                    <Input
                      type="text"
                      placeholder="Deduction Label (e.g. Society Fee)"
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...customDeductionsList];
                        newList[idx].name = e.target.value;
                        setCustomDeductionsList(newList);
                      }}
                      className="flex-1 h-9 text-sm"
                    />
                    <div className="relative w-32 shrink-0">
                      <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">₹</span>
                      <Input
                        type="text"
                        placeholder="0"
                        value={item.amount}
                        onChange={(e) => {
                          let clean = e.target.value.replace(/[^0-9\.]/g, "");
                          const parts = clean.split(".");
                          if (parts.length > 2) {
                            clean = parts[0] + "." + parts.slice(1).join("");
                          }
                          const newList = [...customDeductionsList];
                          newList[idx].amount = clean;
                          setCustomDeductionsList(newList);
                        }}
                        className="text-right pl-6 h-9 font-mono text-sm border-muted-foreground/20 focus-visible:ring-destructive/30"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newList = customDeductionsList.filter((_, i) => i !== idx);
                        setCustomDeductionsList(newList);
                      }}
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t my-4 pt-4">
              <div className="flex justify-between items-center px-2 mb-3">
                <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Recovery Deductions</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRecoveryDeduList([...recoveryDeduList, { name: "", amount: "" }])}
                  className="h-8 text-xs gap-1 border-dashed hover:border-solid"
                >
                  + Add Recovery
                </Button>
              </div>

              <div className="space-y-2">
                {recoveryDeduList.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-1.5 rounded hover:bg-muted/40 transition-colors">
                    <Input
                      type="text"
                      placeholder="Deduction Label (e.g. Marriage Loan)"
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...recoveryDeduList];
                        newList[idx].name = e.target.value;
                        setRecoveryDeduList(newList);
                      }}
                      className="flex-1 h-9 text-sm"
                    />
                    <div className="relative w-32 shrink-0">
                      <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">₹</span>
                      <Input
                        type="text"
                        placeholder="0"
                        value={item.amount}
                        onChange={(e) => {
                          let clean = e.target.value.replace(/[^0-9\.]/g, "");
                          const parts = clean.split(".");
                          if (parts.length > 2) {
                            clean = parts[0] + "." + parts.slice(1).join("");
                          }
                          const newList = [...recoveryDeduList];
                          newList[idx].amount = clean;
                          setRecoveryDeduList(newList);
                        }}
                        className="text-right pl-6 h-9 font-mono text-sm border-muted-foreground/20 focus-visible:ring-destructive/30"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newList = recoveryDeduList.filter((_, i) => i !== idx);
                        setRecoveryDeduList(newList);
                      }}
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

             <div className="border-t mt-4 pt-4 flex justify-between items-center px-2">
               <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Total Deductions</span>
               <span className="font-mono text-lg font-bold text-destructive">₹ {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDed)}</span>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="max-w-5xl mx-auto flex flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] font-semibold text-muted-foreground">Net Salary</p>
             <p className="font-display text-2xl sm:text-3xl text-primary font-bold">
               ₹ {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(net)}
             </p>
          </div>
          <Button size="lg" className="h-10 sm:h-12 px-4 sm:px-8 text-sm sm:text-md shadow-lg shrink-0" onClick={save} disabled={saving}>
            {saving ? "Saving..." : (isEdit ? "Update" : "Generate Payslip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
