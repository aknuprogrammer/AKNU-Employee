
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, UserCheck, FileText, IndianRupee } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Legend,
} from "recharts";



const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const yearsList = ["2030", "2029", "2028", "2027", "2026", "2025"];

export default function DashboardPage() {
  const { isAccountant, user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [empRes, payRes] = await Promise.all([
        api.get("/employees"),
        api.get("/payslips"),
      ]);
      const emps = empRes.data ?? [];
      const ps = payRes.data ?? [];

      const monthly = {};
      ps.forEach((p) => {
        const k = `${p.year}-${String(p.month).padStart(2, "0")}`;
        monthly[k] = (monthly[k] ?? 0) + Number(p.net_salary);
      });
      const monthlyArr = Object.entries(monthly)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([k, v]) => {
          const [y, m] = k.split("-");
          return { label: `${MONTHS[Number(m) - 1]} ${y.slice(2)}`, total: v };
        });

      const deptMap = {};
      emps.forEach((e) => {
        const name = e.department_id?.name ?? "Unassigned";
        deptMap[name] = (deptMap[name] ?? 0) + 1;
      });
      const deptArr = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

      const yearly = {};
      ps.forEach((p) => {
        yearly[p.year] = (yearly[p.year] ?? 0) + Number(p.net_salary);
      });
      const yearlyArr = Object.entries(yearly)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, total]) => ({ label: year, total }));

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const monthExpense = ps
        .filter((p) => p.month === currentMonth && p.year === currentYear)
        .reduce((s, p) => s + Number(p.net_salary), 0);

      return {
        totalEmployees: emps.length,
        activeEmployees: emps.filter((e) => e.is_active).length,
        totalPayslips: ps.length,
        monthExpense,
        monthlyArr,
        deptArr,
        yearlyArr,
        rawPayslips: ps,
      };
    },
    enabled: user?.role === 'admin',
  });

  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const filteredStats = useMemo(() => {
    const rawPayslips = stats?.rawPayslips ?? [];
    const m = Number(selectedMonth);
    const y = Number(selectedYear);

    const filtered = rawPayslips.filter(
      (p) => p.is_active !== false && Number(p.month) === m && Number(p.year) === y
    );

    const payslipsCount = filtered.length;
    const expense = filtered.reduce((s, p) => s + Number(p.net_salary), 0);

    return { payslipsCount, expense };
  }, [stats?.rawPayslips, selectedMonth, selectedYear]);

  if (user?.role !== 'admin') {
    return (
      <div className="text-muted-foreground">
        Access restricted to administrators only.
      </div>
    );
  }

  const COLORS = [
    "oklch(0.24 0.07 264)",
    "oklch(0.52 0.11 240)",
    "oklch(0.78 0.13 85)",
    "oklch(0.55 0.15 155)",
    "oklch(0.65 0.18 30)",
    "oklch(0.45 0.08 280)",
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Overview</p>
          <h1 className="font-display text-4xl text-primary mt-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2">A high-level summary of university payroll and employee statistics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Month</Label>
            <div className="w-36">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_FULL.map((m, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Year</Label>
            <div className="w-24">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearsList.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Total Employees" value={stats?.totalEmployees ?? 0} icon={Users} />
        <Stat title="Active" value={stats?.activeEmployees ?? 0} icon={UserCheck} />
        <Stat
          title={`Payslips (${MONTHS[Number(selectedMonth) - 1]} ${selectedYear})`}
          value={filteredStats.payslipsCount}
          icon={FileText}
        />
        <Stat
          title={`Expense (${MONTHS[Number(selectedMonth) - 1]} ${selectedYear})`}
          value={`₹ ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(filteredStats.expense)}`}
          icon={IndianRupee}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Monthly Salary Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.monthlyArr ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                <Tooltip formatter={(val) => [`₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`, "Total"]} />
                <Bar dataKey="total" fill="oklch(0.24 0.07 264)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Yearly Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.yearlyArr ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                <Tooltip formatter={(val) => [`₹${new Intl.NumberFormat("en-IN").format(val)}`, "Total"]} />
                <Bar dataKey="total" fill="oklch(0.55 0.15 155)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.deptArr ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                >
                  {(stats?.deptArr ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend 
                  iconSize={8} 
                  wrapperStyle={{ 
                    fontSize: '10px', 
                    maxHeight: '65px', 
                    overflowY: 'auto',
                    paddingTop: '5px'
                  }} 
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ title, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="font-display text-3xl text-primary mt-2">{value}</p>
          </div>
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </CardContent>
    </Card>
  );
}
