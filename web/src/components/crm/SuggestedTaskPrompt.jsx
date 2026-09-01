/**
 * One-tap prompt after pipeline stage change.
 * When Vettr already queued the next step, only dismiss is needed.
 */
export default function SuggestedTaskPrompt({
  dealName,
  stage,
  suggestedTask,
  queued = false,
  onAddTask,
  onStartDd,
  onDismiss
}) {
  if (!suggestedTask && stage !== 'Starting Due Diligence') return null;

  return (
    <div className="crm-suggested-task" role="status">
      <p className="crm-suggested-task__text">
        {dealName ? <strong>{dealName}</strong> : 'Deal'} moved to <em>{stage}</em>.
        {queued && suggestedTask
          ? ` Vettr queued: ${suggestedTask}`
          : suggestedTask
            ? ` Suggested: ${suggestedTask}`
            : ''}
      </p>
      <div className="crm-suggested-task__actions">
        {suggestedTask && !queued ? (
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
