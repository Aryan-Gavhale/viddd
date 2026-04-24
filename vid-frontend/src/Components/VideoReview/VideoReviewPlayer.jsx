import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import axiosInstance from "../../utils/axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize,
  MessageCircle, Send, ChevronDown, Filter,
  SkipBack, SkipForward, Clock, PenTool, X,
} from "lucide-react";
import CommentThread from "./CommentThread";
import VideoMarkers from "./VideoMarkers";
import DrawingCanvas from "./DrawingCanvas";
import { formatTimecode } from "./formatTimecode";
import { toast } from "react-toastify";

const SNAP_RANGE = 2;

export default function VideoReviewPlayer() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const videoUrl = searchParams.get("video") || "";
  const user = useSelector(selectUser);

  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const commentsEndRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [filterResolved, setFilterResolved] = useState("all");

  const [newComment, setNewComment] = useState("");
  const [commentTimecode, setCommentTimecode] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  const [activeCommentId, setActiveCommentId] = useState(null);

  // Drawing / annotation state
  const [drawingMode, setDrawingMode] = useState(false);
  const [annotationData, setAnnotationData] = useState(null);
  const [viewingAnnotation, setViewingAnnotation] = useState(null);
  const drawingRef = useRef(null);
  const videoContainerRef = useRef(null);

  const fetchComments = useCallback(async () => {
    try {
      const url = videoUrl
        ? `/video-review/${orderId}/comments?videoUrl=${encodeURIComponent(videoUrl)}`
        : `/video-review/${orderId}/comments`;
      const res = await axiosInstance.get(url);
      setComments(res.data?.data || []);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }, [orderId, videoUrl]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const allMarkers = useMemo(() => {
    const flat = [];
    function walk(list) {
      for (const c of list) {
        flat.push({
          id: c.id,
          timecode: c.timecode,
          resolved: Boolean(c.resolvedAt),
          content: c.content,
          userName: c.user?.name,
        });
        if (c.replies?.length) walk(c.replies);
      }
    }
    walk(comments);
    return flat;
  }, [comments]);

  const filteredComments = useMemo(() => {
    if (filterResolved === "all") return comments;
    return comments.filter((c) =>
      filterResolved === "resolved" ? c.resolvedAt : !c.resolvedAt
    );
  }, [comments, filterResolved]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    const match = allMarkers.find(
      (m) => Math.abs(m.timecode - currentTime) < SNAP_RANGE
    );
    setActiveCommentId(match ? match.id : null);
  }, [currentTime, allMarkers]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const seek = useCallback((t) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setCurrentTime(t);
  }, []);

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  };

  const skipBy = (s) => seek(Math.max(0, Math.min(duration, currentTime + s)));

  const setTimecodeFromVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setCommentTimecode(videoRef.current.currentTime);
    }
  };

  const enterDrawingMode = () => {
    if (videoRef.current) videoRef.current.pause();
    setCommentTimecode(videoRef.current?.currentTime ?? 0);
    setDrawingMode(true);
    setViewingAnnotation(null);
  };

  const exitDrawingMode = () => {
    setDrawingMode(false);
    if (drawingRef.current) drawingRef.current.clearCanvas();
    setAnnotationData(null);
  };

  const handleViewAnnotation = useCallback((annotation) => {
    if (!annotation) return;
    setViewingAnnotation(annotation);
    setDrawingMode(false);
  }, []);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || commentTimecode == null) return;
    setSubmitting(true);
    try {
      const payload = {
        videoUrl: videoUrl || `order-${orderId}-video`,
        timecode: commentTimecode,
        content: newComment.trim(),
      };

      if (drawingRef.current?.hasAnnotation()) {
        payload.annotationData = drawingRef.current.getAnnotationData();
        payload.frameSnapshot = drawingRef.current.getSnapshotDataUrl();
      }

      await axiosInstance.post(`/video-review/${orderId}/comments`, payload);
      setNewComment("");
      setCommentTimecode(null);
      setAnnotationData(null);
      setDrawingMode(false);
      if (drawingRef.current) drawingRef.current.clearCanvas();
      toast.success("Comment added");
      await fetchComments();
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parent) => {
    if (!replyDraft.trim()) return;
    setSubmitting(true);
    try {
      await axiosInstance.post(`/video-review/${orderId}/comments`, {
        videoUrl: parent.videoUrl || videoUrl || `order-${orderId}-video`,
        timecode: parent.timecode,
        content: replyDraft.trim(),
        parentId: parent.id,
      });
      setReplyTargetId(null);
      setReplyDraft("");
      toast.success("Reply added");
      await fetchComments();
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editDraft.trim()) return;
    setSubmitting(true);
    try {
      await axiosInstance.put(`/video-review/comments/${commentId}`, {
        content: editDraft.trim(),
      });
      setEditId(null);
      setEditDraft("");
      toast.success("Comment updated");
      await fetchComments();
    } catch {
      toast.error("Failed to update comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await axiosInstance.delete(`/video-review/comments/${commentId}`);
      toast.success("Comment deleted");
      await fetchComments();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleResolve = async (commentId) => {
    try {
      await axiosInstance.post(`/video-review/comments/${commentId}/resolve`);
      toast.success("Comment resolved");
      await fetchComments();
    } catch {
      toast.error("Failed to resolve");
    }
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.requestFullscreen?.();
  };

  const handleSeekAndShowAnnotation = useCallback((timecode, annotation) => {
    seek(timecode);
    if (annotation) {
      handleViewAnnotation(annotation);
    }
  }, [seek, handleViewAnnotation]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const resolvedCount = allMarkers.filter((m) => m.resolved).length;
  const unresolvedCount = allMarkers.length - resolvedCount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Video Review
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Order #{orderId} &middot; Click the timeline to add timecoded feedback
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {unresolvedCount} open
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              {resolvedCount} resolved
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {/* Video Panel */}
          <div className="lg:col-span-2 xl:col-span-3">
            <div className={`overflow-hidden rounded-2xl border shadow-xl ${drawingMode ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-slate-200 dark:border-slate-700"} bg-black`}>
              {/* Drawing mode banner */}
              <AnimatePresence>
                {drawingMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex items-center justify-between overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <PenTool className="h-4 w-4" />
                      Drawing Mode — Annotate this frame
                    </div>
                    <button
                      onClick={exitDrawingMode}
                      className="rounded-lg p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Video element + canvas overlay */}
              <div className="relative aspect-video bg-black" ref={videoContainerRef}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="h-full w-full object-contain"
                  muted={muted}
                  onClick={drawingMode ? undefined : togglePlay}
                  playsInline
                />

                {/* Drawing canvas overlay */}
                <DrawingCanvas
                  ref={drawingRef}
                  width={1920}
                  height={1080}
                  active={drawingMode}
                  existingAnnotation={null}
                  onAnnotationChange={setAnnotationData}
                />

                {/* Viewing saved annotation from a comment */}
                {viewingAnnotation && !drawingMode && (
                  <div className="pointer-events-none absolute inset-0 z-10">
                    <AnnotationOverlay
                      annotationData={viewingAnnotation}
                      width={1920}
                      height={1080}
                    />
                    <button
                      onClick={() => setViewingAnnotation(null)}
                      className="pointer-events-auto absolute right-3 top-3 rounded-lg bg-black/70 p-1.5 text-white/80 backdrop-blur transition hover:bg-black/90 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Play overlay */}
                {!playing && !drawingMode && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 z-[5] flex items-center justify-center bg-black/20 transition hover:bg-black/30"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur">
                      <Play className="ml-1 h-7 w-7 text-slate-900" />
                    </div>
                  </button>
                )}
              </div>

              {/* Controls bar */}
              <div className="relative bg-slate-900 px-4 py-3">
                {/* Progress bar */}
                <div className="relative mb-3">
                  <VideoMarkers
                    markers={allMarkers}
                    duration={duration}
                    currentTime={currentTime}
                    onMarkerClick={(t) => seek(t)}
                  />
                  <div
                    ref={progressRef}
                    onClick={handleProgressClick}
                    className="group relative h-2 cursor-pointer rounded-full bg-slate-700"
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500 opacity-0 shadow transition group-hover:opacity-100"
                      style={{ left: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Buttons row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={togglePlay} className="rounded-lg p-1.5 text-white transition hover:bg-white/10">
                      {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                    </button>
                    <button onClick={() => skipBy(-5)} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button onClick={() => skipBy(5)} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <span className="ml-2 font-mono text-xs text-slate-300">
                      {formatTimecode(currentTime)} / {formatTimecode(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={enterDrawingMode}
                      className={`rounded-lg p-1.5 transition ${
                        drawingMode
                          ? "bg-indigo-500 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                      title="Draw on frame"
                    >
                      <PenTool className="h-4 w-4" />
                    </button>
                    <div className="h-4 w-px bg-white/20" />
                    <button onClick={() => setMuted(!muted)} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={muted ? 0 : volume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setVolume(v);
                        setMuted(v === 0);
                        if (videoRef.current) videoRef.current.volume = v;
                      }}
                      className="h-1 w-16 cursor-pointer accent-indigo-500"
                    />
                    <button onClick={toggleFullscreen} className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
                      <Maximize className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add comment bar */}
            <motion.div
              layout
              className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={setTimecodeFromVideo}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    commentTimecode != null
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-900/30"
                  }`}
                >
                  <Clock className="mr-1.5 inline h-4 w-4" />
                  {commentTimecode != null
                    ? formatTimecode(commentTimecode)
                    : "Set timecode"}
                </button>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      commentTimecode != null
                        ? `Add feedback at ${formatTimecode(commentTimecode)}…`
                        : "Click 'Set timecode' first, then type your feedback…"
                    }
                    rows={2}
                    disabled={commentTimecode == null}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitComment();
                    }}
                  />
                </div>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || commentTimecode == null || submitting}
                  className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="mr-1.5 inline h-4 w-4" />
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>
              {/* Annotation indicator */}
              {annotationData && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    <PenTool className="h-3 w-3" />
                    Annotation attached
                  </span>
                  <button
                    onClick={() => {
                      if (drawingRef.current) drawingRef.current.clearCanvas();
                      setAnnotationData(null);
                    }}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tip: Press Ctrl+Enter to post &middot; Click <PenTool className="mx-0.5 inline h-3 w-3" /> to draw on frame
                </p>
                {!drawingMode && commentTimecode != null && (
                  <button
                    onClick={enterDrawingMode}
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60"
                  >
                    <PenTool className="h-3 w-3" />
                    Annotate frame
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Comments sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              {/* Sidebar header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <MessageCircle className="h-4 w-4 text-indigo-500" />
                  Comments ({allMarkers.length})
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                  <AnimatePresence>
                    {showFilter && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-600 dark:bg-slate-800"
                      >
                        {["all", "open", "resolved"].map((f) => (
                          <button
                            key={f}
                            onClick={() => { setFilterResolved(f); setShowFilter(false); }}
                            className={`block w-full px-3 py-1.5 text-left text-xs capitalize ${
                              filterResolved === f
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Comments list */}
              <div className="max-h-[calc(100vh-14rem)] space-y-3 overflow-y-auto p-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse space-y-2">
                        <div className="flex gap-2">
                          <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                            <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredComments.length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      No comments yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Click "Set timecode" and leave feedback
                    </p>
                  </div>
                ) : (
                  filteredComments.map((c) => (
                    <CommentThread
                      key={c.id}
                      comment={c}
                      currentUser={user}
                      isParticipant={true}
                      activeCommentId={activeCommentId}
                      highlightId={null}
                      onSeek={seek}
                      onResolve={handleResolve}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onViewAnnotation={handleViewAnnotation}
                      replyTargetId={replyTargetId}
                      setReplyTargetId={setReplyTargetId}
                      editId={editId}
                      setEditId={setEditId}
                      replyDraft={replyDraft}
                      setReplyDraft={setReplyDraft}
                      editDraft={editDraft}
                      setEditDraft={setEditDraft}
                      replySubmit={handleReply}
                      editSubmit={handleEdit}
                      isSubmitting={submitting}
                    />
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnotationOverlay({ annotationData, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !annotationData) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let strokes = [];
    try { strokes = JSON.parse(annotationData); } catch { return; }
    if (!Array.isArray(strokes)) return;

    for (const stroke of strokes) {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (stroke.tool) {
        case "pen": {
          if (!stroke.points || stroke.points.length < 2) break;
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            const p0 = stroke.points[i - 1];
            const p1 = stroke.points[i];
            ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
          }
          ctx.stroke();
          break;
        }
        case "arrow": {
          if (!stroke.start || !stroke.end) break;
          ctx.beginPath();
          ctx.moveTo(stroke.start.x, stroke.start.y);
          ctx.lineTo(stroke.end.x, stroke.end.y);
          ctx.stroke();
          const angle = Math.atan2(stroke.end.y - stroke.start.y, stroke.end.x - stroke.start.x);
          const hl = Math.max(12, stroke.lineWidth * 4);
          ctx.beginPath();
          ctx.moveTo(stroke.end.x, stroke.end.y);
          ctx.lineTo(stroke.end.x - hl * Math.cos(angle - Math.PI / 6), stroke.end.y - hl * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(stroke.end.x, stroke.end.y);
          ctx.lineTo(stroke.end.x - hl * Math.cos(angle + Math.PI / 6), stroke.end.y - hl * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          break;
        }
        case "rect": {
          if (!stroke.start || !stroke.end) break;
          ctx.strokeRect(
            Math.min(stroke.start.x, stroke.end.x),
            Math.min(stroke.start.y, stroke.end.y),
            Math.abs(stroke.end.x - stroke.start.x),
            Math.abs(stroke.end.y - stroke.start.y)
          );
          break;
        }
        case "circle": {
          if (!stroke.start || !stroke.end) break;
          ctx.beginPath();
          ctx.ellipse(
            (stroke.start.x + stroke.end.x) / 2,
            (stroke.start.y + stroke.end.y) / 2,
            Math.abs(stroke.end.x - stroke.start.x) / 2,
            Math.abs(stroke.end.y - stroke.start.y) / 2,
            0, 0, Math.PI * 2
          );
          ctx.stroke();
          break;
        }
        case "text": {
          if (!stroke.position || !stroke.text) break;
          ctx.font = `${Math.max(14, stroke.lineWidth * 5)}px Inter, system-ui, sans-serif`;
          ctx.fillText(stroke.text, stroke.position.x, stroke.position.y);
          break;
        }
      }
      ctx.restore();
    }
  }, [annotationData, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
