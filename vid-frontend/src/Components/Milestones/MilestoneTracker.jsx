import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileUp,
  Flag,
  Loader2,
  PenLine,
  PartyPopper,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";

const inr = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

const statusStyles = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-800 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-800 ring-red-200",
  REJECTED: "bg-amber-50 text-amber-900 ring-amber-200",
};

const timelineDot = {
  PENDING: "bg-slate-300 text-slate-600",
  IN_PROGRESS: "bg-blue-500 text-white",
  COMPLETED: "bg-emerald-500 text-white",
  CANCELLED: "bg-red-500 text-white",
  REJECTED: "bg-amber-500 text-white",
};

function MilestoneCard({
  m,
  isClient,
  isFreelancer,
  onProgressUpdate,
  onApprove,
  onRevision,
  revisionFeedback,
  setRevisionFeedback,
  busyId,
  localProgress,
  onLocalProgress,
  onUploadDeliverables,
  uploading,
  pendingFileCount,
}) {
  const awaiting = m.status === "COMPLETED" && !m.approvedAt;
  const released = Boolean(m.approvedAt);

  return (
    <div className="relative pl-10 pb-10 last:pb-0">
      <div
        className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white shadow ${timelineDot[m.status] || "bg-slate-300"}`}
      >
        {m.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4" />}
        {m.status === "PENDING" && <CircleDashed className="h-4 w-4" />}
        {m.status === "IN_PROGRESS" && <PenLine className="h-4 w-4" />}
        {m.status === "CANCELLED" && <XCircle className="h-4 w-4" />}
      </div>
      <div className="ml-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{m.title}</h3>
            {m.description && <p className="mt-1 text-sm text-slate-600">{m.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                <Clock3 className="h-3.5 w-3.5" />
                Due {m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-IN") : "—"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusStyles[m.status] || statusStyles.PENDING}`}
              >
                {m.status?.replace(/_/g, " ")}
              </span>
              {awaiting && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200">
                  <Flag className="h-3.5 w-3.5" />
                  Awaiting your review
                </span>
              )}
              {released && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-800 ring-1 ring-violet-200">
                  <PartyPopper className="h-3.5 w-3.5" />
                  Payment released
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm text-slate-500">Milestone amount</p>
            <p className="text-lg font-bold text-violet-700">{inr(m.amount)}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span>{m.progress ?? 0}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              initial={false}
              animate={{ width: `${Math.min(100, m.progress || 0)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {m.deliverables && typeof m.deliverables === "object" && m.deliverables.revisionFeedback && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
            <span className="font-semibold">Client feedback: </span>
            {m.deliverables.revisionFeedback}
          </p>
        )}

        {isFreelancer && !released && !awaiting && (
          <div className="mt-4 space-y-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-3 sm:p-4">
            <label className="text-sm font-medium text-slate-700">Update progress (0 – 100)</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={localProgress[m.id] ?? m.progress ?? 0}
                onChange={(e) => onLocalProgress(m.id, Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-violet-600"
              />
              <button
                type="button"
                onClick={() => onProgressUpdate(m, localProgress[m.id] ?? m.progress ?? 0)}
                disabled={busyId === m.id}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save progress
              </button>
            </div>
            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-violet-800">
                <FileUp className="h-4 w-4" />
                <span>Attach deliverables (uploads to your workspace)</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onUploadDeliverables(m, e.target.files)}
                />
              </label>
              {uploading === m.id && <p className="mt-1 text-xs text-violet-600">Uploading…</p>}
              {pendingFileCount > 0 && (
                <p className="mt-1 text-xs font-medium text-violet-800">{pendingFileCount} file(s) will be sent when you save progress.</p>
              )}
            </div>
          </div>
        )}

        {isClient && awaiting && (
          <div className="mt-4 space-y-3">
            <textarea
              className="w-full rounded-lg border border-slate-200 p-2 text-sm text-slate-800 shadow-inner focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              rows={2}
              placeholder="Optional: add a note with revision request"
              value={revisionFeedback[m.id] ?? ""}
              onChange={(e) => setRevisionFeedback((prev) => ({ ...prev, [m.id]: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onApprove(m.id)}
                disabled={busyId === m.id}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve & release
              </button>
              <button
                type="button"
                onClick={() => onRevision(m)}
                disabled={busyId === m.id}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 disabled:opacity-60"
              >
                Request revision
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

MilestoneCard.propTypes = {
  m: PropTypes.object.isRequired,
  isClient: PropTypes.bool,
  isFreelancer: PropTypes.bool,
  onProgressUpdate: PropTypes.func.isRequired,
  onApprove: PropTypes.func.isRequired,
  onRevision: PropTypes.func.isRequired,
  revisionFeedback: PropTypes.object.isRequired,
  setRevisionFeedback: PropTypes.func.isRequired,
  busyId: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  localProgress: PropTypes.object.isRequired,
  onLocalProgress: PropTypes.func.isRequired,
  onUploadDeliverables: PropTypes.func.isRequired,
  uploading: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  pendingFileCount: PropTypes.number,
};

MilestoneCard.defaultProps = {
  pendingFileCount: 0,
};

function MilestoneTracker({ orderId, isClient, isFreelancer }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [localProgress, setLocalProgress] = useState({});
  const [uploading, setUploading] = useState(null);
  const [revisionFeedback, setRevisionFeedback] = useState({});
  const [pendingDeliverables, setPendingDeliverables] = useState({});

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data: body } = await axiosInstance.get(`/milestones/order/${orderId}`);
      const raw = body?.data;
      const milestones = Array.isArray(raw) ? raw : [];
      setRows(milestones);
      const init = {};
      milestones.forEach((x) => {
        init[x.id] = x.progress ?? 0;
      });
      setLocalProgress(init);
      setPendingDeliverables({});
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to load milestones");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onLocalProgress = (id, v) => {
    setLocalProgress((prev) => ({ ...prev, [id]: v }));
  };

  const onProgressUpdate = async (m, progress) => {
    setBusyId(m.id);
    try {
      const extra = pendingDeliverables[m.id];
      const { data: body } = await axiosInstance.put(`/milestones/${m.id}/progress`, {
        progress: Math.max(0, Math.min(100, Math.trunc(Number(progress) || 0))),
        deliverables: extra,
      });
      const updated = body?.data;
      if (updated) {
        setRows((prev) => prev.map((row) => (row.id === m.id ? { ...row, ...updated } : row)));
        setLocalProgress((prev) => ({ ...prev, [m.id]: updated.progress ?? progress }));
        setPendingDeliverables((prev) => {
          const next = { ...prev };
          delete next[m.id];
          return next;
        });
        toast.success("Progress saved");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not update progress");
    } finally {
      setBusyId(null);
    }
  };

  const onUploadDeliverables = async (m, fileList) => {
    if (!fileList?.length) return;
    setUploading(m.id);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append("files", f));
      const res = await axiosInstance.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploaded = res.data?.data || [];
      const filesMeta = uploaded.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        uploadedAt: new Date().toISOString(),
      }));
      setPendingDeliverables((prev) => {
        const base = prev[m.id] || (typeof m.deliverables === "object" && m.deliverables ? { ...m.deliverables } : {});
        const existingFiles = Array.isArray(base.files) ? base.files : [];
        return {
          ...prev,
          [m.id]: { ...base, files: [...existingFiles, ...filesMeta] },
        };
      });
      toast.success("Files attached — save progress to submit");
    } catch (e) {
      toast.error(e.response?.data?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const onApprove = async (id) => {
    setBusyId(id);
    try {
      const { data: body } = await axiosInstance.post(`/milestones/${id}/approve`, {});
      const payload = body?.data;
      toast.success(body?.message || "Milestone approved");
      if (payload?.orderCompleted) {
        toast.info("All milestones are complete. Order and escrow are closed.");
      }
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Approval failed");
    } finally {
      setBusyId(null);
    }
  };

  const onRevision = async (m) => {
    const text = (revisionFeedback[m.id] || "").trim();
    if (!text) {
      toast.error("Please add revision feedback for the freelancer.");
      return;
    }
    setBusyId(m.id);
    try {
      await axiosInstance.post(`/milestones/${m.id}/revision`, { feedback: text });
      toast.success("Revision requested");
      setRevisionFeedback((prev) => ({ ...prev, [m.id]: "" }));
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not request revision");
    } finally {
      setBusyId(null);
    }
  };

  if (!orderId) {
    return <p className="text-sm text-slate-500">No order selected.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-violet-700">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-600">
        No milestones for this order yet. The client can split the work into milestones from order setup.
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Milestone timeline</h2>
        <p className="text-sm text-slate-600">Track delivery, review work, and release payments by milestone.</p>
      </div>
      <div className="relative before:absolute before:left-4 before:top-0 before:h-full before:w-px before:bg-gradient-to-b before:from-violet-200 before:via-fuchsia-100 before:to-transparent sm:before:left-4">
        <AnimatePresence>
          {rows.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MilestoneCard
                m={m}
                isClient={isClient}
                isFreelancer={isFreelancer}
                onProgressUpdate={onProgressUpdate}
                onApprove={onApprove}
                onRevision={onRevision}
                revisionFeedback={revisionFeedback}
                setRevisionFeedback={setRevisionFeedback}
                busyId={busyId}
                localProgress={localProgress}
                onLocalProgress={onLocalProgress}
                onUploadDeliverables={onUploadDeliverables}
                uploading={uploading}
                pendingFileCount={(pendingDeliverables[m.id]?.files || []).length}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

MilestoneTracker.propTypes = {
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isClient: PropTypes.bool,
  isFreelancer: PropTypes.bool,
};

MilestoneTracker.defaultProps = {
  isClient: false,
  isFreelancer: false,
};

export default MilestoneTracker;
