import { useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Folder,
  Filter,
  CircleDot,
  CheckCircle2,
  Clock,
  Briefcase,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "./Avatar.jsx";
import {
  fullName,
  formatRelativeTime,
  statusBadgeClasses,
  statusLabel,
  daysUntil,
  formatCurrency,
} from "./utils.js";

const FILTERS = [
  { id: "all", label: "All", icon: Folder },
  { id: "active", label: "Active", icon: CircleDot },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

// Status sets per kind. Jobs use JobStatus, orders use OrderStatus — both
// share enough lifecycle vocabulary for a single filter row to make sense.
function passesFilter(project, filter) {
  if (filter === "all") return true;
  const kind = project.kind || "JOB";
  const status = String(project.status || "").toUpperCase();
  if (kind === "ORDER") {
    if (filter === "active") return ["ACCEPTED", "CURRENT"].includes(status);
    if (filter === "pending") return status === "PENDING";
    if (filter === "completed") return status === "COMPLETED";
    return false;
  }
  if (filter === "active") return ["ACCEPTED", "IN_PROGRESS"].includes(status);
  if (filter === "pending") return ["OPEN", "PENDING"].includes(status);
  if (filter === "completed") return status === "COMPLETED";
  return false;
}

export function ProjectSidebar({
  projects,
  counts,
  selectedScope,
  onSelect,
  loading,
  collapsed,
  onToggleCollapse,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  // Both sections expanded by default. Persisted only in component state — a
  // collapsed sidebar always shows everything regardless of the toggles since
  // the avatars stack vertically without section labels.
  const [showJobs, setShowJobs] = useState(true);
  const [showOrders, setShowOrders] = useState(true);

  const { jobs, orders } = useMemo(() => {
    const s = search.trim().toLowerCase();
    const matchesSearch = (p) => {
      if (!s) return true;
      const peerName = fullName(p.peer).toLowerCase();
      return (
        (p.title || "").toLowerCase().includes(s) ||
        (p.orderNumber || "").toLowerCase().includes(s) ||
        peerName.includes(s) ||
        String(p.id).includes(s)
      );
    };
    const filtered = (projects || []).filter((p) => passesFilter(p, filter) && matchesSearch(p));
    return {
      jobs: filtered.filter((p) => (p.kind || "JOB") === "JOB"),
      orders: filtered.filter((p) => p.kind === "ORDER"),
    };
  }, [projects, filter, search]);

  // For collapsed view we just stack everything vertically (jobs above orders)
  // since the avatars alone don't tell the user which section they belong to.
  const collapsedAll = [...jobs, ...orders];

  const totalJobs = counts?.jobs ?? jobs.length;
  const totalOrders = counts?.orders ?? orders.length;

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-80"
      } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-all duration-200`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Workspace</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalJobs} job{totalJobs === 1 ? "" : "s"} · {totalOrders} gig order{totalOrders === 1 ? "" : "s"}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, gigs, people…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-20 rounded-xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : collapsed ? (
          collapsedAll.length === 0 ? null : (
            <ul className="p-2 space-y-2">
              {collapsedAll.map((project) => (
                <li key={`${project.kind || "JOB"}-${project.id}`}>
                  <CollapsedItem
                    project={project}
                    selected={isSelected(project, selectedScope)}
                    onClick={() => onSelect(project)}
                  />
                </li>
              ))}
            </ul>
          )
        ) : jobs.length === 0 && orders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="py-2">
            <SidebarSection
              icon={Briefcase}
              title="Custom Jobs"
              count={jobs.length}
              expanded={showJobs}
              onToggle={() => setShowJobs((v) => !v)}
              emptyHint="No custom jobs yet. Hire from the Jobs page to start one."
            >
              {jobs.map((project) => (
                <li key={`JOB-${project.id}`}>
                  <ProjectCard
                    project={project}
                    selected={isSelected(project, selectedScope)}
                    onClick={() => onSelect(project)}
                  />
                </li>
              ))}
            </SidebarSection>
            <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
            <SidebarSection
              icon={Sparkles}
              title="Gig Orders"
              count={orders.length}
              expanded={showOrders}
              onToggle={() => setShowOrders((v) => !v)}
              emptyHint="No gig orders yet. Buy a gig from the Marketplace to spin one up."
            >
              {orders.map((project) => (
                <li key={`ORDER-${project.id}`}>
                  <ProjectCard
                    project={project}
                    selected={isSelected(project, selectedScope)}
                    onClick={() => onSelect(project)}
                  />
                </li>
              ))}
            </SidebarSection>
          </div>
        )}
      </div>
    </aside>
  );
}

function isSelected(project, scope) {
  if (!scope) return false;
  const kind = project.kind || "JOB";
  return scope.kind === kind && Number(scope.id) === Number(project.id);
}

function SidebarSection({ icon: Icon, title, count, expanded, onToggle, emptyHint, children }) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasItems = childArray.some(Boolean);
  return (
    <section className="px-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-1 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          {title}
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] tabular-nums text-gray-700 dark:text-gray-300">
            {count}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
      </button>
      {expanded && (
        <ul className="mt-1 space-y-2">
          {hasItems ? (
            childArray
          ) : (
            <li className="px-1 pb-2 text-[11px] text-gray-400 dark:text-gray-500 italic">
              {emptyHint}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-center p-8">
      <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No projects yet</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Hire from the Jobs page or buy a gig to start collaborating.
      </p>
    </div>
  );
}

function CollapsedItem({ project, selected, onClick }) {
  const isOrder = project.kind === "ORDER";
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${isOrder ? "Gig: " : ""}${project.title}`}
      className={`relative w-full h-12 rounded-xl flex items-center justify-center transition-all ${
        selected
          ? "bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <Avatar user={project.peer} size={36} />
      {isOrder && (
        <span
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 flex items-center justify-center"
          aria-label="Gig order"
        >
          <Sparkles className="w-2 h-2 text-white" />
        </span>
      )}
      {project.unreadHint > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {project.unreadHint > 9 ? "9+" : project.unreadHint}
        </span>
      )}
    </button>
  );
}

function ProjectCard({ project, selected, onClick }) {
  const days = daysUntil(project.deadline);
  const overdue = days != null && days < 0 && project.status !== "COMPLETED";
  const isOrder = project.kind === "ORDER";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left p-3 rounded-xl transition-all border ${
        selected
          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 shadow-sm"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar user={project.peer} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {project.title || `${isOrder ? "Gig order" : "Project"} #${project.id}`}
            </h3>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${statusBadgeClasses(
                project.status
              )}`}
            >
              {statusLabel(project.status)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 truncate">
            <span className="truncate">{fullName(project.peer)}</span>
            {isOrder && project.orderNumber && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="font-mono text-[10px]">{project.orderNumber}</span>
              </>
            )}
          </div>

          {/* Order-only chips: package, escrow, total. Kept compact so they
              don't push the card height past 80-100px. */}
          {isOrder && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {project.package && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 capitalize">
                  {String(project.package).toLowerCase()}
                </span>
              )}
              {project.escrowStatus && project.escrowStatus !== "NONE" && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {String(project.escrowStatus).toLowerCase()}
                </span>
              )}
              {project.totalPrice != null && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                  {formatCurrency(project.totalPrice)}
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  project.progress >= 100
                    ? "bg-emerald-500"
                    : project.progress >= 50
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
              {project.progress || 0}%
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>{formatRelativeTime(project.lastMessageAt || project.updatedAt)}</span>
            {project.deadline && (
              <span
                className={
                  overdue
                    ? "text-rose-600 dark:text-rose-400 font-semibold"
                    : days != null && days <= 2
                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                    : ""
                }
              >
                {overdue
                  ? `${Math.abs(days)}d overdue`
                  : days != null
                  ? `${days}d left`
                  : ""}
              </span>
            )}
          </div>

          {project.unreadHint > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-semibold rounded-full">
              {project.unreadHint} new {project.unreadHint === 1 ? "message" : "messages"}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
