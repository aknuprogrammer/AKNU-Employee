import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  FileText,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Menu,
  Landmark,
  FileSpreadsheet,
  CalendarCheck,
  Inbox,
  Send,
  PlaneTakeoff,
  Activity,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logo from "../assets/aknu_logo.png";

export function AppShell({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAccountant, signOut } = useAuth();
  const { pathname: path } = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await signOut();
    queryClient.clear();
    window.location.href = "/login";
  };

  const nav = isAccountant
    ? [
      // Normal Admin (Payroll)
      ...(user?.role === "admin" ? [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/payslips", label: "Payslips", icon: FileText },
        { to: "/form16", label: "Form 16", icon: Landmark },
      ] : []),
      // Master Admin
      ...(user?.role === "master_admin" ? [
        { to: "/employees", label: "Employees Master", icon: Users },
        { to: "/sections", label: "Sections Master", icon: LayoutDashboard },
        { to: "/attendance", label: "Global Attendance", icon: CalendarCheck },
        { to: "/inward-register", label: "Global Inward", icon: Inbox },
        { to: "/outward-register", label: "Global Outward", icon: Send },
        { to: "/movement-register", label: "Global Movement", icon: PlaneTakeoff },
        { to: "/daily-activity", label: "Global Activity", icon: Activity },
      ] : []),
      // Section Head
      ...(user?.role === "section_head" ? [
        { to: "/attendance", label: "Take Attendance", icon: CalendarCheck },
        { to: "/pending-approvals", label: "Pending Approvals", icon: CheckSquare }
      ] : []),
      // Junior Assistant
      ...(user?.role === "junior_assistant" ? [
        { to: "/inward-register", label: "Inward Register", icon: Inbox },
        { to: "/outward-register", label: "Outward Register", icon: Send },
      ] : []),
    ]
    : [
      { to: "/my-payslips", label: "My Payslips", icon: FileText },
      { to: "/my-consolidated", label: "Consolidated Payslips", icon: FileSpreadsheet },
      { to: "/my-form16", label: "My Form 16", icon: Landmark },
      { to: "/movement-register", label: "My Movement", icon: PlaneTakeoff },
      { to: "/daily-activity", label: "My Daily Activity", icon: Activity },
    ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-screen overflow-y-auto custom-scrollbar">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-md  flex items-center justify-center">
              <img src={logo} alt="Logo" className="h-9 w-9" />
            </div>
            <div>
              <p className="font-display text-lg leading-tight">AKNU Payroll</p>
              <p className="text-[11px] opacity-70 leading-tight">Adikavi Nannaya University</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent"
                  }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs opacity-80">
            {isAccountant ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <UserIcon className="h-3.5 w-3.5" />
            )}
            <span className="truncate">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="md:hidden bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground border-sidebar-border p-0 flex flex-col">
                <div className="px-6 py-6 border-b border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="Logo" className="h-8 w-8" />
                    <div>
                      <p className="font-display text-lg leading-tight">AKNU Payroll</p>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1">
                  {nav.map((n) => {
                    const active = path === n.to || path.startsWith(n.to + "/");
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/85 hover:bg-sidebar-accent"
                          }`}
                      >
                        <n.icon className="h-4 w-4" />
                        {n.label}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <span className="font-display ml-2">AKNU Payroll</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="p-4 md:p-6 lg:p-8 w-full">{children}</div>
      </main>
    </div>
  );
}
