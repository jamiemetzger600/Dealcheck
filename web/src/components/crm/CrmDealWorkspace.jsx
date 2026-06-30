import { useState, useEffect, useCallback, useMemo } from 'react';
import DealDetailsPanel from '../DealDetailsPanel';
import { crmAPI, dealsAPI } from '../../utils/api';
import { formatDate, getDealProgressLabel } from '../../utils/normalizeDeal';
import { PIPELINE_STAGE_OPTIONS } from '../../utils/pipelineStages';

function activityLabel(type) {
  const labels = {
    deal_saved: 'Saved to CRM',
    listing_hydrated: 'Listing synced',
    note: 'Note',
    stage_change: 'Stage change'
  };
  return labels[type] || type;
}

export default function CrmDealWorkspace({
  deal,
  dealId,
  settings = null,
  onRefresh,
  onSaveCalculatorDefaults = null,
  onClose = null
}) {
  const [notes, setNotes] = useState(deal?.notes || '');
  const [notesTimeout, setNotesTimeout] = useState(null);
  const [progressStage, setProgressStage] = useState(deal?.progressStage || '');
  const [progressHistory, setProgressHistory] = useState(deal?.progressHistory || []);
  const [progressSaving, setProgressSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!deal) return;
    setNotes(deal.notes || '');
    setProgressStage(deal.progressStage || '');
    setProgressHistory(deal.progressHistory || []);
  }, [deal]);

  const loadDetail = useCallback(async () => {
    if (!dealId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const data = await crmAPI.getDealActivities(dealId);
      setDetail(data);
    } catch (err) {
      console.error('[CrmDealWorkspace] detail load failed', err);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleRefresh = async () => {
    await onRefresh?.();
    await loadDetail();
  };

  const handleRefreshListing = async () => {
    if (!dealId) return;
    setRefreshing(true);
    try {
      await crmAPI.refreshFromListing(dealId);
      await handleRefresh();
    } catch (err) {
      alert('Failed to refresh from listing: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotesChange = (newNotes) => {
    setNotes(newNotes);
    if (!deal?.id) return;
    if (notesTimeout) clearTimeout(notesTimeout);
    const timeout = setTimeout(async () => {
      try {
        await dealsAPI.updateDeal(deal.id, { notes: newNotes });
        onRefresh?.();
      } catch (err) {
        console.error('[CrmDealWorkspace] notes save failed', err);
      }
    }, 1000);
    setNotesTimeout(timeout);
  };

  const handleAddCrmNote = async () => {
    if (!dealId || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await crmAPI.addActivity(dealId, { body: noteText.trim(), activityType: 'note' });
      setNoteText('');
      await loadDetail();
      onRefresh?.();
    } catch (err) {
      alert('Failed to add note: ' + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleProgressSelectChange = async (e) => {
    const newStage = e.target.value;
    if (progressSaving || !deal?.id) return;
    if (!newStage.trim()) return;

    const previousStage = progressStage;
    const previousHistory = progressHistory;
    const newHistory = [
      ...previousHistory,
      { stage: newStage, timestamp: new Date().toISOString() }
    ];

    setProgressStage(newStage);
    setProgressHistory(newHistory);
    setProgressSaving(true);
    try {
      await dealsAPI.updateDeal(deal.id, {
        progressStage: newStage,
        progressHistory: newHistory
      });
      onRefresh?.();
      await loadDetail();
    } catch (error) {
      setProgressStage(previousStage);
      setProgressHistory(previousHistory);
      alert('Failed to update progress: ' + error.message);
    } finally {
      setProgressSaving(false);
    }
  };

  const handleIOISent = async (ioiText) => {
    if (!deal?.id) return;
    const timestamp = new Date().toISOString();
    const dateLabel = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const separator = `\n\n--- IOI Sent ${dateLabel} ---\n`;
    const updatedNotes = (notes ? notes + separator : `--- IOI Sent ${dateLabel} ---\n`) + ioiText;
    const newHistory = [...progressHistory, { stage: 'Send IOI', timestamp }];

    try {
      await dealsAPI.updateDeal(deal.id, {
        notes: updatedNotes,
        progressStage: 'Send IOI',
        progressHistory: newHistory
      });
      setNotes(updatedNotes);
      setProgressStage('Send IOI');
      setProgressHistory(newHistory);
      onRefresh?.();
      await loadDetail();
    } catch (error) {
      console.error('[CrmDealWorkspace] IOI save failed:', error);
      alert('IOI sent but failed to save record: ' + error.message);
    }
  };

  const headerProgressLabel = useMemo(() => {
    if (progressStage?.trim()) return progressStage.trim();
    return getDealProgressLabel({ ...deal, progressHistory, progressStage }) || '';
  }, [progressStage, progressHistory, deal]);

  const extraSections = useMemo(() => [
    {
      id: 'crm-progress',
      label: 'Pipeline stage',
      icon: 'broker-progress',
      render: () => (
        <div className="progress-tracking">
          <div className="input-group">
            <label>Current stage</label>
            <select
              value={progressStage}
              onChange={handleProgressSelectChange}
              className="modal-input"
              disabled={progressSaving}
              aria-label="Current pipeline stage"
            >
              <option value="">Select stage</option>
              {PIPELINE_STAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              {progressStage && !PIPELINE_STAGE_OPTIONS.includes(progressStage) ? (
                <option value={progressStage}>{progressStage} (saved)</option>
              ) : null}
            </select>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={refreshing}
            onClick={handleRefreshListing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh from listing'}
          </button>
        </div>
      )
    },
    {
      id: 'crm-timeline',
      label: 'CRM timeline',
      icon: 'notes',
      render: () => (
        <div className="crm-timeline-inline">
          <div className="crm-note-form">
            <textarea
              className="crm-note-input"
              rows={2}
              placeholder="Add a CRM note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={savingNote || !noteText.trim()}
              onClick={handleAddCrmNote}
            >
              {savingNote ? 'Saving…' : 'Add note'}
            </button>
          </div>
          {detailLoading ? (
            <p>Loading timeline…</p>
          ) : detail?.activities?.length ? (
            <ul className="crm-activity-list">
              {detail.activities.map((a) => (
                <li key={a.id} className="crm-activity-item">
                  <div className="crm-activity-item__head">
                    <span className="crm-activity-type">{activityLabel(a.activity_type)}</span>
                    <time>{formatDate(a.occurred_at)}</time>
                  </div>
                  {a.body ? <p>{a.body}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="crm-muted">No CRM activity yet.</p>
          )}
          {detail?.contacts?.length ? (
            <div className="crm-contacts-inline">
              <h4>Contacts</h4>
              <ul className="crm-contact-list">
                {detail.contacts.map((c) => (
                  <li key={`${c.id}-${c.role}`}>
                    <strong>{c.name || c.email || 'Contact'}</strong>
                    <span className="crm-contact-role">{c.role}</span>
                    {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: 'notes',
      render: () => (
        <div className="deal-notes-content">
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add notes about this deal..."
            rows={6}
            className="modal-notes"
          />
          <p className="notes-hint">Notes are auto-saved as you type</p>
        </div>
      )
    }
  ], [
    progressStage,
    progressSaving,
    refreshing,
    detailLoading,
    detail,
    noteText,
    savingNote,
    notes,
    handleProgressSelectChange,
    handleRefreshListing,
    handleAddCrmNote,
    handleNotesChange
  ]);

  const footer = (
    <>
      {deal?.url ? (
        <a
          href={deal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
        >
          View Original Listing
        </a>
      ) : (
        <button type="button" className="btn-secondary" disabled>
          No Listing URL Available
        </button>
      )}
      {onClose ? (
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      ) : null}
    </>
  );

  if (!deal) {
    return <p className="crm-workspace__placeholder">Select a deal to open the calculator, IOI tool, and timeline.</p>;
  }

  return (
    <div className="crm-deal-panel">
      <DealDetailsPanel
        isOpen
        deal={deal}
        position="center"
        onClose={onClose || (() => {})}
        settings={settings}
        onSaveCalculatorDefaults={onSaveCalculatorDefaults}
        panelOnly
        showPositionToggle={false}
        showSaveButton={false}
        extraSections={extraSections}
        renderFooter={footer}
        onIOISent={handleIOISent}
        onIOIPrefsSaved={onRefresh}
        headerProgressLabel={headerProgressLabel}
        listingEdit={{
          savedAtDisplay: deal.savedAt ? formatDate(deal.savedAt) : undefined
        }}
      />
    </div>
  );
}
