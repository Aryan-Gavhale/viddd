/**
 * Unified, isolated chat store.
 *
 * One conversation per `jobId`. Both the workspace chat panel and the
 * floating bottom-right widget subscribe to the same store, so the same
 * messages appear in both places in real time.
 *
 * Robustness highlights:
 *   - Optimistic updates: outgoing messages appear immediately with a
 *     `status` of `"sending"`. They are reconciled by the server's
 *     `MESSAGE_SENT` ack (preferred) or by the broadcast `NEW_MESSAGE`
 *     event, matched on `clientId` or by content+timestamp window.
 *   - Failure surface: failed sends become `status: "failed"` with a
 *     `retry()` available on the message instead of disappearing silently.
 *   - HTTP fallback: when the websocket isn't connected (or doesn't ack
 *     within a small window), we automatically POST the message via the
 *     REST API instead so chat keeps working through socket outages.
 *   - Refcounted room joins: we only join/leave the socket room when the
 *     first/last subscriber for a job mounts/unmounts, so the workspace
 *     panel and the floating widget never fight over the same room.
 *   - Single set of socket listeners attached process-wide; events are
 *     demultiplexed by jobId.
 */

import socketClient, { EVENTS } from "../utils/socket.js";
import axiosInstance from "../utils/axios.js";

// Time we wait for the server's MESSAGE_SENT ack before falling back to HTTP.
const SOCKET_ACK_TIMEOUT_MS = 4500;
// Window we use to match a server-broadcast NEW_MESSAGE to a still-pending
// optimistic placeholder by content/timestamp (when ack is missing/late).
const RECONCILE_WINDOW_MS = 30_000;

const conversations = new Map();
const conversationListeners = new Map();
const widgetListeners = new Set();

// Track in-flight optimistic sends so we can reconcile/retry them.
// Map<clientId, { jobId, timeoutId, attempted }>.
const pendingSends = new Map();

let socketListenersAttached = false;

let widgetState = {
  open: false,
  minimized: false,
  jobId: null,
  peer: null,
};

const emptyConversation = () => ({
  jobId: null,
  refCount: 0,
  loading: false,
  loaded: false,
  error: null,
  messages: [],
  typingUsers: [],
  peer: null,
  unreadCount: 0,
});

function getConversation(jobId) {
  if (!conversations.has(jobId)) {
    conversations.set(jobId, { ...emptyConversation(), jobId });
  }
  return conversations.get(jobId);
}

function notifyConversation(jobId) {
  const listeners = conversationListeners.get(jobId);
  if (!listeners) return;
  const snapshot = { ...getConversation(jobId) };
  for (const fn of listeners) {
    try {
      fn(snapshot);
    } catch (e) {
      console.error("[chatStore] subscriber error", e);
    }
  }
}

function notifyWidget() {
  const snapshot = { ...widgetState };
  for (const fn of widgetListeners) {
    try {
      fn(snapshot);
    } catch (e) {
      console.error("[chatStore] widget subscriber error", e);
    }
  }
}

function patchConversation(jobId, patch) {
  const c = getConversation(jobId);
  Object.assign(c, patch);
  notifyConversation(jobId);
}

/**
 * Replace a pending optimistic message with the server's authoritative copy.
 * Returns true when a placeholder was found and replaced.
 */
function reconcileMessage(jobId, clientId, serverMessage) {
  const c = getConversation(jobId);
  let replaced = false;
  c.messages = c.messages.map((m) => {
    if (replaced) return m;
    if (clientId && m.clientId === clientId) {
      replaced = true;
      return { ...serverMessage, clientId, status: "sent" };
    }
    return m;
  });
  if (!replaced) {
    // Match by content+timestamp window for stale clients that lost the ack.
    const recent = Date.now() - RECONCILE_WINDOW_MS;
    c.messages = c.messages.map((m) => {
      if (replaced) return m;
      if (
        m.status === "sending" &&
        m.senderId === serverMessage.senderId &&
        (m.content || "") === (serverMessage.content || "") &&
        new Date(m.timestamp || 0).getTime() >= recent
      ) {
        replaced = true;
        return { ...serverMessage, clientId: m.clientId, status: "sent" };
      }
      return m;
    });
  }
  if (!replaced) {
    if (!c.messages.some((m) => m.id === serverMessage.id)) {
      c.messages = [...c.messages, { ...serverMessage, status: "sent" }];
    }
  }
  return replaced;
}

