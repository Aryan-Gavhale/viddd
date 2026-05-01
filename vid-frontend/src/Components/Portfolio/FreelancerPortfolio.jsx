import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, User, Eye, Film, Loader2, Sparkles, LayoutGrid } from "lucide-react"
import { toast } from "react-toastify"
import axiosInstance from "../../utils/axios"
import VideoPlayerModal from "./VideoPlayerModal"
import PropTypes from "prop-types"

function ThumbnailFrame({ videoUrl, title }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
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
        <div className="flex h-full w-full min-h-[140px] items-center justify-center text-slate-400">
          <Film className="h-8 w-8 opacity-40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
    </div>
  )
}

export default function FreelancerPortfolio({ freelancerId }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [modalId, setModalId] = useState(null)

  const limit = 12

  const loadPage = useCallback(
    async (p, append) => {
      if (freelancerId == null || Number.isNaN(Number(freelancerId))) return
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const { data: body } = await axiosInstance.get(`/portfolios/${freelancerId}`, {
          params: { page: p, limit },
        })
        const payload = body?.data
        const vids = payload?.videos ?? []
        const pag = payload?.pagination
        if (append) {
          setItems((prev) => [...prev, ...vids])
        } else {
          setItems(vids)
        }
        if (pag) {
          setTotalPages(pag.totalPages ?? 0)
          setTotal(pag.total ?? 0)
        }
        setPage(p)
      } catch (e) {
        console.error(e)
        toast.error(e.response?.data?.message || "Failed to load portfolio")
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [freelancerId]
  )

  useEffect(() => {
    if (freelancerId == null) return
    setItems([])
    setPage(1)
    void loadPage(1, false)
  }, [freelancerId, loadPage])

  const canLoadMore = page < totalPages && total > 0

  if (freelancerId == null) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-slate-500">
        <p>Portfolio is unavailable (missing freelancer id).</p>
      </div>
    )
  }

  return (
    <div>
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      )}

      {!loading && total === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-purple-50/40 px-6 py-20 text-center"
        >
          <div className="mx-auto max-w-sm">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-purple-100 text-purple-600">
              <Film className="h-12 w-12" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-800">No videos yet</h3>
            <p className="mt-2 text-slate-600">
              This freelancer hasn’t added portfolio videos. Check back later for new work.
            </p>
            <div className="mt-6 flex items-center justify-center gap-1 text-sm text-slate-400">
              <LayoutGrid className="h-4 w-4" />
              <span>0 items</span>
            </div>
          </div>
        </motion.div>
      )}

      {!loading && total > 0 && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium">
                {total} {total === 1 ? "video" : "videos"}
              </span>
            </div>
          </div>

          <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {items.map((v, i) => (
                <motion.article
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-purple-200 hover:shadow-lg"
                  onClick={() => setModalId(v.id)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <ThumbnailFrame videoUrl={v.videoUrl} title={v.title} />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100 group-hover:bg-black/30">
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        whileHover={{ scale: 1.05, opacity: 1 }}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 backdrop-blur"
                      >
                        <Play className="h-7 w-7 translate-x-0.5 text-white" fill="currentColor" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="p-4">
                    {v.category && (
                      <span className="mb-1 inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        {v.category}
                      </span>
                    )}
                    <h3 className="line-clamp-2 font-bold text-slate-900">{v.title || "Untitled"}</h3>
                    {v.freelancer && (
                      <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                        <div className="flex min-w-0 items-center gap-2">
                          {v.freelancer.profilePicture ? (
                            <img src={v.freelancer.profilePicture} alt={v.freelancer.name || "Freelancer profile"} loading="lazy" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <span className="truncate">{v.freelancer.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-slate-500">
                          <Eye className="h-3.5 w-3.5" />
                          {v.views != null ? Number(v.views).toLocaleString() : "0"}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {canLoadMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadPage(page + 1, true)}
                className="inline-flex items-center gap-2 rounded-full border-2 border-purple-600 bg-white px-8 py-3 text-sm font-semibold text-purple-600 shadow-sm transition hover:bg-purple-50 disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}

      <VideoPlayerModal open={modalId != null} videoId={modalId} onClose={() => setModalId(null)} />
    </div>
  )
}

FreelancerPortfolio.propTypes = {
  freelancerId: PropTypes.number.isRequired,
}
