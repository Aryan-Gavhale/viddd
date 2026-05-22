import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Users, Bell, CreditCard, Shield, Palette, Loader2, Trash2, Plus, X } from "lucide-react";
import { toast } from "react-toastify";
import { ProfileSettings } from "../Settings/profile.settings";
import { NotificationSettings } from "../Settings/notification-settings";
import { PaymentSettings } from "../Settings/payment.settings";
import { AccountSettings } from "../Settings/account-settings";
import { AppearanceSettings } from "../Settings/appearance-settings";
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
} from "../../services/settingsApi";

export default function SettingsSection() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");

  const TABS = [
    { id: "profile", name: t("settings.tabs.profile", "Profile"), icon: User },
    { id: "team", name: t("settings.tabs.team", "Team Management"), icon: Users },
    { id: "notifications", name: t("settings.tabs.notifications", "Notifications"), icon: Bell },
    { id: "billing", name: t("settings.tabs.billing", "Billing"), icon: CreditCard },
    { id: "appearance", name: t("settings.tabs.appearance", "Appearance"), icon: Palette },
    { id: "security", name: t("settings.tabs.account", "Security"), icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          {t("settings.title", "Settings")}
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          {t("settings.subtitle", "Manage your account, team and billing")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <nav className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 p-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm ${
                  active
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>

        <div>
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "team" && <TeamSection />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "billing" && <PaymentSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "security" && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}

function TeamSection() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const refresh = async () => {
    try {
      const res = await listTeamMembers().catch(() => ({ members: [] }));
      setMembers(res?.members || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onChangeRole = async (id, role) => {
    try {
      await updateTeamMemberRole(id, role);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update role");
    }
  };

  const onRemove = async (id) => {
    if (!confirm("Remove this team member?")) return;
    try {
      await removeTeamMember(id);
      toast.success("Removed");
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to remove");
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
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <strong>Note:</strong> Team membership is recorded here, but per-role permissions
        (who can approve milestones, view orders, etc.) are part of a separate authorization epic.
      </div>

      <div className="rounded-xl border border-violet-200 bg-white">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Team members</h2>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-1.5 text-white text-sm hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> Invite
          </button>
        </div>
        {members.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No members yet.</p>
        ) : (
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {m.firstname || m.inviteEmail}
                    {m.lastname ? ` ${m.lastname}` : ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    {m.memberEmail || m.inviteEmail} · {m.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => onChangeRole(m.id, e.target.value)}
                    className="rounded-md border border-violet-200 px-2 py-1 text-sm"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="APPROVER">Approver</option>
                  </select>
                  <button onClick={() => onRemove(m.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onDone={refresh} />}
    </div>
  );
}

function InviteModal({ onClose, onDone }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await inviteTeamMember({ email, role });
      toast.success("Invite sent");
      onClose();
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold mb-3">Invite team member</h3>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
          >
            <option value="ADMIN">Admin</option>
            <option value="VIEWER">Viewer</option>
            <option value="APPROVER">Approver</option>
          </select>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="text-sm text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-violet-600 text-white px-4 py-2 text-sm hover:bg-violet-700 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
