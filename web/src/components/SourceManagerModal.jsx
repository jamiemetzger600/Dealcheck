import { useEffect, useMemo, useState } from 'react';
import { userAPI } from '../utils/api';

const SOURCE_TYPES = [
  { id: 'google_sheets', label: 'Google Sheets', hint: 'Public Google Sheets URL' },
  { id: 'csv_url', label: 'CSV URL', hint: 'Direct CSV file URL' }
];

export default function SourceManagerModal({ isOpen, settings, onClose, onSaved }) {
  const [sources, setSources] = useState([]);
  const [selectedType, setSelectedType] = useState('google_sheets');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setSources(settings?.customSources || []);
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const hint = useMemo(() => SOURCE_TYPES.find((type) => type.id === selectedType)?.hint || '', [selectedType]);
  if (!isOpen) return null;

  const persist = async (nextSources) => {
    await userAPI.updateSettings({ customSources: nextSources });
    setSources(nextSources);
    onSaved();
  };

  const handleAdd = async () => {
    if (!name.trim() || !url.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const source = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      type: selectedType,
      url: url.trim(),
      enabled: true,
      addedAt: Date.now(),
      lastFetch: null,
      dealCount: 0
    };

    setSaving(true);
    try {
      await persist([...sources, source]);
      setName('');
      setUrl('');
    } catch (error) {
      alert(`Failed to add source: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleSource = async (sourceId) => {
    const nextSources = sources.map((source) => source.id === sourceId ? { ...source, enabled: !source.enabled } : source);
    try {
      await persist(nextSources);
    } catch (error) {
      alert(`Failed to update source: ${error.message}`);
    }
  };

  const removeSource = async (sourceId) => {
    if (!window.confirm('Delete this source?')) return;
    const nextSources = sources.filter((source) => source.id !== sourceId);
    try {
      await persist(nextSources);
    } catch (error) {
      alert(`Failed to remove source: ${error.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Manage Sources</h2>
          <button type="button" className="column-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="source-list">
          <div className="source-item default-source">
            <div className="source-item-info">
              <div className="source-item-name">Business Listings Database (Default)</div>
              <div className="source-item-meta">Type: google_sheets | Enabled | Uses the same default sheet as the extension</div>
            </div>
          </div>
          {sources.map((source) => (
            <div key={source.id} className={`source-item${source.enabled ? '' : ' disabled'}`}>
              <div className="source-item-info">
                <div className="source-item-name">{source.name}</div>
                <div className="source-item-meta">Type: {source.type} | {source.enabled ? 'Enabled' : 'Disabled'}</div>
              </div>
              <div className="source-item-actions">
                <button type="button" className="source-item-btn toggle-btn" onClick={() => toggleSource(source.id)}>{source.enabled ? '✓ Enabled' : 'Disabled'}</button>
                <button type="button" className="source-item-btn delete" onClick={() => removeSource(source.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-divider" />

        <div className="source-type-grid">
          {SOURCE_TYPES.map((type) => (
            <button key={type.id} type="button" className={`source-type-card ${selectedType === type.id ? 'selected' : ''}`} onClick={() => setSelectedType(type.id)}>
              {type.label}
            </button>
          ))}
        </div>

        <div className="modal-grid">
          <div className="form-group"><label>Source Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Deal Source" /></div>
          <div className="form-group"><label>Source URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={hint} /></div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Adding...' : 'Add Source'}</button>
        </div>
      </div>
    </div>
  );
}
