import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { normalizeDeal } from '../../utils/normalizeDeal';

/**
 * Apply a saved/builtin view filter to deals client-side.
 */
export function filterDealsByView(deals, view, userId) {
  if (!view?.filters || !deals) return deals || [];
  const f = view.filters;
  let list = deals.map((d) => normalizeDeal(d) || d);

  if (f.owner === 'me' && userId) {
    list = list.filter((d) => Number(d.ownerUserId || d.user_id || d.userId) === Number(userId));
  }
  if (f.scope === 'team') {
    list = list.filter((d) => d.teamId || d.team_id);
  }
  if (f.unstaged) {
    list = list.filter((d) => !(d.progressStage || d.progress_stage));
  }
  if (f.tag) {
    const tag = String(f.tag).toLowerCase();
    list = list.filter((d) => (d.tags || []).some((t) => String(t).toLowerCase() === tag));
  }
  if (f.ownerUserId) {
    list = list.filter((d) => Number(d.ownerUserId) === Number(f.ownerUserId));
  }
  if (f.stage) {
    list = list.filter((d) => (d.progressStage || '') === f.stage);
  }
  return list;
}

export default function CrmViewBar({
  deals = [],
  activeViewId,
  onViewChange,
  tagFilter,
  onTagFilterChange
}) {
  const { user } = useAuth();
  const { activeTeamId } = useTeam();
  const [views, setViews] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await crmAPI.getViews(activeTeamId || null);
      setViews(data.views || []);
    } catch (err) {
      console.warn('[CrmViewBar] load failed', err.message);
    }
  }, [activeTeamId]);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(() => {
    const set = new Set();
    for (const d of deals) {
      const tags = d.tags || normalizeDeal(d)?.tags || [];
      for (const t of tags) set.add(String(t).toLowerCase());
    }
    return [...set].sort();
  }, [deals]);

  const handleSaveCurrent = async () => {
    const name = window.prompt('Name this view', tagFilter ? `Tagged: ${tagFilter}` : 'My view');
    if (!name) return;
    setSaving(true);
    try {
      await crmAPI.createView({
        name: name.trim(),
        viewType: 'deals',
        filters: {
          ...(tagFilter ? { tag: tagFilter } : {}),
          ...(activeViewId === 'builtin_mine' ? { owner: 'me' } : {})
        },
        teamId: activeTeamId || null,
        isShared: Boolean(activeTeamId)
      });
      await load();
    } catch (err) {
      alert(err.message || 'Failed to save view');
    } finally {
      setSaving(false);
    }
  };

  const userId = user?.userId || user?.id;

  return (
    <div className="crm-view-bar">
      <div className="crm-view-bar__views">
        {views.filter((v) => v.view_type === 'deals' || v.viewType === 'deals' || v.builtin).map((v) => (
          <button
            key={v.id}
            type="button"
            className={`crm-chip${String(activeViewId) === String(v.id) ? ' crm-chip--active' : ''}`}
            onClick={() => onViewChange?.(v)}
          >
            {v.name}
          </button>
        ))}
        <button type="button" className="btn-secondary btn-secondary--sm" disabled={saving} onClick={handleSaveCurrent}>
          {saving ? '…' : 'Save view'}
        </button>
      </div>
      {allTags.length > 0 ? (
        <div className="crm-view-bar__tags">
          <button
            type="button"
            className={`crm-chip${!tagFilter ? ' crm-chip--active' : ''}`}
            onClick={() => onTagFilterChange?.('')}
          >
            All tags
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`crm-chip crm-tag${tagFilter === t ? ' crm-chip--active' : ''}`}
              onClick={() => onTagFilterChange?.(t)}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}
      <span className="crm-muted crm-view-bar__hint" data-userid={userId || ''}>
        Views filter this board only — discovery stays in Aggregator.
      </span>
    </div>
  );
}
