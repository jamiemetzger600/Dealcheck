import { useState, useEffect, useCallback } from 'react';
import { crmAPI } from '../../utils/api';

function normalizeLinkedDeals(contact) {
  if (Array.isArray(contact.linked_deals) && contact.linked_deals.length > 0) {
    return contact.linked_deals;
  }
  const names = contact.deal_names || [];
  return names.map((name) => ({ id: null, name }));
}

export default function CrmContactList({ onSelectDeal, deals = [] }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getContacts();
      setContacts(data.contacts || []);
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolveDealId = (linkedDeal) => {
    if (linkedDeal?.id) return linkedDeal.id;
    const name = (linkedDeal?.name || '').trim();
    if (!name) return null;
    const match = deals.find((d) => (d.name || '').trim() === name);
    return match?.id ?? match?.vettrId ?? null;
  };

  if (loading) return <div className="crm-panel">Loading contacts…</div>;
  if (error) {
    return (
      <div className="crm-panel crm-panel--error">
        <p>{error}</p>
        <button type="button" className="btn-secondary" onClick={load}>Retry</button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="crm-empty">
        <h2>No contacts yet</h2>
        <p>Broker contacts are added automatically when you save listings from the feed.</p>
      </div>
    );
  }

  return (
    <div className="crm-contacts">
      <table className="crm-contacts-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Company</th>
            <th>Deals</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => {
            const linked = normalizeLinkedDeals(c);
            const shown = linked.slice(0, 3);
            const extra = (c.deal_count ?? linked.length) - shown.length;
            return (
              <tr key={c.id}>
                <td>{c.name || '—'}</td>
                <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</td>
                <td>{c.company_name || '—'}</td>
                <td>
                  {shown.map((linkedDeal) => {
                    const id = resolveDealId(linkedDeal);
                    const label = linkedDeal.name || 'Untitled deal';
                    return id ? (
                      <button
                        key={`${c.id}-${id}`}
                        type="button"
                        className="crm-contacts-deal-link"
                        onClick={() => onSelectDeal?.(id)}
                      >
                        {label}
                      </button>
                    ) : (
                      <span key={`${c.id}-${label}`} className="crm-contacts-deal-name">{label}</span>
                    );
                  })}
                  {extra > 0 ? <span className="crm-muted"> +{extra}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
