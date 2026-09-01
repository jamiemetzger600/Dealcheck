import { useCallback, useEffect, useState } from 'react';
import { crmAPI } from '../../utils/api';

const ROLES = [
  { value: 'broker', label: 'Broker' },
  { value: 'seller', label: 'Seller' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'other', label: 'Other' }
];

const EMPTY = { name: '', email: '', phone: '', title: '', companyName: '', role: 'broker' };

export default function CrmDealContacts({ dealId, canWrite = true, onChanged }) {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!dealId) return;
    try {
      const data = await crmAPI.getDealContacts(dealId);
      setContacts(data.contacts || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canWrite || saving) return;
    if (!form.name.trim() && !form.email.trim()) {
      alert('Name or email required');
      return;
    }
    setSaving(true);
    try {
      await crmAPI.linkDealContact(dealId, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        title: form.title.trim() || null,
        companyName: form.companyName.trim() || null,
        role: form.role
      });
      setForm(EMPTY);
      await load();
      onChanged?.();
    } catch (err) {
      alert(err.message || 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (contactId, role) => {
    if (!canWrite) return;
    if (!window.confirm('Remove this contact from the deal?')) return;
    try {
      await crmAPI.unlinkDealContact(dealId, contactId, role);
      await load();
      onChanged?.();
    } catch (err) {
      alert(err.message || 'Failed to unlink');
    }
  };

  return (
    <div className="crm-deal-contacts">
      {error ? <p className="crm-panel--error">{error}</p> : null}
      {contacts.length === 0 ? (
        <p className="crm-muted">No contacts linked yet — add broker, seller, attorney, etc.</p>
      ) : (
        <ul className="crm-deal-contacts__list">
          {contacts.map((c) => (
            <li key={`${c.id}-${c.role}`} className="crm-deal-contacts__item">
              <div>
                <strong>{c.name || '—'}</strong>
                <span className="crm-deal-contacts__role">{c.role}</span>
                {c.company_name ? <span className="crm-muted"> · {c.company_name}</span> : null}
                <div className="crm-muted">
                  {c.title ? `${c.title} · ` : ''}
                  {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}
                  {c.phone ? ` · ${c.phone}` : ''}
                </div>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  className="btn-secondary btn-secondary--sm"
                  onClick={() => handleUnlink(c.id, c.role)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form className="crm-deal-contacts__form" onSubmit={handleAdd}>
          <div className="crm-deal-contacts__row">
            <input
              className="modal-input"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <select
              className="modal-input"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              aria-label="Role"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="crm-deal-contacts__row">
            <input
              className="modal-input"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              className="modal-input"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="crm-deal-contacts__row">
            <input
              className="modal-input"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className="modal-input"
              placeholder="Company"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-primary btn-secondary--sm" disabled={saving}>
            {saving ? 'Adding…' : 'Add contact'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
