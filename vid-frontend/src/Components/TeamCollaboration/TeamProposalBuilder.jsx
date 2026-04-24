import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Users, UserPlus, X, Loader2, ChevronDown, Send, DollarSign,
  Calendar, Trash2, CheckCircle2, Clock, XCircle, Mail, Crown,
} from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

const STATUS_BADGE = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  INVITED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DECLINED: "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-400",
};

const ROLES = ["Color Grading", "VFX Artist", "Sound Designer", "Motion Graphics", "Editor", "Compositor", "3D Artist", "Animator"];

export default function TeamProposalBuilder({ jobId: propJobId } = {}) {
  const params = useParams();
  const jobId = propJobId || params.jobId;
  const [proposals, setProposals] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("proposals");

  const [form, setForm] = useState({
    teamName: "", coverLetter: "", estimatedDays: 14,
    members: [{ userId: "", role: "", responsibility: "", rate: 0 }],
  });

  const fetchAll = useCallback(async () => {
    try {
      const [proposalsRes, invitationsRes, myRes] = await Promise.allSettled([
        jobId ? axiosInstance.get(`/team-proposals/job/${jobId}`) : Promise.resolve({ data: { data: [] } }),
        axiosInstance.get("/team-proposals/invitations"),
        axiosInstance.get("/team-proposals/my"),
      ]);
      if (proposalsRes.status === "fulfilled") setProposals(proposalsRes.value.data.data || []);
      if (invitationsRes.status === "fulfilled") setInvitations(invitationsRes.value.data.data || []);
      if (myRes.status === "fulfilled") setMyProposals(myRes.value.data.data || []);
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMember = () => {
    setForm((f) => ({ ...f, members: [...f.members, { userId: "", role: "", responsibility: "", rate: 0 }] }));
  };

  const removeMember = (i) => {
    setForm((f) => ({ ...f, members: f.members.filter((_, idx) => idx !== i) }));
  };

  const updateMember = (i, field, val) => {
    setForm((f) => {
      const members = [...f.members];
      members[i] = { ...members[i], [field]: val };
      return { ...f, members };
    });
  };

  const totalRate = form.members.reduce((s, m) => s + Number(m.rate || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobId) return toast.error("No job selected");
    if (form.members.some((m) => !m.userId || !m.role)) return toast.error("Fill in all member details");
    setSubmitting(true);
    try {
      const payload = {
        jobId: parseInt(jobId, 10),
        teamName: form.teamName,
        coverLetter: form.coverLetter,
        estimatedDays: form.estimatedDays,
        members: form.members.map((m) => ({
          userId: parseInt(m.userId, 10),
          role: m.role,
          responsibility: m.responsibility,
          rate: parseInt(m.rate, 10) || 0,
        })),
      };
      await axiosInstance.post("/team-proposals", payload);
      toast.success("Team proposal submitted!");
      setShowForm(false);
      setForm({ teamName: "", coverLetter: "", estimatedDays: 14, members: [{ userId: "", role: "", responsibility: "", rate: 0 }] });
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create proposal");
    } finally {
      setSubmitting(false);
    }
  };

  const respondInvite = async (memberId, accept) => {
    try {
      await axiosInstance.post(`/team-proposals/members/${memberId}/respond`, { accept });
      toast.success(accept ? "Invitation accepted!" : "Invitation declined");
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to respond");
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Team Collaboration</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Build a dream team — one for color, one for VFX, one for sound</p>
        </div>
        {jobId && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl">
            <Users className="h-4 w-4" /> Create Team Proposal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {[
          { key: "proposals", label: `Proposals${proposals.length ? ` (${proposals.length})` : ""}` },
          { key: "invitations", label: `Invitations${invitations.length ? ` (${invitations.length})` : ""}` },
          { key: "my", label: `My Teams${myProposals.length ? ` (${myProposals.length})` : ""}` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.key ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Proposals Tab */}
      {tab === "proposals" && (
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-16 dark:border-slate-700">
              <Users className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">{jobId ? "No team proposals yet" : "Select a job to view proposals"}</p>
            </div>
          ) : (
            proposals.map((p) => <ProposalCard key={p.id} proposal={p} />)
          )}
        </div>
      )}

      {/* Invitations Tab */}
      {tab === "invitations" && (
        <div className="space-y-3">
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-16 dark:border-slate-700">
              <Mail className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No pending invitations</p>
            </div>
          ) : (
            invitations.map((inv) => (
              <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{inv.teamName}</h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      For: {inv.jobTitle} · Led by {inv.leaderFirstName} {inv.leaderLastName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Your role: <strong>{inv.role}</strong></p>
                    {inv.responsibility && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{inv.responsibility}</p>}
                  </div>
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{inv.rate || 0} credits</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => respondInvite(inv.id, true)}
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    Accept
                  </button>
                  <button onClick={() => respondInvite(inv.id, false)}
                    className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                    Decline
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* My Teams Tab */}
      {tab === "my" && (
        <div className="space-y-4">
          {myProposals.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-16 dark:border-slate-700">
              <Crown className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">You haven't created any team proposals</p>
            </div>
          ) : (
            myProposals.map((p) => <ProposalCard key={p.id} proposal={p} showJob />)
          )}
        </div>
      )}

      {/* Create Team Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.form
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}
              className="w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
              style={{ maxHeight: "90vh" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Build Your Team</h2>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Team Name *</label>
                  <input className={INPUT} value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} required placeholder="e.g. Cinema Squad" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Cover Letter</label>
                  <textarea className={INPUT + " min-h-[80px] resize-y"} value={form.coverLetter} onChange={(e) => setForm({ ...form, coverLetter: e.target.value })} placeholder="Why is your team the best fit?" rows={3} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Days</label>
                  <input type="number" className={INPUT} value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: parseInt(e.target.value) || 14 })} min={1} max={365} />
                </div>

                {/* Members */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-900 dark:text-white">Team Members</label>
                    <button type="button" onClick={addMember}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
                      <UserPlus className="h-3 w-3" /> Add Member
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.members.map((m, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/30">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Member {i + 1}</span>
                          {form.members.length > 1 && (
                            <button type="button" onClick={() => removeMember(i)} className="text-red-400 transition hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input className={INPUT} value={m.userId} onChange={(e) => updateMember(i, "userId", e.target.value)} placeholder="User ID" />
                          <div className="relative">
                            <select className={"appearance-none " + INPUT} value={m.role} onChange={(e) => updateMember(i, "role", e.target.value)}>
                              <option value="">Select role</option>
                              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
                          </div>
                          <input className={INPUT} value={m.responsibility} onChange={(e) => updateMember(i, "responsibility", e.target.value)} placeholder="Responsibility" />
                          <input type="number" className={INPUT} value={m.rate} onChange={(e) => updateMember(i, "rate", e.target.value)} placeholder="Rate (credits)" min={0} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Total Team Rate</span>
                    <span className="flex items-center gap-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">
                      <DollarSign className="h-4 w-4" /> {totalRate} credits
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60">
                  {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <><Send className="mr-1.5 inline h-4 w-4" /> Submit Proposal</>}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProposalCard({ proposal: p, showJob = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{p.teamName}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[p.status] || STATUS_BADGE.PENDING}`}>
              {p.status}
            </span>
          </div>
          {showJob && p.jobTitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Job: {p.jobTitle}</p>}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Crown className="h-3 w-3 text-amber-500" /> Led by {p.leaderFirstName} {p.leaderLastName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{p.totalPrice || 0}</p>
          <p className="text-[10px] text-slate-400">credits</p>
          {p.estimatedDays && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="h-3 w-3" /> {p.estimatedDays} days
            </p>
          )}
        </div>
      </div>

      {p.coverLetter && (
        <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{p.coverLetter}</p>
      )}

      {/* Members */}
      {p.members?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Team ({p.members.length})</p>
          <div className="flex flex-wrap gap-2">
            {p.members.map((m) => (
              <div key={m.id}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-700/40"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-[11px] font-bold text-white">
                  {(m.firstName || "?")[0]}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-900 dark:text-white">{m.firstName} {m.lastName}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{m.role}</p>
                </div>
                <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_BADGE[m.status] || STATUS_BADGE.INVITED}`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
