/**
 * Video Review Modal — the workspace USP.
 *
 * A Frame.io-style review surface that opens for any video deliverable:
 *   • HTML5 player with frame-stepping (←/→ on a paused video)
 *   • Comment markers on the scrubber (open=blue, resolved=green)
 *   • Click marker → seek to that timestamp; click bubble → seek + scroll
 *   • Add comment at current time, with optional vector drawing on the frame
 *   • Threaded replies + resolve workflow
 *   • Real-time updates over Socket.IO (REVIEW_COMMENT_*)
 *   • Optional "Watch together" mode: synchronized play/pause/seek between
 *     client + freelancer with live participant chips
 *
 * Props:
 *   open       boolean
 *   onClose    () => void
 *   jobId      number
 *   file       { id, fileName, url, mimeType, openCommentCount?, totalCommentCount? }
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import axiosInstance from "../../utils/axios";
import socketClient, { EVENTS } from "../../utils/socket";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Send,
  CheckCircle2,
  RefreshCcw,
  Trash2,
  Users,
  MessageSquare,
  PenLine,
  Eraser,
  Volume2,
  VolumeX,
  Maximize,
  AlertCircle,
  Layers,
  Download,
  Copy as CopyIcon,
} from "lucide-react";
import { toast } from "react-toastify";

const COLOR_PALETTE = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];

function fmt(t) {
  if (!Number.isFinite(t)) return "0:00";
  const total = Math.max(0, Math.round(t));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtPrecise(t) {
  if (!Number.isFinite(t)) return "0:00.0";
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}

function Avatar({ name, src, size = 28 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name || "user"}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}

export default function VideoReviewModal({ open, onClose, jobId, file, onFileStatusChange }) {
  const currentUser = useSelector(selectUser);
  const myId = currentUser?.id != null ? Number(currentUser.id) : null;
  const isClient = currentUser?.role === "CLIENT";

  const [versionStack, setVersionStack] = useState([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [statusBusy, setStatusBusy] = useState(false);

  const videoRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const containerRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);

  // Drawing
  const [drawingMode, setDrawingMode] = useState(false);
  const [strokeColor, setStrokeColor] = useState(COLOR_PALETTE[0]);
  const [strokes, setStrokes] = useState([]); // [{ color, points: [{x,y}, ...] }]
  const drawingRef = useRef(false);

  // Co-watch
  const [coWatchOn, setCoWatchOn] = useState(false);
  const [participants, setParticipants] = useState([]);
  const remoteSeekRef = useRef(false);

  // Reply state per comment id
  const [replyTo, setReplyTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");

  /* ────────────── version stack ────────────── */
  useEffect(() => {
    if (!open || !file?.fileName) return;
    let alive = true;
    axiosInstance
      .get(`/workspace/projects/${jobId}/files`)
      .then((res) => {
        if (!alive) return;
        const all = res.data?.data?.files || [];
        const same = all
          .filter((f) => f.fileName === file.fileName)
          .sort((a, b) => Number(b.version) - Number(a.version));
        setVersionStack(same);
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      alive = false;
    };
  }, [open, file?.id, file?.fileName, jobId]);

  /* ────────────── load + realtime sync ────────────── */
  const reload = useCallback(async () => {
    if (!file?.id || !jobId) return;
    setLoadingComments(true);
    setCommentError("");
    try {
      const res = await axiosInstance.get(
        `/workspace/projects/${jobId}/files/${file.id}/review/comments`
      );
      setComments(res.data?.data || []);
    } catch (e) {
      setCommentError(e?.response?.data?.message || "Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  }, [file?.id, jobId]);

  useEffect(() => {
    if (!open) return undefined;
    reload();

    const onAdded = (payload) => {
      if (payload?.fileId !== file?.id) return;
      setComments((prev) => (prev.some((c) => c.id === payload.id) ? prev : [...prev, payload]));
    };
    const onUpdated = (payload) => {
      if (payload?.fileId !== file?.id) return;
      setComments((prev) => prev.map((c) => (c.id === payload.id ? { ...c, ...payload } : c)));
    };
    const onDeleted = (payload) => {
      if (payload?.fileId !== file?.id) return;
      setComments((prev) =>
        prev.filter((c) => c.id !== payload.commentId && c.parentId !== payload.commentId)
      );
    };
    socketClient.on(EVENTS.REVIEW_COMMENT_ADDED, onAdded);
    socketClient.on(EVENTS.REVIEW_COMMENT_UPDATED, onUpdated);
    socketClient.on(EVENTS.REVIEW_COMMENT_DELETED, onDeleted);
    return () => {
      socketClient.off(EVENTS.REVIEW_COMMENT_ADDED, onAdded);
      socketClient.off(EVENTS.REVIEW_COMMENT_UPDATED, onUpdated);
      socketClient.off(EVENTS.REVIEW_COMMENT_DELETED, onDeleted);
    };
  }, [open, reload, file?.id]);

  /* ────────────── video lifecycle ────────────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => setDuration(v.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [open]);

  // Reset on file/open change
  useEffect(() => {
    if (!open) {
      setStrokes([]);
      setDrawingMode(false);
      setReplyTo(null);
      setReplyDraft("");
      setDraft("");
    }
  }, [open]);

  /* ────────────── co-watch wiring ────────────── */
  useEffect(() => {
    if (!open || !coWatchOn || !file?.id) return undefined;
    socketClient.connect();
    socketClient.emitRaw(EVENTS.COWATCH_JOIN, { jobId, fileId: file.id });

    const onState = ({ currentTimeSec, isPlaying: playing, fileId }) => {
      if (fileId !== file.id) return;
      const v = videoRef.current;
      if (!v) return;
      remoteSeekRef.current = true;
      if (Math.abs((v.currentTime || 0) - Number(currentTimeSec)) > 0.5) {
        v.currentTime = Number(currentTimeSec);
      }
      if (playing && v.paused) v.play().catch(() => {});
      if (!playing && !v.paused) v.pause();
      setTimeout(() => (remoteSeekRef.current = false), 250);
    };
    const onPlay = (p) => p?.fileId === file.id && onState({ ...p, isPlaying: true });
    const onPause = (p) => p?.fileId === file.id && onState({ ...p, isPlaying: false });
    const onSeek = (p) => p?.fileId === file.id && onState({ ...p, isPlaying: !videoRef.current?.paused });
    const onParts = ({ fileId, participants: parts }) => {
      if (fileId !== file.id) return;
      setParticipants(parts || []);
    };

    socketClient.on(EVENTS.COWATCH_STATE, onState);
    socketClient.on(EVENTS.COWATCH_PLAY, onPlay);
    socketClient.on(EVENTS.COWATCH_PAUSE, onPause);
    socketClient.on(EVENTS.COWATCH_SEEK, onSeek);
    socketClient.on(EVENTS.COWATCH_PARTICIPANTS, onParts);

    return () => {
      socketClient.off(EVENTS.COWATCH_STATE, onState);
      socketClient.off(EVENTS.COWATCH_PLAY, onPlay);
      socketClient.off(EVENTS.COWATCH_PAUSE, onPause);
      socketClient.off(EVENTS.COWATCH_SEEK, onSeek);
      socketClient.off(EVENTS.COWATCH_PARTICIPANTS, onParts);
      try {
        socketClient.emitRaw(EVENTS.COWATCH_LEAVE, { jobId, fileId: file.id });
      } catch {
        /* ignore */
      }
      setParticipants([]);
    };
  }, [open, coWatchOn, file?.id, jobId]);

  const broadcastAction = (kind, time) => {
    if (!coWatchOn || !file?.id) return;
    if (remoteSeekRef.current) return;
    try {
      socketClient.emitRaw(kind, { jobId, fileId: file.id, currentTimeSec: time });
    } catch {
      /* ignore */
    }
  };

  /* ────────────── drawing handlers ────────────── */
  const startStroke = (e) => {
    if (!drawingMode) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStrokes((prev) => [...prev, { color: strokeColor, points: [{ x, y }] }]);
  };
  const moveStroke = (e) => {
    if (!drawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStrokes((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      const updated = { ...last, points: [...last.points, { x, y }] };
      return [...prev.slice(0, -1), updated];
    });
  };
  const endStroke = () => {
    drawingRef.current = false;
  };

  // Render current strokes onto canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    const v = videoRef.current;
    if (!canvas || !v) return;
    const w = v.clientWidth || canvas.parentElement?.clientWidth || 800;
    const h = v.clientHeight || canvas.parentElement?.clientHeight || 450;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, w * 0.005);
    for (const stroke of strokes) {
      ctx.strokeStyle = stroke.color;
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }, [strokes, duration]);

  /* ────────────── derived sets ────────────── */
  const visibleComments = useMemo(() => {
    const top = comments.filter((c) => !c.parentId);
    const repliesByParent = new Map();
    for (const c of comments) {
      if (c.parentId) {
        const arr = repliesByParent.get(c.parentId) || [];
        arr.push(c);
        repliesByParent.set(c.parentId, arr);
      }
    }
    return top
      .filter((c) => (showResolved ? true : c.status !== "RESOLVED"))
      .sort((a, b) => Number(a.timestampSec) - Number(b.timestampSec))
      .map((c) => ({
        ...c,
        replies: (repliesByParent.get(c.id) || []).sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        ),
      }));
  }, [comments, showResolved]);

  const summary = useMemo(() => {
    const open_ = comments.filter((c) => !c.parentId && c.status === "OPEN").length;
    const resolved = comments.filter((c) => !c.parentId && c.status === "RESOLVED").length;
    return { open: open_, resolved };
  }, [comments]);

  /* ────────────── actions ────────────── */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      broadcastAction(EVENTS.COWATCH_PLAY, v.currentTime);
    } else {
      v.pause();
      broadcastAction(EVENTS.COWATCH_PAUSE, v.currentTime);
    }
  };
  const seekTo = (t, broadcast = true) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration || 0, t));
    if (broadcast) broadcastAction(EVENTS.COWATCH_SEEK, v.currentTime);
  };
  const stepFrame = (dir) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    seekTo((v.currentTime || 0) + dir * (1 / 30));
  };

  const submitComment = async () => {
    if (!draft.trim() && strokes.length === 0) return;
    try {
      await axiosInstance.post(
        `/workspace/projects/${jobId}/files/${file.id}/review/comments`,
        {
          content: draft.trim() || "(drawing)",
          timestampSec: Number(currentTime.toFixed(3)),
          drawing: strokes.length ? { strokes } : null,
        }
      );
      setDraft("");
      setStrokes([]);
      setDrawingMode(false);
    } catch (e) {
      setCommentError(e?.response?.data?.message || "Failed to add comment");
    }
  };

  const submitReply = async (parent) => {
    if (!replyDraft.trim()) return;
    try {
      await axiosInstance.post(
        `/workspace/projects/${jobId}/files/${file.id}/review/comments`,
        {
          content: replyDraft.trim(),
          timestampSec: Number(parent.timestampSec || 0),
          parentId: parent.id,
        }
      );
      setReplyTo(null);
      setReplyDraft("");
    } catch (e) {
      setCommentError(e?.response?.data?.message || "Failed to reply");
    }
  };

  const toggleResolve = async (comment) => {
    try {
      const target = comment.status === "RESOLVED" ? "OPEN" : "RESOLVED";
      await axiosInstance.post(
        `/workspace/projects/${jobId}/files/${file.id}/review/comments/${comment.id}/resolve`,
        { status: target }
      );
    } catch (e) {
      setCommentError(e?.response?.data?.message || "Failed to update status");
    }
  };

  const deleteOne = async (comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await axiosInstance.delete(
        `/workspace/projects/${jobId}/files/${file.id}/review/comments/${comment.id}`
      );
    } catch (e) {
      setCommentError(e?.response?.data?.message || "Failed to delete");
    }
  };

  const setStatus = async (status) => {
    if (!isClient) return;
    setStatusBusy(true);
    try {
      const res = await axiosInstance.patch(
        `/workspace/projects/${jobId}/files/${file.id}`,
        { status }
      );
      onFileStatusChange?.({ ...file, ...res.data?.data, status });
      toast.success(
        status === "APPROVED" ? "Approved — editor will be notified" : "Changes requested"
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not update status");
    } finally {
      setStatusBusy(false);
    }
  };

  const copyTimecodeLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#review:${file.id}@${currentTime.toFixed(3)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Timecode link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const changeRate = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };

  if (!open || !file) return null;

  const isVideo = (file.mimeType || "").startsWith("video/");
  const totalForBar = duration || 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950 text-white border-b border-white/10 shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <MessageSquare className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold truncate text-sm">{file.fileName}</p>
            <p className="text-xs text-gray-400">
              {summary.open} open · {summary.resolved} resolved · v{file.version || 1}
              {file.status === "APPROVED" && (
                <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
                  Approved
                </span>
              )}
              {file.status === "CHANGES_REQUESTED" && (
                <span className="ml-2 px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded">
                  Changes requested
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {versionStack.length > 1 && (
            <div className="hidden md:flex items-center gap-1 mr-2 px-2 py-1 bg-white/5 rounded-md">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              {versionStack.slice(0, 5).map((v) => (
                <button
                  key={v.id}
                  onClick={() => onFileStatusChange?.(v)}
                  className={`text-[11px] px-1.5 py-0.5 rounded ${
                    Number(v.id) === Number(file.id)
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                  title={`Version ${v.version}`}
                >
                  v{v.version}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={copyTimecodeLink}
            className="px-2 py-1.5 rounded-md text-xs bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-1"
            title="Copy a deep link to the current frame"
          >
            <CopyIcon className="w-3.5 h-3.5" /> Copy link
          </button>
          {file.url && (
            <a
              href={file.url}
              download={file.fileName}
              className="px-2 py-1.5 rounded-md text-xs bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-1"
              title="Download the file"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}
          {isClient && file.status !== "APPROVED" && (
            <>
              <button
                onClick={() => setStatus("CHANGES_REQUESTED")}
                disabled={statusBusy}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white inline-flex items-center gap-1 disabled:opacity-50"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Request changes
              </button>
              <button
                onClick={() => setStatus("APPROVED")}
                disabled={statusBusy}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
            </>
          )}
          <button
            onClick={() => setCoWatchOn((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              coWatchOn ? "bg-blue-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title="Synchronize playback with the other party"
          >
            <Users className="w-3.5 h-3.5" />
            {coWatchOn ? `Live (${participants.length})` : "Watch together"}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/10 text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: Player ── */}
        <div ref={containerRef} className="flex-1 flex flex-col bg-black min-w-0">
          {!isVideo ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-8">
              <div className="text-center">
                <p className="mb-3">This file isn&apos;t a video — open it directly to review.</p>
                {file.url && (
                  <a
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white"
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open file <Maximize className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="relative flex-1 flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  src={file.url}
                  className="max-h-full max-w-full"
                  controls={false}
                  playsInline
                  onClick={togglePlay}
                />
                <canvas
                  ref={drawCanvasRef}
                  onMouseDown={startStroke}
                  onMouseMove={moveStroke}
                  onMouseUp={endStroke}
                  onMouseLeave={endStroke}
                  className={`absolute inset-0 m-auto pointer-events-${drawingMode ? "auto" : "none"}`}
                  style={{ cursor: drawingMode ? "crosshair" : "default" }}
                />
              </div>

              {/* Scrubber + markers */}
              <div className="px-3 py-2 bg-gray-950 text-white border-t border-white/10">
                <div className="relative h-6 mb-2 select-none">
                  <div
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/15 rounded-full cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      seekTo(ratio * totalForBar);
                    }}
                  >
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(currentTime / totalForBar) * 100}%` }}
                    />
                  </div>
                  {comments
                    .filter((c) => !c.parentId)
                    .map((c) => {
                      const left = `${(Number(c.timestampSec) / totalForBar) * 100}%`;
                      const colour = c.status === "RESOLVED" ? "bg-emerald-500" : "bg-amber-400";
                      return (
                        <button
                          key={c.id}
                          onClick={() => seekTo(Number(c.timestampSec))}
                          title={`${fmt(c.timestampSec)} — ${c.author?.name || "User"}`}
                          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-2 ring-gray-950 ${colour} hover:scale-125 transition-transform`}
                          style={{ left }}
                        />
                      );
                    })}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => stepFrame(-1)} className="p-1.5 rounded hover:bg-white/10" title="Previous frame">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button onClick={togglePlay} className="p-1.5 rounded hover:bg-white/10" title={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => stepFrame(1)} className="p-1.5 rounded hover:bg-white/10" title="Next frame">
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <span className="ml-2 font-mono">{fmtPrecise(currentTime)} / {fmt(duration)}</span>
                  <div className="ml-2 flex items-center gap-1 text-[11px]">
                    {[0.5, 1, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeRate(rate)}
                        className={`px-1.5 py-0.5 rounded ${
                          playbackRate === rate ? "bg-blue-600 text-white" : "hover:bg-white/10 text-gray-300"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setMuted((m) => { const n = !m; if (videoRef.current) videoRef.current.muted = n; return n; })}
                      className="p-1.5 rounded hover:bg-white/10"
                      title={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setDrawingMode((d) => !d)}
                      className={`p-1.5 rounded ${drawingMode ? "bg-blue-600" : "hover:bg-white/10"}`}
                      title="Draw on frame"
                    >
                      <PenLine className="w-4 h-4" />
                    </button>
                    {drawingMode && (
                      <>
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            onClick={() => setStrokeColor(c)}
                            className={`w-4 h-4 rounded-full border-2 ${
                              strokeColor === c ? "border-white" : "border-white/30"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <button
                          onClick={() => setStrokes([])}
                          className="p-1.5 rounded hover:bg-white/10"
                          title="Clear drawing"
                        >
                          <Eraser className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {coWatchOn && participants.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-blue-200">
                    <Users className="w-3 h-3" />
                    Live with: {participants.map((p) => p.name).join(", ")}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Composer for new comment at current timestamp */}
          {isVideo && (
            <div className="bg-gray-900 text-white p-3 border-t border-white/10">
              <div className="flex items-end gap-2">
                <span className="text-[11px] font-mono px-2 py-1 bg-blue-600 rounded text-white whitespace-nowrap mt-1">
                  @ {fmtPrecise(currentTime)}
                </span>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
                  }}
                  placeholder="Leave a frame-accurate note for this moment… (Ctrl/⌘+Enter to send)"
                  rows={2}
                  className="flex-1 bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={submitComment}
                  disabled={!draft.trim() && strokes.length === 0}
                  className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-md"
                  title="Add comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {strokes.length > 0 && (
                <p className="mt-1 text-[11px] text-blue-300">
                  Drawing attached ({strokes.length} stroke{strokes.length === 1 ? "" : "s"})
                </p>
              )}
              {commentError && (
                <p className="mt-1 text-[11px] text-red-300">{commentError}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Comment sidebar ── */}
        <aside className="w-[340px] max-w-[40%] bg-gray-50 border-l border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-200 flex items-center gap-2">
            {[
              { id: "comments", label: `Comments (${summary.open + summary.resolved})` },
              { id: "activity", label: "Activity" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`text-xs px-2 py-1 rounded ${
                  activeTab === t.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setShowResolved((p) => !p)}
              className="ml-auto text-[11px] text-gray-600 hover:text-gray-900"
            >
              {showResolved ? "Hide resolved" : "Show resolved"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loadingComments && comments.length === 0 ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : visibleComments.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                {summary.resolved > 0 && !showResolved
                  ? "No open comments. Toggle Show resolved to see history."
                  : "No comments yet — pause the video at a moment that needs feedback and add the first note."}
              </div>
            ) : (
              visibleComments.map((c) => {
                const isAuthor = Number(c.author?.id) === myId;
                return (
                  <div
                    key={c.id}
                    className={`bg-white rounded-lg border ${
                      c.status === "RESOLVED" ? "border-emerald-200" : "border-gray-200"
                    } shadow-sm`}
                  >
                    <button
                      onClick={() => seekTo(Number(c.timestampSec))}
                      className="flex w-full items-center justify-between px-3 py-2 border-b border-gray-100 hover:bg-blue-50/40 group"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={c.author?.name}
                          src={c.author?.profilePicture}
                          size={24}
                        />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-gray-900">
                            {c.author?.name || "User"}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 group-hover:bg-blue-100">
                        @ {fmtPrecise(Number(c.timestampSec))}
                      </span>
                    </button>
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                      {c.drawing?.strokes?.length > 0 && (
                        <p className="mt-1 text-[11px] text-blue-600">
                          ✎ has frame drawing
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => toggleResolve(c)}
                          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded ${
                            c.status === "RESOLVED"
                              ? "text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                              : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          {c.status === "RESOLVED" ? (
                            <>
                              <RefreshCcw className="w-3 h-3" /> Re-open
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Resolve
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setReplyTo(c.id);
                            setReplyDraft("");
                          }}
                          className="text-[11px] text-blue-700 hover:underline"
                        >
                          Reply
                        </button>
                        {isAuthor && (
                          <button
                            onClick={() => deleteOne(c)}
                            className="ml-auto text-[11px] text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>

                      {c.replies.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-gray-200 space-y-2">
                          {c.replies.map((r) => (
                            <div key={r.id} className="flex gap-2">
                              <Avatar name={r.author?.name} src={r.author?.profilePicture} size={20} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-gray-900 leading-tight">
                                  {r.author?.name || "User"}
                                  <span className="ml-1 text-[10px] text-gray-400 font-normal">
                                    {new Date(r.createdAt).toLocaleString()}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                                  {r.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyTo === c.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={replyDraft}
                            onChange={(e) => setReplyDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitReply(c);
                              if (e.key === "Escape") setReplyTo(null);
                            }}
                            placeholder="Reply…"
                            autoFocus
                            className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => submitReply(c)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-gray-300"
                            disabled={!replyDraft.trim()}
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
