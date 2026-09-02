const STORAGE_KEY = 'vettr.crm.deedCards.v1';

export const DEED_COLORS = [
  { id: 'brown', hex: '#955436', ink: '#fff', label: 'Brown' },
  { id: 'light-blue', hex: '#aae0fa', ink: '#111', label: 'Light blue' },
  { id: 'pink', hex: '#d93a96', ink: '#fff', label: 'Pink' },
  { id: 'orange', hex: '#f7941d', ink: '#111', label: 'Orange' },
  { id: 'red', hex: '#ed1b24', ink: '#fff', label: 'Red' },
  { id: 'yellow', hex: '#fef200', ink: '#111', label: 'Yellow' },
  { id: 'green', hex: '#1fb25a', ink: '#fff', label: 'Green' },
  { id: 'dark-blue', hex: '#0072bb', ink: '#fff', label: 'Dark blue' }
];

export const WAITING_DEFAULTS = [
  { id: 'seller', label: 'Seller' },
  { id: 'broker', label: 'Broker' },
  { id: 'lender', label: 'Lender' },
  { id: 'attorney', label: 'Attorney' },
  { id: 'cpa', label: 'Accountant' },
  { id: 'cim', label: 'CIM' },
  { id: 'financials', label: 'Financials' },
  { id: 'nda', label: 'NDA' }
];

const EMPTY = { order: [], pins: {}, colors: {}, waitingOn: {} };

function dealKey(id) {
  return String(id);
}

export function defaultDeedColorId(dealId) {
  const n = Math.abs(Number(dealId) || 0);
  return DEED_COLORS[n % DEED_COLORS.length].id;
}

export function deedColorById(colorId, dealId) {
  const found = DEED_COLORS.find((c) => c.id === colorId);
  if (found) return found;
  const fallbackId = defaultDeedColorId(dealId);
  return DEED_COLORS.find((c) => c.id === fallbackId) || DEED_COLORS[7];
}

export function loadDeedCardPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, pins: {}, colors: {}, waitingOn: {} };
    const parsed = JSON.parse(raw);
    return {
      order: Array.isArray(parsed.order) ? parsed.order.map(String) : [],
      pins: parsed.pins && typeof parsed.pins === 'object' ? parsed.pins : {},
      colors: parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {},
      waitingOn: parsed.waitingOn && typeof parsed.waitingOn === 'object' ? parsed.waitingOn : {}
    };
  } catch (err) {
    console.warn('[deedCardPrefs] load failed', err.message);
    return { ...EMPTY, pins: {}, colors: {}, waitingOn: {} };
  }
}

export function saveDeedCardPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    console.log('[deedCardPrefs] saved', {
      order: prefs.order?.length || 0,
      pins: Object.keys(prefs.pins || {}).length,
      colors: Object.keys(prefs.colors || {}).length
    });
  } catch (err) {
    console.warn('[deedCardPrefs] save failed', err.message);
  }
}

export function emptyWaitingOn() {
  return { active: [], custom: [] };
}

export function getWaitingOn(prefs, dealId) {
  const row = prefs.waitingOn?.[dealKey(dealId)];
  if (!row) return emptyWaitingOn();
  return {
    active: Array.isArray(row.active) ? row.active.map(String) : [],
    custom: Array.isArray(row.custom)
      ? row.custom.filter((c) => c && c.label).map((c) => ({ id: String(c.id), label: String(c.label) }))
      : []
  };
}

export function waitingOnLabels(waiting) {
  const defaults = WAITING_DEFAULTS.filter((d) => waiting.active.includes(d.id)).map((d) => d.label);
  const custom = (waiting.custom || []).map((c) => c.label);
  return [...defaults, ...custom];
}

export function sortDealsForDeedBoard(deals, prefs) {
  const orderIndex = new Map((prefs.order || []).map((id, i) => [String(id), i]));
  const pinned = [];
  const rest = [];
  for (const deal of deals) {
    if (prefs.pins?.[dealKey(deal.id)]) pinned.push(deal);
    else rest.push(deal);
  }
  const byOrder = (a, b) => {
    const ia = orderIndex.has(dealKey(a.id)) ? orderIndex.get(dealKey(a.id)) : Number.MAX_SAFE_INTEGER;
    const ib = orderIndex.has(dealKey(b.id)) ? orderIndex.get(dealKey(b.id)) : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return String(a.name || '').localeCompare(String(b.name || ''));
  };
  pinned.sort(byOrder);
  rest.sort(byOrder);
  return [...pinned, ...rest];
}

export function partitionDeedDeals(deals, prefs) {
  const ordered = sortDealsForDeedBoard(deals, prefs);
  const pinned = [];
  const rest = [];
  for (const deal of ordered) {
    if (prefs.pins?.[dealKey(deal.id)]) pinned.push(deal);
    else rest.push(deal);
  }
  return { pinned, rest };
}

export function reorderDealIds(orderedIds, fromId, toId) {
  const list = orderedIds.map(String);
  const from = String(fromId);
  const to = String(toId);
  const fromIdx = list.indexOf(from);
  const toIdx = list.indexOf(to);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return list;
  const next = [...list];
  next.splice(fromIdx, 1);
  const insertAt = next.indexOf(to);
  next.splice(insertAt, 0, from);
  return next;
}
