import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { userAPI } from '../utils/api';
import { generateIOIText, generateIOISubject, getBrokerEmailFromDeal } from '../utils/ioiGenerator';

/** Copy plain text for paste into email; uses Clipboard API with a focused textarea fallback. */
async function copyTextToClipboard(text) {
  if (!text) return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[IOI] navigator.clipboard.writeText failed:', err);
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.warn('[IOI] execCommand copy failed:', err);
    return false;
  }
}

export default function IOIModal({
  deal,
  scenarios,
  activeScenario = 0,
  qualityPrefs = {},
  settings = null,
  onClose,
  onIOISent = null,
  onIOIPrefsSaved = null
}) {
  /** Saved to account: signature + buyer company only. Broker email is per listing/deal and is never stored in preferences. */
  const prefs = settings?.preferences || {};
  const [selected, setSelected] = useState(() => {
    const init = new Set();
    if (scenarios[activeScenario]) init.add(activeScenario);
    return init;
  });
  const [timeline, setTimeline] = useState('30-45 days from accepted offer');
  const [closingNotes, setClosingNotes] = useState('');
  const [signature, setSignature] = useState(() => prefs.ioiSignature || '');
  const [companyName, setCompanyName] = useState(() => prefs.ioiCompanyName || '');
  const parsedBrokerEmail = useMemo(() => getBrokerEmailFromDeal(deal), [deal]);
  const [brokerEmail, setBrokerEmail] = useState(() => parsedBrokerEmail);
  const brokerEmailTouchedRef = useRef(false);
  const [previewText, setPreviewText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  /** Autofill when listing data arrives (e.g. full detail fetch); do not clobber manual edits. */
  useEffect(() => {
    if (brokerEmailTouchedRef.current || !parsedBrokerEmail) return;
    setBrokerEmail(parsedBrokerEmail);
  }, [parsedBrokerEmail]);

  const selectedIndices = useMemo(
    () => Array.from(selected).sort((a, b) => a - b),
    [selected]
  );

  const toggleScenario = useCallback((idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const latestSigCo = useRef({ signature: '', companyName: '' });
  latestSigCo.current = { signature, companyName };
  const debounceSaveRef = useRef(null);
  const skipDebouncedSaveRef = useRef(true);

  const saveSignatureAndCompany = useCallback(async () => {
    const { signature: s, companyName: c } = latestSigCo.current;
    try {
      await userAPI.updateSettings({
        preferences: {
          ioiSignature: s.trim(),
          ioiCompanyName: c.trim()
        }
      });
      onIOIPrefsSaved?.();
    } catch (e) {
      console.error('[IOI] Failed to save signature / company preferences', e);
    }
  }, [onIOIPrefsSaved]);

  const scheduleSaveSignatureAndCompany = useCallback(() => {
    if (debounceSaveRef.current) clearTimeout(debounceSaveRef.current);
    debounceSaveRef.current = setTimeout(() => {
      debounceSaveRef.current = null;
      void saveSignatureAndCompany();
    }, 450);
  }, [saveSignatureAndCompany]);

  const saveSignatureAndCompanyNow = useCallback(async () => {
    if (debounceSaveRef.current) {
      clearTimeout(debounceSaveRef.current);
      debounceSaveRef.current = null;
    }
    await saveSignatureAndCompany();
  }, [saveSignatureAndCompany]);

  useEffect(() => {
    if (skipDebouncedSaveRef.current) {
      skipDebouncedSaveRef.current = false;
      return;
    }
    scheduleSaveSignatureAndCompany();
  }, [signature, companyName, scheduleSaveSignatureAndCompany]);

  const onIOIPrefsSavedRef = useRef(onIOIPrefsSaved);
  onIOIPrefsSavedRef.current = onIOIPrefsSaved;

  useEffect(() => {
    return () => {
      if (debounceSaveRef.current) {
        clearTimeout(debounceSaveRef.current);
        debounceSaveRef.current = null;
      }
      const { signature: s, companyName: c } = latestSigCo.current;
      void userAPI
        .updateSettings({
          preferences: { ioiSignature: s.trim(), ioiCompanyName: c.trim() }
        })
        .then(() => onIOIPrefsSavedRef.current?.())
        .catch((e) => console.error('[IOI] Failed to flush signature / company on close', e));
    };
  }, []);

  const generatedText = useMemo(() => {
    if (selectedIndices.length === 0) return '';
    return generateIOIText({
      deal,
      scenarios,
      selectedIndices,
      qualityPrefs,
      timeline,
      closingNotes,
      signature,
      companyName
    });
  }, [deal, scenarios, selectedIndices, qualityPrefs, timeline, closingNotes, signature, companyName]);

  useEffect(() => {
    setPreviewText(generatedText);
  }, [generatedText]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  const recordIOI = useCallback((text) => {
    if (onIOISent) onIOISent(text);
  }, [onIOISent]);

  /** Gmail web compose — reliable in a new tab; mailto + window.open often yields a blank tab. */
  const openGmailCompose = useCallback((to, subject, body) => {
    const maxLen = 7500;
    let bodyUse = body;
    const build = () => {
      const p = new URLSearchParams();
      p.set('view', 'cm');
      p.set('fs', '1');
      if (to) p.set('to', to);
      p.set('su', subject);
      p.set('body', bodyUse);
      return `https://mail.google.com/mail/?${p.toString()}`;
    };
    let url = build();
    if (url.length > maxLen) {
      const note = '\n\n[... truncated for link length — use Copy to Clipboard for the full IOI.]';
      while (url.length > maxLen && bodyUse.length > note.length + 50) {
        bodyUse = bodyUse.slice(0, bodyUse.length - 120) + note;
        url = build();
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  /** Fallback for desktop mail apps (avoids blank mailto tabs in some browsers). */
  const openMailtoViaAnchor = useCallback((mailtoHref) => {
    const a = document.createElement('a');
    a.href = mailtoHref;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const handleSendEmail = async () => {
    await saveSignatureAndCompanyNow();
    const subject = generateIOISubject(deal);
    const to = brokerEmail.trim();
    openGmailCompose(to, subject, previewText);
    setSent(true);
    recordIOI(previewText);
  };

  const handleSendMailApp = useCallback(async () => {
    await saveSignatureAndCompanyNow();
    const subject = encodeURIComponent(generateIOISubject(deal));
    const body = encodeURIComponent(previewText);
    const to = brokerEmail.trim();
    const href = to
      ? `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    openMailtoViaAnchor(href);
    setSent(true);
    recordIOI(previewText);
  }, [brokerEmail, deal, openMailtoViaAnchor, previewText, recordIOI, saveSignatureAndCompanyNow]);

  const handleCopy = () => {
    const text = previewText.trim();
    if (!text) return;

    // Copy in the same user gesture — awaiting save first drops transient activation and breaks clipboard API.
    void copyTextToClipboard(text).then((ok) => {
      if (!ok) {
        console.error('[IOI] copy to clipboard failed');
        window.alert(
          'Could not copy to the clipboard. Select the email preview text and use Cmd+C (Mac) or Ctrl+C (Windows).'
        );
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      recordIOI(previewText);
      void saveSignatureAndCompanyNow();
    });
  };

  const canSend = selectedIndices.length > 0 && previewText.trim().length > 0;

  return (
    <div className="modal-overlay ioi-modal-overlay" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card ioi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ioi-modal-header">
          <h2>Quick IOI</h2>
          <button type="button" className="deal-details-close" onClick={onClose}>×</button>
        </div>

        <div className="ioi-modal-body">
          {/* Scenario selector */}
          <div className="ioi-section">
            <label className="ioi-section-label">Include Scenarios</label>
            <div className="ioi-scenario-selector">
              {scenarios.map((_, idx) => (
                <label key={idx} className="ioi-scenario-check">
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggleScenario(idx)}
                  />
                  <span>Scenario {idx + 1}{idx === activeScenario ? ' (active)' : ''}</span>
                </label>
              ))}
            </div>
            {selectedIndices.length === 0 && (
              <p className="ioi-warn">Select at least one scenario to generate the IOI.</p>
            )}
          </div>

          {/* Broker email */}
          <div className="ioi-section">
            <label className="ioi-section-label" htmlFor="ioi-broker-email">Broker Email</label>
            <input
              id="ioi-broker-email"
              type="email"
              className="ioi-input"
              value={brokerEmail}
              onChange={(e) => {
                brokerEmailTouchedRef.current = true;
                setBrokerEmail(e.target.value);
              }}
              placeholder="broker@example.com"
            />
            <p className="ioi-hint">From this listing only — not saved to your account. If empty, add the broker in Gmail or your mail app.</p>
          </div>

          {/* Buyer company + signature (saved for next time) */}
          <div className="ioi-section">
            <label className="ioi-section-label" htmlFor="ioi-company">Your Company (Buyer)</label>
            <input
              id="ioi-company"
              type="text"
              className="ioi-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={saveSignatureAndCompanyNow}
              placeholder="e.g. Acme Acquisitions LLC"
            />
            <p className="ioi-hint">Shown in the email closing. Saved to your account and reused on every IOI.</p>
          </div>

          <div className="ioi-field-row">
            <div className="ioi-section ioi-section-half">
              <label className="ioi-section-label" htmlFor="ioi-timeline">Timeline to Close</label>
              <input
                id="ioi-timeline"
                type="text"
                className="ioi-input"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
              />
            </div>
            <div className="ioi-section ioi-section-half">
              <label className="ioi-section-label" htmlFor="ioi-signature">Signature</label>
              <input
                id="ioi-signature"
                type="text"
                className="ioi-input"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                onBlur={saveSignatureAndCompanyNow}
                placeholder="Your Name"
              />
            </div>
          </div>
          <p className="ioi-hint ioi-hint-inline">Signature is saved to your account and reused on every IOI.</p>

          <div className="ioi-section">
            <label className="ioi-section-label" htmlFor="ioi-closing">Closing Notes (optional)</label>
            <textarea
              id="ioi-closing"
              className="ioi-textarea"
              rows={2}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Any additional notes for the broker..."
            />
          </div>

          {/* Preview */}
          <div className="ioi-section">
            <label className="ioi-section-label">Email Preview</label>
            <div className="ioi-preview-subject">
              Subject: {generateIOISubject(deal)}
            </div>
            <textarea
              className="ioi-preview"
              rows={16}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
            />
            <p className="ioi-hint">You can edit the text above before sending.</p>
          </div>
        </div>

        <div className="ioi-modal-footer">
          {sent && <span className="ioi-success">Opened — check for a new tab (Gmail) or your mail app.</span>}
          {copied && <span className="ioi-success">Copied to clipboard</span>}
          <button type="button" className="btn-secondary" onClick={handleCopy} disabled={!canSend}>
            Copy to Clipboard
          </button>
          <button type="button" className="btn-primary" onClick={handleSendEmail} disabled={!canSend}>
            Open in Gmail
          </button>
          <button type="button" className="btn-secondary ioi-mailapp-btn" onClick={() => handleSendMailApp()} disabled={!canSend}>
            Default mail app
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
