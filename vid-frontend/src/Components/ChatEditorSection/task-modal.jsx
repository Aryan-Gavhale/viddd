"use client"

import { useState } from "react"
import { X, Plus, Calendar, DollarSign, Clock, Lightbulb } from "lucide-react"

export default function TaskModal({ onClose, onSave }) {
  const [task, setTask] = useState({
    id: `task-${Date.now()}`,
    name: "",
    status: "Pending",
    hours: 0,
    cost: 0,
    dueDate: new Date().toISOString().split("T")[0],
  })

  const [suggestions] = useState([
    { name: "Color Grading", hours: 2, cost: 100 },
    { name: "Sound Design", hours: 3, cost: 150 },
    { name: "Motion Graphics", hours: 4, cost: 200 },
    { name: "Video Editing", hours: 6, cost: 300 },
    { name: "Audio Mixing", hours: 2, cost: 120 },
  ])

  const handleChange = (e) => {
    const { name, value } = e.target
    setTask({
      ...task,
      [name]: value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(task)
  }

  const applySuggestion = (suggestion) => {
    setTask({
      ...task,
      name: suggestion.name,
      hours: suggestion.hours,
      cost: suggestion.cost,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add New Task</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Task Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Task Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={task.name}
                onChange={handleChange}
                required
                placeholder="Enter task name..."
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Hours and Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="hours" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Hours
                </label>
                <input
                  type="number"
                  id="hours"
                  name="hours"
                  value={task.hours}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  required
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="cost" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Cost
                </label>
                <input
                  type="number"
                  id="cost"
                  name="cost"
                  value={task.cost}
                  onChange={handleChange}
                  min="0"
                  required
                  placeholder="0"
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={task.dueDate}
                onChange={handleChange}
                required
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* AI Suggestions */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                <Lightbulb className="w-4 h-4 inline mr-1" />
                Quick Suggestions
              </label>
              <div className="grid grid-cols-1 gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="text-left p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-700 transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{suggestion.name}</span>
                      <span className="text-sm opacity-75">
                        {suggestion.hours}h • ${suggestion.cost}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
