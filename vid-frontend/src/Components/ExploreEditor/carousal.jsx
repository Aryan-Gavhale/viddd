import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"



export function Carousel({ children, itemsToShow = 3, autoPlay = true, interval = 5000 }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const timeoutRef = useRef()

  const totalSlides = Math.ceil(children.length / itemsToShow)

  useEffect(() => {
    if (autoPlay && !isHovered) {
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % totalSlides)
      }, interval)
    }
    return () => clearTimeout(timeoutRef.current)
  }, [autoPlay, isHovered, interval, totalSlides])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
  }

  return (
    <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="overflow-hidden">
        <motion.div
          className="flex"
          animate={{
            x: `${-currentIndex * 100}%`,
          }}
          transition={{ type: "tween", duration: 0.5 }}
        >
          {children.map((child, index) => (
            <div
              key={index}
              className="flex-none w-full md:w-1/2 lg:w-1/3 p-4"
              style={{ minWidth: `${100 / itemsToShow}%` }}
            >
              {child}
            </div>
          ))}
        </motion.div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  )
}

