import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { X, Eye, User } from "lucide-react"
import axiosInstance from "../../utils/axios"
import { toast } from "react-toastify"

/**
 * Fetches /portfolio/video/:id (increments views) and shows HTML5 video + details.
 * videoId: portfolio row id, or null to close
 */
export default function VideoPlayerModal({ open, onClose, videoId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (videoId == null) return
    setLoading(true)
    try {
      const { data: body } = await axiosInstance.get(`/portfolio/video/${videoId}`)
      setData(body.data)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || "Failed to load video")
      onClose()
    } finally {
      setLoading(false)
    }
  }, [videoId, onClose])

  useEffect(() => {
    if (open && videoId != null) {
      setData(null)
      void load()
    }
  }, [open, videoId, load])

  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, onClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-purple-500/30"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {loading && (
              <div className="flex aspect-video w-full items-center justify-center text-white">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              </div>
            )}

            {!loading && data && (
              <>
                <div className="bg-black">
                  {data.videoUrl ? (
                    <video
                      key={data.id}
                      className="max-h-[55vh] w-full object-contain bg-black"
                      src={data.videoUrl}
                      controls
                      playsInline
                      autoPlay
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-slate-400">No video URL</div>
                  )}
                </div>
                <div className="p-5 space-y-3 border-t border-slate-800 max-h-[28vh] overflow-y-auto">
                  <div>
                    <h2 className="text-xl font-bold text-white pr-10">{data.title || "Untitled"}</h2>
                    {data.category && (
                      <span className="mt-2 inline-block rounded-full bg-purple-600/30 px-3 py-0.5 text-xs font-medium text-purple-200">
                        {data.category}
                      </span>
                    )}
                  </div>
                  {data.freelancer && (
                    <div className="flex items-center gap-3 text-slate-300">
                      {data.freelancer.profilePicture ? (
                        <img
                          src={data.freelancer.profilePicture}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-purple-500/50"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-slate-400">Creator</p>
                        <p className="font-medium text-white">{data.freelancer.name}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1 text-slate-400 text-sm">
                        <Eye className="h-4 w-4" />
                        {data.views?.toLocaleString?.() ?? data.views} views
                      </div>
                    </div>
                  )}
                  {data.description && <p className="text-slate-300 text-sm leading-relaxed">{data.description}</p>}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
