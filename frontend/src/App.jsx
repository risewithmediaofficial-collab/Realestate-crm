import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Sleek Lazy Loading Suspense Fallback
const PageLoader = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  }}>
    <div style={{
      width: 44,
      height: 44,
      border: '3px solid #e2e8f0',
      borderTopColor: 'var(--primary, #2563eb)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>
      Loading module...
    </div>
  </div>
);

// Code-Split Lazy Loaded Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SuperAdminLoginPage = lazy(() => import('./pages/auth/SuperAdminLoginPage'));
const SuperAdminDashboardPage = lazy(() => import('./pages/superadmin/SuperAdminDashboardPage'));
const SuperAdminRoute = lazy(() => import('./components/auth/SuperAdminRoute'));

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const AllLeadsPage = lazy(() => import('./pages/leads/AllLeadsPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const MarketingPage = lazy(() => import('./pages/marketing/MarketingPage'));
const CommunicationPage = lazy(() => import('./pages/communication/CommunicationPage'));
const ActivitiesPage = lazy(() => import('./pages/activities/ActivitiesPage'));
const SalesPipelinePage = lazy(() => import('./pages/pipeline/SalesPipelinePage'));
const PricingPage = lazy(() => import('./pages/pricing/PricingPage'));
const NegotiationsPage = lazy(() => import('./pages/negotiations/NegotiationsPage'));
const SiteVisitsPage = lazy(() => import('./pages/sitevisits/SiteVisitsPage'));
const BookingPage = lazy(() => import('./pages/booking/BookingPage'));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'));
const CustomerPortalPage = lazy(() => import('./pages/customer/CustomerPortalPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const MetaIntegrationPage = lazy(() => import('./pages/settings/MetaIntegrationPage'));
const BuyerRequirementsPage = lazy(() => import('./pages/requirements/BuyerRequirementsPage'));

const AppWithLayout = ({ children }) => (
  <ProtectedRoute>
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </AppLayout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />

              {/* Super Admin Control Center */}
              <Route path="/superadmin" element={<SuperAdminRoute><SuperAdminDashboardPage /></SuperAdminRoute>} />
              <Route path="/superadmin/*" element={<SuperAdminRoute><SuperAdminDashboardPage /></SuperAdminRoute>} />

              {/* 1. Dashboard */}
              <Route path="/" element={<AppWithLayout><DashboardPage /></AppWithLayout>} />

              {/* 2. Marketing */}
              <Route path="/marketing" element={<AppWithLayout><MarketingPage /></AppWithLayout>} />
              <Route path="/marketing/*" element={<AppWithLayout><MarketingPage /></AppWithLayout>} />

              {/* 3. Leads & Pre-Sales */}
              <Route path="/leads" element={<AppWithLayout><AllLeadsPage /></AppWithLayout>} />
              <Route path="/leads/*" element={<AppWithLayout><AllLeadsPage /></AppWithLayout>} />

              {/* 3.1 Custom Buyer Requirements Dashboard */}
              <Route path="/requirements" element={<AppWithLayout><BuyerRequirementsPage /></AppWithLayout>} />
              <Route path="/requirements/*" element={<AppWithLayout><BuyerRequirementsPage /></AppWithLayout>} />

              {/* 4. Communication */}
              <Route path="/communication" element={<AppWithLayout><CommunicationPage /></AppWithLayout>} />
              <Route path="/communication/*" element={<AppWithLayout><CommunicationPage /></AppWithLayout>} />

              {/* 5. Activities & Tasks */}
              <Route path="/activities" element={<AppWithLayout><ActivitiesPage /></AppWithLayout>} />
              <Route path="/activities/*" element={<AppWithLayout><ActivitiesPage /></AppWithLayout>} />

              {/* 6. Sales Pipeline */}
              <Route path="/pipeline" element={<AppWithLayout><SalesPipelinePage /></AppWithLayout>} />

              {/* 7. Projects */}
              <Route path="/projects" element={<AppWithLayout><ProjectsPage /></AppWithLayout>} />
              <Route path="/projects/*" element={<AppWithLayout><ProjectsPage /></AppWithLayout>} />

              {/* 8. Inventory Matrix */}
              <Route path="/inventory" element={<AppWithLayout><InventoryPage /></AppWithLayout>} />
              <Route path="/inventory/*" element={<AppWithLayout><InventoryPage /></AppWithLayout>} />

              {/* 9. Pricing & Cost Sheets */}
              <Route path="/pricing" element={<AppWithLayout><PricingPage /></AppWithLayout>} />
              <Route path="/pricing/*" element={<AppWithLayout><PricingPage /></AppWithLayout>} />

              {/* 10. Site Visits */}
              <Route path="/site-visits" element={<AppWithLayout><SiteVisitsPage /></AppWithLayout>} />
              <Route path="/site-visits/*" element={<AppWithLayout><SiteVisitsPage /></AppWithLayout>} />

              {/* 11. Negotiations */}
              <Route path="/negotiations" element={<AppWithLayout><NegotiationsPage /></AppWithLayout>} />
              <Route path="/negotiations/*" element={<AppWithLayout><NegotiationsPage /></AppWithLayout>} />

              {/* 12. Booking Management */}
              <Route path="/booking" element={<AppWithLayout><BookingPage /></AppWithLayout>} />
              <Route path="/booking/*" element={<AppWithLayout><BookingPage /></AppWithLayout>} />

              {/* 13. Payments & Collections */}
              <Route path="/payments" element={<AppWithLayout><PaymentsPage /></AppWithLayout>} />
              <Route path="/payments/*" element={<AppWithLayout><PaymentsPage /></AppWithLayout>} />

              {/* 14. Customer Portal */}
              <Route path="/customer-portal" element={<AppWithLayout><CustomerPortalPage /></AppWithLayout>} />

              {/* 15. Reports & BI */}
              <Route path="/reports" element={<AppWithLayout><ReportsPage /></AppWithLayout>} />
              <Route path="/reports/*" element={<AppWithLayout><ReportsPage /></AppWithLayout>} />

              {/* 16. Users & Org */}
              <Route path="/users" element={<AppWithLayout><UsersPage /></AppWithLayout>} />
              <Route path="/users/*" element={<AppWithLayout><UsersPage /></AppWithLayout>} />

              {/* 19. Settings & API */}
              <Route path="/settings/integrations/meta" element={<AppWithLayout><MetaIntegrationPage /></AppWithLayout>} />
              <Route path="/settings/meta" element={<AppWithLayout><MetaIntegrationPage /></AppWithLayout>} />
              <Route path="/marketing/sources/meta" element={<AppWithLayout><MetaIntegrationPage /></AppWithLayout>} />
              <Route path="/settings" element={<AppWithLayout><SettingsPage /></AppWithLayout>} />
              <Route path="/settings/*" element={<AppWithLayout><SettingsPage /></AppWithLayout>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
