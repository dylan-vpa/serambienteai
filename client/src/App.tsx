import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Toaster } from '@/components/ui/sonner';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import OITsPage from '@/pages/OITsPage';
import ResourcesPage from '@/pages/ResourcesPage';
import OITDetailPage from '@/pages/OITDetailPage';
import SettingsPage from '@/pages/SettingsPage';
import AIAssistantPage from '@/pages/AIAssistantPage';
import NotificationsPage from '@/pages/NotificationsPage';
import CalendarPage from '@/pages/CalendarPage';
import StandardsPage from '@/pages/StandardsPage';
import SamplingTemplatesPage from '@/pages/SamplingTemplatesPage';
import CreateStandardPage from '@/pages/CreateStandardPage';
import CreateTemplatePage from '@/pages/CreateTemplatePage';
import EditStandardPage from '@/pages/EditStandardPage';
import EditTemplatePage from '@/pages/EditTemplatePage';
import UsersPage from '@/pages/UsersPage';
import QuotationsPage from '@/pages/QuotationsPage';
import QuotationDetailPage from '@/pages/QuotationDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="oits" element={<OITsPage />} />
            <Route path="oits/:id" element={<OITDetailPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="standards" element={<StandardsPage />} />
            <Route path="standards/create" element={<CreateStandardPage />} />
            <Route path="standards/edit/:id" element={<EditStandardPage />} />
            <Route path="sampling-templates" element={<SamplingTemplatesPage />} />
            <Route path="sampling-templates/create" element={<CreateTemplatePage />} />
            <Route path="sampling-templates/edit/:id" element={<EditTemplatePage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="quotations/:id" element={<QuotationDetailPage />} />
            <Route path="ai" element={<AIAssistantPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
