import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Results } from './pages/Results';
import { Fees } from './pages/Fees';
import { Suspensions } from './pages/Suspensions';
import { Events } from './pages/Events';
import { Announcements } from './pages/Announcements';
import { FeesManagement } from './pages/FeesManagement';
import { UserDirectory } from './pages/UserDirectory';
import { ClassesManagement } from './pages/ClassesManagement';
import { ResultsManagement } from './pages/ResultsManagement';
import { Chat } from './pages/Chat';
import { Assignments } from './pages/Assignments';
import { Timetable } from './pages/Timetable';
import { MyClassroom } from './pages/MyClassroom';
import { TemplatesPermision } from './pages/TemplatesPermision';
import { TemplatesList } from './pages/TemplatesList';
import { TemplateDetail } from './pages/TemplateDetail';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

const RoleProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(String(user.role).toUpperCase())) return <Navigate to="/dashboard" />;

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Common Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/results-management" element={<ProtectedRoute><ResultsManagement /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
            <Route path="/suspensions" element={<ProtectedRoute><Suspensions /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
            
            {/* Functional Routes */}
            <Route path="/fees-management" element={<ProtectedRoute><FeesManagement /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
            <Route path="/my-classroom" element={<ProtectedRoute><MyClassroom /></ProtectedRoute>} />
            <Route path="/templates" element={<RoleProtectedRoute allowedRoles={['TEACHER', 'ADMIN', 'PRINCIPAL']}><TemplatesList /></RoleProtectedRoute>} />
            <Route path="/template-detail/:templateId" element={<RoleProtectedRoute allowedRoles={['TEACHER', 'ADMIN', 'PRINCIPAL']}><TemplateDetail /></RoleProtectedRoute>} />
            <Route path="/templates-permission" element={<RoleProtectedRoute allowedRoles={['TEACHER', 'ADMIN', 'PRINCIPAL']}><TemplatesPermision /></RoleProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/students" element={<ProtectedRoute><UserDirectory /></ProtectedRoute>} />
            <Route path="/teachers" element={<ProtectedRoute><UserDirectory /></ProtectedRoute>} />
            <Route path="/classes" element={<ProtectedRoute><ClassesManagement /></ProtectedRoute>} />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}
