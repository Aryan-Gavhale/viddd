import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import { useChat } from "../../Hooks/useChat.js";
import { isSafeUrl } from "../../utils/safeUrl.js";
import { bubbleClass, roleCaption } from "../Workspace/utils.js";
import {
  Send,
  Paperclip,
  X,
  Reply,
  Smile,
  Trash2,
  MessageSquare,
  AlertCircle,
  Loader2,
  Check,
  CheckCheck,
  RotateCw,
} from "lucide-react";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

function formatTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Generate a stable, name-keyed color so two different people never share an
// avatar tint (important when both parties happen to have the same initial).
const AVATAR_PALETTE = [
  "from-rose-500 to-pink-600",
  "from-orange-500 to-amber-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-fuchsia-500 to-pink-600",
];
function colorForName(name) {
  let hash = 0;
  for (const ch of String(name || "?")) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function Avatar({ name, src, size = 32 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name || "user"}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${colorForName(name)} text-white flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}

function toNumberId(value) {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function resolveSenderId(message) {
  return (
    toNumberId(message.senderId) ??
    toNumberId(message.sender?.id) ??
    toNumberId(message.sender_id) ??
    toNumberId(message.userId) ??
    toNumberId(message.user_id) ??
    toNumberId(message.from) ??
    toNumberId(message.author?.id)
  );
}

function isMineMessage(message, myId) {
  if (message.status === "sending" && resolveSenderId(message) == null) return true;
  const senderId = resolveSenderId(message);
  return myId != null && senderId != null && senderId === myId;
}

/**
 * Reusable chat surface. Shared by the workspace panel and the floating widget.
 *
 * Props:
 *   - jobId         (required) — the conversation to render
 *   - peer          { id, firstname, lastname, avatar, online } — for header
 *   - compact       (bool) — denser layout for the floating widget
 *   - hideHeader    (bool) — hide the internal header (workspace draws its own)
 *   - onClose       (fn)   — close button callback (only when hideHeader is false)
 *   - onMinimize    (fn)   — minimize callback (widget only)
 */
export default function ChatPanel({
  jobId,
  peer,
  role,
  compact = false,
  hideHeader = false,
  onClose,
  onMinimize,
}) {
  const currentUser = useSelector(selectUser);
  // Bubble theming uses the peer's role: editor peers get an emerald wash,
  // client peers get sky. We prefer `peer.kind` (set by the workspace
  // controller) and only fall back to inverting the caller's role.
  const peerRole = peer?.kind || (role === "client" ? "freelancer" : role === "freelancer" ? "client" : undefined);
  const chat = useChat(jobId);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiFor, setShowEmojiFor] = useState(null);
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);

  useEffect(() => {
    if (peer && jobId != null) chat.setPeer(peer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer?.id, jobId]);

  useEffect(() => {
    chat.markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, chat.messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages.length]);

  useEffect(() => {
    if (!draft) return undefined;
    chat.typing(true);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => chat.typing(false), 2000);
    return () => clearTimeout(typingTimerRef.current);
  }, [draft, chat]);

  const peerName = useMemo(() => {
    const p = peer || chat.peer;
    if (!p) return "Conversation";
    if (p.name) return p.name;
    return [p.firstname, p.lastname].filter(Boolean).join(" ") || `User #${p.id}`;
  }, [peer, chat.peer]);

  const peerAvatar = (peer || chat.peer)?.avatar || (peer || chat.peer)?.profilePicture;

  const messageById = useMemo(() => {
    const m = new Map();
    for (const msg of chat.messages) m.set(msg.id, msg);
    return m;
  }, [chat.messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text && files.length === 0) return;
    if (jobId == null) {
      setLocalError("No conversation selected.");
      return;
    }
    if (!currentUser?.id) {
      setLocalError("You must be signed in to send messages.");
      return;
    }
    setSending(true);
    setLocalError(null);
    // Clear the composer immediately so the optimistic bubble is the source
    // of truth for the user. If anything fails, the message stays visible
    // in the list with a "failed" badge + retry — no input is lost.
    const draftSnapshot = text;
    const filesSnapshot = files;
    const replySnapshot = replyTo;
    setDraft("");
    setFiles([]);
    setReplyTo(null);
    chat.typing(false);
    try {
      let attachments = [];
      if (filesSnapshot.length > 0) attachments = await chat.upload(filesSnapshot);
      await chat.send(draftSnapshot, attachments, replySnapshot?.id || null);
    } catch (err) {
      setDraft(draftSnapshot);
      setFiles(filesSnapshot);
      setReplyTo(replySnapshot);
      setLocalError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (message) => {
    if (message.status === "failed") {
      chat.cancel(message.clientId);
      return;
    }
    try {
      await chat.remove(message.id);
    } catch (err) {
      setLocalError(err?.message || "Failed to delete message.");
    }
  };

  const handleRetry = (message) => {
    chat.retry(message);
  };

  const handleReact = async (messageId, emoji) => {
    try {
      await chat.react(messageId, emoji);
      setShowEmojiFor(null);
    } catch (err) {
      setLocalError(err?.message || "Failed to add reaction.");
    }
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  // Coerce to Number once. Some payload paths historically delivered IDs as
  // strings (URL params, JSON edge cases) which made strict-equality lie about
  // whether a message belongs to the current user, so every bubble ended up on
  // the "peer" side. Using Number() once here is bullet-proof.
  const myId = toNumberId(currentUser?.id);
  const error = chat.error || localError;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={peerName} src={peerAvatar} size={36} />
            <div className="min-w-0">
              <p className="font-semibold truncate text-sm">{peerName}</p>
              {chat.typingUsers.length > 0 ? (
                <p className="text-[11px] text-indigo-100 truncate">typing…</p>
              ) : (
                <p className="text-[11px] text-indigo-100 truncate">
                  {chat.loading ? "Loading…" : "Online"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onMinimize && (
              <button
                onClick={onMinimize}
                aria-label="Minimize chat"
                className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
                title="Minimize"
              >
                <span className="block w-4 h-0.5 bg-white" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close chat"
                className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setLocalError(null)}
            className="text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto ${compact ? "px-3 py-2 space-y-2" : "p-4 space-y-3"} bg-gray-50 dark:bg-gray-900`}
      >
        {chat.loading && chat.messages.length === 0 ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
            <MessageSquare className={`${compact ? "w-8 h-8" : "w-12 h-12"} mb-2`} />
            <p className={`${compact ? "text-xs" : "text-sm"}`}>
              Start the conversation with {peerName}
            </p>
          </div>
        ) : (
          chat.messages.map((message) => {
            const mine = isMineMessage(message, myId);
            const senderName = mine
              ? "You"
              : message.sender?.name ||
                [message.sender?.firstname, message.sender?.lastname].filter(Boolean).join(" ") ||
                "User";
            const senderAvatar = message.sender?.avatar || message.sender?.profilePicture;
            const replyParent = message.replyTo ? messageById.get(message.replyTo) : null;
            const isSending = message.status === "sending";
            const isFailed = message.status === "failed";
            // `role` here is the bubble role used for theming: my own bubble
            // uses my caller-role, the peer bubble uses peerRole. That keeps
            // editors emerald and clients sky regardless of who's sending.
            const bubbleRole = mine ? role : peerRole;
            const myAvatarName =
              currentUser?.firstname || currentUser?.name || "You";
            const myAvatarSrc = currentUser?.profilePicture || currentUser?.avatar;

            return (
              <div
                key={message.clientId || message.id}
                className={`flex w-full items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar
                  name={mine ? myAvatarName : message.sender?.firstname || message.sender?.name || senderName}
                  src={mine ? myAvatarSrc : senderAvatar}
                  size={compact ? 24 : 30}
                />

                <div className={`max-w-[78%] relative group ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {replyParent && (
                    <div className="text-[11px] mb-1 pb-1 border-l-2 border-gray-300 pl-2 text-gray-500 truncate">
                      <Reply className="inline w-3 h-3 mr-1" />
                      {replyParent.isDeleted
                        ? "Replied to a deleted message"
                        : `Reply: ${(replyParent.content || "").slice(0, 40)}${
                            (replyParent.content || "").length > 40 ? "…" : ""
                          }`}
                    </div>
                  )}

                  {!compact && (
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 px-1 ${
                        mine
                          ? "text-indigo-500 dark:text-indigo-300"
                          : bubbleRole === "freelancer"
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-sky-600 dark:text-sky-300"
                      }`}
                    >
                      {roleCaption({ mine, role: bubbleRole })}
                      {!mine && senderName ? (
                        <span className="ml-1.5 normal-case font-medium text-gray-500 dark:text-gray-400">
                          · {senderName}
                        </span>
                      ) : null}
                    </span>
                  )}
                  <div
                    className={`${compact ? "px-3 py-1.5" : "px-4 py-2"} ${
                      mine && isFailed
                        ? "rounded-2xl rounded-br-md bg-red-500/90 text-white shadow-sm"
                        : mine && isSending
                        ? "rounded-2xl rounded-br-md bg-indigo-400/90 text-white shadow-sm"
                        : `rounded-2xl ${bubbleClass({ mine, role: bubbleRole })}`
                    }`}
                  >
                    <p
                      className={`${compact ? "text-xs" : "text-sm"} whitespace-pre-wrap break-words ${
                        message.isDeleted ? "italic opacity-60" : ""
                      }`}
                    >
                      {message.isDeleted ? "This message was deleted" : message.content}
                    </p>

                    {message.attachments?.length > 0 && !message.isDeleted && (
                      <div className="mt-2 space-y-2">
                        {message.attachments.map((a, i) => {
                          const safe = isSafeUrl(a.url) ? a.url : null;
                          const t = a.type || "";
                          return (
                            <div
                              key={`${a.id || i}`}
                              className="rounded-lg overflow-hidden border border-black/10"
                            >
                              {t.startsWith("image/") && safe && (
                                <img src={safe} alt={a.name} className="max-h-32 w-auto" />
                              )}
                              {t.startsWith("video/") && safe && (
                                <video src={safe} controls className="max-h-32 w-full" />
                              )}
                              {t.startsWith("audio/") && safe && (
                                <audio src={safe} controls className="w-full" />
                              )}
                              <div className="flex items-center justify-between p-1.5 text-[11px] bg-black/10">
                                <span className="flex items-center gap-1 truncate">
                                  <Paperclip className="w-3 h-3" /> {a.name}
                                </span>
                                {safe && (
                                  <a
                                    href={safe}
                                    download={a.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline ml-2"
                                  >
                                    Open
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] opacity-70">
                        {formatTime(message.timestamp || message.createdAt)}
                      </span>
                      {mine && (
                        isSending ? (
                          <Loader2 className="w-3 h-3 opacity-80 animate-spin" />
                        ) : isFailed ? (
                          <AlertCircle className="w-3 h-3 opacity-90" />
                        ) : message.readAt ? (
                          <CheckCheck className="w-3 h-3 opacity-90" />
                        ) : (
                          <Check className="w-3 h-3 opacity-90" />
                        )
                      )}
                    </div>
                  </div>

                  {isFailed && mine && (
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-red-600">
                      <span className="truncate max-w-[180px]">
                        {message.error || "Failed to send"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRetry(message)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-red-300 hover:bg-red-50"
                      >
                        <RotateCw className="w-3 h-3" /> Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => chat.cancel(message.clientId)}
                        className="text-red-500 hover:text-red-700"
                        title="Discard"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {message.reactions.map((r, i) => (
                        <button
                          key={`${r.emoji}-${i}`}
                          onClick={() => handleReact(message.id, r.emoji)}
                          className="text-xs rounded-full px-2 py-0.5 bg-white border border-gray-200 hover:bg-gray-100"
                        >
                          {r.emoji} {r.count || ""}
                        </button>
                      ))}
                    </div>
                  )}

                  {!message.isDeleted && !isSending && !isFailed && (
                    <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-white border border-gray-200 rounded-full shadow-sm px-1 py-0.5">
                      <button
                        onClick={() => setReplyTo(message)}
                        className="p-1 rounded-full hover:bg-gray-100"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3 text-gray-600" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowEmojiFor(showEmojiFor === message.id ? null : message.id)
                          }
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="React"
                        >
                          <Smile className="w-3 h-3 text-gray-600" />
                        </button>
                        {showEmojiFor === message.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg p-1 z-30 flex space-x-1 border border-gray-200">
                            {COMMON_EMOJIS.map((e) => (
                              <button
                                key={e}
                                onClick={() => handleReact(message.id, e)}
                                className="hover:bg-gray-100 p-1 rounded"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {mine && (
                        <button
                          onClick={() => handleDelete(message)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-gray-600" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {mine && <Avatar name={senderName} src={senderAvatar} size={compact ? 24 : 30} />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="px-3 py-2 bg-indigo-50 border-t border-indigo-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-700 truncate">
            <Reply className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Replying to:{" "}
              {replyTo.isDeleted ? "Deleted message" : (replyTo.content || "").slice(0, 60)}
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-indigo-700 hover:text-indigo-900"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 bg-white rounded-md px-2 py-1 text-xs border border-gray-200"
            >
              <Paperclip className="w-3 h-3 text-gray-500" />
              <span className="truncate max-w-[100px]">{f.name}</span>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-2 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Attach files"
            disabled={sending}
          >
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
                e.target.value = "";
              }}
              className="hidden"
              multiple
            />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Message ${peerName}…`}
            className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            rows={1}
            style={{ minHeight: 38, maxHeight: 120 }}
            disabled={sending || jobId == null}
          />
          <button
            onClick={handleSend}
            disabled={sending || jobId == null || (!draft.trim() && files.length === 0)}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-full transition-colors disabled:cursor-not-allowed"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
