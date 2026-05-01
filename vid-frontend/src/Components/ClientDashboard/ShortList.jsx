// src/components/Shortlist.jsx
"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";
import { openChatWidget } from "../../hooks/useChat";
import { Filter, Eye, MessageCircle, UserPlus, Star, Calendar, DollarSign, Users } from "lucide-react";

export default function Shortlist() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);

  // Helper function to log errors consistently
  const logError = (context, error) => {
    console.error(`[Shortlist] ${context}:`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
  };

  // Fetch jobs and user role
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user role
        let userRole = null;
        try {
          console.log("[Shortlist] Fetching user profile");
          const profileResponse = await axiosInstance.get("/user/profile");
          console.log("[Shortlist] Profile response:", profileResponse.data);
          userRole = profileResponse.data?.data?.role;
          if (userRole && userRole !== "CLIENT") {
            toast.error("Only clients can access the shortlist.");
            navigate("/jobs");
            return;
          }
        } catch (profileError) {
          logError("Profile fetch", profileError);
          const status = profileError.response?.status;
          if (status === 401 || status === 403) {
            toast.error("Session expired. Please log in again.");
            navigate("/login");
            return;
          } else {
            console.warn("[Shortlist] Profile fetch failed, proceeding without role check");
          }
        }

        // Fetch jobs
        console.log("[Shortlist] Fetching jobs");
        setIsLoading(true);
        const jobsResponse = await axiosInstance.get("/jobs", { params: { status: "OPEN" } });
        console.log("[Shortlist] Jobs response:", JSON.stringify(jobsResponse.data, null, 2));
        const jobsData = jobsResponse.data.data?.jobs || [];

        // Fetch applicant count for each job
        const jobsWithApplicantCount = await Promise.all(
          jobsData.map(async (job) => {
            try {
              const applicantsResponse = await axiosInstance.get(`/jobs/${job.id}/applications`);
              const applicantCount = applicantsResponse.data.data?.length || 0;
              return {
                ...job,
                applicationCount: applicantCount
              };
            } catch (error) {
              console.warn(`[Shortlist] Failed to fetch applicants for job ${job.id}:`, error);
              return {
                ...job,
                applicationCount: 0
              };
            }
          })
        );

        setJobs(jobsWithApplicantCount);
      } catch (error) {
        logError("Jobs fetch", error);
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          toast.error("Session expired. Please log in again.");
          navigate("/login");
        } else {
          toast.error("Failed to load jobs. Please try again.");
          setJobs([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Fetch applicants for a selected job
  const fetchApplicants = async (jobId) => {
    try {
      console.log(`[Shortlist] Fetching applicants for job ${jobId}`);
      setIsLoading(true);
      const response = await axiosInstance.get(`/jobs/${jobId}/applications`);
      console.log("[Shortlist] Applicants response:", JSON.stringify(response.data, null, 2));
      const applicantsData = response.data.data?.applications || [];
      setApplicants(
        applicantsData.map((app) => ({
          id: app.id,
          freelancerId: app.freelancerId,
          name: app.freelancer ? `${app.freelancer.firstname} ${app.freelancer.lastname}`.trim() : `Applicant #${app.freelancerId}`,
          avatar: app.freelancer?.avatar || "/placeholder.svg",
          rating: app.freelancer?.rating || 0,
          completedProjects: app.freelancer?.freelancerProfile?.completedProjects || 0,
          responseTime: app.freelancer?.freelancerProfile?.responseTime || "N/A",
          proposal: app.proposal || app.aboutFreelancer || "No proposal provided",
          skills: app.skills || [],
          price: app.price || 0,
          deliveryTime: app.deliveryTime || "N/A",
        }))
      );
    } catch (error) {
      logError(`Applicants fetch for job ${jobId}`, error);
      toast.error("Failed to load applicants. Please try again.");
      setApplicants([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to job applicants page
  const handleJobClick = (job) => {
    setSelectedJob(job.id);
    fetchApplicants(job.id);
  };

  // Handle hiring an applicant
  const handleHire = async (applicant) => {
    try {
      console.log(`[Shortlist] Hiring applicant ${applicant.id} for job ${selectedJob}`);
      await axiosInstance.post(`/jobs/${selectedJob}/accept`, {
        freelancerId: applicant.freelancerId,
      });
      toast.success(`Successfully hired ${applicant.name}`);
      // Redirect to ProjectTracker Active tab
      setTimeout(() => {
        navigate("/client/dashboard?tab=active");
      }, 2000);
    } catch (error) {
      logError(`Hire applicant ${applicant.id}`, error);
      toast.error("Failed to hire applicant. Please try again.");
    }
  };

  // Navigate to freelancer profile
  const handleViewProfile = (applicant) => {
    console.log(`[Shortlist] Navigating to profile for freelancer ${applicant.freelancerId}`);
    navigate(`/freelancers/${applicant.freelancerId}`);
  };

  // Open the floating chat widget for the selected job/applicant.
  const handleChat = (applicant) => {
    if (!selectedJob?.id) {
      toast.info("Select a job first to chat about it.");
      return;
    }
    openChatWidget(selectedJob.id, {
      id: applicant.freelancerId,
      firstname: applicant.name?.split(" ")[0],
      lastname: applicant.name?.split(" ").slice(1).join(" "),
      avatar: applicant.avatar || applicant.profilePicture,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Job Shortlist</h1>

      {!selectedJob ? (
        <>
          {/* Jobs List */}
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
              <div className="p-6 border-b border-gray-200/50">
                <h2 className="text-xl font-semibold text-gray-900">Posted Jobs</h2>
                <p className="text-gray-600 mt-1">Manage your job postings and review applicants</p>
              </div>

              <div className="divide-y divide-gray-200/50">
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-6 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/client/jobs/${job.id}/applicants`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{job.title}</h3>
                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Posted {new Date(job.createdAt).toLocaleDateString("en-US")}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {job.applicationCount || 0} applicants
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              ₹{Number(job.budgetMin || 0).toLocaleString("en-IN")} - ₹{Number(job.budgetMax || 0).toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              job.status === "OPEN"
                                ? "bg-green-100 text-green-800"
                                : job.status === "CANCELLED"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                            View Applicants
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new job.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedJob(null);
              setApplicants([]);
            }}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            ← Back to Jobs
          </button>

          {/* Applicants List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50">
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Job Applicants</h2>
                  <p className="text-gray-600 mt-1">{applicants.length} freelancers applied</p>
                </div>
                <div className="flex space-x-3">
                  <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </button>
                  <select
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      console.log(`[Shortlist] Sorting by ${e.target.value}`);
                      // Implement sorting logic if needed
                    }}
                  >
                    <option>Sort by Rating</option>
                    <option>Sort by Price</option>
                    <option>Sort by Delivery Time</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200/50">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : applicants.length > 0 ? (
                applicants.map((applicant) => (
                  <div key={applicant.id} className="p-6">
                    <div className="flex items-start space-x-4">
                      <img
                        src={applicant.avatar}
                        alt={applicant.name}
                        className="w-16 h-16 rounded-full"
                        onError={(e) => (e.target.src = "/placeholder.svg")}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{applicant.name}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
                                {applicant.rating}/5 ({applicant.completedProjects} projects)
                              </div>
                              <span>Responds in {applicant.responseTime}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">₹{Number(applicant.price).toLocaleString("en-IN")}</p>
                            <p className="text-sm text-gray-500">in {applicant.deliveryTime}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-gray-700 mb-3">{applicant.proposal}</p>
                          <div className="flex flex-wrap gap-2">
                            {applicant.skills.map((skill, index) => (
                              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleViewProfile(applicant)}
                              className="flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              aria-label={`View profile of ${applicant.name}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </button>
                            <button
                              onClick={() => handleChat(applicant)}
                              className="flex items-center px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              aria-label={`Chat with ${applicant.name}`}
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Chat
                            </button>
                          </div>
                          <button
                            onClick={() => handleHire(applicant)}
                            className="flex items-center px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                            aria-label={`Hire ${applicant.name}`}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Hire
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No applicants found</h3>
                  <p className="mt-1 text-sm text-gray-500">No freelancers have applied to this job yet.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}