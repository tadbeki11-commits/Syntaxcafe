import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';
import SyncProgressBar from './components/SyncProgressBar';
import CleanupApprovalWatcher from './components/CleanupApprovalWatcher';
import UpdateManager from './components/UpdateManager';
import { isDeviceEnrolled, loadDeviceEnrollment } from '@/shared/utils/deviceToken';
import EnrollmentPage from './pages/EnrollmentPage';

// Import migrated pages
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/Dashboards/AdminDashboard/index';
import CashierDashboard from './pages/Dashboards/CashierDashboard';

// Import cashier pages
import CashierEmployees from './pages/cashier/CashierEmployees';
import CashierSelectWaiterForOrder from './pages/cashier/CashierSelectWaiterForOrder';
import CashierCreateOrderAsWaiter from './pages/cashier/CashierCreateOrderAsWaiter';
import CashierExpenses from './pages/cashier/CashierExpenses';
import PrinterSettings from './pages/cashier/PrinterSettings';
import CashierReceipt from './pages/cashier/CashierReceipt';
import CashierItemsSoldToday from './pages/cashier/CashierItemsSoldToday';

// Import admin management pages
import TableManagement from './pages/TableManagement/index';
import EmployeeManagement from './pages/EmployeeManagement/index';
import UserManagement from './pages/UserManagement/index';
import MenuManagement from './pages/MenuManagement/index';
import BulkMenuImport from './pages/MenuManagement/bulk-import/index';
import Profile from './pages/Profile/index';
import PaymentManagement from './pages/PaymentManagement/index';
import OrderManagement from './pages/OrderManagement/index';
import InventoryManagement from './pages/InventoryManagement/index';
import StockTransferManagement from './pages/StockTransferManagement/index';
import StockLocationManagement from './pages/StockLocationManagement/index';
import ExpenseManagement from './pages/ExpenseManagement/index';
import Reports from './pages/Reports/index';
import PaymentsItems from './pages/PaymentsItems/index';
import AttendanceManagement from './pages/AttendanceManagement/index';
import DataManagement from './pages/DataManagement/index';
import PaymentMethodManagement from './pages/PaymentMethodManagement';
import RoleManagement from './pages/RoleManagement';
import OrganizationManagement from './pages/OrganizationManagement/index';
import OrganizationDetail from './pages/OrganizationManagement/OrganizationDetail';
import CreateOrgOrder from './pages/OrganizationManagement/CreateOrgOrder';
import AppUpdateSettings from './pages/Settings/AppUpdateSettings';



// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}
const ProtectedRoute = ({ children, allowedRoles = [] }: ProtectedRouteProps) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Dashboard Router Component
const DashboardRouter = () => {
  const { user } = useAuth();

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'cashier':
        return <CashierDashboard />;
      default:
        return <div className="p-6 text-center">Invalid user role</div>;
    }
  };

  return (
    <DashboardLayout>
      <Routes>
        {/* Dashboard Home */}
        <Route index element={getDashboardComponent()} />

        <Route path="profile" element={<Profile />} />

        <Route path="orders" element={<ProtectedRoute allowedRoles={['admin']}><OrderManagement /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="employees" element={<ProtectedRoute allowedRoles={['admin']}><EmployeeManagement /></ProtectedRoute>} />
        <Route path="menu" element={<ProtectedRoute allowedRoles={['admin']}><MenuManagement /></ProtectedRoute>} />
        <Route path="menu/bulk-import" element={<ProtectedRoute allowedRoles={['admin']}><BulkMenuImport /></ProtectedRoute>} />
        <Route path="inventory" element={<ProtectedRoute allowedRoles={['admin']}><InventoryManagement /></ProtectedRoute>} />
        <Route path="inventory/locations" element={<ProtectedRoute allowedRoles={['admin']}><StockLocationManagement /></ProtectedRoute>} />
        <Route path="inventory/transfers" element={<ProtectedRoute allowedRoles={['admin']}><StockTransferManagement /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
        <Route path="expenses" element={<ProtectedRoute allowedRoles={['admin']}><ExpenseManagement /></ProtectedRoute>} />
        <Route path="payments-items" element={<ProtectedRoute allowedRoles={['admin']}><PaymentsItems /></ProtectedRoute>} />
        <Route path="attendance" element={<ProtectedRoute allowedRoles={['admin']}><AttendanceManagement /></ProtectedRoute>} />
        <Route path="tables" element={<ProtectedRoute allowedRoles={['admin']}><TableManagement /></ProtectedRoute>} />
        <Route path="payments" element={<ProtectedRoute allowedRoles={['admin', 'cashier']}><PaymentManagement /></ProtectedRoute>} />
        <Route path="cashier/employees" element={<ProtectedRoute allowedRoles={['cashier']}><CashierEmployees /></ProtectedRoute>} />
        <Route path="cashier/select-waiter" element={<ProtectedRoute allowedRoles={['cashier']}><CashierSelectWaiterForOrder /></ProtectedRoute>} />
        <Route path="cashier/create-order" element={<ProtectedRoute allowedRoles={['cashier']}><CashierCreateOrderAsWaiter /></ProtectedRoute>} />
        <Route path="cashier/expenses" element={<ProtectedRoute allowedRoles={['cashier']}><CashierExpenses /></ProtectedRoute>} />
        <Route path="cashier/printer-settings" element={<ProtectedRoute allowedRoles={['cashier']}><PrinterSettings /></ProtectedRoute>} />
        <Route path="cashier/receipt" element={<ProtectedRoute allowedRoles={['cashier']}><CashierReceipt /></ProtectedRoute>} />
        <Route path="cashier/items-sold" element={<ProtectedRoute allowedRoles={['cashier']}><CashierItemsSoldToday /></ProtectedRoute>} />

        {/* Organizations — admin manages; cashier access gated by setting inside the pages */}
        <Route path="organizations" element={<ProtectedRoute allowedRoles={['admin']}><OrganizationManagement /></ProtectedRoute>} />
        <Route path="organizations/:id/create-order" element={<ProtectedRoute allowedRoles={['admin']}><CreateOrgOrder /></ProtectedRoute>} />
        <Route path="organizations/:id" element={<ProtectedRoute allowedRoles={['admin']}><OrganizationDetail /></ProtectedRoute>} />

        {/* New: Settings — Admin only */}
        <Route path="settings/payment-methods" element={<ProtectedRoute allowedRoles={['admin']}><PaymentMethodManagement /></ProtectedRoute>} />
        <Route path="settings/roles" element={<ProtectedRoute allowedRoles={['admin']}><RoleManagement /></ProtectedRoute>} />
        <Route path="settings/data-management" element={<ProtectedRoute allowedRoles={['admin']}><DataManagement /></ProtectedRoute>} />
        <Route path="settings/printer-settings" element={<ProtectedRoute allowedRoles={['admin']}><PrinterSettings /></ProtectedRoute>} />
        <Route path="settings/updates" element={<ProtectedRoute allowedRoles={['admin', 'cashier']}><AppUpdateSettings /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

// Main App Component
const AppContent = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  const getRedirectPath = () => {
    if (!isAuthenticated) return "/login";
    return "/dashboard";
  };

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={getRedirectPath()} replace /> : <LoginPage />} />
      <Route path="/dashboard/*" element={<ProtectedRoute allowedRoles={['admin', 'cashier']}><DashboardRouter /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={getRedirectPath()} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// First-run gate: until this device redeems an enrollment code for a device
// token, it can't be pinned to a branch — so block the rest of the app (which
// makes branch-scoped API/sync calls) behind the enrollment screen. The token
// lives in SQLite, so we hydrate it once before deciding what to show.
const EnrollmentGate = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = React.useState<boolean>(false);
  const [enrolled, setEnrolled] = React.useState<boolean>(false);

  React.useEffect(() => {
    let active = true;
    loadDeviceEnrollment().finally(() => {
      if (!active) return;
      setEnrolled(isDeviceEnrolled());
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return <LoadingSpinner />;
  }

  if (!enrolled) {
    return <EnrollmentPage onEnrolled={() => setEnrolled(true)} />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <EnrollmentGate>
      <AuthProvider>
        <div className="App">
          <SyncProgressBar />
          <CleanupApprovalWatcher />
          <UpdateManager />
          <AppContent />
        </div>
      </AuthProvider>
    </EnrollmentGate>
  );
}

export default App;
