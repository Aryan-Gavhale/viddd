import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  GitBranch, Upload, CheckCircle2, XCircle, Clock, Play, Pause,
  ChevronLeft, ChevronRight, Loader2, ArrowLeftRight, Eye,
  MessageSquare, Maximize2, X, FileVideo, Plus,
} from "lucide-react";
import { useSelector } from "react-redux";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

const STATUS_MAP = {
  SUBMITTED: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock, label: "Pending Review" },
  APPROVED: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2, label: "Approved" },
  CHANGES_REQUESTED: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle, label: "Changes Requested" },
};

export default function RevisionTracker() {
  const { orderId } = useParams();
  const user = useSelector((s) => s.user?.user || s.user);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareVersions, setCompareVersions] = useState({ v1: null, v2: null });
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState({ videoUrl: "", changeNotes: "", duration: "", fileSize: "" });

  const videoBeforeRef = useRef(null);
  const videoAfterRef = useRef(null);
  const [synced, setSynced] = useState(true);
  const [splitPosition, setSplitPosition] = useState(50);
  const [draggingSplit, setDraggingSplit] = useState(false);

  const fetchRevisions = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(`/revisions/order/${orderId}`);
      setRevisions(data.data || []);
    } catch { toast.error("Failed to load revisions"); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { fetchRevisions(); }, [fetchRevisions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axiosInstance.post(`/revisions/order/${orderId}`, {
        ...form, duration: form.duration ? parseInt(form.duration, 10) : undefined,
      });
      toast.success("Revision submitted!");
      setShowSubmit(false);
      setForm({ videoUrl: "", changeNotes: "", duration: "", fileSize: "" });
      fetchRevisions();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  const handleReview = async (revId, status) => {
    try {
      await axiosInstance.post(`/revisions/${revId}/review`, { status, reviewNote });
      toast.success(status === "APPROVED" ? "Revision approved!" : "Changes requested");
      setReviewingId(null);
      setReviewNote("");
      fetchRevisions();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Review failed");
    }
  };

  const startCompare = (v1, v2) => {
    setCompareVersions({ v1, v2 });
    setComparing(true);
  };

  const syncVideos = () => {
    if (!videoBeforeRef.current || !videoAfterRef.current) return;
    videoAfterRef.current.currentTime = videoBeforeRef.current.currentTime;
  };

  const handleSplitDrag = (e) => {
    if (!draggingSplit) return;
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left;
    setSplitPosition(Math.max(10, Math.min(90, (x / container.width) * 100)));
  };

  const isFreelancer = user?.role === "FREELANCER";
  const isClient = user?.role === "CLIENT";
  const latestVersion = revisions.length > 0 ? Math.max(...revisions.map((r) => r.version)) : 0;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Revision Tracker</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Visual diff between video versions — see exactly what changed
          </p>
        </div>
        <div className="flex gap-2">
          {revisions.length >= 2 && (
            <button onClick={() => startCompare(revisions[revisions.length - 2], revisions[revisions.length - 1])}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
              <ArrowLeftRight className="h-4 w-4" /> Compare Latest
            </button>
          )}
          {isFreelancer && (
            <button onClick={() => setShowSubmit(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl">
              <Upload className="h-4 w-4" /> Submit Revision
            </button>
          )}
        </div>
      </div>

      {/* Version Timeline */}
      <div className="relative mb-8">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-6">
          {revisions.map((rev, i) => {
            const s = STATUS_MAP[rev.status] || STATUS_MAP.SUBMITTED;
            const Icon = s.icon;
            return (
              <motion.div key={rev.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className="relative pl-14"
              >
                {/* Timeline dot */}
                <div className={`absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${rev.status === "APPROVED" ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30" : rev.status === "CHANGES_REQUESTED" ? "border-red-400 bg-red-100 dark:bg-red-900/30" : "border-amber-400 bg-amber-100 dark:bg-amber-900/30"}`}>
                  <span className="text-[9px] font-bold text-slate-700 dark:text-white">{rev.version}</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Version {rev.version}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>
                          <Icon className="h-3 w-3" /> {s.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        by {rev.firstName} {rev.lastName} · {new Date(rev.createdAt).toLocaleDateString()}
                        {rev.duration && ` · ${Math.floor(rev.duration / 60)}:${String(rev.duration % 60).padStart(2, "0")}`}
                        {rev.fileSize && ` · ${rev.fileSize}`}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {i > 0 && (
                        <button onClick={() => startCompare(revisions[i - 1], rev)} title="Compare with previous"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20">
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {rev.changeNotes && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Change Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{rev.changeNotes}</p>
                    </div>
                  )}

                  {rev.videoUrl && (
                    <div className="mt-3">
                      <video src={rev.videoUrl} controls preload="metadata"
                        className="w-full rounded-xl bg-black" style={{ maxHeight: 300 }} />
                    </div>
                  )}

                  {rev.reviewNote && (
                    <div className="mt-3 rounded-lg border-l-4 border-indigo-400 bg-indigo-50 p-3 dark:bg-indigo-900/20">
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Client Feedback</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{rev.reviewNote}</p>
                    </div>
                  )}

                  {/* Client actions */}
                  {isClient && rev.status === "SUBMITTED" && (
                    <div className="mt-4">
                      {reviewingId === rev.id ? (
                        <div className="space-y-2">
                          <textarea className={INPUT + " min-h-[60px] resize-y"} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add feedback (optional)" rows={2} />
                          <div className="flex gap-2">
                            <button onClick={() => handleReview(rev.id, "APPROVED")}
                              className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                              <CheckCircle2 className="mr-1.5 inline h-4 w-4" /> Approve
                            </button>
                            <button onClick={() => handleReview(rev.id, "CHANGES_REQUESTED")}
                              className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20">
                              <XCircle className="mr-1.5 inline h-4 w-4" /> Request Changes
                            </button>
                          </div>
                          <button onClick={() => { setReviewingId(null); setReviewNote(""); }}
                            className="w-full text-xs text-slate-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setReviewingId(rev.id)}
                          className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                          <Eye className="mr-1.5 inline h-4 w-4" /> Review This Version
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {revisions.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-20 dark:border-slate-700">
            <GitBranch className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No revisions yet</p>
            {isFreelancer && <p className="mt-1 text-sm text-slate-400">Submit your first version above</p>}
          </div>
        )}
      </div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowSubmit(false)}>
            <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Submit Version {latestVersion + 1}</h2>
                <button type="button" onClick={() => setShowSubmit(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Video URL *</label>
                  <input className={INPUT} value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} required placeholder="https://..." />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">What changed?</label>
                  <textarea className={INPUT + " min-h-[80px] resize-y"} value={form.changeNotes} onChange={(e) => setForm({ ...form, changeNotes: e.target.value })} placeholder="Describe what's different in this version" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" className={INPUT} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Duration (seconds)" min={0} />
                  <input className={INPUT} value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="File size (e.g. 250 MB)" />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowSubmit(false)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60">
                  {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Modal — Side-by-side with slider */}
      <AnimatePresence>
        {comparing && compareVersions.v1 && compareVersions.v2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black"
          >
            <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                  v{compareVersions.v1.version} — Before
                </span>
                <ArrowLeftRight className="h-4 w-4 text-slate-500" />
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                  v{compareVersions.v2.version} — After
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-400">
                  <input type="checkbox" checked={synced} onChange={(e) => setSynced(e.target.checked)} className="rounded" />
                  Sync playback
                </label>
                <button onClick={() => setComparing(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Split view */}
            <div className="relative flex-1 cursor-col-resize select-none"
              onMouseMove={handleSplitDrag}
              onMouseUp={() => setDraggingSplit(false)}
              onMouseLeave={() => setDraggingSplit(false)}
            >
              {/* Before video */}
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${splitPosition}%` }}>
                <video ref={videoBeforeRef} src={compareVersions.v1.videoUrl} controls
                  className="h-full w-full object-contain"
                  onTimeUpdate={() => { if (synced && videoAfterRef.current) videoAfterRef.current.currentTime = videoBeforeRef.current.currentTime; }}
                  onPlay={() => { if (synced && videoAfterRef.current) videoAfterRef.current.play(); }}
                  onPause={() => { if (synced && videoAfterRef.current) videoAfterRef.current.pause(); }}
                />
                <div className="absolute left-3 top-3 rounded-full bg-red-600/80 px-2 py-0.5 text-[10px] font-bold text-white">
                  v{compareVersions.v1.version}
                </div>
              </div>

              {/* After video */}
              <div className="absolute inset-0 overflow-hidden" style={{ left: `${splitPosition}%` }}>
                <video ref={videoAfterRef} src={compareVersions.v2.videoUrl}
                  className="h-full w-full object-contain"
                  style={{ marginLeft: `-${splitPosition}%`, width: `${100 / (1 - splitPosition / 100)}%` }}
                  muted
                />
                <div className="absolute right-3 top-3 rounded-full bg-emerald-600/80 px-2 py-0.5 text-[10px] font-bold text-white">
                  v{compareVersions.v2.version}
                </div>
              </div>

              {/* Splitter handle */}
              <div className="absolute top-0 bottom-0 z-10 w-1 -translate-x-1/2 cursor-col-resize bg-white/80"
                style={{ left: `${splitPosition}%` }}
                onMouseDown={() => setDraggingSplit(true)}
              >
                <div className="absolute left-1/2 top-1/2 flex h-10 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-slate-600" />
                </div>
              </div>
            </div>

            {/* Change notes */}
            {compareVersions.v2.changeNotes && (
              <div className="bg-slate-900 px-4 py-3">
                <p className="text-xs font-semibold text-slate-400">Changes in v{compareVersions.v2.version}:</p>
                <p className="mt-1 text-sm text-slate-300">{compareVersions.v2.changeNotes}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
