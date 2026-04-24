import { useState } from "react"
import { Search, Filter, Plus, MessageSquare, ThumbsUp, HelpCircle, Lightbulb, CheckCircle, Pin } from 'lucide-react'

const discussions = [
  {
    id: 1,
    type: "question",
    title: "Best workflow for color grading in DaVinci Resolve?",
    content:
      "I'm transitioning from Premiere Pro to DaVinci Resolve and looking for efficient color grading workflows...",
    author: "Mike Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
    timestamp: "2 hours ago",
    upvotes: 24,
    replies: 8,
    tags: ["davinciresolve", "colorgrading", "workflow"],
    isPinned: false,
    isAnswered: true,
  },
  {
    id: 2,
    type: "tip",
    title: "Pro tip: Using adjustment layers for consistent color correction",
    content: "Here's a game-changing technique I discovered for maintaining consistent color across multiple clips...",
    author: "Sarah Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    timestamp: "4 hours ago",
    upvotes: 156,
    replies: 23,
    tags: ["premierepro", "colorgrading", "tips"],
    isPinned: true,
    isAnswered: false,
  },
]

export default function DiscussionBoard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
          >
            <option value="newest">Newest</option>
            <option value="top">Top Rated</option>
            <option value="trending">Trending</option>
          </select>
        </div>

        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg">
          <Plus className="w-4 h-4" />
          <span>New Discussion</span>
        </button>
      </div>

      {/* Discussions */}
      <div className="space-y-6">
        {discussions.map((discussion) => (
          <div
            key={discussion.id}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all"
          >
            <div className="flex gap-4">
              <img
                src={discussion.avatar || "/placeholder.svg"}
                alt={discussion.author}
                className="w-12 h-12 rounded-full border-2 border-gray-200"
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {discussion.isPinned && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      <Pin className="w-3 h-3" />
                      <span>Pinned</span>
                    </div>
                  )}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                      discussion.type === "question"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {discussion.type === "question" ? (
                      <>
                        <HelpCircle className="w-3 h-3" />
                        <span>Question</span>
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-3 h-3" />
                        <span>Tip</span>
                      </>
                    )}
                  </span>
                  {discussion.isAnswered && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Answered</span>
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3 hover:text-purple-600 transition-colors cursor-pointer">
                  {discussion.title}
                </h3>

                <p className="text-gray-600 mb-4">{discussion.content}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {discussion.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{discussion.author}</span>
                    <span>•</span>
                    <span>{discussion.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-gray-700">{discussion.upvotes}</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-gray-700">{discussion.replies} replies</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
