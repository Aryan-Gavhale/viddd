import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Plus, Trash2, SplitSquareVertical, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";

const inr = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function splitEvenly(total, count) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents % count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

function emptyRow() {
  return {
    title: "",
    description: "",
    dueDate: "",
    amount: "",
  };
}

function MilestoneSetup({ orderId, totalPrice, onComplete }) {
  const [rows, setRows] = useState([emptyRow(), emptyRow()]);
  const [submitting, setSubmitting] = useState(false);

  const target = useMemo(() => round2(Number(totalPrice) || 0), [totalPrice]);

  const running = useMemo(() => {
    let s = 0;
    rows.forEach((r) => {
      const n = parseFloat(String(r.amount).replace(/,/g, ""));
      if (!Number.isNaN(n)) s = round2(s + round2(n));
    });
    return s;
  }, [rows]);

  const diff = useMemo(() => round2(running - target), [running, target]);
  const valid = rows.length > 0 && rows.every((r) => r.title.trim() && r.dueDate) && Math.abs(diff) < 0.01;

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updateRow = (idx, field, value) => {
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const split = () => {
    if (rows.length === 0) return;
    const parts = splitEvenly(target, rows.length);
    setRows((prev) => prev.map((row, i) => ({ ...row, amount: String(parts[i] ?? 0) })));
    toast.success("Amounts split evenly across milestones");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orderId) {
      toast.error("Missing order");
      return;
    }
    if (!valid) {
      toast.error("Check all titles, due dates, and ensure amounts add up to the order total.");
      return;
    }
    setSubmitting(true);
    try {
      const milestones = rows.map((r) => ({
        title: r.title.trim(),
        description: (r.description || "").trim() || undefined,
        dueDate: new Date(r.dueDate).toISOString(),
        amount: round2(parseFloat(String(r.amount).replace(/,/g, ""))),
      }));
      const { data: body } = await axiosInstance.post(`/milestones/order/${orderId}`, { milestones });
      toast.success(body?.message || "Milestones created");
      if (typeof onComplete === "function") onComplete(body?.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create milestones");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl space-y-6 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-violet-50/30 to-fuchsia-50/20 p-5 shadow-sm ring-1 ring-violet-100/50 sm:p-7"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Milestone payment plan</h2>
        <p className="mt-1 text-sm text-slate-600">Split the project into clear checkpoints. Amounts must total the order value.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/80">
          <p className="text-sm text-slate-600">
            Order total: <span className="font-semibold text-slate-900">{inr(target)}</span>
          </p>
          <p className="text-sm">
            <span className="text-slate-600">Your split: </span>
            <span className={Math.abs(diff) < 0.01 ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
              {inr(running)}
            </span>
            {Math.abs(diff) >= 0.01 && <span className="text-slate-500"> (diff {diff > 0 ? "+" : ""}{inr(diff)})</span>}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100/60 transition hover:ring-violet-200/80"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">Milestone {idx + 1}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Title *</span>
                <input
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-inner focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  value={row.title}
                  onChange={(e) => updateRow(idx, "title", e.target.value)}
                  placeholder="e.g. First cut & audio sync"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-inner focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  rows={2}
                  value={row.description}
                  onChange={(e) => updateRow(idx, "description", e.target.value)}
                  placeholder="What must be delivered for this step?"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Due date *</span>
                <input
                  required
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  value={row.dueDate}
                  onChange={(e) => updateRow(idx, "dueDate", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Amount (₹) *</span>
                <input
                  required
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  value={row.amount}
                  onChange={(e) => updateRow(idx, "amount", e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"
        >
          <Plus className="h-4 w-4" />
          Add milestone
        </button>
        <button
          type="button"
          onClick={split}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <SplitSquareVertical className="h-4 w-4" />
          Split evenly
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
        <p className="text-sm text-slate-600">
          {valid ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Ready to submit
            </span>
          ) : (
            "Fill every title and due date, and match the running total to the order amount."
          )}
        </p>
        <button
          type="submit"
          disabled={submitting || !valid}
          className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save milestone plan
        </button>
      </div>
    </form>
  );
}

MilestoneSetup.propTypes = {
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  totalPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onComplete: PropTypes.func,
};

MilestoneSetup.defaultProps = {
  totalPrice: 0,
  onComplete: undefined,
};

export default MilestoneSetup;
