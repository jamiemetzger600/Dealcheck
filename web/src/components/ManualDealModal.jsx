import { useEffect, useState } from 'react';
import { dealsAPI } from '../utils/api';
import { useTeam } from '../context/TeamContext';

export default function ManualDealModal({ isOpen, onClose, onSaved }) {
  const { saveTeamId } = useTeam();
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

    const city = form.city.trim();
    const state = form.state.trim().toUpperCase();
    const location = [city, state].filter(Boolean).join(', ') || null;
    const dealId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const num = (v) => {
      if (v === '' || v == null) return null;
      const n = parseFloat(String(v).replace(/,/g, '').trim());
      return Number.isFinite(n) ? n : null;
    };

    setSaving(true);
    try {
      await dealsAPI.saveDeal({
        dealId,
        name: form.name.trim(),
        url: null,
        description: form.description.trim() || null,
        city: city || null,
        state: state || null,
        location,
        industry: form.industry.trim() || null,
        askingPrice: num(form.askingPrice),
        revenue: num(form.revenue),
        ebitda: num(form.ebitda),
        brokerName: form.brokerName.trim() || null,
        brokerPhone: form.brokerPhone.trim() || null,
        brokerEmail: form.brokerEmail.trim() || null,
        source: 'Manual deal',
        sourceType: 'manual',
        discoveredAt: Date.now(),
        notes: form.notes.trim() || null,
        ...(saveTeamId ? { teamId: saveTeamId } : {})
      });
      if (typeof onSaved === 'function') {
        await Promise.resolve(onSaved());
      }
      console.log('[ManualDealModal] Saved to My Deals', { dealId, name: form.name.trim() });
      onClose();
      setForm({ name: '', description: '', city: '', state: '', industry: '', askingPrice: '', revenue: '', ebitda: '', brokerName: '', brokerPhone: '', brokerEmail: '', notes: '' });
    } catch (error) {
      console.error('[ManualDealModal] save failed', error);
      alert(`Failed to save manual deal: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card manual-deal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Deal</h2>
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
