import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatMoney } from '../utils/normalizeDeal';
import { useTeam } from '../context/TeamContext';
import { teamsAPI } from '../utils/api';

function buildSharePayload(deal) {
  const title = deal?.name || 'Deal';
  const url = (deal?.url || '').trim();
  const lines = [
    `Deal: ${title}`,
    `Asking: ${formatMoney(deal?.askingPrice)}`,
    `EBITDA: ${formatMoney(deal?.ebitda)}`,
  ];
  if (deal?.location) lines.push(`Location: ${deal.location}`);
  if (url) lines.push(url);
  return { title, url, text: lines.join('\n') };
}

/**
 * Share button + menu: team workspace, Email, Text, WhatsApp, Copy link, Copy details, system share.
 */
export default function DealShareMenu({ deal, className = 'btn-secondary', onShared }) {
  const { teams, activeTeamId } = useTeam();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const payload = buildSharePayload(deal);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const dealId = deal?.id;
  const teamIdOnDeal = deal?.team_id ?? deal?.teamId ?? null;
  const shareableTeams = (teams || []).filter((t) => t.role === 'admin' || t.role === 'member');
  const canShareToTeam = Boolean(dealId) && !teamIdOnDeal && shareableTeams.length > 0;
  const canUnshare = Boolean(dealId) && Boolean(teamIdOnDeal);

  const teamsForMenu = [...shareableTeams].sort((a, b) => {
    if (Number(a.id) === Number(activeTeamId)) return -1;
    if (Number(b.id) === Number(activeTeamId)) return 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const updatePosition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuWidth = 240;
    let left = r.left;
    if (left + menuWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - menuWidth - 12);
    }
    setMenuPos({
      bottom: Math.max(8, window.innerHeight - r.top + 6),
      left,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        btnRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    };
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, updatePosition]);

  const flashCopied = (key) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(key);
      console.log('[DealShareMenu] copied', key);
    } catch (err) {
      console.error('[DealShareMenu] clipboard failed', err);
      alert('Could not copy. Please copy manually.');
    }
  };

  const openHref = (href) => {
    window.open(href, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(payload.title);
    const body = encodeURIComponent(payload.text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setOpen(false);
  };

  const handleSms = () => {
    const body = encodeURIComponent(payload.text);
    // iOS prefers &body=, Android ?body= — dual form works on most modern clients
    window.location.href = `sms:?&body=${body}`;
    setOpen(false);
  };

  const handleWhatsApp = () => {
    openHref(`https://wa.me/?text=${encodeURIComponent(payload.text)}`);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url || undefined,
      });
      console.log('[DealShareMenu] native share completed');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('[DealShareMenu] native share failed', err);
      }
    }
    setOpen(false);
  };

  const handleShareToTeam = async (teamId, teamName) => {
    if (!dealId || !teamId || busy) return;
    setBusy(true);
    try {
      const data = await teamsAPI.shareDeal(teamId, dealId);
      console.log('[DealShareMenu] share result', data);
      setOpen(false);
      if (data?.pending) {
        alert(
          `Share requested for ${teamName || 'the team'}. An admin must approve before the deal joins the team.`
        );
        onShared?.({ action: 'share_pending', teamId, dealId });
      } else {
        alert(`Deal shared with ${teamName || 'the team'}. Notes are visible for catch-up.`);
        onShared?.({ action: 'share', teamId, dealId });
      }
    } catch (err) {
      console.error('[DealShareMenu] share to team failed', err);
      alert(err.message || 'Failed to share to team');
    } finally {
      setBusy(false);
    }
  };

  const handleUnshare = async () => {
    if (!dealId || busy) return;
    if (!window.confirm('Remove this deal from the team? It returns to the owner’s personal pipeline.')) return;
    setBusy(true);
    try {
      await teamsAPI.unshareDeal(dealId);
      console.log('[DealShareMenu] unshared deal', dealId);
      setOpen(false);
      onShared?.({ action: 'unshare', dealId });
    } catch (err) {
      console.error('[DealShareMenu] unshare failed', err);
      alert(err.message || 'Failed to remove from team');
    } finally {
      setBusy(false);
    }
  };

  const menuStyle = {
    bottom: menuPos.bottom,
    left: menuPos.left,
  };

  const showTeamSection = canShareToTeam || canUnshare;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          console.log('[DealShareMenu] toggle', !open);
        }}
      >
        Share
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="deal-share-menu"
          role="menu"
          aria-label="Share deal"
          style={menuStyle}
        >
          {showTeamSection ? (
            <>
              {canShareToTeam
                ? teamsForMenu.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="menuitem"
                      className="deal-share-menu__item"
                      disabled={busy}
                      onClick={() => handleShareToTeam(t.id, t.name)}
                    >
                      {busy
                        ? 'Sharing…'
                        : teamsForMenu.length === 1
                          ? `Share to team (${t.name})`
                          : `Share to ${t.name}`}
                    </button>
                  ))
                : null}
              {canUnshare ? (
                <button
                  type="button"
                  role="menuitem"
                  className="deal-share-menu__item"
                  disabled={busy}
                  onClick={handleUnshare}
                >
                  {busy ? 'Removing…' : 'Remove from team'}
                </button>
              ) : null}
              <div className="deal-share-menu__sep" role="separator" />
            </>
          ) : null}
          <button type="button" role="menuitem" className="deal-share-menu__item" onClick={handleEmail}>
            Email
          </button>
          <button type="button" role="menuitem" className="deal-share-menu__item" onClick={handleSms}>
            Text / SMS
          </button>
          <button type="button" role="menuitem" className="deal-share-menu__item" onClick={handleWhatsApp}>
            WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            className="deal-share-menu__item"
            disabled={!payload.url}
            onClick={() => copyText(payload.url, 'link')}
          >
            {copied === 'link' ? 'Link copied' : 'Copy link'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="deal-share-menu__item"
            onClick={() => copyText(payload.text, 'details')}
          >
            {copied === 'details' ? 'Details copied' : 'Copy details'}
          </button>
          {canNativeShare ? (
            <button type="button" role="menuitem" className="deal-share-menu__item" onClick={handleNativeShare}>
              More…
            </button>
          ) : null}
        </div>,
        document.body
      )}
    </>
  );
}
