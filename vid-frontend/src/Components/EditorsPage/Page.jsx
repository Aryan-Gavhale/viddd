import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, SlidersHorizontal, ChevronDown, Bookmark } from "lucide-react"
import EditorFilters from "./Filters"
import EditorCard from "./Card"
import { EmptySavedEditors } from "./EmptySaved"
import { editors } from "./Editor.js"

const sortOptions = [
  { label: "Most Relevant", value: "relevant" },
  { label: "Highest Rated", value: "rating" },
  { label: "Most Reviews", value: "reviews" },
  { label: "Lowest Rate", value: "rate_low" },
  { label: "Highest Rate", value: "rate_high" },
]

export default function FindEditorsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("relevant")
  const [showFilters, setShowFilters] = useState(true)
  const [savedEditors, setSavedEditors] = useState([])
  const [showSaved, setShowSaved] = useState(false)

  const toggleSavedEditor = (editorId) => {
    setSavedEditors((prev) => (prev.includes(editorId) ? prev.filter((id) => id !== editorId) : [...prev, editorId]))
  }

  const filteredEditors = showSaved ? editors.filter((editor) => savedEditors.includes(editor.id)) : editors

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="  sticky top-0 z-10 ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="search"
                placeholder="Search for video editors by name, skills, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSaved(!showSaved)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  showSaved ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${showSaved ? "fill-current" : ""}`} />
                <span className="font-medium">Saved</span>
                {savedEditors.length > 0 && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      showSaved ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
                    }`}
                  >
                    {savedEditors.length}
                  </span>
                )}
              </motion.button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 p-2.5 text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className={`${showFilters ? "block" : "hidden"} lg:block sticky top-24 h-fit`}>
            <EditorFilters />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {showSaved && savedEditors.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <EmptySavedEditors />
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {showSaved ? "Saved Editors" : "Top Video Editors"}
                    </h1>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none bg-white px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {filteredEditors.map((editor) => (
                      <EditorCard
                        key={editor.id}
                        editor={editor}
                        onLike={toggleSavedEditor}
                        isSaved={savedEditors.includes(editor.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

