import { useEffect, useState } from 'react';

export default function UwField({
  label,
  value,
  onChange,
  disabled,
  onRequestEvidence,
  evidenceStatus,
  hint,
  step = 'any',
  type = 'number'
}) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);

  return (
    <label className="uw-field">
      <span>
        {label}
        {evidenceStatus ? (
          <em className={`uw-ev-badge uw-ev-badge--${evidenceStatus}`}>{evidenceStatus}</em>
        ) : null}
        {onRequestEvidence ? (
          <button type="button" className="uw-evidence-btn" onClick={onRequestEvidence} title="Request via DD">
            DD
          </button>
        ) : null}
      </span>
      <input
        className="modal-input"
        type={type}
        step={step}
        disabled={disabled}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (String(local) !== String(value ?? '')) onChange?.(local);
        }}
      />
      {hint ? <em className="uw-why">{hint}</em> : null}
    </label>
  );
}
