import { useState } from "react"
import { Search, Filter, Plus, MessageSquare, ThumbsUp, Eye, Target, Crown, TrendingUp, Clock, Users, Star, CheckCircle, HelpCircle, BarChart3, MessageCircle, X } from 'lucide-react'

const clientPosts = [
  {
    id: 1,
    type: "question",
    title: "What should I expect to pay for a 3-minute promotional video?",
    content:
      "I'm a small business owner looking to create a promotional video for my restaurant. What are typical rates and what factors affect pricing?",
    author: "Jennifer Walsh",
    avatar: "/placeholder.svg?height=40&width=40",
    timestamp: "2 hours ago",
    upvotes: 12,
    replies: 8,
    views: 156,
    tags: ["pricing", "promotional", "smallbusiness"],
    isAnswered: true,
    category: "Pricing",
  },
  {
    id: 2,
    type: "feedback",
    title: "Feedback on raw footage for wedding video",
    content:
      "Just got back from shooting my daughter's wedding. Would love feedback on the raw footage quality and any editing suggestions.",
    author: "Robert Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    timestamp: "5 hours ago",
    upvotes: 8,
    replies: 15,
    views: 203,
    tags: ["wedding", "feedback", "rawfootage"],
    isAnswered: false,
    category: "Feedback",
  },
  {
    id: 3,
    type: "poll",
    title: "Which editing style do you prefer for corporate videos?",
    content: "We're updating our corporate video style guide. Help us choose between these editing approaches.",
    author: "Sarah Kim",
    avatar: "/placeholder.svg?height=40&width=40",
    timestamp: "1 day ago",
    upvotes: 24,
    replies: 32,
    views: 445,
    tags: ["corporate", "style", "poll"],
    isAnswered: false,
    category: "Poll",
    pollOptions: [
      { option: "Clean & Minimal", votes: 45 },
      { option: "Dynamic & Energetic", votes: 32 },
      { option: "Cinematic & Dramatic", votes: 18 },
      { option: "Documentary Style", votes: 12 },
    ],
  },
]

const popularTopics = [
  { topic: "Video Pricing", posts: 89, trend: "up", color: "green" },
  { topic: "Wedding Videos", posts: 67, trend: "stable", color: "blue" },
  { topic: "Corporate Content", posts: 54, trend: "hot", color: "red" },
  { topic: "Social Media Videos", posts: 43, trend: "up", color: "purple" },
  { topic: "Documentary Style", posts: 32, trend: "stable", color: "orange" },
]

const helpfulEditors = [
  {
    name: "Alex Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    helpfulAnswers: 156,
    rating: 4.9,
    specialties: ["Wedding", "Corporate"],
    responseTime: "2 hours",
    isVerified: true,
  },
  {
    name: "Sarah Rodriguez",
    avatar: "/placeholder.svg?height=40&width=40",
    helpfulAnswers: 134,
    rating: 4.8,
    specialties: ["Commercial", "Social Media"],
    responseTime: "4 hours",
    isVerified: true,
  },
  {
    name: "Mike Thompson",
    avatar: "/placeholder.svg?height=40&width=40",
    helpfulAnswers: 98,
    rating: 4.7,
    specialties: ["Documentary", "Music Videos"],
    responseTime: "6 hours",
    isVerified: false,
  },
]

const clientStats = [
  { label: "Questions Answered", value: "1,247", icon: HelpCircle, trend: "+12%", color: "blue" },
  { label: "Active Clients", value: "456", icon: Users, trend: "+8%", color: "green" },
  { label: "Avg Response Time", value: "3.2h", icon: Clock, trend: "-15%", color: "purple" },
  { label: "Satisfaction Rate", value: "96%", icon: Star, trend: "+2%", color: "orange" },
]

