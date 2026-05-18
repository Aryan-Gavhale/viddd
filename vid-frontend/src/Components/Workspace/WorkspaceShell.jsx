import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Activity,
  MessageSquare,
  X,
  Folder,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios.js";
import { ProjectSidebar } from "./ProjectSidebar.jsx";
import { ProjectHeader } from "./ProjectHeader.jsx";
import { OverviewTab } from "./OverviewTab.jsx";
import { FilesTab } from "./FilesTab.jsx";
import { MilestonesTab } from "./MilestonesTab.jsx";
import { RevisionsTab } from "./RevisionsTab.jsx";
import { ActivityTab } from "./ActivityTab.jsx";
import { ChatRail } from "./ChatRail.jsx";
import { DeliveryPanel } from "./DeliveryPanel.jsx";

// Tab catalogues per scope kind. Job-side keeps the original Milestones tab
// (custom projects rely on staged milestones); Gig orders swap that out for a
// fixed-scope Revisions tracker since gig packages have a hard revision limit.
const JOB_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "milestones", label: "Milestones", icon: CheckSquare },
  { id: "delivery", label: "Delivery", icon: PackageCheck },
  { id: "activity", label: "Activity", icon: Activity },
];

const ORDER_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "revisions", label: "Revisions", icon: RefreshCw },
  { id: "delivery", label: "Delivery", icon: PackageCheck },
  { id: "activity", label: "Activity", icon: Activity },
];

// Build the canonical scope object the rest of the shell uses. We accept
// `jobId` for back-compat with deep-links from emails / dashboards, and
// `orderId` for the new gig surface. They are mutually exclusive — if both are
// present we prefer orderId since the post-checkout flow always uses it.
function readScopeFromParams(params) {
  const orderRaw = params.get("orderId");
  if (orderRaw) {
    const id = Number(orderRaw);
    if (Number.isFinite(id) && id > 0) return { kind: "ORDER", id };
  }
  const jobRaw = params.get("jobId") || params.get("projectId");
  if (jobRaw) {
    const id = Number(jobRaw);
    if (Number.isFinite(id) && id > 0) return { kind: "JOB", id };
  }
  return null;
}

