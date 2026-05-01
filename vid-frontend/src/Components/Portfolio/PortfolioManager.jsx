import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Pencil, Trash2, Eye, BarChart2, Play, Loader2, X, Clapperboard } from "lucide-react"
import { toast } from "react-toastify"
import axiosInstance from "../../utils/axios"

const CATEGORIES = ["Advertising", "YouTube", "Corporate", "Gaming", "Music", "Family"]

const emptyForm = { title: "", description: "", videoUrl: "", category: "" }

export default function PortfolioManager() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [popular, setPopular] = useState([])
  const [videos, setVideos] = useState([])

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "" })
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: body } = await axiosInstance.get("/portfolios/stats")
      const p = body?.data
      if (p) {
        setMetrics(p.metrics || [])
        setPopular(p.popular || [])
        setVideos(p.videos || [])
      }
    } catch (e) {
      console.error(e)
      toast.error(e.response?.data?.message || "Failed to load portfolio")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.videoUrl?.trim()) {
      toast.error("Video URL is required")
      return
    }
    setSaving(true)
    try {
      await axiosInstance.post("/portfolios", {
        title: form.title || undefined,
        description: form.description || undefined,
        videoUrl: form.videoUrl.trim(),
        category: form.category || undefined,
      })
      toast.success("Video added to portfolio")
      setForm(emptyForm)
      void load()
    } catch (e) {
      const msg = e.response?.data?.message || (Array.isArray(e.response?.data?.errors) && e.response.data.errors[0]) || "Failed to add"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (v) => {
    setEditing(v)
    setEditForm({
      title: v.title || "",
      description: v.description || "",
      category: v.category || "",
    })
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      await axiosInstance.put(`/portfolios/${editing.id}`, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
      })
      toast.success("Video updated")
      setEditing(null)
      void load()
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = (v) => {
    setDeleting(v)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await axiosInstance.delete(`/portfolios/${deleting.id}`)
      toast.success("Video removed from portfolio")
      setDeleting(null)
      void load()
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed")
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Clapperboard className="h-7 w-7 text-purple-600" />
              Portfolio manager
            </h1>
            <p className="text-slate-600">Add, edit, or remove videos from your public showcase.</p>
          </div>
        </div>

        {metrics.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {metrics.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <BarChart2 className="h-4 w-4" />
                  {m.name}
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {popular.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Top 3 by views</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {popular.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-purple-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                    <Play className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{p.title}</p>
                    <p className="text-xs text-slate-500">
                      {p.views} views · {p.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add a video</h2>
          <form onSubmit={handleAdd} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Title</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-purple-500 focus:ring-purple-500"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="E.g. Brand launch reel 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-purple-500 focus:ring-purple-500"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short summary for clients"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Video URL *</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-purple-500 focus:ring-purple-500"
                value={form.videoUrl}
                onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Category</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-purple-500 focus:ring-purple-500"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">Select category (optional)</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to portfolio
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your videos ({videos.length})</h2>
          {videos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
              No videos yet — add your first one above.
            </p>
          ) : (
            <ul className="space-y-3">
              {videos.map((v) => (
                <motion.li
                  key={v.id}
                  layout
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{v.title || "Untitled"}</p>
                    {v.category && <span className="mt-1 inline-block text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{v.category}</span>}
                    {v.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{v.description}</p>}
                    <a
                      href={v.videoUrl}
                      className="mt-1 block truncate text-xs text-purple-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {v.videoUrl}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                      <Eye className="h-4 w-4" />
                      {v.views != null ? Number(v.views).toLocaleString() : "0"} views
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(v)}
                      className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Edit video</h3>
                <button type="button" onClick={() => setEditing(null)} className="rounded p-1 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Title</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Category</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">—</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleting && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setDeleting(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
            >
              <p className="text-slate-800 font-medium">Delete this video from your portfolio?</p>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{deleting.title}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteBusy}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteBusy ? "…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
