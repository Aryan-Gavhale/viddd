import { formatDate, formatCurrency } from "./client-workspace"

export function SummarySection({ job }) {
  // Add default values for job properties
  const freelancer = job?.freelancer || {}
  const status = job?.status || 'Pending'
  const budget = job?.budget || { min: 0, max: 0 }
  const deadline = job?.deadline ? new Date(job.deadline) : new Date()
  const estimatedHours = job?.estimatedHours || 0
  const progress = job?.progress || 0

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Freelancer Info */}
      <div className="flex items-center gap-4">
        <img
          src={freelancer.avatar || "/placeholder.svg"}
          alt={freelancer.firstname || "Freelancer"}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {freelancer.firstname || "Not Assigned"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {freelancer.role || "Video Editor"}
          </p>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 7h-9" />
              <path d="M14 17H5" />
              <circle cx="17" cy="17" r="3" />
              <circle cx="7" cy="7" r="3" />
            </svg>
            <span className="text-sm">Status</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">{status}</p>
        </div>

        {/* Budget */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-sm">Budget</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">
            ${budget.min} - ${budget.max}
          </p>
        </div>

        {/* Deadline */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-sm">Deadline</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDate(deadline)}
          </p>
        </div>

        {/* Estimated Hours */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-sm">Estimated Hours</span>
          </div>
          <p className="font-medium text-gray-900 dark:text-white">{estimatedHours} hours</p>
        </div>
      </div>

      {/* Progress */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Progress</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}
