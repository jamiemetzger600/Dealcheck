import { useState, useEffect } from 'react';
import { ddPublicAPI } from '../utils/api';
import { formatDate } from '../utils/normalizeDeal';

export default function DdPortalPage() {
  const token = window.location.pathname.split('/dd/')[1]?.split('/')[0] || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [authorName, setAuthorName] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    ddPublicAPI.getPortal(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleStatus = async (itemId, status) => {
    if (data?.mode !== 'collaborative') return;
    try {
      const res = await ddPublicAPI.patchItem(token, itemId, { status });
      setData((prev) => ({ ...prev, checklist: res.checklist }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleComment = async (itemId) => {
    const body = (commentDrafts[itemId] || '').trim();
    if (!body) return;
    try {
      const res = await ddPublicAPI.addComment(token, itemId, {
        body,
        authorName: authorName.trim() || data?.label || 'Portal guest'
      });
      setData((prev) => ({ ...prev, checklist: res.checklist }));
      setCommentDrafts((d) => ({ ...d, [itemId]: '' }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDocument = async (itemId) => {
    const filename = window.prompt('Document name');
    if (!filename?.trim()) return;
    const storageKey = window.prompt('URL or reference') || filename;
    try {
      const res = await ddPublicAPI.addDocument(token, itemId, { filename: filename.trim(), storageKey });
      setData((prev) => ({ ...prev, checklist: res.checklist }));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="dd-portal"><p>Loading…</p></div>;
  if (error) return <div className="dd-portal"><p>{error}</p></div>;

  const checklist = data?.checklist;
  const progress = checklist?.progress || {};

  return (
    <div className="dd-portal">
      <header className="dd-portal__header">
        <img src="/vettr-logo.png" alt="Vettr" className="dd-portal__logo" width={160} height={46} />
        <h1>{data.dealName}</h1>
        <p className="dd-portal__mode">
          {data.mode === 'collaborative' ? 'Collaborative access' : 'View only'}
          {data.label ? ` · ${data.label}` : ''}
        </p>
        <p className="dd-portal__progress">{progress.percent ?? 0}% complete</p>
        {data.mode === 'collaborative' ? (
          <label className="dd-portal__author">
            Your name
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Seller attorney"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </label>
        ) : null}
      </header>

      {(checklist?.groups || []).map((group) => (
        <section key={group.id} className="dd-group">
          <h2>{group.name}</h2>
          <ul className="dd-item-list">
            {(group.items || []).map((item) => (
              <li key={item.id} className="dd-item dd-item--portal">
                <span>{item.title}</span>
                {item.requests_document ? <span className="dd-item__badge">Document</span> : null}
                {item.due_at ? <span className="dd-item__due">Due {formatDate(item.due_at)}</span> : null}
                {data.mode === 'collaborative' ? (
                  <>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatus(item.id, e.target.value)}
                      className="modal-input"
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="complete">Complete</option>
                      <option value="waiting_on_other">Waiting</option>
                    </select>
                    {item.requests_document ? (
                      <button type="button" className="btn-secondary" onClick={() => handleDocument(item.id)}>Add document</button>
                    ) : null}
                    {(item.comments || []).length > 0 ? (
                      <ul className="dd-item__comments">
                        {item.comments.map((comment) => (
                          <li key={comment.id} className="dd-item__comment dd-item__comment--external">
                            <span className="dd-item__comment-meta">
                              {comment.authorName || 'Guest'}
                              {comment.createdAt ? ` · ${formatDate(comment.createdAt)}` : ''}
                            </span>
                            <p className="dd-item__comment-body">{comment.body}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="dd-portal-comment">
                      <input
                        className="modal-input"
                        placeholder="Add comment"
                        value={commentDrafts[item.id] || ''}
                        onChange={(e) => setCommentDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleComment(item.id);
                        }}
                      />
                      <button type="button" className="btn-secondary" onClick={() => handleComment(item.id)}>Post</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="dd-item__status-readonly">{item.status.replace(/_/g, ' ')}</span>
                    {(item.comments || []).length > 0 ? (
                      <ul className="dd-item__comments">
                        {item.comments.map((comment) => (
                          <li key={comment.id} className="dd-item__comment">
                            <span className="dd-item__comment-meta">
                              {comment.authorName || 'Guest'}
                              {comment.createdAt ? ` · ${formatDate(comment.createdAt)}` : ''}
                            </span>
                            <p className="dd-item__comment-body">{comment.body}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
