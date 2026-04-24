import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  ShoppingBag, Search, Star, Download, Play, Tag, Code2,
  Filter, ChevronDown, Loader2, Heart, X, Plus, DollarSign,
  Package, Eye, Upload, ArrowUpRight, CheckCircle2,
} from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

const CATEGORIES = ["All", "Lower Thirds", "Transitions", "Intros/Outros", "Title Cards", "Social Media", "Color LUTs", "Sound Effects", "Motion Backgrounds", "Overlays", "Presets"];
const SOFTWARE_OPTIONS = ["After Effects", "Premiere Pro", "DaVinci Resolve", "Final Cut Pro", "Blender", "Cinema 4D"];

export default function TemplateMarketplace() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [tab, setTab] = useState("browse");
  const [myTemplates, setMyTemplates] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchasing, setPurchasing] = useState(null);

  const [form, setForm] = useState({
    title: "", description: "", category: "Lower Thirds", software: "After Effects",
    price: 0, tags: "", previewVideoUrl: "", previewImageUrl: "", fileUrl: "", fileSize: "", version: "1.0", compatibility: "",
  });
  const [uploading, setUploading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (category !== "All") params.append("category", category);
      if (search) params.append("search", search);
      params.append("sort", sort === "popular" ? "popular" : sort === "price_low" ? "price_asc" : sort === "price_high" ? "price_desc" : "newest");
      const { data } = await axiosInstance.get(`/templates/browse?${params}`);
      setTemplates(data.data || []);
    } catch { toast.error("Failed to load templates"); }
    finally { setLoading(false); }
  }, [category, search, sort]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const fetchMy = useCallback(async () => {
    const [m, p] = await Promise.allSettled([
      axiosInstance.get("/templates/my"),
      axiosInstance.get("/templates/purchases"),
    ]);
    if (m.status === "fulfilled") setMyTemplates(m.value.data.data || []);
    if (p.status === "fulfilled") setPurchases(p.value.data.data || []);
  }, []);

  useEffect(() => { if (tab !== "browse") fetchMy(); }, [tab, fetchMy]);

  const viewDetail = async (id) => {
    try {
      const { data } = await axiosInstance.get(`/templates/${id}`);
      setDetailTemplate(data.data);
    } catch { toast.error("Failed to load details"); }
  };

  const handlePurchase = async (id) => {
    setPurchasing(id);
    try {
      await axiosInstance.post(`/templates/${id}/purchase`);
      toast.success("Template purchased! Check your downloads.");
      if (detailTemplate?.id === id) setDetailTemplate((d) => ({ ...d, purchased: true }));
      fetchMy();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Purchase failed");
    } finally {
      setPurchasing(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await axiosInstance.post("/templates", {
        ...form,
        price: parseInt(form.price, 10) || 0,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      toast.success("Template published!");
      setShowUpload(false);
      setForm({ title: "", description: "", category: "Lower Thirds", software: "After Effects", price: 0, tags: "", previewVideoUrl: "", previewImageUrl: "", fileUrl: "", fileSize: "", version: "1.0", compatibility: "" });
      fetchTemplates();
      fetchMy();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Template Marketplace</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Buy and sell After Effects, Premiere & DaVinci templates</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl">
          <Upload className="h-4 w-4" /> Sell Template
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {[{ key: "browse", label: "Browse" }, { key: "mine", label: "My Templates" }, { key: "purchased", label: "Purchased" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === t.key ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
          >{t.label}</button>
        ))}
      </div>

      {tab === "browse" && (
        <>
          {/* Search & filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input className={INPUT + " pl-10"} placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className={INPUT + " sm:w-40 appearance-none"} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low → High</option>
              <option value="price_high">Price: High → Low</option>
            </select>
          </div>

          {/* Category pills */}
          <div className="mb-6 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${category === c ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}>
                {c}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center py-20">
              <Package className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No templates found</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  onClick={() => viewDetail(t.id)}>
                  <div className="relative aspect-video bg-slate-900">
                    {t.previewImageUrl ? (
                      <img src={t.previewImageUrl} alt={t.title || "Template preview"} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-slate-600" /></div>
                    )}
                    {t.previewVideoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                        <Play className="h-10 w-10 text-white opacity-0 transition group-hover:opacity-100" />
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{t.software}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="mb-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{t.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{t.category}</span>
                        {t.rating > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400" /> {t.rating}</span>}
                        <span>{t.salesCount} sales</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {t.price === 0 ? "Free" : `$${t.price}`}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">by {t.sellerFirst} {t.sellerLast}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "mine" && (
        <div className="space-y-3">
          {myTemplates.length === 0 ? (
            <div className="flex flex-col items-center py-20">
              <Upload className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">You haven't uploaded any templates yet</p>
            </div>
          ) : myTemplates.map((t) => (
            <div key={t.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                {t.previewImageUrl ? <img src={t.previewImageUrl} alt={t.title || "Template preview"} loading="lazy" className="h-full w-full object-cover" /> : <Package className="mx-auto mt-3 h-6 w-6 text-slate-600" />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</h4>
                <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>${t.price}</span><span>{t.salesCount} sales</span><span>{t.category}</span>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700"}`}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "purchased" && (
        <div className="space-y-3">
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center py-20">
              <ShoppingBag className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No purchases yet</p>
            </div>
          ) : purchases.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                {p.previewImageUrl ? <img src={p.previewImageUrl} alt={p.title || "Template preview"} loading="lazy" className="h-full w-full object-cover" /> : <Package className="mx-auto mt-3 h-6 w-6 text-slate-600" />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{p.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">by {p.sellerFirst} {p.sellerLast} · {p.category}</p>
              </div>
              {p.downloadUrl && (
                <a href={p.downloadUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300">
                  <Download className="h-3 w-3" /> Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailTemplate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setDetailTemplate(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800" style={{ maxHeight: "90vh" }}>
              {detailTemplate.previewVideoUrl ? (
                <video src={detailTemplate.previewVideoUrl} controls className="aspect-video w-full bg-black" />
              ) : detailTemplate.previewImageUrl ? (
                <img src={detailTemplate.previewImageUrl} alt={detailTemplate.title || "Template preview"} loading="lazy" className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-slate-900"><Package className="h-16 w-16 text-slate-600" /></div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{detailTemplate.title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {detailTemplate.software} · {detailTemplate.category}
                      {detailTemplate.sellerFirst && ` · by ${detailTemplate.sellerFirst} ${detailTemplate.sellerLast}`}
                    </p>
                  </div>
                  <button onClick={() => setDetailTemplate(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
                {detailTemplate.description && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{detailTemplate.description}</p>}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {detailTemplate.tags?.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-400">{tag}</span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Sales</p><p className="text-lg font-bold text-slate-900 dark:text-white">{detailTemplate.salesCount}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Rating</p>
                    <p className="flex items-center gap-1 text-lg font-bold text-slate-900 dark:text-white">
                      <Star className="h-4 w-4 text-amber-400" /> {detailTemplate.rating || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500">Version</p><p className="text-lg font-bold text-slate-900 dark:text-white">{detailTemplate.version}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {detailTemplate.price === 0 ? "Free" : `$${detailTemplate.price}`}
                  </span>
                  {detailTemplate.purchased ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Purchased
                    </span>
                  ) : (
                    <button onClick={() => handlePurchase(detailTemplate.id)} disabled={purchasing === detailTemplate.id}
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-60">
                      {purchasing === detailTemplate.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : <><ShoppingBag className="mr-1.5 inline h-4 w-4" /> Buy Now</>}
                    </button>
                  )}
                </div>

                {/* Reviews */}
                {detailTemplate.reviews?.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Reviews ({detailTemplate.reviews.length})</h4>
                    <div className="space-y-3">
                      {detailTemplate.reviews.map((r) => (
                        <div key={r.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{r.firstName} {r.lastName}</span>
                            <span className="flex items-center gap-0.5 text-xs text-amber-500">
                              {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                            </span>
                          </div>
                          {r.comment && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowUpload(false)}>
            <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} onSubmit={handleUpload}
              className="w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800" style={{ maxHeight: "90vh" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sell a Template</h2>
                <button type="button" onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <input className={INPUT} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Template title" />
                <textarea className={INPUT + " min-h-[70px] resize-y"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  <select className={INPUT + " appearance-none"} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select className={INPUT + " appearance-none"} value={form.software} onChange={(e) => setForm({ ...form, software: e.target.value })}>
                    {SOFTWARE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" className={INPUT} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min={0} placeholder="Price ($)" />
                  <input className={INPUT} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" />
                </div>
                <input className={INPUT} value={form.previewImageUrl} onChange={(e) => setForm({ ...form, previewImageUrl: e.target.value })} placeholder="Preview image URL" />
                <input className={INPUT} value={form.previewVideoUrl} onChange={(e) => setForm({ ...form, previewVideoUrl: e.target.value })} placeholder="Preview video URL" />
                <input className={INPUT} value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="Template file URL (S3 / download link)" />
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowUpload(false)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={uploading}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60">
                  {uploading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Publish"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
