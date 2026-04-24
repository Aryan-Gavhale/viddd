import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import homepage from "../assets/homepage.jpg"; 
import img2 from "../assets/img3.jpg";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"

const testimonials = [
  {
    id: 1,
    image: homepage,
    name: "John Doe",
    designation: "Senior Video Editor",
    quote:
      "Vidlancing has revolutionized how I collaborate with clients. The platform's intuitive interface and powerful features have made my workflow incredibly efficient.",
    rating: 5,
  },
  {
    id: 2,
    image: img2,
    name: "Jane Smith",
    designation: "Creative Director",
    quote:
      "The quality of work and professionalism on Vidlancing is unmatched. It's become my go-to platform for all video editing projects.",
    rating: 5,
  },
  {
    id: 3,
    image: homepage,
    name: "Chris Evans",
    designation: "Content Creator",
    quote:
      "Finding talented video editors used to be a challenge until I discovered Vidlancing. The platform connects you with true professionals.",
    rating: 4,
  },
  {
    id: 4,
    image: img2,
    name: "Emma Watson",
    designation: "Marketing Manager",
    quote:
      "The attention to detail and quick turnaround time from editors on Vidlancing have exceeded my expectations every single time.",
    rating: 5,
  },
]

export default function Testimonials() {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext()
    }, 5000)
    return () => clearInterval(interval)
  }, []) //Removed active from dependencies

  const handleNext = () => {
    setDirection(1)
    setActive((prev) => (prev + 1) % testimonials.length)
  }

  const handlePrev = () => {
    setDirection(-1)
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <div className="w-full bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Community Says</h2>
          <p className="text-gray-600">Join thousands of satisfied video professionals who trust Vidlancing</p>
        </div>

        <div className="relative bg-white rounded-2xl shadow-[0_0_50px_-12px] shadow-gray-300/50 overflow-hidden  h-[600px]">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActive(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === active ? "w-8 bg-gray-900" : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 h-full">
            {/* Image Section */}
            <div className="relative h-[300px] md:h-full overflow-hidden">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={active}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 200 : -200 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -200 : 200 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="absolute inset-0"
                >
                  <img
                    src={testimonials[active].image || "/placeholder.svg"}
                    alt={testimonials[active].name}
                    fill
                    className="object-cover h-full w-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Content Section */}
            <div className="relative p-8 md:p-12 flex flex-col justify-between bg-gradient-to-br from-gray-50 to-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full justify-between"
                >
                  <div>
                    <Quote className="w-12 h-12 text-gray-200 mb-6" />
                    <p className="text-xl md:text-2xl text-gray-800 font-light leading-relaxed mb-8">
                      "{testimonials[active].quote}"
                    </p>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{testimonials[active].name}</h3>
                      <p className="text-gray-500 mt-1">{testimonials[active].designation}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      onClick={handlePrev}
                      className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      aria-label="Previous testimonial"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      aria-label="Next testimonial"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

