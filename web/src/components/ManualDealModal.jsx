import { useEffect, useState } from 'react';
import { userAPI } from '../utils/api';

export default function ManualDealModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', description: '', city: '', state: '', industry: '', askingPrice: '', revenue: '', ebitda: '', brokerName: '', brokerPhone: '', brokerEmail: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Business name is required');
      return;
    }

    const manualSource = {
      id: `manual_${Date.now()}`,
      type: 'manual',
      enabled: true,
      name: `Manual: ${form.name.trim()}`,
      addedAt: Date.now(),
      dealCount: 1,
      deal: {
        id: `manual_${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        location: [form.city.trim(), form.state.trim().toUpperCase()].filter(Boolean).join(', '),
        industry: form.industry.trim(),
        askingPrice: Number(form.askingPrice) || null,
        revenue: Number(form.revenue) || null,
        ebitda: Number(form.ebitda) || null,
        brokerName: form.brokerName.trim(),
        brokerPhone: form.brokerPhone.trim(),
        brokerEmail: form.brokerEmail.trim(),
        source: 'Manual Deal',
        sourceType: 'manual',
        discoveredAt: Date.now(),
        rawColumns: { Notes: form.notes.trim() }
      }
    };

    setSaving(true);
    try {
      const settings = await userAPI.getSettings();
      const customSources = settings.customSources || [];
      await userAPI.updateSettings({ customSources: [...customSources, manualSource] });
      onSaved();
      onClose();
      setForm({ name: '', description: '', city: '', state: '', industry: '', askingPrice: '', revenue: '', ebitda: '', brokerName: '', brokerPhone: '', brokerEmail: '', notes: '' });
    } catch (error) {
      alert(`Failed to save manual deal: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card manual-deal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Add Deal</h2>
          <button type="button" className="column-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-grid two-col">
          <div className="form-group full-width"><label>Business Name</label><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Business name" /></div>
          <div className="form-group full-width"><label>Description</label><textarea rows="4" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Brief description" /></div>
          <div className="form-group"><label>City</label><input value={form.city} onChange={(e) => update('city', e.target.value)} /></div>
          <div className="form-group"><label>State</label><input value={form.state} onChange={(e) => update('state', e.target.value)} maxLength="2" /></div>
          <div className="form-group"><label>Industry</label><input value={form.industry} onChange={(e) => update('industry', e.target.value)} /></div>
          <div className="form-group"><label>Asking Price</label><input value={form.askingPrice} onChange={(e) => update('askingPrice', e.target.value)} /></div>
          <div className="form-group"><label>Revenue</label><input value={form.revenue} onChange={(e) => update('revenue', e.target.value)} /></div>
          <div className="form-group"><label>EBITDA / Profit</label><input value={form.ebitda} onChange={(e) => update('ebitda', e.target.value)} /></div>
          <div className="form-group"><label>Broker Name</label><input value={form.brokerName} onChange={(e) => update('brokerName', e.target.value)} /></div>
          <div className="form-group"><label>Broker Phone</label><input value={form.brokerPhone} onChange={(e) => update('brokerPhone', e.target.value)} /></div>
          <div className="form-group full-width"><label>Broker Email</label><input value={form.brokerEmail} onChange={(e) => update('brokerEmail', e.target.value)} /></div>
          <div className="form-group full-width"><label>Notes</label><textarea rows="3" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Deal'}</button>
        </div>
      </div>
    </div>
  );
}
