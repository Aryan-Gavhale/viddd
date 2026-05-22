import { useEffect, useState } from "react";
import { Bell, Mail, Clock, Loader2, Save } from "lucide-react";
import { toast } from "react-toastify";
import { fetchNotificationPrefs, updateNotificationPrefs } from "../../services/settingsApi";

const TOGGLES = [
  {
    key: "notifyJobInvitations",
    title: "Job invitations",
    desc: "Receive emails when clients invite you to projects",
  },
  {
    key: "notifyMessages",
    title: "Direct messages",
    desc: "Email me when I get new messages",
  },
  {
    key: "notifyPaymentUpdates",
    title: "Payment updates",
    desc: "Invoices, payouts, escrow releases",
  },
  {
    key: "notifyPlatformNews",
    title: "Platform news",
    desc: "Product updates and important announcements",
  },
  {
    key: "notifyMarketing",
    title: "Marketing emails",
    desc: "Tips, surveys, and offers from Vidlancing",
  },
];

const FREQUENCIES = [
  { value: "instant", label: "Instant" },
  { value: "daily", label: "Daily digest" },
  { value: "weekly", label: "Weekly digest" },
];

export function NotificationSettings() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchNotificationPrefs();
        if (active) setPrefs(data || {});
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load notification preferences");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onToggle = (key) => (e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }));
  const onFrequency = (e) => setPrefs((p) => ({ ...p, emailFrequency: e.target.value }));

  const onSave = async () => {
    setSaving(true);
    try {
      const fresh = await updateNotificationPrefs(prefs);
      setPrefs(fresh || prefs);
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Notification Preferences</h2>
          <p className="text-violet-600 dark:text-violet-400 text-sm">Control how and when you receive notifications</p>
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

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Mail className="h-4 w-4 text-violet-500" /> Email
          </h3>
          {TOGGLES.map((t) => (
            <Toggle
              key={t.key}
              title={t.title}
              desc={t.desc}
              checked={Boolean(prefs[t.key])}
              onChange={onToggle(t.key)}
            />
          ))}

          <div className="rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="h-4 w-4 mr-2 text-violet-500" />
              Email delivery frequency
            </label>
            <select
              value={prefs.emailFrequency || "instant"}
              onChange={onFrequency}
              className="w-full md:w-64 rounded-md border border-violet-200 px-3 py-2 text-sm"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-500" /> Channels
          </h3>
          <Toggle
            title="In-app notifications"
            desc="Show notifications inside the dashboard"
            checked={prefs.inAppEnabled !== false}
            onChange={onToggle("inAppEnabled")}
          />
          <Toggle
            title="Push notifications"
            desc="Browser push notifications when you're online"
            checked={prefs.pushEnabled !== false}
            onChange={onToggle("pushEnabled")}
          />
        </div>
      </div>
    </div>
  );
}

function Toggle({ title, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
      <div>
        <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" checked={!!checked} onChange={onChange} className="peer sr-only" />
        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
      </label>
    </div>
  );
}
