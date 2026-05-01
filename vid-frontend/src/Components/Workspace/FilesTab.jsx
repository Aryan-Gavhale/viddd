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
  Trash2,
  Eye,
  Loader2,
  X,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios.js";
import { Avatar } from "./Avatar.jsx";
import { fullName, formatBytes, formatRelativeTime } from "./utils.js";
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

export function FilesTab({ jobId, role, onChanged }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [filter, setFilter] = useState("all");
  const [reviewFile, setReviewFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axiosInstance
      .get(`/workspace/projects/${jobId}/files`)
      .then((res) => {
        if (!alive) return;
        setFiles(res.data?.data?.files || []);
      })
      .catch(() => {
        if (alive) toast.error("Failed to load project files");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [jobId]);

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

      let url = null;

      if (file.type.startsWith("video/")) {
        // Use the multipart-aware /files API for big videos.
        const initRes = await axiosInstance.post("/files/initiate-upload", {
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          jobId: Number(jobId),
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
      } else {
        toast.info("For now only video uploads are supported here. Use chat for other files.");
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      const created = await axiosInstance.post(`/workspace/projects/${jobId}/files`, {
        fileName: file.name,
        url,
        mimeType: file.type,
        size: file.size,
        category: "deliverable",
      });

      setFiles((prev) => [created.data?.data, ...prev]);
      toast.success("File added to project");
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || e.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleStatus = async (fileId, status) => {
    try {
      const res = await axiosInstance.patch(`/workspace/projects/${jobId}/files/${fileId}`, {
        status,
      });
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...res.data.data, status } : f)));
      toast.success(`Marked as ${STATUS_LABEL[status]}`);
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not update status");
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm("Remove this file from the project?")) return;
    try {
      await axiosInstance.delete(`/workspace/projects/${jobId}/files/${fileId}`);
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
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading…" : "Upload video"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
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
        <EmptyDrop onPick={handlePickFile} />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFiles.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              role={role}
              onReview={() => setReviewFile(f)}
              onApprove={() => handleStatus(f.id, "APPROVED")}
              onRequestChanges={() => handleStatus(f.id, "CHANGES_REQUESTED")}
              onArchive={() => handleStatus(f.id, "ARCHIVED")}
              onDelete={() => handleDelete(f.id)}
            />
          ))}
        </ul>
      )}

      <VideoReviewModal
        open={!!reviewFile}
        onClose={() => setReviewFile(null)}
        jobId={jobId}
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

function FileCard({ file, role, onReview, onApprove, onRequestChanges, onArchive, onDelete }) {
  const Icon = pickIcon(file.mimeType);
  const isClient = role === "client";
  const isVideo = file.mimeType?.startsWith("video/");
  const openCount = Number(file.openCommentCount || 0);
  const totalCount = Number(file.totalCommentCount || 0);
  return (
    <li className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div
        className={`relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 aspect-video flex items-center justify-center ${
          isVideo ? "cursor-pointer group" : ""
        }`}
        onClick={isVideo ? onReview : undefined}
      >
        {isVideo && file.url ? (
          <>
            <video
              src={file.url}
              preload="metadata"
              muted
              className="w-full h-full object-cover bg-black"
            />
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
      </div>

      <div className="p-3 space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{file.fileName}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {formatBytes(file.size)} · {file.category}
          </p>
        </div>

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
              onClick={onReview}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Review
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
          {file.url && (
            <a
              href={file.url}
              download={file.fileName}
              className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          {isClient && file.status === "PENDING_REVIEW" && (
            <>
              <button
                type="button"
                onClick={onRequestChanges}
                title="Request changes"
                className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onApprove}
                title="Approve"
                className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

function EmptyDrop({ onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl py-12 px-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mb-3">
        <Paperclip className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">No files yet</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Click here to upload your first deliverable.
      </p>
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
