import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Award, Clock, Target, ChevronRight, Star, Loader2, Shield,
  Filter, Flame, Zap, Trophy, BookOpen, Upload, CheckCircle2, XCircle,
} from "lucide-react";

const DIFFICULTY = {
  BEGINNER: { bg: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", icon: BookOpen },
  INTERMEDIATE: { bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", icon: Zap },
  ADVANCED: { bg: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300", icon: Flame },
  EXPERT: { bg: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: Trophy },
};

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SkillTestHub() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTest, setActiveTest] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [timer, setTimer] = useState(0);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterCat, setFilterCat] = useState("");

  const fetchTests = useCallback(async () => {
    try {
      const url = filterCat ? `/skill-tests?category=${encodeURIComponent(filterCat)}` : "/skill-tests";
      const { data } = await axiosInstance.get(url);
      setTests(data.data || []);
    } catch {
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  }, [filterCat]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  useEffect(() => {
    if (!activeAttempt || activeAttempt.status !== "IN_PROGRESS") return;
    const iv = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [activeAttempt]);

  const viewTest = async (testId) => {
    try {
      const { data } = await axiosInstance.get(`/skill-tests/${testId}`);
      setActiveTest(data.data);
    } catch {
      toast.error("Failed to load test details");
    }
  };

  const startTest = async () => {
    if (!activeTest) return;
    try {
      const { data } = await axiosInstance.post(`/skill-tests/${activeTest.id}/start`);
      setActiveAttempt(data.data.attempt);
      setTimer(0);
      toast.success("Test started! Timer is running.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to start test");
    }
  };

  const submitTest = async () => {
    if (!activeAttempt) return;
    setSubmitting(true);
    try {
      await axiosInstance.post(`/skill-tests/attempts/${activeAttempt.id}/submit`, { submissionUrl });
      toast.success("Submission received! Awaiting review.");
      setActiveAttempt(null);
      setActiveTest(null);
      setSubmissionUrl("");
      fetchTests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [...new Set(tests.map((t) => t.category))];
  const timeLimit = activeTest?.timeLimitSeconds || 3600;
  const remaining = Math.max(0, timeLimit - timer);
  const urgent = remaining < 300;

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Skills Verification</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Prove your skills with timed practical tests — earn real badges that clients trust
        </p>
      </div>

      {/* Category filter chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat("")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${!filterCat ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}
        >All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${filterCat === c ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}
          >{c}</button>
        ))}
      </div>

      {/* Test Cards Grid */}
      {!activeTest ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => {
            const d = DIFFICULTY[t.difficulty] || DIFFICULTY.INTERMEDIATE;
            const DIcon = d.icon;
            return (
              <motion.button
                key={t.id}
                onClick={() => viewTest(t.id)}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
                    <Target className="h-5 w-5" />
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${d.bg}`}>
                    <DIcon className="h-3 w-3" /> {t.difficulty}
                  </span>
                </div>
                <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">{t.title}</h3>
                <p className="mb-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{t.description}</p>
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(t.timeLimitSeconds / 60)} min</span>
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Pass: {t.passingScore}%</span>
                  <span className="flex items-center gap-1"><Filter className="h-3 w-3" /> {t.category}</span>
                </div>
                {t.badgeTitle && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    <Award className="h-3.5 w-3.5" /> Earn: {t.badgeTitle}
                  </div>
                )}
                <ChevronRight className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500 dark:text-slate-600" />
              </motion.button>
            );
          })}
        </div>
      ) : (
        /* Test Detail / Active Attempt */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <button onClick={() => { setActiveTest(null); setActiveAttempt(null); }}
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">&larr; Back to tests</button>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{activeTest.title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activeTest.description}</p>
              </div>
              {activeTest.badgeTitle && (
                <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 dark:from-amber-900/30 dark:to-orange-900/30">
                  <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{activeTest.badgeTitle}</span>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Time Limit</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(activeTest.timeLimitSeconds / 60)} min</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Passing Score</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{activeTest.passingScore}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Attempts</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{activeTest.attemptCount || 0}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Pass Rate</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(activeTest.passRate || 0)}%</p>
              </div>
            </div>
          </div>

          {/* Active timer */}
          <AnimatePresence>
            {activeAttempt && activeAttempt.status === "IN_PROGRESS" && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className={`rounded-2xl border p-6 shadow-sm ${urgent ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20" : "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/20"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Test in Progress</p>
                    <p className={`mt-1 text-3xl font-mono font-bold ${urgent ? "text-red-600 dark:text-red-400" : "text-indigo-800 dark:text-indigo-300"}`}>
                      {formatTime(remaining)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">remaining</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full border-4 border-indigo-200 dark:border-indigo-700" style={{
                      background: `conic-gradient(#6366f1 ${(timer / timeLimit) * 360}deg, transparent 0deg)`,
                    }}>
                      <div className="m-0.5 flex h-[calc(100%-4px)] w-[calc(100%-4px)] items-center justify-center rounded-full bg-white dark:bg-slate-800">
                        <Clock className="h-4 w-4 text-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Instructions</h4>
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{activeTest.instructions}</p>
                  {activeTest.sourceFileUrl && (
                    <a href={activeTest.sourceFileUrl} target="_blank" rel="noopener noreferrer"
                       className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">
                      <Upload className="h-3 w-3" /> Download Source File
                    </a>
                  )}
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Submission URL *</label>
                  <input className={INPUT} value={submissionUrl} onChange={(e) => setSubmissionUrl(e.target.value)} placeholder="Link to your completed work (e.g. S3, Google Drive)" />
                </div>
                <button
                  onClick={submitTest} disabled={submitting || !submissionUrl.trim()}
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit Work"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start button */}
          {!activeAttempt && (
            <button onClick={startTest}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl">
              <Shield className="mr-2 inline h-4 w-4" /> Start Test
            </button>
          )}

          {/* Past attempts */}
          {activeTest.userAttempts?.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Your Past Attempts</h3>
              <div className="space-y-2">
                {activeTest.userAttempts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                      {a.passed ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : a.status === "GRADED" ? <XCircle className="h-5 w-5 text-red-400" /> : <Clock className="h-5 w-5 text-amber-400" />}
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{a.status.toLowerCase().replace("_", " ")}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : "In progress"}
                          {a.timeSpentSeconds ? ` · ${formatTime(a.timeSpentSeconds)}` : ""}
                        </p>
                      </div>
                    </div>
                    {a.score !== null && a.score !== undefined && (
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${a.passed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {a.score}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
