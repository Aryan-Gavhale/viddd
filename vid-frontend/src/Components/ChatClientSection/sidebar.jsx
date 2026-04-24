
import { useState, memo } from "react"
import { ChevronLeft, ChevronRight, ChevronDown, Folder } from 'lucide-react'
import { getStatusColor, formatDistanceToNow } from "./client-workspace"

export const ProjectSidebar = memo(function ProjectSidebar({
  collapsed,
  onToggleCollapse,
  activeJobs,
  completedJobs,
  selectedJobId,
  onSelectJob,
  filter,
  onFilterChange,
}) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const filterOptions = [
    { id: "all", label: "All Projects", count: activeJobs.length + completedJobs.length },
    { id: "active", label: "In Progress", count: activeJobs.length },
    { id: "completed", label: "Completed", count: completedJobs.length },
  ]

  const getFilteredJobs = () => {
    switch (filter) {
      case "active":
        return activeJobs
      case "completed":
        return completedJobs
      default:
        return [...activeJobs, ...completedJobs]
    }
  }

  const getProjectProgress = (job) => {
    // Mock progress calculation - you can replace with actual logic
    if (job.status === "COMPLETED") return 100
    if (job.status === "IN_PROGRESS") return Math.floor(Math.random() * 60) + 30
    return Math.floor(Math.random() * 30) + 10
  }

  const currentFilter = filterOptions.find(f => f.id === filter)

  return (
    <div
      className={`${collapsed ? "w-16" : "w-80"} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 overflow-hidden`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Workspace</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your projects</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-900 dark:text-white">{currentFilter?.label}</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {currentFilter?.count}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {showFilterDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onFilterChange(option.id)
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      filter === option.id ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                    }`}
                  >
                    <span className={`font-medium ${
                      filter === option.id 
                        ? "text-indigo-700 dark:text-indigo-300" 
                        : "text-gray-900 dark:text-white"
                    }`}>
                      {option.label}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      filter === option.id
                        ? "bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}>
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-hidden">
        {collapsed ? (
          <div className="p-2 space-y-2 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {getFilteredJobs()
              .slice(0, 8)
              .map((job) => (
                <button
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className={`w-full p-2 rounded-lg transition-colors relative group ${
                    selectedJobId === job.id
                      ? "bg-indigo-50 dark:bg-indigo-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  title={job.title}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        src={job.freelancer?.profilePicture || "/placeholder.svg?height=32&width=32"}
                        alt={job.freelancer?.firstname || "Freelancer"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`}></div>
                  </div>
                </button>
              ))}
          </div>
        ) : (
          <div className="p-4 space-y-3 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {getFilteredJobs().length === 0 ? (
              <div className="text-center py-8">
                <Folder className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No projects found</p>
              </div>
            ) : (
              getFilteredJobs().map((job) => {
                const progress = getProjectProgress(job)
                return (
                  <button
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className={`w-full p-4 rounded-xl border transition-all hover:shadow-md ${
                      selectedJobId === job.id
                        ? "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={job.freelancer?.profilePicture || "/placeholder.svg?height=40&width=40"}
                          alt={job.freelancer?.firstname || "Freelancer"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{job.title}</h3>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)} flex-shrink-0`}></div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">
                          {job.freelancer ? `${job.freelancer.firstname} ${job.freelancer.lastname}` : "Unassigned"}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                progress === 100 
                                  ? "bg-emerald-500" 
                                  : progress > 50 
                                    ? "bg-blue-500" 
                                    : "bg-amber-500"
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDistanceToNow(job.createdAt)}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              job.status.toLowerCase() === "completed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : job.status.toLowerCase() === "in progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
});
