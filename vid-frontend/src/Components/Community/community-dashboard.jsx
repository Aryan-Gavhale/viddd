import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../api/axiosInstance";
import { toast } from "react-toastify";
import {
  MessageSquare, Video, Users, Trophy, Search, Plus, TrendingUp,
  Eye, Heart, BarChart3, Loader2, X, Send, ThumbsUp, Clock,
  Flame, Tag, ChevronRight,
} from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500";

function isSafeHttpUrl(url) {
  return typeof url === "string" && (url.startsWith("http:") || url.startsWith("https:"));
}

const POST_TYPES = [
  { id: "DISCUSSION", label: "Discussion", icon: MessageSquare, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { id: "SHOWCASE", label: "Showcase", icon: Video, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { id: "QUESTION", label: "Question", icon: BarChart3, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { id: "COLLAB", label: "Collab", icon: Users, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { id: "CHALLENGE", label: "Challenge", icon: Trophy, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
];

export default function CommunityDashboard() {
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewingPost, setViewingPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [form, setForm] = useState({ type: "DISCUSSION", title: "", content: "", tags: "", mediaUrl: "" });

  const fetchStats = useCallback(async () => {
    try { const { data } = await axiosInstance.get("/community/stats"); setStats(data.data); } catch {}
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const url = filter ? `/community/posts?type=${filter}` : "/community/posts";
      const { data } = await axiosInstance.get(url);
      setPosts(data.data?.posts || []);
    } catch { toast.error("Failed to load posts"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchStats(); fetchPosts(); }, [fetchStats, fetchPosts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axiosInstance.post("/community/posts", {
        ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      toast.success("Post created!");
      setShowCreate(false);
      setForm({ type: "DISCUSSION", title: "", content: "", tags: "", mediaUrl: "" });
      fetchPosts(); fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally { setCreating(false); }
  };

  const viewPost = async (id) => {
    try {
      const { data } = await axiosInstance.get(`/community/posts/${id}`);
      setViewingPost(data.data);
    } catch { toast.error("Failed to load post"); }
  };

  const toggleLike = async (id) => {
    try {
      const { data } = await axiosInstance.post(`/community/posts/${id}/like`);
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, likesCount: data.data.liked ? p.likesCount + 1 : p.likesCount - 1 } : p));
      if (viewingPost?.id === id) setViewingPost((p) => ({ ...p, likesCount: data.data.liked ? p.likesCount + 1 : p.likesCount - 1 }));
    } catch {}
  };

  const addComment = async () => {
    if (!viewingPost || !commentText.trim()) return;
    try {
      await axiosInstance.post(`/community/posts/${viewingPost.id}/comments`, { content: commentText });
      setCommentText("");
      viewPost(viewingPost.id);
    } catch { toast.error("Failed to comment"); }
  };

  const statCards = [
    { label: "Posts This Week", value: stats?.postsThisWeek || 0, icon: MessageSquare, gradient: "from-blue-500 to-indigo-500" },
    { label: "Total Showcases", value: stats?.totalShowcases || 0, icon: Video, gradient: "from-purple-500 to-pink-500" },
    { label: "Comments This Week", value: stats?.commentsThisWeek || 0, icon: TrendingUp, gradient: "from-emerald-500 to-teal-500" },
    { label: "Active Members", value: stats?.activeMembers || 0, icon: Users, gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Community</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Discuss, showcase, collaborate — all in one place</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:shadow-xl">
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} shadow-lg">
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Type filters */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        <button onClick={() => setFilter(null)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${!filter ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}>
          All
        </button>
        {POST_TYPES.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${filter === t.id ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}>
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-200 py-20 dark:border-slate-700">
          <MessageSquare className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-medium text-slate-500 dark:text-slate-400">No posts yet</p>
          <p className="mt-1 text-sm text-slate-400">Be the first to start a conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p, i) => {
            const pt = POST_TYPES.find((t) => t.id === p.type) || POST_TYPES[0];
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => viewPost(p.id)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-sm font-bold text-white">
                    {p.profilePicture ? <img src={p.profilePicture} alt="" className="h-full w-full object-cover" /> : (p.firstName || "?")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{p.firstName} {p.lastName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pt.color}`}>{pt.label}</span>
                      {p.isPinned && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">Pinned</span>}
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                    {p.content && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{p.content}</p>}
                    {p.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-400">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likesCount || 0}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {p.commentsCount || 0}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.viewsCount || 0}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Post</h2>
                <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {POST_TYPES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setForm({ ...form, type: t.id })}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${form.type === t.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                      <t.icon className="h-3 w-3" /> {t.label}
                    </button>
                  ))}
                </div>
                <input className={INPUT} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Post title" />
                <textarea className={INPUT + " min-h-[100px] resize-y"} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="What's on your mind?" rows={4} />
                <input className={INPUT} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma-separated)" />
                <input className={INPUT} value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} placeholder="Media URL (optional)" />
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60">
                  {creating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Publish"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {viewingPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm" onClick={() => setViewingPost(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800" style={{ maxHeight: "90vh" }}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-sm font-bold text-white">
                    {(viewingPost.firstName || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{viewingPost.firstName} {viewingPost.lastName}</p>
                    <p className="text-xs text-slate-500">{new Date(viewingPost.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button onClick={() => setViewingPost(null)} className="text-slate-400"><X className="h-5 w-5" /></button>
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{viewingPost.title}</h2>
              {viewingPost.content && <p className="mb-4 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{viewingPost.content}</p>}
              {viewingPost.mediaUrl && isSafeHttpUrl(viewingPost.mediaUrl) && (
                <div className="mb-4 overflow-hidden rounded-xl">
                  <video src={viewingPost.mediaUrl} controls className="w-full" />
                </div>
              )}
              <div className="mb-4 flex items-center gap-4">
                <button onClick={() => toggleLike(viewingPost.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-indigo-100 hover:text-indigo-700 dark:bg-slate-700 dark:text-slate-300">
                  <ThumbsUp className="h-3.5 w-3.5" /> {viewingPost.likesCount || 0}
                </button>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Eye className="h-3 w-3" /> {viewingPost.viewsCount || 0} views</span>
              </div>

              {/* Comments */}
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                  Comments ({viewingPost.comments?.length || 0})
                </h4>
                <div className="space-y-3">
                  {(viewingPost.comments || []).map((c) => (
                    <div key={c.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/40">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">{c.firstName} {c.lastName}</span>
                        <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.content}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input className={INPUT} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => e.key === "Enter" && addComment()} />
                  <button onClick={addComment} className="rounded-lg bg-indigo-600 px-3 py-2 text-white transition hover:bg-indigo-700">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
