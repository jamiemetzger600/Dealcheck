import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmAPI } from '../../utils/api';
import { formatDate } from '../../utils/normalizeDeal';
import { useTeam } from '../../context/TeamContext';

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' }
];

function sourceLabel(source) {
  const labels = {
    follow_up_chip: 'Quick follow-up',
    follow_up_custom: 'Custom reminder',
    manual: 'Manual',
    stage_suggestion: 'Stage suggestion',
    talk_assign: 'Talk assign'
  };
  return labels[source] || source || '—';
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function canWriteDeal(deal, teams) {
  const teamId = deal?.team_id ?? deal?.teamId ?? null;
  if (teamId == null || teamId === '') return true; // personal — owner
  const membership = (teams || []).find((t) => Number(t.id) === Number(teamId));
  if (!membership) return false;
  return membership.role === 'admin' || membership.role === 'member';
}

function TaskRow({ task, onComplete, onSelectDeal, showStatus }) {
  const isDone = task.status === 'done';
  const dueLabel = task.due_at
    ? formatDate(task.due_at)
    : 'No due date';

  return (
    <li className={`crm-today-task${isDone ? ' crm-today-task--done' : ''}`}>
      <div className="crm-today-task__body">
        <button
          type="button"
          className="crm-today-task__deal"
          onClick={() => onSelectDeal?.(task.saved_deal_id)}
        >
          {task.deal_name || 'Deal'}
        </button>
        <span className="crm-today-task__title">{task.title}</span>
        <span className="crm-today-task__due">{dueLabel}</span>
        {task.progress_stage ? (
          <span className="crm-today-task__stage">{task.progress_stage}</span>
        ) : null}
        <span className="crm-today-task__source">{sourceLabel(task.source)}</span>
        {showStatus ? (
          <span className={`crm-task-status crm-task-status--${task.status}`}>
            {isDone ? 'Done' : 'Open'}
          </span>
        ) : null}
      </div>
      {!isDone ? (
        <button
          type="button"
          className="btn-secondary btn-secondary--sm"
          onClick={() => onComplete(task.id)}
        >
          Done
        </button>
      ) : null}
    </li>
  );
}

export default function CrmTaskList({ deals = [], onSelectDeal, onRefresh }) {
  const { teams } = useTeam();
  const [filter, setFilter] = useState('open');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [dealId, setDealId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [formError, setFormError] = useState('');

  const writableDeals = useMemo(
    () => (deals || []).filter((d) => canWriteDeal(d, teams)),
    [deals, teams]
  );

  const canCreate = writableDeals.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getTasks(filter);
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!dealId && writableDeals.length === 1) {
      const id = writableDeals[0].vettrId ?? writableDeals[0].id;
      setDealId(id != null ? String(id) : '');
    }
  }, [writableDeals, dealId]);

  const handleComplete = async (taskId) => {
    try {
      await crmAPI.updateTask(taskId, { status: 'done' });
      await load();
      onRefresh?.();
    } catch (err) {
      alert('Failed to complete task: ' + err.message);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDueDate(defaultDueDate());
    setFormError('');
    if (writableDeals.length === 1) {
      const id = writableDeals[0].vettrId ?? writableDeals[0].id;
      setDealId(id != null ? String(id) : '');
    } else {
      setDealId('');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (creating) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setFormError('Enter a task title.');
      return;
    }
    if (!dealId) {
      setFormError('Pick a deal for this task.');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      const dueAt = dueDate
        ? new Date(`${dueDate}T12:00:00`).toISOString()
        : null;
      await crmAPI.createTask(dealId, {
        title: trimmed,
        dueAt,
        source: 'manual',
        notifyRecipients: [{ type: 'self' }]
      });
      console.log('[CrmTaskList] created task on deal', dealId);
      setShowCreate(false);
      resetForm();
      await load();
      onRefresh?.();
    } catch (err) {
      console.error('[CrmTaskList] create failed', err);
      setFormError(err.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="crm-task-list">
      <div className="crm-task-list__toolbar">
        <div className="crm-task-list__filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`crm-chip${filter === f.id ? ' crm-chip--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="crm-task-list__toolbar-right">
          <span className="crm-muted">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
          {canCreate ? (
            <button
              type="button"
              className={`btn-primary btn-secondary--sm${showCreate ? ' crm-task-list__new--open' : ''}`}
              onClick={() => {
                setShowCreate((v) => !v);
                setFormError('');
              }}
            >
              {showCreate ? 'Close' : 'New task'}
            </button>
          ) : null}
        </div>
      </div>

      {showCreate && canCreate ? (
        <form className="crm-task-create" onSubmit={handleCreate}>
          <div className="crm-task-create__row">
            <label className="crm-task-create__field">
              <span>Task</span>
              <input
                type="text"
                className="modal-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                maxLength={300}
              />
            </label>
          </div>
          <div className="crm-task-create__row crm-task-create__row--split">
            <label className="crm-task-create__field">
              <span>Deal</span>
              <select
                className="modal-input"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                required
                aria-label="Deal for this task"
              >
                <option value="">Select deal…</option>
                {writableDeals.map((d) => {
                  const id = d.vettrId ?? d.id;
                  return (
                    <option key={id} value={id}>
                      {d.name || `Deal ${id}`}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="crm-task-create__field">
              <span>Due date</span>
              <input
                type="date"
                className="modal-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Task due date"
              />
            </label>
          </div>
          {formError ? <p className="crm-task-create__error">{formError}</p> : null}
          <div className="crm-task-create__actions">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create task'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={creating}
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
          <p className="crm-muted crm-task-create__hint">
            Members and admins can create tasks on deals they can edit. Viewers are read-only.
          </p>
        </form>
      ) : null}

      {!canCreate ? (
        <p className="crm-muted crm-task-create__hint">
          No writable deals here — viewers can’t create tasks, or save a deal first.
        </p>
      ) : null}

      {loading ? <div className="crm-panel">Loading tasks…</div> : null}

      {error ? (
        <div className="crm-panel crm-panel--error">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={load}>Retry</button>
        </div>
      ) : null}

      {!loading && !error && tasks.length === 0 ? (
        <div className="crm-today-empty">
          <p>
            {filter === 'open'
              ? canCreate
                ? 'No open tasks — use New task above, or add a follow-up from a deal.'
                : 'No open tasks.'
              : filter === 'done'
                ? 'No completed tasks yet.'
                : 'No tasks yet.'}
          </p>
        </div>
      ) : null}

      {!loading && !error && tasks.length > 0 ? (
        <ul className="crm-today-task-list crm-task-list__items">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              showStatus={filter === 'all'}
              onComplete={handleComplete}
              onSelectDeal={onSelectDeal}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