function clearPending(clientId) {
  const entry = pendingSends.get(clientId);
  if (!entry) return;
  if (entry.timeoutId) clearTimeout(entry.timeoutId);
  pendingSends.delete(clientId);
}

function ensureSocketListeners() {
  if (socketListenersAttached) return;
  socketListenersAttached = true;

  socketClient.initialize();
  socketClient.connect();

  const resolveJobId = (payload) => {
    const direct = payload?.jobId ?? payload?.job_id;
    if (direct != null) return Number(direct);
    return null;
  };

  socketClient.on(EVENTS.NEW_MESSAGE, (message) => {
    const jobId = resolveJobId(message);
    if (!jobId) return;
    const c = getConversation(jobId);
    // Skip duplicates that have already been added by the local optimistic path.
    if (c.messages.some((m) => m.id === message.id)) return;
    reconcileMessage(jobId, null, message);

    const isViewing =
      widgetState.jobId === jobId && widgetState.open && !widgetState.minimized;
    if (!isViewing) c.unreadCount = (c.unreadCount || 0) + 1;
    notifyConversation(jobId);
  });

  socketClient.on(EVENTS.MESSAGE_SENT, ({ clientId, message } = {}) => {
    if (!message) return;
    const jobId = resolveJobId(message);
    if (!jobId) return;
    reconcileMessage(jobId, clientId, message);
    clearPending(clientId);
    notifyConversation(jobId);
  });

  socketClient.on(EVENTS.MESSAGE_FAILED, ({ clientId, message } = {}) => {
    if (!clientId) {
      console.warn("[chatStore] socket reported failure without clientId:", message);
      return;
    }
    const entry = pendingSends.get(clientId);
    if (!entry) return;
    const c = getConversation(entry.jobId);
    c.messages = c.messages.map((m) =>
      m.clientId === clientId ? { ...m, status: "failed", error: message || "Send failed" } : m
    );
    clearPending(clientId);
    notifyConversation(entry.jobId);
  });

  socketClient.on(EVENTS.MESSAGE_DELETED, (payload) => {
    const jobId = resolveJobId(payload);
    const messageId = payload?.messageId;
    if (!messageId) return;
    if (jobId) {
      const c = getConversation(jobId);
      c.messages = c.messages.map((m) =>
        m.id === messageId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
      );
      notifyConversation(jobId);
    } else {
      for (const [jid, c] of conversations) {
        if (c.messages.some((m) => m.id === messageId)) {
          c.messages = c.messages.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
          );
          notifyConversation(jid);
        }
      }
    }
  });

  socketClient.on(EVENTS.MESSAGE_EDITED, (payload) => {
    const jobId = resolveJobId(payload);
    const { messageId, content } = payload || {};
    if (!messageId) return;
    if (jobId) {
      const c = getConversation(jobId);
      c.messages = c.messages.map((m) =>
        m.id === messageId ? { ...m, content, isEdited: true } : m
      );
      notifyConversation(jobId);
    }
  });

  socketClient.on(EVENTS.REACTION_UPDATED, (payload) => {
    const jobId = resolveJobId(payload);
    const { messageId, emoji, user, action } = payload || {};
    if (!messageId || !jobId) return;
    const c = getConversation(jobId);
    c.messages = c.messages.map((msg) => {
      if (msg.id !== messageId) return msg;
      const reactions = [...(msg.reactions || [])];
      if (action === "added") reactions.push({ emoji, user });
      else {
        const idx = reactions.findIndex(
          (r) => r.emoji === emoji && r.user?.id === user?.id
        );
        if (idx > -1) reactions.splice(idx, 1);
      }
      return { ...msg, reactions };
    });
    notifyConversation(jobId);
  });

  socketClient.on(EVENTS.USER_TYPING, (payload) => {
    const jobId = resolveJobId(payload);
    const { userId, name, isTyping } = payload || {};
    if (!jobId) return;
    const c = getConversation(jobId);
    if (isTyping && !c.typingUsers.some((u) => u.userId === userId)) {
      c.typingUsers = [...c.typingUsers, { userId, name }];
    } else if (!isTyping) {
      c.typingUsers = c.typingUsers.filter((u) => u.userId !== userId);
    }
    notifyConversation(jobId);
  });

  socketClient.on(EVENTS.ERROR, ({ message } = {}) => {
    console.warn("[chatStore] socket error:", message);
  });

  // When socket reconnects, refresh history for every active conversation so
  // we never display a stale view.
  const sock = socketClient.io;
  sock?.on?.("connect", () => {
    for (const [jobId, c] of conversations) {
      if (c.refCount > 0) {
        try {
          socketClient.joinJobRoom(jobId);
        } catch {
          /* ignore */
        }
        fetchHistory(jobId);
      }
    }
  });
}

