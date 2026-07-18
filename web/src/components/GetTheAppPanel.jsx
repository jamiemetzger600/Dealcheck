import { useEffect, useState } from 'react';
import {
  getInstallPlatform,
  isIosSafari,
  isStandaloneDisplay,
  promptPwaInstall,
  subscribeInstallPrompt
} from '../utils/pwaInstall';

/**
 * In-app “Get the app” instructions + Android install prompt.
 * Works in Settings or as a standalone section.
 */
export default function GetTheAppPanel({ compact = false }) {
  const [standalone, setStandalone] = useState(() => isStandaloneDisplay());
  const [canPrompt, setCanPrompt] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptResult, setPromptResult] = useState('');
  const platform = getInstallPlatform();

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    return subscribeInstallPrompt((event) => {
      setCanPrompt(Boolean(event));
    });
  }, []);

  const handleInstallClick = async () => {
    setPromptBusy(true);
    setPromptResult('');
    try {
      const outcome = await promptPwaInstall();
      if (outcome === 'accepted') {
        setPromptResult('Install started. Check your home screen.');
        setStandalone(isStandaloneDisplay());
      } else if (outcome === 'dismissed') {
        setPromptResult('Install dismissed. You can try again anytime.');
      } else {
        setPromptResult('Install prompt is not available in this browser. Use the steps below.');
      }
    } finally {
      setPromptBusy(false);
    }
  };

  if (standalone) {
    return (
      <div className={`get-the-app${compact ? ' get-the-app--compact' : ''}`}>
        <p className="get-the-app__status get-the-app__status--ok" role="status">
          You&apos;re using the installed Vettr app. Updates apply automatically when we deploy.
        </p>
      </div>
    );
  }

  return (
    <div className={`get-the-app${compact ? ' get-the-app--compact' : ''}`}>
      {!compact && (
        <p className="get-the-app__intro">
          Install Vettr on your phone for a full-screen app experience — no App Store required.
          Same login, deals, CRM, and due diligence.
        </p>
      )}

      {canPrompt && (
        <div className="get-the-app__prompt-row">
          <button
            type="button"
            className="btn-primary"
            onClick={handleInstallClick}
            disabled={promptBusy}
          >
            {promptBusy ? 'Opening…' : 'Install Vettr'}
          </button>
          <span className="get-the-app__hint">Uses your browser&apos;s install dialog</span>
        </div>
      )}

      {promptResult ? (
        <p className="get-the-app__status" role="status">{promptResult}</p>
      ) : null}

      {platform === 'ios' && (
        <ol className="get-the-app__steps">
          <li>
            Open this site in <strong>Safari</strong>
            {!isIosSafari() ? (
              <span className="get-the-app__warn">
                {' '}(you appear to be in another browser — switch to Safari to install)
              </span>
            ) : null}
          </li>
          <li>Tap the <strong>Share</strong> button (square with an arrow)</li>
          <li>Scroll and tap <strong>Add to Home Screen</strong></li>
          <li>Tap <strong>Add</strong> — Vettr appears on your home screen</li>
        </ol>
      )}

      {platform === 'android' && (
        <ol className="get-the-app__steps">
          <li>Open Vettr in <strong>Chrome</strong></li>
          {canPrompt ? (
            <li>Tap <strong>Install Vettr</strong> above, or use the browser menu</li>
          ) : (
            <li>Tap the browser <strong>menu</strong> (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
          )}
          <li>Confirm — Vettr opens full-screen from your home screen</li>
        </ol>
      )}

      {platform === 'desktop' && (
        <ol className="get-the-app__steps">
          <li>On a phone, open your Vettr URL in Safari (iOS) or Chrome (Android)</li>
          <li>Use that browser&apos;s <strong>Add to Home Screen</strong> / <strong>Install app</strong> option</li>
          {canPrompt ? (
            <li>Or click <strong>Install Vettr</strong> above if your desktop browser offers it</li>
          ) : null}
        </ol>
      )}
    </div>
  );
}
