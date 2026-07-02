/**
 * One-tap prompt after pipeline stage change (Phase 2).
 */
export default function SuggestedTaskPrompt({
  dealName,
  stage,
  suggestedTask,
  onAddTask,
  onStartDd,
  onDismiss
}) {
  if (!suggestedTask && stage !== 'Starting Due Diligence') return null;

  return (
    <div className="crm-suggested-task" role="status">
      <p className="crm-suggested-task__text">
        {dealName ? <strong>{dealName}</strong> : 'Deal'} moved to <em>{stage}</em>.
        {suggestedTask ? ` Suggested: ${suggestedTask}` : ''}
      </p>
      <div className="crm-suggested-task__actions">
        {suggestedTask ? (
          <button type="button" className="btn-primary" onClick={onAddTask}>
            Add task
          </button>
        ) : null}
        {stage === 'Starting Due Diligence' && onStartDd ? (
          <button type="button" className="btn-secondary" onClick={onStartDd}>
            Start DD checklist
          </button>
        ) : null}
        <button type="button" className="btn-secondary" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
