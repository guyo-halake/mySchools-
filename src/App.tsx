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
import { InputResults } from './pages/InputResults';
import { Chat } from './pages/Chat';
import { Assignments } from './pages/Assignments';

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

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Common Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
            <Route path="/suspensions" element={<ProtectedRoute><Suspensions /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
            
            {/* Teacher Routes */}
            <Route path="/input-results" element={<ProtectedRoute><InputResults /></ProtectedRoute>} />
            <Route path="/fees-management" element={<ProtectedRoute><FeesManagement /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            
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
