import { useEffect, useMemo, useState } from 'react';
import { crmAPI } from '../../utils/api';

const PRESETS = [
  { id: 'tomorrow', label: 'Tomorrow', days: 1 },
  { id: '3days', label: '3 days', days: 3 },
  { id: '1week', label: '1 week', days: 7 }
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toLocalDatetimeValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function defaultCustomDatetime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  return toLocalDatetimeValue(d);
}

/** Local datetime-local value for a preset (9:00 AM that day). */
function presetToLocalDatetime(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return toLocalDatetimeValue(d);
}

function toIsoDatetime(localValue) {
  if (!localValue) return null;
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function displayNameFromEmail(email) {
  const local = String(email || '').split('@')[0] || 'Member';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Member';
}

function contactLabel(contact) {
  const name = contact.name || displayNameFromEmail(contact.email);
  const role = contact.role ? ` (${contact.role})` : '';
  return `${name}${role}`;
}

function memberLabel(member) {
  const name = member.displayName || displayNameFromEmail(member.email);
  const role = member.role ? ` · ${String(member.role)}` : '';
  return `${name}${role}`;
}

export default function QuickFollowUp({
  dealId,
  dealName,
  contacts = [],
  userEmail = '',
  onCreated,
  disabled = false
}) {
  const [saving, setSaving] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDueAt, setCustomDueAt] = useState(defaultCustomDatetime);
  const [activePreset, setActivePreset] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [notifySelf, setNotifySelf] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState(() => new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState(() => new Set());
  const [members, setMembers] = useState([]);
  const [otherEmail, setOtherEmail] = useState('');
  const [notifyOther, setNotifyOther] = useState(false);

  useEffect(() => {
    if (!dealId || !showCustom) return undefined;
    let cancelled = false;
    crmAPI.getThreadMembers(dealId)
      .then((data) => {
        if (!cancelled) setMembers(data.members || []);
      })
      .catch((err) => {
        console.warn('[QuickFollowUp] members load failed', err.message);
        if (!cancelled) setMembers([]);
      });
    return () => { cancelled = true; };
  }, [dealId, showCustom]);

  const selfEmail = String(userEmail || '').trim().toLowerCase();

  const teamMembers = useMemo(
    () => members.filter((m) => String(m.email || '').toLowerCase() !== selfEmail),
    [members, selfEmail]
  );

  const teamEmails = useMemo(
    () => new Set(members.map((m) => String(m.email || '').toLowerCase()).filter(Boolean)),
    [members]
  );

  // Broker/contacts — hide those already listed as team members
  const contactsWithEmail = useMemo(
    () => contacts.filter((c) => {
      const email = String(c.email || '').trim().toLowerCase();
      if (!email) return false;
      if (email === selfEmail) return false;
      if (teamEmails.has(email)) return false;
      return true;
    }),
    [contacts, selfEmail, teamEmails]
  );

  const defaultTitle = dealName ? `Follow up: ${dealName}` : 'Follow up';

  const toggleContact = (contactId) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const toggleMember = (memberId) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const buildNotifyRecipients = () => {
    const recipients = [];
    if (notifySelf) recipients.push({ type: 'self' });
    for (const userId of selectedMemberIds) {
      recipients.push({ type: 'team_member', userId: Number(userId) });
    }
    for (const contactId of selectedContactIds) {
      recipients.push({ type: 'contact', contactId });
    }
    if (notifyOther && otherEmail.trim()) {
      recipients.push({ type: 'email', email: otherEmail.trim() });
    }
    return recipients;
  };

  const applyPresetToForm = (preset) => {
    setCustomDueAt(presetToLocalDatetime(preset.days));
    setActivePreset(preset.id);
    setStatusMsg(`Date set to ${preset.label.toLowerCase()} — adjust alerts below, then Set reminder.`);
    console.log('[QuickFollowUp] preset applied to custom form', { preset: preset.id, dealId });
  };

  const handlePreset = async (presetId) => {
    if (!dealId || saving || disabled) {
      console.warn('[QuickFollowUp] preset ignored', { dealId, saving, disabled, presetId });
      return;
    }

    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // Custom form open → fill date instead of silent create (looked broken)
    if (showCustom) {
      applyPresetToForm(preset);
      return;
    }

    setSaving(true);
    setStatusMsg('');
    setActivePreset(presetId);
    try {
      console.log('[QuickFollowUp] creating preset follow-up', { dealId, preset: presetId });
      await crmAPI.quickFollowUp(dealId, { preset: presetId, notifyRecipients: [{ type: 'self' }] });
      setStatusMsg(`Reminder set for ${preset.label.toLowerCase()}.`);
      console.log('[QuickFollowUp] preset follow-up created', { dealId, preset: presetId });
      await onCreated?.();
    } catch (err) {
      console.error('[QuickFollowUp] preset failed', err);
      setActivePreset(null);
      setStatusMsg('');
      alert('Failed to create follow-up: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!dealId || saving || disabled) return;

    const dueAt = toIsoDatetime(customDueAt);
    if (!dueAt) {
      alert('Pick a valid date and time.');
      return;
    }

    const notifyRecipients = buildNotifyRecipients();
    if (!notifyRecipients.length) {
      alert('Choose at least one person to alert.');
      return;
    }

    setSaving(true);
    setStatusMsg('');
    try {
      await crmAPI.quickFollowUp(dealId, {
        title: customTitle.trim() || defaultTitle,
        dueAt,
        notifyRecipients
      });
      setShowCustom(false);
      setCustomTitle('');
      setCustomDueAt(defaultCustomDatetime());
      setActivePreset(null);
      setSelectedContactIds(new Set());
      setSelectedMemberIds(new Set());
      setOtherEmail('');
      setNotifyOther(false);
      setStatusMsg('Custom reminder set.');
      console.log('[QuickFollowUp] custom reminder created', { dealId, notifyRecipients });
      await onCreated?.();
    } catch (err) {
      console.error('[QuickFollowUp] custom failed', err);
      alert('Failed to create reminder: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crm-quick-followup">
      {disabled ? (
        <p className="crm-muted">Viewer role — follow-ups are read-only.</p>
      ) : null}
      <span className="crm-quick-followup__label">
        Follow up{dealName ? ` on ${dealName}` : ''}
      </span>
      <div className="crm-quick-followup__chips">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`crm-chip${activePreset === p.id ? ' crm-chip--active' : ''}`}
            disabled={saving || disabled || !dealId}
            onClick={() => handlePreset(p.id)}
          >
            {saving && activePreset === p.id && !showCustom ? 'Saving…' : p.label}
          </button>
        ))}
        <button
          type="button"
          className={`crm-chip${showCustom ? ' crm-chip--active' : ''}`}
          disabled={saving || disabled || !dealId}
          onClick={() => {
            setShowCustom((v) => {
              const next = !v;
              if (!next) {
                setActivePreset(null);
                setStatusMsg('');
              }
              return next;
            });
          }}
        >
          Custom…
        </button>
      </div>

      {statusMsg ? (
        <p className="crm-quick-followup__status" role="status">{statusMsg}</p>
      ) : null}

      {showCustom ? (
        <form className="crm-quick-followup__custom" onSubmit={handleCustomSubmit}>
          <label className="crm-quick-followup__field">
            <span>Reminder title</span>
            <input
              type="text"
              className="modal-input"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={defaultTitle}
            />
          </label>

          <label className="crm-quick-followup__field">
            <span>Date &amp; time</span>
            <input
              type="datetime-local"
              className="modal-input"
              value={customDueAt}
              onChange={(e) => {
                setCustomDueAt(e.target.value);
                setActivePreset(null);
              }}
              required
            />
          </label>

          <fieldset className="crm-quick-followup__recipients">
            <legend>Who gets alerted</legend>
            <label className="crm-quick-followup__check">
              <input
                type="checkbox"
                checked={notifySelf}
                onChange={(e) => setNotifySelf(e.target.checked)}
              />
              <span>Me</span>
            </label>

            {teamMembers.length > 0 ? (
              <>
                <p className="crm-quick-followup__group-label">Team</p>
                {teamMembers.map((m) => (
                  <label key={m.id} className="crm-quick-followup__check">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                    />
                    <span>{memberLabel(m)}</span>
                  </label>
                ))}
              </>
            ) : null}

            {contactsWithEmail.length > 0 ? (
              <>
                <p className="crm-quick-followup__group-label">Deal contacts</p>
                {contactsWithEmail.map((contact) => (
                  <label key={contact.id} className="crm-quick-followup__check">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                    />
                    <span>{contactLabel(contact)}</span>
                  </label>
                ))}
              </>
            ) : null}

            {teamMembers.length === 0 && contactsWithEmail.length === 0 ? (
              <p className="crm-muted crm-quick-followup__hint">
                No team members or deal contacts yet. Use “Someone else” or switch this deal to a team workspace.
              </p>
            ) : null}

            <label className="crm-quick-followup__check">
              <input
                type="checkbox"
                checked={notifyOther}
                onChange={(e) => setNotifyOther(e.target.checked)}
              />
              <span>Someone else</span>
            </label>
            {notifyOther ? (
              <input
                type="email"
                className="modal-input"
                value={otherEmail}
                onChange={(e) => setOtherEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            ) : null}
          </fieldset>

          <div className="crm-quick-followup__actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Set reminder'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={saving}
              onClick={() => {
                setShowCustom(false);
                setActivePreset(null);
                setStatusMsg('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
