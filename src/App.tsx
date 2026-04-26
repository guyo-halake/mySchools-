import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import GlobalNotificationManager from './components/GlobalNotificationManager';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Results } from './pages/Results';
import { Fees } from './pages/Fees';
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
import { ProfileSettings } from './pages/ProfileSettings';
import MyChats from './pages/MyChats';
import { AdminOS } from './pages/AdminOS';
import { Calendar } from './pages/Calendar';
import { Settings } from './pages/Settings';
import { Privacy } from './pages/Privacy';
import { MyStudents } from './pages/MyStudents';
import { PrincipalOversight } from './pages/PrincipalOversight';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/results" element={<Results />} />
              <Route path="/fees" element={<Fees />} />
              <Route path="/fees-management" element={<FeesManagement />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/students" element={<UserDirectory />} />
              <Route path="/teachers" element={<UserDirectory />} />
              <Route path="/classes" element={<ClassesManagement />} />
              <Route path="/results-management" element={<ResultsManagement />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/my-chats" element={<MyChats />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/my-classroom" element={<MyClassroom />} />
              <Route path="/templates" element={<TemplatesList />} />
              <Route path="/templates/permissions" element={<TemplatesPermision />} />
              <Route path="/templates/:id" element={<TemplateDetail />} />
              <Route path="/profile-settings" element={<ProfileSettings />} />
              <Route path="/admin" element={<AdminOS />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/my-students" element={<MyStudents />} />
              <Route path="/principal-oversight" element={<PrincipalOversight />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
           <GlobalNotificationManager />
           <AppContent />
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}
