import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './screens/auth/Login';
import Dashboard from './screens/dashboard/Dashboard';
import Employees from './screens/employees/Employees';
import Payslips from './screens/payslips/Payslips';
import NewPayslip from './screens/payslips/NewPayslip';
import PayslipDetails from './screens/payslips/PayslipDetails';
import { AuthProvider, useAuth } from './lib/auth-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/AppShell';
import MyPayslips from './screens/employee-portal/MyPayslips';
import { Toaster } from './components/ui/sonner';
import Form16 from './screens/form16/Form16';
import MyForm16 from './screens/employee-portal/MyForm16';
import VerifyPayslip from './screens/payslips/VerifyPayslip';
import MyConsolidated from './screens/employee-portal/MyConsolidated';
import PFAccountSlips from './screens/pf-slips/PFAccountSlips';
import MyPFAccountSlips from './screens/employee-portal/MyPFAccountSlips';
import EmployeeAttendance from './screens/attendance/EmployeeAttendance';
import GlobalAttendance from './screens/attendance/GlobalAttendance';
import InwardRegister from './screens/registers/InwardRegister';
import OutwardRegister from './screens/registers/OutwardRegister';
import MovementRegister from './screens/registers/MovementRegister';
import DailyActivity from './screens/activities/DailyActivity';
import PendingApprovals from './screens/approvals/PendingApprovals';
import Sections from './screens/master/Sections';

const queryClient = new QueryClient();

function ProtectedRoute({ children, employeeRoute = false, sharedRoute = false }) {
  const { user, isEmployee } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!sharedRoute) {
    if (isEmployee && !employeeRoute) {
      return <Navigate to="/my-payslips" replace />;
    }
    if (!isEmployee && employeeRoute) {
      const to = user?.role === 'admin' ? "/dashboard" : "/employees";
      return <Navigate to={to} replace />;
    }
  }
  return <AppShell>{children}</AppShell>;
}

const AttendanceRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'master_admin') return <GlobalAttendance />;
  return <EmployeeAttendance />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/verify/:payslipNumber" element={<VerifyPayslip />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute>
                <Employees />
              </ProtectedRoute>
            } />
            <Route path="/sections" element={
              <ProtectedRoute>
                <Sections />
              </ProtectedRoute>
            } />
            <Route path="/payslips" element={
              <ProtectedRoute>
                <Payslips />
              </ProtectedRoute>
            } />
            <Route path="/payslips/new" element={
              <ProtectedRoute>
                <NewPayslip />
              </ProtectedRoute>
            } />
            <Route path="/payslips/:id/edit" element={
              <ProtectedRoute>
                <NewPayslip />
              </ProtectedRoute>
            } />
            <Route path="/payslips/:id" element={
              <ProtectedRoute>
                <PayslipDetails />
              </ProtectedRoute>
            } />

            <Route path="/my-payslips" element={
              <ProtectedRoute employeeRoute={true}>
                <MyPayslips />
              </ProtectedRoute>
            } />

            <Route path="/my-consolidated" element={
              <ProtectedRoute employeeRoute={true}>
                <MyConsolidated />
              </ProtectedRoute>
            } />

            <Route path="/form16" element={
              <ProtectedRoute>
                <Form16 />
              </ProtectedRoute>
            } />

            <Route path="/my-form16" element={
              <ProtectedRoute employeeRoute={true}>
                <MyForm16 />
              </ProtectedRoute>
            } />

            <Route path="/pf-slips" element={
              <ProtectedRoute>
                <PFAccountSlips />
              </ProtectedRoute>
            } />

            <Route path="/my-pf-slips" element={
              <ProtectedRoute employeeRoute={true}>
                <MyPFAccountSlips />
              </ProtectedRoute>
            } />
            
            {/* New Modules */}
            <Route path="/attendance" element={
              <ProtectedRoute>
                <AttendanceRouter />
              </ProtectedRoute>
            } />
            <Route path="/inward-register" element={
              <ProtectedRoute>
                <InwardRegister />
              </ProtectedRoute>
            } />
            <Route path="/outward-register" element={
              <ProtectedRoute>
                <OutwardRegister />
              </ProtectedRoute>
            } />
            <Route path="/movement-register" element={
              <ProtectedRoute sharedRoute={true}>
                <MovementRegister />
              </ProtectedRoute>
            } />
            <Route path="/daily-activity" element={
              <ProtectedRoute sharedRoute={true}>
                <DailyActivity />
              </ProtectedRoute>
            } />
            <Route path="/pending-approvals" element={
              <ProtectedRoute>
                <PendingApprovals />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={
              <ProtectedRoute>
                <RootRedirect />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootRedirect() {
  const { user, isEmployee } = useAuth();
  if (isEmployee) return <Navigate to="/my-payslips" replace />;
  if (user?.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user?.role === 'master_admin') return <Navigate to="/employees" replace />;
  if (user?.role === 'section_head') return <Navigate to="/attendance" replace />;
  if (user?.role === 'junior_assistant') return <Navigate to="/inward-register" replace />;
  return <Navigate to="/employees" replace />;
}

export default App;
