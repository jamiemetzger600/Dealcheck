import { useCallback, useRef, useState } from 'react';

export const SWIPE_THRESHOLD = 80;
export const DRAG_CLICK_THRESHOLD = 8;
export const MAX_DRAG = 320;
export const PASS_SWIPE_THRESHOLD = 70;

/**
 * Tinder-style swipe gesture: left=hide, right=save, up=pass (pointer/mouse).
 *
 * On touch, vertical pans are left to the browser so the page (and card
 * body) can scroll. Only a horizontal-dominant gesture locks into swipe
 * and calls preventDefault.
 */
export function useSwipeGesture({ onHide, onSave, onPass, onTap, enabled = true }) {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [flyOff, setFlyOff] = useState(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDragRef = useRef(false);
  /** @type {React.MutableRefObject<null | 'h' | 'v'>} */
  const axisRef = useRef(null);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);

  const resetDrag = useCallback(() => {
    setDragX(0);
    setDragY(0);
    dragXRef.current = 0;
    dragYRef.current = 0;
    isDragRef.current = false;
    axisRef.current = null;
  }, []);

  const commitAction = useCallback((action) => {
    const dirs = {
      hide: { x: -window.innerWidth, y: 0 },
      save: { x: window.innerWidth, y: 0 },
      pass: { x: 0, y: -window.innerHeight },
    };
    const target = dirs[action];
    if (!target) return;
    setFlyOff(action);
    setDragX(target.x);
    setDragY(target.y);
    window.setTimeout(() => {
      if (action === 'hide') onHide?.();
      else if (action === 'save') onSave?.();
      else if (action === 'pass') onPass?.();
      setFlyOff(null);
      resetDrag();
    }, 280);
  }, [onHide, onSave, onPass, resetDrag]);

  const handleStart = useCallback((clientX, clientY) => {
    if (!enabled || flyOff) return;
    startXRef.current = clientX;
    startYRef.current = clientY;
    isDragRef.current = false;
    axisRef.current = null;
  }, [enabled, flyOff]);

  const handleMove = useCallback((clientX, clientY, { allowVerticalPass = false } = {}) => {
    if (!enabled || flyOff) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!axisRef.current && (absX > DRAG_CLICK_THRESHOLD || absY > DRAG_CLICK_THRESHOLD)) {
      // Horizontal-first → swipe. Vertical-first → native scroll (touch) / pass (mouse).
      axisRef.current = absX >= absY ? 'h' : 'v';
    }

    if (axisRef.current === 'v' && !allowVerticalPass) {
      // Let the browser scroll the page / card body.
      return;
    }

    if (axisRef.current === 'v' && allowVerticalPass) {
      // Mouse / pointer: keep upward pass gesture.
      isDragRef.current = true;
      const clampedY = Math.max(-MAX_DRAG, Math.min(0, dy));
      dragXRef.current = 0;
      dragYRef.current = clampedY;
      setDragX(0);
      setDragY(clampedY);
      return;
    }

    if (axisRef.current !== 'h') return;

    isDragRef.current = true;
    const clampedX = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    // Once locked horizontal, ignore vertical so page scroll isn't fought.
    dragXRef.current = clampedX;
    dragYRef.current = 0;
    setDragX(clampedX);
    setDragY(0);
  }, [enabled, flyOff]);

  const handleEnd = useCallback(({ allowVerticalPass = false } = {}) => {
    if (!enabled || flyOff) return;
    const x = dragXRef.current;
    const y = dragYRef.current;

    if (allowVerticalPass && axisRef.current === 'v' && y < -PASS_SWIPE_THRESHOLD && Math.abs(y) > Math.abs(x)) {
      commitAction('pass');
      return;
    }
    if (axisRef.current === 'h' && x < -SWIPE_THRESHOLD) {
      commitAction('hide');
      return;
    }
    if (axisRef.current === 'h' && x > SWIPE_THRESHOLD) {
      commitAction('save');
      return;
    }
    resetDrag();
  }, [enabled, flyOff, commitAction, resetDrag]);

  const onTouchStart = useCallback((e) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleStart]);

  const onTouchMove = useCallback((e) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY, { allowVerticalPass: false });
    // Only block native scrolling once we've locked into a horizontal swipe.
    if (axisRef.current === 'h' && isDragRef.current) e.preventDefault();
  }, [handleMove]);

  const onTouchEnd = useCallback(() => handleEnd({ allowVerticalPass: false }), [handleEnd]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    handleStart(e.clientX, e.clientY);
    const onMouseMove = (ev) => handleMove(ev.clientX, ev.clientY, { allowVerticalPass: true });
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      handleEnd({ allowVerticalPass: true });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [handleStart, handleMove, handleEnd]);

  const onClick = useCallback((e) => {
    if (isDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onTap?.();
  }, [onTap]);

  const rotate = (dragX / MAX_DRAG) * 12;
  const nopeOpacity = dragX < 0 ? Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD) * 0.9 : 0;
  const likeOpacity = dragX > 0 ? Math.min(1, dragX / SWIPE_THRESHOLD) * 0.9 : 0;
  const passOpacity = dragY < 0 ? Math.min(1, Math.abs(dragY) / PASS_SWIPE_THRESHOLD) * 0.9 : 0;

  return {
    dragX,
    dragY,
    flyOff,
    rotate,
    nopeOpacity,
    likeOpacity,
    passOpacity,
    isDragging: isDragRef,
    commitAction,
    resetDrag,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
      onMouseDown,
      onClick,
    },
  };
}
