import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../redux/userSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSignature,
  CheckCircle2,
  CircleDashed,
  Loader2,
  FileText,
  PenLine,
} from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../../api/axiosInstance';

function normArray(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.templates)) return d.templates;
  if (Array.isArray(d?.contracts)) return d.contracts;
  return [];
}

function parseVariablesField(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => {
      if (typeof v === 'string') return { key: v, label: v, type: 'text' };
      return {
        key: v.key || v.name,
        label: v.label || v.key || v.name,
        type: (v.type || 'text').toString(),
      };
    });
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([key, def]) => ({
      key,
      label: typeof def === 'string' ? def : key,
      type: 'text',
    }));
  }
  return [];
}

function getStatus(c) {
  const s = (c.status || 'DRAFT').toString().toUpperCase();
  if (['DRAFT', 'PENDING', 'SIGNED', 'EXPIRED'].includes(s)) return s;
  return 'DRAFT';
}

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-800 border-slate-200',
  PENDING: 'bg-amber-50 text-amber-900 border-amber-200',
  SIGNED: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function ContractManager() {
  const user = useSelector(selectUser);
  const userId = user?.id;

  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templLoading, setTemplLoading] = useState(true);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formVars, setFormVars] = useState({});
  const [formTitle, setFormTitle] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  const [detail, setDetail] = useState(null);
  const [signTarget, setSignTarget] = useState(null);
  const [signBusy, setSignBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    setTemplLoading(true);
    try {
      const res = await axiosInstance.get('/contracts/templates');
      setTemplates(normArray(res));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load templates');
      setTemplates([]);
    } finally {
      setTemplLoading(false);
    }
  }, []);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/contracts/me');
      setContracts(normArray(res));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load contracts');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (tab === 'my') {
      loadContracts();
    }
  }, [tab, loadContracts]);

  const templateFields = useMemo(
    () => (selectedTemplate ? parseVariablesField(selectedTemplate.variables) : []),
    [selectedTemplate]
  );

  const openTemplateForm = (t) => {
    setSelectedTemplate(t);
    const next = {};
    for (const f of parseVariablesField(t.variables)) {
      next[f.key] = '';
    }
    setFormVars(next);
    setFormTitle(t.name || t.title || t.slug || 'Contract');
  };

  const submitFromTemplate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setCreateBusy(true);
    try {
      const res = await axiosInstance.post('/contracts', {
        templateId: selectedTemplate.id,
        title: formTitle,
        variableValues: formVars,
        variables: formVars,
      });
      const created = res.data?.data ?? res.data;
      if (created && typeof created === 'object' && 'id' in created) {
        setContracts((prev) => [created, ...prev]);
      } else {
        await loadContracts();
      }
      toast.success('Contract created');
      setSelectedTemplate(null);
      setTab('my');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create contract');
    } finally {
      setCreateBusy(false);
    }
  };

  const fetchContractDetail = async (c) => {
    if (!c?.id) return;
    try {
      const res = await axiosInstance.get(`/contracts/${c.id}`);
      setDetail(res.data?.data ?? res.data ?? c);
    } catch {
      setDetail(c);
    }
  };

  const openDetail = (c) => {
    setDetail(c);
    fetchContractDetail(c);
  };

  const canSign = (c) => {
    if (!userId) return false;
    const st = getStatus(c);
    if (st === 'SIGNED' || st === 'EXPIRED') return false;
    const me = String(userId);
    if (c.freelancerId != null && String(c.freelancerId) === me) {
      if (c.freelancerSigned || c.signedByFreelancer) return false;
      return true;
    }
    if (c.clientId != null && String(c.clientId) === me) {
      if (c.clientSigned || c.signedByClient) return false;
      return true;
    }
    const party = c.myParty || c.signerRole;
    if (party === 'FREELANCER' && !c.signedByFreelancer) return true;
    if (party === 'CLIENT' && !c.signedByClient) return true;
    if (Array.isArray(c.signatures)) {
      const mine = c.signatures.find((s) => s.isMine || String(s.userId) === me);
      if (mine && (mine.signed || mine.signedAt)) return false;
      if (c.signatures.some((s) => s.isMine)) return true;
    }
    return false;
  };

  const requestSign = (c) => {
    if (!canSign(c)) {
      toast.info('You cannot sign this contract in its current state.');
      return;
    }
    setSignTarget(c);
  };

  const confirmSign = async () => {
    if (!signTarget?.id) {
      setSignTarget(null);
      return;
    }
    setSignBusy(true);
    try {
      const res = await axiosInstance.post(`/contracts/${signTarget.id}/sign`, {});
      const updated = res.data?.data ?? res.data;
      setContracts((prev) =>
        prev.map((x) => (x.id === signTarget.id ? { ...x, ...updated } : x))
      );
      if (detail?.id === signTarget.id) {
        setDetail((d) => ({ ...d, ...updated }));
      }
      toast.success('Contract signed');
      setSignTarget(null);
      await loadContracts();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Sign failed');
    } finally {
      setSignBusy(false);
    }
  };

  const renderSignatureRow = (label, done) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      {done ? (
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Signed
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-400">
          <CircleDashed className="w-4 h-4" /> Pending
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-8 h-8 text-cyan-600" />
            Contracts
          </h1>
          <p className="text-slate-500 mt-1">Templates, drafts, and e-signatures</p>
        </motion.div>

        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 w-fit shadow-sm mb-6">
          <button
            type="button"
            onClick={() => setTab('templates')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'templates' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => setTab('my')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'my' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            My Contracts
          </button>
        </div>

        {tab === 'templates' && (
          <div>
            {templLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {templates.length === 0 && (
                  <p className="text-slate-500 col-span-full text-center py-8">No templates available yet.</p>
                )}
                {templates.map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-8 h-8 text-cyan-600 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-slate-900">{t.name || t.title || 'Template'}</h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{t.description || t.summary || ''}</p>
                        <button
                          type="button"
                          onClick={() => openTemplateForm(t)}
                          className="mt-3 text-sm font-medium text-cyan-700 hover:underline"
                        >
                          Use template
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'my' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {contracts.length === 0 && (
                  <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-500">
                    No contracts yet. Start from a template.
                  </div>
                )}
                {contracts.map((c) => {
                  const st = getStatus(c);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openDetail(c)}
                      className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2 hover:border-cyan-300 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{c.title || `Contract #${c.id}`}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Updated {c.updatedAt || c.createdAt || '—'}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          STATUS_STYLES[st] || STATUS_STYLES.DRAFT
                        }`}
                      >
                        {st}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !createBusy && setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-lg font-bold text-slate-900">Fill template</h2>
              <p className="text-sm text-slate-500 mb-4">{selectedTemplate.name || 'Contract'}</p>
              <form onSubmit={submitFromTemplate} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Title</label>
                  <input
                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
                {templateFields.length === 0 && (
                  <p className="text-sm text-slate-500">No variables. Submit to create a draft from this template.</p>
                )}
                {templateFields.map((f) => (
                  <div key={f.key}>
                    <label className="text-sm font-medium text-slate-700">{f.label || f.key}</label>
                    {f.type === 'textarea' ? (
                      <textarea
                        className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        rows={3}
                        value={formVars[f.key] || ''}
                        onChange={(e) => setFormVars((v) => ({ ...v, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className="mt-0.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={formVars[f.key] || ''}
                        onChange={(e) => setFormVars((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.key}
                      />
                    )}
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className="px-4 py-2 rounded-lg text-slate-600"
                    disabled={createBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createBusy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium disabled:opacity-60"
                  >
                    {createBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detail && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 max-h-[min(90vh,800px)] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{detail.title || 'Contract'}</h2>
                  <span
                    className={`mt-1 inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      STATUS_STYLES[getStatus(detail)] || STATUS_STYLES.DRAFT
                    }`}
                  >
                    {getStatus(detail)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {detail.content || detail.body || detail.htmlContent || 'No content returned yet.'}
              </div>

              <div className="border border-slate-200 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Signatures</p>
                {renderSignatureRow('Client / party A', !!(detail.signedByClient || detail.clientSigned))}
                {renderSignatureRow('Freelancer / party B', !!(detail.signedByFreelancer || detail.freelancerSigned))}
              </div>

              {canSign(detail) && (
                <button
                  type="button"
                  onClick={() => requestSign(detail)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-cyan-700"
                >
                  <PenLine className="w-4 h-4" />
                  Sign
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {signTarget && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !signBusy && setSignTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-900">Sign contract?</h3>
              <p className="text-sm text-slate-500 mt-2">
                This action records your agreement to <strong>{signTarget.title || 'this contract'}</strong>. Make sure
                you have read the full text.
              </p>
              <div className="flex gap-2 justify-end mt-5">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-slate-600"
                  onClick={() => setSignTarget(null)}
                  disabled={signBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSign}
                  disabled={signBusy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium"
                >
                  {signBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm & sign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
