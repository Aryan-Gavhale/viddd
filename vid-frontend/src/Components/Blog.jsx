import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axiosInstance from "../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Calendar, Clock, ArrowRight, Eye, Heart, Search,
  Loader2, Tag, BookOpen, Sparkles, ChevronRight,
} from "lucide-react";

const CATEGORIES = ["All", "Tutorials", "Industry Trends", "Technology", "Professional Tips", "Creative", "Business"];

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const url = category !== "All" ? `/blog?category=${encodeURIComponent(category)}` : "/blog";
      const { data } = await axiosInstance.get(url);
      setPosts(data.data || []);
    } catch { toast.error("Failed to load blog posts"); }
    finally { setLoading(false); }
  }, [category]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const viewPost = async (slug) => {
    setLoadingPost(true);
    try {
      const { data } = await axiosInstance.get(`/blog/${slug}`);
      setSelectedPost(data.data);
    } catch { toast.error("Failed to load post"); }
    finally { setLoadingPost(false); }
  };

  const featured = posts.find((p) => p.isFeatured);
  const regular = posts.filter((p) => !p.isFeatured);
  const filtered = search
    ? regular.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || (p.excerpt || "").toLowerCase().includes(search.toLowerCase()))
    : regular;

  if (selectedPost) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <button onClick={() => setSelectedPost(null)}
          className="mb-6 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">&larr; Back to Blog</button>
        {selectedPost.coverImageUrl && (
          <img src={selectedPost.coverImageUrl} alt={selectedPost.title || "Blog post"} loading="lazy" className="mb-8 aspect-video w-full rounded-2xl object-cover shadow-xl" />
        )}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{selectedPost.category}</span>
          <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> {selectedPost.readTimeMinutes} min read</span>
          <span className="flex items-center gap-1 text-xs text-slate-500"><Eye className="h-3 w-3" /> {selectedPost.viewCount} views</span>
          <span className="flex items-center gap-1 text-xs text-slate-500"><Calendar className="h-3 w-3" /> {selectedPost.publishedAt ? new Date(selectedPost.publishedAt).toLocaleDateString() : ""}</span>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">{selectedPost.title}</h1>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 text-sm font-bold text-white">
            {(selectedPost.authorFirst || "A")[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedPost.authorFirst} {selectedPost.authorLast}</p>
            <p className="text-xs text-slate-500">Author</p>
          </div>
        </div>
        <article className="prose prose-slate max-w-none dark:prose-invert">
          {selectedPost.content.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
        {selectedPost.tags?.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5">
            {selectedPost.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-400">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/25">
          <BookOpen className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Vidlancing Blog</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Tips, tutorials, and industry insights for video editors</p>
      </div>

      {/* Search + Categories */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..." />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${category === c ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => viewPost(featured.slug)}
              className="group mb-10 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="grid gap-0 md:grid-cols-2">
                <div className="relative aspect-video md:aspect-auto">
                  {featured.coverImageUrl ? (
                    <img src={featured.coverImageUrl} alt={featured.title || "Blog post"} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full min-h-[250px] items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500">
                      <Sparkles className="h-16 w-16 text-white/40" />
                    </div>
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg">Featured</span>
                </div>
                <div className="flex flex-col justify-center p-6 md:p-8">
                  <span className="mb-2 inline-block w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{featured.category}</span>
                  <h2 className="mb-2 text-2xl font-bold text-slate-900 transition group-hover:text-indigo-600 dark:text-white">{featured.title}</h2>
                  {featured.excerpt && <p className="mb-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{featured.excerpt}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString() : ""}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.readTimeMinutes} min</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {featured.viewCount}</span>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    Read article <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20">
              <BookOpen className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400">No articles found</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, i) => (
                <motion.article key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => viewPost(p.slug)}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="relative aspect-video">
                    {p.coverImageUrl ? (
                      <img src={p.coverImageUrl} alt={p.title || "Blog post"} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                        <BookOpen className="h-10 w-10 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-400">{p.category}</span>
                      <span className="text-[10px] text-slate-400">{p.readTimeMinutes} min read</span>
                    </div>
                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-slate-900 transition group-hover:text-indigo-600 dark:text-white">{p.title}</h3>
                    {p.excerpt && <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{p.excerpt}</p>}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{p.authorFirst} {p.authorLast}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.viewCount || 0}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
