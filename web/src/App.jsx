import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';

/** Full-screen splash shown while backend wakes from cold start (temporary — remove on paid plan). */
function WakeUpSplash() {
  return (
    <div className="wakeup-splash">
      <div className="wakeup-splash__spinner" />
      <p className="wakeup-splash__text">Loading Vettr&hellip;</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading, wakingUp } = useAuth();

  if (wakingUp) return <WakeUpSplash />;

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: 'var(--text-secondary, #a8a8a8)'
      }}>
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/airtable" element={<DashboardPage feedSource="airtable" />} />
          <Route 
            path="/billing" 
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
