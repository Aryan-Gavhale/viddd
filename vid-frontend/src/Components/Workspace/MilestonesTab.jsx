import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  Trash2,
  Loader2,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios.js";
import { formatDate, daysUntil } from "./utils.js";

const COLUMN_DEFS = [
  { id: "PENDING", label: "Pending", icon: Circle, accent: "border-gray-300 dark:border-gray-700" },
  { id: "IN_PROGRESS", label: "In progress", icon: Clock, accent: "border-blue-300 dark:border-blue-700" },
  { id: "COMPLETED", label: "Completed", icon: CheckCircle2, accent: "border-emerald-300 dark:border-emerald-700" },
];

function statusFor(item) {
  if (item.isCompleted) return "COMPLETED";
  if (item.status) return item.status;
  return "PENDING";
}

export function MilestonesTab({ jobId, role, openReviewCount = 0, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const reviewBlocked = Number(openReviewCount) > 0;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/timelines/projects/${jobId}`);
      setItems(res.data?.data || []);
    } catch {
      toast.error("Failed to load milestones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const grouped = useMemo(() => {
    const out = { PENDING: [], IN_PROGRESS: [], COMPLETED: [] };
    for (const m of items) {
      out[statusFor(m)]?.push(m);
    }
    return out;
  }, [items]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing?.id) {
        const res = await axiosInstance.put(`/timelines/${editing.id}`, payload);
        setItems((prev) => prev.map((m) => (m.id === editing.id ? res.data.data : m)));
        toast.success("Milestone updated");
      } else {
        const res = await axiosInstance.post(`/timelines/projects/${jobId}`, payload);
        setItems((prev) => [...prev, res.data.data]);
        toast.success("Milestone added");
      }
      setShowForm(false);
      setEditing(null);
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save milestone");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    if (newStatus === "COMPLETED" && reviewBlocked) {
      toast.error(
        `Resolve all ${openReviewCount} open review comment${openReviewCount === 1 ? "" : "s"} before marking this milestone complete.`
      );
      return;
    }
    try {
      const res = await axiosInstance.put(`/timelines/${item.id}`, {
        status: newStatus,
        progress: newStatus === "COMPLETED" ? 100 : newStatus === "IN_PROGRESS" ? Math.max(item.progress || 0, 25) : 0,
      });
      setItems((prev) => prev.map((m) => (m.id === item.id ? res.data.data : m)));
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not move milestone");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete milestone "${item.title}"?`)) return;
    try {
      await axiosInstance.delete(`/timelines/${item.id}`);
      setItems((prev) => prev.filter((m) => m.id !== item.id));
      toast.success("Milestone deleted");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not delete milestone");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Milestones</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Break the work into clear, dated checkpoints both sides can track.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {reviewBlocked && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
              title="A milestone cannot be marked complete while review comments are still open."
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {openReviewCount} open review comment{openReviewCount === 1 ? "" : "s"}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New milestone
          </button>
        </div>
      </div>

      {showForm && (
        <MilestoneForm
          initial={editing}
          saving={saving}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {loading ? (
        <KanbanSkeleton />
      ) : items.length === 0 ? (
        <EmptyMilestones onAdd={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {COLUMN_DEFS.map((col) => (
            <Column
              key={col.id}
              col={col}
              items={grouped[col.id] || []}
              role={role}
              reviewBlocked={reviewBlocked}
              openReviewCount={openReviewCount}
              onStatusChange={handleStatusChange}
              onEdit={(item) => {
                setEditing(item);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Column({ col, items, role, reviewBlocked, openReviewCount, onStatusChange, onEdit, onDelete }) {
  const Icon = col.icon;
  return (
    <div className={`bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-t-4 ${col.accent} p-3`}>
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Icon className="w-4 h-4" />
          {col.label}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{items.length}</span>
      </div>
      <ul className="space-y-2">
        {items.length === 0 && (
          <li className="text-xs text-gray-400 dark:text-gray-500 italic px-1">Nothing here yet.</li>
        )}
        {items.map((item) => (
          <MilestoneCard
            key={item.id}
            item={item}
            role={role}
            reviewBlocked={reviewBlocked}
            openReviewCount={openReviewCount}
            onMove={onStatusChange}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        ))}
      </ul>
    </div>
  );
}

function MilestoneCard({ item, role, reviewBlocked, openReviewCount, onMove, onEdit, onDelete }) {
  const status = statusFor(item);
  const days = daysUntil(item.endDate);
  const overdue = days != null && days < 0 && status !== "COMPLETED";
  const upcoming = days != null && days >= 0 && days <= 3 && status !== "COMPLETED";
  const isFreelancer = role === "freelancer";

  return (
    <li className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-rose-600"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {item.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">{item.description}</p>
      )}

      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        {(item.startDate || item.endDate) && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {item.endDate ? formatDate(item.endDate) : formatDate(item.startDate)}
          </span>
        )}
        {overdue && (
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            Overdue
          </span>
        )}
        {!overdue && upcoming && (
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            Due in {days}d
          </span>
        )}
      </div>

      {item.progress != null && (
        <div className="mt-2">
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                status === "COMPLETED"
                  ? "bg-emerald-500"
                  : status === "IN_PROGRESS"
                  ? "bg-blue-500"
                  : "bg-gray-400"
              }`}
              style={{ width: `${item.progress || 0}%` }}
            />
          </div>
        </div>
      )}

      {isFreelancer && status !== "COMPLETED" && (
        <div className="mt-3 flex items-center gap-2">
          {status === "PENDING" && (
            <button
              type="button"
              onClick={() => onMove(item, "IN_PROGRESS")}
              className="flex-1 text-xs font-medium px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              Start
            </button>
          )}
          {status === "IN_PROGRESS" && (
            <button
              type="button"
              onClick={() => onMove(item, "COMPLETED")}
              disabled={reviewBlocked}
              title={
                reviewBlocked
                  ? `Resolve all ${openReviewCount} open review comment${openReviewCount === 1 ? "" : "s"} first`
                  : undefined
              }
              className={`flex-1 text-xs font-medium px-2 py-1 rounded-lg ${
                reviewBlocked
                  ? "bg-emerald-300 text-white cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {reviewBlocked ? "Resolve comments first" : "Mark complete"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function MilestoneForm({ initial, saving, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [startDate, setStartDate] = useState(formatDateInput(initial?.startDate) || "");
  const [endDate, setEndDate] = useState(formatDateInput(initial?.endDate) || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3"
    >
      <input
        autoFocus
        type="text"
        placeholder="Milestone title (e.g. Rough cut delivery)"
        value={title}
        maxLength={150}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
      />
      <textarea
        placeholder="Optional details, deliverables, acceptance criteria…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        maxLength={1000}
        className="w-full text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          Start
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
          />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          Due
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {initial ? "Save changes" : "Add milestone"}
        </button>
      </div>
    </form>
  );
}

function formatDateInput(d) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function EmptyMilestones({ onAdd }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl py-12 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
    >
      <CheckCircle2 className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No milestones yet</p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        Add your first milestone to plan deliverables.
      </p>
    </button>
  );
}

function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, c) => (
        <div key={c} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
