"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, Video, Palette, Sparkles, Users, Search } from "lucide-react"

export function EmptySavedEditors() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-8" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {/* Animated illustration */}
        <div className="relative h-72 w-72">
          {/* Central circle with pulsing effect */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-indigo-100/50"></div>
            <div className="relative rounded-full bg-white p-8 shadow-lg">
              <motion.div
                animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Heart
                  className={`h-16 w-16 transition-all duration-500 ${
                    isHovered ? "fill-indigo-600 text-indigo-600" : "text-indigo-400"
                  }`}
                />
              </motion.div>
            </div>
          </div>

          {/* Orbiting elements with gradient backgrounds */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="absolute left-1/2 top-0 -translate-x-1/2">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 shadow-lg">
                <Video className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 shadow-lg">
                <Palette className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Glowing connection lines */}
        <div className="absolute inset-0 h-full w-full opacity-50">
          <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-50/30 blur-xl"></div>
        </div>
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-3xl font-bold text-gray-900"
      >
        Your Saved Editors Collection is Empty
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 max-w-md text-center text-gray-600"
      >
        Discover and save talented video editors to build your personalized collection. Click the heart icon{" "}
        <Heart className="mx-1 inline-block h-4 w-4" /> on any editor's profile to add them here.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex flex-col items-center gap-4"
      >
        <button className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-3 text-sm font-medium text-white transition-all duration-300 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg">
          <Search className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
          Discover Top Editors
        </button>

        <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
          <div className="flex -space-x-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="relative h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-indigo-50 to-white shadow-sm"
              >
                <Users className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
              </div>
            ))}
          </div>
          <span>Join 2,500+ professionals who found their perfect editors</span>
        </div>
      </motion.div>
    </div>
  )
}

