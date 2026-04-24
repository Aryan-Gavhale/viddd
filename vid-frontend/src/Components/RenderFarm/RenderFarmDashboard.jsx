import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Cpu, Clock, DollarSign, Upload, X, ChevronDown,
  Zap, AlertTriangle, CheckCircle2, Loader2, Ban, Play, BarChart3,
} from "lucide-react";

const STATUS_MAP = {
  QUEUED: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock, label: "Queued" },
  RENDERING: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Loader2, label: "Rendering" },
  COMPLETED: { color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2, label: "Completed" },
  FAILED: { color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: AlertTriangle, label: "Failed" },
  CANCELLED: { color: "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400", icon: Ban, label: "Cancelled" },
};

const PRIORITY_COLORS = {
  LOW: "border-slate-300 dark:border-slate-600",
  NORMAL: "border-blue-400 dark:border-blue-500",
  HIGH: "border-orange-400 dark:border-orange-500",
};

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

const SELECT =
  "w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export default function RenderFarmDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [form, setForm] = useState({
    projectName: "", priority: "NORMAL", software: "", resolution: "1080p",
    frameRange: "", outputFormat: "MP4", estimatedMinutes: 30, inputFileUrl: "",
  });

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/render-farm/my");
      setJobs(data.data || []);
    } catch {
      toast.error("Failed to load render jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const fetchEstimate = useCallback(async () => {
    try {
      const { data } = await axiosInstance.post("/render-farm/estimate", {
        priority: form.priority, resolution: form.resolution, estimatedMinutes: form.estimatedMinutes,
      });
      setEstimate(data.data);
    } catch { /* ignore */ }
  }, [form.priority, form.resolution, form.estimatedMinutes]);

  useEffect(() => { if (showForm) fetchEstimate(); }, [showForm, fetchEstimate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axiosInstance.post("/render-farm/submit", form);
      toast.success("Render job submitted!");
      setShowForm(false);
      setForm({ projectName: "", priority: "NORMAL", software: "", resolution: "1080p", frameRange: "", outputFormat: "MP4", estimatedMinutes: 30, inputFileUrl: "" });
      fetchJobs();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await axiosInstance.post(`/render-farm/${id}/cancel`);
      toast.success("Render job cancelled");
      fetchJobs();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cancel failed");
    }
  };

  const stats = useMemo(() => ({
    total: jobs.length,
    queued: jobs.filter((j) => j.status === "QUEUED").length,
    rendering: jobs.filter((j) => j.status === "RENDERING").length,
    completed: jobs.filter((j) => j.status === "COMPLETED").length,
  }), [jobs]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Render Farm</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cloud rendering — deliver faster with GPU-accelerated exports</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl hover:shadow-indigo-500/30"
        >
          <Zap className="h-4 w-4" /> New Render Job
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Jobs", val: stats.total, icon: BarChart3, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Queued", val: stats.queued, icon: Clock, color: "text-amber-600 dark:text-amber-400" },
          { label: "Rendering", val: stats.rendering, icon: Cpu, color: "text-blue-600 dark:text-blue-400" },
          { label: "Completed", val: stats.completed, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.val}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}
              className="w-full max-w-lg overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
              style={{ maxHeight: "90vh" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Submit Render Job</h2>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Project Name *</label>
                  <input className={INPUT} value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} required placeholder="My Awesome Video" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
                    <select className={SELECT} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High (2x speed)</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Resolution</label>
                    <select className={SELECT} value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })}>
                      <option value="1080p">1080p</option><option value="1440p">1440p</option><option value="4K">4K</option><option value="8K">8K</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Software</label>
                    <input className={INPUT} value={form.software} onChange={(e) => setForm({ ...form, software: e.target.value })} placeholder="DaVinci / Premiere / After Effects" />
                  </div>
                  <div className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Output Format</label>
                    <select className={SELECT} value={form.outputFormat} onChange={(e) => setForm({ ...form, outputFormat: e.target.value })}>
                      <option value="MP4">MP4</option><option value="MOV">MOV</option><option value="AVI">AVI</option><option value="ProRes">ProRes</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Frame Range</label>
                    <input className={INPUT} value={form.frameRange} onChange={(e) => setForm({ ...form, frameRange: e.target.value })} placeholder="1-500" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Est. Duration (min)</label>
                    <input type="number" className={INPUT} value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: parseInt(e.target.value) || 30 })} min={1} max={600} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Project File URL</label>
                  <input className={INPUT} value={form.inputFileUrl} onChange={(e) => setForm({ ...form, inputFileUrl: e.target.value })} placeholder="https://s3.amazonaws.com/..." />
                </div>

                {estimate && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/30">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Estimate</p>
                    <div className="flex items-center gap-6">
                      <span className="flex items-center gap-1.5 text-sm text-indigo-800 dark:text-indigo-300">
                        <Clock className="h-4 w-4" /> ~{estimate.estimatedMinutes} min
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-indigo-800 dark:text-indigo-300">
                        <DollarSign className="h-4 w-4" /> {estimate.estimatedCost} credits
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-60">
                  {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit Job"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job List */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 dark:border-slate-700">
          <Cpu className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No render jobs yet</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Submit your first cloud render above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const s = STATUS_MAP[job.status] || STATUS_MAP.QUEUED;
            const Icon = s.icon;
            const border = PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.NORMAL;
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border-l-4 ${border} bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-slate-800`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{job.projectName}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.color}`}>
                        <Icon className={`h-3 w-3 ${job.status === "RENDERING" ? "animate-spin" : ""}`} /> {s.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{job.resolution || "1080p"}</span>
                      <span>{job.outputFormat || "MP4"}</span>
                      {job.software && <span>{job.software}</span>}
                      <span className="capitalize">{(job.priority || "normal").toLowerCase()} priority</span>
                      <span>{job.estimatedMinutes || "?"} min est.</span>
                      <span>{job.cost || 0} credits</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.outputFileUrl && (
                      <a href={job.outputFileUrl} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Upload className="h-3 w-3" /> Download
                      </a>
                    )}
                    {(job.status === "QUEUED" || job.status === "RENDERING") && (
                      <button onClick={() => handleCancel(job.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
                        <Ban className="h-3 w-3" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
                {job.status === "RENDERING" && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <motion.div
                        initial={{ width: "10%" }} animate={{ width: "65%" }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      />
                    </div>
                  </div>
                )}
                {job.errorLog && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{job.errorLog}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
