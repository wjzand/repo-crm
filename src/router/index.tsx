import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import MainLayout from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/Customers/CustomerDetail';
import CustomerForm from '@/pages/Customers/CustomerForm';
import Leads from '@/pages/Leads';
import LeadDetail from '@/pages/Leads/LeadDetail';
import LeadForm from '@/pages/Leads/LeadForm';
import Opportunities from '@/pages/Opportunities';
import OpportunityDetail from '@/pages/Opportunities/OpportunityDetail';
import OpportunityForm from '@/pages/Opportunities/OpportunityForm';
import Funnel from '@/pages/Funnel';
import Team from '@/pages/Team';
import Settings from '@/pages/Settings';
import WarRooms from '@/pages/WarRooms';
import WarRoomDetail from '@/pages/WarRooms/WarRoomDetail';
import { usePermissions } from '@/hooks/usePermissions';

function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const { isAuthenticated } = useAuthStore();
  const { can } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/new" element={<LeadForm />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="opportunities/new" element={<OpportunityForm />} />
          <Route path="opportunities/:id" element={<OpportunityDetail />} />
          <Route path="funnel" element={<Funnel />} />
          <Route path="warrooms" element={<WarRooms />} />
          <Route path="warrooms/:id" element={<WarRoomDetail />} />
          <Route
            path="team"
            element={
              <ProtectedRoute permission="team:manage">
                <Team />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute permission="settings:manage">
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
