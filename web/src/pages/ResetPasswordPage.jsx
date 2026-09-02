import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { wakingUp } = useAuth();
  const token = searchParams.get('token') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing a token. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      console.log('[ResetPassword] success');
      navigate('/login', { replace: true, state: { resetOk: true } });
    } catch (err) {
      setError(err.message || 'Reset failed. Request a new link.');
    } finally {
      setLoading(false);
    }
  };

  if (wakingUp) {
    return (
      <div className="wakeup-splash">
        <div className="wakeup-splash__spinner" />
        <p className="wakeup-splash__text">Loading Vettr&hellip;</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Vettr</h1>
          <p>Find it. Vett it. Save it.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Choose a new password</h2>
          {!token ? (
            <>
              <p className="auth-form__lead">This link is invalid. Request a new reset email.</p>
              <p className="auth-footer"><Link to="/forgot-password">Forgot password</Link></p>
            </>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Update password'}
              </button>
              <p className="auth-footer"><Link to="/login">Back to sign in</Link></p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
