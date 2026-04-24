import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Film, Plus, Trash2, Eye, EyeOff, GripVertical, Loader2, Globe,
  Lock, Play, Clock, Save, Sparkles, ExternalLink, X,
} from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

export default function ReelBuilder() {
  const [reels, setReels] = useState([]);
  const [activeReel, setActiveReel] = useState(null);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewClip, setPreviewClip] = useState(null);

  const fetchReels = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/demo-reels/my");
      setReels(data.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  const generateReel = async () => {
    setGenerating(true);
    try {
      const { data } = await axiosInstance.post("/demo-reels/generate", { title: "My Demo Reel" });
      const reel = data.data.reel;
      const parsed = typeof reel.clips === "string" ? JSON.parse(reel.clips) : reel.clips;
      setActiveReel(reel);
      setClips(parsed || []);
      toast.success("Reel auto-generated from your portfolio!");
      fetchReels();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const openReel = (reel) => {
    const parsed = typeof reel.clips === "string" ? JSON.parse(reel.clips) : reel.clips;
    setActiveReel(reel);
    setClips(parsed || []);
  };

  const toggleClip = (idx) => {
    setClips((prev) => prev.map((c, i) => i === idx ? { ...c, included: !c.included } : c));
  };

  const removeClip = (idx) => {
    setClips((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveReel = async () => {
    if (!activeReel) return;
    setSaving(true);
    try {
      const reordered = clips.map((c, i) => ({ ...c, order: i }));
      await axiosInstance.put(`/demo-reels/${activeReel.id}`, { clips: reordered });
      toast.success("Reel saved!");
      fetchReels();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const togglePublic = async () => {
    if (!activeReel) return;
    try {
      const { data } = await axiosInstance.put(`/demo-reels/${activeReel.id}`, {
        isPublic: !activeReel.isPublic, status: !activeReel.isPublic ? "PUBLISHED" : "DRAFT",
      });
      setActiveReel(data.data);
      toast.success(data.data.isPublic ? "Reel is now public" : "Reel set to private");
      fetchReels();
    } catch (err) {
      toast.error("Toggle failed");
    }
  };

  const deleteReel = async (id) => {
    try {
      await axiosInstance.delete(`/demo-reels/${id}`);
      toast.success("Reel deleted");
      if (activeReel?.id === id) { setActiveReel(null); setClips([]); }
      fetchReels();
    } catch { toast.error("Delete failed"); }
  };

  const includedClips = clips.filter((c) => c.included);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Demo Reels</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Auto-compile your best work into a stunning demo reel</p>
        </div>
        <button onClick={generateReel} disabled={generating}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl disabled:opacity-60">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating..." : "Auto-Generate Reel"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Reel list */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Your Reels ({reels.length})</h3>
          {reels.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
              <Film className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No reels yet</p>
            </div>
          ) : reels.map((r) => (
            <motion.button key={r.id} onClick={() => openReel(r)}
              whileHover={{ x: 4 }}
              className={`w-full rounded-xl border p-4 text-left transition ${activeReel?.id === r.id ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{r.title}</h4>
                <div className="flex items-center gap-1.5">
                  {r.isPublic ? <Globe className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-slate-400" />}
                  <button onClick={(e) => { e.stopPropagation(); deleteReel(r.id); }}
                    className="rounded p-0.5 text-slate-400 transition hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-1 flex gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{r.viewCount || 0} views</span>
                <span>{r.status}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {!activeReel ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-24 dark:border-slate-700">
              <Film className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Select or generate a reel</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <input className={INPUT + " max-w-xs"} value={activeReel.title}
                  onChange={(e) => setActiveReel((r) => ({ ...r, title: e.target.value }))} />
                <div className="flex items-center gap-2">
                  <button onClick={togglePublic}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeReel.isPublic ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                    {activeReel.isPublic ? <><Globe className="h-3 w-3" /> Public</> : <><Lock className="h-3 w-3" /> Private</>}
                  </button>
                  <button onClick={saveReel} disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </button>
                </div>
              </div>

              {/* Summary bar */}
              <div className="flex items-center gap-4 rounded-xl bg-indigo-50 p-3 dark:bg-indigo-900/20">
                <span className="flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  <Film className="h-3.5 w-3.5" /> {includedClips.length} clips included
                </span>
                <span className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                  <Clock className="h-3.5 w-3.5" /> {clips.length} total available
                </span>
              </div>

              {/* Clip list — reorderable */}
              <div className="space-y-2">
                {clips.map((clip, idx) => (
                  <motion.div key={`${clip.sourceId}-${idx}`}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`group flex items-center gap-3 rounded-xl border p-3 transition ${clip.included ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" : "border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900"}`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 dark:text-slate-600" />

                    {/* Thumbnail placeholder */}
                    <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900">
                      {clip.videoUrl ? (
                        <video src={clip.videoUrl} className="h-full w-full object-cover" muted preload="metadata" />
                      ) : (
                        <Film className="h-5 w-5 text-slate-600" />
                      )}
                      <button onClick={() => setPreviewClip(clip)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/40">
                        <Play className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{clip.title || `Clip ${idx + 1}`}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{clip.description || clip.type}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleClip(idx)} title={clip.included ? "Exclude" : "Include"}
                        className={`rounded-lg p-1.5 transition ${clip.included ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                        {clip.included ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button onClick={() => removeClip(idx)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {clips.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No clips — upload portfolio videos first</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewClip && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setPreviewClip(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-black shadow-2xl">
              <div className="flex items-center justify-between bg-slate-900 px-4 py-2">
                <span className="text-sm font-medium text-white">{previewClip.title}</span>
                <button onClick={() => setPreviewClip(null)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <video src={previewClip.videoUrl} controls autoPlay className="aspect-video w-full" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
