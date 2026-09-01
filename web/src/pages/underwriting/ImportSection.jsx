import { useState } from 'react';
import { crmAPI } from '../../utils/api';

/**
 * B-SOIL / spreadsheet import with mapping review.
 */
export default function ImportSection({ uw }) {
  const { workbook, canWrite, setWorkbook, setMsg, setError, saving } = uw;
  const [importProposals, setImportProposals] = useState([]);
  const [selectedMappings, setSelectedMappings] = useState([]);
  const [unmappedSheets, setUnmappedSheets] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [detectedSoil, setDetectedSoil] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!workbook) return null;

  const onImportFile = async (file) => {
    if (!file || !workbook) return;
    setImportFileName(file.name);
    setBusy(true);
    try {
      let res;
      if (/\.xlsx?$/i.test(file.name)) {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        const xlsxBase64 = btoa(binary);
        res = await crmAPI.previewUwImport(workbook.id, [], { xlsxBase64 });
      } else {
        const text = await file.text();
        const rows = text.split(/\r?\n/).map((line) => line.split(',').map((c) => c.replace(/^"|"$/g, '')));
        res = await crmAPI.previewUwImport(workbook.id, [{ name: file.name, rows }]);
      }
      setImportProposals(res.proposals || []);
      setSelectedMappings(res.proposals || []);
      setUnmappedSheets(res.unmappedSheets || []);
      setDetectedSoil(Boolean(res.detectedSoil));
      setMsg(
        `${(res.proposals || []).length} proposed mappings${
          res.detectedSoil ? ' (B-SOIL Quick Underwrite / P&L YoY detected)' : ''
        } — review before applying.`
      );
      console.log('[underwriting] import preview', {
        file: file.name,
        proposals: (res.proposals || []).length,
        detectedSoil: res.detectedSoil
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const applyImport = async () => {
    if (!workbook || !canWrite) return;
    setBusy(true);
    try {
      const res = await crmAPI.applyUwImport(workbook.id, {
        mappings: selectedMappings,
        unmappedSheets,
        fileName: importFileName
      });
      setWorkbook(res.workbook);
      setMsg('Import applied — values flagged workbook_import for verification.');
      console.log('[underwriting] import applied', { modelId: workbook.id, n: selectedMappings.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="uw-import">
      <section className="uw-qu__card">
        <h3>Import workbook</h3>
        <p className="uw-muted">
          Upload <strong>B-SOIL.xlsx</strong> (or CSV). Vettr detects Quick Underwrite + P&L YoY labels, proposes
          mappings, and leaves unmapped tabs as custom sheets.
        </p>
        <p className="uw-muted">
          Known SOIL formula quirks (broken amort / conflicting DSCR) are <em>not</em> copied — engine recomputes
          correctly after import.
        </p>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          disabled={!canWrite || busy}
          onChange={(e) => onImportFile(e.target.files?.[0])}
        />
        {detectedSoil ? <p className="uw-pass">B-SOIL-class sheets detected</p> : null}
      </section>

      {importProposals.length > 0 ? (
        <section className="uw-qu__card">
          <h3>Mapping review</h3>
          <div className="uw-year-table-wrap">
            <table className="uw-table">
              <thead>
                <tr>
                  <th>Use</th>
                  <th>Label</th>
                  <th>Maps to</th>
                  <th>Value</th>
                  <th>Confidence</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {importProposals.map((p, idx) => {
                  const checked = selectedMappings.some(
                    (m) => m.mapsTo === p.mapsTo && m.sourceLabel === p.sourceLabel
                  );
                  return (
                    <tr key={`${p.mapsTo}-${idx}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMappings((prev) => [
                                ...prev.filter((x) => !(x.mapsTo === p.mapsTo && !p.yearHint)),
                                p
                              ]);
                            } else {
                              setSelectedMappings((prev) =>
                                prev.filter(
                                  (x) => !(x.mapsTo === p.mapsTo && x.sourceLabel === p.sourceLabel)
                                )
                              );
                            }
                          }}
                        />
                      </td>
                      <td>{p.label}</td>
                      <td>
                        {p.mapsTo}
                        {p.yearHint ? ` (${p.yearHint})` : ''}
                      </td>
                      <td>{p.value}</td>
                      <td>{p.confidence}</td>
                      <td>{p.sourceLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {unmappedSheets.length > 0 ? (
            <p className="uw-muted">
              Unmapped sheets → custom: {unmappedSheets.map((s) => s.name).join(', ')}
            </p>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            disabled={!canWrite || busy || saving || !selectedMappings.length}
            onClick={applyImport}
          >
            Apply import
          </button>
        </section>
      ) : null}
    </div>
  );
}
