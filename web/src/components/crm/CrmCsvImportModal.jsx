import { useEffect, useState } from 'react';
import { crmAPI } from '../../utils/api';
import { useTeam } from '../../context/TeamContext';

const SAMPLE = `name,city,state,industry,asking_price,revenue,ebitda,broker_name,broker_email,external_source_type,referral_source,tags,url,notes
Acme HVAC,Austin,TX,HVAC,1200000,900000,250000,Jane Broker,jane@broker.com,broker_intro,Cold call,hot|texas,https://example.com,Strong cash flow
`;

export default function CrmCsvImportModal({ isOpen, onClose, onImported }) {
  const { saveTeamId } = useTeam();
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setResult(null);
  };

  const handleImport = async () => {
    if (!csv.trim()) {
      alert('Paste CSV or choose a file first');
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const data = await crmAPI.importCsv(csv, saveTeamId || null);
      setResult(data);
      console.log('[CrmCsvImport] imported', data.created?.length, 'deals');
      if (data.created?.length) onImported?.(data);
    } catch (err) {
      console.error('[CrmCsvImport] failed', err);
      alert(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card crm-csv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import deals (CSV)</h2>
          <button type="button" className="column-close-btn" onClick={onClose}>×</button>
        </div>
        <p className="crm-muted">
          Required column: <code>name</code> (or Business Name). Optional: city, state, industry,
          asking_price, revenue, ebitda, broker_*, url, tags, referral_source, external_source_type,
          close_target_date, contact_name, contact_email, contact_role.
        </p>
        <div className="form-group">
          <label>CSV file</label>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} />
        </div>
        <div className="form-group">
          <label>Or paste CSV</label>
          <textarea
            className="crm-csv-textarea"
            rows={10}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={SAMPLE}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={() => setCsv(SAMPLE)}>
            Load sample
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {result?.created?.length ? 'Done' : 'Cancel'}
          </button>
          <button type="button" className="btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
        {result ? (
          <div className="crm-csv-result">
            <p>
              Created <strong>{result.created?.length || 0}</strong>
              {result.skipped?.length ? ` · skipped ${result.skipped.length}` : ''}
              {result.errors?.length ? ` · errors ${result.errors.length}` : ''}
            </p>
            {result.errors?.length ? (
              <ul className="crm-muted">
                {result.errors.slice(0, 5).map((e) => (
                  <li key={`err-${e.row}`}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
