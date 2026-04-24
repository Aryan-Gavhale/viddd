import { io } from "socket.io-client";
import { EVENTS } from "../../../shared/socketEvents.js";

class SocketClient {
  constructor() {
    this.socket = null;
    this.isInitialized = false;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
  }

  initialize() {
    if (this.isInitialized) return;

    this.socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectInterval,
    });

    this.socket.on("connect", () => {
      if (import.meta.env.DEV) console.log("Socket connected:", this.socket.id);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    this.socket.on("disconnect", (reason) => {
      if (import.meta.env.DEV) console.log("Socket disconnected:", reason);
    });

    this.socket.on(EVENTS.ERROR, (data) => {
      console.error("Socket error:", data.message);
    });

    this.isInitialized = true;
  }

  connect() {
    if (!this.isInitialized) {
      throw new Error("Socket not initialized. Call initialize() first.");
    }
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.isInitialized = false;
    this.socket = null;
  }

  joinJobRoom(jobId) {
    this._ensureConnected();
    this.socket.emit(EVENTS.JOIN_JOB_ROOM, { jobId });
  }

  leaveJobRoom(jobId) {
    this._ensureConnected();
    this.socket.emit(EVENTS.LEAVE_JOB_ROOM, { jobId });
  }

  sendMessage(jobId, content, attachments = [], replyToId = null) {
    this._ensureConnected();
    this.socket.emit(EVENTS.SEND_MESSAGE, { jobId, content, attachments, replyToId });
  }

  deleteMessage(jobId, messageId) {
    this._ensureConnected();
    this.socket.emit(EVENTS.DELETE_MESSAGE, { jobId, messageId });
  }

  emitMessageDeleted(jobId, messageId) {
    this.deleteMessage(jobId, messageId);
  }

  emitReply(jobId, content, replyToId, attachments = []) {
    this.sendMessage(jobId, content, attachments, replyToId);
  }

  startTyping(jobId) {
    this._ensureConnected();
    this.socket.emit(EVENTS.TYPING_START, { jobId });
  }

  stopTyping(jobId) {
    this._ensureConnected();
    this.socket.emit(EVENTS.TYPING_STOP, { jobId });
  }

  editMessage(jobId, messageId, content) {
    this._ensureConnected();
    this.socket.emit(EVENTS.EDIT_MESSAGE, { jobId, messageId, content });
  }

  addReaction(jobId, messageId, emoji) {
    this._ensureConnected();
    this.socket.emit(EVENTS.ADD_REACTION, { jobId, messageId, emoji });
  }

  emitTyping(jobId, isTyping) {
    if (isTyping) this.startTyping(jobId);
    else this.stopTyping(jobId);
  }

  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
  }

  /** Low-level emit for WebRTC signaling and other custom events */
  emitRaw(event, payload) {
    this._ensureConnected();
    this.socket.emit(event, payload);
  }

  /** Expose native socket.io client for advanced usage (e.g. WebRTC) */
  get io() {
    return this.socket;
  }

  _ensureConnected() {
    if (!this.socket?.connected) {
      if (this.isInitialized) {
        this.connect();
      } else {
        throw new Error("Socket not initialized.");
      }
    }
  }
}

export { EVENTS };
const socketClient = new SocketClient();

/** @returns {import('socket.io-client').Socket | null} */
export function getSocketIO() {
  if (!socketClient.isInitialized) socketClient.initialize();
  if (!socketClient.io?.connected) socketClient.connect();
  return socketClient.io;
}

/** Alias for `import { io as socketInstance } from '../../utils/socket'` */
export { getSocketIO as io };

export default socketClient;
