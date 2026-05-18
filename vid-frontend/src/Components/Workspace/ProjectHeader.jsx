import { useState, useRef, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  X,
  PlayCircle,
  PauseCircle,
  Receipt,
  FileText,
  ChevronDown,
  PackageCheck,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Briefcase,
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

export function ProjectHeader({ summary, role, scopeKind = "JOB", onAction, savingAction }) {
  const isOrder = scopeKind === "ORDER";
  // The backend sends both `summary.job` (back-compat alias) and either
  // `summary.order` or `summary.job` depending on scope. Normalise once here.
  const entity = (isOrder ? summary?.order : summary?.job) || summary?.job || null;
  const peer = summary?.peer;

  if (!entity) return null;

  const days = entity.daysLeft ?? daysUntil(isOrder ? entity.deliveryDeadline : entity.deadline);
  const tone = deadlineTone(days);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                isOrder
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
              }`}
            >
              {isOrder ? <Sparkles className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
              {isOrder ? "Gig order" : "Custom job"}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadgeClasses(entity.status)}`}>
              {statusLabel(entity.status)}
            </span>
            {isOrder && entity.escrowStatus && entity.escrowStatus !== "NONE" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                Escrow {String(entity.escrowStatus).toLowerCase()}
              </span>
            )}
            {!isOrder && entity.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isOrder ? entity.orderNumber || `Order #${entity.id}` : `Project #${entity.id}`}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {entity.title}
          </h1>
        </div>

        <QuickActionsMenu
          role={role}
          status={entity.status}
          scopeKind={scopeKind}
          onAction={onAction}
          loading={savingAction}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {isOrder ? (
          <>
            <Stat
              label="Package"
              value={entity.package ? String(entity.package) : "Not set"}
              icon={PackageCheck}
              truncate
            />
            <Stat
              label="Paid"
              value={
                entity.totalPrice != null
                  ? formatCurrency(entity.totalPrice, entity.currency)
                  : "Not set"
              }
              icon={Receipt}
            />
            <Stat
              label="Due"
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
              label="Revisions"
              value={`${Number(entity.revisionsRequested) || 0} used`}
              icon={RefreshCw}
            />
          </>
        ) : (
          <>
            <Stat
              label="Budget"
              value={
                entity.budgetMin || entity.budgetMax
                  ? `${formatCurrency(entity.budgetMin)}${
                      entity.budgetMax && entity.budgetMax !== entity.budgetMin ? ` – ${formatCurrency(entity.budgetMax)}` : ""
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
              value={`${entity.overallProgress ?? 0}%`}
              icon={PlayCircle}
            />
            <Stat
              label={role === "client" ? "Freelancer" : "Client"}
              value={fullName(peer)}
              icon={() => <Avatar user={peer} size={16} />}
              truncate
            />
          </>
        )}
      </div>

      {/* Order header shows the peer beneath the stats so all four metrics
          stay quantitative — the peer is more interesting to the order side
          than budget anyway. */}
      {isOrder && peer && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Avatar user={peer} size={20} />
          <span className="truncate">
            {role === "client" ? "Editor: " : "Client: "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{fullName(peer)}</span>
          </span>
        </div>
      )}
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

function QuickActionsMenu({ role, status, scopeKind, onAction, loading }) {
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
  const isOrder = scopeKind === "ORDER";

  // Job lifecycle uses ACCEPTED/IN_PROGRESS as "active". Order lifecycle uses
  // ACCEPTED/CURRENT. We branch the action menu so each surface only offers
  // transitions the backend will accept.
  const jobActive = ["ACCEPTED", "IN_PROGRESS"].includes(status);
  const orderActive = ["ACCEPTED", "CURRENT"].includes(status);

  const actions = [];
  if (isOrder) {
    if (isFreelancer) {
      if (status === "PENDING") {
        actions.push({ id: "accept", label: "Accept Order", icon: CheckCircle2, tone: "emerald" });
      }
      if (status === "ACCEPTED") {
        actions.push({ id: "start", label: "Start Working", icon: PlayCircle, tone: "emerald" });
      }
    }
    if (orderActive) {
      actions.push({ id: "request_review", label: "Open Delivery Review", icon: CheckCircle2, tone: "emerald" });
      if (isFreelancer) {
        actions.push({ id: "submit_invoice", label: "Generate Invoice", icon: Receipt });
      }
    }
    if (isClient && (status === "PENDING" || orderActive)) {
      actions.push({ id: "cancel", label: "Cancel Order", icon: X, tone: "rose" });
    }
    actions.push({ id: "open_brief", label: "View Order Brief", icon: FileText });
  } else {
    if (isClient && jobActive) {
      actions.push({ id: "request_review", label: "Open Delivery Review", icon: CheckCircle2, tone: "emerald" });
      actions.push({ id: "pause", label: "Pause Project", icon: PauseCircle });
      actions.push({ id: "cancel", label: "Cancel Project", icon: X, tone: "rose" });
    }
    if (isFreelancer && jobActive) {
      actions.push({ id: "request_review", label: "Request Review", icon: AlertCircle });
      actions.push({ id: "submit_invoice", label: "Generate Invoice", icon: Receipt });
    }
    actions.push({ id: "open_brief", label: "View Brief", icon: FileText });
  }

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
