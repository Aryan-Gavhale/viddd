import { useState, useEffect } from "react"
import { TopNavigation } from "./top-navigation"
import { ProjectSidebar } from "./sidebar"
import { MainPanel } from "./main-panel"
import { ChatTimeline } from "./chat-timeline"
import axiosInstance from "../../utils/axios"

// Utility functions
export function formatDistanceToNow(date) {
  const now = new Date()
  const diff = Math.abs(now - new Date(date))
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  return "just now"
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export function getStatusClasses(status) {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
    case "in progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    case "needs review":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
  }
}

export function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-emerald-500"
    case "in progress":
      return "bg-blue-500"
    case "needs review":
      return "bg-amber-500"
    default:
      return "bg-gray-500"
  }
}

export function ClientWorkspace() {
  const [selectedJob, setSelectedJob] = useState(null)
  const [activeJobs, setActiveJobs] = useState([])
  const [completedJobs, setCompletedJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [projectFilter, setProjectFilter] = useState("all")
  
  // Mobile-specific state
  const [activeView, setActiveView] = useState("projects") // "projects", "main", "chat"
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get("/jobs")
        const jobs = response.data.data.jobs || []

        const active = jobs.filter((job) => job.status !== "COMPLETED" && job.freelancer)
        const completed = jobs.filter((job) => job.status === "COMPLETED")

        setActiveJobs(active)
        setCompletedJobs(completed)

        if (active.length > 0 && !selectedJob) {
          setSelectedJob(active[0])
        }
      } catch (err) {
        console.error("Error fetching jobs:", err)
        setError("Failed to load jobs. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  const handleJobSelect = (job) => {
    setSelectedJob(job)
    if (isMobile) {
      setActiveView("main")
    }
  }

  const MobileNavigation = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex">
        <button
          onClick={() => setActiveView("projects")}
          className={`flex-1 py-3 px-4 text-center ${
            activeView === "projects"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <div className="text-xl mb-1">📁</div>
          <div className="text-xs">Projects</div>
        </button>
        <button
          onClick={() => setActiveView("main")}
          disabled={!selectedJob}
          className={`flex-1 py-3 px-4 text-center ${
            activeView === "main"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
              : "text-gray-600 dark:text-gray-400"
          } ${!selectedJob ? "opacity-50" : ""}`}
        >
          <div className="text-xl mb-1">📋</div>
          <div className="text-xs">Details</div>
        </button>
        <button
          onClick={() => setActiveView("chat")}
          disabled={!selectedJob}
          className={`flex-1 py-3 px-4 text-center ${
            activeView === "chat"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
              : "text-gray-600 dark:text-gray-400"
          } ${!selectedJob ? "opacity-50" : ""}`}
        >
          <div className="text-xl mb-1">💬</div>
          <div className="text-xs">Chat</div>
        </button>
      </div>
    </div>
  )

  const MobileHeader = () => (
    <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {activeView === "projects" && "Projects"}
          {activeView === "main" && (selectedJob ? selectedJob.title : "Project Details")}
          {activeView === "chat" && "Chat & Timeline"}
        </h1>
        {(activeView === "main" || activeView === "chat") && (
          <button
            onClick={() => setActiveView("projects")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900 px-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
        <MobileHeader />
        
        <div className="flex-1 overflow-hidden pb-16">
          {/* Projects View */}
          {activeView === "projects" && (
            <div className="h-full overflow-hidden">
              <ProjectSidebar
                collapsed={false}
                onToggleCollapse={() => {}}
                activeJobs={activeJobs}
                completedJobs={completedJobs}
                selectedJobId={selectedJob?.id}
                onSelectJob={handleJobSelect}
                filter={projectFilter}
                onFilterChange={setProjectFilter}
                className="h-full"
              />
            </div>
          )}

          {/* Main Panel View */}
          {activeView === "main" && (
            <div className="h-full overflow-hidden">
              {selectedJob ? (
                <MainPanel job={selectedJob} />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
                  <div className="text-center">
                    <div className="text-gray-400 text-6xl mb-4">📁</div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No project selected</h2>
                    <p className="text-gray-600 dark:text-gray-400">Choose a project to get started</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat View */}
          {activeView === "chat" && (
            <div className="h-full overflow-hidden">
              {selectedJob ? (
                <ChatTimeline job={selectedJob} />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-4">
                  <div className="text-center">
                    <div className="text-gray-400 text-6xl mb-4">💬</div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No project selected</h2>
                    <p className="text-gray-600 dark:text-gray-400">Choose a project to view chat</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <MobileNavigation />
      </div>
    )
  }

  // Desktop Layout (unchanged)
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {/* Top Navigation */}
      {/* <TopNavigation /> */}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <ProjectSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeJobs={activeJobs}
          completedJobs={completedJobs}
          selectedJobId={selectedJob?.id}
          onSelectJob={handleJobSelect}
          filter={projectFilter}
          onFilterChange={setProjectFilter}
        />

        {/* Main Content */}
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {selectedJob ? (
            <>
              {/* Center Panel - Fixed */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <MainPanel job={selectedJob} />
              </div>

              {/* Right Sidebar - Chat & Timeline - Fixed */}
              <div className="w-96 flex-shrink-0 overflow-hidden">
                <ChatTimeline job={selectedJob} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <div className="text-center">
                <div className="text-gray-400 text-6xl mb-4">📁</div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No project selected</h2>
                <p className="text-gray-600 dark:text-gray-400">Choose a project from the sidebar to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}