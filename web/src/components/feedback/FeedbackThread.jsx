import { useEffect, useState } from 'react';
import { feedbackAPI } from '../../utils/api';
import { formatDiagnosticsForAgent } from '../../utils/feedbackContext';

const STATUS_CLASS = {
  new: 'is-new',
  needs_info: 'is-needs',
  in_progress: 'is-progress',
  fixed: 'is-fixed',
  wont_fix: 'is-closed',
  closed: 'is-closed',
};

function AttachmentMedia({ attachment }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl;
    feedbackAPI
      .attachmentObjectUrl(attachment.id)
      .then((u) => {
        if (revoked) {
          URL.revokeObjectURL(u);
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch((err) => console.error('[feedback] attachment load', err));
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id]);

  if (!url) return <p className="feedback-muted">Loading attachment…</p>;
  if (attachment.kind === 'voice') {
    return <audio className="feedback-thread__audio" controls src={url} />;
  }
  return <img className="feedback-thread__shot" src={url} alt="Feedback attachment" />;
}

export default function FeedbackThread({
  submissionId,
  isAdmin = false,
  onBack,
  onUpdated,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [copyState, setCopyState] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackAPI.get(submissionId);
      setDetail(data);
      onUpdated?.(data);
    } catch (err) {
      console.error('[feedback] thread load', err);
      setError(err.message || 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [submissionId]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await feedbackAPI.reply(submissionId, reply.trim());
      setDetail(data);
      setReply('');
      onUpdated?.(data);
    } catch (err) {
      setError(err.message || 'Reply failed');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const data = await feedbackAPI.setStatus(submissionId, status);
      setDetail(data);
      onUpdated?.(data);
    } catch (err) {
      setError(err.message || 'Status update failed');
    } finally {
      setBusy(false);
    }
  };

  const meToo = async () => {
    setBusy(true);
    try {
      const data = await feedbackAPI.meToo(submissionId);
      setDetail(data);
      onUpdated?.(data);
    } catch (err) {
      setError(err.message || 'Me too failed');
    } finally {
      setBusy(false);
    }
  };

  const copyForAgent = async () => {
    if (!detail) return;
    const { submission: s, messages: msgs, attachments: atts } = detail;
    const pub = s.public_id || `FB-${s.id}`;
    const meta = s.metadata && typeof s.metadata === 'object' ? s.metadata : {};
    const allMsgs = msgs || [];
    const lines = [
      `## Vettr feedback ${pub}`,
      `Title: ${s.title}`,
      `Status: ${s.status_label || s.status}`,
      `Category: ${s.category}${s.category === 'bug' ? ` · Severity: ${s.severity}` : ''}`,
      `Created: ${s.created_at || '(unknown)'} · Updated: ${s.updated_at || '(unknown)'}`,
      `Me-too count: ${s.me_too_count ?? 0}`,
      `User: ${s.user_email || s.user_id}`,
      `Page: ${s.page_url || meta.location?.href || '(none)'}`,
      `App version: ${s.app_version || '(unknown)'}`,
      '',
      '### Repro',
      `Expected: ${s.expected_result || '(not provided)'}`,
      `Actual: ${s.actual_result || '(not provided)'}`,
      `Steps:\n${s.repro_steps || '(not provided)'}`,
      '',
      formatDiagnosticsForAgent(meta, s),
      '',
      '### Attachments',
      (atts || []).length
        ? (atts || []).map((a) => `- ${a.kind} id=${a.id} (${a.mime_type}, ${a.byte_size}b) — view in Admin inbox`).join('\n')
        : '(none)',
      '',
      '### Thread (newest last)',
      ...allMsgs.map((m) => {
        const when = m.created_at ? new Date(m.created_at).toISOString() : '';
        return `- [${m.message_kind}${when ? ` ${when}` : ''}] ${m.body}`;
      }),
      '',
      'Please investigate and propose a minimal fix. Prefer reading the Page URL + App UI state + API failures before guessing.',
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('Copied');
      console.log('[feedback] copied agent pack', pub, { metaKeys: Object.keys(meta) });
      setTimeout(() => setCopyState(''), 2000);
    } catch (err) {
      console.error('[feedback] copy failed', err);
      setCopyState('Copy failed');
    }
  };

  if (loading) return <p className="feedback-muted">Loading thread…</p>;
  if (error && !detail) return <p className="feedback-error">{error}</p>;
  if (!detail) return null;

  const { submission, messages, attachments } = detail;
  const byMessage = attachments.reduce((acc, a) => {
    const key = a.message_id || 'root';
    (acc[key] ||= []).push(a);
    return acc;
  }, {});
  const publicId = submission.public_id || `FB-${submission.id}`;

  return (
    <div className="feedback-thread">
      <div className="feedback-thread__header">
        {onBack ? (
          <button type="button" className="feedback-tool-btn" onClick={onBack}>
            ← Back
          </button>
        ) : null}
        <div className="feedback-thread__title-block">
          <h3>
            <span className="feedback-public-id">{publicId}</span>
            {' '}
            {submission.title}
          </h3>
          <div className="feedback-thread__meta">
            <span className={`feedback-status ${STATUS_CLASS[submission.status] || ''}`}>
              {submission.status_label || submission.status}
            </span>
            <span className="feedback-chip">{submission.category}</span>
            {submission.category === 'bug' ? (
              <span className="feedback-chip">{submission.severity}</span>
            ) : null}
            {submission.me_too_count > 0 ? (
              <span className="feedback-chip">{submission.me_too_count} me too</span>
            ) : null}
          </div>
        </div>
      </div>

      {submission.page_url ? (
        <p className="feedback-muted">Page: {submission.page_url}</p>
      ) : null}
      {isAdmin && submission.user_email ? (
        <p className="feedback-muted">From: {submission.user_email}</p>
      ) : null}

      {(submission.expected_result || submission.actual_result || submission.repro_steps) ? (
        <div className="feedback-repro-view">
          {submission.expected_result ? (
            <p><strong>Expected:</strong> {submission.expected_result}</p>
          ) : null}
          {submission.actual_result ? (
            <p><strong>Actual:</strong> {submission.actual_result}</p>
          ) : null}
          {submission.repro_steps ? (
            <p><strong>Steps:</strong> <span className="feedback-pre">{submission.repro_steps}</span></p>
          ) : null}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="feedback-thread__status-row">
          {['new', 'needs_info', 'in_progress', 'fixed', 'wont_fix', 'closed'].map((s) => (
            <button
              key={s}
              type="button"
              className={`feedback-tool-btn${submission.status === s ? ' is-active' : ''}`}
              disabled={busy}
              onClick={() => changeStatus(s)}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
          <button type="button" className="feedback-tool-btn" onClick={copyForAgent}>
            {copyState || 'Copy for agent'}
          </button>
        </div>
      ) : null}

      {!isAdmin &&
      submission.category === 'bug' &&
      ['new', 'needs_info', 'in_progress'].includes(submission.status) &&
      !submission.my_me_too &&
      !submission.is_owner ? (
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={meToo}>
          Me too — I hit this also
        </button>
      ) : null}

      <div className="feedback-thread__messages">
        {messages.map((m) => (
          <div key={m.id} className={`feedback-msg feedback-msg--${m.message_kind}`}>
            <div className="feedback-msg__meta">
              {m.message_kind === 'system'
                ? 'System'
                : m.message_kind === 'admin'
                  ? 'Vettr team'
                  : m.author_email || 'You'}
              <span>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p>{m.body}</p>
            {(byMessage[m.id] || []).map((a) => (
              <AttachmentMedia key={a.id} attachment={a} />
            ))}
          </div>
        ))}
        {(byMessage.root || []).map((a) => (
          <AttachmentMedia key={a.id} attachment={a} />
        ))}
      </div>

      {submission.can_reply !== false ? (
        <form className="feedback-thread__reply" onSubmit={sendReply}>
          <textarea
            className="modal-input"
            rows={3}
            placeholder={isAdmin ? 'Reply to user…' : 'Add more detail…'}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={busy}
          />
          {error ? <p className="feedback-error">{error}</p> : null}
          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !reply.trim()}>
              Send reply
            </button>
          </div>
        </form>
      ) : (
        <p className="feedback-muted">You joined this bug via Me too. Status updates appear above.</p>
      )}
    </div>
  );
}
