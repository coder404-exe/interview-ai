import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import InterviewSetupPage from './pages/InterviewSetupPage';
import InterviewRoomPage from './pages/InterviewRoomPage';
import ReportPage from './pages/ReportPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <>
      {/* Global Background Layer */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', background: 'var(--bg)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1 }} />
        {/* Floating Abstract Elements */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(24,144,255,0.08) 0%, transparent 70%)', top: '-10%', right: '-5%', animation: 'float 15s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(19,194,194,0.06) 0%, transparent 70%)', bottom: '-5%', left: '-5%', animation: 'float 20s ease-in-out infinite reverse' }} />
      </div>

      <Routes>
        <Route path="/"               element={<LandingPage />} />
        <Route path="/auth"           element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/dashboard"      element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/setup"          element={<PrivateRoute><InterviewSetupPage /></PrivateRoute>} />
        <Route path="/interview/:id"  element={<PrivateRoute><InterviewRoomPage /></PrivateRoute>} />
        <Route path="/report/:id"     element={<PrivateRoute><ReportPage /></PrivateRoute>} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
