import { useCallback, useRef, useState } from 'react';

export const SWIPE_THRESHOLD = 80;
export const DRAG_CLICK_THRESHOLD = 8;
export const MAX_DRAG = 320;
export const PASS_SWIPE_THRESHOLD = 70;

/**
 * Tinder-style swipe gesture: left=hide, right=save, up=pass.
 * Returns drag state and pointer handlers.
 */
export function useSwipeGesture({ onHide, onSave, onPass, onTap, enabled = true }) {
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [flyOff, setFlyOff] = useState(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDragRef = useRef(false);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);

  const resetDrag = useCallback(() => {
    setDragX(0);
    setDragY(0);
    dragXRef.current = 0;
    dragYRef.current = 0;
    isDragRef.current = false;
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
  }, [enabled, flyOff]);

  const handleMove = useCallback((clientX, clientY) => {
    if (!enabled || flyOff) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;
    if (!isDragRef.current && (Math.abs(dx) > DRAG_CLICK_THRESHOLD || Math.abs(dy) > DRAG_CLICK_THRESHOLD)) {
      isDragRef.current = true;
    }
    const clampedX = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    const clampedY = Math.max(-MAX_DRAG, Math.min(0, dy));
    dragXRef.current = clampedX;
    dragYRef.current = clampedY;
    setDragX(clampedX);
    setDragY(clampedY);
  }, [enabled, flyOff]);

  const handleEnd = useCallback(() => {
    if (!enabled || flyOff) return;
    const x = dragXRef.current;
    const y = dragYRef.current;
    if (y < -PASS_SWIPE_THRESHOLD && Math.abs(y) > Math.abs(x)) {
      commitAction('pass');
      return;
    }
    if (x < -SWIPE_THRESHOLD) {
      commitAction('hide');
      return;
    }
    if (x > SWIPE_THRESHOLD) {
      commitAction('save');
      return;
    }
    resetDrag();
  }, [enabled, flyOff, commitAction, resetDrag]);

  const onTouchStart = useCallback((e) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleStart]);

  const onTouchMove = useCallback((e) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
    if (isDragRef.current) e.preventDefault();
  }, [handleMove]);

  const onTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    handleStart(e.clientX, e.clientY);
    const onMouseMove = (ev) => handleMove(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      handleEnd();
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
