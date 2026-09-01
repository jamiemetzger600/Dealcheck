import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { logGuestEvent } from '../utils/guestAnalytics';

export const GUEST_TOUR_DISMISS_KEY = 'vettr_guest_tour_dismissed_v2';

const SPOTLIGHT_PAD = 8;
const TOOLTIP_GAP = 14;
const TOOLTIP_MAX_W = 400;

export const TOUR_STEPS = [
  {
    target: 'buy-box',
    title: 'Set your buy box',
    body: 'Open **Configure Buy Box** to tell Vettr what you want. We only load deals that match your criteria.',
    placement: 'bottom',
  },
  {
    target: 'deal-feed',
    title: 'Browse your matches',
    body: 'Your filtered deals appear here. Sort, change view, and open a listing to preview details (guests see gated previews until signup).',
    placement: 'top',
  },
  {
    target: 'search-bar',
    title: 'Search the pool',
    body: '**Search Keywords** narrows listings by name, location, or industry. Add terms as chips (AND). Save named lists and reuse them like Exclude Keywords.',
    placement: 'bottom',
  },
  {
    target: 'exclude-keywords',
    title: 'Exclude noise',
    body: '**Exclude Keywords** hides listings that contain words you do not want (e.g. franchise, restaurant). Save named lists and reuse them across sessions.',
    placement: 'top',
  },
  {
    target: 'crm-tab',
    title: 'Save when you are ready',
    body: 'Use **Vettr CRM** to track saved listings and your pipeline after you create a free account. Broker contact unlocks with signup.',
    placement: 'bottom',
  },
  {
    target: 'flexibility',
    title: 'Flexibility',
    body: '**Flexibility** widens your buy box slightly so near-matches still appear — useful when a deal might negotiate on price or EBITDA.',
    placement: 'bottom',
  },
];

const AGGREGATOR_TARGETS = new Set(['buy-box', 'deal-feed', 'search-bar', 'exclude-keywords', 'flexibility']);

function isGuestTourDismissed() {
  try {
    return localStorage.getItem(GUEST_TOUR_DISMISS_KEY) === '1';
  } catch {
    return true;
  }
}

function queryTourTarget(targetId) {
  return document.querySelector(`[data-tour="${targetId}"]`);
}

function renderBody(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export default function GuestOnboardingTour({
  autoShow = false,
  forceOpen = false,
  onDismiss,
  onEnsureAggregatorTab,
  onPrepareStep,
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({ top: 0, left: 0 });

  const shouldAutoShow = autoShow && !isGuestTourDismissed();

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setVisible(true);
      return;
    }
    if (shouldAutoShow) {
      setVisible(true);
    }
  }, [forceOpen, shouldAutoShow]);

  const current = TOUR_STEPS[step];
  const isLast = step >= TOUR_STEPS.length - 1;

  const finish = useCallback(
    (reason = 'skip') => {
      if (autoShow && !forceOpen) {
        try {
          localStorage.setItem(GUEST_TOUR_DISMISS_KEY, '1');
        } catch {}
      }
      logGuestEvent('guest_tour_complete', { reason, step });
      setVisible(false);
      if (typeof onDismiss === 'function') onDismiss();
    },
    [autoShow, forceOpen, onDismiss, step]
  );

  const measureLayout = useCallback(() => {
    if (!current?.target) return;
    const el = queryTourTarget(current.target);
    if (!el) {
      setSpotlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const top = rect.top - SPOTLIGHT_PAD;
    const left = rect.left - SPOTLIGHT_PAD;
    const width = rect.width + SPOTLIGHT_PAD * 2;
    const height = rect.height + SPOTLIGHT_PAD * 2;
    setSpotlightRect({ top, left, width, height });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const preferBelow = current.placement !== 'top';
    let tooltipTop = preferBelow ? top + height + TOOLTIP_GAP : top - TOOLTIP_GAP - 180;
    if (preferBelow && tooltipTop + 200 > vh - 16) {
      tooltipTop = top - TOOLTIP_GAP - 200;
    }
    if (tooltipTop < 16) tooltipTop = 16;
    const tooltipLeft = clamp(left + width / 2 - TOOLTIP_MAX_W / 2, 16, vw - TOOLTIP_MAX_W - 16);
    setTooltipStyle({ top: tooltipTop, left: tooltipLeft });
  }, [current]);

  useLayoutEffect(() => {
    if (!visible || !current) return undefined;

    if (AGGREGATOR_TARGETS.has(current.target)) {
      onEnsureAggregatorTab?.();
    }

    onPrepareStep?.(current.target);

    let cancelled = false;
    const runMeasure = () => {
      if (!cancelled) measureLayout();
    };

    let rafId = 0;
    let attempts = 0;
    const tryMeasure = () => {
      if (cancelled) return;
      const el = queryTourTarget(current.target);
      if (el || attempts >= 24) {
        runMeasure();
        return;
      }
      attempts += 1;
      rafId = requestAnimationFrame(tryMeasure);
    };
    rafId = requestAnimationFrame(() => {
      requestAnimationFrame(tryMeasure);
    });

    const el = queryTourTarget(current.target);
    let ro;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(runMeasure);
      ro.observe(el);
    }

    window.addEventListener('resize', runMeasure);
    window.addEventListener('scroll', runMeasure, true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', runMeasure);
      window.removeEventListener('scroll', runMeasure, true);
    };
  }, [visible, step, current, measureLayout, onEnsureAggregatorTab, onPrepareStep]);

  useEffect(() => {
    if (visible && current) {
      logGuestEvent('guest_tour_step', { step: step + 1, target: current.target });
    }
  }, [visible, step, current]);

  if (!visible) return null;

  const goNext = () => {
    if (isLast) {
      finish('complete');
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="guest-tour-overlay" role="dialog" aria-modal="true" aria-labelledby="guest-tour-title">
      <button
        type="button"
        className="guest-tour-backdrop"
        onClick={() => finish('backdrop')}
        aria-label="Skip tour"
      />
      {spotlightRect ? (
        <div
          className="guest-tour-spotlight"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
          aria-hidden="true"
        />
      ) : null}
      <div
        className="guest-tour-tooltip"
        style={{ top: tooltipStyle.top, left: tooltipStyle.left, maxWidth: TOOLTIP_MAX_W }}
      >
        <p className="guest-tour-step-label">
          Step {step + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="guest-tour-title">{current.title}</h2>
        <p className="guest-tour-body">{renderBody(current.body)}</p>
        <div className="guest-tour-actions">
          <button type="button" className="btn-secondary" onClick={() => finish('skip')}>
            Skip
          </button>
          <button type="button" className="btn-primary" onClick={goNext}>
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
