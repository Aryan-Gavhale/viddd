import { CheckCircle2, RefreshCw, ShieldCheck, AlertTriangle, AlertCircle } from "lucide-react";
import { formatRelativeTime } from "./utils.js";

/**
 * Revisions tab — gig-order specific. Gig packages have a hard cap on the
 * number of revisions the client can request (free tier of editor's package).
 * Once exhausted the client either accepts the current cut, requests a paid
 * extra revision (out of scope for this view), or escalates via Delivery.
 *
 * The data model on the backend already tracks `revisionsRequested` (count of
 * "request changes" the client has fired) and `revisionsCompleted` (count the
 * editor has resubmitted) so this view stays read-only and visualises that
 * counter. Action buttons (request / submit) are intentionally still on the
 * Files tab so the linked deliverable is always selected first.
 */
export function RevisionsTab({ order, role, openReviewCount = 0 }) {
  if (!order) {
    return (
      <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <RefreshCw className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        Loading revision summary…
      </div>
    );
  }

  const requested = Number(order.revisionsRequested) || 0;
  const completed = Number(order.revisionsCompleted) || 0;
  // Gig packages list "X revisions" as the contractual cap. We surface the
  // best signal available: if the gig metadata exposes `revisionLimit` we use
  // it, otherwise we fall back to a generous 3 so progress bars don't divide
  // by zero. The number is purely informational for the workspace; escrow
  // release rules still live in delivery.controller.ts.
  const limit = Number(order.revisionLimit ?? order.gig?.revisionLimit ?? 3);
  const remaining = Math.max(0, limit - requested);
  const percent = limit > 0 ? Math.min(100, Math.round((requested / limit) * 100)) : 0;
  const exhausted = remaining === 0 && limit > 0;
  const reviewBlocked = Number(openReviewCount) > 0;

  return (
    <div className="p-6 space-y-6">
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revision tracker</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gig packages include a fixed number of revision rounds. Use them
              wisely — once the cap is hit you'll need to negotiate a paid
              extra round outside this workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {reviewBlocked && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                title="The editor cannot send this cut for approval or deliver the final master while review comments are open."
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {openReviewCount} open comment{openReviewCount === 1 ? "" : "s"}
              </span>
            )}
            {exhausted ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                Limit reached
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                {remaining} of {limit} left
              </span>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Revisions used</span>
            <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-200">
              {requested} / {limit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                exhausted
                  ? "bg-rose-500"
                  : percent >= 66
                  ? "bg-amber-500"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Requested" value={requested} icon={RefreshCw} tone="indigo" />
          <Stat label="Resubmitted" value={completed} icon={CheckCircle2} tone="emerald" />
          <Stat
            label="Remaining"
            value={remaining}
            icon={ShieldCheck}
            tone={exhausted ? "rose" : "amber"}
          />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200 mb-3">
          How revisions work on this order
        </h3>
        <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
          <li>
            Editor uploads a review cut on the <span className="font-semibold">Files</span> tab and
            submits it for client approval.
          </li>
          <li>
            Client reviews on the same tab and either approves, requests
            changes, or opens a dispute.
          </li>
          <li>
            Each "Request changes" increments the revision counter above. When
            the counter equals the package limit the client can no longer
            request another free round.
          </li>
          <li>
            Approving the cut unlocks final delivery and the escrow release on
            the <span className="font-semibold">Delivery</span> tab.
          </li>
        </ol>
        {role === "freelancer" && exhausted && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            Heads up: revision limit reached. If the client still wants more
            tweaks, agree on a paid extension in chat before sending another
            cut.
          </p>
        )}
        {role === "client" && exhausted && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
            You've used all included revisions for this package. Future tweaks
            will need to be negotiated with the editor as a paid add-on.
          </p>
        )}
      </section>

      {order.updatedAt && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Counters last updated {formatRelativeTime(order.updatedAt)}.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }) {
  const toneClasses =
    tone === "rose"
      ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
      : tone === "amber"
      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
      : tone === "emerald"
      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
      : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300";
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${toneClasses}`}>
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}
