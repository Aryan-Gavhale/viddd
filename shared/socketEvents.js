/**
 * Shared Socket.IO event constants for Vidlancing.
 * Used by both backend (vid/) and frontend (vid-frontend/).
 *
 * Import in backend:  import { EVENTS } from "../../shared/socketEvents.js";
 * Import in frontend: import { EVENTS } from "../../shared/socketEvents.js";
 */

export const EVENTS = {
  // Connection lifecycle
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Job room management
  JOIN_JOB_ROOM: "job:room:join",
  LEAVE_JOB_ROOM: "job:room:leave",
  JOINED_JOB_ROOM: "job:room:joined",

  // Messaging
  SEND_MESSAGE: "message:send",
  NEW_MESSAGE: "message:new",
  /** Server → sender ack with the persisted server message + the client temp id. */
  MESSAGE_SENT: "message:sent",
  /** Server → sender error for a specific outgoing message (with clientId). */
  MESSAGE_FAILED: "message:failed",
  DELETE_MESSAGE: "message:delete",
  MESSAGE_DELETED: "message:deleted",
  EDIT_MESSAGE: "message:edit",
  MESSAGE_EDITED: "message:edited",

  // Reactions
  ADD_REACTION: "message:reaction:add",
  REMOVE_REACTION: "message:reaction:remove",
  REACTION_UPDATED: "message:reaction:updated",

  // Typing indicators
  TYPING_START: "user:typing:start",
  TYPING_STOP: "user:typing:stop",
  USER_TYPING: "user:typing",

  // Presence
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  PRESENCE_UPDATE: "user:presence",

  // Notifications (for future real-time notifications)
  NOTIFICATION: "notification:new",
  NOTIFICATION_READ: "notification:read",

  // Order updates (for future real-time order tracking)
  ORDER_STATUS_CHANGED: "order:status:changed",

  // Video review (timecoded comments + drawings)
  REVIEW_COMMENT_ADDED: "review:comment:added",
  REVIEW_COMMENT_UPDATED: "review:comment:updated",
  REVIEW_COMMENT_DELETED: "review:comment:deleted",
  REVIEW_FILE_STATUS_CHANGED: "review:file:status",

  // Co-watch (synchronized playback for the same file)
  COWATCH_JOIN: "cowatch:join",
  COWATCH_LEAVE: "cowatch:leave",
  COWATCH_STATE: "cowatch:state",
  COWATCH_SEEK: "cowatch:seek",
  COWATCH_PLAY: "cowatch:play",
  COWATCH_PAUSE: "cowatch:pause",
  COWATCH_PARTICIPANTS: "cowatch:participants",
};

export const ROOMS = {
  job: (jobId) => `job:${jobId}`,
  user: (userId) => `user:${userId}`,
  order: (orderId) => `order:${orderId}`,
};
