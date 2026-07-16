import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { teamsAPI } from '../utils/api';
import { useTeam } from '../context/TeamContext';

const EXPIRES_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' }
];

function formatExpires(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

function inviteLabel(i) {
  const isLink = i.inviteKind === 'link' || i.label === 'Anyone with link';
  const code = i.code ? ` #${i.code}` : '';
  if (isLink) return `Link invite${code} (${i.role})`;
  return `${i.email || i.label}${code} (${i.role})`;
}

/** When testing locally, rewrite prod accept URLs to the current origin (same token). */
function localizeAcceptUrl(url) {
  if (!url || typeof window === 'undefined') return url;
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return url;
  try {
    const u = new URL(url);
    if (u.hostname === host) return url;
    u.protocol = window.location.protocol;
    u.host = window.location.host;
    return u.toString();
  } catch {
    return url;
  }
}

function withLocalAcceptUrl(invite) {
  if (!invite) return invite;
  const acceptUrl = localizeAcceptUrl(invite.acceptUrl);
  return acceptUrl === invite.acceptUrl ? invite : { ...invite, acceptUrl };
}

/** Create team, invite members, list membership — lives in Settings. */
export default function TeamsSettingsPanel() {
  const { teams, refreshTeams, seatCap, setActiveTeamId, activeTeamId } = useTeam();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(activeTeamId || teams[0]?.id || null);
  const [detail, setDetail] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [linkRole, setLinkRole] = useState('member');
  const [linkExpiresDays, setLinkExpiresDays] = useState(14);
  const [linkPassword, setLinkPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [message, setMessage] = useState('');
  /** Active share-link invite shown with copy + QR */
  const [shareLink, setShareLink] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const loadDetail = async (teamId) => {
    if (!teamId) {
      setDetail(null);
      return;
    }
    try {
      const data = await teamsAPI.get(teamId);
      setDetail({
        ...data,
        invites: (data.invites || []).map(withLocalAcceptUrl)
      });
      setSelectedId(teamId);
    } catch (err) {
      console.error('[TeamsSettings] load failed', err);
      setMessage(err.message || 'Failed to load team');
    }
  };

  // Load team detail when selection is set (including on mount / active workspace)
  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
    setShareLink(null);
    setQrDataUrl('');
    setCopied(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTeamId && activeTeamId !== selectedId) {
      setSelectedId(activeTeamId);
    }
  }, [activeTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    if (!shareLink?.acceptUrl) {
      setQrDataUrl('');
      return undefined;
    }
    (async () => {
      try {
        const url = await QRCode.toDataURL(shareLink.acceptUrl, {
          width: 180,
          margin: 2,
          errorCorrectionLevel: 'M'
        });
        if (!cancelled) setQrDataUrl(url);
      } catch (err) {
        console.error('[TeamsSettings] QR generate failed', err);
        if (!cancelled) setQrDataUrl('');
      }
    })();
    return () => { cancelled = true; };
  }, [shareLink?.acceptUrl]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setMessage('');
    try {
      const data = await teamsAPI.create(trimmed);
      setName('');
      await refreshTeams();
      if (data.team?.id) {
        setActiveTeamId(data.team.id);
        await loadDetail(data.team.id);
      }
      setMessage(`Created ${trimmed}`);
    } catch (err) {
      setMessage(err.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedId || !inviteEmail.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const data = await teamsAPI.invite(selectedId, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      setInviteEmail('');
      const invited = withLocalAcceptUrl(data.invite);
      const code = invited?.code ? ` [#${invited.code}]` : '';
      setMessage(`Invite sent to ${invited?.email}${code}. Link: ${invited?.acceptUrl || '(check email)'}`);
      await loadDetail(selectedId);
    } catch (err) {
      setMessage(err.message || 'Invite failed');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedId) return;
    setLinkBusy(true);
    setMessage('');
    setCopied(false);
    try {
      const data = await teamsAPI.createInviteLink(selectedId, {
        role: linkRole,
        expiresInDays: linkExpiresDays,
        password: linkPassword.trim()
      });
      const invite = withLocalAcceptUrl(data.invite);
      if (!invite?.acceptUrl) {
        throw new Error('Invite link missing acceptUrl');
      }
      setShareLink(invite);
      setLinkPassword('');
      const bits = [`#${invite.code || invite.id}`];
      if (invite.hasPassword) bits.push('password on');
      bits.push(`expires ${formatExpires(invite.expiresAt)}`);
      setMessage(`Share link ready (${bits.join(' · ')}) — copy or show the QR code.`);
      console.log('[TeamsSettings] invite link created', invite.code, invite.acceptUrl);
      await loadDetail(selectedId);
    } catch (err) {
      console.error('[TeamsSettings] createInviteLink failed', err);
      setMessage(err.message || 'Could not create share link');
    } finally {
      setLinkBusy(false);
    }
  };

  const handleCopyLink = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[TeamsSettings] clipboard failed', err);
      setMessage('Could not copy — select the link and copy manually');
    }
  };

  const handleRevoke = async (inviteId) => {
    if (!selectedId || !inviteId) return;
    if (!window.confirm('Revoke this invite? The link will stop working.')) return;
    setBusy(true);
    setMessage('');
    try {
      await teamsAPI.revokeInvite(selectedId, inviteId);
      if (shareLink?.id === inviteId) {
        setShareLink(null);
        setQrDataUrl('');
      }
      setMessage('Invite revoked');
      await loadDetail(selectedId);
    } catch (err) {
      console.error('[TeamsSettings] revoke failed', err);
      setMessage(err.message || 'Could not revoke invite');
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = detail?.team?.role === 'admin';

  return (
    <div className="teams-settings">
      <p>
        Collaborate on deals with partners. Select a team in the header to auto-save into it.
        Soft seat cap: {seatCap}.
      </p>

      <div className="teams-settings__create">
        <input
          type="text"
          placeholder="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
        <button type="button" className="btn-primary" disabled={creating || !name.trim()} onClick={handleCreate}>
          {creating ? 'Creating…' : 'Create team'}
        </button>
      </div>

      {teams.length > 0 && (
        <div className="teams-settings__list">
          <label>
            Manage team
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(Number(e.target.value) || null)}
            >
              <option value="">Select…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role})
                </option>
              ))}
            </select>
          </label>
          {selectedId ? (
            <button type="button" className="btn-secondary" onClick={() => setActiveTeamId(selectedId)}>
              Set as active workspace
            </button>
          ) : null}
        </div>
      )}

      {detail?.team && (
        <div className="teams-settings__detail">
          <h3>{detail.team.name}</h3>
          <p>Your role: {detail.team.role}</p>
          <p className="teams-settings__members-label">Members ({(detail.members || []).length})</p>
          <ul>
            {(detail.members || []).map((m) => (
              <li key={m.user_id}>{m.email} — {m.role}</li>
            ))}
          </ul>

          {isAdmin ? (
            <>
              <div className="teams-settings__invite">
                <p className="teams-settings__invite-hint">
                  Invite by email (max {seatCap} seats). They must sign in as that email.
                </p>
                <input
                  type="email"
                  placeholder="partner@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="button" className="btn-primary" disabled={busy || !inviteEmail.trim()} onClick={handleInvite}>
                  {busy ? 'Inviting…' : 'Send invite'}
                </button>
              </div>

              <div className="teams-settings__share-link">
                <p className="teams-settings__invite-hint">
                  Or share a link / QR — any signed-in Vettr user can join (single-use).
                </p>
                <div className="teams-settings__share-link-row">
                  <select value={linkRole} onChange={(e) => setLinkRole(e.target.value)} aria-label="Link invite role">
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <select
                    value={linkExpiresDays}
                    onChange={(e) => setLinkExpiresDays(Number(e.target.value))}
                    aria-label="Link expiration"
                  >
                    {EXPIRES_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        Expires in {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="password"
                    placeholder="Optional password"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    autoComplete="new-password"
                    maxLength={72}
                    aria-label="Optional invite password"
                  />
                  <button type="button" className="btn-secondary" disabled={linkBusy} onClick={handleGenerateLink}>
                    {linkBusy ? 'Generating…' : 'Generate link'}
                  </button>
                </div>

                {shareLink?.acceptUrl ? (
                  <div className="teams-settings__share-link-card">
                    <label className="teams-settings__share-link-label" htmlFor="team-invite-url">
                      Invite #{shareLink.code || shareLink.id} ({shareLink.role})
                      {shareLink.hasPassword ? ' · password protected' : ''}
                      {shareLink.expiresAt ? ` · expires ${formatExpires(shareLink.expiresAt)}` : ''}
                    </label>
                    <div className="teams-settings__share-link-url-row">
                      <input
                        id="team-invite-url"
                        type="text"
                        readOnly
                        value={shareLink.acceptUrl}
                        onFocus={(e) => e.target.select()}
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleCopyLink(shareLink.acceptUrl)}
                      >
                        {copied ? 'Copied' : 'Copy link'}
                      </button>
                    </div>
                    {qrDataUrl ? (
                      <div className="teams-settings__qr">
                        <img src={qrDataUrl} alt="QR code for team invite link" width={180} height={180} />
                        <p className="crm-muted">Scan to open the accept page on a phone</p>
                      </div>
                    ) : (
                      <p className="crm-muted">Generating QR…</p>
                    )}
                    <button
                      type="button"
                      className="btn-secondary teams-settings__revoke"
                      disabled={busy}
                      onClick={() => handleRevoke(shareLink.id)}
                    >
                      Revoke this link
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <p className="crm-muted">Only team admins can invite members.</p>
          )}

          {(detail.invites || []).length > 0 && (
            <div className="teams-settings__pending">
              <p>Pending invites</p>
              <ul>
                {detail.invites.map((i) => (
                  <li key={i.id} className="teams-settings__pending-item">
                    <span className="teams-settings__pending-meta">
                      <span>{inviteLabel(i)}</span>
                      <span className="crm-muted teams-settings__pending-sub">
                        {i.hasPassword ? 'Password · ' : ''}
                        {i.expiresAt ? `Expires ${formatExpires(i.expiresAt)}` : ''}
                      </span>
                    </span>
                    {isAdmin ? (
                      <span className="teams-settings__pending-actions">
                        {i.acceptUrl && (i.inviteKind === 'link' || !i.email) ? (
                          <button type="button" className="btn-link" onClick={() => {
                            setShareLink(i);
                            setCopied(false);
                            setMessage('');
                          }}>
                            Show QR
                          </button>
                        ) : null}
                        <button type="button" className="btn-link" disabled={busy} onClick={() => handleRevoke(i.id)}>
                          Revoke
                        </button>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {selectedId && !detail?.team ? (
        <p className="crm-muted">Loading team…</p>
      ) : null}

      {message ? <p className="settings-message" role="status">{message}</p> : null}
    </div>
  );
}
