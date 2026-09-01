import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmAPI, teamsAPI } from '../../utils/api';
import { formatDate } from '../../utils/normalizeDeal';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import CrmQuickAdd from './CrmQuickAdd';

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' }
];

const SCOPE = [
  { id: 'all', label: 'All tasks' },
  { id: 'me', label: 'My tasks' },
  { id: 'team', label: 'Team tasks' }
];

function sourceLabel(source) {
  const labels = {
    follow_up_chip: 'Quick follow-up',
    follow_up_custom: 'Custom reminder',
    manual: 'Manual',
    stage_suggestion: 'Stage suggestion',
    intake_nudge: 'Next step',
    stage_nudge: 'Next step',
    talk_assign: 'Talk assign',
    quick_add: 'Quick add'
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
  if (teamId == null || teamId === '') return true;
  const membership = (teams || []).find((t) => Number(t.id) === Number(teamId));
  if (!membership) return false;
  return membership.role === 'admin' || membership.role === 'member';
}

function TaskRow({
  task,
  onComplete,
  onSelectDeal,
  showStatus,
  onExpand,
  expanded,
  onAddSubtask,
  onComment,
  members
}) {
  const isDone = task.status === 'done';
  const dueLabel = task.due_at ? formatDate(task.due_at) : 'No due date';
  const [subTitle, setSubTitle] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!expanded) return;
    crmAPI.getTaskComments(task.id)
      .then((d) => setComments(d.comments || []))
      .catch(() => setComments([]));
  }, [expanded, task.id]);

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
        <span className="crm-today-task__title">
          {task.priority != null && Number(task.priority) <= 2 ? (
            <span className={`crm-priority crm-priority--${task.priority}`}>P{task.priority}</span>
          ) : null}
          {task.title}
        </span>
        <span className="crm-today-task__due">{dueLabel}</span>
        {task.assignee_email ? (
          <span className="crm-muted">{String(task.assignee_email).split('@')[0]}</span>
        ) : null}
        {task.recurrence ? <span className="crm-tag">{task.recurrence}</span> : null}
        {task.subtask_count > 0 ? (
          <span className="crm-muted">{task.subtask_done_count}/{task.subtask_count} sub</span>
        ) : null}
        <span className="crm-today-task__source">{sourceLabel(task.source)}</span>
        {showStatus ? (
          <span className={`crm-task-status crm-task-status--${task.status}`}>
            {isDone ? 'Done' : 'Open'}
          </span>
        ) : null}
      </div>
      <div className="crm-task-row-actions">
        <button type="button" className="btn-secondary btn-secondary--sm" onClick={() => onExpand(task.id)}>
          {expanded ? 'Hide' : 'Details'}
        </button>
        {!isDone ? (
          <button
            type="button"
            className="btn-secondary btn-secondary--sm"
            onClick={() => onComplete(task.id)}
          >
            Done
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="crm-task-expand">
          <form
            className="crm-task-expand__row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!subTitle.trim()) return;
              onAddSubtask(task, subTitle.trim());
              setSubTitle('');
            }}
          >
            <input
              className="modal-input"
              placeholder="Add subtask…"
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
            />
            <button type="submit" className="btn-secondary btn-secondary--sm">Add subtask</button>
          </form>
          {members?.length ? (
            <label className="crm-task-expand__row">
              <span className="crm-muted">Reassign</span>
              <select
                className="modal-input"
                defaultValue={task.assignee_user_id || ''}
                onChange={(e) => {
                  const v = e.target.value;
                  crmAPI.updateTask(task.id, { assigneeUserId: v ? Number(v) : null })
                    .catch((err) => alert(err.message));
                }}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId || m.id} value={m.userId || m.id}>
                    {m.email || m.name || m.userId || m.id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <ul className="crm-task-comments">
            {comments.map((c) => (
              <li key={c.id}>
                <strong>{(c.author_email || '').split('@')[0]}</strong>: {c.body}
              </li>
            ))}
          </ul>
          <form
            className="crm-task-expand__row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              onComment(task.id, comment.trim()).then(() => {
                setComment('');
                return crmAPI.getTaskComments(task.id).then((d) => setComments(d.comments || []));
              });
            }}
          >
            <input
              className="modal-input"
              placeholder="Comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button type="submit" className="btn-secondary btn-secondary--sm">Comment</button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

