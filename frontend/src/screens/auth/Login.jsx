import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useLogin } from "./hooks/useAuthQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/aknu_logo.png";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const { login, loading } = useLogin(() => {
    // Clear credentials from state so they don't persist if back button is used
    setIdentifier("");
    setPassword("");
    window.location.replace('/');
  });

  const onSubmit = (e) => {
    e.preventDefault();
    login({ email: identifier, password });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-primary md:bg-background">
      <div className="hidden md:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-10">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-10 w-10" />
          <span className="font-display text-lg">AKNU Payroll</span>
        </div>
        <div>
          <h1 className="font-display text-4xl leading-tight">
            ADIKAVI NANNAYA UNIVERSITY
          </h1>
          <p className="text-xl font-display leading-tight mb-5">
            Accredited by NAAC with 'B+' Grade, ISO 9001:2025 Certified
          </p>
          <h1 className="font-display text-3xl leading-tight">
            Secure payslip access for the entire university.
          </h1>
        </div>
        <p className="text-xs opacity-60">Adikavi Nannaya University</p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex flex-col items-center justify-center mb-8 text-center space-y-4">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <img src={logo} alt="Logo" className="h-16 w-16" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-primary-foreground">Adikavi Nannaya University</p>
              <h1 className="text-sm text-primary-foreground/80 mt-1">AKNU Payroll</h1>
            </div>
          </div>

          <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-xl md:bg-transparent md:p-0 md:shadow-none md:rounded-none">
            <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
              <div>
                <h2 className="font-display text-3xl text-primary font-bold">Sign in</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Employees: enter your Name and Aadhaar Number.<br />
                  Admins: enter your Email and Password.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="identifier">Name / Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Enter your Name or Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Enter your 12-digit Aadhaar or Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
