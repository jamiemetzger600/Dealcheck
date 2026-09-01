/**
 * Lightweight natural-language task quick-add parser.
 * Examples: "Call broker Friday", "Follow up Acme tomorrow P1", "NDA next week"
 */

const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

function atNine(d) {
  const x = new Date(d);
  x.setHours(9, 0, 0, 0);
  return x;
}

function nextWeekday(targetDow) {
  const d = new Date();
  const current = d.getDay();
  let add = (targetDow - current + 7) % 7;
  if (add === 0) add = 7;
  d.setDate(d.getDate() + add);
  return atNine(d);
}

/**
 * @returns {{ title: string, dueAt: string|null, priority: number|null, dealHint: string|null }}
 */
export function parseQuickAdd(raw) {
  let text = String(raw || '').trim();
  if (!text) {
    return { title: '', dueAt: null, priority: null, dealHint: null };
  }

  let priority = null;
  const pMatch = text.match(/\bP([1-4])\b/i);
  if (pMatch) {
    priority = Number(pMatch[1]);
    text = text.replace(pMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  let dueAt = null;
  const lower = text.toLowerCase();

  const replaceAndSet = (pattern, dateFn) => {
    const m = text.match(pattern);
    if (!m) return false;
    dueAt = dateFn(m).toISOString();
    text = text.replace(m[0], ' ').replace(/\s+/g, ' ').trim();
    return true;
  };

  if (!replaceAndSet(/\btomorrow\b/i, () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return atNine(d);
  })) {
    if (!replaceAndSet(/\btoday\b/i, () => atNine(new Date()))) {
      if (!replaceAndSet(/\bnext\s+week\b/i, () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return atNine(d);
      })) {
        if (!replaceAndSet(/\bin\s+(\d+)\s+days?\b/i, (m) => {
          const d = new Date();
          d.setDate(d.getDate() + Number(m[1]));
          return atNine(d);
        })) {
          for (const [name, dow] of Object.entries(WEEKDAYS)) {
            if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) {
              replaceAndSet(new RegExp(`\\b${name}\\b`, 'i'), () => nextWeekday(dow));
              break;
            }
          }
        }
      }
    }
  }

  // ISO-ish date YYYY-MM-DD
  if (!dueAt) {
    const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (iso) {
      dueAt = atNine(new Date(`${iso[1]}T12:00:00`)).toISOString();
      text = text.replace(iso[0], ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // Optional "on DealName" / "@DealName" hint — last token after " on "
  let dealHint = null;
  const onMatch = text.match(/\bon\s+(.+)$/i);
  if (onMatch && onMatch[1].trim().length >= 2) {
    dealHint = onMatch[1].trim();
    text = text.slice(0, onMatch.index).trim();
  } else {
    const atMatch = text.match(/@([^\s]+(?:\s+[^\s]+){0,4})$/);
    if (atMatch) {
      dealHint = atMatch[1].trim();
      text = text.slice(0, atMatch.index).trim();
    }
  }

  return {
    title: text || String(raw).trim(),
    dueAt,
    priority,
    dealHint
  };
}

/**
 * Match dealHint against deal names (case-insensitive includes).
 */
export function matchDealByHint(deals, hint) {
  if (!hint || !Array.isArray(deals)) return null;
  const h = hint.toLowerCase();
  const exact = deals.find((d) => (d.name || '').toLowerCase() === h);
  if (exact) return exact;
  const starts = deals.find((d) => (d.name || '').toLowerCase().startsWith(h));
  if (starts) return starts;
  return deals.find((d) => (d.name || '').toLowerCase().includes(h)) || null;
}
