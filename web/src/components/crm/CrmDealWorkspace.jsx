import { useState, useEffect, useCallback, useMemo } from 'react';
import DealDetailsPanel from '../DealDetailsPanel';
import { crmAPI, dealsAPI, teamsAPI } from '../../utils/api';
import { formatDate, getDealProgressLabel } from '../../utils/normalizeDeal';
import { PIPELINE_STAGE_OPTIONS } from '../../utils/pipelineStages';
import QuickFollowUp from './QuickFollowUp';
import DdChecklist from './dd/DdChecklist';
import DealThread from './DealThread';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';

function activityLabel(type) {
  const labels = {
    deal_saved: 'Saved to CRM',
    listing_hydrated: 'Listing synced',
    note: 'Note',
    stage_change: 'Stage change',
    dd_portal_comment: 'DD portal comment',
    dd_started: 'DD started',
    task_created: 'Task created'
  };
  return labels[type] || type;
}

export default function CrmDealWorkspace({
  deal,
  dealId,
  settings = null,
  onRefresh,
  onSaveCalculatorDefaults = null,
  onClose = null,
  onStageChanged = null,
  focusSectionId = null
}) {
  const { user } = useAuth();
  const { teams, activeTeamId } = useTeam();
  const [progressStage, setProgressStage] = useState(deal?.progressStage || '');
  const [progressHistory, setProgressHistory] = useState(deal?.progressHistory || []);
  const [progressSaving, setProgressSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [localFocusSection, setLocalFocusSection] = useState(focusSectionId);

  useEffect(() => {
    setLocalFocusSection(focusSectionId);
  }, [focusSectionId, dealId]);

  const writeEnabled = detail?.access ? Boolean(detail.access.canWrite) : true;

  useEffect(() => {
    if (!deal) return;
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

  const handleShareToTeam = async () => {
    const teamId = activeTeamId || teams[0]?.id;
    if (!teamId || !dealId) {
      alert('Create or select a team in Settings first, then share.');
      return;
    }
    setSharing(true);
    try {
      const data = await teamsAPI.shareDeal(teamId, dealId);
      await handleRefresh();
      if (data?.pending) {
        alert('Share requested. An admin must approve before the deal joins the team. Your personal copy stays in My Deals.');
      } else {
        alert('Deal shared with the team. Your personal copy stays in My Deals; the team has its own copy.');
      }
    } catch (err) {
      alert(err.message || 'Failed to share');
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!dealId) return;
    if (!window.confirm('Remove this deal from the team? Personal copies in My Deals are kept.')) return;
    setSharing(true);
    try {
      await teamsAPI.unshareDeal(dealId);
      await handleRefresh();
    } catch (err) {
      alert(err.message || 'Failed to unshare');
    } finally {
      setSharing(false);
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
      const result = await crmAPI.updateStage(deal.id, newStage);
      if (result.progressHistory) setProgressHistory(result.progressHistory);
      onStageChanged?.(result, deal.name);
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
    const currentNotes = deal?.notes || '';
    const updatedNotes = (currentNotes ? currentNotes + separator : `--- IOI Sent ${dateLabel} ---\n`) + ioiText;
    const newHistory = [...progressHistory, { stage: 'Send IOI', timestamp }];

    try {
      await dealsAPI.updateDeal(deal.id, {
        notes: updatedNotes,
        progressStage: 'Send IOI',
        progressHistory: newHistory
      });
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

  const dealWithBroker = useMemo(() => {
    if (!deal) return deal;
    const brokerContact = detail?.contacts?.find((c) => c.role === 'broker')
      || detail?.contacts?.[0];
    if (!brokerContact) return deal;
    return {
      ...deal,
      brokerName: deal.brokerName || brokerContact.name || deal.broker,
      brokerCompany: deal.brokerCompany || brokerContact.company_name || deal.source,
      brokerEmail: deal.brokerEmail || brokerContact.email,
      brokerPhone: deal.brokerPhone || brokerContact.phone
    };
  }, [deal, detail]);

  const extraSections = useMemo(() => [
    {
      id: 'broker-contact',
      label: 'Broker contact',
      icon: 'broker-progress',
      render: () => {
        const name = dealWithBroker?.brokerName || dealWithBroker?.broker || '—';
        const company = dealWithBroker?.brokerCompany || dealWithBroker?.source || '—';
        const email = dealWithBroker?.brokerEmail || '—';
        const phone = dealWithBroker?.brokerPhone || '—';
        const hasContact = [name, company, email, phone].some((v) => v && v !== '—');
        return (
          <div className="deal-broker-condensed crm-broker-contact">
            {hasContact ? (
              <div className="deal-broker-grid">
                <div className="deal-broker-item">
                  <div className="deal-broker-label">Broker Name</div>
                  <div className="deal-broker-value">{name}</div>
                </div>
                <div className="deal-broker-item">
                  <div className="deal-broker-label">Company</div>
                  <div className="deal-broker-value">{company}</div>
                </div>
                <div className="deal-broker-item">
                  <div className="deal-broker-label">Email</div>
                  <div className="deal-broker-value">
                    {email !== '—' ? <a href={`mailto:${email}`}>{email}</a> : '—'}
                  </div>
                </div>
                <div className="deal-broker-item">
                  <div className="deal-broker-label">Phone</div>
                  <div className="deal-broker-value">
                    {phone !== '—' ? <a href={`tel:${phone}`}>{phone}</a> : '—'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="crm-muted">
                No broker contact on file. Use &ldquo;Refresh from listing&rdquo; in Pipeline stage to pull broker details from the listing.
              </p>
            )}
          </div>
        );
      }
    },
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
              disabled={progressSaving || !writeEnabled}
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
            {!writeEnabled ? (
              <p className="crm-muted" style={{ marginTop: 8 }}>Viewer role — stage changes are read-only.</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={refreshing || !writeEnabled}
            onClick={handleRefreshListing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh from listing'}
          </button>
        </div>
      )
    },
    {
      id: 'crm-followup',
      label: 'Follow up',
      icon: 'notes',
      render: () => (
        <QuickFollowUp
          dealId={dealId}
          dealName={deal?.name}
          contacts={detail?.contacts || []}
          userEmail={user?.email || ''}
          onCreated={handleRefresh}
          disabled={!writeEnabled}
        />
      )
    },
    {
      id: 'crm-dd',
      label: 'Due Diligence',
      icon: 'broker-progress',
      render: () => (
        <DdChecklist dealId={dealId} onRefresh={onRefresh} canWrite={writeEnabled} />
      )
    },
    {
      id: 'crm-talk',
      label: 'Talk',
      icon: 'notes',
      render: () => (
        <DealThread
          dealId={dealId}
          onThreadRead={onRefresh}
          onOpenSection={(sectionId) => {
            console.log('[CrmDealWorkspace] open section from Talk', sectionId);
            setLocalFocusSection(sectionId);
          }}
        />
      )
    },
    {
      id: 'crm-timeline',
      label: 'Notes & history',
      icon: 'notes',
      render: () => (
        <div className="crm-timeline-inline">
          <div className="crm-note-form">
            <textarea
              className="crm-note-input"
              rows={2}
              placeholder={writeEnabled ? 'Add a catch-up note…' : 'Viewer — notes are read-only'}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              disabled={!writeEnabled}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={!writeEnabled || savingNote || !noteText.trim()}
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
    writeEnabled,
    handleProgressSelectChange,
    handleRefreshListing,
    handleAddCrmNote,
    dealId,
    dealWithBroker,
    deal?.name,
    user?.email,
    handleRefresh
  ]);

  const teamIdOnDeal = deal?.team_id || deal?.teamId || detail?.access?.teamId;
  const canShare = writeEnabled && !teamIdOnDeal && teams.length > 0;
  const canUnshare = writeEnabled && Boolean(teamIdOnDeal) && detail?.access?.canUnshare !== false;

  const footer = (
    <>
      {canShare ? (
        <button type="button" className="btn-secondary" disabled={sharing} onClick={handleShareToTeam}>
          {sharing ? 'Sharing…' : 'Share to team'}
        </button>
      ) : null}
      {canUnshare ? (
        <button type="button" className="btn-secondary" disabled={sharing} onClick={handleUnshare}>
          Remove from team
        </button>
      ) : null}
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
        deal={dealWithBroker || deal}
        position="center"
        onClose={onClose || (() => {})}
        settings={settings}
        onSaveCalculatorDefaults={onSaveCalculatorDefaults}
        panelOnly
        showPositionToggle={false}
        showSaveButton={false}
        extraSections={extraSections}
        focusSectionId={localFocusSection}
        renderFooter={footer}
        onIOISent={handleIOISent}
        onIOIPrefsSaved={onRefresh}
        headerProgressLabel={headerProgressLabel}
        headerProgressControl={{
          value: progressStage,
          onChange: handleProgressSelectChange,
          options: PIPELINE_STAGE_OPTIONS,
          saving: progressSaving,
          disabled: !writeEnabled
        }}
        listingEdit={{
          savedAtDisplay: deal.savedAt ? formatDate(deal.savedAt) : undefined
        }}
      />
    </div>
  );
}
