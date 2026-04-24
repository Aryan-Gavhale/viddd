import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from "./client-workspace"
import axiosInstance from "../../utils/axios"
import { toast } from 'react-toastify'
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Calendar,
  BarChart3,
  ExternalLink,
  Target,
} from "lucide-react"

const STATUS_MAP = {
  PENDING:     { label: "Pending",     cls: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  COMPLETED:   { label: "Completed",   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
}

export function TimelineSection({ job }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: ''
  })

  const fetchTimelineEvents = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(`/timeline/projects/${job.id}`)
      const data = response.data?.data || response.data || []
      setEvents(Array.isArray(data) ? data : [])
    } catch {
      // empty timeline
    } finally {
      setLoading(false)
    }
  }, [job?.id])

  useEffect(() => {
    if (job?.id) fetchTimelineEvents()
  }, [job?.id, fetchTimelineEvents])

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.startDate) {
      toast.error('Title and start date are required')
      return
    }
    try {
      if (editingEvent) {
        await axiosInstance.put(`/timeline/${editingEvent.id}`, formData)
        toast.success('Task updated')
      } else {
        await axiosInstance.post(`/timeline/projects/${job.id}`, formData)
        toast.success('Task added')
      }
      await fetchTimelineEvents()
      resetForm()
    } catch {
      toast.error('Failed to save task')
    }
  }

  const handleDelete = async (eventId) => {
    if (!confirm('Delete this timeline task?')) return
    try {
      await axiosInstance.delete(`/timeline/${eventId}`)
      toast.success('Task deleted')
      await fetchTimelineEvents()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleStatusToggle = async (event) => {
    const current = event.status || (event.isCompleted ? 'COMPLETED' : 'PENDING')
    const next = current === 'COMPLETED' ? 'PENDING' : current === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS'
    try {
      await axiosInstance.put(`/timeline/${event.id}`, {
        status: next,
        progress: next === 'COMPLETED' ? 100 : next === 'IN_PROGRESS' ? 50 : 0,
      })
      await fetchTimelineEvents()
    } catch {
      toast.error('Failed to update')
    }
  }

  const resetForm = () => {
    setFormData({ title: '', description: '', startDate: '', endDate: '' })
    setShowAddForm(false)
    setEditingEvent(null)
  }

  const startEdit = (event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : ''
    })
    setShowAddForm(true)
  }

  const getEventIcon = (event) => {
    const status = event.status || (event.isCompleted ? 'COMPLETED' : 'PENDING')
    if (status === 'COMPLETED') return <CheckCircle className="w-4 h-4 text-emerald-500" />
    if (status === 'IN_PROGRESS') return <Clock className="w-4 h-4 text-blue-500" />

    const text = `${event.title} ${event.description || ''}`.toLowerCase()
    if (text.includes('upload') || text.includes('file')) return <Upload className="w-4 h-4 text-indigo-500" />
    if (text.includes('download') || text.includes('delivery')) return <Download className="w-4 h-4 text-purple-500" />
    if (text.includes('feedback') || text.includes('review')) return <MessageSquare className="w-4 h-4 text-amber-500" />
    return <Clock className="w-4 h-4 text-slate-400" />
  }

  const getEventBorder = (event) => {
    const status = event.status || (event.isCompleted ? 'COMPLETED' : 'PENDING')
    if (status === 'COMPLETED') return "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10"
    if (status === 'IN_PROGRESS') return "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10"

    const now = new Date()
    const endDate = event.endDate ? new Date(event.endDate) : null
    if (endDate && endDate < now) return "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10"
    return "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50"
  }

  const completedCount = events.filter((e) => e.status === 'COMPLETED' || e.isCompleted).length
  const overallPct = events.length > 0 ? Math.round((completedCount / events.length) * 100) : 0

  if (loading) {
    return (
      <div className="h-full p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3 dark:bg-slate-700" />
          <div className="h-3 bg-slate-200 rounded w-2/3 dark:bg-slate-700" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-4">
              <div className="w-10 h-10 bg-slate-200 rounded-full dark:bg-slate-700" />
              <div className="flex-1 bg-slate-200 rounded-lg h-16 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-0.5">Project Timeline</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {events.length} task{events.length !== 1 && 's'} &middot; {overallPct}% complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          {job?.id && (
            <Link
              to={`/project-timeline/${job.id}`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
              title="Open full Gantt view"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Gantt
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </button>
        </div>
      </div>

      {/* Overall progress bar */}
      {events.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <Target className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{overallPct}%</span>
        </div>
      )}

      {/* Add/Edit form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm text-slate-900 dark:text-white">
              {editingEvent ? 'Edit Task' : 'New Task'}
            </h4>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:bg-slate-900 dark:text-white"
            />
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:bg-slate-900 dark:text-white resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={handleSubmit} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                <Save className="w-3.5 h-3.5 mr-1 inline" />
                {editingEvent ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      {events.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No tasks yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Add your first task to track progress
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-3">
            {events.map((event) => {
              const status = event.status || (event.isCompleted ? 'COMPLETED' : 'PENDING')
              const st = STATUS_MAP[status] || STATUS_MAP.PENDING
              const progress = event.progress ?? (event.isCompleted ? 100 : 0)

              return (
                <div key={event.id} className="relative flex items-start space-x-3 group">
                  <button
                    onClick={() => handleStatusToggle(event)}
                    className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition shrink-0"
                    title="Toggle status"
                  >
                    {getEventIcon(event)}
                  </button>

                  <div className={`flex-1 p-3 rounded-xl border ${getEventBorder(event)} min-h-[48px] relative`}>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => startEdit(event)} className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-start justify-between mb-1 pr-14">
                      <h4 className={`font-medium text-sm ${status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {event.title}
                      </h4>
                      <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>

                    {event.description && (
                      <p className={`text-xs mb-1.5 ${status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      {event.startDate && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3 inline mr-0.5" />
                          {formatDate(event.startDate)}
                          {event.endDate && ` → ${formatDate(event.endDate)}`}
                        </span>
                      )}
                    </div>

                    {/* Inline progress */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-slate-200 dark:bg-slate-600">
                        <div
                          className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">{progress}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
