import { useEffect, useState } from "react";
import {
  AlertCircle,
  Smartphone,
  Shield,
  Mail,
  Key,
  LinkIcon,
  Loader2,
  Trash2,
  Youtube,
  Linkedin,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  fetchMe,
  changePassword,
  requestEmailChange,
  get2faStatus,
  setup2fa,
  verify2faSetup,
  disable2fa,
  listSessions,
  revokeSession,
  revokeAllOtherSessions,
  listConnectedAccounts,
  startOAuthConnect,
  disconnectAccount,
} from "../../services/settingsApi";

export function AccountSettings() {
  const [me, setMe] = useState(null);
  const [twofa, setTwofa] = useState({ enabled: false });
  const [sessions, setSessions] = useState([]);
  const [connected, setConnected] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [m, t, s, c] = await Promise.all([
        fetchMe().catch(() => null),
        get2faStatus().catch(() => ({ enabled: false })),
        listSessions().catch(() => ({ sessions: [] })),
        listConnectedAccounts().catch(() => ({})),
      ]);
      setMe(m);
      setTwofa(t || { enabled: false });
      setSessions(s?.sessions || []);
      setConnected(c || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailCard email={me?.email} verified={me?.emailVerified} onChanged={refresh} />
      <PasswordCard />
      <TwoFactorCard status={twofa} onChanged={() => refresh()} />
      <SessionsCard
        sessions={sessions}
        onRevoke={async (jti) => {
          await revokeSession(jti).catch((e) =>
            toast.error(e?.response?.data?.message || "Failed to revoke session")
          );
          refresh();
        }}
        onRevokeAll={async () => {
          await revokeAllOtherSessions().catch((e) =>
            toast.error(e?.response?.data?.message || "Failed to revoke other sessions")
          );
          refresh();
        }}
      />
      <ConnectedAccountsCard connected={connected} onChanged={refresh} />
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
        <h2 className="text-lg font-bold text-violet-900 dark:text-violet-100">{title}</h2>
        {subtitle && (
          <p className="text-violet-600 dark:text-violet-400 text-sm">{subtitle}</p>
        )}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function EmailCard({ email, verified, onChanged }) {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await requestEmailChange({ newEmail, currentPassword: pwd });
      toast.success("Verification email sent to your new address");
      setOpen(false);
      setNewEmail("");
      setPwd("");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start email change");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Email Address" subtitle="The email used to sign in to Vidlancing">
      <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-4 py-3 text-gray-800 dark:border-violet-800/50 dark:bg-violet-900/10 dark:text-gray-200 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-violet-500" />
          {email || "—"}
        </span>
        <span
          className={`px-2 py-0.5 text-xs rounded-full border ${
            verified
              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50"
              : "bg-amber-100 text-amber-700 border-amber-200"
          }`}
        >
          {verified ? "Verified" : "Unverified"}
        </span>
      </div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-violet-700 hover:underline"
        >
          Change email
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-violet-200 p-4">
          <input
            type="email"
            placeholder="New email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Current password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-violet-600 text-white px-4 py-2 text-sm hover:bg-violet-700 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send confirmation email"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast.success("Password changed. Please sign in again.");
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Password" subtitle="Use a strong password and never reuse it elsewhere">
      <form onSubmit={submit} className="space-y-3">
        <Input label="Current password" type="password" value={current} onChange={setCurrent} required />
        <Input label="New password" type="password" value={next} onChange={setNext} required />
        <Input label="Confirm new password" type="password" value={confirm} onChange={setConfirm} required />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-violet-600 text-white px-4 py-2 text-sm hover:bg-violet-700 disabled:opacity-60"
        >
          <Key className="h-4 w-4" />
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </Card>
  );
}

function TwoFactorCard({ status, onChanged }) {
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    try {
      const data = await setup2fa();
      setSetupData(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start 2FA setup");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      await verify2faSetup({ code });
      toast.success("Two-factor authentication enabled");
      setSetupData(null);
      setCode("");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await disable2fa({ currentPassword: pwd, code });
      toast.success("Two-factor authentication disabled");
      setCode("");
      setPwd("");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to disable 2FA");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Two-Factor Authentication" subtitle="Authenticator app TOTP (Google Authenticator, 1Password, etc.)">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium">
            Status:{" "}
            <span className={status.enabled ? "text-green-600" : "text-gray-500"}>
              {status.enabled ? "Enabled" : "Disabled"}
            </span>
          </span>
        </div>
        {!status.enabled && !setupData && (
          <button
            onClick={enable}
            disabled={busy}
            className="rounded-md bg-violet-600 text-white px-4 py-2 text-sm hover:bg-violet-700 disabled:opacity-60"
          >
            Enable 2FA
          </button>
        )}
      </div>

      {setupData && (
        <div className="rounded-lg border border-violet-200 p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Scan this QR code with your authenticator app, then enter the 6-digit code below.
          </p>
          {setupData.qrDataUrl && <img src={setupData.qrDataUrl} alt="2FA QR" className="h-44 w-44" />}
          {setupData.secret && (
            <code className="block rounded bg-slate-100 dark:bg-slate-800 p-2 text-xs">
              Manual key: {setupData.secret}
            </code>
          )}
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="rounded-md border border-violet-200 px-3 py-2 text-sm w-32"
            />
            <button onClick={verify} disabled={busy} className="rounded-md bg-violet-600 text-white px-4 py-2 text-sm">
              Verify and enable
            </button>
            <button onClick={() => setSetupData(null)} className="text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {status.enabled && (
        <div className="rounded-lg border border-violet-200 p-4 space-y-3">
          <h4 className="text-sm font-medium">Disable 2FA</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Current password"
              className="rounded-md border border-violet-200 px-3 py-2 text-sm"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="rounded-md border border-violet-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={disable}
            disabled={busy}
            className="text-sm text-red-600 hover:underline"
          >
            Disable 2FA
          </button>
        </div>
      )}
    </Card>
  );
}

function SessionsCard({ sessions, onRevoke, onRevokeAll }) {
  return (
    <Card title="Active Sessions" subtitle="Devices that can sign in with your credentials">
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No active sessions.</p>
      ) : (
        <ul className="divide-y divide-violet-100">
          {sessions.map((s) => (
            <li key={s.refreshJti} className="py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {s.userAgent || "Unknown device"}
                  {s.current && (
                    <span className="ml-2 text-xs text-violet-600">(this device)</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {s.ip || "—"} · last seen {new Date(s.lastSeenAt).toLocaleString()}
                </div>
              </div>
              {!s.current && (
                <button
                  onClick={() => onRevoke(s.refreshJti)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {sessions.some((s) => !s.current) && (
        <button
          onClick={onRevokeAll}
          className="text-sm text-red-600 hover:underline mt-2"
        >
          Sign out of all other sessions
        </button>
      )}
    </Card>
  );
}

function ConnectedAccountsCard({ connected, onChanged }) {
  const start = async (provider) => {
    try {
      const data = await startOAuthConnect(provider);
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err?.response?.data?.message || "OAuth not configured");
    }
  };

  const disconnect = async (provider) => {
    try {
      await disconnectAccount(provider);
      toast.success("Disconnected");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to disconnect");
    }
  };

  const Item = ({ icon, name, providerKey }) => {
    const c = connected?.[providerKey];
    const isConnected = c?.connected;
    return (
      <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-gray-500">
              {isConnected ? c?.displayName || "Connected" : "Not connected"}
            </div>
          </div>
        </div>
        {isConnected ? (
          <button onClick={() => disconnect(providerKey)} className="text-sm text-red-600 hover:underline">
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => start(providerKey)}
            className="rounded-md bg-violet-600 text-white px-4 py-2 text-sm hover:bg-violet-700"
          >
            <LinkIcon className="inline h-4 w-4 mr-1" /> Connect
          </button>
        )}
      </div>
    );
  };

  return (
    <Card title="Connected Accounts" subtitle="Link external services for one-click publishing and sign-in">
      <Item icon={<Youtube className="h-5 w-5 text-red-500" />} name="YouTube" providerKey="youtube" />
      <Item icon={<Linkedin className="h-5 w-5 text-blue-600" />} name="LinkedIn" providerKey="linkedin" />
    </Card>
  );
}

function Input({ label, type = "text", value, onChange, required }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
      />
    </div>
  );
}
