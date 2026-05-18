import { useEffect, useRef, useState } from "react";
import { Pin, X, Send, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import axiosInstance from "../../utils/axios.js";
import ChatPanel from "../Chat/ChatPanel.jsx";
import { Avatar } from "./Avatar.jsx";
import {
  fullName,
  formatRelativeTime,
  workspacePinnedUrl,
  bubbleClass,
  roleCaption,
} from "./utils.js";
import { selectUser } from "../../redux/userSlice.js";

/**
 * ChatRail accepts either the legacy `jobId` prop (back-compat) or the new
 * `scope` prop (`{ kind, id }`). The pinned-message section uses the
 * scope-aware /workspace/{projects|orders}/:id/pinned endpoint, while the
 * actual chat panel switches between the real-time job chat (powered by
 * useChat / chatStore over Socket.IO) and a simpler polling-based panel for
 * gig orders. The polling panel keeps the messaging UI working today without
 * forcing chatStore to be refactored to handle a second scope kind — that's
 * a follow-up, intentionally out of scope here.
 */
export function ChatRail({ scope, jobId, peer, role }) {
  const effectiveScope = scope || (jobId ? { kind: "JOB", id: Number(jobId) } : null);
  const isOrder = effectiveScope?.kind === "ORDER";

  return (
    <aside className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 h-full flex flex-col overflow-hidden w-full">
      <PeerHeader peer={peer} role={role} isOrder={isOrder} />
      <PinnedBar scope={effectiveScope} />
      <div className="flex-1 min-h-0">
        {isOrder ? (
          <OrderMessagePanel orderId={effectiveScope.id} peer={peer} role={role} />
        ) : (
          <ChatPanel jobId={effectiveScope?.id} peer={peer} role={role} compact={false} />
        )}
      </div>
    </aside>
  );
}

function PeerHeader({ peer, role, isOrder }) {
  if (!peer) {
    return (
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-amber-50 dark:bg-amber-900/20">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          {role === "client"
            ? isOrder
              ? "No editor assigned to this order yet."
              : "No freelancer hired yet."
            : isOrder
            ? "Order not yet associated with a client."
            : "Project not assigned to a freelancer."}
        </p>
      </div>
    );
  }
  return (
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
      <Avatar user={peer} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {fullName(peer)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {peer.kind === "freelancer"
            ? peer.jobTitle || "Freelancer"
            : peer.company || "Client"}
        </p>
      </div>
    </div>
  );
}

function PinnedBar({ scope }) {
  const [pinned, setPinned] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loadError, setLoadError] = useState("");
  const url = workspacePinnedUrl(scope);

  const fetchPinned = async () => {
    if (!url) return;
    try {
      setLoadError("");
      const res = await axiosInstance.get(url);
      setPinned(res.data?.data?.pinned || []);
    } catch (e) {
      setPinned([]);
      setLoadError(e?.response?.data?.message || "Could not load pinned messages.");
    }
  };

  useEffect(() => {
    if (url) fetchPinned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleUnpin = async (messageId) => {
    if (!url) return;
    try {
      await axiosInstance.post(url, { messageId });
      setPinned((prev) => prev.filter((p) => String(p.messageId) !== String(messageId)));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not unpin message");
    }
  };

  if (loadError) {
    return (
      <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-200">
        {loadError}
        <button type="button" onClick={fetchPinned} className="ml-2 font-semibold underline">Retry</button>
      </div>
    );
  }

  if (pinned.length === 0) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-amber-50/50 dark:bg-amber-900/10">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/20"
      >
        <Pin className="w-3.5 h-3.5" />
        {pinned.length} pinned message{pinned.length === 1 ? "" : "s"}
        <span className="ml-auto text-[10px]">{collapsed ? "Show" : "Hide"}</span>
      </button>
      {!collapsed && (
        <ul className="max-h-40 overflow-y-auto px-2 pb-2 space-y-1">
          {pinned.map((p) => (
            <li
              key={p.id}
              className="bg-white dark:bg-gray-900 rounded-lg px-3 py-2 flex items-start gap-2 border border-amber-200/60 dark:border-amber-700/40"
            >
              <Avatar user={p.message?.sender} size={20} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {fullName(p.message?.sender)} ·{" "}
                  {formatRelativeTime(p.message?.timestamp)}
                </p>
                <p className="text-xs text-gray-800 dark:text-gray-200 truncate">
                  {p.message?.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUnpin(p.messageId)}
                className="text-gray-400 hover:text-rose-600"
                title="Unpin"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Polling-based chat for gig orders. Light enough that we don't need to wire
 * the existing chatStore through a second scope kind just to render messages.
 * The /messages endpoint already accepts orderId, so the existing API does
 * everything we need; we just refresh every few seconds instead of getting
 * Socket.IO push updates. Future improvement: extend chatStore with an
 * orderId mode and reuse ChatPanel here too.
 */
function OrderMessagePanel({ orderId, peer, role }) {
  const me = useSelector(selectUser);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const seenIdsRef = useRef(new Set());

  // Robust ownership check. The /messages payload has historically inconsistent
  // sender shapes — sometimes `senderId` is a number, sometimes a string,
  // sometimes only `sender.id` is present. Coerce everything through Number()
  // and bail out if the user id isn't valid yet (e.g. hydration race).
  const myId = Number(me?.id);
  const isMine = (m) => {
    const candidates = [
      m?.senderId,
      m?.sender?.id,
      m?.sender_id,
      m?.from,
      m?.author?.id,
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && Number.isFinite(myId) && n === myId) return true;
    }
    return false;
  };

  // Role of the peer for bubble theming. Editor-side messages are emerald,
  // client-side are sky — the `peer.kind` field is set by the workspace
  // controller. We fall back to inverting our own role if the peer object
  // doesn't carry it for some reason.
  const peerRole = peer?.kind || (role === "client" ? "freelancer" : "client");

  const reload = async () => {
    try {
      setError("");
      const res = await axiosInstance.get(`/messages?orderId=${orderId}&limit=100`);
      const list = res.data?.data?.messages || [];
      seenIdsRef.current = new Set(list.map((m) => String(m.id)));
      setMessages(list);
    } catch (e) {
      setError(e?.response?.data?.message || "Could not load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return undefined;
    setLoading(true);
    reload();
    // Cheap polling — every 6s is enough for the gig collaboration use case.
    // Pause when the tab is hidden so background tabs don't burn API quota.
    const tick = () => {
      if (document.visibilityState === "visible") reload();
    };
    const intervalId = setInterval(tick, 6000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    // Auto-scroll only when a new message arrives at the bottom (don't fight
    // the user if they've scrolled up to read older messages).
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const content = draft.trim();
    if (!content || !peer?.id || sending) return;
    setSending(true);
    try {
      await axiosInstance.post("/messages", {
        orderId: Number(orderId),
        receiverId: Number(peer.id),
        content,
      });
      setDraft("");
      await reload();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  if (!orderId) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
        Select an order to start chatting.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">Loading messages…</p>
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-200">
            {error}
            <button type="button" onClick={reload} className="ml-2 font-semibold underline">Retry</button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            No messages yet — say hi to {fullName(peer) || "your collaborator"}.
          </p>
        ) : (
          messages.map((m) => {
            const mine = isMine(m);
            const bubbleRole = mine ? role : peerRole;
            const avatarUser = mine ? me : m.sender;
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar user={avatarUser} size={28} />
                <div className={`max-w-[80%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${
                      mine
                        ? "text-indigo-500 dark:text-indigo-300"
                        : bubbleRole === "freelancer"
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-sky-600 dark:text-sky-300"
                    }`}
                  >
                    {roleCaption({ mine, role: bubbleRole })}
                  </span>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${bubbleClass({ mine, role: bubbleRole })}`}>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    <div
                      className={`text-[10px] mt-1 ${
                        mine
                          ? "text-indigo-100/80"
                          : bubbleRole === "freelancer"
                          ? "text-emerald-700/70 dark:text-emerald-200/70"
                          : "text-sky-700/70 dark:text-sky-200/70"
                      }`}
                    >
                      {formatRelativeTime(m.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-gray-200 dark:border-gray-800 p-3 flex items-end gap-2 bg-gray-50 dark:bg-gray-900"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={peer?.id ? "Write a message…" : "Waiting for collaborator…"}
          className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!peer?.id || sending}
        />
        <button
          type="submit"
          disabled={!peer?.id || sending || !draft.trim()}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          aria-label="Send"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
