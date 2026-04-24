import { useState, useEffect, useCallback } from "react"
import { Search, Filter } from 'lucide-react'
import { Sidebar } from "./Sidebar"
import { EmptySavedJobs } from "./EmptySavedJobs"
import { JobList } from "./JobList"
import axiosInstance from "../../utils/axios"

export function JobBoard() {
  const [activeTab, setActiveTab] = useState("best-matches")
  const [searchQuery, setSearchQuery] = useState("")
  const [savedJobs, setSavedJobs] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch jobs from backend on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get("/jobs/all")

        let fetchedJobs = []
        // Check if response.data.data.jobs exists and is an array
        if (response.data.data && Array.isArray(response.data.data.jobs)) {
          fetchedJobs = response.data.data.jobs.map((job) => mapJobData(job))
        } else if (Array.isArray(response.data.data)) {
          // If response.data.data is the array directly
          fetchedJobs = response.data.data.map((job) => mapJobData(job))
        } else {
          console.warn("No jobs found or unexpected format:", response.data.data)
          fetchedJobs = [] // Set empty array if no jobs
        }

        setJobs(fetchedJobs)
      } catch (err) {
        console.error("Error fetching jobs:", err)
        setError("Failed to load jobs. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  // Map job data to our format with proper defaults
  const mapJobData = (job) => ({
    id: job._id || job.id,
    title: job.title,
    description: job.description,
    category: job.category || ["Unknown"],
    budgetMin: job.budgetMin || 0,
    budgetMax: job.budgetMax || 0,
    jobDifficulty: job.jobDifficulty || "Unknown",
    projectLength: formatProjectLength(job.projectLength || "Unknown"),
    requiredSkills: job.requiredSkills || [],
    tools: job.tools || [],
    scope: job.scope || "Not specified",
    postedById: job.postedById || 1,
    name: job.name || "Anonymous",
    email: job.email || "N/A",
    company: job.company || "Unknown",
    postedTime: job.createdAt || new Date().toISOString(),
    isVerified: job.isVerified !== undefined ? job.isVerified : true,
    location: job.location || "Remote",
    proposals: job.proposals || 0,
    categoryColor: getCategoryColor(job.category && job.category[0] ? job.category[0] : "unknown"),
  })

  // Format project length (e.g., SHORT_TERM to Short Term)
  const formatProjectLength = (length) => {
    if (!length) return "Unknown"
    
    // Handle cases like SHORT_TERM, LONG_TERM, etc.
    if (length.includes("_")) {
      return length
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
    }
    
    return length
  }

  // Load saved jobs from localStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("savedJobs")
    if (saved) {
      setSavedJobs(JSON.parse(saved))
    }
  }, [])

  const toggleSaveJob = useCallback((jobId) => {
    setSavedJobs((prev) => {
      const newSaved = prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
      sessionStorage.setItem("savedJobs", JSON.stringify(newSaved))
      return newSaved
    })
  }, []);

  // Helper to assign category colors
  const getCategoryColor = (category) => {
    const colors = {
      wedding: "blue",
      corporate: "emerald",
      social: "purple",
      music: "rose",
      unknown: "slate",
    }
    return colors[category.toLowerCase()] || "slate"
  }

  // Generate skeleton loaders for loading state
  const renderSkeletons = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div key={index} className="animate-pulse rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gray-200"></div>
              <div>
                <div className="mb-2 h-5 w-48 rounded bg-gray-200"></div>
                <div className="h-4 w-32 rounded bg-gray-200"></div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-20 rounded-full bg-gray-200"></div>
              <div className="h-10 w-10 rounded-xl bg-gray-200"></div>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-200"></div>
              ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="flex items-center gap-4">
              <div className="h-4 w-32 rounded bg-gray-200"></div>
              <div className="h-4 w-24 rounded bg-gray-200"></div>
            </div>
            <div className="h-9 w-24 rounded-lg bg-gray-200"></div>
          </div>
        </div>
      ))
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />

      <div className="flex-1 overflow-hidden">
        {/* Header with search and tabs */}
        <div className="sticky top-0 z-10 bg-white px-6 py-6 shadow-sm">
          <div className="relative mx-auto mb-8 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for freelance jobs..."
              className="h-12 w-full rounded-full border border-gray-200 bg-white pl-12 pr-12 text-base shadow-sm outline-none transition-all duration-200 ease-in-out placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {showFilters && (
            <div className="mx-auto mb-6 max-w-4xl animate-fadeIn rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
                  <select className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-50">
                    <option>All Categories</option>
                    <option>Wedding</option>
                    <option>Corporate</option>
                    <option>Social</option>
                    <option>Music</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Budget Range</label>
                  <select className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-50">
                    <option>Any Budget</option>
                    <option>₹1,000 - ₹5,000</option>
                    <option>₹5,000 - ₹10,000</option>
                    <option>₹10,000 - ₹50,000</option>
                    <option>₹50,000+</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Project Length</label>
                  <select className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-50">
                    <option>Any Duration</option>
                    <option>Short Term</option>
                    <option>Medium Term</option>
                    <option>Long Term</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center">
            {["best-matches", "most-recent", "saved"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`group relative px-6 py-3 text-base font-medium transition-all duration-200 ${
                  activeTab === tab ? "text-indigo-600" : "text-gray-600 hover:text-indigo-600"
                }`}
              >
                <span>
                  {tab
                    .split("-")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </span>
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full bg-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="h-[calc(100vh-180px)] overflow-y-auto bg-gray-50 px-6 py-8">
          <div className="mx-auto max-w-5xl">
            {loading ? (
              <div className="space-y-6">{renderSkeletons()}</div>
            ) : error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            ) : activeTab === "saved" && savedJobs.length === 0 ? (
              <EmptySavedJobs />
            ) : (
              <JobList
                jobs={jobs}
                activeTab={activeTab}
                searchQuery={searchQuery}
                savedJobs={savedJobs}
                toggleSaveJob={toggleSaveJob}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
