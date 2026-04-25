import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import MonthlyPage from './pages/MonthlyPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProgressPage from './pages/ProgressPage';
import ManageHabitsPage from './pages/ManageHabitsPage';
import TimerPage from './pages/TimerPage';
import PageWrapper from './components/PageWrapper';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SetupPage from './pages/SetupPage';
import AdminPage from './pages/AdminPage';
import ProtectedRoute from './components/ProtectedRoute';


export default function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/setup'].includes(location.pathname);

  const getBgImageString = () => {
    switch (location.pathname) {
      case '/': return 'url("/marvel/marvel-cinematic-universe-black-panther-marvel-comics-wallpaper-preview.jpg")';
      case '/monthly': return 'url("/marvel/black-widow-pose-4k-marvel-iphone-ipfbpdwchomr4rww.jpg")';
      case '/analytics': return 'url("/marvel/movie-doctor-strange-benedict-cumberbatch-marvel-comics-wallpaper-preview.jpg")';
      case '/progress': return 'url("/marvel/movie-thor-ragnarok-thor-wallpaper-preview.jpg")';
      case '/manage': return 'url("/marvel/captain-marvel-4k-lac4ny7q0d5iuyvt.jpg")';
      default: return 'url("/marvel/marvels-spider-man-2880x1800-11990.jpeg")';
    }
  };

  return (
    <div
      className="layout"
      style={{
        backgroundImage: `linear-gradient(rgba(9, 11, 16, 0.82), rgba(9, 11, 16, 0.95)), ${getBgImageString()}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh'
      }}
    >
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
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
            <Route path="/timer" element={<ProtectedRoute><PageWrapper><TimerPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/manage" element={<ProtectedRoute><PageWrapper><ManageHabitsPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><PageWrapper><AdminPage /></PageWrapper></ProtectedRoute>} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}
