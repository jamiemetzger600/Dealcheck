import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import pkg from '../../../package.json';
import { feedbackAPI } from '../../utils/api';
import { dataUrlToBase64, collectClientDiagnostics } from '../../utils/feedbackContext';
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

/**
 * @param {'full' | 'report-screen'} mode
 * report-screen: Bug + auto-capture, jump to markup + repro fields
 */
export default function FeedbackWidget({
  open,
  mode = 'full',
  onClose,
  onSubmitted,
  onOpenMine,
}) {
  const [step, setStep] = useState('compose'); // compose | capture | done
  const [category, setCategory] = useState('bug');
  const [severity, setSeverity] = useState('normal');
  const [body, setBody] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [steps, setSteps] = useState('');
  const [rawShot, setRawShot] = useState(null);
  const [annotatedShot, setAnnotatedShot] = useState(null);
  const [voice, setVoice] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [openBugs, setOpenBugs] = useState([]);
  const [createdPublicId, setCreatedPublicId] = useState(null);
  const [createdId, setCreatedId] = useState(null);
  const autoCaptureStarted = useRef(false);

  const reset = () => {
    setStep('compose');
    setCategory('bug');
    setSeverity('normal');
    setBody('');
    setExpected('');
    setActual('');
    setSteps('');
    setRawShot(null);
    setAnnotatedShot(null);
    setVoice(null);
    setError(null);
    setCreatedId(null);
    setCreatedPublicId(null);
    setOpenBugs([]);
    autoCaptureStarted.current = false;
  };

  const loadOpenBugs = async () => {
    try {
      const data = await feedbackAPI.openBugs();
      setOpenBugs(data.items || []);
    } catch (err) {
      console.debug('[feedback] open bugs skipped', err);
    }
  };

  const capturePage = async () => {
    setCapturing(true);
    setError(null);
    try {
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
      if (mode === 'report-screen') setStep('compose');
    } finally {
      setCapturing(false);
    }
  };

  useEffect(() => {
    if (!open) {
      autoCaptureStarted.current = false;
      return;
    }
    if (category === 'bug') loadOpenBugs();
    if (mode === 'report-screen' && !autoCaptureStarted.current) {
      autoCaptureStarted.current = true;
      setCategory('bug');
      capturePage();
    }
  }, [open, mode, category]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const exp = expected.trim();
      const act = actual.trim();
      const st = steps.trim();
      const note = body.trim();
      // Bugs need at least a short description — screenshot alone is not enough to triage
      if (category === 'bug' && !exp && !act && !st && !note) {
        setError('Add what went wrong: fill Actual (or Expected / Steps / notes) before sending.');
        setSubmitting(false);
        if (step === 'capture') {
          // keep them on capture so fields are visible for report-screen
        }
        return;
      }
      if (mode === 'report-screen' && !act && !note) {
        setError('Briefly say what looks wrong (Actual or notes) so we can triage the screenshot.');
        setSubmitting(false);
        return;
      }

      const diagnostics = collectClientDiagnostics({ captureMode: mode });
      const payload = {
        category,
        severity: category === 'bug' ? severity : 'normal',
        body: note,
        expected: exp,
        actual: act,
        steps: st,
        pageUrl: window.location.href,
        appVersion: pkg.version,
        userAgent: diagnostics.browser?.userAgent || navigator.userAgent,
        viewport: {
          w: diagnostics.viewport?.innerWidth ?? window.innerWidth,
          h: diagnostics.viewport?.innerHeight ?? window.innerHeight,
          ...diagnostics.viewport,
        },
        metadata: diagnostics,
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
      setCreatedPublicId(detail.submission?.public_id || `FB-${detail.submission?.id}`);
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

  const isReport = mode === 'report-screen';
  const showBugRepro = category === 'bug';

  const reproFields = showBugRepro ? (
    <div className="feedback-repro">
      <label className="feedback-label" htmlFor="feedback-actual">
        What looks wrong? <span className="feedback-required">(required)</span>
      </label>
      <textarea
        id="feedback-actual"
        className="modal-input"
        rows={2}
        value={actual}
        onChange={(e) => setActual(e.target.value)}
        placeholder="e.g. Save spinner never stops / filters don’t apply"
        required={isReport}
      />
      <label className="feedback-label" htmlFor="feedback-expected">Expected (optional)</label>
      <textarea
        id="feedback-expected"
        className="modal-input"
        rows={2}
        value={expected}
        onChange={(e) => setExpected(e.target.value)}
        placeholder="What should happen?"
      />
      <label className="feedback-label" htmlFor="feedback-steps">Steps to reproduce (optional)</label>
      <textarea
        id="feedback-steps"
        className="modal-input"
        rows={3}
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        placeholder={'1. …\n2. …\n3. …'}
      />
    </div>
  ) : null;

  return (
    <div className="modal-overlay feedback-overlay" role="dialog" aria-modal="true">
      <div className="modal-card feedback-modal">
        <div className="modal-header">
          <h2>
            {step === 'done'
              ? 'Thanks!'
              : step === 'capture'
                ? (isReport ? 'Report this screen' : 'Mark up screenshot')
                : (isReport ? 'Report this screen' : 'Send feedback')}
          </h2>
          <button type="button" className="column-close-btn" onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {step === 'compose' && (
          <>
            {!isReport ? (
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
            ) : (
              <p className="feedback-muted">Bug report with a screenshot of this page.</p>
            )}

            {showBugRepro ? (
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

            {showBugRepro && openBugs.length > 0 ? (
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
                            const detail = await feedbackAPI.meToo(b.id);
                            setCreatedId(b.id);
                            setCreatedPublicId(detail.submission?.public_id || b.public_id || `FB-${b.id}`);
                            setStep('done');
                            onSubmitted?.(detail);
                          } catch (err) {
                            setError(err.message || 'Me too failed');
                          }
                        }}
                      >
                        {b.public_id ? `${b.public_id} · ` : ''}{b.title}
                        <span>
                          {b.my_me_too ? 'You joined' : `${b.me_too_count} me too`} · {b.status_label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {reproFields}

            <label className="feedback-label" htmlFor="feedback-body">
              {showBugRepro ? 'Extra notes (optional)' : 'What happened / what would you like?'}
            </label>
            <textarea
              id="feedback-body"
              className="modal-input"
              rows={showBugRepro ? 2 : 4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={showBugRepro ? 'Anything else…' : 'Short description…'}
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
            {capturing ? <p className="feedback-muted">Capturing…</p> : null}
            <ScreenshotAnnotator
              imageSrc={rawShot}
              onChange={setAnnotatedShot}
              onCancel={() => {
                setRawShot(null);
                setAnnotatedShot(null);
                setStep('compose');
              }}
            />
            {isReport ? (
              <>
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
                {reproFields}
                <label className="feedback-label" htmlFor="feedback-body-capture">Extra notes (optional)</label>
                <textarea
                  id="feedback-body-capture"
                  className="modal-input"
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </>
            ) : null}
            {error ? <p className="feedback-error">{error}</p> : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('compose')}
              >
                {isReport ? 'Add more detail' : 'Back'}
              </button>
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
        ) : null}

        {step === 'done' ? (
          <div className="feedback-done">
            <p>Your feedback was submitted. We’ll update the status in your feedback list.</p>
            {createdPublicId ? (
              <p className="feedback-muted">
                Reference <strong>{createdPublicId}</strong>
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  handleClose();
                  onOpenMine?.(createdId);
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
