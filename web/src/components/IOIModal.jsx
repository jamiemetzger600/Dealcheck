import { useCallback, useEffect, useMemo, useState } from 'react';
import { userAPI } from '../utils/api';
import { generateIOIText, generateIOISubject, getBrokerEmailFromDeal } from '../utils/ioiGenerator';

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
  const [brokerEmail, setBrokerEmail] = useState(() => getBrokerEmailFromDeal(deal));
  const [previewText, setPreviewText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setBrokerEmail(getBrokerEmailFromDeal(deal));
  }, [deal]);

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

  const persistIoiPrefs = useCallback(async () => {
    try {
      await userAPI.updateSettings({
        preferences: {
          ioiSignature: signature.trim(),
          ioiCompanyName: companyName.trim()
        }
      });
      onIOIPrefsSaved?.();
    } catch (e) {
      console.error('[IOI] Failed to save signature / company preferences', e);
    }
  }, [signature, companyName, onIOIPrefsSaved]);

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

  const handleSendEmail = async () => {
    await persistIoiPrefs();
    const subject = encodeURIComponent(generateIOISubject(deal));
    const body = encodeURIComponent(previewText);
    const to = encodeURIComponent(brokerEmail.trim());
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self');
    setSent(true);
    recordIOI(previewText);
  };

  const handleCopy = async () => {
    await persistIoiPrefs();
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      recordIOI(previewText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = previewText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      recordIOI(previewText);
    }
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
              onChange={(e) => setBrokerEmail(e.target.value)}
              placeholder="broker@example.com"
            />
            <p className="ioi-hint">Pre-filled from listing when available. You can edit before sending.</p>
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
              onBlur={persistIoiPrefs}
              placeholder="e.g. Acme Acquisitions LLC"
            />
            <p className="ioi-hint">Shown in the email closing. Saved to your account when you leave this field or send/copy.</p>
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
                onBlur={persistIoiPrefs}
                placeholder="Your Name"
              />
            </div>
          </div>
          <p className="ioi-hint ioi-hint-inline">Signature is saved to your account when you leave the field or send/copy.</p>

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
          {sent && <span className="ioi-success">Email client opened</span>}
          {copied && <span className="ioi-success">Copied to clipboard</span>}
          <button type="button" className="btn-secondary" onClick={handleCopy} disabled={!canSend}>
            Copy to Clipboard
          </button>
          <button type="button" className="btn-primary" onClick={handleSendEmail} disabled={!canSend || !brokerEmail.trim()}>
            Send Email
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
