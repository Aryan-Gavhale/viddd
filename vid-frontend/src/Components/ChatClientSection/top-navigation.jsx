"use client"

import { useState } from "react"
import { ChevronDown, Bell, Settings, User, Search } from "lucide-react"
import { getStatusClasses } from "./client-workspace"

export function TopNavigation({ selectedJob, onJobSelect, allJobs }) {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [notifications] = useState(3) // Mock notification count

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 relative z-50">
      {/* Left Section */}
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">VidLancing</h1>
        </div>

        {/* Project Selector */}
        {selectedJob && (
          <div className="relative">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center space-x-3 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedJob.status)}`}></div>
                <span className="font-medium text-gray-900 dark:text-white max-w-48 truncate">{selectedJob.title}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {showProjectDropdown && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 max-h-96 overflow-y-auto">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {allJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      onJobSelect(job)
                      setShowProjectDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 ${
                      selectedJob.id === job.id ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{job.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {job.freelancer ? `${job.freelancer.firstname} ${job.freelancer.lastname}` : "Unassigned"}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusClasses(job.status)}`}>
                      {job.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        {selectedJob && (
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusClasses(selectedJob.status)}`}>
            {selectedJob.status}
          </span>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>

        {/* Settings */}
        <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showProfileDropdown && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-white">Your Name</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Profile Settings
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Billing
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function getStatusColor(status) {
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
