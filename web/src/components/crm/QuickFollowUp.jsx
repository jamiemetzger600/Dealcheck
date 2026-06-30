import { useState } from 'react';
import { crmAPI } from '../../utils/api';

const PRESETS = [
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: '3days', label: '3 days' },
  { id: '1week', label: '1 week' }
];

export default function QuickFollowUp({ dealId, dealName, onCreated }) {
  const [saving, setSaving] = useState(false);

  const handlePreset = async (preset) => {
    if (!dealId || saving) return;
    setSaving(true);
    try {
      await crmAPI.quickFollowUp(dealId, { preset });
      onCreated?.();
    } catch (err) {
      alert('Failed to create follow-up: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="crm-quick-followup">
      <span className="crm-quick-followup__label">Follow up{dealName ? ` on ${dealName}` : ''}</span>
      <div className="crm-quick-followup__chips">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="crm-chip"
            disabled={saving}
            onClick={() => handlePreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
