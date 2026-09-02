const STORAGE_KEY = 'vettr.dashboard.location.v1';

const VALID_TABS = new Set(['aggregator', 'crm']);
const VALID_CRM_VIEWS = new Set([
  'home',
  'cards',
  'list',
  'tasks',
  'contacts',
  'calendar',
  'analytics'
]);

export function isValidCrmSubview(view) {
  return VALID_CRM_VIEWS.has(view);
}

export function readStoredDashboardLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const tab = VALID_TABS.has(parsed?.tab) ? parsed.tab : null;
    const crmSubview = isValidCrmSubview(parsed?.crmSubview) ? parsed.crmSubview : null;
    return tab ? { tab, crmSubview } : null;
  } catch (err) {
    console.warn('[dashboardLocation] read failed', err.message);
    return null;
  }
}

export function persistDashboardLocation({ tab, crmSubview = null }) {
  if (!VALID_TABS.has(tab)) return;
  const next = {
    tab,
    crmSubview: tab === 'crm' && isValidCrmSubview(crmSubview) ? crmSubview : null
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('[dashboardLocation] save failed', err.message);
  }
}

/** Merge tab + CRM subview into the current query, keeping deep-link params. */
export function patchDashboardSearchParams(searchParams, { tab, crmSubview = null }) {
  const next = new URLSearchParams(searchParams);
  if (VALID_TABS.has(tab)) next.set('tab', tab);
  if (tab === 'crm' && isValidCrmSubview(crmSubview)) {
    next.set('crmSubview', crmSubview);
  } else {
    next.delete('crmSubview');
  }
  if (tab === 'aggregator') {
    next.delete('crmDeal');
    next.delete('section');
  }
  return next;
}
