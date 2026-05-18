/**
 * Tiny, dependency-free formatting utilities used across the workspace.
 * Keeping them local keeps the components focused and easy to test.
 */

/**
 * Pick the right `/workspace/...` API base for the given scope. Job-scoped
 * data lives under `/workspace/projects/:jobId`, order-scoped under
 * `/workspace/orders/:orderId`. Centralising this keeps FilesTab, ChatRail,
 * and VideoReviewModal from re-implementing the branch in three places.
 */
export function workspaceApiBase(scope) {
  if (!scope || !scope.id) return null;
  if (scope.kind === "ORDER") return `/workspace/orders/${scope.id}`;
  return `/workspace/projects/${scope.id}`;
}

/**
 * Higher-level helpers a few callers use directly. Returns null if the scope
 * isn't sufficiently specified yet (sidebar still loading, etc).
 */
export function workspaceFilesUrl(scope) {
  const base = workspaceApiBase(scope);
  return base ? `${base}/files` : null;
}

export function workspacePinnedUrl(scope) {
  const base = workspaceApiBase(scope);
  return base ? `${base}/pinned` : null;
}

export function workspaceReviewUrl(scope, fileId) {
  const base = workspaceApiBase(scope);
  return base ? `${base}/files/${fileId}/review` : null;
}

const STATUS_LABELS = {
  OPEN: "Open",
  PENDING: "Pending",
  ACCEPTED: "Active",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PAUSED: "Paused",
  CLOSED: "Closed",
};

const STATUS_TONE = {
  OPEN: "amber",
  PENDING: "amber",
  ACCEPTED: "blue",
  IN_PROGRESS: "blue",
  COMPLETED: "emerald",
  CANCELLED: "rose",
  PAUSED: "gray",
  CLOSED: "gray",
};

export function statusLabel(status) {
  if (!status) return "—";
  return STATUS_LABELS[status] || String(status).replace(/_/g, " ");
}

export function statusTone(status) {
  return STATUS_TONE[status] || "gray";
}

export function statusBadgeClasses(status) {
  switch (statusTone(status)) {
    case "blue":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700/50";
    case "emerald":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/50";
    case "amber":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/50";
    case "rose":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-700/50";
    default:
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700";
  }
}

export function statusDotClasses(status) {
  switch (statusTone(status)) {
    case "blue":
      return "bg-blue-500";
    case "emerald":
      return "bg-emerald-500";
    case "amber":
      return "bg-amber-500";
    case "rose":
      return "bg-rose-500";
    default:
      return "bg-gray-400";
  }
}

export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function formatCurrency(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

export function formatRelativeTime(input) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  const diff = Date.now() - date.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.round(day / 7)}w ago`;
  if (day < 365) return `${Math.round(day / 30)}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}

export function formatDate(input, opts) {
  if (!input) return "—";
  try {
    return new Date(input).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...(opts || {}),
    });
  } catch {
    return String(input);
  }
}

export function formatDateTime(input) {
  if (!input) return "—";
  try {
    return new Date(input).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(input);
  }
}

export function daysUntil(input) {
  if (!input) return null;
  const target = new Date(input).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export function deadlineTone(daysLeft) {
  if (daysLeft == null) return "gray";
  if (daysLeft < 0) return "rose";
  if (daysLeft <= 2) return "amber";
  return "emerald";
}

export function fullName(person) {
  if (!person) return "Unassigned";
  const fn = person.firstname || person.firstName || "";
  const ln = person.lastname || person.lastName || "";
  const name = `${fn} ${ln}`.trim();
  return name || person.name || person.email || "Unassigned";
}

export function initials(person) {
  if (!person) return "?";
  const fn = (person.firstname || person.firstName || "").trim();
  const ln = (person.lastname || person.lastName || "").trim();
  const a = fn.charAt(0);
  const b = ln.charAt(0);
  const both = `${a}${b}`.trim();
  if (both) return both.toUpperCase();
  const fallback = (person.name || person.email || "?").trim();
  return fallback.charAt(0).toUpperCase();
}

export function avatarColor(seed) {
  const palette = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-cyan-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-blue-500",
  ];
  const str = String(seed || "?");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Single source of truth for chat bubble theming. The current user's bubble
 * ("mine") is always indigo so the eye instantly anchors to "your voice"; peer
 * bubbles are themed by role so editors and clients are visually distinct
 * across the app. Both `ChatPanel` (job, real-time) and `OrderMessagePanel`
 * (order, polling) consume this so the styling stays in sync.
 *
 * @param {{ mine: boolean, role?: "client" | "freelancer" | string }} args
 * @returns {string} Tailwind classes to apply to the bubble container.
 */
export function bubbleClass({ mine, role }) {
  if (mine) {
    return "bg-indigo-600 text-white rounded-br-sm border border-indigo-700/40 shadow-sm";
  }
  if (role === "freelancer") {
    return "bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-700/50 dark:text-emerald-100 rounded-bl-sm";
  }
  return "bg-sky-50 border border-sky-200 text-sky-900 dark:bg-sky-900/30 dark:border-sky-700/50 dark:text-sky-100 rounded-bl-sm";
}

/**
 * Human-readable label for chat captions ("You", "Editor", "Client").
 * Used above message bubbles to make role distinctions explicit.
 */
export function roleCaption({ mine, role }) {
  if (mine) return "You";
  if (role === "freelancer") return "Editor";
  if (role === "client") return "Client";
  return "User";
}
