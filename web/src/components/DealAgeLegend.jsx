const BANDS = [
  { cls: 'fresh', label: '0–2w' },
  { cls: 'recent', label: '2–4w' },
  { cls: 'aging', label: '4–8w' },
  { cls: 'older', label: '8w+' }
];

export default function DealAgeLegend({ title = 'Listing age by date added' }) {
  return (
    <div className="deal-age-legend" title={title}>
      <div className="deal-age-legend__heading">Deal Aging</div>
      <div className="deal-age-legend__row">
        {BANDS.map((b) => (
          <span key={b.cls} className="deal-age-legend__item">
            <span className={`deal-age-legend__dot deal-age-legend__dot--${b.cls}`} />
            <span className="deal-age-legend__label">{b.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
