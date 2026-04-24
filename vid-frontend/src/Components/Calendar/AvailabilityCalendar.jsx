import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Save, Loader2, ChevronLeft, ChevronRight, Trash2, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../api/axiosInstance';

const HOUR_START = 9;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function emptyGrid() {
  return Array.from({ length: 7 }, () => Array.from({ length: HOURS.length }, () => false));
}

function padDate(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(d) {
  return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
}

function addDays(date, n) {
  const x = new Date(date);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(base) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const mon = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mon);
  return d;
}

function getTimeZones() {
  try {
    if (typeof Intl !== 'undefined' && typeof (Intl).supportedValuesOf === 'function') {
      return (Intl).supportedValuesOf('timeZone');
    }
  } catch { /* fall through */ }
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
}

function cloneDeep(g) {
  return g.map((row) => [...row]);
}

function normalizeServerPayload(data) {
  if (!data || typeof data !== 'object') return null;
  const d = data.data ?? data;
  return d;
}

export default function AvailabilityCalendar() {
  const [viewMode, setViewMode] = useState('pattern');
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [recurring, setRecurring] = useState(() => emptyGrid());
  const [overrides, setOverrides] = useState({});
  const [timeZone, setTimeZone] = useState('UTC');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remoteRuleIds, setRemoteRuleIds] = useState([]);

  const timeZones = useMemo(() => getTimeZones().sort(), []);

  const weekDates = useMemo(() => {
    return DAY_NAMES.map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getEffectiveCell = useCallback(
    (dayIndex, hourIdx) => {
      if (viewMode === 'pattern') {
        return recurring[dayIndex][hourIdx];
      }
      const key = toDateKey(weekDates[dayIndex]);
      const o = overrides[key];
      if (o) return o[hourIdx];
      return recurring[dayIndex][hourIdx];
    },
    [viewMode, recurring, overrides, weekDates]
  );

  const toggleCell = (dayIndex, hourIdx) => {
    if (viewMode === 'pattern') {
      setRecurring((prev) => {
        const next = cloneDeep(prev);
        next[dayIndex][hourIdx] = !next[dayIndex][hourIdx];
        return next;
      });
      return;
    }
    const key = toDateKey(weekDates[dayIndex]);
    setOverrides((prev) => {
      const next = { ...prev };
      if (!next[key]) {
        next[key] = [...recurring[dayIndex]];
      } else {
        next[key] = [...next[key]];
      }
      next[key][hourIdx] = !next[key][hourIdx];
      return next;
    });
  };

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/calendar/me');
      const raw = normalizeServerPayload(res.data);
      if (raw) {
        if (raw.timeZone || raw.timezone) {
          setTimeZone(raw.timeZone || raw.timezone);
        }
        if (Array.isArray(raw.recurring) && raw.recurring.length === 7) {
          setRecurring(
            raw.recurring.map((row) => {
              if (Array.isArray(row) && row.length === HOURS.length) {
                return row.map(Boolean);
              }
              return emptyGrid()[0];
            })
          );
        } else if (raw.slots && Array.isArray(raw.slots)) {
          const g = emptyGrid();
          for (const s of raw.slots) {
            const dow = Number(s.dayOfWeek ?? s.dow);
            const h = Number(s.hour ?? s.startHour);
            if (dow >= 0 && dow < 7 && h >= HOUR_START && h <= HOUR_END) {
              g[dow][h - HOUR_START] = s.isAvailable !== false;
            }
          }
          setRecurring(g);
        }
        if (raw.overrides && typeof raw.overrides === 'object') {
          const ov = {};
          for (const [k, v] of Object.entries(raw.overrides)) {
            if (Array.isArray(v) && v.length === HOURS.length) ov[k] = v.map(Boolean);
          }
          setOverrides(ov);
        }
        const rules = raw.rules || raw.entries;
        if (Array.isArray(rules)) {
          setRemoteRuleIds(rules.map((r) => r.id).filter(Boolean));
        }
      }
    } catch {
      toast.error('Could not load calendar (using local defaults).');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const buildSavePayload = () => ({
    timeZone,
    recurring,
    overrides,
    hours: { start: HOUR_START, end: HOUR_END },
  });

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.post('/calendar', buildSavePayload());
      toast.success('Availability saved');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id) => {
    if (!id) return;
    try {
      await axiosInstance.delete(`/calendar/${id}`);
      setRemoteRuleIds((prev) => prev.filter((x) => x !== id));
      toast.success('Rule removed');
      await loadCalendar();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-8 h-8 text-violet-600" />
              Availability
            </h1>
            <p className="text-slate-500 mt-1">
              Weekly pattern + optional per-date overrides. Green = you&apos;re available.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('pattern')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'pattern' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Weekly pattern
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'week' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                This week + overrides
              </button>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-violet-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </motion.div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            {viewMode === 'week' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWeekStart((ws) => addDays(ws, -7))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-700 min-w-[10rem] text-center">
                  {toDateKey(weekDates[0])} – {toDateKey(weekDates[6])}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekStart((ws) => addDays(ws, 7))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600 flex-1 max-w-sm">
              <Globe className="w-4 h-4 text-slate-400" />
              <span className="shrink-0">Timezone</span>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-slate-900 text-sm"
              >
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <div className="min-w-full sm:min-w-[640px]">
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `4rem repeat(7, minmax(0, 1fr))` }}>
                <div />
                {weekDates.map((d, i) => (
                  <div key={i} className="text-center pb-1">
                    <div className="text-xs font-semibold text-slate-500">{DAY_NAMES[i]}</div>
                    <div className="text-sm font-medium text-slate-800">
                      {viewMode === 'week' ? toDateKey(d).slice(5) : DAY_NAMES[i]}
                    </div>
                  </div>
                ))}
                {HOURS.map((h, hourIdx) => (
                  <div key={h} className="contents">
                    <div className="flex items-start justify-end pr-2 text-xs text-slate-400 pt-0.5">
                      {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
                    </div>
                    {DAY_NAMES.map((_, dayIndex) => {
                      const on = getEffectiveCell(dayIndex, hourIdx);
                      return (
                        <button
                          key={`${dayIndex}-${h}`}
                          type="button"
                          onClick={() => toggleCell(dayIndex, hourIdx)}
                          className={`h-7 w-full min-h-[1.75rem] rounded transition-colors ${
                            on
                              ? 'bg-emerald-500 hover:bg-emerald-400 shadow-sm'
                              : 'bg-slate-200 hover:bg-slate-300'
                          }`}
                          title={on ? 'Available (click to mark unavailable)' : 'Unavailable (click to mark available)'}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            In <strong>Weekly pattern</strong>, changes apply to that weekday every week. In{' '}
            <strong>This week + overrides</strong>, you adjust only the selected calendar days (per-date override).
          </p>
        </div>

        {remoteRuleIds.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Server rules (optional cleanup)</h2>
            <ul className="space-y-1">
              {remoteRuleIds.map((id) => (
                <li key={id} className="flex items-center justify-between text-sm text-slate-600 py-1">
                  <span>Rule {String(id).slice(0, 8)}…</span>
                  <button
                    type="button"
                    onClick={() => deleteRule(id)}
                    className="text-rose-600 inline-flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
