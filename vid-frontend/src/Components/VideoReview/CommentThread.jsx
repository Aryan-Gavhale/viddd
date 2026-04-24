import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle, Reply, Edit2, Trash2, Send, X, Check, PenTool, Eye } from "lucide-react";
import { formatTimecode } from "./formatTimecode.js";

function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return `${p[0][0] || ""}${p[p.length - 1][0] || ""}`.toUpperCase() || "?";
}

/**
 * Renders a single comment, nested replies, and actions.
 */
export default function CommentThread({
  comment,
  currentUser,
  isParticipant,
  activeCommentId,
  highlightId,
  onSeek,
  onResolve,
  onEdit,
  onDelete,
  onViewAnnotation,
  depth = 0,
  replyTargetId,
  setReplyTargetId,
  editId,
  setEditId,
  replyDraft,
  setReplyDraft,
  editDraft,
  setEditDraft,
  replySubmit,
  editSubmit,
  isSubmitting,
}) {
  const uid = currentUser?.id != null ? Number(currentUser.id) : null;
  const authorId = comment.userId != null ? Number(comment.userId) : null;
  const isOwn = uid != null && authorId != null && uid === authorId;
  const resolved = Boolean(comment.resolvedAt);
  const isActive = String(activeCommentId) === String(comment.id);
  const isHighlight = String(highlightId) === String(comment.id);

  return (
    <div
      className={`${
        depth > 0 ? "mt-3 border-l-2 border-slate-200 pl-3 dark:border-slate-600" : ""
      }`}
    >
      <motion.div
        layout
        initial={false}
        animate={
          resolved
            ? { backgroundColor: "rgba(16, 185, 129, 0.06)" }
            : { backgroundColor: "rgba(0,0,0,0)" }
        }
        className={`rounded-xl border transition-colors ${
          isHighlight
            ? "border-indigo-500/60 bg-indigo-500/10 dark:border-indigo-400/50"
            : isActive
              ? "border-amber-500/40 bg-amber-500/5 dark:border-amber-500/30"
              : "border-slate-200/80 bg-white/50 dark:border-slate-700 dark:bg-slate-900/40"
        } p-3`}
      >
        <div className="flex gap-3">
          <div className="shrink-0">
            {comment.user?.avatar ? (
              <img
                src={comment.user.avatar}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-600"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-semibold text-white"
                aria-hidden
              >
                {getInitials(comment.user?.name)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {comment.user?.name || "Unknown"}
              </span>
              <button
                type="button"
                onClick={() => onSeek(Number(comment.timecode))}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700"
              >
                <Clock className="h-3 w-3" />
                {formatTimecode(comment.timecode)}
              </button>
              {comment.createdAt && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              )}
              {resolved && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle className="h-3 w-3" />
                  Resolved
                </motion.span>
              )}
            </div>
            {editId === comment.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-indigo-500/30 focus:border-indigo-500 focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => editSubmit(comment.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(null);
                      setEditDraft("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p
                  className={`mt-1.5 whitespace-pre-wrap text-sm ${
                    resolved ? "text-slate-500 line-through dark:text-slate-500" : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {comment.content}
                </p>

                {/* Annotation thumbnail */}
                {(comment.frameSnapshot || comment.annotationData) && (
                  <button
                    type="button"
                    onClick={() => {
                      onSeek(Number(comment.timecode));
                      if (onViewAnnotation && comment.annotationData) {
                        onViewAnnotation(comment.annotationData);
                      }
                    }}
                    className="group/ann mt-2 block w-full overflow-hidden rounded-lg border border-slate-200 transition hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500"
                  >
                    {comment.frameSnapshot ? (
                      <div className="relative">
                        <img
                          src={comment.frameSnapshot}
                          alt="Frame annotation"
                          className="h-auto w-full rounded-lg bg-black object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition group-hover/ann:bg-black/30">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-800 opacity-0 shadow-lg transition group-hover/ann:opacity-100">
                            <Eye className="h-3 w-3" />
                            View annotation
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        <PenTool className="h-3 w-3" />
                        Has annotation — click to view
                      </div>
                    )}
                  </button>
                )}
              </>
            )}

            {editId !== comment.id && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setReplyTargetId(comment.id);
                    setReplyDraft("");
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply
                </button>
                {isOwn && !resolved && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(comment.id);
                      setEditDraft(comment.content || "");
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
                {isParticipant && !resolved && (
                  <button
                    type="button"
                    onClick={() => onResolve(comment.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    title="Mark as resolved"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Resolve
                  </button>
                )}
              </div>
            )}

            <AnimatePresence>
              {replyTargetId === comment.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={2}
                      placeholder="Write a reply…"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => replySubmit(comment)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Post reply
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTargetId(null);
                          setReplyDraft("");
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {Array.isArray(comment.replies) &&
        comment.replies.length > 0 &&
        comment.replies.map((child) => (
          <CommentThread
            key={child.id}
            comment={child}
            currentUser={currentUser}
            isParticipant={isParticipant}
            activeCommentId={activeCommentId}
            highlightId={highlightId}
            onSeek={onSeek}
            onResolve={onResolve}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewAnnotation={onViewAnnotation}
            depth={depth + 1}
            replyTargetId={replyTargetId}
            setReplyTargetId={setReplyTargetId}
            editId={editId}
            setEditId={setEditId}
            replyDraft={replyDraft}
            setReplyDraft={setReplyDraft}
            editDraft={editDraft}
            setEditDraft={setEditDraft}
            replySubmit={replySubmit}
            editSubmit={editSubmit}
            isSubmitting={isSubmitting}
          />
        ))}
    </div>
  );
}
