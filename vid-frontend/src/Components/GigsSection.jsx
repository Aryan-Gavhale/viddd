import { useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Heart, Play, Star, Clock, CheckCircle2 } from "lucide-react"
import img1 from "../assets/homepage.jpg"
import img2 from "../assets/img3.jpg"
import { Link } from "react-router-dom"

const gigs = [
  {
    id: 1,
    title: "Professional Video Editing for YouTube.",
    thumbnail: img1,
    editor: {
      name: "Alex Morgan",
      avatar: img2,
      topRated: true,
      pro: false,
    },
    rating: 4.9,
    reviews: 847,
    price: 299,
  },
  {
    id: 2,
    title: "Cinematic Color Grading & Post-Production",
    thumbnail: img1,
    editor: {
      name: "Sarah Chen",
      avatar: img2,
      topRated: true,
      pro: true,
    },
    rating: 5.0,
    reviews: 1243,
    price: 499,
  },
  {
    id: 3,
    title: "Motion Graphics & Visual Effects",
    thumbnail: img1,
    editor: {
      name: "David Kumar",
      avatar: img2,
      topRated: false,
      pro: true,
    },
    rating: 4.8,
    reviews: 562,
    price: 399,
  },
  {
    id: 4,
    title: "3D Animation & Character Design",
    thumbnail: img1,
    editor: {
      name: "Emma Wilson",
      avatar: img2,
      topRated: true,
      pro: false,
    },
    rating: 4.9,
    reviews: 923,
    price: 599,
  },
  {
    id: 4,
    title: "3D Animation & Character Design",
    thumbnail: img1,
    editor: {
      name: "Emma Wilson",
      avatar: img2,
      topRated: true,
      pro: false,
    },
    rating: 4.9,
    reviews: 923,
    price: 599,
  },
  {
    id: 4,
    title: "3D Animation & Character Design",
    thumbnail: img1,
    editor: {
      name: "Emma Wilson",
      avatar: img2,
      topRated: true,
      pro: false,
    },
    rating: 4.9,
    reviews: 923,
    price: 599,
  },
]

export default function TrendingGigs() {
  const scrollContainerRef = useRef(null)

  const scroll = useCallback((direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }, [])

  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Trending Gigs</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory -mx-4 px-4"
        >
          {gigs.map((gig) => (
            <motion.div
              key={gig.id}
              className="flex-shrink-0 w-[320px] snap-start group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative bg-white rounded-lg overflow-hidden border border-gray-300 flex flex-col h-full">
                {/* Thumbnail */}
                <Link href={`/gig/${gig.id}`} className="block relative aspect-[16/9] overflow-hidden">
                  <img
                    src={gig.thumbnail || "/placeholder.svg"}
                    alt={gig.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-10 transition-opacity group-hover:bg-opacity-20" />
                  <button
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white transition-colors duration-200 shadow-sm"
                    aria-label="Add to favorites"
                  >
                    <Heart className="w-4 h-4 text-gray-600" />
                  </button>
                </Link>

                <div className="p-3 flex flex-col flex-grow">
                  {/* Editor Info */}
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      href={`/editor/${gig.editor.name.toLowerCase().replace(" ", "-")}`}
                      className="flex items-center gap-2 group/editor"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img
                          src={gig.editor.avatar || "/placeholder.svg"}
                          alt={gig.editor.name}
                         
                          className="object-cover h-full w-full"
                        />
                      </div>
                      <span className="text-base font-medium text-gray-900 group-hover/editor:text-gray-600 transition-colors">
                        {gig.editor.name}
                      </span>
                    </Link>
                    <div className="flex items-center gap-1">
                      {gig.editor.topRated && (
                        <span className="px-2 py-1 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded">
                          TOP RATED
                        </span>
                      )}
                      {gig.editor.pro && (
                        <span className="px-2 py-1 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <Link href={`/gig/${gig.id}`} className="block group/title mb-2">
                    <h3 className="text-base text-gray-900 font-medium line-clamp-2 h-12 overflow-hidden leading-snug group-hover/title:text-gray-600 transition-colors">
                      {gig.title}
                    </h3>
                  </Link>

                  {/* Rating & Price */}
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-black fill-black" />
                      <span className="text-sm font-medium text-gray-900">{gig.rating}</span>
                      <span className="text-sm text-gray-500">({gig.reviews.toLocaleString()})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">From</span>
                      <p className="text-base font-semibold text-gray-900">${gig.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

