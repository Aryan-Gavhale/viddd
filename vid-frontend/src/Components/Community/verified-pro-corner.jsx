import { useState } from "react";
import { Crown, Star, Lock, Briefcase, Users, MessageSquare, TrendingUp, DollarSign } from "lucide-react";

const premiumJobs = [
  {
    id: 1,
    title: "Netflix Documentary Series - Lead Editor",
    company: "Netflix Productions",
    budget: "$15,000 - $25,000",
    duration: "3 months",
    location: "Remote",
    description:
      "Seeking an experienced documentary editor for a high-profile series. Must have experience with long-form content and storytelling.",
    requirements: ["5+ years documentary experience", "Avid Media Composer", "Color grading skills"],
    postedDate: "2 days ago",
    applicants: 8,
    isUrgent: true,
    verificationRequired: true,
  },
  {
    id: 2,
    title: "Commercial Campaign - Automotive Brand",
    company: "Major Automotive Corp",
    budget: "$8,000 - $12,000",
    duration: "6 weeks",
    location: "Los Angeles, CA",
    description:
      "High-end commercial editing for luxury automotive brand. Multiple deliverables across various platforms.",
    requirements: ["Commercial editing experience", "Premiere Pro/After Effects", "Motion graphics"],
    postedDate: "1 week ago",
    applicants: 12,
    isUrgent: false,
    verificationRequired: true,
  },
];

const proDiscussions = [
  {
    id: 1,
    title: "Industry Rate Standards 2024",
    author: "Sarah Chen",
    avatar: "/placeholder.svg?height=40&width=40",
    replies: 23,
    lastActivity: "2 hours ago",
    isPrivate: true,
    category: "Business",
  },
  {
    id: 2,
    title: "Client Management Best Practices",
    author: "Mike Rodriguez",
    avatar: "/placeholder.svg?height=40&width=40",
    replies: 18,
    lastActivity: "4 hours ago",
    isPrivate: true,
    category: "Business",
  },
  {
    id: 3,
    title: "Advanced Color Workflow Techniques",
    author: "Alex Thompson",
    avatar: "/placeholder.svg?height=40&width=40",
    replies: 31,
    lastActivity: "1 day ago",
    isPrivate: true,
    category: "Technical",
  },
];

const mentorshipPrograms = [
  {
    id: 1,
    mentor: "David Kim",
    avatar: "/placeholder.svg?height=40&width=40",
    specialty: "Documentary Editing",
    experience: "15+ years",
    rating: 4.9,
    sessions: 156,
    price: "$150/hour",
    availability: "Available",
    badges: ["Netflix", "Emmy Winner", "Sundance"],
  },
  {
    id: 2,
    mentor: "Lisa Wang",
    avatar: "/placeholder.svg?height=40&width=40",
    specialty: "Commercial & Advertising",
    experience: "12+ years",
    rating: 4.8,
    sessions: 203,
    price: "$120/hour",
    availability: "Booked",
    badges: ["Super Bowl", "Cannes Lions", "Nike"],
  },
];

const proStats = [
  { label: "Premium Jobs", value: "47", icon: Briefcase, trend: "+8%" },
  { label: "Active Pros", value: "234", icon: Crown, trend: "+12%" },
  { label: "Avg. Project Value", value: "$8.5K", icon: DollarSign, trend: "+15%" },
  { label: "Success Rate", value: "94%", icon: TrendingUp, trend: "+2%" },
];