export default function ClientLounge() {
  const [filterType, setFilterType] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isPostOpen, setIsPostOpen] = useState(false)
  const [newPost, setNewPost] = useState({
    type: "",
    title: "",
    content: "",
    category: "",
    tags: "",
  })

  const filteredPosts = clientPosts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || post.type === filterType
    return matchesSearch && matchesType
  })

  const handleCreatePost = () => {
    console.log("Creating client post:", newPost)
    setIsPostOpen(false)
    setNewPost({ type: "", title: "", content: "", category: "", tags: "" })
  }

  return (
    <div className="space-y-8">
      {/* Client Lounge Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold">Client Lounge</h1>
                <div className="px-4 py-2 bg-cyan-300/20 backdrop-blur-sm rounded-full border border-cyan-300/30">
                  <span className="text-cyan-200 text-sm font-medium">Client Zone</span>
                </div>
              </div>
              <p className="text-xl opacity-90 mb-6 max-w-2xl">
                Get expert advice, share feedback, and connect with professional video editors
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full">
                  <HelpCircle className="w-4 h-4" />
                  <span>Ask Questions</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full">
                  <MessageCircle className="w-4 h-4" />
                  <span>Get Feedback</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full">
                  <BarChart3 className="w-4 h-4" />
                  <span>Create Polls</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => setIsPostOpen(true)}
                className="flex items-center gap-3 px-6 py-3 bg-white text-blue-600 rounded-2xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span>Ask Question</span>
              </button>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {clientStats.map((stat, index) => (
          <div
            key={index}
            className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all transform hover:scale-105"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${
                stat.color === 'blue' ? 'bg-blue-50' :
                stat.color === 'green' ? 'bg-green-50' :
                stat.color === 'purple' ? 'bg-purple-50' : 'bg-orange-50'
              }`}>
                <stat.icon className={`w-5 h-5 ${
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'purple' ? 'text-purple-600' : 'text-orange-600'
                }`} />
              </div>
              <span
                className={`text-sm font-medium ${stat.trend.startsWith("+") ? "text-green-600" : stat.trend.startsWith("-") ? "text-red-600" : "text-blue-600"}`}
              >
                {stat.trend}
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-gray-600 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search client discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>

          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[140px] shadow-sm"
            >
              <option value="all">All Posts</option>
              <option value="question">Questions</option>
              <option value="feedback">Feedback</option>
              <option value="poll">Polls</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all"
            >
              <div className="flex gap-4">
                <img
                  src={post.avatar || "/placeholder.svg"}
                  alt={post.author}
                  className="w-12 h-12 rounded-full border-2 border-gray-200"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        post.type === "question"
                          ? "bg-blue-100 text-blue-700"
                          : post.type === "feedback"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {post.type === "question" ? (
                        <div className="flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          <span>Question</span>
                        </div>
                      ) : post.type === "feedback" ? (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>Feedback</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          <span>Poll</span>
                        </div>
                      )}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      {post.category}
                    </span>
                    {post.isAnswered && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Answered</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors cursor-pointer">
                    {post.title}
                  </h3>

                  <p className="text-gray-600 mb-4 line-clamp-2">{post.content}</p>

                  {post.pollOptions && (
                    <div className="space-y-3 mb-4">
                      {post.pollOptions.map((option, index) => {
                        const totalVotes = post.pollOptions.reduce((sum, opt) => sum + opt.votes, 0)
                        const percentage = (option.votes / totalVotes) * 100
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-900 font-medium">{option.option}</span>
                              <span className="text-gray-600">{option.votes} votes</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{post.author}</span>
                      <span>•</span>
                      <span>{post.timestamp}</span>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{post.views}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-sm text-gray-700">
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.upvotes}</span>
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all text-sm text-gray-700">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.replies} replies</span>
                      </button>
                      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all transform hover:scale-105 text-sm font-medium">
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Popular Topics */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Popular Topics</h3>
            </div>
            <div className="space-y-3">
              {popularTopics.map((topic, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      topic.color === 'green' ? 'bg-green-500' :
                      topic.color === 'blue' ? 'bg-blue-500' :
                      topic.color === 'red' ? 'bg-red-500' :
                      topic.color === 'purple' ? 'bg-purple-500' : 'bg-orange-500'
                    }`}></div>
                    <div>
                      <div className="text-gray-900 font-medium">{topic.topic}</div>
                      <div className="text-gray-500 text-sm">{topic.posts} posts</div>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    topic.trend === 'hot' ? 'bg-red-500' :
                    topic.trend === 'up' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Helpful Editors */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Helpful Editors</h3>
            </div>
            <div className="space-y-4">
              {helpfulEditors.map((editor, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={editor.avatar || "/placeholder.svg"}
                      alt={editor.name}
                      className="w-12 h-12 rounded-full border-2 border-gray-200"
                    />
                    {editor.isVerified && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 truncate">{editor.name}</h4>
                      {editor.isVerified && <Crown className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-sm text-gray-600">{editor.rating}</span>
                      </div>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-gray-600 text-sm">{editor.helpfulAnswers} answers</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {editor.specialties.map((specialty) => (
                        <span key={specialty} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {specialty}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">Avg response: {editor.responseTime}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <HelpCircle className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Quick Tips</h3>
            </div>
            <div className="space-y-4">
              {[
                "Be specific about your project requirements",
                "Include your budget range for better responses",
                "Share reference videos when asking for style advice",
                "Provide technical details about your footage",
                "Be open to different creative approaches",
              ].map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700 text-sm">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {isPostOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Ask the Community</h2>
              <button
                onClick={() => setIsPostOpen(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-900 font-medium mb-2">Post Type</label>
                <select
                  value={newPost.type}
                  onChange={(e) => setNewPost({ ...newPost, type: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">What would you like to do?</option>
                  <option value="question">Ask a Question</option>
                  <option value="feedback">Request Feedback</option>
                  <option value="poll">Create a Poll</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">Category</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="pricing">Pricing & Budget</option>
                  <option value="process">Editing Process</option>
                  <option value="feedback">Feedback & Review</option>
                  <option value="technical">Technical Questions</option>
                  <option value="style">Style & Creative</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">Title</label>
                <input
                  type="text"
                  placeholder="What's your question or topic?"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">Details</label>
                <textarea
                  placeholder="Provide more details about your question or request..."
                  rows={5}
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-900 font-medium mb-2">Tags</label>
                <input
                  type="text"
                  placeholder="e.g., wedding, pricing, feedback"
                  value={newPost.tags}
                  onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleCreatePost}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                  Post Question
                </button>
                <button
                  onClick={() => setIsPostOpen(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
