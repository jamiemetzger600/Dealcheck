/**
 * Deep links for desktop/PWA notification clicks.
 * Keep in sync with web/src/utils/notificationLinks.js
 */

export function notificationPath({ alertType, savedDealId } = {}) {
  const type = String(alertType || '');
  if (type === 'deal_match') return '/dashboard?tab=aggregator';
  if (type === 'team_activity') return '/dashboard?tab=crm&crmSubview=cards';
  if (type === 'task_completed' || type === 'task_assigned') {
    const q = new URLSearchParams({ tab: 'crm', crmSubview: 'tasks' });
    if (savedDealId) q.set('crmDeal', String(savedDealId));
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
  if (type === 'task_completed' || type === 'task_assigned') return 'Open Tasks';
  if (type === 'deal_match') return 'Open Feed';
  if (type === 'team_activity') return 'Open CRM';
  if (type === 'test' || type === 'settings') return 'Open Settings';
  return 'Open Talk';
}
