import { crmAPI } from '../../utils/api';
import { formatDate } from '../../utils/normalizeDeal';

function TaskRow({ task, onComplete, onSelectDeal }) {
  const dueLabel = task.due_at ? formatDate(task.due_at) : 'No due date';
  return (
    <li className="crm-today-task">
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
      </div>
      <button
        type="button"
        className="btn-secondary btn-secondary--sm"
        onClick={() => onComplete(task.id)}
      >
        Done
      </button>
    </li>
  );
}

export default function CrmToday({ today, onSelectDeal, onRefresh }) {
  const tasks = today?.tasks || {};
  const overdue = tasks.overdue || [];
  const dueToday = tasks.dueToday || [];
  const stale = today?.staleListings || [];
  const ddOverdue = today?.ddOverdue || [];

  const handleCompleteTask = async (taskId) => {
    try {
      await crmAPI.updateTask(taskId, { status: 'done' });
      onRefresh?.();
    } catch (err) {
      alert('Failed to complete task: ' + err.message);
    }
  };

  const hasWork =
    overdue.length > 0 ||
    dueToday.length > 0 ||
    stale.length > 0 ||
    ddOverdue.length > 0;

  if (!hasWork) {
    return (
      <div className="crm-today-empty">
        <p>Nothing due today — you are caught up.</p>
        <p className="crm-muted">Use Pipeline to move deals forward or add a follow-up from a deal workspace.</p>
      </div>
    );
  }

  return (
    <div className="crm-today-feed">
      {overdue.length > 0 ? (
        <section className="crm-today-section">
          <h3 className="crm-today-section__title crm-today-section__title--warn">
            Overdue ({overdue.length})
          </h3>
          <ul className="crm-today-task-list">
            {overdue.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onComplete={handleCompleteTask}
                onSelectDeal={onSelectDeal}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {dueToday.length > 0 ? (
        <section className="crm-today-section">
          <h3 className="crm-today-section__title">Due today ({dueToday.length})</h3>
          <ul className="crm-today-task-list">
            {dueToday.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onComplete={handleCompleteTask}
                onSelectDeal={onSelectDeal}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {ddOverdue.length > 0 ? (
        <section className="crm-today-section">
          <h3 className="crm-today-section__title crm-today-section__title--warn">
            DD overdue ({ddOverdue.length})
          </h3>
          <ul className="crm-today-task-list">
            {ddOverdue.map((item) => (
              <li key={item.id} className="crm-today-task">
                <div className="crm-today-task__body">
                  <button
                    type="button"
                    className="crm-today-task__deal"
                    onClick={() => onSelectDeal?.(item.saved_deal_id)}
                  >
                    {item.deal_name}
                  </button>
                  <span className="crm-today-task__title">{item.title}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stale.length > 0 ? (
        <section className="crm-today-section">
          <h3 className="crm-today-section__title">Stale listings ({stale.length})</h3>
          <ul className="crm-stale-list">
            {stale.map((s) => (
              <li key={s.savedDealId}>
                <button
                  type="button"
                  className="crm-stale-item"
                  onClick={() => onSelectDeal?.(s.savedDealId)}
                >
                  <strong>{s.name}</strong>
                  <span>Feed financials changed — refresh from listing</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
