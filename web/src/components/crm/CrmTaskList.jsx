import { useCallback, useEffect, useState } from 'react';
import { crmAPI } from '../../utils/api';
import { formatDate } from '../../utils/normalizeDeal';

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
    stage_suggestion: 'Stage suggestion'
  };
  return labels[source] || source || '—';
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

export default function CrmTaskList({ onSelectDeal, onRefresh }) {
  const [filter, setFilter] = useState('open');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleComplete = async (taskId) => {
    try {
      await crmAPI.updateTask(taskId, { status: 'done' });
      await load();
      onRefresh?.();
    } catch (err) {
      alert('Failed to complete task: ' + err.message);
    }
  };

  const handleFilterChange = (next) => {
    setFilter(next);
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
              onClick={() => handleFilterChange(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="crm-muted">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
      </div>

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
              ? 'No open tasks — add a follow-up from a deal workspace.'
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
