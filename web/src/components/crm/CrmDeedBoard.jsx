import { useCallback, useMemo, useState } from 'react';
import { crmAPI, dealsAPI } from '../../utils/api';
import { normalizeDeal, getDealProgressLabel } from '../../utils/normalizeDeal';
import { getCalculatorDefaultsFromSettings } from '../../utils/calculatorDefaultsFromSettings';
import { getSavedDealCalculatorSummary } from '../../utils/savedDealCalculatorSummary';
import { useTeam } from '../../context/TeamContext';
import CrmCardContextMenu from './CrmCardContextMenu';
import CrmDeedCard from './CrmDeedCard';
import CrmDeedModals from './CrmDeedModals';
import {
  WAITING_DEFAULTS,
  defaultDeedColorId,
  getWaitingOn,
  loadDeedCardPrefs,
  partitionDeedDeals,
  reorderDealIds,
  saveDeedCardPrefs,
  waitingOnLabels
} from '../../utils/deedCardPrefs';

function dealSearchHaystack(deal, waiting, nextAction) {
  const stage = getDealProgressLabel(deal) || 'unstaged';
  const wait = waitingOnLabels(waiting).join(' ');
  return [
    deal.name,
    stage,
    deal.city,
    deal.state,
    deal.industry,
    wait,
    nextAction?.title,
    ...(Array.isArray(deal.tags) ? deal.tags : [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function CrmDeedBoard({
  deals = [],
  settings = null,
  selectedDealId = null,
  onSelectDeal,
  onRefresh,
  onStageChanged = null,
  nextActionByDealId = null,
  overdueDealIds = null,
  onAddDeal = null
}) {
  const { isTeamMode, activeTeam } = useTeam();
  const writeEnabled = !isTeamMode || activeTeam?.role !== 'viewer';
  const [prefs, setPrefs] = useState(() => loadDeedCardPrefs());
  const [dragDealId, setDragDealId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [cardMenu, setCardMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [stageSaving, setStageSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [waitingFilter, setWaitingFilter] = useState('');

  const calculatorDefaults = useMemo(
    () => getCalculatorDefaultsFromSettings(settings),
    [settings]
  );

  const normalized = useMemo(
    () => (Array.isArray(deals) ? deals.map(normalizeDeal).filter((d) => d?.id) : []),
    [deals]
  );

  const orderedDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = normalized.filter((deal) => {
      const waiting = getWaitingOn(prefs, deal.id);
      const nextAction =
        nextActionByDealId instanceof Map
          ? nextActionByDealId.get(Number(deal.id)) || null
          : null;
      if (q && !dealSearchHaystack(deal, waiting, nextAction).includes(q)) return false;
      if (stageFilter === '__unstaged__') {
        if (getDealProgressLabel(deal)) return false;
      } else if (stageFilter && getDealProgressLabel(deal) !== stageFilter) {
        return false;
      }
      if (waitingFilter) {
        const labels = waitingOnLabels(waiting).map((l) => l.toLowerCase());
        const defaults = WAITING_DEFAULTS.find((d) => d.id === waitingFilter);
        const needle = (defaults?.label || waitingFilter).toLowerCase();
        if (!labels.includes(needle)) return false;
      }
      return true;
    });
    return partitionDeedDeals(matched, prefs);
  }, [normalized, prefs, query, stageFilter, waitingFilter, nextActionByDealId]);

  const allIds = useMemo(() => normalized.map((d) => d.id), [normalized]);

  const stageOptions = useMemo(() => {
    const set = new Set();
    for (const deal of normalized) {
      const label = getDealProgressLabel(deal);
      if (label) set.add(label);
    }
    return [...set].sort();
  }, [normalized]);

  const persist = useCallback((next) => {
    setPrefs(next);
    saveDeedCardPrefs(next);
  }, []);

  const ensureOrder = useCallback((list, extraIds = []) => {
    const seen = new Set();
    const next = [];
    for (const id of [...(list || []), ...extraIds]) {
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(key);
    }
    return next;
  }, []);

  const summaryFor = useCallback(
    (deal) => getSavedDealCalculatorSummary(deal, calculatorDefaults),
    [calculatorDefaults]
  );

  const openRecord = useCallback((dealId, opts = {}) => {
    onSelectDeal?.(dealId, { openRecord: true, ...opts });
  }, [onSelectDeal]);

  const handleContextMenu = useCallback((e, deal) => {
    if (!deal?.id) return;
    console.log('[CrmDeedBoard] context menu', deal.id, deal.name);
    setCardMenu({ deal, x: e.clientX, y: e.clientY });
  }, []);

  const closeCardMenu = useCallback(() => setCardMenu(null), []);

  const openField = useCallback((deal, type) => {
    setCardMenu(null);
    setModal({ type, dealId: deal.id });
    console.log('[CrmDeedBoard] field modal', type, deal.id);
  }, []);

  const modalDeal = useMemo(() => {
    if (!modal?.dealId) return null;
    return (
      normalized.find((d) => String(d.id) === String(modal.dealId))
      || null
    );
  }, [modal, normalized]);

  const handlePin = useCallback((deal) => {
    const key = String(deal.id);
    const nextPins = { ...prefs.pins };
    let nextOrder = ensureOrder(prefs.order, allIds);
    if (nextPins[key]) {
      delete nextPins[key];
    } else {
      nextPins[key] = true;
      nextOrder = ensureOrder([key, ...nextOrder], allIds);
    }
    console.log('[CrmDeedBoard] pin', key, Boolean(nextPins[key]));
    persist({
      ...prefs,
      pins: nextPins,
      order: nextOrder
    });
  }, [allIds, ensureOrder, persist, prefs]);

  const handlePickColor = useCallback((colorId) => {
    if (!modalDeal) return;
    persist({
      ...prefs,
      colors: { ...prefs.colors, [String(modalDeal.id)]: colorId }
    });
    setModal(null);
  }, [modalDeal, persist, prefs]);

  const handleSaveWaiting = useCallback((waiting) => {
    if (!modalDeal) return;
    persist({
      ...prefs,
      waitingOn: { ...prefs.waitingOn, [String(modalDeal.id)]: waiting }
    });
    setModal(null);
  }, [modalDeal, persist, prefs]);

  const handleStageChange = useCallback(async (e) => {
    const newStage = e.target.value;
    if (!modalDeal?.id || !newStage.trim() || stageSaving) return;
    setStageSaving(true);
    try {
      const result = await crmAPI.updateStage(modalDeal.id, newStage);
      console.log('[CrmDeedBoard] stage', modalDeal.id, newStage);
      onStageChanged?.(result, modalDeal.name);
      onRefresh?.();
      setModal(null);
    } catch (err) {
      alert('Failed to update status: ' + (err.message || 'error'));
    } finally {
      setStageSaving(false);
    }
  }, [modalDeal, onRefresh, onStageChanged, stageSaving]);

  const handleCreateTask = useCallback(async (title) => {
    if (!modalDeal?.id) return;
    await crmAPI.createTask(modalDeal.id, {
      title,
      source: 'manual',
      notifyRecipients: [{ type: 'self' }]
    });
    console.log('[CrmDeedBoard] next-step task', modalDeal.id, title);
    onRefresh?.();
    setModal(null);
  }, [modalDeal, onRefresh]);

  const handleDeleteDeal = useCallback(async (deal) => {
    if (!deal?.id || !writeEnabled) return;
    if (!window.confirm(`Delete “${deal.name || 'this deal'}” from Vettr CRM?`)) return;
    try {
      await dealsAPI.deleteDeal(deal.id);
      console.log('[CrmDeedBoard] deleted', deal.id);
      setCardMenu(null);
      onRefresh?.();
    } catch (err) {
      alert('Failed to delete deal: ' + (err.message || 'error'));
    }
  }, [onRefresh, writeEnabled]);

  const cardMenuItems = useMemo(() => {
    const deal = cardMenu?.deal;
    if (!deal) return [];
    const items = [
      { id: 'open', label: 'Open', onSelect: () => openRecord(deal.id) },
      { id: 'status', label: 'Status', onSelect: () => openField(deal, 'status') },
      { id: 'next', label: 'Next step', onSelect: () => openField(deal, 'next') },
      { id: 'metrics', label: 'Metrics', onSelect: () => openField(deal, 'metrics') },
      { id: 'waiting', label: 'Waiting on', onSelect: () => openField(deal, 'waiting') },
      { id: 'color', label: 'Color', onSelect: () => openField(deal, 'color') },
      {
        id: 'pin',
        label: prefs.pins?.[String(deal.id)] ? 'Unpin' : 'Pin',
        onSelect: () => handlePin(deal)
      },
      { id: 'sep-more', separator: true },
      {
        id: 'dd',
        label: 'Due diligence',
        onSelect: () => openRecord(deal.id, { focusSection: 'crm-dd' })
      },
      {
        id: 'calculator',
        label: 'Calculator',
        onSelect: () => openRecord(deal.id, { focusSection: 'calculator' })
      }
    ];
    if (deal.url) {
      items.push({
        id: 'listing',
        label: 'Open listing',
        onSelect: () => window.open(deal.url, '_blank', 'noopener,noreferrer')
      });
    }
    if (writeEnabled) {
      items.push({ id: 'sep-del', separator: true });
      items.push({
        id: 'delete',
        label: 'Delete',
        danger: true,
        onSelect: () => handleDeleteDeal(deal)
      });
    }
    return items;
  }, [cardMenu, handleDeleteDeal, handlePin, openField, openRecord, prefs.pins, writeEnabled]);

  const handleDragStart = (e, dealId) => {
    setDragDealId(dealId);
    e.dataTransfer.setData('text/plain', String(dealId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragDealId(null);
    setDropTargetId(null);
  };

  const handleDrop = (e, toDealId) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain') || dragDealId;
    setDropTargetId(null);
    setDragDealId(null);
    if (!fromId || String(fromId) === String(toDealId)) return;
    const fromKey = String(fromId);
    const toKey = String(toDealId);
    const fromPinned = Boolean(prefs.pins?.[fromKey]);
    const toPinned = Boolean(prefs.pins?.[toKey]);
    const currentOrder = ensureOrder(
      prefs.order.length ? prefs.order : allIds,
      allIds
    );
    const nextOrder = reorderDealIds(currentOrder, fromId, toDealId);
    const nextPins = { ...prefs.pins };
    if (fromPinned !== toPinned) {
      if (toPinned) nextPins[fromKey] = true;
      else delete nextPins[fromKey];
    }
    persist({ ...prefs, order: nextOrder, pins: nextPins });
    console.log('[CrmDeedBoard] reorder', fromId, '→', toDealId, { pin: Boolean(nextPins[fromKey]) });
  };

  const renderCard = (deal) => {
    const id = deal.id;
    const nextAction =
      nextActionByDealId instanceof Map
        ? nextActionByDealId.get(Number(id)) || null
        : null;
    const colorId = prefs.colors?.[String(id)] || defaultDeedColorId(id);
    return (
      <CrmDeedCard
        key={id}
        deal={deal}
        summary={summaryFor(deal)}
        nextAction={nextAction}
        waiting={getWaitingOn(prefs, id)}
        overdueDealIds={overdueDealIds}
        colorId={colorId}
        pinned={Boolean(prefs.pins?.[String(id)])}
        selected={selectedDealId != null && String(selectedDealId) === String(id)}
        dragging={String(dragDealId) === String(id)}
        dropTarget={String(dropTargetId) === String(id)}
        writeEnabled={writeEnabled}
        onOpen={openRecord}
        onContextMenu={handleContextMenu}
        onOpenField={(type) => openField(deal, type)}
        onPin={() => handlePin(deal)}
        onDragStart={(e) => handleDragStart(e, id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDropTargetId(id);
        }}
        onDrop={(e) => handleDrop(e, id)}
      />
    );
  };

  const pinnedDeals = orderedDeals.pinned;
  const restDeals = orderedDeals.rest;
  const visibleCount = pinnedDeals.length + restDeals.length;
  const hasFilters = Boolean(query.trim() || stageFilter || waitingFilter);
  const boardEmpty = normalized.length === 0;
  const matchEmpty = !boardEmpty && visibleCount === 0;

  return (
    <div className="crm-deed-board">
      <div className="crm-deed-board__banner">
        <strong>Test view.</strong> Pin as many deals as you want — they stay on top. Search or filter the board. Drag to reorder; drop onto a pinned card to pin.
        {writeEnabled ? '' : ' Viewer role — cards are read-only.'}
      </div>

      <div className="crm-deed-board__toolbar">
        <label className="crm-deed-board__search">
          <input
            type="search"
            className="modal-input"
            placeholder="Search deals…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              console.log('[CrmDeedBoard] search', e.target.value);
            }}
            aria-label="Search deal cards"
          />
        </label>
        <select
          className="modal-input"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="__unstaged__">Unstaged</option>
          {stageOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select
          className="modal-input"
          value={waitingFilter}
          onChange={(e) => setWaitingFilter(e.target.value)}
          aria-label="Filter by waiting on"
        >
          <option value="">Waiting on: all</option>
          {WAITING_DEFAULTS.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        {hasFilters ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setQuery('');
              setStageFilter('');
              setWaitingFilter('');
            }}
          >
            Clear
          </button>
        ) : null}
        <span className="crm-kanban-count">
          {visibleCount}{hasFilters ? ` of ${normalized.length}` : ''} deals
          {pinnedDeals.length > 0 ? ` · ${pinnedDeals.length} pinned` : ''}
        </span>
        {typeof onAddDeal === 'function' ? (
          <button type="button" className="btn-primary" onClick={onAddDeal}>
            Add deal
          </button>
        ) : null}
      </div>

      {boardEmpty ? (
        <div className="crm-empty">
          <h2>No deals for Cards yet</h2>
          <p>Save a listing from Deal Aggregator, then come back to this test view.</p>
        </div>
      ) : matchEmpty ? (
        <div className="crm-empty">
          <h2>No matching cards</h2>
          <p>Try a different search or clear the filters.</p>
        </div>
      ) : (
        <>
          {pinnedDeals.length > 0 ? (
            <section className="crm-deed-board__section" aria-label="Pinned deals">
              <h2 className="crm-deed-board__section-title">
                Pinned <span>{pinnedDeals.length}</span>
              </h2>
              <div className="crm-deed-board__grid">
                {pinnedDeals.map(renderCard)}
              </div>
            </section>
          ) : (
            <p className="crm-deed-board__pin-hint">Pin a card to keep it on top. You can pin as many as you want.</p>
          )}
          {restDeals.length > 0 ? (
            <section className="crm-deed-board__section" aria-label="Other deals">
              <h2 className="crm-deed-board__section-title">
                {pinnedDeals.length > 0 ? 'Other deals' : 'Deals'} <span>{restDeals.length}</span>
              </h2>
              <div className="crm-deed-board__grid">
                {restDeals.map(renderCard)}
              </div>
            </section>
          ) : null}
        </>
      )}

      {cardMenu ? (
        <CrmCardContextMenu
          x={cardMenu.x}
          y={cardMenu.y}
          items={cardMenuItems}
          onClose={closeCardMenu}
        />
      ) : null}

      <CrmDeedModals
        modal={modal?.type || null}
        deal={modalDeal}
        summary={modalDeal ? summaryFor(modalDeal) : null}
        nextAction={
          modalDeal && nextActionByDealId instanceof Map
            ? nextActionByDealId.get(Number(modalDeal.id)) || null
            : null
        }
        waiting={modalDeal ? getWaitingOn(prefs, modalDeal.id) : null}
        colorId={modalDeal ? (prefs.colors?.[String(modalDeal.id)] || defaultDeedColorId(modalDeal.id)) : null}
        writeEnabled={writeEnabled}
        stageSaving={stageSaving}
        onClose={() => setModal(null)}
        onStageChange={handleStageChange}
        onCreateTask={handleCreateTask}
        onOpenTasks={() => {
          if (!modalDeal) return;
          setModal(null);
          openRecord(modalDeal.id, { focusSection: 'crm-followup' });
        }}
        onOpenCalculator={() => {
          if (!modalDeal) return;
          setModal(null);
          openRecord(modalDeal.id, { focusSection: 'calculator' });
        }}
        onSaveWaiting={handleSaveWaiting}
        onPickColor={handlePickColor}
      />
    </div>
  );
}
