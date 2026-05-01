import { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import chatStore from "../state/chatStore.js";
import { selectUser } from "../redux/userSlice.js";

/**
 * Subscribe to a chat conversation scoped by jobId.
 * Returns the live state plus convenient action wrappers.
 *
 * The returned `send`, `retry` and `cancel` are stable across renders so
 * components using them don't get unnecessary re-renders.
 */
export function useChat(jobId) {
  const currentUser = useSelector(selectUser);
  const [state, setState] = useState(() => chatStore.getConversation(jobId ?? -1));

  useEffect(() => {
    if (jobId == null) return undefined;
    return chatStore.subscribeConversation(jobId, setState);
  }, [jobId]);

  const send = useCallback(
    (content, attachments = [], replyToId = null) =>
      chatStore.sendMessage(jobId, content, attachments, replyToId, currentUser),
    [jobId, currentUser]
  );
  const retry = useCallback(
    (messageOrId) => chatStore.retryMessage(jobId, messageOrId),
    [jobId]
  );
  const cancel = useCallback(
    (clientId) => chatStore.cancelMessage(jobId, clientId),
    [jobId]
  );
  const remove = useCallback((messageId) => chatStore.deleteMessage(jobId, messageId), [jobId]);
  const react = useCallback((messageId, emoji) => chatStore.addReaction(jobId, messageId, emoji), [jobId]);
  const typing = useCallback((isTyping) => chatStore.emitTyping(jobId, isTyping), [jobId]);
  const upload = useCallback((files) => chatStore.uploadAttachments(files), []);
  const markRead = useCallback(() => chatStore.markRead(jobId), [jobId]);
  const setPeer = useCallback((peer) => chatStore.setPeer(jobId, peer), [jobId]);
  const refresh = useCallback(() => chatStore.refresh(jobId), [jobId]);

  return useMemo(
    () => ({
      ...state,
      send,
      retry,
      cancel,
      remove,
      react,
      typing,
      upload,
      markRead,
      setPeer,
      refresh,
    }),
    [state, send, retry, cancel, remove, react, typing, upload, markRead, setPeer, refresh]
  );
}

export function useChatWidget() {
  const [state, setState] = useState(() => chatStore.getWidget());
  useEffect(() => chatStore.subscribeWidget(setState), []);
  return state;
}

export function openChatWidget(jobId, peer) {
  chatStore.openWidget(jobId, peer);
}

export function closeChatWidget() {
  chatStore.closeWidget();
}

export default useChat;
