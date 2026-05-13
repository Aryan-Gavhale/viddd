import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../utils/axios";
import {
  Bell,
  Check,
  CheckCheck,
  CreditCard,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Trash2,
} from "lucide-react";

const TYPE_OPTIONS = [
  { id: "ALL", label: "All" },
  { id: "MESSAGE", label: "Messages" },
  { id: "ORDER_UPDATE", label: "Orders" },
  { id: "PAYMENT", label: "Payments" },
  { id: "APPLICATION", label: "Applications" },
  { id: "SYSTEM", label: "System" },
];

const ICONS = {
  MESSAGE: MessageSquare,
  PAYMENT: CreditCard,
  DISPUTE: ShieldAlert,
  APPLICATION: ShieldAlert,
  SYSTEM: Bell,
  ORDER_UPDATE: Bell,
};

function titleFor(notification) {
  if (notification.metadata?.title) return notification.metadata.title;
  if (notification.entityType === "APPLICATION") return "Application update";
  return String(notification.type || "SYSTEM").split("_").join(" ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function hrefFor(notification) {
  const entityId = notification.entityId || notification.metadata?.entityId;
  if (notification.entityType === "ORDER" && entityId) return `/orders/${entityId}`;
  if (notification.entityType === "MESSAGE" && notification.metadata?.jobId) {
    return `/workspace?jobId=${notification.metadata.jobId}`;
  }
  if (notification.entityType === "APPLICATION") return "/client/jobs";
  return "#";
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, urgent: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState("ALL");
  const [readFilter, setReadFilter] = useState("ALL");

  const queryParams = useMemo(() => {
    const params = { page, limit: 20 };
    if (type !== "ALL") params.type = type;
    if (readFilter !== "ALL") params.isRead = readFilter === "READ" ? "true" : "false";
    return params;
  }, [page, type, readFilter]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [feedRes, summaryRes] = await Promise.all([
        axiosInstance.get("/notifications", { params: queryParams }),
        axiosInstance.get("/notifications/summary"),
      ]);
      const data = feedRes.data?.data || {};
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setSummary(summaryRes.data?.data || { total: 0, unread: 0, urgent: 0, byType: {} });
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await axiosInstance.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setSummary((prev) => ({ ...prev, unread: Math.max(0, Number(prev.unread || 0) - 1) }));
    } catch (error) {
      console.error("Failed to mark notification read", error);
    }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSummary((prev) => ({ ...prev, unread: 0, urgent: 0 }));
    } catch (error) {
      console.error("Failed to mark all notifications read", error);
    }
  };

  const deleteNotification = async (id) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await axiosInstance.delete(`/notifications/${id}`);
      setSummary((prev) => ({
        ...prev,
        total: Math.max(0, Number(prev.total || 0) - 1),
        unread: target && !target.isRead ? Math.max(0, Number(prev.unread || 0) - 1) : prev.unread,
      }));
    } catch (error) {
      console.error("Failed to delete notification", error);
      fetchNotifications();
    }
  };

  const clearRead = async () => {
    try {
      await axiosInstance.delete("/notifications/read");
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to clear read notifications", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              <Bell className="h-3.5 w-3.5" />
              Activity center
            </div>
            <h1 className="mt-3 text-3xl font-bold text-gray-950">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              All project, message, payment, and system updates in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total" value={summary.total || 0} />
            <Stat label="Unread" value={summary.unread || 0} highlight />
            <Stat label="Urgent" value={summary.urgent || 0} />
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setType(option.id);
                    setPage(1);
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    type === option.id
                      ? "bg-gray-950 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                  }`}
                >
                  {option.label}
                  {option.id !== "ALL" && summary.byType?.[option.id] ? (
                    <span className="ml-1 text-xs opacity-70">{summary.byType[option.id]}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {["ALL", "UNREAD", "READ"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setReadFilter(filter);
                    setPage(1);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    readFilter === filter ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700"
                  }`}
                >
                  {filter === "ALL" ? "Any status" : filter === "UNREAD" ? "Unread only" : "Read only"}
                </button>
              ))}
              {summary.unread > 0 && (
                <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={clearRead} className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                <Trash2 className="h-3.5 w-3.5" />
                Clear read
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-20 text-center text-gray-400">
              <Bell className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p className="text-lg font-semibold text-gray-700">No notifications found</p>
              <p className="mt-1 text-sm">Try a different filter or check back later.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                const href = hrefFor(n);
                return (
                  <li key={n.id} className={`flex gap-4 px-5 py-4 transition hover:bg-purple-50/40 ${n.isRead ? "bg-white" : "bg-purple-50/60"}`}>
                    <div className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${n.isRead ? "bg-gray-100 text-gray-500" : "bg-purple-600 text-white"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {href === "#" ? (
                          <h2 className="text-sm font-bold text-gray-950">{titleFor(n)}</h2>
                        ) : (
                          <Link to={href} onClick={() => !n.isRead && markRead(n.id)} className="text-sm font-bold text-gray-950 hover:text-purple-700">
                            {titleFor(n)}
                          </Link>
                        )}
                        {!n.isRead && <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                        {n.priority === "HIGH" && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">HIGH</span>}
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{n.content}</p>
                      {n.metadata?.jobTitle && (
                        <p className="mt-1 text-xs text-gray-500">Job: {n.metadata.jobTitle}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-start gap-2">
                      {!n.isRead && (
                        <button onClick={() => markRead(n.id)} className="rounded-lg p-2 text-purple-600 hover:bg-white" title="Mark as read">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => deleteNotification(n.id)} className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 ${highlight ? "bg-purple-600 text-white" : "bg-white text-gray-950"}`}>
      <p className={`text-xs uppercase tracking-wide ${highlight ? "text-purple-100" : "text-gray-400"}`}>{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
