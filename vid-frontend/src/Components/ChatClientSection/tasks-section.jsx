import { CheckCircle, Circle, Clock, AlertCircle } from "lucide-react"

export function TaskBoard({ job }) {
  // Mock task data
  const tasks = job?.tasks || [
    {
      id: 1,
      title: "Color correction and grading",
      status: "completed",
      priority: "high",
      dueDate: "2024-01-15",
      assignee: "John Doe",
      description: "Apply color correction and professional grading to all footage",
    },
    {
      id: 2,
      title: "Audio mixing and sound design",
      status: "in_progress",
      priority: "high",
      dueDate: "2024-01-16",
      assignee: "John Doe",
      description: "Mix audio tracks and add sound effects",
    },
    {
      id: 3,
      title: "Final export and delivery",
      status: "pending",
      priority: "medium",
      dueDate: "2024-01-18",
      assignee: "John Doe",
      description: "Export final video in required formats",
    },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-500" />
      case "pending":
        return <Circle className="w-5 h-5 text-gray-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-amber-500" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const tasksByStatus = {
    pending: tasks.filter((task) => task.status === "pending"),
    in_progress: tasks.filter((task) => task.status === "in_progress"),
    completed: tasks.filter((task) => task.status === "completed"),
  }

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Task Progress</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Track deliverables and milestones</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Pending Tasks */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Circle className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Pending ({tasksByStatus.pending.length})</h3>
            </div>
            <div className="space-y-3">
              {tasksByStatus.pending.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    <span>{task.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress Tasks */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                In Progress ({tasksByStatus.in_progress.length})
              </h3>
            </div>
            <div className="space-y-3">
              {tasksByStatus.in_progress.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    <span>{task.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completed Tasks */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                Completed ({tasksByStatus.completed.length})
              </h3>
            </div>
            <div className="space-y-3">
              {tasksByStatus.completed.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{task.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Completed: {new Date(task.dueDate).toLocaleDateString()}</span>
                    <span>{task.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
