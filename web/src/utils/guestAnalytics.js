const QUEUE_KEY = 'vettr_guest_analytics_queue';
const IS_DEV = Boolean(import.meta.env.DEV);
function readQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } }
function writeQueue(events) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-200))); } catch {} }
export function logGuestEvent(name, props = {}) {
  const event = { name, props, ts: new Date().toISOString() };
  if (IS_DEV) console.log('[guestAnalytics]', event);
  const q = readQueue(); q.push(event); writeQueue(q);
}
