import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Sparkles, Search, Star, Briefcase, Code2, Palette, DollarSign,
  ChevronRight, Loader2, X, Plus, Award, TrendingUp, Target, Users,
} from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

const SKILLS = ["Video Editing", "Color Grading", "Motion Graphics", "VFX", "Sound Design", "3D Animation", "Compositing", "Rotoscoping", "Title Design", "Cinematography"];
const SOFTWARE_LIST = ["DaVinci Resolve", "Adobe Premiere", "After Effects", "Final Cut Pro", "Nuke", "Blender", "Cinema 4D", "Houdini", "Avid Media Composer", "Logic Pro"];
const STYLES = ["Cinematic", "Corporate", "Documentary", "Music Video", "Social Media", "Commercial", "Film", "Wedding", "Sports", "Tutorial", "Vlog", "Lyric Video"];

function ChipSelect({ items, selected, onToggle, label }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button key={item} type="button" onClick={() => onToggle(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"}`}
            >{item}</button>
          );
        })}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
            className={`h-full rounded-full ${color}`} />
        </div>
      </div>
      <span className="w-8 text-right text-[10px] font-bold text-slate-700 dark:text-slate-300">{value}%</span>
    </div>
  );
}

export default function EditorMatcher() {
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const [skills, setSkills] = useState([]);
  const [software, setSoftware] = useState([]);
  const [style, setStyle] = useState([]);
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(200);
  const [expLevel, setExpLevel] = useState("");

  const toggleItem = (list, setList) => (item) => {
    setList((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  };

  const handleSearch = async () => {
    if (skills.length === 0 && software.length === 0 && style.length === 0) {
      return toast.warn("Select at least one skill, software, or style preference");
    }
    setLoading(true);
    try {
      const { data } = await axiosInstance.post("/matching/find", {
        requiredSkills: skills, requiredSoftware: software, requiredStyle: style,
        budgetMin, budgetMax, experienceLevel: expLevel || undefined,
      });
      setResults(data.data);
      setStep("results");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Matching failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/25">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Find Your Perfect Editor</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          AI-powered matching based on style, software expertise, and past work — not generic filters
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <ChipSelect items={SKILLS} selected={skills} onToggle={toggleItem(skills, setSkills)} label="Required Skills" />
            <ChipSelect items={SOFTWARE_LIST} selected={software} onToggle={toggleItem(software, setSoftware)} label="Software Expertise" />
            <ChipSelect items={STYLES} selected={style} onToggle={toggleItem(style, setStyle)} label="Creative Style" />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Min Budget ($/hr)</label>
                <input type="number" className={INPUT} value={budgetMin} onChange={(e) => setBudgetMin(parseInt(e.target.value) || 0)} min={0} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Max Budget ($/hr)</label>
                <input type="number" className={INPUT} value={budgetMax} onChange={(e) => setBudgetMax(parseInt(e.target.value) || 200)} min={0} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Experience Level</label>
                <select className={INPUT + " appearance-none"} value={expLevel} onChange={(e) => setExpLevel(e.target.value)}>
                  <option value="">Any</option>
                  <option value="ENTRY">Entry</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
            </div>

            <button onClick={handleSearch} disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl disabled:opacity-60">
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : <><Sparkles className="mr-2 inline h-4 w-4" /> Find Matches</>}
            </button>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {results?.matches?.length || 0} Matches Found
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  from {results?.totalCandidates || 0} available editors
                </p>
              </div>
              <button onClick={() => setStep("form")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                <Search className="h-3 w-3" /> New Search
              </button>
            </div>

            <div className="space-y-4">
              {(results?.matches || []).map((m, i) => (
                <motion.div key={m.freelancer.userId}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex gap-4">
                    {/* Rank badge */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-lg ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25" : i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/25" : i === 2 ? "bg-gradient-to-br from-orange-600 to-amber-700 shadow-orange-700/25" : "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-indigo-500/25"}`}>
                      #{i + 1}
                    </div>

                    {/* Avatar */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-lg font-bold text-white">
                      {m.freelancer.profilePicture
                        ? <img src={m.freelancer.profilePicture} alt="" className="h-full w-full object-cover" />
                        : (m.freelancer.firstName || "?")[0]}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {m.freelancer.firstName} {m.freelancer.lastName}
                        </h3>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {m.freelancer.experienceLevel}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${m.freelancer.hourlyRate}/hr</span>
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{m.freelancer.rating?.toFixed(1) || "N/A"}</span>
                        <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{m.freelancer.completedOrders} projects</span>
                      </div>

                      {/* Match reasons */}
                      {m.reasons?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.reasons.map((r, ri) => (
                            <span key={ri} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Score breakdown */}
                      <div className="mt-3 space-y-1">
                        <ScoreBar label="Skills" value={m.scores.skill} color="bg-gradient-to-r from-blue-500 to-indigo-500" />
                        <ScoreBar label="Software" value={m.scores.software} color="bg-gradient-to-r from-purple-500 to-pink-500" />
                        <ScoreBar label="Style" value={m.scores.style} color="bg-gradient-to-r from-amber-500 to-orange-500" />
                        <ScoreBar label="Rating" value={m.scores.rating} color="bg-gradient-to-r from-emerald-500 to-teal-500" />
                      </div>
                    </div>

                    {/* Overall score */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative flex h-16 w-16 items-center justify-center">
                        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-700" />
                          <circle cx="32" cy="32" r="28" fill="none" stroke="url(#matchGrad)" strokeWidth="4"
                            strokeDasharray={`${(m.scores.overall / 100) * 175.93} 175.93`} strokeLinecap="round" />
                          <defs><linearGradient id="matchGrad"><stop stopColor="#6366f1" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
                        </svg>
                        <span className="absolute text-sm font-bold text-slate-900 dark:text-white">{Math.round(m.scores.overall)}</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">match</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
