import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import MonthlyPage from './pages/MonthlyPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProgressPage from './pages/ProgressPage';
import ManageHabitsPage from './pages/ManageHabitsPage';

export default function App() {
  return (
    <div className="layout">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/monthly" element={<MonthlyPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/manage" element={<ManageHabitsPage />} />
        </Routes>
      </main>
    </div>
  );
}
