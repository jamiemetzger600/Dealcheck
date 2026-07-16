import { useState, useEffect, useRef, useCallback } from 'react';
import { crmAPI } from '../../utils/api';

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

/**
 * Deal Thread — Sheets/Linear-style talk on a shared (or any) deal.
 */
export default function DealThread({ dealId, pollMs = 12000 }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [body, setBody] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const load = useCallback(async ({ quiet } = {}) => {
    if (!dealId) return;
    try {
      if (!quiet) setLoading(true);
      const [thread, mem] = await Promise.all([
        crmAPI.getThread(dealId),
        crmAPI.getThreadMembers(dealId).catch(() => ({ members: [] }))
      ]);
      setMessages(thread.messages || []);
      setMembers(mem.members || []);
      setError('');
    } catch (err) {
      console.error('[DealThread] load failed:', err);
      setError(err.message || 'Failed to load Talk');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
    if (!pollMs) return undefined;
    const t = setInterval(() => load({ quiet: true }), pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await crmAPI.postThreadMessage(dealId, {
        body: text,
        assigneeUserId: assigneeUserId || undefined
      });
      setBody('');
      setAssigneeUserId('');
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
        <p className="deal-thread__hint">@email to mention · assign · resolve</p>
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
                    {m.assignee_email ? (
                      <span className="deal-thread__chip">→ {m.assignee_email}</span>
                    ) : null}
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
          <button type="button" className="deal-thread__tool" onClick={() => setMentionOpen((v) => !v)}>
            @
          </button>
          {members.length > 0 && (
            <select
              className="deal-thread__assign"
              value={assigneeUserId}
              onChange={(e) => setAssigneeUserId(e.target.value)}
              aria-label="Assign to"
            >
              <option value="">Assign…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.email}</option>
              ))}
            </select>
          )}
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
