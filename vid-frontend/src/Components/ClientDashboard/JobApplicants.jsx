"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";
import { openChatWidget } from "../../Hooks/useChat.js";
import {
  XCircle,
  CheckCircle,
  Eye,
  Star,
  Calendar,
  IndianRupee,
  MessageCircle,
  ArrowLeft,
  Briefcase,
  Clock,
  MapPin,
} from "lucide-react";

const SORT_OPTIONS = [
  { id: "createdAt", label: "Most Recent" },
  { id: "rating", label: "Highest Rated" },
  { id: "experience", label: "Experience" },
];

export default function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const sortApplicants = (list) => {
    const experienceWeight = { EXPERT: 3, INTERMEDIATE: 2, ENTRY: 1 };
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "rating") {
        cmp = (b.freelancer?.rating || 0) - (a.freelancer?.rating || 0);
      } else if (sortBy === "experience") {
        const ae = experienceWeight[a.freelancer?.freelancerProfile?.experienceLevel] || 0;
        const be = experienceWeight[b.freelancer?.freelancerProfile?.experienceLevel] || 0;
        cmp = be - ae;
      } else {
        cmp = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return sortDirection === "asc" ? -cmp : cmp;
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const jobResponse = await axiosInstance.get(`/jobs/${jobId}`);
      const jobData = jobResponse.data.data?.job || jobResponse.data.data;
      if (!jobData) throw new Error("Job not found");
      setJob(jobData);

      const applicantsResponse = await axiosInstance.get(`/jobs/${jobId}/applications`);
      const apps =
        applicantsResponse.data.data?.applications ||
        applicantsResponse.data.data ||
        [];
      setApplicants(Array.isArray(apps) ? apps : []);
    } catch (error) {
      console.error("[JobApplicants] Fetch error:", error);
      const status = error.response?.status;
      if (status === 401) {
        toast.error("Please log in to view applicants.");
        navigate("/login");
      } else if (status === 403) {
        toast.error("You are not authorized to view these applicants.");
        navigate("/client/jobs");
      } else if (status === 404) {
        toast.error("Job not found.");
        navigate("/client/jobs");
      } else {
        toast.error(error.response?.data?.message || "Failed to load applicants.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [jobId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmSelect = async () => {
    if (!selectedApplicant) return;
    const freelancerId = selectedApplicant.freelancerId || selectedApplicant.freelancer?.id;
    if (!freelancerId) {
      toast.error("Missing freelancer information.");
      return;
    }
    setActionLoading(`hire-${selectedApplicant.id}`);
    try {
      await axiosInstance.post(`/jobs/${jobId}/accept`, { freelancerId });
      toast.success("Applicant hired. Other applicants have been notified.");
      setShowConfirmModal(false);
      setSelectedApplicant(null);
      await fetchData();
      setTimeout(() => navigate("/client/dashboard?tab=active"), 1500);
    } catch (error) {
      console.error("[JobApplicants] Hire error:", error);
      toast.error(error.response?.data?.message || "Failed to hire applicant.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicant) => {
    const freelancerId = applicant.freelancerId || applicant.freelancer?.id;
    if (!freelancerId) {
      toast.error("Missing freelancer information.");
      return;
    }
    setActionLoading(`reject-${applicant.id}`);
    try {
      await axiosInstance.post(`/jobs/${jobId}/reject`, { freelancerId });
      toast.success("Applicant rejected.");
      await fetchData();
    } catch (error) {
      console.error("[JobApplicants] Reject error:", error);
      toast.error(error.response?.data?.message || "Failed to reject applicant.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortDirection("desc");
    }
  };

  const handleViewProfile = (freelancerId) => {
    navigate(`/freelancers/${freelancerId}`);
  };

  const handleChat = (applicant) => {
    if (!jobId) return;
    const freelancerId = applicant?.freelancerId || applicant?.freelancer?.id;
    if (!freelancerId) return;
    openChatWidget(Number(jobId), {
      id: freelancerId,
      firstname: applicant?.freelancer?.firstname,
      lastname: applicant?.freelancer?.lastname,
      avatar: applicant?.freelancer?.profilePicture,
    });
  };

  const visibleApplicants = sortApplicants(
    applicants.filter((a) => a.status !== "REJECTED")
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 animate-pulse">
        <div className="h-10 w-1/3 bg-gray-200 rounded mb-6" />
        <div className="h-32 bg-gray-100 rounded-2xl mb-6" />
        <div className="space-y-4">
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate("/client/jobs")}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Jobs
      </button>

      <h1 className="text-3xl font-bold mb-6">Job Applicants</h1>

      {job && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">{job.title}</h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Posted {new Date(job.createdAt).toLocaleDateString()}
            </div>
            {(job.budgetMin || job.budgetMax) && (
              <div className="flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                Budget ₹{Number(job.budgetMin || 0).toLocaleString("en-IN")} - ₹
                {Number(job.budgetMax || 0).toLocaleString("en-IN")}
              </div>
            )}
            {job.deadline && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Deadline {new Date(job.deadline).toLocaleDateString()}
              </div>
            )}
            {job.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </div>
            )}
            {job.projectLength && (
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {job.projectLength.replace(/_/g, " ").toLowerCase()}
              </div>
            )}
          </div>
        </div>
      )}

      {applicants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 text-lg">No applicants yet for this job.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSortChange(opt.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === opt.id
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {opt.label} {sortBy === opt.id && (sortDirection === "asc" ? "↑" : "↓")}
              </button>
            ))}
          </div>

          {visibleApplicants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <p className="text-gray-500">All remaining applicants have been processed.</p>
            </div>
          ) : (
            visibleApplicants.map((applicant) => {
              const fname = applicant.freelancer
                ? `${applicant.freelancer.firstname || ""} ${applicant.freelancer.lastname || ""}`.trim() ||
                  `Applicant #${applicant.freelancerId}`
                : `Applicant #${applicant.freelancerId}`;
              const isPending = !applicant.status || applicant.status === "PENDING";
              const isAccepted = applicant.status === "ACCEPTED";
              const skills = applicant.freelancer?.freelancerProfile?.skills || [];
              const profile = applicant.freelancer?.freelancerProfile || {};

              return (
                <div
                  key={applicant.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        {applicant.freelancer?.profilePicture ? (
                          <img
                            src={applicant.freelancer.profilePicture}
                            alt={fname}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {fname.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{fname}</h3>
                          {profile.jobTitle && (
                            <p className="text-gray-600 text-sm">{profile.jobTitle}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 mb-4">
                        {applicant.freelancer?.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            {applicant.freelancer.rating}/5
                          </div>
                        )}
                        {profile.hourlyRate && (
                          <div className="flex items-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            {Number(profile.hourlyRate).toLocaleString("en-IN")}/hr
                          </div>
                        )}
                        {profile.experienceLevel && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {profile.experienceLevel.toLowerCase()}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Applied{" "}
                          {applicant.createdAt
                            ? new Date(applicant.createdAt).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-medium mb-2 text-sm">Cover Letter</h4>
                        <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm">
                          {applicant.aboutFreelancer || "No cover letter provided."}
                        </p>
                      </div>

                      {Array.isArray(skills) && skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {skills.slice(0, 8).map((skill, idx) => (
                            <span
                              key={`${skill}-${idx}`}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <button
                        onClick={() =>
                          handleViewProfile(applicant.freelancerId || applicant.freelancer?.id)
                        }
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </button>
                      <button
                        onClick={() => handleChat(applicant)}
                        className="flex items-center justify-center px-4 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-sm"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat
                      </button>

                      {isPending ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedApplicant(applicant);
                              setShowConfirmModal(true);
                            }}
                            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Hire
                          </button>
                          <button
                            onClick={() => handleReject(applicant)}
                            disabled={actionLoading === `reject-${applicant.id}`}
                            className="flex items-center justify-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {actionLoading === `reject-${applicant.id}` ? "Rejecting..." : "Reject"}
                          </button>
                        </>
                      ) : isAccepted ? (
                        <span className="text-center py-2 text-green-600 font-medium bg-green-50 rounded-lg">
                          Hired
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showConfirmModal && selectedApplicant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Confirm Hire</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to hire{" "}
              <span className="font-semibold text-gray-900">
                {selectedApplicant.freelancer
                  ? `${selectedApplicant.freelancer.firstname || ""} ${selectedApplicant.freelancer.lastname || ""}`.trim()
                  : `Applicant #${selectedApplicant.freelancerId}`}
              </span>
              ? This will:
            </p>
            <ul className="list-disc list-inside mb-6 text-gray-600 space-y-1 text-sm">
              <li>Mark this job as Accepted and assign the freelancer</li>
              <li>Reject all other applicants automatically</li>
              <li>Send notifications to all candidates</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedApplicant(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={actionLoading?.startsWith("hire-")}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSelect}
                disabled={actionLoading?.startsWith("hire-")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading?.startsWith("hire-") ? "Hiring..." : "Confirm Hire"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
