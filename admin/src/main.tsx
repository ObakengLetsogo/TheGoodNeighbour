import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { AuditPage } from './pages/Audit';
import { ClaimsPage } from './pages/Claims';
import { DashboardPage } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { CoverPage } from './pages/Cover';
import { CustomersPage } from './pages/Customers';
import { EconomicsPage } from './pages/Economics';
import { HerdPage } from './pages/Herd';
import { LegalPage } from './pages/Legal';
import { SupportPage } from './pages/Support';
import { PolicyPage } from './pages/Policy';
import { PoliciesPage } from './pages/Policies';
import './styles.css';

function Gate() {
  const { staff, ready } = useAuth();
  if (!ready) return <div className="center"><Loading /></div>;
  if (!staff) return <LoginPage />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="policies/:id" element={<PolicyPage />} />
        <Route path="claims" element={<ClaimsPage />} />
        <Route path="cover" element={<CoverPage />} />
        <Route path="herd" element={<HerdPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="legal" element={<LegalPage />} />
        <Route path="economics" element={<EconomicsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><AuthProvider><Gate /></AuthProvider></BrowserRouter></StrictMode>,
);
