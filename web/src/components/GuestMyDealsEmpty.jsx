import { Link } from 'react-router-dom';

export default function GuestMyDealsEmpty({ onRequireSignup }) {
  return (
    <div className="guest-my-deals-empty">
      <h2>My Deals is for members</h2>
      <p>Sign up to save listings from the aggregator, run the deal calculator, and track progress in one place.</p>
      <div className="guest-my-deals-empty__actions">
        <button type="button" className="btn-primary" onClick={() => onRequireSignup?.('save')}>
          Sign up free
        </button>
        <Link to="/dashboard" className="btn-secondary">
          Back to Deal Aggregator
        </Link>
      </div>
    </div>
  );
}
