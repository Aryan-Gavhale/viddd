import { useEffect, useState } from "react";
import { Pin, X } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios.js";
import ChatPanel from "../Chat/ChatPanel.jsx";
import { Avatar } from "./Avatar.jsx";
import { fullName, formatRelativeTime } from "./utils.js";

export function ChatRail({ jobId, peer, role }) {
  return (
    <aside className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 h-full flex flex-col overflow-hidden w-full">
      <PeerHeader peer={peer} role={role} />
      <PinnedBar jobId={jobId} />
      <div className="flex-1 min-h-0">
        <ChatPanel jobId={jobId} peer={peer} compact={false} />
      </div>
    </aside>
  );
}

function PeerHeader({ peer, role }) {
  if (!peer) {
    return (
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-amber-50 dark:bg-amber-900/20">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          {role === "client" ? "No freelancer hired yet." : "Project not assigned to a freelancer."}
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

function PinnedBar({ jobId }) {
  const [pinned, setPinned] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchPinned = async () => {
    try {
      setLoadError("");
      const res = await axiosInstance.get(`/workspace/projects/${jobId}/pinned`);
      setPinned(res.data?.data?.pinned || []);
    } catch (e) {
      setPinned([]);
      // Show inline rather than failing silently. Don't toast on every
      // remount or when the user is just navigating between projects, just
      // surface the load failure inline so they know to retry.
      setLoadError(e?.response?.data?.message || "Could not load pinned messages.");
    }
  };

  useEffect(() => {
    if (jobId) fetchPinned();
  }, [jobId]);

  const handleUnpin = async (messageId) => {
    try {
      await axiosInstance.post(`/workspace/projects/${jobId}/pinned`, { messageId });
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
