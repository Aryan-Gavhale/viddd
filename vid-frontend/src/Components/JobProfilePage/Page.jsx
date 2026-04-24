"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  DollarSign,
  MapPin,
  Briefcase,
  Star,
  Play,
  ChevronRight,
  Users,
  Shield,
  Youtube,
  Heart,
  Award,
  Zap,
  Calendar,
  MessageCircle,
  TrendingUp,
  Coffee,
  Monitor,
} from "react-feather"

export default function JobProfile() {
  const [isSaved, setIsSaved] = useState(false)
  const [selectedTab, setSelectedTab] = useState("overview")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-8">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-md">
                  <Youtube className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-gray-600 font-medium">GameStream Studios</span>
                <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-semibold">
                  Verified Client
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                YouTube Content Editor - Gaming Channel
              </h1>

              <p className="text-lg text-gray-600">
                Join our creative team to produce engaging gaming content that captivates millions
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-gray-900">$25-35/hr</span>
                  <span className="text-green-500 font-medium">Funded</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Intermediate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Long term</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Remote</span>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-6 border-b border-gray-200">
              {["overview", "requirements", "company", "reviews"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    selectedTab === tab
                      ? "text-indigo-600 border-b-2 border-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {selectedTab === "overview" && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Role</h2>
                      <p className="text-gray-600">
                        We're seeking a creative video editor for our gaming YouTube channel with 500K+ subscribers.
                        You'll be responsible for creating engaging, fast-paced gaming montages with effects and smooth
                        transitions. The ideal candidate will have experience with gaming content and understand what
                        makes YouTube gaming videos successful.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Responsibilities</h3>
                      <ul className="grid sm:grid-cols-2 gap-4">
                        {[
                          {
                            icon: Monitor,
                            title: "Video Production",
                            desc: "Create engaging gaming montages and highlights",
                          },
                          {
                            icon: Zap,
                            title: "Effects & Transitions",
                            desc: "Add professional effects and smooth transitions",
                          },
                          {
                            icon: TrendingUp,
                            title: "SEO Optimization",
                            desc: "Optimize videos for YouTube algorithm",
                          },
                          {
                            icon: Coffee,
                            title: "Brand Consistency",
                            desc: "Maintain consistent style and quality",
                          },
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="mt-1">
                              <item.icon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{item.title}</h4>
                              <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Metrics</h3>
                      <dl className="grid sm:grid-cols-3 gap-4">
                        {[
                          {
                            label: "Average Video Length",
                            value: "10-15 minutes",
                            icon: Clock,
                          },
                          {
                            label: "Videos per Week",
                            value: "3-4",
                            icon: Calendar,
                          },
                          {
                            label: "Target Audience",
                            value: "Gaming (13-25)",
                            icon: Users,
                          },
                        ].map((metric, i) => (
                          <div key={i} className="flex flex-col">
                            <dt className="text-sm text-gray-500 mb-1">{metric.label}</dt>
                            <dd className="text-base font-medium text-gray-900 flex items-center gap-2">
                              <metric.icon className="w-4 h-4 text-indigo-600" />
                              {metric.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Sample Video Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Work</h3>
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20(66)-aMcknwyDEq5Cyai9upvRp9m0TrEyAm.png"
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button className="p-3 rounded-full bg-white/80 hover:bg-white transition-colors">
                            <Play className="w-8 h-8 text-indigo-600" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        Sample Work: Epic Gaming Montage (Duration: 2:45)
                      </div>
                    </div>
                  </div>
                )}

                {selectedTab === "requirements" && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Video Editing",
                          "After Effects",
                          "Premiere Pro",
                          "Motion Graphics",
                          "Color Grading",
                          "Sound Design",
                          "Gaming Knowledge",
                          "YouTube SEO",
                        ].map((skill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-md bg-indigo-50 text-indigo-600 text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Tools & Software</h3>
                      <ul className="space-y-4">
                        {[
                          { name: "Adobe Premiere Pro", level: "Expert", years: "3+ years" },
                          { name: "After Effects", level: "Advanced", years: "2+ years" },
                          { name: "DaVinci Resolve", level: "Intermediate", years: "1+ year" },
                          { name: "Photoshop", level: "Intermediate", years: "2+ years" },
                        ].map((tool, i) => (
                          <li key={i} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{tool.name}</span>
                              <span className="text-sm text-gray-500">{tool.years}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{
                                  width: tool.level === "Expert" ? "90%" : tool.level === "Advanced" ? "75%" : "60%",
                                }}
                              />
                            </div>
                            <div className="text-sm text-indigo-600">{tool.level}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedTab === "company" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">GameStream Studios</h3>
                      <p className="text-gray-600 mb-4">
                        GameStream Studios is a leading gaming content creator on YouTube, focusing on high-quality
                        gaming montages, reviews, and entertainment content for our growing community of 500K+
                        subscribers.
                      </p>
                      <dl className="grid sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <dt className="text-gray-500">Founded</dt>
                          <dd className="font-medium text-gray-900">2020</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Employees</dt>
                          <dd className="font-medium text-gray-900">10-50</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Industry</dt>
                          <dd className="font-medium text-gray-900">Gaming & Entertainment</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 p-4 bg-indigo-50 rounded-md">
                        <div className="text-2xl font-bold text-indigo-600">500K+</div>
                        <div className="text-sm text-gray-500">YouTube Subscribers</div>
                      </div>
                      <div className="flex-1 p-4 bg-indigo-50 rounded-md">
                        <div className="text-2xl font-bold text-indigo-600">50M+</div>
                        <div className="text-sm text-gray-500">Monthly Views</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTab === "reviews" && (
                  <div className="space-y-6">
                    {[
                      {
                        name: "Alex Thompson",
                        role: "Video Editor",
                        rating: 5,
                        comment: "Great team to work with! Clear communication and timely payments.",
                        date: "2 months ago",
                      },
                      {
                        name: "Sarah Chen",
                        role: "Motion Designer",
                        rating: 5,
                        comment: "Professional environment and exciting projects. Highly recommended!",
                        date: "3 months ago",
                      },
                    ].map((review, i) => (
                      <div key={i} className="border-b border-gray-200 pb-6 last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{review.name}</h4>
                            <p className="text-sm text-gray-500">{review.role}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array(review.rating)
                              .fill(null)
                              .map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 stroke-yellow-400" />
                              ))}
                          </div>
                        </div>
                        <p className="text-gray-600 mb-2">{review.comment}</p>
                        <div className="text-sm text-gray-500">{review.date}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div>
            <div className="sticky top-6 space-y-6">
              {/* Apply Button */}
              <div className="bg-white border border-gray-200 rounded-md p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Project Budget</h3>
                    <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium">Funded</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Hourly Rate</span>
                    <span className="font-medium text-gray-900">$25-35/hr</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Weekly Hours</span>
                    <span className="font-medium text-gray-900">20-30 hrs</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Project Length</span>
                    <span className="font-medium text-gray-900">6+ months</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-medium">Potential Earnings</span>
                      <span className="text-xl font-bold text-indigo-600">$2,000-4,200/mo</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button className="w-full py-2 px-4 rounded-md bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors">
                    Apply Now
                  </button>
                  <button
                    onClick={() => setIsSaved(!isSaved)}
                    className={`w-full py-2 px-4 rounded-md border font-medium text-sm transition-colors ${
                      isSaved
                        ? "bg-pink-50 border-pink-200 text-pink-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Heart className={`inline-block w-4 h-4 mr-2 ${isSaved ? "fill-pink-500 stroke-pink-500" : ""}`} />
                    {isSaved ? "Saved" : "Save Job"}
                  </button>
                </div>
              </div>

              {/* Project Stats */}
              <div className="bg-white border border-gray-200 rounded-md p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Project Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      Proposals
                    </div>
                    <span className="font-medium text-gray-900">8 candidates</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MessageCircle className="w-4 h-4" />
                      Interview Rate
                    </div>
                    <span className="font-medium text-gray-900">75%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Posted
                    </div>
                    <span className="font-medium text-gray-900">1 day ago</span>
                  </div>
                </div>
              </div>

              {/* Trust Factors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-md p-4 flex items-start gap-3">
                  <div className="p-2 rounded-md bg-green-100">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">Payment Verified</div>
                    <div className="text-xs text-gray-500">Funds Secured</div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-md p-4 flex items-start gap-3">
                  <div className="p-2 rounded-md bg-blue-100">
                    <Award className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">Top Client</div>
                    <div className="text-xs text-gray-500">5.0 Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

