import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import axiosInstance from "../../utils/axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  Plus, X, Save, Trash2, Edit2, ChevronLeft, ChevronRight,
  Calendar, Clock, CheckCircle, AlertCircle, ArrowRight,
  Grip, Target, BarChart3, Flag,
} from "lucide-react";

const STATUS_CONFIG = {
  PENDING:     { label: "Pending",     color: "bg-slate-400",  text: "text-slate-700 dark:text-slate-300",  bg: "bg-slate-100 dark:bg-slate-800" },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500",   text: "text-blue-700 dark:text-blue-300",   bg: "bg-blue-50 dark:bg-blue-900/30" },
  COMPLETED:   { label: "Completed",   color: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
};

const BAR_COLORS = [
  "from-indigo-500 to-blue-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-green-500",
  "from-sky-500 to-blue-400",
  "from-fuchsia-500 to-pink-400",
];

function daysBetween(a, b) {
  return Math.ceil((new Date(b) - new Date(a)) / 86400000);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(d) {
  return new Date(d).toISOString().split("T")[0];
}

function fmtShort(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function GanttTimeline() {
  const { jobId } = useParams();
  const user = useSelector(selectUser);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [viewOffset, setViewOffset] = useState(0);
  const scrollRef = useRef(null);

  const [form, setForm] = useState({
    title: "", description: "", startDate: "", endDate: "",
    color: "", dependsOnId: null,
  });

  const fetchItems = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/timeline/projects/${jobId}`);
      const data = res.data?.data || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const { timelineStart, timelineEnd, totalDays, columns } = useMemo(() => {
    if (items.length === 0) {
      const today = new Date();
      const start = addDays(today, -7);
      const end = addDays(today, 30);
      return { timelineStart: start, timelineEnd: end, totalDays: 37, columns: buildColumns(start, end) };
    }

    const dates = items.flatMap((item) => {
      const d = [];
      if (item.startDate) d.push(new Date(item.startDate));
      if (item.endDate) d.push(new Date(item.endDate));
      return d;
    }).filter((d) => !isNaN(d));

    if (dates.length === 0) {
      const today = new Date();
      const start = addDays(today, -7);
      const end = addDays(today, 30);
      return { timelineStart: start, timelineEnd: end, totalDays: 37, columns: buildColumns(start, end) };
    }

    const minD = new Date(Math.min(...dates));
    const maxD = new Date(Math.max(...dates));
    const start = addDays(minD, -3);
    const end = addDays(maxD, 7);
    const total = daysBetween(start, end);
    return { timelineStart: start, timelineEnd: end, totalDays: Math.max(total, 14), columns: buildColumns(start, end) };
  }, [items]);

  function buildColumns(start, end) {
    const cols = [];
    const d = new Date(start);
    while (d <= end) {
      cols.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return cols;
  }

  const todayOffset = useMemo(() => {
    const d = daysBetween(timelineStart, new Date());
    return Math.max(0, Math.min(totalDays, d));
  }, [timelineStart, totalDays]);

  const getBarStyle = (item) => {
    if (!item.startDate) return null;
    const start = daysBetween(timelineStart, new Date(item.startDate));
    const end = item.endDate
      ? daysBetween(timelineStart, new Date(item.endDate))
      : start + 1;
    const leftPct = (start / totalDays) * 100;
    const widthPct = Math.max(((end - start) / totalDays) * 100, 1.5);
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  const resetForm = () => {
    setForm({ title: "", description: "", startDate: "", endDate: "", color: "", dependsOnId: null });
    setShowForm(false);
    setEditingItem(null);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      startDate: item.startDate ? toDateStr(item.startDate) : "",
      endDate: item.endDate ? toDateStr(item.endDate) : "",
      color: item.color || "",
      dependsOnId: item.dependsOnId || null,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editingItem) {
        await axiosInstance.put(`/timeline/${editingItem.id}`, form);
        toast.success("Task updated");
      } else {
        await axiosInstance.post(`/timeline/projects/${jobId}`, form);
        toast.success("Task added");
      }
      resetForm();
      await fetchItems();
    } catch {
      toast.error("Failed to save task");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;
    try {
      await axiosInstance.delete(`/timeline/${id}`);
      toast.success("Task deleted");
      await fetchItems();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleStatusToggle = async (item) => {
    const nextStatus = item.status === "COMPLETED" ? "PENDING"
      : item.status === "IN_PROGRESS" ? "COMPLETED" : "IN_PROGRESS";
    const nextProgress = nextStatus === "COMPLETED" ? 100 : nextStatus === "IN_PROGRESS" ? 50 : 0;
    try {
      await axiosInstance.put(`/timeline/${item.id}`, {
        status: nextStatus,
        progress: nextProgress,
      });
      await fetchItems();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleProgressChange = async (item, progress) => {
    try {
      const status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "PENDING";
      await axiosInstance.put(`/timeline/${item.id}`, { progress, status });
      await fetchItems();
    } catch {
      toast.error("Failed to update progress");
    }
  };

  const completedCount = items.filter((i) => i.status === "COMPLETED" || i.isCompleted).length;
  const overallProgress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const COL_WIDTH = 40;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-96 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-8 h-96 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <BarChart3 className="h-6 w-6 text-indigo-500" />
              Project Timeline
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Job #{jobId} &middot; {items.length} task{items.length !== 1 && "s"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Overall progress */}
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm dark:bg-slate-800">
              <Target className="h-4 w-4 text-indigo-500" />
              <div className="w-24">
                <div className="mb-0.5 flex items-center justify-between text-xs text-slate-500">
                  <span>Progress</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{overallProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {editingItem ? "Edit Task" : "New Task"}
                  </h3>
                  <button onClick={resetForm} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      placeholder="e.g. Rough Cut Review"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      placeholder="What needs to be done?"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  {items.length > 0 && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Depends On</label>
                      <select
                        value={form.dependsOnId || ""}
                        onChange={(e) => setForm({ ...form, dependsOnId: e.target.value ? Number(e.target.value) : null })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">None</option>
                        {items
                          .filter((i) => i.id !== editingItem?.id)
                          .map((i) => (
                            <option key={i.id} value={i.id}>{i.title}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button onClick={handleSubmit} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700">
                    <Save className="mr-1.5 inline h-4 w-4" />
                    {editingItem ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center dark:border-slate-600 dark:bg-slate-900">
            <Calendar className="mx-auto mb-4 h-14 w-14 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No tasks yet</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Add your first task to start building the project timeline
            </p>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Add First Task
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {/* Stat badges */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-3 dark:border-slate-700">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const cnt = items.filter((i) => (i.status || "PENDING") === key).length;
                return (
                  <span key={key} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                    <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
                    {cfg.label}: {cnt}
                  </span>
                );
              })}
            </div>

            <div className="flex">
              {/* Left: task list */}
              <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-700 lg:w-80">
                {/* Column header */}
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  Tasks
                </div>
                {items.map((item, idx) => {
                  const st = STATUS_CONFIG[item.status || "PENDING"];
                  const progress = item.progress ?? (item.isCompleted ? 100 : 0);
                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center gap-2 border-b border-slate-100 px-4 py-3 transition dark:border-slate-800 ${
                        hoveredId === item.id ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{ minHeight: 52 }}
                    >
                      {/* Status dot */}
                      <button
                        onClick={() => handleStatusToggle(item)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          (item.status || "PENDING") === "COMPLETED"
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300 hover:border-indigo-400 dark:border-slate-600"
                        }`}
                        title="Toggle status"
                      >
                        {(item.status || "PENDING") === "COMPLETED" && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${
                          (item.status || "PENDING") === "COMPLETED"
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-slate-900 dark:text-white"
                        }`}>
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                          {item.startDate && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {fmtShort(item.startDate)}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full transition-all ${
                                progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-slate-500">{progress}%</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => startEdit(item)} className="rounded p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="Edit">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="rounded p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: Gantt chart */}
              <div className="flex-1 overflow-x-auto" ref={scrollRef}>
                <div style={{ minWidth: columns.length * COL_WIDTH }}>
                  {/* Date header */}
                  <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    {columns.map((d, i) => {
                      const isToday = toDateStr(d) === toDateStr(new Date());
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={`flex shrink-0 flex-col items-center justify-center border-r border-slate-100 py-1.5 dark:border-slate-800 ${
                            isToday ? "bg-indigo-50 dark:bg-indigo-900/20" : isWeekend ? "bg-slate-100/50 dark:bg-slate-800/50" : ""
                          }`}
                          style={{ width: COL_WIDTH }}
                        >
                          <span className={`text-[9px] font-medium uppercase ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}>
                            {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                          </span>
                          <span className={`text-[11px] font-semibold ${isToday ? "text-indigo-700 dark:text-indigo-300" : "text-slate-600 dark:text-slate-400"}`}>
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Gantt rows */}
                  {items.map((item, idx) => {
                    const bar = getBarStyle(item);
                    const progress = item.progress ?? (item.isCompleted ? 100 : 0);
                    const colorGrad = item.color
                      ? `from-${item.color}-500 to-${item.color}-400`
                      : BAR_COLORS[idx % BAR_COLORS.length];
                    const dependency = item.dependsOnId ? items.find((i) => i.id === item.dependsOnId) : null;

                    return (
                      <div
                        key={item.id}
                        className={`relative flex items-center border-b border-slate-100 dark:border-slate-800 ${
                          hoveredId === item.id ? "bg-indigo-50/30 dark:bg-indigo-900/5" : ""
                        }`}
                        style={{ height: 52 }}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {/* Grid columns background */}
                        <div className="absolute inset-0 flex">
                          {columns.map((d, ci) => {
                            const isToday = toDateStr(d) === toDateStr(new Date());
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                              <div
                                key={ci}
                                className={`shrink-0 border-r border-slate-50 dark:border-slate-800/50 ${
                                  isToday ? "bg-indigo-50/40 dark:bg-indigo-900/10" : isWeekend ? "bg-slate-50/50 dark:bg-slate-800/20" : ""
                                }`}
                                style={{ width: COL_WIDTH }}
                              />
                            );
                          })}
                        </div>

                        {/* Today marker */}
                        <div
                          className="absolute top-0 z-10 h-full w-0.5 bg-red-400/70"
                          style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                        />

                        {/* Bar */}
                        {bar && (
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                            className="absolute z-20 origin-left cursor-pointer"
                            style={{ ...bar, top: 10, bottom: 10 }}
                            title={`${item.title}\n${fmtShort(item.startDate)}${item.endDate ? ` → ${fmtShort(item.endDate)}` : ""}\nProgress: ${progress}%`}
                            onClick={() => startEdit(item)}
                          >
                            {/* Bar background */}
                            <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${colorGrad} opacity-20`} />
                            {/* Progress fill */}
                            <div
                              className={`absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r ${colorGrad} transition-all`}
                              style={{ width: `${progress}%` }}
                            />
                            {/* Bar border + label */}
                            <div className={`relative flex h-full items-center rounded-lg border border-current/10 px-2`}>
                              <span className="truncate text-[11px] font-semibold text-slate-900 drop-shadow-sm dark:text-white">
                                {item.title}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Dependency arrow */}
                        {dependency && (() => {
                          const depBar = getBarStyle(dependency);
                          if (!depBar || !bar) return null;
                          return (
                            <div className="pointer-events-none absolute z-10" style={{ left: bar.left, top: "50%" }}>
                              <ArrowRight className="h-3 w-3 -translate-x-4 text-slate-400 dark:text-slate-500" />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer legend */}
            <div className="flex items-center gap-4 border-t border-slate-200 px-6 py-2.5 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <div className="h-3 w-0.5 bg-red-400/70" /> Today
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <div className="h-3 w-6 rounded bg-gradient-to-r from-indigo-500 to-blue-500 opacity-40" /> Remaining
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <div className="h-3 w-6 rounded bg-gradient-to-r from-indigo-500 to-blue-500" /> Progress
              </div>
              <div className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                Click a bar to edit &middot; Click status circle to toggle
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
