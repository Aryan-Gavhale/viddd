import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Users,
  Briefcase,
  Plus,
  Eye,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Star,
  Filter,
  Search,
  MoreVertical,
  Download,
  Share2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import axiosInstance from "../../utils/axios";

export default function ClientJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDropdown, setShowDropdown] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/applications/client/jobs");
        const data = response.data.data;
        // Fetch applicants for each job
        const jobsWithApplicants = await Promise.all(
          data.map(async (job) => {
            try {
              const applicantsResponse = await axiosInstance.get(`/jobs/${job.id}/applications`);
              // Use .data.data.applications for compatibility with shortlist
              const applicantsData = applicantsResponse.data.data?.applications || applicantsResponse.data.data || [];
              return {
                ...job,
                applicants: applicantsData
              };
            } catch (error) {
              return {
                ...job,
                applicants: []
              };
            }
          })
        );
        setJobs(jobsWithApplicants);
        setError(null);
        setLoading(false);
      } catch (err) {
        setError("Something went wrong. Unable to fetch your jobs. Please try again later.");
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Hire and Reject handlers
  const handleHire = async (applicant) => {
    try {
      await axiosInstance.post(`/jobs/${selectedJob.id}/accept`, { freelancerId: applicant.freelancerId });
      // Refresh applicants list
      const applicantsResponse = await axiosInstance.get(`/jobs/${selectedJob.id}/applications`);
      const applicantsData = applicantsResponse.data.data?.applications || applicantsResponse.data.data || [];
      setSelectedJob({ ...selectedJob, applicants: applicantsData });
    } catch (error) {
      alert("Failed to hire applicant. Please try again.");
    }
  };
  const handleReject = async (applicant) => {
    try {
      await axiosInstance.post(`/jobs/${selectedJob.id}/reject`, { freelancerId: applicant.freelancerId });
      // Refresh applicants list
      const applicantsResponse = await axiosInstance.get(`/jobs/${selectedJob.id}/applications`);
      const applicantsData = applicantsResponse.data.data?.applications || applicantsResponse.data.data || [];
      setSelectedJob({ ...selectedJob, applicants: applicantsData });
    } catch (error) {
      alert("Failed to reject applicant. Please try again.");
    }
  };
  const handleChat = (applicant) => {
    // Implement chat navigation logic here
    alert(`Start chat with freelancerId: ${applicant.freelancerId}`);
  };

  const handleShowApplicants = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedJob(null);
    setShowDropdown(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "paused":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "paused":
        return <AlertCircle className="w-4 h-4" />;
      case "closed":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getApplicantStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "reviewed":
        return "bg-purple-100 text-purple-800";
      case "shortlisted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <div className="text-xl font-semibold text-gray-700">Loading your jobs...</div>
            <div className="text-gray-500 mt-2">Please wait while we fetch your job listings</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="flex justify-center items-center h-screen">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 max-w-md">
            <div className="text-center">
              <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
              <p className="text-red-600 mb-4">Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-white/20 p-8 mb-8 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                My Job Listings
              </h1>
              <p className="text-gray-600 text-lg">Manage your job postings and review talented applicants</p>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Briefcase className="w-4 h-4" />
                  <span>{jobs.length} Total Jobs</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{jobs.reduce((acc, job) => acc + (job.applicantCount || 0), 0)} Total Applicants</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>{jobs.reduce((acc, job) => acc + (job.views || 0), 0)} Total Views</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/jobposting")}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-3 font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create New Job
              </button>
              <button className="px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
              <button className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </button>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center border border-white/20">
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Briefcase className="w-12 h-12 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {searchTerm || filterStatus !== "all" ? "No jobs found" : "No jobs posted yet"}
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search criteria or filters to find what you're looking for."
                : "Create your first job posting to start receiving applications from talented professionals."}
            </p>
            <button
              onClick={() => navigate("/jobposting")}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-flex items-center gap-3 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Create Your First Job
            </button>
          </div>
        ) : (
          <div className="grid gap-8">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-3xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-8">
                  {/* Job Header */}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-2xl font-bold text-gray-800">{job.title}</h2>
                        <div
                          className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${getStatusColor(job.status)}`}
                        >
                          {getStatusIcon(job.status)}
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                        )}
                        {job.type && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{job.type}</span>
                          </div>
                        )}
                        {job.views && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{job.views} views</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <span className="text-xl font-bold text-green-600">{job.salary}</span>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setShowDropdown(showDropdown === job.id ? null : job.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        {showDropdown === job.id && (
                          <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[160px] z-10">
                            <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                              <Edit3 className="w-4 h-4" />
                              Edit Job
                            </button>
                            <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                              <Share2 className="w-4 h-4" />
                              Share Job
                            </button>
                            <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                              <Eye className="w-4 h-4" />
                              View Public
                            </button>
                            <hr className="my-2" />
                            <button className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600">
                              <Trash2 className="w-4 h-4" />
                              Delete Job
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  <p className="text-gray-700 mb-6 leading-relaxed">{job.description}</p>

                  {/* Job Stats and Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {job.applicantCount || 0} Applicant
                            {!job.applicantCount || job.applicantCount !== 1 ? "s" : ""}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.applicants?.filter((a) => a.status === "shortlisted").length || 0} shortlisted
                          </div>
                        </div>
                      </div>
                      {job.category && (
                        <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                          {job.category}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleShowApplicants(job)}
                        className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                          job.applicantCount > 0
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                        disabled={job.applicantCount === 0}
                      >
                        <Users className="w-4 h-4" />
                        View Applicants
                      </button>
                      <button className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Applicants Modal */}
        {showModal && selectedJob && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden relative">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Applicants for {selectedJob.title}</h3>
                    <p className="text-indigo-100">
                      {selectedJob.applicantCount || 0} candidate
                      {!selectedJob.applicantCount || selectedJob.applicantCount !== 1 ? "s" : ""} applied
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {(!selectedJob.applicants || selectedJob.applicants.length === 0) ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 p-6 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-2">No applicants yet</h4>
                    <p className="text-gray-500">Once candidates start applying, you'll see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedJob.applicants.map((applicant) => (
                      <div key={applicant.id} className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                          {/* Applicant Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="text-xl font-bold text-gray-800 mb-1">{applicant.freelancer ? `${applicant.freelancer.firstname} ${applicant.freelancer.lastname}` : `Applicant #${applicant.freelancerId}`}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Applied {applicant.createdAt ? new Date(applicant.createdAt).toLocaleDateString() : "N/A"}
                                  </span>
                                  {applicant.freelancer?.rating && (
                                    <span className="flex items-center gap-1">
                                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                      {applicant.freelancer.rating}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  applicant.status === "ACCEPTED"
                                    ? "bg-green-100 text-green-800"
                                    : applicant.status === "REJECTED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}>
                                  {applicant.status ? applicant.status.charAt(0) + applicant.status.slice(1).toLowerCase() : "Pending"}
                                </span>
                              </div>
                            </div>
                            {/* Proposal/Cover Letter */}
                            <div className="mb-4">
                              <h5 className="font-semibold text-gray-800 mb-2">Cover Letter:</h5>
                              <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="text-gray-700 leading-relaxed">{applicant.coverLetter || applicant.proposal || "No cover letter provided."}</p>
                              </div>
                            </div>
                          </div>
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 min-w-[160px]">
                            {applicant.status === "ACCEPTED" ? (
                              <button disabled className="px-4 py-2 bg-green-600 text-white rounded-lg cursor-not-allowed">Accepted</button>
                            ) : applicant.status === "REJECTED" ? (
                              <button disabled className="px-4 py-2 bg-red-600 text-white rounded-lg cursor-not-allowed">Rejected</button>
                            ) : (
                              <>
                                <button onClick={() => handleHire(applicant)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">Hire</button>
                                <button onClick={() => handleChat(applicant)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Chat</button>
                                <button onClick={() => handleReject(applicant)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">Reject</button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {selectedJob.applicantCount || 0} of {selectedJob.applicantCount || 0} applicants
                  </div>
                  <div className="flex gap-3">
                    <button className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Export List
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Close
                    </button>
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