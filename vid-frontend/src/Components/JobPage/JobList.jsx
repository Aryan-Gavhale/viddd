import { memo, useMemo } from "react";
import {
  Heart,
  MapPin,
  Users,
  Clock,
  Briefcase,
  Building2,
  CheckCircle2,
  IndianRupee,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const JobList = memo(function JobList({ jobs, activeTab, searchQuery, savedJobs, toggleSaveJob }) {
  const navigate = useNavigate();

  const filteredJobs = useMemo(() => jobs
    .filter(
      (job) =>
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.requiredSkills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (activeTab === "most-recent") {
        return new Date(b.postedTime) - new Date(a.postedTime);
      } else if (activeTab === "best-matches") {
        const scoreA = a.budgetMax + a.requiredSkills.length * 10 + (a.isVerified ? 20 : 0);
        const scoreB = b.budgetMax + b.requiredSkills.length * 10 + (b.isVerified ? 20 : 0);
        return scoreB - scoreA;
      }
      return 0;
    })
    .filter((job) => activeTab !== "saved" || savedJobs.includes(job.id)),
  [jobs, activeTab, searchQuery, savedJobs]);

  // Format currency with Indian Rupee symbol
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
  };

  // Calculate time ago from date
  const getTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
      const diffInYears = Math.floor(diffInMonths / 12);
      return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
    } catch (e) {
      return "Recently";
    }
  };

  // Get difficulty level text and color
  const getDifficultyInfo = (difficulty) => {
    const normalized = difficulty.toLowerCase();
    if (normalized.includes("easy") || normalized.includes("beginner")) {
      return { text: "Easy", color: "green" };
    } else if (normalized.includes("inter") || normalized.includes("medium")) {
      return { text: "Intermediate", color: "amber" };
    } else if (normalized.includes("hard") || normalized.includes("expert") || normalized.includes("advanced")) {
      return { text: "Hard", color: "red" };
    }
    return { text: "Intermediate", color: "amber" };
  };

  return (
    <div className="space-y-4">
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-12 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <Briefcase className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">No jobs found</h3>
          <p className="mb-6 text-gray-600">
            {activeTab === "saved"
              ? "You haven't saved any jobs matching your search criteria."
              : "No jobs match your current search criteria. Try adjusting your filters."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-indigo-100 px-6 py-2 font-medium text-indigo-600 transition-colors hover:bg-indigo-200"
          >
            Refresh Jobs
          </button>
        </div>
      ) : (
        filteredJobs.map((job) => (
          <div
            key={job.id}
            className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white transition-all duration-200 hover:border-indigo-100 hover:shadow-sm cursor-pointer"
            onClick={() => navigate(`/job/${job.id}`)} // Navigate to job description
          >
            <div className="relative p-6">
              {/* Header */}
              <div className="mb-5 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${job.categoryColor}-50 p-2`}
                  >
                    <Building2 className={`h-6 w-6 text-${job.categoryColor}-500`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-200 group-hover:text-indigo-600">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{job.company}</span>
                      {job.isVerified && (
                        <div className="flex items-center gap-1 text-blue-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-xs">Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`rounded-full bg-${job.categoryColor}-50 px-3 py-1`}>
                    <span className={`text-xs font-medium text-${job.categoryColor}-600`}>{job.category[0]}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent navigation when saving
                      toggleSaveJob(job.id);
                    }}
                    className="group/save relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
                    aria-label={savedJobs.includes(job.id) ? "Unsave job" : "Save job"}
                  >
                    <Heart
                      className={`h-5 w-5 transition-all duration-200 ${
                        savedJobs.includes(job.id)
                          ? "fill-indigo-500 text-indigo-500"
                          : "text-gray-400 group-hover/save:text-indigo-500"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Job Details Grid */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <IndianRupee className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium">
                      ₹{formatCurrency(job.budgetMin)} - ₹{formatCurrency(job.budgetMax)}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <span className={`font-medium text-${getDifficultyInfo(job.jobDifficulty).color}-600`}>
                      {getDifficultyInfo(job.jobDifficulty).text}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium">{job.projectLength}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium">{job.location}</span>
                  </div>
                </div>
              </div>

              {/* Skills section */}
              {job.requiredSkills.length > 0 && (
                <div className="mb-5">
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.slice(0, 5).map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.requiredSkills.length > 5 && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        +{job.requiredSkills.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {getTimeAgo(job.postedTime)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.proposals} {job.proposals === 1 ? "proposal" : "proposals"}
                  </span>
                </div>
                <button className="flex items-center gap-1 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition-all duration-200 hover:bg-indigo-100 hover:gap-2">
                  Apply Now
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
});