export default function VerifiedProCorner() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("jobs");

  return (
    <div className="space-y-8">
      {/* Pro Corner Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-3xl">👑</span>
          <h2 className="text-3xl font-bold">Verified Pro Corner</h2>
          <span className="px-4 py-2 bg-yellow-400/20 rounded-full text-yellow-300 text-sm font-medium">
            ✓ Verified Access
          </span>
        </div>

        <p className="text-xl opacity-90 mb-6">
          Exclusive opportunities, premium discussions, and mentorship for verified professionals
        </p>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <span>🛡️</span>
            <span>Verified Members Only</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <span>💎</span>
            <span>Premium Content</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <span>⚡</span>
            <span>Priority Support</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {proStats.map((stat, index) => (
          <div key={index} className="bg-white shadow rounded-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-green-600">{stat.trend}</p>
                </div>
                <stat.icon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full">
        <div className="grid w-full grid-cols-4 bg-gray-100 rounded-lg p-1">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === "jobs" ? "bg-white shadow" : ""}`}
            onClick={() => setActiveTab("jobs")}
          >
            <Briefcase className="w-4 h-4" />
            Premium Jobs
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === "discussions" ? "bg-white shadow" : ""}`}
            onClick={() => setActiveTab("discussions")}
          >
            <MessageSquare className="w-4 h-4" />
            Pro Discussions
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === "mentorship" ? "bg-white shadow" : ""}`}
            onClick={() => setActiveTab("mentorship")}
          >
            <Users className="w-4 h-4" />
            Mentorship
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${activeTab === "insights" ? "bg-white shadow" : ""}`}
            onClick={() => setActiveTab("insights")}
          >
            <TrendingUp className="w-4 h-4" />
            Industry Insights
          </button>
        </div>

        {activeTab === "jobs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💼</span>
                <h3 className="text-2xl font-bold text-white">Premium Jobs</h3>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {premiumJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-6 bg-white/5 border-l-4 border-l-purple-500 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
                          Premium
                        </span>
                        {job.isUrgent && (
                          <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-medium">
                            Urgent
                          </span>
                        )}
                      </div>

                      <h4 className="text-xl font-semibold text-white mb-2">{job.title}</h4>
                      <p className="text-gray-400 mb-4">{job.company}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span>💰</span>
                          <span className="text-white">{job.budget}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>⏰</span>
                          <span className="text-white">{job.duration}</span>
                        </div>
                      </div>
                    </div>

                    <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl transition-all transform hover:scale-105">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "discussions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Pro-Only Discussions</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <Lock className="w-4 h-4" />
                Start Private Discussion
              </button>
            </div>

            <div className="space-y-4">
              {proDiscussions.map((discussion) => (
                <div key={discussion.id} className="bg-white shadow rounded-lg hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img src={discussion.avatar || "/placeholder.svg"} alt={discussion.author} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 border border-gray-300 rounded text-xs flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Private
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{discussion.category}</span>
                        </div>

                        <h3 className="font-semibold text-lg mb-2 hover:text-blue-500 cursor-pointer">
                          {discussion.title}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>by {discussion.author}</span>
                          <span>•</span>
                          <span>{discussion.replies} replies</span>
                          <span>•</span>
                          <span>Last activity {discussion.lastActivity}</span>
                        </div>
                      </div>

                      <button className="px-4 py-2 text-gray-500 hover:text-blue-500">
                        Join Discussion
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "mentorship" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Mentorship Program</h2>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-transparent hover:bg-gray-100">
                <Users className="w-4 h-4" />
                Become a Mentor
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {mentorshipPrograms.map((mentor) => (
                <div key={mentor.id} className="bg-white shadow rounded-lg hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden">
                        <img src={mentor.avatar || "/placeholder.svg"} alt={mentor.mentor} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{mentor.mentor}</h3>
                        <p className="text-gray-500">{mentor.specialty}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm">{mentor.rating}</span>
                          </div>
                          <span className="text-sm text-gray-500">({mentor.sessions} sessions)</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          mentor.availability === "Available" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {mentor.availability}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Experience:</span>
                        <span className="font-medium">{mentor.experience}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Rate:</span>
                        <span className="font-medium">{mentor.price}</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {mentor.badges.map((badge, index) => (
                          <span key={index} className="px-2 py-1 border border-gray-300 rounded text-xs">
                            {badge}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          className={`flex-1 px-4 py-2 rounded-lg ${
                            mentor.availability === "Available"
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          disabled={mentor.availability !== "Available"}
                        >
                          Book Session
                        </button>
                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Industry Insights & Analytics</h2>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                    <TrendingUp className="w-5 h-5" />
                    Market Trends
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Documentary Editing</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-3/4 h-full bg-green-500 rounded-full" />
                        </div>
                        <span className="text-sm font-medium">+15%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Social Media Content</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-4/5 h-full bg-blue-500 rounded-full" />
                        </div>
                        <span className="text-sm font-medium">+22%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Commercial Work</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-2/3 h-full bg-purple-500 rounded-full" />
                        </div>
                        <span className="text-sm font-medium">+8%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="p-6">
                  <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
                    <DollarSign className="w-5 h-5" />
                    Rate Insights
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Hourly Rate</span>
                      <span className="font-semibold">$85/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Project-based Avg.</span>
                      <span className="font-semibold">$3,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Top 10% Earners</span>
                      <span className="font-semibold">$150+/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Market Growth</span>
                      <span className="font-semibold text-green-600">+12% YoY</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}