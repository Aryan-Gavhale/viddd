import { Activity, FileText, MessageSquare, CheckCircle2, RefreshCw } from "lucide-react";
import { formatRelativeTime } from "./utils.js";

const ICONS = {
  milestone: CheckCircle2,
  file: FileText,
  message: MessageSquare,
  status: RefreshCw,
};

const COLORS = {
  milestone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  file: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  message: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  // Order status changes show up on the Activity tab when viewing a gig order.
  // Use a distinct purple tone so they're easy to scan against file events.
  status: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export function ActivityTab({ summary }) {
  const events = (summary?.activity || []).slice(0, 50);

  if (events.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <Activity className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        No activity recorded yet. As you collaborate, milestones, files and key
        events will appear here.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity</h2>
      <ol className="relative border-l border-gray-200 dark:border-gray-800 ml-3 space-y-4">
        {events.map((e, idx) => {
          const Icon = ICONS[e.kind] || Activity;
          const color = COLORS[e.kind] || COLORS.message;
          return (
            <li key={`${e.kind}-${e.ref}-${idx}`} className="ml-4">
              <span
                className={`absolute -left-3 mt-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-900 ${color}`}
              >
                <Icon className="w-3 h-3" />
              </span>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {labelFor(e)}
                  </span>
                  <time className="text-[11px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatRelativeTime(e.at)}
                  </time>
                </div>
                {e.detail && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{prettyDetail(e)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function labelFor(e) {
  if (e.kind === "milestone") return `Milestone updated · ${e.subject}`;
  if (e.kind === "file") return `File added · ${e.subject}`;
  if (e.kind === "status") return e.subject; // already pre-formatted by backend
  return e.subject;
}

function prettyDetail(e) {
  if (!e.detail) return "";
  if (e.kind === "milestone") return `Status: ${e.detail}`;
  if (e.kind === "status") return ""; // duplicated in subject
  return String(e.detail);
}
