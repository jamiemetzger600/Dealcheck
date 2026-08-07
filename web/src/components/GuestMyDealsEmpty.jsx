export default function GuestMyDealsEmpty({ onRequireSignup, onBackToAggregator }) {
  return (
    <div className="guest-my-deals-empty">
      <h2>Vettr CRM is for members</h2>
      <p>
        Sign up to save listings from the aggregator, run the deal calculator, and manage your
        pipeline in one place.
      </p>
      <div className="guest-my-deals-empty__actions">
        <button type="button" className="btn-primary" onClick={() => onRequireSignup?.('save')}>
          Sign up free
        </button>
        <button type="button" className="btn-secondary" onClick={() => onBackToAggregator?.()}>
          Back to Deal Aggregator
        </button>
      </div>
    </div>
  );
}