export default function WorkspaceShell() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectCounts, setProjectCounts] = useState({ jobs: 0, orders: 0 });
  const [selectedScope, setSelectedScope] = useState(() => readScopeFromParams(searchParams));
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [chatOpenMobile, setChatOpenMobile] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  const [projectsError, setProjectsError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  // Reset to Overview whenever the scope kind switches so a tab id valid only
  // for the previous kind (e.g. "milestones" while now viewing an order)
  // doesn't render an empty pane.
  useEffect(() => {
    setActiveTab("overview");
  }, [selectedScope?.kind]);

  // Fetch project list (jobs + orders, merged on the backend)
  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const res = await axiosInstance.get("/workspace/projects");
      const list = res.data?.data?.projects || [];
      const counts = res.data?.data?.counts || { jobs: 0, orders: 0 };
      setProjects(list);
      setProjectCounts(counts);
      // If nothing is selected yet, prefer the first item from whichever
      // section has the most recent activity (the backend already sorts).
      if (!selectedScope && list.length > 0) {
        const first = list[0];
        setSelectedScope({ kind: first.kind || "JOB", id: first.id });
      }
    } catch (e) {
      console.error("Failed to load projects", e);
      const msg = e?.response?.data?.message || "Could not load your projects. Check your connection and try again.";
      setProjectsError(msg);
      toast.error(msg);
    } finally {
      setProjectsLoading(false);
    }
  }, [selectedScope]);

  useEffect(() => {
    refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch summary for selected project
  const refreshSummary = useCallback(async () => {
    if (!selectedScope) {
      setSummary(null);
      setSummaryError("");
      return;
    }
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const path =
        selectedScope.kind === "ORDER"
          ? `/workspace/orders/${selectedScope.id}`
          : `/workspace/projects/${selectedScope.id}`;
      const res = await axiosInstance.get(path);
      setSummary(res.data?.data || null);
    } catch (e) {
      console.error("Failed to load summary", e);
      setSummary(null);
      const label = selectedScope?.kind === "ORDER" ? "this order's workspace" : "this project's workspace";
      const msg = e?.response?.data?.message || `Could not load ${label}. Try reselecting it or refresh the page.`;
      setSummaryError(msg);
      toast.error(msg);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedScope]);

  useEffect(() => {
    refreshSummary();
    // mark messages as read for this project / order
    if (selectedScope) {
      const path =
        selectedScope.kind === "ORDER"
          ? `/workspace/orders/${selectedScope.id}/read`
          : `/workspace/projects/${selectedScope.id}/read`;
      axiosInstance.post(path).catch((e) => {
        // Don't toast on every read-failure (very chatty), but keep a visible
        // log so the developer console isn't silent the way it used to be.
        console.warn("Mark-as-read failed:", e?.response?.data?.message || e?.message);
      });
    }
  }, [selectedScope, refreshSummary]);

  // sync URL with selection. We keep job/order params mutually exclusive so
  // sharing a URL always lands the recipient on the right scope.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedScope?.kind === "ORDER") {
      next.set("orderId", String(selectedScope.id));
      next.delete("jobId");
      next.delete("projectId");
    } else if (selectedScope?.kind === "JOB") {
      next.set("jobId", String(selectedScope.id));
      next.delete("orderId");
      next.delete("projectId");
    } else {
      next.delete("orderId");
      next.delete("jobId");
      next.delete("projectId");
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScope?.kind, selectedScope?.id]);

  const selectedProject = useMemo(
    () =>
      projects.find(
        (p) => (p.kind || "JOB") === (selectedScope?.kind || "JOB") && p.id === selectedScope?.id
      ) || null,
    [projects, selectedScope]
  );

  const role = summary?.role || selectedProject?.role || "client";
  const scopeKind = selectedScope?.kind || "JOB";
  const tabs = scopeKind === "ORDER" ? ORDER_TABS : JOB_TABS;

  const handleHeaderAction = async (action) => {
    if (!selectedScope) return;

    if (action === "open_brief") {
      setActiveTab("overview");
      return;
    }
    if (action === "request_review") {
      setActiveTab("delivery");
      return;
    }
    if (action === "submit_invoice") {
      // Defer to invoice flow; the dedicated route lives outside the workspace.
      const id = selectedScope.id;
      const param = scopeKind === "ORDER" ? `orderId=${id}` : `jobId=${id}`;
      window.open(`/invoices?${param}`, "_blank", "noopener");
      return;
    }

    // Per-kind status transition map. Job statuses live in JobStatus, orders
    // in OrderStatus; the backend's allowed-transition gate rejects
    // anything illegal, so we just send the labels here.
    const jobStatusFor = {
      complete: "COMPLETED",
      pause: "PAUSED",
      cancel: "CANCELLED",
    };
    const orderStatusFor = {
      cancel: "CANCELLED",
      accept: "ACCEPTED",
      start: "CURRENT",
    };

    const statusFor =
      scopeKind === "ORDER" ? orderStatusFor[action] : jobStatusFor[action];

    if (!statusFor) return;

    if (action === "cancel") {
      const verb = scopeKind === "ORDER" ? "Cancel this order?" : "Cancel this project?";
      if (!confirm(`${verb} This action cannot be undone.`)) return;
    }

    setSavingAction(true);
    try {
      const path =
        scopeKind === "ORDER"
          ? `/workspace/orders/${selectedScope.id}/status`
          : `/workspace/projects/${selectedScope.id}/status`;
      await axiosInstance.post(path, { status: statusFor });
      await Promise.all([refreshProjects(), refreshSummary()]);
    } catch (e) {
      console.error("action failed", e);
      toast.error(e?.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setSavingAction(false);
    }
  };

  // Scope objects we pass to children. Each child is told which axis its API
  // calls should hit (jobId for JOB, orderId for ORDER) so the same components
  // don't have to fork.
  const childScope = selectedScope ? { ...selectedScope } : null;
  const filesReadOnly =
    scopeKind === "JOB"
      ? summary?.job?.status === "COMPLETED"
      : summary?.order?.status === "COMPLETED";

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <ProjectSidebar
        projects={projects}
        counts={projectCounts}
        selectedScope={selectedScope}
        loading={projectsLoading}
        onSelect={(p) => setSelectedScope({ kind: p.kind || "JOB", id: p.id })}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <main className="flex-1 flex min-w-0">
        {!selectedScope ? (
          <EmptyWorkspace error={projectsError} onRetry={refreshProjects} />
        ) : (
          <>
            <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-950">
              <ProjectHeader
                summary={summary}
                role={role}
                scopeKind={scopeKind}
                onAction={handleHeaderAction}
                savingAction={savingAction}
              />
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
              <div className="flex-1 overflow-y-auto">
                {summaryError && !summaryLoading && !summary ? (
                  <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-700/40 dark:bg-rose-900/20">
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">{summaryError}</p>
                    <button
                      type="button"
                      onClick={refreshSummary}
                      className="mt-3 inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : summaryLoading && !summary ? (
                  <SummarySkeleton />
                ) : activeTab === "overview" ? (
                  <OverviewTab summary={summary} role={role} scopeKind={scopeKind} />
                ) : activeTab === "files" ? (
                  <FilesTab
                    scope={childScope}
                    role={role}
                    readOnly={filesReadOnly}
                    onChanged={refreshSummary}
                  />
                ) : activeTab === "milestones" && scopeKind === "JOB" ? (
                  <MilestonesTab
                    jobId={selectedScope.id}
                    role={role}
                    openReviewCount={Number(summary?.openReviewCount ?? summary?.counts?.openReviewComments ?? 0)}
                    onChanged={refreshSummary}
                  />
                ) : activeTab === "revisions" && scopeKind === "ORDER" ? (
                  <RevisionsTab
                    order={summary?.order}
                    role={role}
                    openReviewCount={Number(summary?.openReviewCount ?? summary?.counts?.openReviewComments ?? 0)}
                  />
                ) : activeTab === "delivery" ? (
                  <DeliveryPanel
                    scopeType={scopeKind}
                    scopeId={selectedScope.id}
                    role={role}
                    openReviewCount={Number(summary?.openReviewCount ?? summary?.counts?.openReviewComments ?? 0)}
                    availableFiles={summary?.files || []}
                    onChanged={() => Promise.all([refreshProjects(), refreshSummary()])}
                  />
                ) : activeTab === "activity" ? (
                  <ActivityTab summary={summary} />
                ) : null}
              </div>

              {/* Mobile chat toggle */}
              <button
                type="button"
                onClick={() => setChatOpenMobile(true)}
                className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center"
                aria-label="Open chat"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
            </section>

            <div className="hidden lg:flex w-96 flex-shrink-0">
              <ChatRail
                scope={childScope}
                peer={summary?.peer}
                role={role}
              />
            </div>
          </>
        )}
      </main>

      {chatOpenMobile && selectedScope && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex">
          <div className="ml-auto h-full w-full max-w-md bg-white dark:bg-gray-900 flex flex-col">
            <button
              type="button"
              onClick={() => setChatOpenMobile(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 dark:bg-gray-800 z-10"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
            <ChatRail
              scope={childScope}
              peer={summary?.peer}
              role={role}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Tabs({ tabs, activeTab, onChange }) {
  return (
    <nav className="flex items-center gap-1 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

function EmptyWorkspace({ error, onRetry }) {
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-4">
            <Folder className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Could not load your projects</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-md p-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
          <Folder className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Welcome to your workspace</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select a project or gig order from the sidebar to start collaborating.
          Custom jobs and gig orders live side-by-side here so you can chat,
          share files, track milestones or revisions, and deliver — all in one
          place.
        </p>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-32 bg-white dark:bg-gray-900 rounded-2xl" />
        <div className="h-32 bg-white dark:bg-gray-900 rounded-2xl" />
      </div>
      <div className="h-48 bg-white dark:bg-gray-900 rounded-2xl" />
      <div className="h-32 bg-white dark:bg-gray-900 rounded-2xl" />
    </div>
  );
}
