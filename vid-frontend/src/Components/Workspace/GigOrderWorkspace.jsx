import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  MessageSquare,
  PackageCheck,
  Send,
  ShieldCheck,
} from "lucide-react";
import axiosInstance from "../../utils/axios";
import { selectUser } from "../../redux/userSlice";
import { DeliveryPanel } from "./DeliveryPanel.jsx";

const TABS = ["overview", "files", "revisions", "delivery", "activity", "messages"];

export default function GigOrderWorkspace() {
  const { orderId } = useParams();
  const user = useSelector(selectUser);
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = async () => {
    const response = await axiosInstance.get(`/orders/${orderId}`);
    setOrder(response.data?.data || null);
  };

  const loadMessages = async () => {
    const response = await axiosInstance.get(`/messages?orderId=${orderId}&limit=50`);
    setMessages(response.data?.data?.messages || []);
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [orderResponse, messageResponse] = await Promise.all([
          axiosInstance.get(`/orders/${orderId}`),
          axiosInstance.get(`/messages?orderId=${orderId}&limit=50`),
        ]);
        if (!alive) return;
        setOrder(orderResponse.data?.data || null);
        setMessages(messageResponse.data?.data?.messages || []);
      } catch (err) {
        if (alive) setError(err.response?.data?.message || "Failed to load gig workspace.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const peer = useMemo(() => {
    if (!order) return null;
    if (user?.role === "FREELANCER") {
      return {
        id: order.clientId,
        name: [order.client?.firstname, order.client?.lastname].filter(Boolean).join(" ") || "Client",
      };
    }
    return {
      id: order.freelancer?.user?.id,
      name: [order.freelancer?.user?.firstname, order.freelancer?.user?.lastname].filter(Boolean).join(" ") || "Editor",
    };
  }, [order, user?.role]);

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || !peer?.id) return;
    setSending(true);
    try {
      await axiosInstance.post("/messages", {
        orderId: Number(orderId),
        receiverId: Number(peer.id),
        content,
      });
      setDraft("");
      await Promise.all([loadMessages(), loadOrder()]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">Loading gig workspace...</div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 text-slate-100">
        <div className="max-w-md rounded-2xl border border-red-900/40 bg-slate-900 p-6 text-center">
          <h1 className="text-lg font-semibold">Workspace unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">{error || "This order workspace could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const progress = order.status === "COMPLETED" ? 100 : order.status === "CURRENT" ? Math.max(Number(order.progress) || 0, 15) : 5;
  const dueDate = order.deliveryDeadline ? new Date(order.deliveryDeadline).toLocaleDateString() : "Not set";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/60 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Escrow {order.escrowStatus || "NONE"}
                </span>
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                  Gig order #{order.orderNumber}
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-bold">{order.gig?.title || order.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">{order.description || order.gig?.description}</p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-80">
              <Metric icon={PackageCheck} label="Package" value={order.package} />
              <Metric icon={ShieldCheck} label="Paid" value={`₹${Number(order.totalPrice || 0)}`} />
              <Metric icon={CalendarDays} label="Due" value={dueDate} />
              <Metric icon={Clock} label="Days left" value={order.daysLeft ?? "Soon"} />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Gig progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="rounded-3xl border border-slate-800 bg-slate-900/60">
            <nav className="flex gap-1 overflow-x-auto border-b border-slate-800 px-4">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-semibold capitalize ${
                    activeTab === tab ? "border-b-2 border-purple-400 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <section className="p-5">
              {activeTab === "overview" && <Overview order={order} peer={peer} />}
              {activeTab === "files" && <LinkedPanel orderId={orderId} type="files" />}
              {activeTab === "revisions" && <LinkedPanel orderId={orderId} type="revisions" />}
              {activeTab === "delivery" && (
                <DeliveryPanel
                  scopeType="ORDER"
                  scopeId={orderId}
                  role={user?.role === "FREELANCER" ? "freelancer" : "client"}
                  dark
                  onChanged={loadOrder}
                />
              )}
              {activeTab === "activity" && <Activity history={order.statusHistory || []} />}
              {activeTab === "messages" && (
                <Messages
                  messages={messages}
                  draft={draft}
                  setDraft={setDraft}
                  sending={sending}
                  onSend={sendMessage}
                  currentUserId={user?.id}
                />
              )}
            </section>
          </main>

          <aside className="space-y-4">
            <ActionCard icon={FolderOpen} title="Project Files" copy="Upload footage, brand assets, and final exports." to={`/orders/${orderId}/files`} />
            <ActionCard icon={FileText} title="Revision Tracker" copy="Track requested edits and approvals." to={`/orders/${orderId}/revisions`} />
            <button
              type="button"
              onClick={() => setActiveTab("messages")}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-purple-500"
            >
              <MessageSquare className="h-5 w-5 text-purple-300" />
              <h3 className="mt-3 font-semibold">Message {peer?.name || "participant"}</h3>
              <p className="mt-1 text-sm text-slate-400">Keep all gig-specific decisions inside this order.</p>
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = status === "COMPLETED" ? "emerald" : status === "CURRENT" ? "blue" : "amber";
  const classes = {
    emerald: "bg-emerald-500/10 text-emerald-300",
    blue: "bg-blue-500/10 text-blue-300",
    amber: "bg-amber-500/10 text-amber-300",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes[color]}`}>{status}</span>;
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <Icon className="h-4 w-4 text-purple-300" />
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-100">{value || "N/A"}</p>
    </div>
  );
}

function Overview({ order, peer }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Info title="Editor" value={peer?.name || "Assigned editor"} />
      <Info title="Aspect ratio" value={order.aspectRatio || "Not specified"} />
      <Info title="Video type" value={order.videoType || "Not specified"} />
      <Info title="Package requirements" value={order.requirements || "No extra requirements added"} wide />
    </div>
  );
}

function Info({ title, value, wide }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-950/50 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function LinkedPanel({ orderId, type }) {
  const isFiles = type === "files";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
      <h2 className="text-lg font-semibold">{isFiles ? "Order file room" : "Revision control"}</h2>
      <p className="mt-2 text-sm text-slate-400">
        {isFiles
          ? "Use the dedicated file manager for source footage, work-in-progress exports, and final delivery."
          : "Use the revision tracker to keep client feedback and editor updates structured."}
      </p>
      <Link
        to={`/orders/${orderId}/${isFiles ? "files" : "revisions"}`}
        className="mt-5 inline-flex rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
      >
        Open {isFiles ? "files" : "revisions"}
      </Link>
    </div>
  );
}

function Activity({ history }) {
  return (
    <div className="space-y-3">
      {history.length === 0 ? (
        <p className="text-sm text-slate-400">No activity yet.</p>
      ) : (
        history.map((item) => (
          <div key={item.id || `${item.status}-${item.changedAt}`} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
            <div>
              <p className="font-semibold">Status changed to {item.status}</p>
              <p className="text-xs text-slate-500">{item.changedAt ? new Date(item.changedAt).toLocaleString() : ""}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Messages({ messages, draft, setDraft, sending, onSend, currentUserId }) {
  return (
    <div className="space-y-4">
      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">No messages yet. Start the order conversation.</p>
        ) : (
          messages.map((message) => {
            const mine = Number(message.senderId) === Number(currentUserId);
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-100"}`}>
                  <p>{message.content}</p>
                  <p className="mt-1 text-[10px] opacity-70">{message.timestamp ? new Date(message.timestamp).toLocaleString() : ""}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex gap-2">
        <textarea
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a gig-specific update..."
          className="min-h-12 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-purple-500"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !draft.trim()}
          className="rounded-xl bg-purple-600 px-4 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, copy, to }) {
  return (
    <Link to={to} className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-purple-500">
      <Icon className="h-5 w-5 text-purple-300" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{copy}</p>
    </Link>
  );
}
