import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { crmAPI } from '../../utils/api';
import { pollWhenVisible } from '../../utils/pollWhenVisible';

const REACTIONS = ['👍', '✅', '❓'];

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

function formatDueDay(isoOrDate) {
  if (!isoOrDate) return '';
  try {
    const d = typeof isoOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)
      ? new Date(`${isoOrDate}T12:00:00`)
      : new Date(isoOrDate);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(isoOrDate);
  }
}

function todayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dueAtPayload(dateInput) {
  if (!dateInput) return undefined;
  // Store midday local to avoid timezone day-shift surprises
  return new Date(`${dateInput}T12:00:00`).toISOString();
}

/**
 * Deal Thread — Sheets/Linear-style talk on a shared (or any) deal.
 */
export default function DealThread({
  dealId,
  pollMs = 12000,
  onThreadRead = null,
  onOpenSection = null
}) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [ddItems, setDdItems] = useState([]);
  const [body, setBody] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [linkedDdItemId, setLinkedDdItemId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const notifiedReadRef = useRef(false);
  const onThreadReadRef = useRef(onThreadRead);
  onThreadReadRef.current = onThreadRead;

  const load = useCallback(async ({ quiet } = {}) => {
    if (!dealId) return;
    try {
      if (!quiet) setLoading(true);
      const [thread, mem, dd] = await Promise.all([
        crmAPI.getThread(dealId),
        crmAPI.getThreadMembers(dealId).catch(() => ({ members: [] })),
        crmAPI.getDealDd(dealId).catch(() => ({ checklist: null }))
      ]);
      setMessages(thread.messages || []);
      setMembers(mem.members || []);
      const flat = [];
      for (const g of dd?.checklist?.groups || []) {
        for (const item of g.items || []) {
          if (item.status === 'complete' || item.status === 'na') continue;
          flat.push({
            id: item.id,
            title: item.title,
            groupName: g.name,
            status: item.status
          });
        }
      }
      setDdItems(flat);
      setError('');
      // Opening Talk marks mentions/unread read server-side — refresh Today badge once
      if (!quiet && !notifiedReadRef.current && onThreadReadRef.current) {
        notifiedReadRef.current = true;
        onThreadReadRef.current();
      }
    } catch (err) {
      console.error('[DealThread] load failed:', err);
      setError(err.message || 'Failed to load Talk');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    notifiedReadRef.current = false;
  }, [dealId]);

  useEffect(() => {
    load();
    if (!pollMs) return undefined;
    return pollWhenVisible(() => load({ quiet: true }), pollMs);
  }, [load, pollMs]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const linkedDdLabel = useMemo(() => {
    if (!linkedDdItemId) return null;
    const item = ddItems.find((i) => String(i.id) === String(linkedDdItemId));
    return item ? `${item.groupName}: ${item.title}` : null;
  }, [linkedDdItemId, ddItems]);

  const handleAssigneeChange = (value) => {
    setAssigneeUserId(value);
    if (value && !dueDate) {
      setDueDate(todayInputValue());
    }
    if (!value) {
      setDueDate('');
    }
  };

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    if (dueDate && !assigneeUserId) {
      setError('Pick an assignee when setting a due date');
      return;
    }
    setSending(true);
    try {
      await crmAPI.postThreadMessage(dealId, {
        body: text,
        assigneeUserId: assigneeUserId || undefined,
        dueAt: assigneeUserId ? dueAtPayload(dueDate) : undefined,
        linkedDdItemId: linkedDdItemId || undefined
      });
      setBody('');
      setAssigneeUserId('');
      setDueDate('');
      setLinkedDdItemId('');
      await load({ quiet: true });
    } catch (err) {
      console.error('[DealThread] send failed:', err);
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const insertMention = (email) => {
    const prefix = body.endsWith(' ') || !body ? '' : ' ';
    setBody(`${body}${prefix}@${email} `);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const toggleReaction = async (messageId, emoji) => {
    try {
      await crmAPI.reactThreadMessage(dealId, messageId, emoji);
      await load({ quiet: true });
    } catch (err) {
      console.error('[DealThread] react failed:', err);
    }
  };

  const toggleResolve = async (messageId, currentlyResolved) => {
    try {
      await crmAPI.resolveThreadMessage(dealId, messageId, !currentlyResolved);
      await load({ quiet: true });
    } catch (err) {
      console.error('[DealThread] resolve failed:', err);
    }
  };

  if (!dealId) return null;

  return (
    <div className="deal-thread">
      <div className="deal-thread__header">
        <h3>Talk</h3>
        <p className="deal-thread__hint">Team is notified on every post · @mention · assign + due</p>
      </div>

      {error ? <p className="deal-thread__error">{error}</p> : null}

      <div className="deal-thread__list" ref={listRef}>
        {loading && !messages.length ? (
          <p className="crm-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="crm-muted">Start the conversation — keep it short and actionable.</p>
        ) : (
          messages.map((m) => {
            const isSystem = m.message_kind === 'system';
            const resolved = Boolean(m.resolved_at);
            const meta = m.metadata && typeof m.metadata === 'object' ? m.metadata : {};
            return (
              <div
                key={m.id}
                className={`deal-thread__msg${isSystem ? ' deal-thread__msg--system' : ''}${resolved ? ' deal-thread__msg--resolved' : ''}`}
              >
                {isSystem ? (
                  <p className="deal-thread__system">{m.body}</p>
                ) : (
                  <>
                    <div className="deal-thread__msg-head">
                      <strong>{m.author_email}</strong>
                      <time>{formatTime(m.created_at)}</time>
                    </div>
                    <p className="deal-thread__body">{m.body}</p>
                    <div className="deal-thread__chips">
                      {m.assignee_email ? (
                        <span className="deal-thread__chip">→ {m.assignee_email}</span>
                      ) : null}
                      {meta.dueAt ? (
                        <span className="deal-thread__chip">Due {formatDueDay(meta.dueAt)}</span>
                      ) : null}
                      {meta.ddItemId ? (
                        <button
                          type="button"
                          className="deal-thread__chip deal-thread__chip--link"
                          onClick={() => {
                            console.log('[DealThread] open linked DD item', meta.ddItemId);
                            onOpenSection?.('crm-dd', { ddItemId: meta.ddItemId });
                          }}
                          title="Open Due Diligence"
                        >
                          DD · {meta.ddGroupName ? `${meta.ddGroupName}: ` : ''}{meta.ddItemTitle || 'Item'}
                        </button>
                      ) : null}
                    </div>
                    {m.tags?.length ? (
                      <div className="deal-thread__tags">
                        {m.tags.map((t) => (
                          <span key={t} className="deal-thread__tag">#{t}</span>
                        ))}
                      </div>
                    ) : null}
                    <div className="deal-thread__actions">
                      {REACTIONS.map((emoji) => {
                        const count = (m.reactions || []).filter((r) => r.emoji === emoji).length;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className="deal-thread__react"
                            onClick={() => toggleReaction(m.id, emoji)}
                          >
                            {emoji}{count ? ` ${count}` : ''}
                          </button>
                        );
                      })}
                      {(m.assignee_user_id || m.body) && (
                        <button
                          type="button"
                          className="deal-thread__resolve"
                          onClick={() => toggleResolve(m.id, resolved)}
                        >
                          {resolved ? 'Reopen' : 'Resolve'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="deal-thread__composer">
        <div className="deal-thread__toolbar">
          <button type="button" className="deal-thread__tool" onClick={() => setMentionOpen((v) => !v)} title="Mention">
            @
          </button>
          {members.length > 0 && (
            <select
              className="deal-thread__assign"
              value={assigneeUserId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              aria-label="Assign to"
            >
              <option value="">Assign…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.email}</option>
              ))}
            </select>
          )}
          <label className={`deal-thread__due${assigneeUserId ? '' : ' deal-thread__due--muted'}`}>
            <span className="deal-thread__due-label">Due</span>
            <input
              type="date"
              className="deal-thread__due-input"
              value={dueDate}
              disabled={!assigneeUserId}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Task due date"
            />
          </label>
        </div>
        <div className="deal-thread__toolbar">
          <select
            className="deal-thread__link"
            value={linkedDdItemId}
            onChange={(e) => setLinkedDdItemId(e.target.value)}
            aria-label="Link Due Diligence item"
          >
            <option value="">Link DD item…</option>
            {ddItems.length === 0 ? (
              <option value="" disabled>No open DD items (start DD first)</option>
            ) : (
              ddItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.groupName}: {item.title}
                </option>
              ))
            )}
          </select>
          {linkedDdLabel ? (
            <button
              type="button"
              className="deal-thread__tool"
              onClick={() => setLinkedDdItemId('')}
              title="Clear link"
            >
              Clear
            </button>
          ) : null}
        </div>
        {mentionOpen && members.length > 0 && (
          <ul className="deal-thread__mentions">
            {members.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => insertMention(m.email)}>
                  {m.email}
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={inputRef}
          className="deal-thread__input"
          rows={2}
          placeholder="Message the team…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="btn-primary deal-thread__send"
          disabled={sending || !body.trim()}
          onClick={send}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
