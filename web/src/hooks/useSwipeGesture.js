import { useCallback, useEffect, useRef, useState } from 'react';

export const SWIPE_THRESHOLD = 100;
export const VELOCITY_THRESHOLD = 0.55;
export const DRAG_CLICK_THRESHOLD = 10;
export const SNAP_MS = 280;
export const FLY_MS = 280;

/**
 * Tinder-style left/right swipe. Native pointer listeners (not React's
 * synthetic ones) so the card tracks the finger at 60fps and iOS doesn't
 * steal the gesture for scroll.
 */
export function useSwipeGesture({ onHide, onSave, onTap, enabled = true, cardKey = null }) {
  const cardRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [flyOff, setFlyOff] = useState(null);
  const [settling, setSettling] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);
  const isDragRef = useRef(false);
  const pointerIdRef = useRef(null);
  const lastMoveRef = useRef({ t: 0, x: 0, y: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const flyTimerRef = useRef(null);
  const settleTimerRef = useRef(null);
  const flyOffRef = useRef(null);
  const settlingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const callbacksRef = useRef({ onHide, onSave, onTap });

  enabledRef.current = enabled;
  flyOffRef.current = flyOff;
  settlingRef.current = settling;
  callbacksRef.current = { onHide, onSave, onTap };

  const clearTimers = useCallback(() => {
    if (flyTimerRef.current) {
      window.clearTimeout(flyTimerRef.current);
      flyTimerRef.current = null;
    }
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const resetDrag = useCallback(() => {
    setDragX(0);
    setDragY(0);
    dragXRef.current = 0;
    dragYRef.current = 0;
    isDragRef.current = false;
    pointerIdRef.current = null;
    velocityRef.current = { vx: 0, vy: 0 };
  }, []);

  const commitAction = useCallback((action) => {
    if (!enabledRef.current || flyOffRef.current) return;
    const width = typeof window !== 'undefined' ? window.innerWidth : 400;
    const x = dragXRef.current;
    const y = dragYRef.current;
    const dir = action === 'save' ? 1 : -1;
    const flyX = dir * (width + 80) + (x || 0) * 0.15;
    const flyY = y + velocityRef.current.vy * 80;
    clearTimers();
    flyOffRef.current = action;
    setFlyOff(action);
    setSettling(false);
    settlingRef.current = false;
    dragXRef.current = flyX;
    dragYRef.current = flyY;
    setDragX(flyX);
    setDragY(flyY);
    console.log('[useSwipeGesture] fly', action, { x, vx: velocityRef.current.vx });
    flyTimerRef.current = window.setTimeout(() => {
      if (action === 'hide') callbacksRef.current.onHide?.();
      else if (action === 'save') callbacksRef.current.onSave?.();
      flyOffRef.current = null;
      setFlyOff(null);
      resetDrag();
    }, FLY_MS);
  }, [clearTimers, resetDrag]);

  const snapBack = useCallback(() => {
    settlingRef.current = true;
    setSettling(true);
    dragXRef.current = 0;
    dragYRef.current = 0;
    setDragX(0);
    setDragY(0);
    clearTimers();
    settleTimerRef.current = window.setTimeout(() => {
      settlingRef.current = false;
      setSettling(false);
      isDragRef.current = false;
    }, SNAP_MS);
  }, [clearTimers]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !enabled) return undefined;

    const onDown = (e) => {
      if (!enabledRef.current || flyOffRef.current || settlingRef.current) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      isDragRef.current = false;
      lastMoveRef.current = { t: e.timeStamp || Date.now(), x: e.clientX, y: e.clientY };
      velocityRef.current = { vx: 0, vy: 0 };
    };

    const onMove = (e) => {
      if (!enabledRef.current || flyOffRef.current || pointerIdRef.current == null) return;
      if (pointerIdRef.current !== e.pointerId) return;
      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const now = e.timeStamp || Date.now();
      const last = lastMoveRef.current;
      const dt = Math.max(1, now - last.t);
      velocityRef.current = {
        vx: (e.clientX - last.x) / dt,
        vy: (e.clientY - last.y) / dt
      };
      lastMoveRef.current = { t: now, x: e.clientX, y: e.clientY };

      if (!isDragRef.current && (absX > DRAG_CLICK_THRESHOLD || absY > DRAG_CLICK_THRESHOLD)) {
        if (absX >= absY) {
          isDragRef.current = true;
        } else {
          return;
        }
      }
      if (!isDragRef.current) return;
      e.preventDefault();
      dragXRef.current = dx;
      dragYRef.current = dy;
      setDragX(dx);
      setDragY(dy);
    };

    const onUp = (e) => {
      if (!enabledRef.current || flyOffRef.current) return;
      if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      pointerIdRef.current = null;

      if (!isDragRef.current) {
        callbacksRef.current.onTap?.();
        return;
      }

      const x = dragXRef.current;
      const { vx } = velocityRef.current;
      const flickedLeft = vx < -VELOCITY_THRESHOLD && x < -24;
      const flickedRight = vx > VELOCITY_THRESHOLD && x > 24;
      if (x < -SWIPE_THRESHOLD || flickedLeft) {
        commitAction('hide');
        return;
      }
      if (x > SWIPE_THRESHOLD || flickedRight) {
        commitAction('save');
        return;
      }
      snapBack();
    };

    const onCancel = (e) => {
      if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
      pointerIdRef.current = null;
      if (flyOffRef.current) return;
      if (isDragRef.current) snapBack();
      else resetDrag();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
  }, [commitAction, snapBack, resetDrag, cardKey, enabled]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const rotate = Math.max(-22, Math.min(22, (dragX / 260) * 18));
  const nopeOpacity = dragX < 0 ? Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD) : 0;
  const likeOpacity = dragX > 0 ? Math.min(1, dragX / SWIPE_THRESHOLD) : 0;
  const dragProgress = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD);
  const animating = Boolean(flyOff) || settling;

  return {
    cardRef,
    dragX,
    dragY,
    flyOff,
    settling,
    rotate,
    nopeOpacity,
    likeOpacity,
    dragProgress,
    animating,
    isDragging: isDragRef,
    commitAction,
    resetDrag
  };
}
