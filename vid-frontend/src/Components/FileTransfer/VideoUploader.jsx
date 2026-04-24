import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  UploadCloud,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
} from "lucide-react";
import axiosInstance from "../../utils/axios";

const CHUNK_SIZE = 100 * 1024 * 1024;
const DEFAULT_MAX_GB = 50;
const maxBytes = (maxGb) => maxGb * 1024 * 1024 * 1024;

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatSpeed(bps) {
  if (!bps || bps <= 0) return "—";
  const mb = bps / (1024 * 1024);
  if (mb < 0.01) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${mb.toFixed(2)} MB/s`;
}

function formatEta(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * @param {object} props
 * @param {(url: string, key: string) => void} props.onUploadComplete
 * @param {number} [props.orderId]
 * @param {number} [props.jobId]
 * @param {number} [props.maxSizeGB=50]
 */
export default function VideoUploader({ onUploadComplete, orderId, jobId, maxSizeGB = DEFAULT_MAX_GB }) {
  const [state, setState] = useState("idle");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploadId, setUploadId] = useState(null);
  const [s3Key, setS3Key] = useState(null);
  const [totalParts, setTotalParts] = useState(0);
  const [currentPart, setCurrentPart] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadIdRef = useRef(null);
  const s3KeyRef = useRef(null);
  const abortRef = useRef(null);
  const speedRef = useRef({ t: Date.now(), b: 0 });
  const pauseRef = useRef(false);
  const partsMetaRef = useRef([]);

  const cap = maxBytes(maxSizeGB);

  const resetProgress = () => {
    setBytesUploaded(0);
    setCurrentPart(0);
    setSpeed(0);
    setEta(null);
    speedRef.current = { t: Date.now(), b: 0 };
  };

  const runUpload = useCallback(
    async (f, partNumberStart) => {
      if (!f) return;
      const runId = {};
      abortRef.current = runId;
      setState("uploading");
      setError("");
      pauseRef.current = false;

      const body = {
        fileName: f.name,
        contentType: f.type || "video/mp4",
        fileSize: f.size,
        ...(orderId != null ? { orderId } : {}),
        ...(jobId != null ? { jobId } : {}),
      };

      let uid = uploadIdRef.current;
      let key = s3KeyRef.current;
      let tParts = Math.ceil(f.size / CHUNK_SIZE);

      if (partNumberStart === 1 && (!uid || !key)) {
        const init = await axiosInstance.post("files/initiate-upload", body);
        const d = init.data.data;
        uid = d.uploadId;
        key = d.key;
        tParts = Math.ceil(f.size / CHUNK_SIZE);
        uploadIdRef.current = uid;
        s3KeyRef.current = key;
        setUploadId(uid);
        setS3Key(key);
        setTotalParts(tParts);
        partsMetaRef.current = [];
        resetProgress();
      } else {
        tParts = totalParts > 0 ? totalParts : tParts;
        if (!uid || !key) {
          setError("Missing session — start the upload again.");
          setState("error");
          return;
        }
        setTotalParts(tParts);
      }

      const etags = partsMetaRef.current
        .map((p) => ({ ...p }))
        .sort((a, b) => a.PartNumber - b.PartNumber);

      for (let p = partNumberStart; p <= tParts; p += 1) {
        if (pauseRef.current) {
          setState("paused");
          return;
        }
        if (abortRef.current !== runId) return;

        const already = etags.find((e) => e.PartNumber === p);
        if (already) {
          setCurrentPart(p);
          const uploadedSum = etags.reduce((s, e) => s + (e._size || 0), 0);
          setBytesUploaded(uploadedSum);
          continue;
        }

        setCurrentPart(p);
        const start = (p - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, f.size);
        const blob = f.slice(start, end);

        const partRes = await axiosInstance.post("files/upload-part-url", {
          key,
          uploadId: uid,
          partNumber: p,
        });
        const putUrl = partRes.data.data.url;

        const t0 = speedRef.current.t;
        const b0 = speedRef.current.b;
        const partLen = end - start;

        const res = await fetch(putUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": f.type || "video/mp4" },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `Part ${p} upload failed (${res.status})`);
        }

        const etag = res.headers.get("ETag") || res.headers.get("etag");
        if (!etag) throw new Error("Missing ETag from S3 response");

        const partRow = { PartNumber: p, ETag: etag, _size: partLen };
        const ix = etags.findIndex((e) => e.PartNumber === p);
        if (ix >= 0) etags.splice(ix, 1, partRow);
        else etags.push(partRow);
        etags.sort((a, b) => a.PartNumber - b.PartNumber);
        partsMetaRef.current = etags;

        const newUploaded = etags.reduce((s, e) => s + (e._size || 0), 0);
        setBytesUploaded(newUploaded);

        const now = Date.now();
        const dt = (now - t0) / 1000;
        if (dt > 0.2) {
          const inst = (newUploaded - b0) / dt;
          setSpeed(inst);
          const remaining = f.size - newUploaded;
          setEta(inst > 0 ? remaining / inst : null);
          speedRef.current = { t: now, b: newUploaded };
        } else {
          speedRef.current = { t: t0, b: b0 };
        }
      }

      if (pauseRef.current) {
        setState("paused");
        return;
      }

      if (etags.length !== tParts) {
        throw new Error("Part count mismatch; try Resume to sync with server.");
      }

      const completePayload = {
        key,
        uploadId: uid,
        parts: etags.map(({ PartNumber, ETag }) => ({ PartNumber, ETag })),
      };
      const done = await axiosInstance.post("files/complete-upload", completePayload);
      const url = done.data.data.url;
      setState("completed");
      onUploadComplete?.(url, key);
    },
    [onUploadComplete, orderId, jobId, totalParts]
  );

  const onPick = (incoming) => {
    setError("");
    if (!incoming) return;
    if (!incoming.type || !incoming.type.startsWith("video/")) {
      setError("Please select a video file (video/*).");
      return;
    }
    if (incoming.size > cap) {
      setError(`File must be at most ${maxSizeGB}GB.`);
      return;
    }
    if (incoming.size < 1) {
      setError("File is empty.");
      return;
    }
    setFile(incoming);
    setFileSize(incoming.size);
    setUploadId(null);
    setS3Key(null);
    uploadIdRef.current = null;
    s3KeyRef.current = null;
    setState("idle");
    resetProgress();
    partsMetaRef.current = [];
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onPick(e.dataTransfer?.files?.[0]);
  };

  const startUpload = async () => {
    if (!file) return;
    try {
      await runUpload(file, 1);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Upload failed";
      setError(String(msg));
      setState("error");
    }
  };

  const continueAfterPause = async () => {
    if (!file) return;
    pauseRef.current = false;
    try {
      if (!uploadIdRef.current) {
        setError("No active upload session.");
        setState("error");
        return;
      }
      const statusRes = await axiosInstance.get(
        `files/upload-status/${encodeURIComponent(uploadIdRef.current)}`
      );
      const s = statusRes.data.data;
      const serverParts = s.parts || [];
      const tParts = s.totalParts || Math.ceil(file.size / CHUNK_SIZE);
      s3KeyRef.current = s.key;
      setS3Key(s.key);
      setTotalParts(tParts);
      const have = new Set(serverParts.map((p) => p.PartNumber));
      partsMetaRef.current = serverParts.map((p) => {
        const st = (p.PartNumber - 1) * CHUNK_SIZE;
        const en = Math.min(st + CHUNK_SIZE, file.size);
        return { PartNumber: p.PartNumber, ETag: p.ETag, _size: en - st };
      });
      setBytesUploaded(partsMetaRef.current.reduce((a, p) => a + p._size, 0));

      let nextP = null;
      for (let i = 1; i <= tParts; i += 1) {
        if (!have.has(i)) {
          nextP = i;
          break;
        }
      }

      if (nextP == null) {
        const etags = partsMetaRef.current.map(({ PartNumber, ETag }) => ({ PartNumber, ETag }));
        const done = await axiosInstance.post("files/complete-upload", {
          key: s.key,
          uploadId: uploadIdRef.current,
          parts: etags,
        });
        onUploadComplete?.(done.data.data.url, s.key);
        setState("completed");
        return;
      }

      await runUpload(file, nextP);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "Could not resume";
      setError(String(msg));
      setState("error");
    }
  };

  const handlePause = () => {
    pauseRef.current = true;
  };

  const handleCancel = async () => {
    pauseRef.current = true;
    const k = s3KeyRef.current;
    const u = uploadIdRef.current;
    if (u && k) {
      try {
        await axiosInstance.post("files/abort-upload", { key: k, uploadId: u });
      } catch {
        // ignore
      }
    }
    uploadIdRef.current = null;
    s3KeyRef.current = null;
    setState("idle");
    setFile(null);
    setUploadId(null);
    setS3Key(null);
    resetProgress();
  };

  const progress = file && fileSize ? Math.min(100, (bytesUploaded / fileSize) * 100) : 0;

  return (
    <div className="w-full max-w-xl mx-auto">
      <motion.div
        layout
        className="rounded-2xl border border-purple-200/60 bg-gradient-to-b from-white to-purple-50/30 shadow-lg shadow-purple-500/5 overflow-hidden"
      >
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && document.getElementById("vup-file")?.click()}
          onClick={() => state === "idle" && document.getElementById("vup-file")?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={[
            "relative p-8 text-center border-2 border-dashed rounded-xl m-3 transition-colors cursor-pointer",
            dragOver ? "border-purple-500 bg-purple-50" : "border-purple-200 hover:border-purple-400",
            state !== "idle" && "pointer-events-none opacity-60",
          ].join(" ")}
        >
          <input
            id="vup-file"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Video className="w-10 h-10" />
            </div>
            <p className="text-slate-800 font-medium">Drag & drop or click to upload</p>
            <p className="text-sm text-slate-500">Video only · up to {maxSizeGB}GB · 100MB parts</p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {file && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-6 pb-2 space-y-1"
            >
              <p className="text-sm font-medium text-slate-800 truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mx-6 mb-2 flex items-start gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="px-6 pb-4 space-y-3">
          {(state === "uploading" || state === "paused") && (
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>
                  Part {currentPart} / {totalParts || "—"}
                </span>
                <span>
                  {formatSpeed(speed)} · ETA {formatEta(eta)}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
              <p className="text-right text-xs text-slate-500 mt-1">{progress.toFixed(1)}%</p>
            </div>
          )}

          {state === "completed" && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2 text-emerald-600 text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              Upload complete
            </motion.div>
          )}

          <div className="flex flex-wrap gap-2">
            {file && state === "idle" && (
              <button
                type="button"
                onClick={startUpload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 shadow"
              >
                <UploadCloud className="w-4 h-4" />
                Start upload
              </button>
            )}
            {state === "uploading" && (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 text-purple-800 text-sm hover:bg-purple-50"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}
            {state === "paused" && (
              <>
                <button
                  type="button"
                  onClick={continueAfterPause}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}
            {(state === "error" || state === "completed") && file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setState("idle");
                  setError("");
                  uploadIdRef.current = null;
                  s3KeyRef.current = null;
                  setUploadId(null);
                  setS3Key(null);
                }}
                className="text-sm text-purple-600 hover:underline"
              >
                Upload another
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
