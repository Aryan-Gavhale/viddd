import { useState, useEffect, useCallback } from "react";
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
  MapPin,
  Clock,
  Star,
  Filter,
  Search,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  XCircle,
  IndianRupee,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";
import { openChatWidget } from "../../hooks/useChat";

const STATUS_META = {
  OPEN: { label: "Open", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  ACCEPTED: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-200", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

function formatBudget(min, max) {
  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  if (!min && !max) return "Not specified";
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt(min || max);
}

function getStatusMeta(status) {
  return STATUS_META[status] || { label: status || "Unknown", color: "bg-gray-100 text-gray-800 border-gray-200", icon: AlertCircle };
}

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
  const [actionLoading, setActionLoading] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/applications/client/jobs");
      const data = Array.isArray(response.data.data) ? response.data.data : [];

      const jobsWithApplicants = await Promise.all(
        data.map(async (job) => {
          try {
            const applicantsResponse = await axiosInstance.get(`/jobs/${job.id}/applications`);
            const applicantsData =
              applicantsResponse.data.data?.applications ||
              applicantsResponse.data.data ||
              [];
            return { ...job, applicants: Array.isArray(applicantsData) ? applicantsData : [] };
          } catch {
            return { ...job, applicants: [] };
          }
        })
      );
      setJobs(jobsWithApplicants);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to fetch your jobs. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const refreshSelectedJob = async (jobId) => {
    try {
      const applicantsResponse = await axiosInstance.get(`/jobs/${jobId}/applications`);
      const applicantsData =
        applicantsResponse.data.data?.applications ||
        applicantsResponse.data.data ||
        [];
      const fresh = Array.isArray(applicantsData) ? applicantsData : [];
      setSelectedJob((prev) => (prev ? { ...prev, applicants: fresh } : prev));
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, applicants: fresh } : j)));
    } catch (err) {
      console.error("Failed to refresh applicants", err);
    }
  };

  const handleHire = async (applicant) => {
    if (!selectedJob) return;
    setActionLoading(`hire-${applicant.id}`);
    try {
      await axiosInstance.post(`/jobs/${selectedJob.id}/accept`, {
        freelancerId: applicant.freelancerId,
      });
      toast.success(`Hired ${applicant.freelancer?.firstname || "applicant"}. Other candidates were notified.`);
      await refreshSelectedJob(selectedJob.id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to hire applicant. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicant) => {
    if (!selectedJob) return;
    setActionLoading(`reject-${applicant.id}`);
    try {
      await axiosInstance.post(`/jobs/${selectedJob.id}/reject`, {
        freelancerId: applicant.freelancerId,
      });
      toast.success("Applicant rejected.");
      await refreshSelectedJob(selectedJob.id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject applicant.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleChat = (applicant) => {
    if (!selectedJob) return;
    openChatWidget(selectedJob.id, {
      id: applicant.freelancerId,
      firstname: applicant.freelancer?.firstname,
      lastname: applicant.freelancer?.lastname,
      avatar: applicant.freelancer?.profilePicture,
    });
  };

  const handleViewProfile = (applicant) => {
    navigate(`/freelancers/${applicant.freelancerId}`);
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

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;
    try {
      await axiosInstance.delete(`/jobs/${jobId}`);
      toast.success("Job deleted.");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setShowDropdown(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete job.");
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (job.title || "").toLowerCase().includes(term) ||
      (job.description || "").toLowerCase().includes(term);
    const matchesFilter = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalApplicants = jobs.reduce((acc, job) => acc + (job.applicants?.length || 0), 0);
  const openJobsCount = jobs.filter((j) => j.status === "OPEN").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-pulse">
          <div className="h-32 bg-white rounded-3xl" />
          <div className="h-20 bg-white rounded-2xl" />
          <div className="h-48 bg-white rounded-3xl" />
          <div className="h-48 bg-white rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex justify-center items-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-200 max-w-md text-center">
          <div className="bg-red-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchJobs}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                My Job Listings
              </h1>
              <p className="text-gray-600 text-lg">Manage your job postings and review talented applicants</p>
              <div className="flex flex-wrap items-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Briefcase className="w-4 h-4" />
                  <span>{jobs.length} Total Jobs</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4" />
                  <span>{openJobsCount} Open</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{totalApplicants} Total Applicants</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/client/jobs/new")}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-3 font-semibold self-start"
            >
              <Plus className="w-5 h-5" />
              Create New Job
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white min-w-[160px]"
            >
              <option value="all">All Status</option>
              <option value="OPEN">Open</option>
              <option value="ACCEPTED">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
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
                ? "Try adjusting your search or filters."
                : "Create your first job posting to start receiving applications."}
            </p>
            <button
              onClick={() => navigate("/client/jobs/new")}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg inline-flex items-center gap-3 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Create Your First Job
            </button>
          </div>
        ) : (
          <div className="grid gap-8">
            {filteredJobs.map((job) => {
              const statusMeta = getStatusMeta(job.status);
              const StatusIcon = statusMeta.icon;
              const applicantCount = job.applicants?.length || 0;
              const shortlistedCount = job.applicants?.filter((a) => a.status === "SHORTLISTED").length || 0;
              const acceptedCount = job.applicants?.filter((a) => a.status === "ACCEPTED").length || 0;

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all"
                >
                  <div className="p-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h2 className="text-2xl font-bold text-gray-800">{job.title}</h2>
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${statusMeta.color}`}
                          >
                            <StatusIcon className="w-4 h-4" />
                            {statusMeta.label}
                          </div>
                          {job.isVerified && (
                            <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                          </div>
                          {job.deadline && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>Deadline {new Date(job.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                          {job.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{job.location}</span>
                            </div>
                          )}
                          {job.projectLength && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              <span>{job.projectLength.replace(/_/g, " ").toLowerCase()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-5 h-5 text-green-600" />
                          <span className="text-xl font-bold text-green-600">
                            {formatBudget(job.budgetMin, job.budgetMax)}
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setShowDropdown(showDropdown === job.id ? null : job.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {showDropdown === job.id && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[180px] z-10">
                              <button
                                onClick={() => navigate(`/jobs/${job.id}`)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                <Eye className="w-4 h-4" />
                                View Public
                              </button>
                              <button
                                onClick={() => navigate(`/client/jobs/${job.id}/edit`)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit Job
                              </button>
                              <hr className="my-2" />
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Job
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-6 leading-relaxed line-clamp-3">{job.description}</p>

                    {Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {job.requiredSkills.slice(0, 6).map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 6 && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            +{job.requiredSkills.length - 6} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {applicantCount} Applicant{applicantCount !== 1 ? "s" : ""}
                            </div>
                            <div className="text-sm text-gray-500">
                              {acceptedCount > 0
                                ? `${acceptedCount} hired`
                                : shortlistedCount > 0
                                ? `${shortlistedCount} shortlisted`
                                : "Awaiting your review"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleShowApplicants(job)}
                          className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                            applicantCount > 0
                              ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          disabled={applicantCount === 0}
                        >
                          <Users className="w-4 h-4" />
                          View Applicants
                        </button>
                        <button
                          onClick={() => navigate(`/client/jobs/${job.id}/applicants`)}
                          className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Full Page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Applicants Modal */}
        {showModal && selectedJob && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Applicants for {selectedJob.title}</h3>
                    <p className="text-indigo-100">
                      {selectedJob.applicants?.length || 0} candidate
                      {(selectedJob.applicants?.length || 0) !== 1 ? "s" : ""} applied
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

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {!selectedJob.applicants || selectedJob.applicants.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 p-6 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400" />
                    </div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-2">No applicants yet</h4>
                    <p className="text-gray-500">Once candidates apply, you'll see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedJob.applicants.map((applicant) => {
                      const fname = applicant.freelancer
                        ? `${applicant.freelancer.firstname || ""} ${applicant.freelancer.lastname || ""}`.trim()
                        : `Applicant #${applicant.freelancerId}`;
                      const isPending = !applicant.status || applicant.status === "PENDING";
                      const isAccepted = applicant.status === "ACCEPTED";
                      const isRejected = applicant.status === "REJECTED";
                      const statusBadge = isAccepted
                        ? "bg-green-100 text-green-800"
                        : isRejected
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800";
                      const statusLabel = isAccepted ? "Hired" : isRejected ? "Rejected" : "Pending";

                      return (
                        <div
                          key={applicant.id}
                          className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                  {applicant.freelancer?.profilePicture ? (
                                    <img
                                      src={applicant.freelancer.profilePicture}
                                      alt={fname}
                                      className="w-12 h-12 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                      {fname.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-lg font-bold text-gray-800">{fname}</h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {applicant.createdAt
                                          ? new Date(applicant.createdAt).toLocaleDateString()
                                          : "—"}
                                      </span>
                                      {applicant.freelancer?.rating > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                          {applicant.freelancer.rating}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge}`}>
                                  {statusLabel}
                                </span>
                              </div>

                              {applicant.freelancer?.freelancerProfile?.jobTitle && (
                                <p className="text-sm text-gray-600 mb-3 font-medium">
                                  {applicant.freelancer.freelancerProfile.jobTitle}
                                </p>
                              )}

                              <div className="mb-4">
                                <h5 className="font-semibold text-gray-800 mb-2 text-sm">Cover Letter</h5>
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                  <p className="text-gray-700 leading-relaxed text-sm">
                                    {applicant.aboutFreelancer || "No cover letter provided."}
                                  </p>
                                </div>
                              </div>

                              {Array.isArray(applicant.freelancer?.freelancerProfile?.skills) &&
                                applicant.freelancer.freelancerProfile.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {applicant.freelancer.freelancerProfile.skills.slice(0, 5).map((s) => (
                                      <span
                                        key={s}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg"
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 min-w-[160px]">
                              <button
                                onClick={() => handleViewProfile(applicant)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Profile
                              </button>
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleHire(applicant)}
                                    disabled={actionLoading === `hire-${applicant.id}`}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                                  >
                                    {actionLoading === `hire-${applicant.id}` ? "Hiring..." : "Hire"}
                                  </button>
                                  <button
                                    onClick={() => handleChat(applicant)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                  >
                                    Chat
                                  </button>
                                  <button
                                    onClick={() => handleReject(applicant)}
                                    disabled={actionLoading === `reject-${applicant.id}`}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                                  >
                                    {actionLoading === `reject-${applicant.id}` ? "Rejecting..." : "Reject"}
                                  </button>
                                </>
                              ) : (
                                <button
                                  disabled
                                  className={`px-4 py-2 rounded-lg cursor-not-allowed text-sm font-medium ${
                                    isAccepted
                                      ? "bg-green-600 text-white"
                                      : "bg-red-600 text-white"
                                  }`}
                                >
                                  {statusLabel}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