async function fetchHistory(jobId) {
  patchConversation(jobId, { loading: true, error: null });
  try {
    const response = await axiosInstance.get(`/messages/job/${jobId}`);
    const payload = response.data?.data;
    const messages = Array.isArray(payload?.messages)
      ? payload.messages
      : Array.isArray(payload)
      ? payload
      : [];

    const c = getConversation(jobId);
    // Preserve optimistic sends that haven't been acked yet — otherwise they'd
    // disappear when history reloads after a reconnect.
    const stillPending = c.messages.filter(
      (m) => m.status === "sending" || m.status === "failed"
    );
    const stamped = messages.map((m) => ({ ...m, status: "sent" }));
    patchConversation(jobId, {
      messages: [...stamped, ...stillPending],
      loading: false,
      loaded: true,
      error: null,
    });
  } catch (err) {
    const status = err?.response?.status;
    let msg = err?.response?.data?.message || "Failed to load messages.";
    if (status === 403) msg = "You don't have access to this conversation.";
    if (status === 404) msg = "Conversation not found.";
    patchConversation(jobId, {
      loading: false,
      loaded: true,
      error: msg,
    });
  }
}

function generateClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `c_${crypto.randomUUID()}`;
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Send via HTTP. Used either as the explicit fallback when the websocket is
 * not ready, or when the socket ack times out.
 */
async function sendViaHttp(jobId, payload) {
  const res = await axiosInstance.post(`/messages/job/${jobId}`, payload);
  return res.data?.data;
}

async function performSend(jobId, payload, optimistic) {
  const { clientId } = optimistic;
  const tryViaSocket = !!socketClient.io?.connected;

  if (!tryViaSocket) {
    // No socket — go straight to HTTP so the user is not blocked.
    try {
      const data = await sendViaHttp(jobId, payload);
      if (data?.message) {
        reconcileMessage(jobId, clientId, data.message);
        clearPending(clientId);
        notifyConversation(jobId);
      }
    } catch (err) {
      const c = getConversation(jobId);
      c.messages = c.messages.map((m) =>
        m.clientId === clientId
          ? { ...m, status: "failed", error: err?.response?.data?.message || err.message }
          : m
      );
      clearPending(clientId);
      notifyConversation(jobId);
    }
    return;
  }

  try {
    socketClient.sendMessage(jobId, payload.content, payload.attachments, payload.replyToId, clientId);
  } catch (e) {
    // Could not even emit — fall back to HTTP immediately.
    try {
      const data = await sendViaHttp(jobId, payload);
      if (data?.message) {
        reconcileMessage(jobId, clientId, data.message);
        clearPending(clientId);
        notifyConversation(jobId);
      }
    } catch (err) {
      const c = getConversation(jobId);
      c.messages = c.messages.map((m) =>
        m.clientId === clientId
          ? { ...m, status: "failed", error: err?.response?.data?.message || err.message }
          : m
      );
      clearPending(clientId);
      notifyConversation(jobId);
    }
    return;
  }

  // Schedule the ack timeout — if the server doesn't ack in time, retry over
  // HTTP so we still surface a reliable success/failure state.
  const timeoutId = setTimeout(async () => {
    const entry = pendingSends.get(clientId);
    if (!entry || entry.attempted) return;
    entry.attempted = true;
    try {
      const data = await sendViaHttp(jobId, payload);
      if (data?.message) {
        reconcileMessage(jobId, clientId, data.message);
      }
    } catch (err) {
      const c = getConversation(jobId);
      c.messages = c.messages.map((m) =>
        m.clientId === clientId
          ? { ...m, status: "failed", error: err?.response?.data?.message || err.message || "Network error" }
          : m
      );
    } finally {
      clearPending(clientId);
      notifyConversation(jobId);
    }
  }, SOCKET_ACK_TIMEOUT_MS);

  pendingSends.set(clientId, { jobId, timeoutId, attempted: false, payload });
}

