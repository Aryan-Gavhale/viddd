import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Archive,
  Download,
  CheckCircle2,
  AlertCircle,
  Lock,
  Trash2,
  Eye,
  Loader2,
  X,
  Paperclip,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios.js";
import { Avatar } from "./Avatar.jsx";
import { fullName, formatBytes, formatRelativeTime, workspaceFilesUrl } from "./utils.js";
import VideoReviewModal from "./VideoReviewModal.jsx";

const CATEGORY_OPTIONS = [
  { id: "deliverable", label: "Deliverable" },
  { id: "raw", label: "Raw footage" },
  { id: "reference", label: "Reference" },
  { id: "asset", label: "Asset" },
  { id: "final", label: "Final" },
];

const STATUS_TONE = {
  PENDING_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CHANGES_REQUESTED: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABEL = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  ARCHIVED: "Archived",
};

const MEDIA_TONE = {
  PENDING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SCANNING: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PROCESSING: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  READY: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  PLACEHOLDER: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  FAILED: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  QUARANTINED: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function mediaLabel(status) {
  if (!status) return "Legacy file";
  if (status === "PLACEHOLDER") return "Workflow test file";
  return status.replaceAll("_", " ").toLowerCase();
}

const PLACEHOLDER_BANNER_COPY = "Workflow test file — no real video stored. Useful for exercising the approval/delivery flow locally; do not treat as a deliverable.";

function isStorageCredentialsError(error) {
  const message = `${error?.response?.data?.message || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("could not load credentials") ||
    message.includes("credential") ||
    message.includes("s3 bucket is not configured") ||
    message.includes("aws")
  );
}

function devPlaceholderUrl(file, scope) {
  const slug = scope?.kind === "ORDER" ? `order/${scope.id}` : `job/${scope?.id}`;
  return `dev-placeholder://${slug}/${Date.now()}-${encodeURIComponent(file.name)}`;
}

function allowDevPlaceholderUploads() {
  return import.meta.env.DEV && import.meta.env.VITE_ALLOW_DEV_PLACEHOLDER_UPLOADS === "true";
}

/**
 * Editors hand off review cuts; clients only ever upload reference material.
 * Anything outside those two paths comes through chat instead.
 */
const UPLOAD_SPEC_BY_ROLE = {
  freelancer: {
    label: "Upload review cut",
    emptyTitle: "No review cuts yet",
    emptyHint: "Click here to upload your first review cut.",
    accept: "video/*",
    category: "deliverable",
    note: "Watermarked review cut",
    videoOnly: true,
  },
  client: {
    label: "Upload reference",
    emptyTitle: "No reference material yet",
    emptyHint: "Share a brief, brand assets, or example videos for the editor.",
    accept: "image/*,video/*,application/pdf,.zip,.doc,.docx",
    category: "reference",
    note: "Client reference material",
    videoOnly: false,
  },
};

/**
 * `scope` is `{ kind: "JOB" | "ORDER", id: number }`. We accept the legacy
 * `jobId` prop as a fall-through so callers that still pass a bare jobId
 * (workspace deep-links, older codepaths) keep working until they migrate.
 */
export function FilesTab({ scope, jobId, role, readOnly = false, onChanged }) {
  const effectiveScope = scope || (jobId ? { kind: "JOB", id: Number(jobId) } : null);
  const scopeKind = effectiveScope?.kind || "JOB";
  const scopeId = effectiveScope?.id;
  const filesUrl = workspaceFilesUrl(effectiveScope);
  const uploadSpec = UPLOAD_SPEC_BY_ROLE[role] || UPLOAD_SPEC_BY_ROLE.client;
  const isEditor = role === "freelancer";
  const isClientView = role === "client";

  const [files, setFiles] = useState([]);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deliveryAction, setDeliveryAction] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [filter, setFilter] = useState("all");
  const [reviewFile, setReviewFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!scopeId || !filesUrl) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    Promise.all([
      axiosInstance.get(filesUrl),
      axiosInstance.get(`/deliveries/${scopeKind}/${scopeId}`).catch(() => null),
    ])
      .then(([res, deliveryRes]) => {
        if (!alive) return;
        setFiles(res.data?.data?.files || []);
        setDelivery(deliveryRes?.data?.data || null);
      })
      .catch(() => {
        if (alive) toast.error("Failed to load project files");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [scopeKind, scopeId, filesUrl]);

  const filteredFiles =
    filter === "all" ? files : files.filter((f) => f.category === filter);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 50 * 1024 * 1024 * 1024) {
      toast.error("File is larger than 50 GB");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress({ name: file.name, percent: 0 });

      if (uploadSpec.videoOnly && !file.type.startsWith("video/")) {
        toast.info("Editors can only upload video review cuts here. Use chat for other attachments.");
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      let url = null;
      let usedDevPlaceholder = false;

      try {
        // Use the multipart-aware /files API for big videos. Both jobId and
        // orderId are accepted by the backend; we forward whichever scope the
        // user is working in so authorization picks the correct project / order.
        const initRes = await axiosInstance.post("/files/initiate-upload", {
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          jobId: scopeKind === "JOB" ? Number(scopeId) : undefined,
          orderId: scopeKind === "ORDER" ? Number(scopeId) : undefined,
        });
        const { uploadId, key, maxPartSize } = initRes.data.data;
        const totalParts = Math.max(1, Math.ceil(file.size / maxPartSize));
        const parts = [];
        for (let i = 0; i < totalParts; i += 1) {
          const start = i * maxPartSize;
          const end = Math.min(file.size, start + maxPartSize);
          const partBlob = file.slice(start, end);
          const partRes = await axiosInstance.post("/files/upload-part-url", {
            key,
            uploadId,
            partNumber: i + 1,
          });
          const presigned = partRes.data.data.url;
          const put = await fetch(presigned, { method: "PUT", body: partBlob });
          if (!put.ok) throw new Error(`Part ${i + 1} upload failed`);
          const etag = put.headers.get("ETag") || put.headers.get("etag");
          if (!etag) throw new Error("Missing ETag from S3");
          parts.push({ PartNumber: i + 1, ETag: etag.replace(/"/g, "") });
          setUploadProgress({
            name: file.name,
            percent: Math.round(((i + 1) / totalParts) * 100),
          });
        }
        const completeRes = await axiosInstance.post("/files/complete-upload", {
          key,
          uploadId,
          parts,
        });
        url = completeRes.data.data?.url || key;
      } catch (uploadError) {
        if (!isStorageCredentialsError(uploadError)) throw uploadError;
        if (!allowDevPlaceholderUploads()) throw uploadError;
        usedDevPlaceholder = true;
        url = devPlaceholderUrl(file, effectiveScope);
        setUploadProgress({ name: file.name, percent: 100 });
      }

      const created = await axiosInstance.post(filesUrl, {
        fileName: file.name,
        url,
        mimeType: file.type,
        size: file.size,
        category: uploadSpec.category,
        note: uploadSpec.note,
      });

      setFiles((prev) => [created.data?.data, ...prev]);
      toast.success(
        usedDevPlaceholder
          ? "Workflow test file added — no real video stored. Use only for testing the approval flow."
          : isEditor
            ? "Review cut uploaded"
            : "Reference uploaded"
      );
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const refreshDelivery = async () => {
    if (!scopeId) return;
    const res = await axiosInstance.get(`/deliveries/${scopeKind}/${scopeId}`).catch(() => null);
    setDelivery(res?.data?.data || null);
  };

  const sendForApproval = async (file) => {
    if (!file?.id || !scopeId) return;
    setDeliveryAction(`submit-${file.id}`);
    try {
      const note = file.note || `Review cut ready: ${file.fileName}`;
      await axiosInstance.post(`/deliveries/${scopeKind}/${scopeId}/submit-final`, {
        reviewFileIds: [Number(file.id)],
        releaseNotes: note,
        sourceIncluded: false,
      });
      toast.success("Review cut sent to client for approval");
      await refreshDelivery();
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not send review cut");
    } finally {
      setDeliveryAction(null);
    }
  };

  const reviewDeliveryAction = async (action, file) => {
    const latest = delivery?.latest;
    if (!latest?.id) return;
    const note =
      action === "approve"
        ? "Review cut approved"
        : action === "request-changes"
          ? prompt("What changes should the editor make?") || ""
          : prompt("Why are you opening a dispute?") || "";
    if (action !== "approve" && !note.trim()) return;
    if (action === "approve" && !confirm("Approve this review cut and unlock final delivery?")) return;
    setDeliveryAction(`${action}-${file.id}`);
    try {
      const endpoint =
        action === "request-changes"
          ? `/deliveries/${latest.id}/request-changes`
          : `/deliveries/${latest.id}/${action}`;
      const payload = action === "dispute" ? { reason: note } : { reviewNote: note };
      await axiosInstance.post(endpoint, payload);
      toast.success(action === "approve" ? "Review approved. Delivery is unlocked." : action === "dispute" ? "Dispute opened" : "Changes requested");
      await refreshDelivery();
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Review action failed");
    } finally {
      setDeliveryAction(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (!filesUrl) return;
    const target = files.find((f) => Number(f.id) === Number(fileId));
    if (target) {
      // Symmetry guard so neither side accidentally removes the other's
      // contributions. Backend enforces the same rule, this is just UX.
      if (isClientView && target.category === "deliverable") {
        toast.error("Only the editor can remove review cuts. Request changes inside the review instead.");
        return;
      }
      if (isEditor && target.category === "reference") {
        toast.error("Reference material is owned by the client. Ask them to remove it.");
        return;
      }
    }
    if (!confirm("Remove this file from the project?")) return;
    try {
      await axiosInstance.delete(`${filesUrl}/${fileId}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File removed");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not delete file");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Files</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            All shared assets, deliverables, and revisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-200"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handlePickFile}
            disabled={uploading || readOnly}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            title={isClientView ? "Share a brief, brand assets, or example videos with the editor" : "Upload your latest review cut for the client"}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {readOnly ? "Archived" : uploading ? "Uploading…" : uploadSpec.label}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={uploadSpec.accept}
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      {uploadProgress && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mb-1">
            <span className="truncate">{uploadProgress.name}</span>
            <span className="font-semibold tabular-nums">{uploadProgress.percent}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <FileSkeleton />
      ) : filteredFiles.length === 0 ? (
        <EmptyDrop onPick={handlePickFile} title={uploadSpec.emptyTitle} hint={uploadSpec.emptyHint} disabled={readOnly} />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFiles.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              role={role}
              readOnly={readOnly}
              delivery={delivery}
              deliveryAction={deliveryAction}
              onReview={(protectedReview) => setReviewFile({ ...f, protectedReview })}
              onSendForApproval={() => sendForApproval(f)}
              onDeliveryReview={(action) => reviewDeliveryAction(action, f)}
              onDelete={() => handleDelete(f.id)}
            />
          ))}
        </ul>
      )}

      <VideoReviewModal
        open={!!reviewFile}
        onClose={() => setReviewFile(null)}
        scope={effectiveScope}
        role={role}
        file={reviewFile}
        onFileStatusChange={(updated) => {
          if (!updated) return;
          setFiles((prev) => prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
          setReviewFile((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : updated.id !== cur?.id ? updated : cur));
          onChanged?.();
        }}
      />
    </div>
  );
}

function FileCard({
  file,
  role,
  readOnly,
  delivery,
  deliveryAction,
  onReview,
  onSendForApproval,
  onDeliveryReview,
  onDelete,
}) {
  const [mediaState, setMediaState] = useState(null);
  const Icon = pickIcon(file.mimeType);
  const isClient = role === "client";
  const isEditor = role === "freelancer";
  const isVideo = file.mimeType?.startsWith("video/");
  useEffect(() => {
    let alive = true;
    if (!isVideo || !file?.id) {
      setMediaState(null);
      return undefined;
    }
    axiosInstance
      .get(`/media/assets/${file.id}`)
      .then((res) => {
        if (alive) setMediaState(res.data?.data || null);
      })
      .catch(() => {
        if (alive) setMediaState(null);
      });
    return () => {
      alive = false;
    };
  }, [file?.id, isVideo]);
  const media = mediaState?.asset || file.media || null;
  const mediaStatus = media?.status;
  const mediaUrls = mediaState?.urls || {};
  const previewUrl = mediaUrls.watermarked?.url || mediaUrls.preview?.url || file.url;
  const posterUrl = mediaUrls.poster?.url;
  const mediaBlocked = ["FAILED", "QUARANTINED"].includes(mediaStatus);
  const mediaPending = Boolean(mediaStatus && !["READY", "PLACEHOLDER"].includes(mediaStatus));
  const openCount = Number(file.openCommentCount || 0);
  const totalCount = Number(file.totalCommentCount || 0);
  const latestDelivery = delivery?.latest || null;
  const reviewIds = (latestDelivery?.reviewFileIds?.length ? latestDelivery.reviewFileIds : latestDelivery?.finalFileIds || []).map(Number);
  const isActiveReviewCut = reviewIds.includes(Number(file.id)) && latestDelivery?.status === "SUBMITTED";
  const isApprovedReviewCut = reviewIds.includes(Number(file.id)) && latestDelivery?.status === "APPROVED";
  const canSubmitReview =
    isEditor &&
    isVideo &&
    !readOnly &&
    !mediaBlocked &&
    !mediaPending &&
    file.category !== "final" &&
    (!latestDelivery || latestDelivery.status === "CHANGES_REQUESTED");
  return (
    <li className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div
        className={`relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 aspect-video flex items-center justify-center ${
          isVideo ? "cursor-pointer group" : ""
        }`}
        onClick={isVideo ? () => onReview(isActiveReviewCut) : undefined}
      >
        {isVideo && previewUrl && !mediaBlocked ? (
          <>
            {posterUrl ? (
              <img src={posterUrl} alt="" className="w-full h-full object-cover bg-black" />
            ) : (
              <video
                src={previewUrl}
                preload="metadata"
                muted
                className="w-full h-full object-cover bg-black"
              />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full inline-flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Review video
              </span>
            </div>
          </>
        ) : file.mimeType?.startsWith("image/") && file.url ? (
          <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-12 h-12 text-gray-400" />
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-black/60 text-white">
          v{file.version}
        </span>
        <span
          className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium rounded-full ${
            STATUS_TONE[file.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {STATUS_LABEL[file.status] || file.status}
        </span>
        {isVideo && totalCount > 0 && (
          <span
            className={`absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold rounded-full inline-flex items-center gap-1 ${
              openCount > 0 ? "bg-amber-400 text-amber-900" : "bg-emerald-500 text-white"
            }`}
            title={`${openCount} open · ${totalCount} total review notes`}
          >
            <MessageSquare className="w-3 h-3" /> {openCount > 0 ? `${openCount} open` : `${totalCount} resolved`}
          </span>
        )}
        {isActiveReviewCut && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-30">
            <span className="-rotate-12 rounded bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
              VIDLANCING REVIEW
            </span>
          </div>
        )}
        {isActiveReviewCut && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500 text-white inline-flex items-center gap-1">
            <Lock className="w-3 h-3" /> Client approval
          </span>
        )}
        {isVideo && mediaStatus && (
          <span className={`absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${MEDIA_TONE[mediaStatus] || MEDIA_TONE.PENDING}`}>
            {mediaLabel(mediaStatus)}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{file.fileName}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {formatBytes(file.size)} · {file.category}
          </p>
        </div>

        {mediaStatus === "PLACEHOLDER" && (
          <p className="rounded-md border border-purple-200 bg-purple-50 px-2 py-1.5 text-[11px] font-medium text-purple-800 dark:border-purple-700/40 dark:bg-purple-900/20 dark:text-purple-200">
            {PLACEHOLDER_BANNER_COPY}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400">
          {file.uploader && <Avatar user={file.uploader} size={20} />}
          <span className="truncate">{fullName(file.uploader)}</span>
          <span className="text-gray-400">·</span>
          <span>{formatRelativeTime(file.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1 pt-1">
          {isVideo && (
            <button
              type="button"
              onClick={() => onReview(isActiveReviewCut)}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {isActiveReviewCut ? "Protected review" : "Review"}
            </button>
          )}
          {!isVideo && file.url && (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </a>
          )}
          {file.url && !isActiveReviewCut && (
            <a
              href={file.url}
              download={file.fileName}
              className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          {canSubmitReview && (
            <button
              type="button"
              onClick={onSendForApproval}
              disabled={deliveryAction === `submit-${file.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {deliveryAction === `submit-${file.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send approval
            </button>
          )}
          {isEditor && isVideo && !readOnly && (mediaPending || mediaBlocked) && (
            <span className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {mediaPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {mediaBlocked ? "Blocked" : "Processing"}
            </span>
          )}
          {isApprovedReviewCut && (
            <span className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              Delivery unlocked
            </span>
          )}
          {isClient && !readOnly && isActiveReviewCut && (
            <>
              <button
                type="button"
                onClick={() => onDeliveryReview("request-changes")}
                disabled={!!deliveryAction}
                title="Request changes"
                className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeliveryReview("approve")}
                disabled={!!deliveryAction}
                title="Approve"
                className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeliveryReview("dispute")}
                disabled={!!deliveryAction}
                title="Dispute"
                className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete"
              className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function EmptyDrop({ onPick, title = "No files yet", hint = "Click here to upload your first file.", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl py-12 px-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mb-3">
        <Paperclip className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
    </button>
  );
}

function FileSkeleton() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="aspect-video bg-gray-100 dark:bg-gray-800" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-2 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function pickIcon(mime) {
  if (!mime) return FileText;
  if (mime.startsWith("video/")) return Film;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("audio/")) return Music;
  if (mime.includes("zip") || mime.includes("tar")) return Archive;
  return FileText;
}