export default function CrmTaskList({ deals = [], onSelectDeal, onRefresh }) {
  const { teams, activeTeamId } = useTeam();
  const { user } = useAuth();
  const [filter, setFilter] = useState('open');
  const [scope, setScope] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [dealId, setDealId] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [priority, setPriority] = useState(3);
  const [recurrence, setRecurrence] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [formError, setFormError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const writableDeals = useMemo(
    () => (deals || []).filter((d) => canWriteDeal(d, teams)),
    [deals, teams]
  );

  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (!activeTeamId) {
      setTeamMembers([]);
      return;
    }
    teamsAPI.get(activeTeamId)
      .then((data) => {
        const rows = data.members || data.team?.members || [];
        setTeamMembers(rows.map((m) => ({
          userId: m.user_id || m.userId || m.id,
          email: m.email
        })));
      })
      .catch((err) => {
        console.warn('[CrmTaskList] team members load failed', err.message);
        setTeamMembers([]);
      });
  }, [activeTeamId]);

  const members = useMemo(() => {
    if (teamMembers.length) return teamMembers;
    if (user?.userId || user?.id) {
      return [{ userId: user.userId || user.id, email: user.email }];
    }
    return [];
  }, [teamMembers, user]);

  const canCreate = writableDeals.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const assignee = scope === 'all' ? null : scope;
      const data = await crmAPI.getTasks(filter, { assignee });
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filter, scope]);

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
    setPriority(3);
    setRecurrence('');
    setAssigneeUserId('');
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
      const dueAt = dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null;
      await crmAPI.createTask(dealId, {
        title: trimmed,
        dueAt,
        source: 'manual',
        priority: Number(priority) || 3,
        recurrence: recurrence || null,
        assigneeUserId: assigneeUserId ? Number(assigneeUserId) : undefined,
        notifyRecipients: [{ type: 'self' }]
      });
      setShowCreate(false);
      resetForm();
      await load();
      onRefresh?.();
    } catch (err) {
      setFormError(err.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleAddSubtask = async (parent, subTitle) => {
    try {
      await crmAPI.createTask(parent.saved_deal_id, {
        title: subTitle,
        parentTaskId: parent.id,
        source: 'manual',
        assigneeUserId: parent.assignee_user_id || undefined,
        notifyRecipients: [{ type: 'self' }]
      });
      await load();
      onRefresh?.();
    } catch (err) {
      alert(err.message || 'Failed to add subtask');
    }
  };

  const handleComment = async (taskId, body) => {
    await crmAPI.addTaskComment(taskId, body);
  };

  return (
    <div className="crm-task-list">
      <CrmQuickAdd deals={writableDeals} onCreated={() => { load(); onRefresh?.(); }} />

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
        <div className="crm-task-list__filters">
          {SCOPE.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`crm-chip${scope === f.id ? ' crm-chip--active' : ''}`}
              onClick={() => setScope(f.id)}
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
              className="btn-primary btn-secondary--sm"
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
              <select className="modal-input" value={dealId} onChange={(e) => setDealId(e.target.value)} required>
                <option value="">Select deal…</option>
                {writableDeals.map((d) => {
                  const id = d.vettrId ?? d.id;
                  return <option key={id} value={id}>{d.name || `Deal ${id}`}</option>;
                })}
              </select>
            </label>
            <label className="crm-task-create__field">
              <span>Due date</span>
              <input type="date" className="modal-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          <div className="crm-task-create__row crm-task-create__row--split">
            <label className="crm-task-create__field">
              <span>Priority</span>
              <select className="modal-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value={1}>P1 — Urgent</option>
                <option value={2}>P2 — High</option>
                <option value={3}>P3 — Normal</option>
                <option value={4}>P4 — Low</option>
              </select>
            </label>
            <label className="crm-task-create__field">
              <span>Repeat</span>
              <select className="modal-input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="crm-task-create__field">
              <span>Assignee</span>
              <select className="modal-input" value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
                <option value="">Me</option>
                {members.map((m) => (
                  <option key={m.userId || m.id} value={m.userId || m.id}>
                    {m.email || m.name || m.userId || m.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {formError ? <p className="crm-task-create__error">{formError}</p> : null}
          <div className="crm-task-create__actions">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create task'}
            </button>
            <button type="button" className="btn-secondary" disabled={creating} onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </button>
          </div>
        </form>
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
          <p>No tasks — use Quick add or New task.</p>
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
              expanded={expandedId === task.id}
              onExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
              onAddSubtask={handleAddSubtask}
              onComment={handleComment}
              members={members}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
