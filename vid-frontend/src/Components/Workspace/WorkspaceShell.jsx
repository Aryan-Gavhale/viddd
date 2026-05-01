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
} from "lucide-react";
import axiosInstance from "../../utils/axios.js";
import { ProjectSidebar } from "./ProjectSidebar.jsx";
import { ProjectHeader } from "./ProjectHeader.jsx";
import { OverviewTab } from "./OverviewTab.jsx";
import { FilesTab } from "./FilesTab.jsx";
import { MilestonesTab } from "./MilestonesTab.jsx";
import { ActivityTab } from "./ActivityTab.jsx";
import { ChatRail } from "./ChatRail.jsx";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "milestones", label: "Milestones", icon: CheckSquare },
  { id: "activity", label: "Activity", icon: Activity },
];

export default function WorkspaceShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialJobId = searchParams.get("jobId") || searchParams.get("projectId");

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(
    initialJobId ? Number(initialJobId) : null
  );
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [chatOpenMobile, setChatOpenMobile] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // Fetch project list
  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await axiosInstance.get("/workspace/projects");
      const list = res.data?.data?.projects || [];
      setProjects(list);
      if (!selectedJobId && list.length > 0) {
        setSelectedJobId(list[0].id);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setProjectsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch summary for selected project
  const refreshSummary = useCallback(async () => {
    if (!selectedJobId) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const res = await axiosInstance.get(`/workspace/projects/${selectedJobId}`);
      setSummary(res.data?.data || null);
    } catch (e) {
      console.error("Failed to load summary", e);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    refreshSummary();
    // mark messages as read for this project
    if (selectedJobId) {
      axiosInstance
        .post(`/workspace/projects/${selectedJobId}/read`)
        .catch(() => {});
    }
  }, [selectedJobId, refreshSummary]);

  // sync URL with selection
  useEffect(() => {
    if (selectedJobId && String(searchParams.get("jobId")) !== String(selectedJobId)) {
      const next = new URLSearchParams(searchParams);
      next.set("jobId", String(selectedJobId));
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedJobId) || null,
    [projects, selectedJobId]
  );

  const role = summary?.role || selectedProject?.role || "client";

  const handleHeaderAction = async (action) => {
    if (!selectedJobId) return;

    if (action === "open_brief") {
      setActiveTab("overview");
      return;
    }
    if (action === "request_review") {
      setActiveTab("files");
      return;
    }
    if (action === "submit_invoice") {
      // Defer to invoice flow; the dedicated route lives outside the workspace.
      window.open(`/invoices?jobId=${selectedJobId}`, "_blank", "noopener");
      return;
    }

    const statusFor = {
      complete: "COMPLETED",
      pause: "PAUSED",
      cancel: "CANCELLED",
    }[action];

    if (!statusFor) return;

    if (action === "cancel" && !confirm("Cancel this project? This action cannot be undone.")) {
      return;
    }

    setSavingAction(true);
    try {
      await axiosInstance.post(`/workspace/projects/${selectedJobId}/status`, {
        status: statusFor,
      });
      await Promise.all([refreshProjects(), refreshSummary()]);
    } catch (e) {
      console.error("action failed", e);
      // eslint-disable-next-line no-alert
      alert(e?.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <ProjectSidebar
        projects={projects}
        selectedJobId={selectedJobId}
        loading={projectsLoading}
        onSelect={(p) => setSelectedJobId(p.id)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <main className="flex-1 flex min-w-0">
        {!selectedJobId ? (
          <EmptyWorkspace />
        ) : (
          <>
            <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-950">
              <ProjectHeader
                summary={summary}
                role={role}
                onAction={handleHeaderAction}
                savingAction={savingAction}
              />
              <Tabs activeTab={activeTab} onChange={setActiveTab} />
              <div className="flex-1 overflow-y-auto">
                {summaryLoading && !summary ? (
                  <SummarySkeleton />
                ) : activeTab === "overview" ? (
                  <OverviewTab summary={summary} role={role} />
                ) : activeTab === "files" ? (
                  <FilesTab jobId={selectedJobId} role={role} onChanged={refreshSummary} />
                ) : activeTab === "milestones" ? (
                  <MilestonesTab jobId={selectedJobId} role={role} onChanged={refreshSummary} />
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
                jobId={selectedJobId}
                peer={summary?.peer}
                role={role}
              />
            </div>
          </>
        )}
      </main>

      {chatOpenMobile && selectedJobId && (
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
              jobId={selectedJobId}
              peer={summary?.peer}
              role={role}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Tabs({ activeTab, onChange }) {
  return (
    <nav className="flex items-center gap-1 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
      {TABS.map((t) => {
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

function EmptyWorkspace() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-md p-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
          <Folder className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Welcome to your workspace</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select a project from the sidebar to start collaborating. You'll be
          able to chat, share files, track milestones and more — all in one
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
