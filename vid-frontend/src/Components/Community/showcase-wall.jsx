import { useState } from "react"
import { Search, Plus, Star, Eye, Heart, MessageSquare, Play } from 'lucide-react'

const showcases = [
  {
    id: 1,
    title: "Cinematic Travel Reel - Bali Adventure",
    author: "Alex Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    thumbnail: "/placeholder.svg?height=300&width=400",
    rating: 4.9,
    views: 2847,
    likes: 156,
    comments: 23,
    tags: ["travel", "cinematic", "colorgrading"],
    category: "Travel",
  },
  {
    id: 2,
    title: "Product Launch Video - Tech Startup",
    author: "Sarah Kim",
    avatar: "/placeholder.svg?height=40&width=40",
    thumbnail: "/placeholder.svg?height=300&width=400",
    rating: 4.8,
    views: 1923,
    likes: 134,
    comments: 18,
    tags: ["product", "corporate", "motion"],
    category: "Corporate",
  },
]

export default function ShowcaseWall() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search showcases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>

        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg">
          <Plus className="w-4 h-4" />
          <span>Upload Showcase</span>
        </button>
      </div>

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcases.map((showcase) => (
          <div
            key={showcase.id}
            className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all transform hover:scale-105"
          >
            <div className="relative">
              <img
                src={showcase.thumbnail || "/placeholder.svg"}
                alt={showcase.title}
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="text-white w-12 h-12" />
              </div>
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 bg-black/50 text-white text-xs rounded-full">{showcase.category}</span>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-3 group-hover:text-purple-600 transition-colors">
                {showcase.title}
              </h3>

              <div className="flex items-center gap-2 mb-4">
                <img
                  src={showcase.avatar || "/placeholder.svg"}
                  alt={showcase.author}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-gray-600 text-sm">{showcase.author}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {showcase.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    <span>{showcase.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{showcase.views.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <Heart className="w-4 h-4" />
                    <span>{showcase.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    <span>{showcase.comments}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
