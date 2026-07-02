import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmAPI } from '../../utils/api';
import {
  addDays,
  eventOnDay,
  formatDayLabel,
  formatTime,
  HOURS,
  monthMatrix,
  rangeForView,
  sameDay,
  startOfWeek,
  toDatetimeLocalValue
} from '../../utils/calendarUtils';

const VIEWS = ['month', 'week', 'day'];

function EventChip({ event, onClick }) {
  const sourceClass = event.source === 'google' ? 'crm-cal-event--google' : 'crm-cal-event--vettr';
  return (
    <button
      type="button"
      className={`crm-cal-event ${sourceClass}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
    >
      <span className="crm-cal-event__title">{event.title}</span>
      {!event.allDay ? <span className="crm-cal-event__time">{formatTime(event.startsAt)}</span> : null}
    </button>
  );
}

export default function CrmCalendarView({ onDisconnect, disconnecting }) {
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAPI.getCalendarEvents(range.start.toISOString(), range.end.toISOString());
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const data = await crmAPI.syncCalendar(range.start.toISOString(), range.end.toISOString());
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const shiftAnchor = (delta) => {
    if (view === 'month') setAnchor((d) => addDays(startOfDay(d), delta * 30));
    else if (view === 'week') setAnchor((d) => addDays(d, delta * 7));
    else setAnchor((d) => addDays(d, delta));
  };

  const openCreate = (day, hour = 9) => {
    const start = new Date(day);
    if (view !== 'month') start.setHours(hour, 0, 0, 0);
    else start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setModal({
      mode: 'create',
      title: '',
      description: '',
      startsAt: toDatetimeLocalValue(start),
      endsAt: toDatetimeLocalValue(end),
      allDay: view === 'month'
    });
  };

  const openEdit = (event) => {
    setModal({
      mode: 'edit',
      id: event.id,
      title: event.title,
      description: event.description || '',
      startsAt: toDatetimeLocalValue(event.startsAt),
      endsAt: toDatetimeLocalValue(event.endsAt),
      allDay: event.allDay,
      source: event.source
    });
  };

  const handleSave = async () => {
    if (!modal?.title?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: modal.title.trim(),
        description: modal.description,
        startsAt: new Date(modal.startsAt).toISOString(),
        endsAt: new Date(modal.endsAt).toISOString(),
        allDay: modal.allDay
      };
      if (modal.mode === 'create') {
        await crmAPI.createCalendarEvent(payload);
      } else {
        await crmAPI.updateCalendarEvent(modal.id, payload);
      }
      setModal(null);
      await loadEvents();
    } catch (err) {
      setError(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modal?.id || !window.confirm('Delete this event?')) return;
    setSaving(true);
    try {
      await crmAPI.deleteCalendarEvent(modal.id);
      setModal(null);
      await loadEvents();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setSaving(false);
    }
  };

  const titleLabel = useMemo(() => {
    if (view === 'day') return formatDayLabel(anchor);
    if (view === 'week') {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      return `${formatDayLabel(start)} – ${formatDayLabel(end)}`;
    }
    return anchor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }, [view, anchor]);

  const monthWeeks = useMemo(() => (view === 'month' ? monthMatrix(anchor) : []), [view, anchor]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  return (
    <div className="crm-calendar-view">
      <header className="crm-calendar-view__toolbar">
        <div className="crm-calendar-view__nav">
          <button type="button" className="btn-secondary" onClick={() => shiftAnchor(-1)}>←</button>
          <button type="button" className="btn-secondary" onClick={() => setAnchor(new Date())}>Today</button>
          <button type="button" className="btn-secondary" onClick={() => shiftAnchor(1)}>→</button>
          <h3 className="crm-calendar-view__title">{titleLabel}</h3>
        </div>
        <div className="crm-calendar-view__actions">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={`crm-chip${view === v ? ' crm-chip--active' : ''}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <button type="button" className="btn-secondary" disabled={syncing} onClick={handleSync}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => openCreate(anchor)}>
            + Event
          </button>
          <button type="button" className="btn-secondary" disabled={disconnecting} onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </header>

      <p className="crm-muted crm-calendar-view__legend">
        <span className="crm-cal-legend crm-cal-event--vettr">Vettr</span>
        <span className="crm-cal-legend crm-cal-event--google">Google</span>
        Events sync both ways — create in Vettr or Google, then click Sync now.
      </p>

      {error ? <p className="crm-panel--error">{error}</p> : null}
      {loading ? <p className="crm-panel">Loading events…</p> : null}

      {!loading && view === 'month' ? (
        <div className="crm-cal-month">
          <div className="crm-cal-month__head">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="crm-cal-month__dow">{d}</div>
            ))}
          </div>
          {monthWeeks.map((week, wi) => (
            <div key={wi} className="crm-cal-month__row">
              {week.map((day) => {
                const dayEvents = events.filter((e) => eventOnDay(e, day));
                const muted = day.getMonth() !== anchor.getMonth();
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`crm-cal-month__cell${muted ? ' crm-cal-month__cell--muted' : ''}${sameDay(day, new Date()) ? ' crm-cal-month__cell--today' : ''}`}
                    onClick={() => openCreate(day)}
                  >
                    <span className="crm-cal-month__date">{day.getDate()}</span>
                    <div className="crm-cal-month__events">
                      {dayEvents.slice(0, 3).map((e) => (
                        <EventChip key={e.id} event={e} onClick={openEdit} />
                      ))}
                      {dayEvents.length > 3 ? <span className="crm-muted">+{dayEvents.length - 3} more</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}

      {!loading && view === 'week' ? (
        <div className="crm-cal-week">
          <div className="crm-cal-week__head">
            <div className="crm-cal-week__gutter" />
            {weekDays.map((day) => (
              <div key={day.toISOString()} className={`crm-cal-week__dayhead${sameDay(day, new Date()) ? ' crm-cal-week__dayhead--today' : ''}`}>
                {formatDayLabel(day)}
              </div>
            ))}
          </div>
          <div className="crm-cal-week__body">
            <div className="crm-cal-week__hours">
              {HOURS.map((h) => (
                <div key={h} className="crm-cal-week__hour">{h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}</div>
              ))}
            </div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="crm-cal-week__col">
                {HOURS.map((h) => {
                  const slotEvents = events.filter((e) => {
                    if (!eventOnDay(e, day) || e.allDay) return false;
                    const start = new Date(e.startsAt);
                    return start.getHours() === h;
                  });
                  return (
                    <button
                      key={h}
                      type="button"
                      className="crm-cal-week__slot"
                      onClick={() => openCreate(day, h)}
                    >
                      {slotEvents.map((e) => (
                        <EventChip key={e.id} event={e} onClick={() => openEdit(e)} />
                      ))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && view === 'day' ? (
        <div className="crm-cal-day">
          {HOURS.map((h) => {
            const slotEvents = events.filter((e) => {
              if (!eventOnDay(e, anchor) || e.allDay) return false;
              return new Date(e.startsAt).getHours() === h;
            });
            return (
              <button
                key={h}
                type="button"
                className="crm-cal-day__row"
                onClick={() => openCreate(anchor, h)}
              >
                <span className="crm-cal-day__hour">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</span>
                <div className="crm-cal-day__slot">
                  {slotEvents.map((e) => (
                    <EventChip key={e.id} event={e} onClick={() => openEdit(e)} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {modal ? (
        <div className="crm-cal-modal-backdrop" onClick={() => !saving && setModal(null)}>
          <div className="crm-cal-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.mode === 'create' ? 'New event' : 'Edit event'}</h3>
            {modal.source === 'google' ? (
              <p className="crm-muted">From Google Calendar — edits sync back to Google.</p>
            ) : null}
            <label className="crm-cal-field">
              Title
              <input className="modal-input" value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })} />
            </label>
            <label className="crm-cal-field">
              Description
              <textarea className="modal-input" rows={2} value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
            </label>
            <label className="crm-cal-field">
              <input type="checkbox" checked={modal.allDay} onChange={(e) => setModal({ ...modal, allDay: e.target.checked })} />
              {' '}All day
            </label>
            <label className="crm-cal-field">
              Starts
              <input type="datetime-local" className="modal-input" value={modal.startsAt} onChange={(e) => setModal({ ...modal, startsAt: e.target.value })} />
            </label>
            <label className="crm-cal-field">
              Ends
              <input type="datetime-local" className="modal-input" value={modal.endsAt} onChange={(e) => setModal({ ...modal, endsAt: e.target.value })} />
            </label>
            <div className="crm-cal-modal__actions">
              <button type="button" className="btn-primary" disabled={saving || !modal.title.trim()} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {modal.mode === 'edit' ? (
                <button type="button" className="btn-secondary" disabled={saving} onClick={handleDelete}>Delete</button>
              ) : null}
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
