import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/userSlice";
import axiosInstance from "../../utils/axios";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  FileText, Palette, Video, Shield, Package, Eye,
  ChevronRight, ChevronLeft, Save, Send, Check,
  Plus, Trash2, X, Link2, Upload, Sparkles,
  Clock, Users, Target, DollarSign, Music,
  Type, Image, Film, Monitor, Smartphone, Square,
} from "lucide-react";

const STEPS = [
  { id: 0, title: "Project Overview", icon: FileText, desc: "What are you creating?" },
  { id: 1, title: "Style & Tone",     icon: Palette,  desc: "How should it feel?" },
  { id: 2, title: "References",       icon: Video,    desc: "Show us examples" },
  { id: 3, title: "Brand Guidelines", icon: Shield,   desc: "Your brand identity" },
  { id: 4, title: "Deliverables",     icon: Package,  desc: "What do you need?" },
  { id: 5, title: "Review & Submit",  icon: Eye,      desc: "Review your brief" },
];

const PROJECT_TYPES = [
  "YouTube Video", "Social Media Reel", "Product Demo", "Corporate Video",
  "Music Video", "Documentary", "Wedding Film", "Podcast Video",
  "Course / Tutorial", "Testimonial", "Explainer / Motion Graphics", "Other",
];

const VIDEO_STYLES = [
  "Cinematic", "Vlog Style", "Documentary", "Animated / Motion Graphics",
  "Minimalist", "Fast-paced / Dynamic", "Retro / Vintage", "Corporate / Clean",
];

const TONES = [
  "Professional", "Casual / Friendly", "Energetic", "Emotional / Inspiring",
  "Humorous", "Dramatic", "Luxurious", "Educational",
];

const PACINGS = ["Slow & Deliberate", "Moderate / Balanced", "Fast-paced / High-energy", "Mixed / Variable"];

const COLOR_GRADINGS = [
  "Natural / Neutral", "Warm / Golden", "Cool / Blue", "High Contrast",
  "Desaturated / Muted", "Vibrant / Saturated", "Cinematic Teal & Orange", "Black & White",
];

const ASPECT_RATIOS = [
  { label: "16:9 (YouTube / HD)", value: "16:9", icon: Monitor },
  { label: "9:16 (Reels / TikTok)", value: "9:16", icon: Smartphone },
  { label: "1:1 (Instagram)", value: "1:1", icon: Square },
  { label: "4:5 (Instagram Post)", value: "4:5", icon: Square },
  { label: "21:9 (Cinematic)", value: "21:9", icon: Film },
];

const FILE_FORMATS = ["MP4 (H.264)", "MP4 (H.265)", "MOV (ProRes)", "MOV (DNxHD)", "AVI", "WebM", "GIF"];

const DURATIONS = [
  "Under 30 seconds", "30-60 seconds", "1-3 minutes", "3-5 minutes",
  "5-10 minutes", "10-20 minutes", "20+ minutes", "TBD / Flexible",
];

const BUDGETS = [
  "Under ₹5,000", "₹5,000 - ₹15,000", "₹15,000 - ₹30,000", "₹30,000 - ₹50,000",
  "₹50,000 - ₹1,00,000", "₹1,00,000+", "Flexible / Discuss",
];

const EMPTY_BRIEF = {
  title: "", projectType: "", description: "", targetAudience: "", purpose: "",
  duration: "", deadline: "", budget: "",
  videoStyle: "", tone: "", pacing: "", musicPreference: "", colorGrading: "", styleNotes: "",
  referenceVideos: [],
  brandName: "", brandColors: [], brandFonts: "", logoUrl: "", brandVoice: "",
  dosAndDonts: { dos: [""], donts: [""] },
  deliverables: [{ type: "", description: "", quantity: 1 }],
  aspectRatios: [], fileFormats: [], additionalNotes: "",
  moodBoardUrls: [],
};

