/** One-tap task suggestions when a deal enters a pipeline stage. */
export const STAGE_TASK_SUGGESTIONS = {
  'Requested NDA': 'Follow up on NDA request',
  'Signed NDA': 'Review CIM when received',
  'Review CIM': 'Schedule review call after reading CIM',
  'Send IOI': 'Send IOI to broker',
  'Review Financials': 'Request and review financial package',
  'Preliminary Valuation': 'Complete preliminary valuation model',
  'Review Tax Returns': 'Request 3 years tax returns',
  'Seller Call': 'Schedule seller call',
  'Bank Pre-Approval': 'Confirm SBA / lender pre-approval',
  'LOI Sent': 'Follow up on LOI response',
  'LOI Signed': 'Kick off due diligence planning',
  'Starting Due Diligence': 'Start DD checklist from template'
};

/** Light industry-specific overrides (fallback to STAGE_TASK_SUGGESTIONS). */
const INDUSTRY_STAGE_OVERRIDES = {
  restaurant: {
    'Review Financials': 'Request P&L with food-cost % and daypart sales',
    'Starting Due Diligence': 'Start Restaurant / Food Service DD checklist',
    'Seller Call': 'Schedule seller call — cover lease, liquor license, and key staff'
  },
  healthcare: {
    'Review Financials': 'Request payer-mix report and collections aging',
    'Starting Due Diligence': 'Start Healthcare / Dental DD checklist',
    'LOI Signed': 'Plan credentialing / HIPAA / patient-records transfer'
  },
  saas: {
    'Review Financials': 'Request ARR/MRR bridge and churn / NRR report',
    'Starting Due Diligence': 'Start SaaS / Software DD checklist',
    'Preliminary Valuation': 'Build SaaS valuation using ARR and NRR'
  },
  services: {
    'Review Financials': 'Request recurring backlog and WIP schedule',
    'Starting Due Diligence': 'Start Professional / Field Services DD checklist',
    'Seller Call': 'Schedule seller call — crew capacity and bonding'
  },
  environmental: {
    'Review Financials': 'Request project backlog and lab / field utilization',
    'Starting Due Diligence': 'Start Environmental / Industrial Services DD checklist',
    'Review Tax Returns': 'Request licenses, accreditations, and pollution insurance summary'
  },
  retail: {
    'Review Financials': 'Request inventory aging and channel mix (store / online)',
    'Starting Due Diligence': 'Start Retail / eCommerce DD checklist'
  },
  manufacturing: {
    'Review Financials': 'Request COGS BOM and capacity utilization',
    'Starting Due Diligence': 'Start Manufacturing DD checklist'
  },
  construction: {
    'Review Financials': 'Request WIP schedule and bonding capacity',
    'Starting Due Diligence': 'Start Construction / Trades DD checklist'
  },
  auto: {
    'Review Financials': 'Request parts inventory turns and bay utilization',
    'Starting Due Diligence': 'Start Automotive DD checklist'
  },
  franchise: {
    'Review CIM': 'Review FDD and royalty / ad-fund economics',
    'Starting Due Diligence': 'Start Franchise DD checklist',
    'LOI Sent': 'Confirm franchisor transfer / approval timeline'
  }
};

export function suggestedTaskForStage(stage, industryKey = 'generic') {
  const key = (stage || '').trim();
  if (!key) return null;
  const industry = String(industryKey || 'generic').toLowerCase();
  return INDUSTRY_STAGE_OVERRIDES[industry]?.[key] || STAGE_TASK_SUGGESTIONS[key] || null;
}
