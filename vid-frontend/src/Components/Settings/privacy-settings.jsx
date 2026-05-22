import { useEffect, useState } from "react";
import { Shield, Loader2, Save, Download, Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchPreferences,
  updatePreferences,
  requestDataExport,
  requestAccountDeletion,
  cancelAccountDeletion,
  fetchMe,
} from "../../services/settingsApi";

export function PrivacySettings() {
  const [privacy, setPrivacy] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyExport, setBusyExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const refresh = async () => {
    try {
      const [prefs, m] = await Promise.all([
        fetchPreferences().catch(() => null),
        fetchMe().catch(() => null),
      ]);
      if (prefs) setPrivacy(prefs.privacy || {});
      setMe(m);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const set = (k, v) => setPrivacy((s) => ({ ...s, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await updatePreferences({ privacy });
      setPrivacy(res?.privacy || privacy);
      toast.success("Privacy preferences saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onExport = async () => {
    setBusyExport(true);
    try {
      const data = await requestDataExport();
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        toast.success("Your data export link is ready (also emailed to you)");
      } else if (data?.inline) {
        const blob = new Blob([JSON.stringify(data.inline, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vidlancing-data-export.json";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data export downloaded");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to export data");
    } finally {
      setBusyExport(false);
    }
  };

  const onCancelDeletion = async () => {
    try {
      await cancelAccountDeletion();
      toast.success("Account deletion cancelled");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel");
    }
  };

  if (loading || !privacy) {
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
            <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Privacy Preferences</h2>
            <p className="text-violet-600 dark:text-violet-400 text-sm">Control how your account appears in search and to other users</p>
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

        <div className="p-6 space-y-3">
          <Toggle
            title="Visible in search"
            desc="Allow your profile to appear in marketplace search results"
            checked={privacy.profileVisibleInSearch !== false}
            onChange={(e) => set("profileVisibleInSearch", e.target.checked)}
          />
          <Toggle
            title="Show earnings on profile"
            desc="Display total earnings on your public profile"
            checked={!!privacy.showEarningsOnProfile}
            onChange={(e) => set("showEarningsOnProfile", e.target.checked)}
          />
          <Toggle
            title="Allow data sharing for product improvement"
            desc="Share anonymised usage data to help us improve features"
            checked={!!privacy.allowDataSharing}
            onChange={(e) => set("allowDataSharing", e.target.checked)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
        <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
          <h2 className="text-lg font-bold text-violet-900 dark:text-violet-100 flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-500" /> Your data
          </h2>
        </div>
        <div className="p-6 space-y-3">
          <button
            onClick={onExport}
            disabled={busyExport}
            className="inline-flex items-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
          >
            {busyExport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export my data (GDPR)
          </button>
          <p className="text-xs text-gray-500">
            We will email you a 24-hour download link with a JSON dump of your account, jobs, orders, messages and invoices.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900">
        <div className="border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-6 py-4">
          <h2 className="text-lg font-bold text-red-900 dark:text-red-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" /> Danger zone
          </h2>
        </div>
        <div className="p-6 space-y-3">
          {me?.deletionRequestedAt ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
              Your account is scheduled for deletion 30 days after{" "}
              <strong>{new Date(me.deletionRequestedAt).toLocaleDateString()}</strong>.
              <button onClick={onCancelDeletion} className="ml-2 text-red-700 hover:underline">
                Cancel deletion
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Delete account
            </button>
          )}
          <p className="text-xs text-gray-500">
            Deletion is permanent after 30 days. You can cancel any time before then by signing in.
          </p>
        </div>
      </div>

      {showDelete && <DeleteModal onClose={() => setShowDelete(false)} onDone={refresh} />}
    </div>
  );
}

function DeleteModal({ onClose, onDone }) {
  const [pwd, setPwd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await requestAccountDeletion({ currentPassword: pwd, reason });
      toast.success("Account deletion scheduled — you have 30 days to cancel.");
      onClose();
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to request deletion");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-red-700 mb-3">Delete account</h3>
        <p className="text-sm text-gray-600 mb-4">
          We'll mark your account for deletion. You have 30 days to change your mind by signing in and cancelling.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
            required
          />
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional: tell us why"
            rows={3}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="text-sm text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Schedule deletion"}
            </button>
          </div>
        </form>
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
