export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

export function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  d.setMilliseconds(-1);
  return d;
}

export function startOfMonth(date) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function endOfMonth(date) {
  const d = startOfMonth(date);
  d.setMonth(d.getMonth() + 1);
  d.setMilliseconds(-1);
  return d;
}

export function monthMatrix(anchorDate) {
  const start = startOfWeek(startOfMonth(anchorDate));
  const weeks = [];
  let cursor = new Date(start);
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDayLabel(date) {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function toDatetimeLocalValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function rangeForView(view, anchorDate) {
  if (view === 'day') {
    return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
  }
  if (view === 'week') {
    return { start: startOfWeek(anchorDate), end: endOfWeek(anchorDate) };
  }
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  return { start: startOfWeek(monthStart), end: endOfWeek(monthEnd) };
}

export function eventOnDay(event, day) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return start <= dayEnd && end >= dayStart;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);
