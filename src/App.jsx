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


export default function App() {
  const location = useLocation();

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
      <NavBar />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/monthly" element={<PageWrapper><MonthlyPage /></PageWrapper>} />
            <Route path="/analytics" element={<PageWrapper><AnalyticsPage /></PageWrapper>} />
            <Route path="/progress" element={<PageWrapper><ProgressPage /></PageWrapper>} />
            <Route path="/timer" element={<PageWrapper><TimerPage /></PageWrapper>} />
            <Route path="/manage" element={<PageWrapper><ManageHabitsPage /></PageWrapper>} />
          </Routes>

        </AnimatePresence>
      </main>
    </div>

  );
}
