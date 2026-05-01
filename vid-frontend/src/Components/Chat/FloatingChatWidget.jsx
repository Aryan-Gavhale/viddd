import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatWidget, useChat } from "../../hooks/useChat.js";
import chatStore from "../../state/chatStore.js";
import ChatPanel from "./ChatPanel.jsx";
import { selectUser } from "../../redux/userSlice";
import { Maximize2, Minus, X, MessageSquare } from "lucide-react";

const HIDE_ON_PATHS = ["/login", "/signup", "/verify-email", "/password-recovery", "/messages"];
const WORKSPACE_PATHS = ["/client/workspace", "/editor/workspace", "/workspace"];

function MiniHeader({ peer, unread, onMaximize, onMinimize, onClose }) {
  const name =
    peer?.name ||
    [peer?.firstname, peer?.lastname].filter(Boolean).join(" ") ||
    (peer?.id != null ? `User #${peer.id}` : "Conversation");

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
      <div className="flex items-center gap-2 min-w-0">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm truncate">{name}</span>
        {unread > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onMaximize}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Open in workspace"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMinimize}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function FloatingChatWidget() {
  const widget = useChatWidget();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const location = useLocation();
  // Subscribe so the unread badge updates live even when minimized.
  const conv = useChat(widget.open ? widget.jobId : null);

  useEffect(() => {
    if (widget.open && !widget.minimized) {
      chatStore.markRead(widget.jobId);
    }
  }, [widget.open, widget.minimized, widget.jobId]);

  if (!user?.id) return null;
  if (!widget.open || widget.jobId == null) return null;

  const onAnyHidePath = HIDE_ON_PATHS.some((p) => location.pathname.startsWith(p));
  if (onAnyHidePath) return null;

  const onWorkspace = WORKSPACE_PATHS.some((p) => location.pathname.startsWith(p));
  if (onWorkspace) return null;

  const peer = widget.peer || conv.peer;

  const handleMaximize = () => {
    const jobId = widget.jobId;
    chatStore.closeWidget();
    const base = user.role === "FREELANCER" ? "/editor/workspace" : "/client/workspace";
    navigate(jobId != null ? `${base}?jobId=${jobId}` : base);
  };

  if (widget.minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[60] w-72 bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200">
        <MiniHeader
          peer={peer}
          unread={conv.unreadCount}
          onMaximize={handleMaximize}
          onMinimize={() => chatStore.toggleMinimize()}
          onClose={() => chatStore.closeWidget()}
        />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[360px] h-[520px] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200 flex flex-col">
      <MiniHeader
        peer={peer}
        unread={0}
        onMaximize={handleMaximize}
        onMinimize={() => chatStore.toggleMinimize()}
        onClose={() => chatStore.closeWidget()}
      />
      <div className="flex-1 overflow-hidden">
        <ChatPanel jobId={widget.jobId} peer={peer} compact hideHeader />
      </div>
    </div>
  );
}
