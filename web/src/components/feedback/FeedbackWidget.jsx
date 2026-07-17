import { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import pkg from '../../../package.json';
import { feedbackAPI } from '../../utils/api';
import { dataUrlToBase64, getRecentClientErrors } from '../../utils/feedbackContext';
import ScreenshotAnnotator from './ScreenshotAnnotator';
import VoiceRecorder from './VoiceRecorder';

const CATEGORIES = [
  { id: 'bug', label: 'Bug' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'suggestion', label: 'Suggestion' },
];

const SEVERITIES = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'blocking', label: 'Blocking' },
];

export default function FeedbackWidget({ open, onClose, onSubmitted, onOpenMine }) {
  const [step, setStep] = useState('compose'); // compose | capture | done
  const [category, setCategory] = useState('bug');
  const [severity, setSeverity] = useState('normal');
  const [body, setBody] = useState('');
  const [rawShot, setRawShot] = useState(null);
  const [annotatedShot, setAnnotatedShot] = useState(null);
  const [voice, setVoice] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [openBugs, setOpenBugs] = useState([]);
  const [createdId, setCreatedId] = useState(null);

  const reset = () => {
    setStep('compose');
    setCategory('bug');
    setSeverity('normal');
    setBody('');
    setRawShot(null);
    setAnnotatedShot(null);
    setVoice(null);
    setError(null);
    setCreatedId(null);
    setOpenBugs([]);
  };

  const loadOpenBugs = async () => {
    try {
      const data = await feedbackAPI.openBugs();
      setOpenBugs(data.items || []);
    } catch (err) {
      console.debug('[feedback] open bugs skipped', err);
    }
  };

  useEffect(() => {
    if (open && category === 'bug') loadOpenBugs();
  }, [open, category]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const capturePage = async () => {
    setCapturing(true);
    setError(null);
    try {
      // Hide feedback UI so it is not in the shot
      const overlay = document.querySelector('.feedback-overlay');
      if (overlay) overlay.style.visibility = 'hidden';
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 1.5),
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
      if (overlay) overlay.style.visibility = '';
      const dataUrl = canvas.toDataURL('image/png');
      setRawShot(dataUrl);
      setAnnotatedShot(dataUrl);
      setStep('capture');
    } catch (err) {
      console.error('[feedback] capture failed', err);
      setError('Could not capture screenshot. You can still send text or voice.');
      const overlay = document.querySelector('.feedback-overlay');
      if (overlay) overlay.style.visibility = '';
    } finally {
      setCapturing(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        category,
        severity: category === 'bug' ? severity : 'normal',
        body: body.trim(),
        pageUrl: window.location.href,
        appVersion: pkg.version,
        userAgent: navigator.userAgent,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        metadata: {
          consoleErrors: getRecentClientErrors(),
          path: window.location.pathname,
        },
      };
      if (annotatedShot) {
        payload.screenshot = {
          mimeType: 'image/png',
          dataBase64: dataUrlToBase64(annotatedShot),
        };
      }
      if (voice) {
        payload.voice = voice;
      }
      const detail = await feedbackAPI.create(payload);
      setCreatedId(detail.submission?.id);
      setStep('done');
      onSubmitted?.(detail);
    } catch (err) {
      console.error('[feedback] submit failed', err);
      setError(err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay feedback-overlay" role="dialog" aria-modal="true">
      <div className="modal-card feedback-modal">
        <div className="modal-header">
          <h2>
            {step === 'done' ? 'Thanks!' : step === 'capture' ? 'Mark up screenshot' : 'Send feedback'}
          </h2>
          <button type="button" className="column-close-btn" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {step === 'compose' && (
          <>
            <div className="feedback-category-row">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`feedback-chip-btn${category === c.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setCategory(c.id);
                    if (c.id === 'bug') loadOpenBugs();
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {category === 'bug' ? (
              <div className="feedback-severity-row">
                <span className="feedback-label">Severity</span>
                {SEVERITIES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`feedback-chip-btn${severity === s.id ? ' is-active' : ''}`}
                    onClick={() => setSeverity(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ) : null}

            {category === 'bug' && openBugs.length > 0 ? (
              <div className="feedback-open-bugs">
                <p className="feedback-label">Already reported? Tap Me too:</p>
                <ul>
                  {openBugs.slice(0, 5).map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="feedback-open-bug"
                        disabled={b.my_me_too}
                        onClick={async () => {
                          try {
                            await feedbackAPI.meToo(b.id);
                            setCreatedId(b.id);
                            setStep('done');
                            onSubmitted?.();
                          } catch (err) {
                            setError(err.message || 'Me too failed');
                          }
                        }}
                      >
                        {b.title}
                        <span>
                          {b.my_me_too ? 'You joined' : `${b.me_too_count} me too`} · {b.status_label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="feedback-label" htmlFor="feedback-body">
              What happened / what would you like?
            </label>
            <textarea
              id="feedback-body"
              className="modal-input"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Short description…"
            />

            <VoiceRecorder onChange={setVoice} disabled={submitting} />

            {rawShot ? (
              <p className="feedback-muted">Screenshot ready — you can re-capture or mark up.</p>
            ) : null}

            {error ? <p className="feedback-error">{error}</p> : null}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={capturing}
                onClick={capturePage}
              >
                {capturing ? 'Capturing…' : rawShot ? 'Re-capture' : 'Capture screenshot'}
              </button>
              {rawShot ? (
                <button type="button" className="btn btn-secondary" onClick={() => setStep('capture')}>
                  Mark up
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}

        {step === 'capture' && rawShot ? (
          <>
            <ScreenshotAnnotator
              imageSrc={rawShot}
              onChange={setAnnotatedShot}
              onCancel={() => {
                setRawShot(null);
                setAnnotatedShot(null);
                setStep('compose');
              }}
            />
            {error ? <p className="feedback-error">{error}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep('compose')}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? 'Sending…' : 'Send with markup'}
              </button>
            </div>
          </>
        ) : null}

        {step === 'done' ? (
          <div className="feedback-done">
            <p>Your feedback was submitted. We’ll update the status in your feedback list.</p>
            {createdId ? <p className="feedback-muted">Reference #{createdId}</p> : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  handleClose();
                  onOpenMine?.();
                }}
              >
                View my feedback
              </button>
              <button type="button" className="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
