import { analyzeDealScenario, SELLER_NOTE_TERM_YEARS } from './dealCalculatorMath';

const EMAIL_IN_TEXT = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function firstEmailInText(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';
  const mailto = s.match(/^mailto:([^?]+)/i);
  const haystack = mailto ? mailto[1] : s;
  const m = haystack.match(EMAIL_IN_TEXT);
  return m ? m[0] : '';
}

/** Prefer explicit broker fields; fall back to first email found in contact / description text. */
export function getBrokerEmailFromDeal(deal) {
  if (!deal) return '';

  const explicitFields = [
    deal.brokerEmail,
    deal.broker_email,
    deal.listingBrokerEmail,
    deal.listing_broker_email,
    deal.contactEmail,
    deal.contact_email
  ];
  for (const c of explicitFields) {
    const email = firstEmailInText(c);
    if (email) return email;
  }

  const textFields = [
    deal.brokerPhone,
    deal.broker_contact,
    deal.brokerContact,
    deal.contact,
    deal.broker,
    deal.brokerName,
    deal.broker_name,
    deal.brokerCompany,
    deal.broker_company,
    deal.description
  ];
  for (const field of textFields) {
    const email = firstEmailInText(field);
    if (email) return email;
  }

  return '';
}

function fmt(value) {
  if (value == null || Number.isNaN(value)) return '$0';
  return `$${Math.round(value).toLocaleString()}`;
}

function pct(value) {
  const n = parseFloat(value);
  if (!n || Number.isNaN(n)) return '0%';
  return `${n}%`;
}

export function generateIOISubject(deal) {
  return `Indication of Interest - ${deal.name || 'Business Acquisition'}`;
}

/**
 * Build a single scenario block for the IOI body.
 * `scenario` is the raw scenario object, `analysis` is the analyzeDealScenario result.
 */
function buildScenarioBlock(scenario, analysis, label) {
  const fin = analysis.fin;
  const lines = [];

  const cashAtClose = analysis.sbaLoanSize + analysis.equityAmount;

  lines.push(`--- ${label} ---`);
  lines.push(`Offer Price: ${fmt(analysis.purchasePrice)}`);
  lines.push(`Cash at Close: ${fmt(cashAtClose)} (SBA loan + buyer equity)`);
  lines.push(`  SBA Loan (${pct(fin.sbaPercent)}): ${fmt(analysis.sbaLoanSize)} at ${pct(fin.bankRate * 100)} over ${fin.bankYears} years`);
  lines.push(`  Buyer Equity (${pct(fin.equityPercent)}): ${fmt(analysis.equityAmount)}`);

  if (fin.sellerEnabled && analysis.sellerNoteAmt > 0) {
    const rateDisplay = (fin.sellerRate * 100).toFixed(1);
    const standbyNote = fin.sellerStandby === 'yes' ? ' (full standby)' : '';
    lines.push(`  Seller Note (${pct(fin.sellerPercent)}): ${fmt(analysis.sellerNoteAmt)} at ${rateDisplay}% - ${fin.sellerPaymentType}, ${SELLER_NOTE_TERM_YEARS} year term${standbyNote}`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate the full IOI email body text.
 * @param {object} opts
 * @param {object} opts.deal - deal object with name, brokerName, etc.
 * @param {Array}  opts.scenarios - array of raw scenario objects
 * @param {Array}  opts.selectedIndices - which scenario indices to include (0-based)
 * @param {object} opts.qualityPrefs - { targetCOC, targetPayback } for analysis
 * @param {string} opts.timeline - timeline to close text
 * @param {string} opts.closingNotes - user's custom closing paragraph
 * @param {string} opts.signature - user's signature
 * @param {string} opts.companyName - buyer company (optional)
 */
export function generateIOIText({
  deal,
  scenarios,
  selectedIndices,
  qualityPrefs = {},
  timeline = '30-45 days from accepted offer',
  closingNotes = '',
  signature = '',
  companyName = ''
}) {
  const brokerName = deal.brokerName || deal.broker || 'Broker';
  const dealName = deal.name || 'the business';

  const lines = [];
  lines.push(`Dear ${brokerName},`);
  lines.push('');

  if (selectedIndices.length === 1) {
    lines.push(`I am writing to express my interest in acquiring ${dealName}. After reviewing the listing and financials, I would like to present the following deal structure for your consideration:`);
  } else {
    lines.push(`I am writing to express my interest in acquiring ${dealName}. After reviewing the listing and financials, I would like to present the following deal structures for your consideration:`);
  }
  lines.push('');

  selectedIndices.forEach((idx, i) => {
    const scenario = scenarios[idx];
    if (!scenario) return;
    const analysis = analyzeDealScenario(scenario, qualityPrefs);
    const label = selectedIndices.length === 1
      ? 'Proposed Deal Structure'
      : `Structure ${i + 1}`;
    lines.push(buildScenarioBlock(scenario, analysis, label));
  });

  lines.push(`Timeline to Close: ${timeline}`);
  lines.push('');

  if (closingNotes.trim()) {
    lines.push(closingNotes.trim());
    lines.push('');
  }

  lines.push('Best regards,');
  if (signature.trim()) {
    lines.push(signature.trim());
  }
  if (companyName.trim()) {
    lines.push(companyName.trim());
  }

  return lines.join('\n');
}
