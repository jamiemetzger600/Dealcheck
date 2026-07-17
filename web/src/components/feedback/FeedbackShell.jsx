import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { feedbackAPI } from '../../utils/api';
import { installFeedbackErrorCapture } from '../../utils/feedbackContext';
import FeedbackWidget from './FeedbackWidget';
import MyFeedbackPanel from './MyFeedbackPanel';

const FeedbackUiContext = createContext({
  openWidget: () => {},
  openReportScreen: () => {},
  openMine: () => {},
  unreadCount: 0,
  isAdmin: false,
});

export function useFeedbackUi() {
  return useContext(FeedbackUiContext);
}

function parseFeedbackParam(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^FB-?(\d+)$/i);
  if (m) return Number(m[1]);
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function FeedbackShell({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [widgetMode, setWidgetMode] = useState('full');
  const [mineOpen, setMineOpen] = useState(false);
  const [mineId, setMineId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(false);

  useEffect(() => {
    installFeedbackErrorCapture();
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setIsAdmin(false);
      return;
    }
    try {
      const data = await feedbackAPI.unread();
      setUnreadCount(data.unreadCount || 0);
      setIsAdmin(Boolean(data.isAdmin));
    } catch (err) {
      console.debug('[feedback] unread poll', err);
    }
  }, [user]);

  useEffect(() => {
    refreshUnread();
    if (!user) return undefined;
    const t = setInterval(refreshUnread, 60000);
    return () => clearInterval(t);
  }, [user, refreshUnread]);

  const openWidget = useCallback(() => {
    if (!user) {
      setGuestPrompt(true);
      return;
    }
    setWidgetMode('full');
    setWidgetOpen(true);
  }, [user]);

  const openReportScreen = useCallback(() => {
    if (!user) {
      setGuestPrompt(true);
      return;
    }
    setWidgetMode('report-screen');
    setWidgetOpen(true);
  }, [user]);

  const openMine = useCallback((id = null) => {
    if (!user) {
      setGuestPrompt(true);
      return;
    }
    setMineId(id);
    setMineOpen(true);
  }, [user]);

  useEffect(() => {
    const fid = searchParams.get('feedback');
    const id = parseFeedbackParam(fid);
    if (id && user) {
      openMine(id);
      const next = new URLSearchParams(searchParams);
      next.delete('feedback');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, user, openMine, setSearchParams]);

  // Shift+F → report this screen (fast path); Shift+G → full feedback form
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented) return;
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (!e.shiftKey) return;
      if (e.key === 'F' || e.key === 'f') {
        e.preventDefault();
        openReportScreen();
      } else if (e.key === 'G' || e.key === 'g') {
        e.preventDefault();
        openWidget();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openReportScreen, openWidget]);

  const value = useMemo(
    () => ({ openWidget, openReportScreen, openMine, unreadCount, isAdmin }),
    [openWidget, openReportScreen, openMine, unreadCount, isAdmin]
  );

  return (
    <FeedbackUiContext.Provider value={value}>
      {children}
      <FeedbackWidget
        key={widgetMode}
        open={widgetOpen}
        mode={widgetMode}
        onClose={() => setWidgetOpen(false)}
        onSubmitted={() => refreshUnread()}
        onOpenMine={(id) => {
          setWidgetOpen(false);
          openMine(id || null);
        }}
      />
      <MyFeedbackPanel
        open={mineOpen}
        initialId={mineId}
        onClose={() => {
          setMineOpen(false);
          setMineId(null);
          refreshUnread();
        }}
        onUnreadChange={(n, admin) => {
          if (typeof n === 'number') setUnreadCount(n);
          if (typeof admin === 'boolean') setIsAdmin(admin);
        }}
      />
      {guestPrompt ? (
        <div className="modal-overlay feedback-overlay" role="dialog" aria-modal="true">
          <div className="modal-card feedback-modal">
            <div className="modal-header">
              <h2>Sign in to send feedback</h2>
              <button
                type="button"
                className="column-close-btn"
                onClick={() => setGuestPrompt(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p>Feedback threads need an account so we can reply and show status updates.</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setGuestPrompt(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </FeedbackUiContext.Provider>
  );
}
