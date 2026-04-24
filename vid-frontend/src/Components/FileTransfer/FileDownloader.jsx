import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileIcon, Pause, Play, XCircle, AlertCircle } from "lucide-react";
import axiosInstance from "../../utils/axios";

const CHUNK = 5 * 1024 * 1024;

function toS3Key(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return "";
  const t = fileUrl.trim();
  try {
    const u = new URL(t);
    return u.pathname.replace(/^\//, "");
  } catch {
    return t.replace(/^\//, "");
  }
}

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

function formatEta(s) {
  if (s == null || !Number.isFinite(s) || s < 0) return "—";
  if (s < 60) return `${Math.ceil(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.ceil(s % 60);
  if (m < 60) return `${m}m ${sec}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * @param {object} props
 * @param {string} props.fileUrl  S3 object key or full HTTPS URL
 * @param {string} props.fileName
 */
export default function FileDownloader({ fileUrl, fileName = "download" }) {
  const [state, setState] = useState("idle");
  const [signedUrl, setSignedUrl] = useState(null);
  const [totalSize, setTotalSize] = useState(null);
  const [loaded, setLoaded] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(null);
  const [error, setError] = useState("");

  const abortRef = useRef(null);
  const pauseRef = useRef(false);
  const offsetRef = useRef(0);
  const chunksRef = useRef([]);
  const speedSampleRef = useRef({ t: Date.now(), b: 0 });
  const signLoadingRef = useRef(false);

  const key = toS3Key(fileUrl);

  const fetchSigned = useCallback(async () => {
    if (!key) {
      setError("Missing file key or URL");
      return null;
    }
    const { data: body } = await axiosInstance.get("files/signed-url", {
      params: { key },
    });
    return body.data?.url;
  }, [key]);

  useEffect(() => {
    if (!fileUrl) return;
    setError("");
    setSignedUrl(null);
    setTotalSize(null);
    setLoaded(0);
    setState("idle");
    offsetRef.current = 0;
    chunksRef.current = [];
    (async () => {
      if (signLoadingRef.current) return;
      signLoadingRef.current = true;
      try {
        const u = await fetchSigned();
        setSignedUrl(u);
      } catch (e) {
        setError(e.response?.data?.message || e.message || "Could not get download link");
        setState("error");
      } finally {
        signLoadingRef.current = false;
      }
    })();
  }, [fileUrl, fetchSigned]);

  const runDownload = async () => {
    if (!signedUrl) {
      setError("No download URL");
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setState("downloading");
    setError("");
    pauseRef.current = false;

    let off = offsetRef.current;
    const chunks = chunksRef.current;
    let knownTotal = totalSize;

    if (off === 0) {
      chunks.length = 0;
      setLoaded(0);
    }

    const finalize = () => {
      const blob = new Blob(chunks, { type: "application/octet-stream" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(href);
      setState("completed");
      if (knownTotal != null) setLoaded(knownTotal);
      else setLoaded(off);
    };

    try {
      for (;;) {
        if (pauseRef.current) {
          setState("paused");
          return;
        }

        if (knownTotal != null && off >= knownTotal) {
          finalize();
          return;
        }

        const end =
          knownTotal == null ? off + CHUNK - 1 : Math.min(off + CHUNK - 1, knownTotal - 1);
        if (off > end) {
          finalize();
          return;
        }

        const rangeStart = off;
        const res = await fetch(signedUrl, {
          signal: ac.signal,
          headers: { Range: `bytes=${off}-${end}` },
        });
        if (!res.ok && res.status !== 206 && res.status !== 200) {
          const t = await res.text();
          throw new Error(t || `Download failed (${res.status})`);
        }

        if (knownTotal == null) {
          const cr = res.headers.get("Content-Range");
          if (cr) {
            const m = /\/(\d+)$/.exec(cr);
            if (m) {
              knownTotal = parseInt(m[1], 10);
              setTotalSize(knownTotal);
            }
          } else {
            const cl = res.headers.get("Content-Length");
            if (cl) {
              const n = parseInt(cl, 10);
              if (res.status === 200) {
                knownTotal = n;
                setTotalSize(n);
              }
            }
          }
        }

        const buf = await res.arrayBuffer();
        if (buf.byteLength === 0) {
          if (off === 0) throw new Error("Empty response");
          finalize();
          return;
        }

        chunks.push(buf);
        off += buf.byteLength;
        offsetRef.current = off;
        setLoaded(off);

        const now = Date.now();
        const dt = (now - speedSampleRef.current.t) / 1000;
        if (dt > 0.3) {
          const inst = (off - speedSampleRef.current.b) / dt;
          setSpeed(inst);
          if (knownTotal != null && inst > 0) setEta((knownTotal - off) / inst);
          speedSampleRef.current = { t: now, b: off };
        }

        if (res.status === 200) {
          finalize();
          return;
        }
        if (knownTotal != null && off >= knownTotal) {
          finalize();
          return;
        }
        if (buf.byteLength < end - rangeStart + 1) {
          finalize();
          return;
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        if (pauseRef.current) {
          setState("paused");
          return;
        }
        return;
      }
      setError(e.message || "Download failed");
      setState("error");
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
    }
  };

  const onPause = () => {
    pauseRef.current = true;
    abortRef.current?.abort();
  };

  const onResume = () => {
    pauseRef.current = false;
    void runDownload();
  };

  const onCancel = () => {
    pauseRef.current = true;
    abortRef.current?.abort();
    offsetRef.current = 0;
    chunksRef.current = [];
    setLoaded(0);
    setState("idle");
  };

  const progress = totalSize && totalSize > 0 ? Math.min(100, (loaded / totalSize) * 100) : 0;

  if (!key) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <AlertCircle className="inline w-4 h-4 mr-1" />
        No file to download
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        layout
        className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 p-5"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-fuchsia-50 text-purple-600">
            <FileIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800 truncate" title={fileName}>
              {fileName}
            </p>
            <p className="text-xs text-slate-500">
              {totalSize != null ? formatBytes(totalSize) : "Size unknown"}{" "}
              {loaded > 0 && ` · ${formatBytes(loaded)} received`}
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-2 flex items-start gap-1">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        {state === "downloading" || state === "paused" ? (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>{progress.toFixed(1)}%</span>
              <span>
                {formatSpeed(speed)} · ETA {formatEta(eta)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 22 }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {signedUrl && (state === "idle" || state === "error") && (
            <button
              type="button"
              onClick={runDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          {state === "downloading" && (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}
          {state === "paused" && (
            <>
              <button
                type="button"
                onClick={onResume}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white text-sm"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            </>
          )}
          {state === "completed" && (
            <p className="text-sm text-emerald-600 self-center">Saved to your device</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
