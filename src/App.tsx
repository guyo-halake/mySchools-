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
import { StudentsManagement } from './pages/StudentsManagement';
import { TeachersManagement } from './pages/TeachersManagement';
import { ClassesManagement } from './pages/ClassesManagement';
import { InputResults } from './pages/InputResults';
import { Chat } from './pages/Chat';
import { Assignments } from './pages/Assignments';
import { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: Role[] }> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
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
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['PARENT', 'STUDENT', 'TEACHER', 'ADMIN']}><Dashboard /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute allowedRoles={['PARENT', 'STUDENT', 'TEACHER', 'ADMIN']}><Results /></ProtectedRoute>} />
            <Route path="/fees" element={<ProtectedRoute allowedRoles={['PARENT', 'STUDENT', 'ADMIN']}><Fees /></ProtectedRoute>} />
            <Route path="/suspensions" element={<ProtectedRoute allowedRoles={['PARENT', 'STUDENT', 'TEACHER', 'ADMIN']}><Suspensions /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute allowedRoles={['PARENT', 'STUDENT', 'TEACHER', 'ADMIN']}><Events /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute allowedRoles={['PARENT', 'STUDENT', 'TEACHER', 'ADMIN']}><Announcements /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute allowedRoles={['STUDENT', 'TEACHER', 'ADMIN']}><Assignments /></ProtectedRoute>} />
            
            {/* Teacher Routes */}
            <Route path="/input-results" element={<ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}><InputResults /></ProtectedRoute>} />
            <Route path="/fees-management" element={<ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}><FeesManagement /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}><Chat /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/students" element={<ProtectedRoute allowedRoles={['ADMIN']}><StudentsManagement /></ProtectedRoute>} />
            <Route path="/teachers" element={<ProtectedRoute allowedRoles={['ADMIN']}><TeachersManagement /></ProtectedRoute>} />
            <Route path="/classes" element={<ProtectedRoute allowedRoles={['ADMIN']}><ClassesManagement /></ProtectedRoute>} />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}