export const chatStore = {
  /** Subscribe to a single conversation. Returns an unsubscribe fn. */
  subscribeConversation(jobId, listener) {
    if (jobId == null) return () => {};
    const id = Number(jobId);
    if (!conversationListeners.has(id)) conversationListeners.set(id, new Set());
    conversationListeners.get(id).add(listener);
    listener({ ...getConversation(id) });

    const c = getConversation(id);
    c.refCount += 1;
    if (c.refCount === 1) {
      ensureSocketListeners();
      try {
        socketClient.joinJobRoom(id);
      } catch (e) {
        console.warn("[chatStore] joinJobRoom failed:", e?.message);
      }
      if (!c.loaded && !c.loading) {
        fetchHistory(id);
      }
    }

    return () => {
      const set = conversationListeners.get(id);
      if (set) {
        set.delete(listener);
        if (set.size === 0) conversationListeners.delete(id);
      }
      const conv = conversations.get(id);
      if (!conv) return;
      conv.refCount = Math.max(0, conv.refCount - 1);
      if (conv.refCount === 0) {
        try {
          socketClient.leaveJobRoom(id);
        } catch {
          /* ignore */
        }
      }
    };
  },

  subscribeWidget(listener) {
    widgetListeners.add(listener);
    listener({ ...widgetState });
    return () => widgetListeners.delete(listener);
  },

  getWidget() {
    return { ...widgetState };
  },

  getConversation(jobId) {
    return { ...getConversation(Number(jobId)) };
  },

  setPeer(jobId, peer) {
    if (!peer || jobId == null) return;
    const c = getConversation(Number(jobId));
    c.peer = { ...c.peer, ...peer };
    notifyConversation(Number(jobId));
  },

  /** Open the floating widget for a conversation. */
  openWidget(jobId, peer) {
    if (jobId == null) {
      console.warn("[chatStore] openWidget called without jobId");
      return;
    }
    const id = Number(jobId);
    if (peer) this.setPeer(id, peer);
    widgetState = { ...widgetState, open: true, minimized: false, jobId: id, peer: peer || getConversation(id).peer };
    const c = getConversation(id);
    c.unreadCount = 0;
    notifyConversation(id);
    notifyWidget();
  },

  closeWidget() {
    widgetState = { ...widgetState, open: false, minimized: false };
    notifyWidget();
  },

  toggleMinimize() {
    widgetState = { ...widgetState, minimized: !widgetState.minimized };
    notifyWidget();
  },

  markRead(jobId) {
    if (jobId == null) return;
    const c = getConversation(Number(jobId));
    if (c.unreadCount) {
      c.unreadCount = 0;
      notifyConversation(Number(jobId));
    }
  },

  /**
   * Send a message. Returns the optimistic local message immediately so the
   * UI can render before the server round-trip completes.
   */
  async sendMessage(jobId, content, attachments = [], replyToId = null, sender = null) {
    if (jobId == null) throw new Error("sendMessage requires jobId");
    const id = Number(jobId);
    ensureSocketListeners();

    const text = (content || "").toString();
    const safeAttachments = Array.isArray(attachments) ? attachments : [];
    if (!text.trim() && safeAttachments.length === 0) return null;

    const clientId = generateClientId();
    const now = new Date().toISOString();
    const optimistic = {
      id: clientId,
      clientId,
      jobId: id,
      senderId: sender?.id ?? null,
      sender: sender
        ? {
            id: sender.id,
            firstname: sender.firstname,
            lastname: sender.lastname,
            avatar: sender.profilePicture || sender.avatar || null,
            profilePicture: sender.profilePicture || sender.avatar || null,
            name:
              sender.name ||
              [sender.firstname, sender.lastname].filter(Boolean).join(" "),
          }
        : null,
      content: text,
      attachments: safeAttachments,
      replyTo: replyToId || null,
      timestamp: now,
      reactions: [],
      status: "sending",
    };

    const c = getConversation(id);
    c.messages = [...c.messages, optimistic];
    notifyConversation(id);

    performSend(id, { content: text, attachments: safeAttachments, replyToId, clientId }, optimistic);

    return optimistic;
  },

  /** Retry a previously-failed send (identified by either id or clientId). */
  async retryMessage(jobId, messageOrId) {
    if (jobId == null) return;
    const id = Number(jobId);
    const c = getConversation(id);
    const target =
      typeof messageOrId === "object"
        ? messageOrId
        : c.messages.find((m) => m.id === messageOrId || m.clientId === messageOrId);
    if (!target || target.status !== "failed") return;

    target.status = "sending";
    target.error = null;
    notifyConversation(id);

    performSend(
      id,
      {
        content: target.content,
        attachments: target.attachments || [],
        replyToId: target.replyTo,
        clientId: target.clientId,
      },
      target
    );
  },

  /** Drop a still-pending optimistic message that the user wants to discard. */
  cancelMessage(jobId, clientId) {
    if (jobId == null || !clientId) return;
    const id = Number(jobId);
    const c = getConversation(id);
    c.messages = c.messages.filter((m) => m.clientId !== clientId);
    clearPending(clientId);
    notifyConversation(id);
  },

  async deleteMessage(jobId, messageId) {
    if (jobId == null) throw new Error("deleteMessage requires jobId");
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      try {
        socketClient.emitMessageDeleted(Number(jobId), messageId);
      } catch {
        /* server already updated, socket failure is non-fatal */
      }
      const c = getConversation(Number(jobId));
      c.messages = c.messages.map((m) =>
        m.id === messageId ? { ...m, isDeleted: true, content: "This message was deleted" } : m
      );
      notifyConversation(Number(jobId));
    } catch (err) {
      throw new Error(err?.response?.data?.message || "Failed to delete message");
    }
  },

  async addReaction(jobId, messageId, emoji) {
    if (jobId == null) return;
    try {
      const response = await axiosInstance.post(`/messages/${messageId}/reactions`, { emoji });
      const reactions = response.data?.data?.reactions;
      if (Array.isArray(reactions)) {
        const c = getConversation(Number(jobId));
        c.messages = c.messages.map((m) => (m.id === messageId ? { ...m, reactions } : m));
        notifyConversation(Number(jobId));
      }
    } catch (err) {
      throw new Error(err?.response?.data?.message || "Failed to add reaction");
    }
  },

  emitTyping(jobId, isTyping) {
    if (jobId == null) return;
    try {
      socketClient.emitTyping(Number(jobId), isTyping);
    } catch {
      /* ignore - socket may not be connected */
    }
  },

  async uploadAttachments(files) {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const response = await axiosInstance.post("/messages/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return (response.data?.data || []).map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url,
      category: "raw",
      uploadedAt: new Date().toISOString(),
    }));
  },

  /** Force-refetch history for a conversation. */
  async refresh(jobId) {
    if (jobId == null) return;
    return fetchHistory(Number(jobId));
  },
};

export default chatStore;
