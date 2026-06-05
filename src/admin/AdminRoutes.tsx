import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminAlertProvider } from './context/AdminAlertContext';
import { AdminLayout } from './components/AdminLayout';
import { AdminLogin } from './pages/AdminLogin';
import { CommandCenter } from './pages/CommandCenter';
import { SchoolsPage } from './pages/SchoolsPage';
import { SalesPage } from './pages/SalesPage';
import { TechOpsPage } from './pages/TechOpsPage';
import { P3LDevelopersPage } from './pages/P3LDevelopersPage';
import { DataEnginePage } from './pages/DataEnginePage';
import { UsersSupportPage } from './pages/UsersSupportPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ResultsCheckerPage } from './pages/ResultsCheckerPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!adminUser) return <Navigate to="/admin/login" />;
  
  return <AdminLayout>{children}</AdminLayout>;
};

export const AdminRoutes: React.FC = () => {
  return (
    <AdminAlertProvider>
      <Routes>
        <Route path="login" element={<Navigate to="/login" replace />} />
        
        <Route path="command-center" element={<AdminProtectedRoute><CommandCenter /></AdminProtectedRoute>} />
        <Route path="schools" element={<AdminProtectedRoute><SchoolsPage /></AdminProtectedRoute>} />
        <Route path="sales" element={<AdminProtectedRoute><SalesPage /></AdminProtectedRoute>} />
        <Route path="tech-ops" element={<AdminProtectedRoute><TechOpsPage /></AdminProtectedRoute>} />
        <Route path="p3l-developers" element={<AdminProtectedRoute><P3LDevelopersPage /></AdminProtectedRoute>} />
        <Route path="data-engine" element={<AdminProtectedRoute><DataEnginePage /></AdminProtectedRoute>} />
        <Route path="users" element={<AdminProtectedRoute><UsersSupportPage /></AdminProtectedRoute>} />
        <Route path="results-checker" element={<AdminProtectedRoute><ResultsCheckerPage /></AdminProtectedRoute>} />
        <Route path="analytics" element={<AdminProtectedRoute><AnalyticsPage /></AdminProtectedRoute>} />
        <Route path="notifications" element={<AdminProtectedRoute><NotificationsPage /></AdminProtectedRoute>} />
        <Route path="settings" element={<AdminProtectedRoute><SettingsPage /></AdminProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="command-center" />} />
      </Routes>
    </AdminAlertProvider>
  );
};
