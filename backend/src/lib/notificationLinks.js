/**
 * Deep links for desktop/PWA notification clicks.
 * Keep in sync with web/src/utils/notificationLinks.js
 */

export function notificationPath({
  alertType,
  savedDealId,
  dealDbId,
  newToday
} = {}) {
  const type = String(alertType || '');
  if (type === 'deal_match') {
    const q = new URLSearchParams({ tab: 'aggregator' });
    if (dealDbId) q.set('dealDbId', String(dealDbId));
    if (newToday || !dealDbId) q.set('newToday', '1');
    return `/dashboard?${q.toString()}`;
  }
  if (type === 'team_activity') {
    const q = new URLSearchParams({ tab: 'crm', crmSubview: 'cards' });
    if (savedDealId) {
      q.set('crmDeal', String(savedDealId));
      q.set('section', 'overview');
    }
    return `/dashboard?${q.toString()}`;
  }
  if (
    type === 'task_completed'
    || type === 'task_assigned'
    || type === 'task_due'
  ) {
    const q = new URLSearchParams({ tab: 'crm', crmSubview: 'tasks' });
    if (savedDealId) {
      q.set('crmDeal', String(savedDealId));
      q.set('section', 'overview');
    }
    return `/dashboard?${q.toString()}`;
  }
  if (type === 'crm_followup' && savedDealId) {
    const q = new URLSearchParams({
      tab: 'crm',
      crmDeal: String(savedDealId),
      section: 'overview'
    });
    return `/dashboard?${q.toString()}`;
  }
  if (savedDealId) {
    const q = new URLSearchParams({
      tab: 'crm',
      crmDeal: String(savedDealId),
      section: 'crm-talk'
    });
    return `/dashboard?${q.toString()}`;
  }
  return '/dashboard?tab=crm';
}

export function notificationOpenLabel(alertType) {
  const type = String(alertType || '');
  if (type === 'task_completed' || type === 'task_assigned' || type === 'task_due') {
    return 'Open Tasks';
  }
  if (type === 'deal_match') return 'Open matches';
  if (type === 'team_activity' || type === 'crm_followup') return 'Open CRM';
  if (type === 'test' || type === 'settings') return 'Open Settings';
  return 'Open Talk';
}
