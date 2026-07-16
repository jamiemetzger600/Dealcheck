import { useState, useEffect, useCallback } from 'react';
import { crmAPI } from '../../../utils/api';
import { formatDate } from '../../../utils/normalizeDeal';

const DD_STATUSES = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting_on_other', label: 'Waiting' },
  { value: 'complete', label: 'Complete' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'na', label: 'N/A' }
];

export default function DdChecklist({ dealId, onRefresh, canWrite = true }) {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [error, setError] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [addingItemGroupId, setAddingItemGroupId] = useState(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [shareForm, setShareForm] = useState({ open: false, mode: 'view_only', label: '', password: '', expiresAt: '' });

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getDealDd(dealId);
      setChecklist(data.checklist);
    } catch (err) {
      setError(err.message);
      setChecklist(null);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStart = async () => {
    if (!dealId || starting) return;
    setStarting(true);
    try {
      const data = await crmAPI.startDealDd(dealId);
      setChecklist(data.checklist);
      onRefresh?.();
    } catch (err) {
      alert('Failed to start DD: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleStatusChange = async (itemId, status) => {
    try {
      const data = await crmAPI.patchDdItem(dealId, itemId, { status });
      setChecklist(data.checklist);
      onRefresh?.();
    } catch (err) {
      alert('Failed to update item: ' + err.message);
    }
  };

  const handleDueChange = async (itemId, dueAt) => {
    try {
      const data = await crmAPI.patchDdItem(dealId, itemId, { dueAt: dueAt || null });
      setChecklist(data.checklist);
    } catch (err) {
      alert('Failed to set due date: ' + err.message);
    }
  };

  const handleAssignee = async (itemId, email, name) => {
    const trimmed = (email || '').trim();
    if (!trimmed) return;
    try {
      const data = await crmAPI.patchDdItem(dealId, itemId, {
        assignee: { email: trimmed, name: name || null }
      });
      setChecklist(data.checklist);
    } catch (err) {
      alert('Failed to assign: ' + err.message);
    }
  };

  const handleAddGroup = () => {
    if (showAddGroup) {
      setShowAddGroup(false);
      setNewGroupName('');
      return;
    }
    setShowAddGroup(true);
    setNewGroupName('');
  };

  const handleAddGroupSubmit = async () => {
    const name = newGroupName.trim();
    if (!name || addingGroup) return;
    setAddingGroup(true);
    try {
      const data = await crmAPI.addDdGroup(dealId, name);
      setChecklist(data.checklist);
      setNewGroupName('');
      setShowAddGroup(false);
      onRefresh?.();
    } catch (err) {
      alert('Failed to add group: ' + err.message);
    } finally {
      setAddingGroup(false);
    }
  };

  const cancelAddGroup = () => {
    setShowAddGroup(false);
    setNewGroupName('');
  };

  const handleAddItem = (groupId) => {
    if (addingItemGroupId === groupId) {
      setAddingItemGroupId(null);
      setNewItemTitle('');
      return;
    }
    setAddingItemGroupId(groupId);
    setNewItemTitle('');
  };

  const handleAddItemSubmit = async (groupId) => {
    const title = newItemTitle.trim();
    if (!title || addingItem) return;
    setAddingItem(true);
    try {
      const data = await crmAPI.addDdItem(dealId, groupId, { title });
      setChecklist(data.checklist);
      setAddingItemGroupId(null);
      setNewItemTitle('');
      onRefresh?.();
    } catch (err) {
      alert('Failed to add item: ' + err.message);
    } finally {
      setAddingItem(false);
    }
  };

  const cancelAddItem = () => {
    setAddingItemGroupId(null);
    setNewItemTitle('');
  };

  const handleDocLink = async (itemId) => {
    const filename = window.prompt('Document name or link label');
    if (!filename?.trim()) return;
    const storageKey = window.prompt('URL or file reference (optional)') || filename;
    try {
      const data = await crmAPI.addDdItemDocument(dealId, itemId, { filename: filename.trim(), storageKey });
      setChecklist(data.checklist);
    } catch (err) {
      alert('Failed to add document: ' + err.message);
    }
  };

  const handleShareSubmit = async () => {
    try {
      const data = await crmAPI.createDdShareLink(dealId, {
        label: shareForm.label || (shareForm.mode === 'collaborative' ? 'Collaborative' : 'View only'),
        mode: shareForm.mode,
        password: shareForm.password || undefined,
        expiresAt: shareForm.expiresAt || undefined
      });
      const url = `${window.location.origin}/dd/${data.link.token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard');
      setShareForm((f) => ({ ...f, open: false }));
      await load();
    } catch (err) {
      alert('Failed to create share link: ' + err.message);
    }
  };

  const handleRevokeLink = async (linkId) => {
    if (!window.confirm('Revoke this share link?')) return;
    try {
      await crmAPI.revokeDdShareLink(dealId, linkId);
      await load();
    } catch (err) {
      alert('Failed to revoke: ' + err.message);
    }
  };

  if (loading) return <p>Loading due diligence…</p>;
  if (error) return <p className="crm-panel--error">{error}</p>;

  if (!checklist) {
    return (
      <div className="dd-start-prompt">
        <h3>Due Diligence</h3>
        <p>Start from the business acquisition template (~35 checklist items across 9 groups).</p>
        <button type="button" className="btn-primary" disabled={starting || !canWrite} onClick={handleStart}>
          {starting ? 'Starting…' : 'Start DD checklist'}
        </button>
        {!canWrite ? <p className="crm-muted">Viewer role — DD is read-only.</p> : null}
      </div>
    );
  }

  const progress = checklist.progress || {};

  return (
    <div className="dd-checklist">
      <header className="dd-checklist__header">
        <div>
          <h3>Due Diligence</h3>
          <p className="dd-checklist__progress">
            {progress.percent ?? 0}% complete
            {progress.overdueItems ? ` · ${progress.overdueItems} overdue` : ''}
          </p>
        </div>
        <div className="dd-checklist__actions">
          {canWrite ? (
            <button type="button" className="btn-secondary" onClick={() => setShareForm({ ...shareForm, open: true, mode: 'view_only' })}>
              Share link…
            </button>
          ) : (
            <span className="crm-muted">Viewer — read only</span>
          )}
        </div>
      </header>

      {shareForm.open ? (
        <div className="dd-share-form">
          <label>
            Mode
            <select value={shareForm.mode} onChange={(e) => setShareForm({ ...shareForm, mode: e.target.value })} className="modal-input">
              <option value="view_only">View only</option>
              <option value="collaborative">Collaborative</option>
            </select>
          </label>
          <label>
            Label
            <input className="modal-input" value={shareForm.label} onChange={(e) => setShareForm({ ...shareForm, label: e.target.value })} placeholder="Seller attorney" />
          </label>
          <label>
            Password (optional)
            <input type="password" className="modal-input" value={shareForm.password} onChange={(e) => setShareForm({ ...shareForm, password: e.target.value })} />
          </label>
          <label>
            Expires (optional)
            <input type="date" className="modal-input" value={shareForm.expiresAt} onChange={(e) => setShareForm({ ...shareForm, expiresAt: e.target.value })} />
          </label>
          <div className="dd-share-form__actions">
            <button type="button" className="btn-primary" onClick={handleShareSubmit}>Create & copy link</button>
            <button type="button" className="btn-secondary" onClick={() => setShareForm({ ...shareForm, open: false })}>Cancel</button>
          </div>
        </div>
      ) : null}

      {shareUrl ? (
        <p className="dd-share-url">
          Latest link: <a href={shareUrl} target="_blank" rel="noopener noreferrer">{shareUrl}</a>
        </p>
      ) : null}

      {(checklist.shareLinks || []).length > 0 ? (
        <ul className="dd-share-links">
          {checklist.shareLinks.map((link) => (
            <li key={link.id}>
              {link.label} ({link.mode})
              <button type="button" className="btn-secondary" onClick={() => handleRevokeLink(link.id)}>Revoke</button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="dd-add-group">
        <button
          type="button"
          className={`btn-secondary${showAddGroup ? ' dd-group__add-item--active' : ''}`}
          onClick={handleAddGroup}
        >
          {showAddGroup ? 'Cancel' : '+ Group'}
        </button>
      </div>

      {showAddGroup ? (
        <div className="dd-add-item-form dd-add-group-form">
          <input
            type="text"
            className="modal-input"
            placeholder="New group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddGroupSubmit();
              if (e.key === 'Escape') cancelAddGroup();
            }}
            autoFocus
            aria-label="New group name"
          />
          <button
            type="button"
            className="btn-primary"
            disabled={addingGroup || !newGroupName.trim()}
            onClick={handleAddGroupSubmit}
          >
            {addingGroup ? 'Adding…' : 'Add group'}
          </button>
        </div>
      ) : null}

      {(checklist.groups || []).map((group) => {
        const done = (group.items || []).filter((i) => i.status === 'complete' || i.status === 'na').length;
        const total = (group.items || []).length;
        return (
          <section key={group.id} className="dd-group">
            <h4 className="dd-group__title">
              {group.name} <span>({done}/{total})</span>
              <button
                type="button"
                className={`btn-secondary dd-group__add-item${addingItemGroupId === group.id ? ' dd-group__add-item--active' : ''}`}
                onClick={() => handleAddItem(group.id)}
              >
                {addingItemGroupId === group.id ? 'Cancel' : '+ Item'}
              </button>
            </h4>
            <ul className="dd-item-list">
              {addingItemGroupId === group.id ? (
                <li className="dd-add-item-form">
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Checklist item title"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddItemSubmit(group.id);
                      if (e.key === 'Escape') cancelAddItem();
                    }}
                    autoFocus
                    aria-label="New checklist item title"
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={addingItem || !newItemTitle.trim()}
                    onClick={() => handleAddItemSubmit(group.id)}
                  >
                    {addingItem ? 'Adding…' : 'Add'}
                  </button>
                </li>
              ) : null}
              {(group.items || []).map((item) => (
                <li key={item.id} className="dd-item dd-item--stacked">
                  <div className="dd-item__row">
                  <div className="dd-item__main">
                    <span className="dd-item__title">{item.title}</span>
                    {item.requests_document ? <span className="dd-item__badge">Doc request</span> : null}
                    <input
                      type="date"
                      className="modal-input dd-item__due-input"
                      value={item.due_at ? item.due_at.slice(0, 10) : ''}
                      onChange={(e) => handleDueChange(item.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                      aria-label={`Due date for ${item.title}`}
                    />
                    <input
                      type="email"
                      className="modal-input dd-item__assignee"
                      placeholder="Assignee email"
                      defaultValue={item.assignees?.[0]?.email || ''}
                      onBlur={(e) => handleAssignee(item.id, e.target.value, item.assignees?.[0]?.name)}
                    />
                    {item.requests_document ? (
                      <button type="button" className="btn-secondary" onClick={() => handleDocLink(item.id)}>+ Doc</button>
                    ) : null}
                  </div>
                  <select
                    className="modal-input dd-item__status"
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                    disabled={!canWrite}
                    aria-label={`Status for ${item.title}`}
                  >
                    {DD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  </div>
                  {(item.comments || []).length > 0 ? (
                    <ul className="dd-item__comments">
                      {item.comments.map((comment) => (
                        <li
                          key={comment.id}
                          className={`dd-item__comment${comment.isExternal ? ' dd-item__comment--external' : ''}`}
                        >
                          <span className="dd-item__comment-meta">
                            {comment.authorName || comment.authorEmail || 'Unknown'}
                            {comment.isExternal ? ' · portal' : ''}
                            {comment.createdAt ? ` · ${formatDate(comment.createdAt)}` : ''}
                          </span>
                          <p className="dd-item__comment-body">{comment.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
