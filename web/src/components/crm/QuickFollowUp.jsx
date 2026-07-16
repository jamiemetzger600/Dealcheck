import { useMemo, useState } from 'react';
import { crmAPI } from '../../utils/api';

const PRESETS = [
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: '3days', label: '3 days' },
  { id: '1week', label: '1 week' }
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function defaultCustomDatetime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setSeconds(0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toIsoDatetime(localValue) {
  if (!localValue) return null;
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function contactLabel(contact) {
  const name = contact.name || contact.email;
  const role = contact.role ? ` (${contact.role})` : '';
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
  const [notifySelf, setNotifySelf] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState(() => new Set());
  const [otherEmail, setOtherEmail] = useState('');
  const [notifyOther, setNotifyOther] = useState(false);

  const contactsWithEmail = useMemo(
    () => contacts.filter((c) => c.email && String(c.email).trim()),
    [contacts]
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

  const buildNotifyRecipients = () => {
    const recipients = [];
    if (notifySelf) recipients.push({ type: 'self' });
    for (const contactId of selectedContactIds) {
      recipients.push({ type: 'contact', contactId });
    }
    if (notifyOther && otherEmail.trim()) {
      recipients.push({ type: 'email', email: otherEmail.trim() });
    }
    return recipients;
  };

  const handlePreset = async (preset) => {
    if (!dealId || saving) return;
    setSaving(true);
    try {
      await crmAPI.quickFollowUp(dealId, { preset, notifyRecipients: [{ type: 'self' }] });
      onCreated?.();
    } catch (err) {
      alert('Failed to create follow-up: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!dealId || saving) return;

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
    try {
      await crmAPI.quickFollowUp(dealId, {
        title: customTitle.trim() || defaultTitle,
        dueAt,
        notifyRecipients
      });
      setShowCustom(false);
      setCustomTitle('');
      setCustomDueAt(defaultCustomDatetime());
      setSelectedContactIds(new Set());
      setOtherEmail('');
      setNotifyOther(false);
      onCreated?.();
    } catch (err) {
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
            className="crm-chip"
            disabled={saving || disabled}
            onClick={() => handlePreset(p.id)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`crm-chip${showCustom ? ' crm-chip--active' : ''}`}
          disabled={saving}
          onClick={() => setShowCustom((v) => !v)}
        >
          Custom…
        </button>
      </div>

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
              onChange={(e) => setCustomDueAt(e.target.value)}
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
              <span>Me{userEmail ? ` (${userEmail})` : ''}</span>
            </label>

            {contactsWithEmail.map((contact) => (
              <label key={contact.id} className="crm-quick-followup__check">
                <input
                  type="checkbox"
                  checked={selectedContactIds.has(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                />
                <span>
                  {contactLabel(contact)}
                  <span className="crm-muted"> — {contact.email}</span>
                </span>
              </label>
            ))}

            {contactsWithEmail.length === 0 ? (
              <p className="crm-muted crm-quick-followup__hint">
                No broker contacts with email on this deal yet.
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
              onClick={() => setShowCustom(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
