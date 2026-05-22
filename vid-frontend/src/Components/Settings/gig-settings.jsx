import { useEffect, useState } from "react";
import { Briefcase, Loader2, Save, Pause, Play, Clock } from "lucide-react";
import { toast } from "react-toastify";
import axios from "../../utils/axios";
import { fetchMe, updateProfile } from "../../services/settingsApi";

const AVAILABILITY = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "UNAVAILABLE", label: "Unavailable" },
];

export function GigSettings() {
  const [me, setMe] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      const [m, g] = await Promise.all([
        fetchMe().catch(() => null),
        axios.get("/gigs/freelancer").then((r) => r?.data?.data ?? r?.data).catch(() => null),
      ]);
      setMe(m);
      setGigs(Array.isArray(g) ? g : g?.gigs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        availabilityStatus: me?.freelancerProfile?.availabilityStatus,
        responseTimeHours: me?.responseTimeHours ?? null,
      });
      toast.success("Gig preferences saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (gigId) => {
    try {
      await axios.patch(`/gigs/${gigId}/pause`);
      toast.success("Updated");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
        <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Gig Preferences</h2>
            <p className="text-violet-600 dark:text-violet-400 text-sm">Availability and response defaults</p>
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-white text-sm hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-gray-700 dark:text-gray-300">Availability</label>
            <select
              value={me?.freelancerProfile?.availabilityStatus || "UNAVAILABLE"}
              onChange={(e) =>
                setMe((s) => ({
                  ...s,
                  freelancerProfile: { ...(s?.freelancerProfile || {}), availabilityStatus: e.target.value },
                }))
              }
              className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
            >
              {AVAILABILITY.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4 mr-1 text-violet-500" />
              Response time (hours)
            </label>
            <input
              type="number"
              min={0}
              max={720}
              value={me?.responseTimeHours ?? ""}
              onChange={(e) =>
                setMe((s) => ({ ...s, responseTimeHours: e.target.value ? Number(e.target.value) : null }))
              }
              className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
        <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
          <h2 className="text-lg font-bold text-violet-900 dark:text-violet-100 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-violet-500" /> Your gigs
          </h2>
        </div>
        <div className="p-6">
          {!gigs?.length ? (
            <p className="text-sm text-gray-500">No gigs yet. Create one from your dashboard.</p>
          ) : (
            <ul className="divide-y divide-violet-100">
              {gigs.map((g) => (
                <li key={g.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{g.title || `Gig #${g.id}`}</div>
                    <div className="text-xs text-gray-500">
                      Status: {g.status || (g.isPaused ? "PAUSED" : "ACTIVE")}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePause(g.id)}
                    className="inline-flex items-center gap-1 text-sm text-violet-700 hover:underline"
                  >
                    {g.isPaused ? (
                      <>
                        <Play className="h-4 w-4" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4" /> Pause
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
