import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Fixed-position right-click menu. Closes on outside click or Escape.
 */
export default function CrmCardContextMenu({ x, y, items = [], onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + r.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - r.width - pad);
    if (top + r.height > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - r.height - pad);
    setPos({ left, top });
  }, [x, y, items.length]);

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      className="crm-card-menu"
      role="menu"
      aria-label="Deal actions"
      style={{ left: pos.left, top: pos.top }}
    >
      {items.map((item) => {
        if (item.separator) {
          return <div key={item.id || 'sep'} className="crm-card-menu__sep" role="separator" />;
        }
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`crm-card-menu__item${item.danger ? ' crm-card-menu__item--danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              onClose?.();
              item.onSelect?.();
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
