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

export function suggestedTaskForStage(stage) {
  const key = (stage || '').trim();
  return STAGE_TASK_SUGGESTIONS[key] || null;
}
