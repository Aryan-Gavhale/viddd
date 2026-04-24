import img1 from "../assets/img3.jpg"
import { useRef } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

const services = [
  {
    id: 1,
    title: "Social Media Videos",
    description: "Short-form content for social platforms",
    image: "/placeholder.svg?height=280&width=380",
    category: "Social Media",
  },
  {
    id: 2,
    title: "3D Animation",
    description: "Professional 3D modeling and animation",
    image: "/placeholder.svg?height=280&width=380",
    category: "3D",
  },
  {
    id: 3,
    title: "Motion Graphics",
    description: "Dynamic animated graphics and effects",
    image: "/placeholder.svg?height=280&width=380",
    category: "Animation",
  },
  {
    id: 4,
    title: "Color Grading",
    description: "Professional color correction and grading",
    image: "/placeholder.svg?height=280&width=380",
    category: "Post-Production",
  },
  {
    id: 5,
    title: "Video Editing",
    description: "Professional video post-production",
    image: "/placeholder.svg?height=280&width=380",
    category: "Editing",
  },
  {
    id: 6,
    title: "Visual Effects",
    description: "High-end VFX and compositing",
    image: "/placeholder.svg?height=280&width=380",
    category: "VFX",
  },
]

export default function PopularServices() {
  const scrollContainerRef = useRef(null)

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -380 : 380
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Popular Services</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {services.map((service) => (
            <motion.div
              key={service.id}
              className="relative flex-shrink-0 w-[385px] snap-start group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
                <img
                  src={img1}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 380px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                  <p className="text-sm text-gray-200 mb-4">{service.description}</p>
                  
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

