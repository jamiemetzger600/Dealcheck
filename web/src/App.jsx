import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeamProvider } from './context/TeamContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import DdPortalPage from './pages/DdPortalPage';
import UnderwritingPortalPage from './pages/UnderwritingPortalPage';
import UnderwritingHubPage from './pages/underwriting/UnderwritingHubPage';
import UnderwritingAppPage from './pages/underwriting/UnderwritingAppPage';
import TeamInviteAcceptPage from './pages/TeamInviteAcceptPage';
import AdminFeedbackPage from './pages/AdminFeedbackPage';
import FeedbackShell from './components/feedback/FeedbackShell';

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

function AppRoutes() {
  return (
    <FeedbackShell>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/airtable" element={<DashboardPage feedSource="airtable" />} />
        <Route
          path="/billing"
          element={(
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/settings"
          element={(
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin/feedback"
          element={(
            <ProtectedRoute>
              <AdminFeedbackPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/teams/accept" element={<TeamInviteAcceptPage />} />
        <Route path="/dd/:token" element={<DdPortalPage />} />
        <Route path="/underwriting/:token" element={<UnderwritingPortalPage />} />
        <Route
          path="/app/underwriting"
          element={(
            <ProtectedRoute>
              <UnderwritingHubPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/app/underwriting/:dealId"
          element={(
            <ProtectedRoute>
              <UnderwritingAppPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </FeedbackShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <AppRoutes />
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
