import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { teamsAPI } from '../utils/api';
import Navigation from '../components/Navigation';

export default function TeamInviteAcceptPage() {
  const { user, loading: authLoading } = useAuth();
  const { refreshTeams, setActiveTeamId } = useTeam();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [teamName, setTeamName] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const accept = async (pwd) => {
    setStatus('accepting');
    setError('');
    try {
      const data = await teamsAPI.acceptInvite(token, { password: pwd || undefined });
      setTeamName(data.team?.name || 'team');
      await refreshTeams();
      if (data.team?.id) setActiveTeamId(data.team.id);
      setNeedsPassword(false);
      setStatus('done');
      console.log('[TeamInvite] accepted', data.team?.id);
    } catch (err) {
      console.warn('[TeamInvite] accept failed', err.message, err.requiresPassword);
      if (err.requiresPassword) {
        setNeedsPassword(true);
        if (err.inviteCode) setInviteCode(err.inviteCode);
        setStatus('password');
        setError(err.message === 'Password required' ? '' : (err.message || ''));
        return;
      }
      setError(err.message || 'Could not accept invite');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (authLoading || !user || !token) return;
    let cancelled = false;
    (async () => {
      // First attempt without password; prompts if protected
      setStatus('accepting');
      try {
        const data = await teamsAPI.acceptInvite(token);
        if (cancelled) return;
        setTeamName(data.team?.name || 'team');
        await refreshTeams();
        if (data.team?.id) setActiveTeamId(data.team.id);
        setStatus('done');
      } catch (err) {
        if (cancelled) return;
        if (err.requiresPassword) {
          setNeedsPassword(true);
          if (err.inviteCode) setInviteCode(err.inviteCode);
          setStatus('password');
          return;
        }
        setError(err.message || 'Could not accept invite');
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) {
    return <p style={{ padding: 40 }}>Loading…</p>;
  }

  if (!user) {
    const next = encodeURIComponent(`/teams/accept?token=${token}`);
    return (
      <div className="team-invite-page team-invite-page--signed-out">
        <h1>Team invite</h1>
        <p>Sign in or create a Vettr account to join this team. Email invites require the invited address; link invites work with any account.</p>
        <div className="team-invite-page__actions">
          <Link className="btn-primary" to={`/login?next=${next}`}>Sign in</Link>
          <Link className="btn-secondary" to={`/register?next=${next}`}>Create account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="team-invite-page">
      <Navigation user={user} logout={() => {}} showTabs={false} pageTitle="Team invite" />
      <div className="team-invite-page__body">
        {status === 'accepting' && <p>Joining team…</p>}
        {(status === 'password' || needsPassword) && status !== 'done' && (
          <>
            <h1>Enter invite password</h1>
            {inviteCode ? <p className="crm-muted">Invite #{inviteCode}</p> : null}
            <p>This invite link is password protected.</p>
            <form
              className="team-invite-page__password"
              onSubmit={(e) => {
                e.preventDefault();
                accept(password);
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Invite password"
                autoComplete="off"
                autoFocus
              />
              <button type="submit" className="btn-primary" disabled={!password.trim()}>
                Join team
              </button>
            </form>
            {error ? <p className="settings-message" role="alert">{error}</p> : null}
          </>
        )}
        {status === 'done' && (
          <>
            <h1>You're in</h1>
            <p>Joined <strong>{teamName}</strong>. Saves will go to this team while it's active.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/dashboard?tab=crm')}>
              Open CRM
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <h1>Invite problem</h1>
            <p>{error}</p>
            <Link to="/dashboard">Back to dashboard</Link>
          </>
        )}
        {!token && <p>Missing invite token.</p>}
      </div>
    </div>
  );
}
