import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import MonthlyPage from './pages/MonthlyPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProgressPage from './pages/ProgressPage';
import ManageHabitsPage from './pages/ManageHabitsPage';
import NotesPage from './pages/NotesPage';
import PageWrapper from './components/PageWrapper';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SetupPage from './pages/SetupPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminMessagePopup from './components/AdminMessagePopup';

export default function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/setup'].includes(location.pathname);

  return (
    <div className="layout">
      {!isAuthPage && <NavBar />}
      <main className={isAuthPage ? 'auth-main-content' : 'main-content'}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected routes */}
            <Route path="/setup" element={<ProtectedRoute><PageWrapper><SetupPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><PageWrapper><HomePage /></PageWrapper></ProtectedRoute>} />
            <Route path="/monthly" element={<ProtectedRoute><PageWrapper><MonthlyPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><PageWrapper><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><PageWrapper><ProgressPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/notes" element={<ProtectedRoute><PageWrapper><NotesPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/manage" element={<ProtectedRoute><PageWrapper><ManageHabitsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><PageWrapper><AdminPage /></PageWrapper></ProtectedRoute>} />
          </Routes>
        </AnimatePresence>
      </main>
      <AnimatePresence>
        <AdminMessagePopup />
      </AnimatePresence>
    </div>
  );
}
