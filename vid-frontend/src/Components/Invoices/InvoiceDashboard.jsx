import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../api/axiosInstance';

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SENT', label: 'Pending' },
  { key: 'PAID', label: 'Paid' },
  { key: 'OVERDUE', label: 'Overdue' },
];

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SENT: 'bg-amber-50 text-amber-800 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  OVERDUE: 'bg-rose-50 text-rose-800 border-rose-200',
};

function normalizeList(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.invoices)) return d.invoices;
  return [];
}

function toDollars(inv) {
  if (inv.amountCents != null) return Number(inv.amountCents) / 100;
  if (inv.totalCents != null) return Number(inv.totalCents) / 100;
  const a = inv.totalAmount ?? inv.amount ?? inv.total ?? 0;
  return typeof a === 'number' ? a : parseFloat(a, 10) || 0;
}

function formatCurrency(n) {
  const v = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatus(inv) {
  const s = (inv.status || 'DRAFT').toString().toUpperCase();
  if (['DRAFT', 'SENT', 'PAID', 'OVERDUE'].includes(s)) return s;
  return 'DRAFT';
}

function escapeHtml(str) {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintableHtml(inv) {
  const amount = formatCurrency(toDollars(inv));
  const number = inv.invoiceNumber || inv.number || inv.id;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${number}</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;padding:2rem;max-width:640px;margin:0 auto;color:#111}
    h1{font-size:1.5rem;margin-bottom:0.5rem}
    .meta{color:#666;font-size:0.9rem;margin-bottom:2rem}
    table{width:100%;border-collapse:collapse;margin-top:1rem}
    th,td{padding:0.5rem;border-bottom:1px solid #eee;text-align:left}
    .total{font-weight:700;font-size:1.1rem;margin-top:1rem}
    @media print{body{padding:0}}
  </style></head><body>
  <h1>Invoice</h1>
  <p class="meta">#${escapeHtml(number)} · ${formatDate(inv.issuedAt || inv.createdAt)}</p>
  <p><strong>Bill to:</strong> ${escapeHtml(inv.clientName || inv.client)}</p>
  <p><strong>Due:</strong> ${formatDate(inv.dueDate)}</p>
  <p class="total">Amount: ${amount}</p>
  <p><strong>Status:</strong> ${getStatus(inv)}</p>
  ${inv.description ? `<p>${escapeHtml(inv.description)}</p>` : ''}
  <script>window.onload=function(){window.print()}</script>
  </body></html>`;
}

export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    description: '',
    amount: '',
    dueDate: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/invoices');
      setInvoices(normalizeList(res));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === 'ALL') return invoices;
    return invoices.filter((i) => getStatus(i) === tab);
  }, [invoices, tab]);

  const stats = useMemo(() => {
    const list = Array.isArray(invoices) ? invoices : [];
    const total = list.length;
    const pending = list.filter((i) => {
      const s = getStatus(i);
      return s === 'SENT' || s === 'OVERDUE';
    }).length;
    const paid = list.filter((i) => getStatus(i) === 'PAID').length;
    const earned = list
      .filter((i) => getStatus(i) === 'PAID')
      .reduce((acc, i) => acc + toDollars(i), 0);
    return { total, pending, paid, earned };
  }, [invoices]);

  const toggleExpand = (id) => {
    setExpandedId((x) => (x === id ? null : id));
  };

  const openPdfOrPrint = async (inv) => {
    const id = inv.id;
    if (id == null) {
      toast.error('Invalid invoice');
      return;
    }
    try {
      const res = await axiosInstance.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
      });
      const blob = res.data;
      const mime = (res.headers && res.headers['content-type']) || blob.type || '';
      if (mime.includes('application/pdf') || (blob && blob.size > 0 && !mime.includes('json'))) {
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (win) {
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice-${id}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        }
        return;
      }
    } catch {
      /* try HTML */
    }
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (w) {
      w.document.write(buildPrintableHtml(inv));
      w.document.close();
    } else {
      toast.error('Popup blocked. Allow popups to print or download.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid amount');
      setSubmitting(false);
      return;
    }
    try {
      const payload = {
        clientName: form.clientName.trim() || 'Client',
        description: form.description.trim(),
        amount,
        totalAmount: amount,
        dueDate: form.dueDate || null,
        status: 'DRAFT',
      };
      const res = await axiosInstance.post('/invoices', payload);
      const created = res.data?.data ?? res.data;
      if (created && typeof created === 'object' && 'id' in created) {
        setInvoices((prev) => [created, ...prev]);
      } else {
        await load();
      }
      toast.success('Invoice created');
      setForm({ clientName: '', description: '', amount: '', dueDate: '' });
      setCreateOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
            <p className="text-slate-500 mt-1">Manage and track your billing</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-medium shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[
            { label: 'Total invoices', value: stats.total, icon: FileText, c: 'text-indigo-600' },
            { label: 'Pending / draft', value: stats.pending, icon: Clock, c: 'text-amber-600' },
            { label: 'Paid', value: stats.paid, icon: CheckCircle2, c: 'text-emerald-600' },
            { label: 'Total earned', value: formatCurrency(stats.earned), icon: DollarSign, c: 'text-slate-800' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5"
            >
              <s.icon className={`w-6 h-6 ${s.c} mb-2`} />
              <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No invoices in this view</p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-3 text-indigo-600 font-medium hover:underline"
                >
                  Create your first invoice
                </button>
              </div>
            )}
            <AnimatePresence>
              {filtered.map((inv) => {
                const id = inv.id;
                const st = getStatus(inv);
                const open = expandedId === id;
                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(id)}
                      className="w-full text-left p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${
                            STATUS_STYLES[st] || STATUS_STYLES.DRAFT
                          }`}
                        >
                          {st}
                        </span>
                        <span className="font-medium text-slate-900">
                          #{inv.invoiceNumber || inv.number || id}
                        </span>
                        <span className="text-slate-500 text-sm">
                          {inv.clientName || inv.client || 'Client'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(toDollars(inv))}
                        </span>
                        <span className="text-sm text-slate-500 min-w-[9rem]">
                          Due {formatDate(inv.dueDate)}
                        </span>
                        {open ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 hidden sm:block" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 hidden sm:block" />
                        )}
                      </div>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-100 bg-slate-50/50"
                        >
                          <div className="p-4 sm:p-5 space-y-3 text-sm">
                            <div className="grid sm:grid-cols-2 gap-2 text-slate-600">
                              <p>
                                <span className="text-slate-400">Issued: </span>
                                {formatDate(inv.issuedAt || inv.createdAt)}
                              </p>
                              <p>
                                <span className="text-slate-400">Status: </span>
                                {st}
                              </p>
                            </div>
                            {inv.description && (
                              <p className="text-slate-700 whitespace-pre-wrap">{inv.description}</p>
                            )}
                            {Array.isArray(inv.lineItems) && inv.lineItems.length > 0 && (
                              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                {inv.lineItems.map((line, idx) => {
                                  const lineAmt =
                                    line.amount ??
                                    line.total ??
                                    (line.unitPrice != null && line.qty
                                      ? Number(line.unitPrice) * Number(line.qty)
                                      : 0);
                                  return (
                                    <li key={idx}>
                                      {line.description || line.name || 'Item'} — {formatCurrency(lineAmt)}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPdfOrPrint(inv);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-slate-800 hover:bg-slate-50 text-sm"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && setCreateOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-1">New invoice</h2>
              <p className="text-sm text-slate-500 mb-4">Saves as draft. You can send it from your finance tools.</p>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-0.5">Client name</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    value={form.clientName}
                    onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                    placeholder="e.g. Acme Co."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-0.5">Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-0.5">Due date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-0.5">Description</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Line items, scope, or notes"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setCreateOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
