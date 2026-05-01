import { useMemo, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Folder,
  Filter,
  CircleDot,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Avatar } from "./Avatar.jsx";
import {
  fullName,
  formatRelativeTime,
  statusBadgeClasses,
  statusLabel,
  daysUntil,
} from "./utils.js";

const FILTERS = [
  { id: "all", label: "All", icon: Folder },
  { id: "active", label: "Active", icon: CircleDot },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
];

export function ProjectSidebar({
  projects,
  selectedJobId,
  onSelect,
  loading,
  collapsed,
  onToggleCollapse,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (projects || []).filter((p) => {
      if (filter === "active" && !["ACCEPTED", "IN_PROGRESS"].includes(p.status)) return false;
      if (filter === "pending" && !["OPEN", "PENDING"].includes(p.status)) return false;
      if (filter === "completed" && p.status !== "COMPLETED") return false;
      if (!s) return true;
      const peerName = fullName(p.peer).toLowerCase();
      return (
        (p.title || "").toLowerCase().includes(s) ||
        peerName.includes(s) ||
        String(p.id).includes(s)
      );
    });
  }, [projects, filter, search]);

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
            <p className="text-xs text-gray-500 dark:text-gray-400">{projects?.length || 0} projects</p>
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
              placeholder="Search projects, people…"
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
        ) : filtered.length === 0 ? (
          <EmptyState collapsed={collapsed} />
        ) : (
          <ul className={`${collapsed ? "p-2" : "p-3"} space-y-2`}>
            {filtered.map((project) => (
              <li key={project.id}>
                {collapsed ? (
                  <CollapsedItem
                    project={project}
                    selected={project.id === selectedJobId}
                    onClick={() => onSelect(project)}
                  />
                ) : (
                  <ProjectCard
                    project={project}
                    selected={project.id === selectedJobId}
                    onClick={() => onSelect(project)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function EmptyState({ collapsed }) {
  if (collapsed) return null;
  return (
    <div className="text-center p-8">
      <Folder className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No projects yet</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Once a hire is made, projects will appear here.
      </p>
    </div>
  );
}

function CollapsedItem({ project, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={project.title}
      className={`relative w-full h-12 rounded-xl flex items-center justify-center transition-all ${
        selected
          ? "bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <Avatar user={project.peer} size={36} />
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
              {project.title || `Project #${project.id}`}
            </h3>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${statusBadgeClasses(
                project.status
              )}`}
            >
              {statusLabel(project.status)}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {fullName(project.peer)}
          </p>

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
