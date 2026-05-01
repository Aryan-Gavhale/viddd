import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Play, Film, Sparkles, Eye, User, Loader2 } from "lucide-react"
import axiosInstance from "../utils/axios"
import { toast } from "react-toastify"
import VideoPlayerModal from "./Portfolio/VideoPlayerModal"

const CATEGORY_ALL = "All"
const CATEGORIES = [
  CATEGORY_ALL,
  "Advertising",
  "YouTube",
  "Corporate",
  "Gaming",
  "Music",
  "Family",
]

function ThumbnailFrame({ videoUrl, title }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {videoUrl ? (
        <video
          className="h-full w-full object-cover"
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          title={title}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-500">
          <Film className="h-10 w-10 opacity-50" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
    </div>
  )
}

function VideoCard({ item, onOpen, index }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: "spring", stiffness: 300, damping: 28 }}
      className="group relative cursor-pointer"
      onClick={() => onOpen(item.id)}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-md transition-shadow duration-300 group-hover:border-purple-300 group-hover:shadow-xl">
        <div className="relative aspect-[4/3] overflow-hidden">
          <ThumbnailFrame videoUrl={item.videoUrl} title={item.title} />
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35"
            initial={false}
          >
            <motion.div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white shadow-lg ring-2 ring-white/40"
              initial={{ scale: 0.5, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              <Play className="h-7 w-7 translate-x-0.5" fill="currentColor" />
            </motion.div>
          </motion.div>
        </div>
        <div className="p-4">
          {item.category && (
            <span className="mb-1 inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
              {item.category}
            </span>
          )}
          <h3 className="line-clamp-2 text-lg font-bold text-slate-900">{item.title || "Untitled"}</h3>
          {item.freelancer && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {item.freelancer.profilePicture ? (
                  <img
                    src={item.freelancer.profilePicture}
                    alt={item.freelancer.name || "Freelancer profile"}
                    loading="lazy"
                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-2 ring-purple-100"
                  />
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <p className="truncate text-sm font-medium text-slate-700">{item.freelancer.name}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1 text-xs text-slate-500">
                <Eye className="h-3.5 w-3.5" />
                {item.views != null ? Number(item.views).toLocaleString() : "0"}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export default function Portfolio() {
  const [rawVideos, setRawVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(CATEGORY_ALL)
  const [modalId, setModalId] = useState(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const { data: body } = await axiosInstance.get("/portfolios/featured")
        const vids = body?.data?.videos ?? body?.data ?? []
        if (!cancelled) setRawVideos(Array.isArray(vids) ? vids : [])
      } catch (e) {
        if (!cancelled) {
          console.error(e)
          toast.error(e.response?.data?.message || "Failed to load featured portfolio")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (filter === CATEGORY_ALL) return rawVideos
    return rawVideos.filter((v) => (v.category || "").toLowerCase() === filter.toLowerCase())
  }, [rawVideos, filter])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-purple-600">Showcase</p>
              <h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
                <Sparkles className="h-8 w-8 text-purple-600" />
                Video Portfolio
              </h1>
              <p className="mt-2 max-w-xl text-slate-600">Discover work from the Vidlancing community — most watched reels first.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filter === c
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                    : "bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center text-slate-500">
            <Film className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium">No videos in this category yet.</p>
            <p className="text-sm">Try another filter or check back later.</p>
          </div>
        )}

        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {!loading &&
                filtered.map((v, i) => (
                  <VideoCard key={v.id} item={v} index={i} onOpen={setModalId} />
                ))}
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
      </main>

      <VideoPlayerModal open={modalId != null} videoId={modalId} onClose={() => setModalId(null)} />
    </div>
  )
}