export default function BriefWizard() {
  const { briefId } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState({ ...EMPTY_BRIEF });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(briefId ? parseInt(briefId, 10) : null);

  const update = useCallback((field, value) => {
    setBrief((prev) => ({ ...prev, [field]: value }));
  }, []);

  const progress = useMemo(() => {
    let filled = 0;
    let total = 10;
    if (brief.title) filled++;
    if (brief.projectType) filled++;
    if (brief.description) filled++;
    if (brief.videoStyle) filled++;
    if (brief.tone) filled++;
    if (brief.referenceVideos?.length) filled++;
    if (brief.brandName) filled++;
    if (brief.deliverables?.some((d) => d.type)) filled++;
    if (brief.aspectRatios?.length) filled++;
    if (brief.additionalNotes || brief.deadline) filled++;
    return Math.round((filled / total) * 100);
  }, [brief]);

  const saveDraft = async () => {
    if (!brief.title.trim()) {
      toast.error("Please add a project title first");
      return;
    }
    setSaving(true);
    try {
      if (savedId) {
        await axiosInstance.put(`/briefs/${savedId}`, { ...brief, status: "DRAFT" });
        toast.success("Draft saved");
      } else {
        const res = await axiosInstance.post("/briefs", { ...brief, status: "DRAFT" });
        const id = res.data?.data?.id;
        if (id) setSavedId(id);
        toast.success("Draft created");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const submitBrief = async () => {
    if (!brief.title.trim()) { toast.error("Title is required"); return; }
    if (!brief.projectType) { toast.error("Select a project type"); setStep(0); return; }
    setSaving(true);
    try {
      if (savedId) {
        await axiosInstance.put(`/briefs/${savedId}`, { ...brief, status: "SUBMITTED" });
      } else {
        await axiosInstance.post("/briefs", { ...brief, status: "SUBMITTED" });
      }
      toast.success("Brief submitted successfully!");
      navigate("/client-dashboard");
    } catch {
      toast.error("Failed to submit brief");
    } finally {
      setSaving(false);
    }
  };

  const canGoNext = step < STEPS.length - 1;
  const canGoPrev = step > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            <Sparkles className="h-4 w-4" />
            Brief Builder
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Create Your Video Brief
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Help your editor deliver exactly what you envision
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              animate={{ width: `${Math.max(5, ((step + 1) / STEPS.length) * 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Step navigation */}
        <div className="mb-8 hidden gap-1 md:flex">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                className={`group flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : isDone
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? "bg-white/20" : isDone ? "bg-emerald-500/20" : "bg-slate-100 dark:bg-slate-700"
                }`}>
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs font-semibold ${isActive ? "text-white" : ""}`}>{s.title}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {React.createElement(STEPS[step].icon, { className: "h-5 w-5 text-indigo-500" })}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{STEPS[step].title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{STEPS[step].desc}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {step === 0 && <StepOverview brief={brief} update={update} />}
                {step === 1 && <StepStyle brief={brief} update={update} />}
                {step === 2 && <StepReferences brief={brief} update={update} />}
                {step === 3 && <StepBrand brief={brief} update={update} />}
                {step === 4 && <StepDeliverables brief={brief} update={update} />}
                {step === 5 && <StepReview brief={brief} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer navigation */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={!canGoPrev}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={saveDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Draft"}
              </button>

              {canGoNext ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-indigo-700"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={submitBrief}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {saving ? "Submitting…" : "Submit Brief"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== STEP 0: PROJECT OVERVIEW ========== */
function StepOverview({ brief, update }) {
  return (
    <div className="space-y-6">
      <Field label="Project Title *" icon={<FileText className="h-4 w-4" />}>
        <input
          type="text" value={brief.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g. Product Launch Video for Summer Campaign"
          className={INPUT_CLS}
        />
      </Field>

      <Field label="Project Type" icon={<Film className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {PROJECT_TYPES.map((t) => (
            <ChipButton key={t} selected={brief.projectType === t} onClick={() => update("projectType", t)}>
              {t}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Project Description" icon={<FileText className="h-4 w-4" />}>
        <textarea value={brief.description} onChange={(e) => update("description", e.target.value)}
          placeholder="Describe your project in detail — what's the story, the message, the vision?"
          rows={4} className={`${INPUT_CLS} resize-none`} />
      </Field>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Target Audience" icon={<Users className="h-4 w-4" />}>
          <textarea value={brief.targetAudience} onChange={(e) => update("targetAudience", e.target.value)}
            placeholder="Who is this video for? Age, interests, demographics…"
            rows={3} className={`${INPUT_CLS} resize-none`} />
        </Field>
        <Field label="Purpose / Goal" icon={<Target className="h-4 w-4" />}>
          <textarea value={brief.purpose} onChange={(e) => update("purpose", e.target.value)}
            placeholder="What should viewers do after watching? Convert, subscribe, learn…"
            rows={3} className={`${INPUT_CLS} resize-none`} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Field label="Estimated Duration" icon={<Clock className="h-4 w-4" />}>
          <select value={brief.duration} onChange={(e) => update("duration", e.target.value)} className={INPUT_CLS}>
            <option value="">Select duration</option>
            {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Deadline" icon={<Clock className="h-4 w-4" />}>
          <input type="date" value={brief.deadline} onChange={(e) => update("deadline", e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label="Budget Range" icon={<DollarSign className="h-4 w-4" />}>
          <select value={brief.budget} onChange={(e) => update("budget", e.target.value)} className={INPUT_CLS}>
            <option value="">Select budget</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
      </div>
    </div>
  );
}

/* ========== STEP 1: STYLE & TONE ========== */
function StepStyle({ brief, update }) {
  return (
    <div className="space-y-6">
      <Field label="Video Style">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VIDEO_STYLES.map((s) => (
            <ChipButton key={s} selected={brief.videoStyle === s} onClick={() => update("videoStyle", s)}>
              {s}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Tone & Mood">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TONES.map((t) => (
            <ChipButton key={t} selected={brief.tone === t} onClick={() => update("tone", t)}>
              {t}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Pacing">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PACINGS.map((p) => (
            <ChipButton key={p} selected={brief.pacing === p} onClick={() => update("pacing", p)}>
              {p}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Color Grading Preference">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COLOR_GRADINGS.map((c) => (
            <ChipButton key={c} selected={brief.colorGrading === c} onClick={() => update("colorGrading", c)}>
              {c}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Music / Sound Preference" icon={<Music className="h-4 w-4" />}>
        <textarea value={brief.musicPreference} onChange={(e) => update("musicPreference", e.target.value)}
          placeholder="Describe the vibe — upbeat, lo-fi, orchestral, no music, specific track references…"
          rows={3} className={`${INPUT_CLS} resize-none`} />
      </Field>

      <Field label="Additional Style Notes">
        <textarea value={brief.styleNotes} onChange={(e) => update("styleNotes", e.target.value)}
          placeholder="Anything else about the look and feel — transitions, effects, specific techniques…"
          rows={3} className={`${INPUT_CLS} resize-none`} />
      </Field>
    </div>
  );
}

/* ========== STEP 2: REFERENCES ========== */
function StepReferences({ brief, update }) {
  const refs = brief.referenceVideos || [];

  const addRef = () => {
    update("referenceVideos", [...refs, { url: "", title: "", notes: "", timestamp: "" }]);
  };
  const removeRef = (i) => update("referenceVideos", refs.filter((_, idx) => idx !== i));
  const updateRef = (i, field, value) => {
    const copy = [...refs];
    copy[i] = { ...copy[i], [field]: value };
    update("referenceVideos", copy);
  };

  const moodUrls = brief.moodBoardUrls || [];
  const addMoodUrl = () => update("moodBoardUrls", [...moodUrls, ""]);
  const removeMoodUrl = (i) => update("moodBoardUrls", moodUrls.filter((_, idx) => idx !== i));
  const updateMoodUrl = (i, val) => {
    const copy = [...moodUrls];
    copy[i] = val;
    update("moodBoardUrls", copy);
  };

  return (
    <div className="space-y-8">
      {/* Reference videos */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reference Videos</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add YouTube/Vimeo links of videos whose style you like</p>
          </div>
          <button onClick={addRef} disabled={refs.length >= 10}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40 dark:bg-indigo-900/30 dark:text-indigo-300">
            <Plus className="h-3.5 w-3.5" /> Add Reference
          </button>
        </div>

        {refs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
            <Video className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">No reference videos added yet</p>
            <button onClick={addRef} className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Add your first reference
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {refs.map((ref, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="mb-3 flex items-start justify-between">
                  <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <Video className="h-3 w-3" /> Reference {i + 1}
                  </span>
                  <button onClick={() => removeRef(i)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Video URL</label>
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                      <input type="url" value={ref.url} onChange={(e) => updateRef(i, "url", e.target.value)}
                        placeholder="https://youtube.com/watch?v=..." className={`${INPUT_CLS} text-sm`} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Title / Label</label>
                    <input type="text" value={ref.title} onChange={(e) => updateRef(i, "title", e.target.value)}
                      placeholder="e.g. Apple product video style" className={`${INPUT_CLS} text-sm`} />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">What do you like about it?</label>
                    <textarea value={ref.notes} onChange={(e) => updateRef(i, "notes", e.target.value)}
                      placeholder="e.g. Love the color grading, transitions, pacing of the first 30 seconds…"
                      rows={2} className={`${INPUT_CLS} resize-none text-sm`} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Key Timestamp</label>
                    <input type="text" value={ref.timestamp} onChange={(e) => updateRef(i, "timestamp", e.target.value)}
                      placeholder="e.g. 0:30 - 1:15" className={`${INPUT_CLS} text-sm`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mood Board */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Mood Board</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add image URLs that capture the aesthetic you want</p>
          </div>
          <button onClick={addMoodUrl} disabled={moodUrls.length >= 20}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 disabled:opacity-40 dark:bg-violet-900/30 dark:text-violet-300">
            <Plus className="h-3.5 w-3.5" /> Add Image
          </button>
        </div>

        {moodUrls.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
            <Image className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">No mood board images yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {moodUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <Image className="h-4 w-4 shrink-0 text-slate-400" />
                <input type="url" value={url} onChange={(e) => updateMoodUrl(i, e.target.value)}
                  placeholder="https://example.com/image.jpg" className={`${INPUT_CLS} flex-1 text-sm`} />
                <button onClick={() => removeMoodUrl(i)} className="text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== STEP 3: BRAND GUIDELINES ========== */
function StepBrand({ brief, update }) {
  const colors = brief.brandColors || [];
  const dosAndDonts = brief.dosAndDonts || { dos: [""], donts: [""] };

  const addColor = () => update("brandColors", [...colors, "#6366f1"]);
  const removeColor = (i) => update("brandColors", colors.filter((_, idx) => idx !== i));
  const updateColor = (i, val) => { const c = [...colors]; c[i] = val; update("brandColors", c); };

  const updateDD = (type, i, val) => {
    const copy = { ...dosAndDonts };
    copy[type] = [...copy[type]];
    copy[type][i] = val;
    update("dosAndDonts", copy);
  };
  const addDD = (type) => {
    const copy = { ...dosAndDonts };
    copy[type] = [...copy[type], ""];
    update("dosAndDonts", copy);
  };
  const removeDD = (type, i) => {
    const copy = { ...dosAndDonts };
    copy[type] = copy[type].filter((_, idx) => idx !== i);
    update("dosAndDonts", copy);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Brand Name" icon={<Shield className="h-4 w-4" />}>
          <input type="text" value={brief.brandName} onChange={(e) => update("brandName", e.target.value)}
            placeholder="Your company / brand name" className={INPUT_CLS} />
        </Field>
        <Field label="Logo URL" icon={<Image className="h-4 w-4" />}>
          <input type="url" value={brief.logoUrl} onChange={(e) => update("logoUrl", e.target.value)}
            placeholder="https://yourbrand.com/logo.png" className={INPUT_CLS} />
        </Field>
      </div>

      <Field label="Brand Colors">
        <div className="flex flex-wrap items-center gap-3">
          {colors.map((c, i) => (
            <div key={i} className="group relative">
              <input type="color" value={c} onChange={(e) => updateColor(i, e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-xl border-2 border-white shadow-md dark:border-slate-700" />
              <button onClick={() => removeColor(i)}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100">
                <X className="h-2.5 w-2.5" />
              </button>
              <span className="mt-1 block text-center text-[9px] font-mono text-slate-400">{c}</span>
            </div>
          ))}
          <button onClick={addColor} disabled={colors.length >= 10}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40 dark:border-slate-600">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Field>

      <Field label="Brand Fonts" icon={<Type className="h-4 w-4" />}>
        <input type="text" value={brief.brandFonts} onChange={(e) => update("brandFonts", e.target.value)}
          placeholder="e.g. Montserrat for headings, Open Sans for body text" className={INPUT_CLS} />
      </Field>

      <Field label="Brand Voice / Personality">
        <textarea value={brief.brandVoice} onChange={(e) => update("brandVoice", e.target.value)}
          placeholder="How does your brand speak? Formal, witty, bold, approachable…"
          rows={3} className={`${INPUT_CLS} resize-none`} />
      </Field>

      {/* Do's and Don'ts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Do's
            </h4>
            <button onClick={() => addDD("dos")} className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">+ Add</button>
          </div>
          <div className="space-y-2">
            {dosAndDonts.dos.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={d} onChange={(e) => updateDD("dos", i, e.target.value)}
                  placeholder="e.g. Use brand logo in intro" className={`${INPUT_CLS} flex-1 text-sm`} />
                {dosAndDonts.dos.length > 1 && (
                  <button onClick={() => removeDD("dos", i)} className="text-slate-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-900/10">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
              <X className="h-4 w-4" /> Don'ts
            </h4>
            <button onClick={() => addDD("donts")} className="text-xs text-red-600 hover:underline dark:text-red-400">+ Add</button>
          </div>
          <div className="space-y-2">
            {dosAndDonts.donts.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={d} onChange={(e) => updateDD("donts", i, e.target.value)}
                  placeholder="e.g. Don't use stock footage" className={`${INPUT_CLS} flex-1 text-sm`} />
                {dosAndDonts.donts.length > 1 && (
                  <button onClick={() => removeDD("donts", i)} className="text-slate-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== STEP 4: DELIVERABLES ========== */
function StepDeliverables({ brief, update }) {
  const items = brief.deliverables || [];
  const ratios = brief.aspectRatios || [];
  const formats = brief.fileFormats || [];

  const addItem = () => update("deliverables", [...items, { type: "", description: "", quantity: 1 }]);
  const removeItem = (i) => update("deliverables", items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const c = [...items]; c[i] = { ...c[i], [field]: val }; update("deliverables", c);
  };

  const toggleRatio = (r) => {
    update("aspectRatios", ratios.includes(r) ? ratios.filter((x) => x !== r) : [...ratios, r]);
  };
  const toggleFormat = (f) => {
    update("fileFormats", formats.includes(f) ? formats.filter((x) => x !== f) : [...formats, f]);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">What do you need delivered?</h3>
          <button onClick={addItem}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
            <Plus className="h-3.5 w-3.5" /> Add Deliverable
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Type</label>
                  <input type="text" value={item.type} onChange={(e) => updateItem(i, "type", e.target.value)}
                    placeholder="e.g. Final Cut, Teaser" className={`${INPUT_CLS} text-sm`} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Description</label>
                  <input type="text" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="e.g. 60s version for Instagram" className={`${INPUT_CLS} text-sm`} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500">Quantity</label>
                  <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                    className={`${INPUT_CLS} text-sm`} />
                </div>
              </div>
              <button onClick={() => removeItem(i)} className="mt-5 text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Field label="Aspect Ratios Needed">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ASPECT_RATIOS.map(({ label, value, icon: Icon }) => (
            <ChipButton key={value} selected={ratios.includes(value)} onClick={() => toggleRatio(value)}>
              <Icon className="mr-1.5 inline h-3.5 w-3.5" /> {value}
              <span className="block text-[10px] opacity-60">{label.split("(")[1]?.replace(")", "")}</span>
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="File Formats">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FILE_FORMATS.map((f) => (
            <ChipButton key={f} selected={formats.includes(f)} onClick={() => toggleFormat(f)}>
              {f}
            </ChipButton>
          ))}
        </div>
      </Field>

      <Field label="Additional Notes">
        <textarea value={brief.additionalNotes} onChange={(e) => update("additionalNotes", e.target.value)}
          placeholder="Any other requirements — subtitles, thumbnails, raw footage, revisions policy…"
          rows={4} className={`${INPUT_CLS} resize-none`} />
      </Field>
    </div>
  );
}

/* ========== STEP 5: REVIEW ========== */
function StepReview({ brief }) {
  const sections = [
    { title: "Project Overview", items: [
      ["Title", brief.title], ["Type", brief.projectType], ["Duration", brief.duration],
      ["Deadline", brief.deadline], ["Budget", brief.budget],
      ["Description", brief.description], ["Audience", brief.targetAudience], ["Purpose", brief.purpose],
    ]},
    { title: "Style & Tone", items: [
      ["Style", brief.videoStyle], ["Tone", brief.tone], ["Pacing", brief.pacing],
      ["Color Grading", brief.colorGrading], ["Music", brief.musicPreference], ["Notes", brief.styleNotes],
    ]},
    { title: "References", items: [
      ["Videos", brief.referenceVideos?.length ? `${brief.referenceVideos.length} reference(s)` : ""],
      ["Mood Board", brief.moodBoardUrls?.length ? `${brief.moodBoardUrls.length} image(s)` : ""],
    ]},
    { title: "Brand", items: [
      ["Brand", brief.brandName], ["Colors", brief.brandColors?.length ? `${brief.brandColors.length} color(s)` : ""],
      ["Fonts", brief.brandFonts], ["Voice", brief.brandVoice],
    ]},
    { title: "Deliverables", items: [
      ["Items", brief.deliverables?.filter((d) => d.type).length ? `${brief.deliverables.filter((d) => d.type).length} deliverable(s)` : ""],
      ["Ratios", brief.aspectRatios?.join(", ")], ["Formats", brief.fileFormats?.join(", ")],
      ["Notes", brief.additionalNotes],
    ]},
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-4 dark:from-indigo-900/20 dark:to-violet-900/20">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          <Eye className="h-4 w-4" /> Review your brief before submitting
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Make sure everything looks good. You can go back to any step to make changes.
        </p>
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{sec.title}</h4>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sec.items.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex px-4 py-2.5">
                <span className="w-28 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
                <span className="text-sm text-slate-900 dark:text-slate-200">{value}</span>
              </div>
            ))}
            {sec.items.filter(([, v]) => v).length === 0 && (
              <div className="px-4 py-3 text-xs italic text-slate-400">Not filled in yet</div>
            )}
          </div>
        </div>
      ))}

      {/* Brand colors preview */}
      {brief.brandColors?.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Brand Colors:</span>
          {brief.brandColors.map((c, i) => (
            <div key={i} className="h-6 w-6 rounded-full border border-white shadow" style={{ backgroundColor: c }} title={c} />
          ))}
        </div>
      )}

      {/* Reference videos */}
      {brief.referenceVideos?.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Reference Videos:</span>
          {brief.referenceVideos.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
              <Video className="h-4 w-4 text-indigo-500" />
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                {r.title || r.url || "Video"}
              </a>
              {r.notes && <span className="text-xs text-slate-500">— {r.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== SHARED UI COMPONENTS ========== */
function Field({ label, icon, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";

function ChipButton({ children, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all ${
        selected
          ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/30 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600"
      }`}
    >
      {selected && <Check className="mr-1 inline h-3 w-3" />}
      {children}
    </button>
  );
}
