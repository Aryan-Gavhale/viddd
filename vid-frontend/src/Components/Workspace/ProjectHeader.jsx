import { useState, useRef, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  X,
  PlayCircle,
  PauseCircle,
  Receipt,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Avatar } from "./Avatar.jsx";
import {
  fullName,
  formatCurrency,
  daysUntil,
  deadlineTone,
  statusBadgeClasses,
  statusLabel,
} from "./utils.js";

const TONE = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  gray: "text-gray-500 dark:text-gray-400",
};

export function ProjectHeader({ summary, role, onAction, savingAction }) {
  const job = summary?.job;
  const peer = summary?.peer;
  const days = job?.daysLeft ?? daysUntil(job?.deadline);
  const tone = deadlineTone(days);

  if (!job) return null;

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadgeClasses(job.status)}`}>
              {statusLabel(job.status)}
            </span>
            {job.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Project #{job.id}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {job.title}
          </h1>
        </div>

        <QuickActionsMenu role={role} status={job.status} onAction={onAction} loading={savingAction} />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Budget"
          value={
            job.budgetMin || job.budgetMax
              ? `${formatCurrency(job.budgetMin)}${
                  job.budgetMax && job.budgetMax !== job.budgetMin ? ` – ${formatCurrency(job.budgetMax)}` : ""
                }`
              : "Not set"
          }
          icon={Receipt}
        />
        <Stat
          label="Deadline"
          value={
            days == null
              ? "No deadline"
              : days < 0
              ? `${Math.abs(days)} days overdue`
              : days === 0
              ? "Due today"
              : `${days} days left`
          }
          tone={TONE[tone]}
          icon={CalendarDays}
        />
        <Stat
          label="Progress"
          value={`${job.overallProgress ?? 0}%`}
          icon={PlayCircle}
        />
        <Stat
          label={role === "client" ? "Freelancer" : "Client"}
          value={fullName(peer)}
          icon={() => <Avatar user={peer} size={16} />}
          truncate
        />
      </div>
    </header>
  );
}

function Stat({ label, value, icon: Icon, tone, truncate }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
        {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
        {label}
      </div>
      <div
        className={`text-sm font-semibold mt-0.5 ${tone || "text-gray-900 dark:text-white"} ${
          truncate ? "truncate" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickActionsMenu({ role, status, onAction, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const isClient = role === "client";
  const isFreelancer = role === "freelancer";
  const active = ["ACCEPTED", "IN_PROGRESS"].includes(status);

  const actions = [];
  if (isClient && active) {
    actions.push({ id: "request_review", label: "Open Delivery Review", icon: CheckCircle2, tone: "emerald" });
    actions.push({ id: "pause", label: "Pause Project", icon: PauseCircle });
    actions.push({ id: "cancel", label: "Cancel Project", icon: X, tone: "rose" });
  }
  if (isFreelancer && active) {
    actions.push({ id: "request_review", label: "Request Review", icon: AlertCircle });
    actions.push({ id: "submit_invoice", label: "Generate Invoice", icon: Receipt });
  }
  actions.push({ id: "open_brief", label: "View Brief", icon: FileText });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 disabled:opacity-50"
      >
        Actions
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-1 z-50">
          {actions.map((a) => {
            const Icon = a.icon;
            const tone =
              a.tone === "emerald"
                ? "text-emerald-600 dark:text-emerald-400"
                : a.tone === "rose"
                ? "text-rose-600 dark:text-rose-400"
                : "text-gray-700 dark:text-gray-200";
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAction?.(a.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${tone}`}
              >
                <Icon className="w-4 h-4" />
                {a.label}
              </button>
            );
          })}
          {actions.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No actions available</div>
          )}
        </div>
      )}
    </div>
  );
}

QuickActionsMenu.defaultProps = { loading: false };
