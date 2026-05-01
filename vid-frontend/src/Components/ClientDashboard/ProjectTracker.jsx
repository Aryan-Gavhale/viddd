// src/components/ProjectTracker.jsx
"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";
import { openChatWidget } from "../../hooks/useChat";
import {
  Search,
  Filter,
  Eye,
  MessageCircle,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Tag,
} from "lucide-react";

export default function ProjectTracker() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState({
    active: [],
    pending: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    { id: "active", name: "Active Projects", count: categories.active.length },
    { id: "pending", name: "Pending Projects", count: categories.pending.length },
    { id: "completed", name: "Completed Projects", count: categories.completed.length },
  ];

  // Helper function to log errors consistently
  const logError = (context, error) => {
    console.error(`[ProjectTracker] ${context}:`, {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
  };

  // Fetch jobs and orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user role
        let userRole = null;
        try {
          console.log("[ProjectTracker] Fetching user profile");
          const profileResponse = await axiosInstance.get("/user/profile");
          console.log("[ProjectTracker] Profile response:", profileResponse.data);
          userRole = profileResponse.data?.data?.role;
          if (userRole && userRole !== "CLIENT") {
            toast.error("Only clients can access project tracker.");
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
            console.warn("[ProjectTracker] Profile fetch failed, proceeding without role check");
          }
        }

        // Fetch pending jobs (only jobs that haven't been hired yet)
        console.log("[ProjectTracker] Fetching pending jobs");
        const jobsResponse = await axiosInstance.get("/jobs", {
          params: { page: 1, limit: 50, status: "OPEN" },
        });
        console.log("[ProjectTracker] Jobs response:", JSON.stringify(jobsResponse.data, null, 2));
        const allJobs = jobsResponse.data.data?.jobs || [];

        // Filter out jobs that have been hired (have freelancerId)
        const pendingJobs = allJobs.filter(job => !job.freelancerId);

        // Fetch hired jobs (jobs that have freelancerId assigned)
        console.log("[ProjectTracker] Fetching hired jobs");
        const hiredJobsResponse = await axiosInstance.get("/jobs", {
          params: { page: 1, limit: 50 },
        });
        console.log("[ProjectTracker] All jobs response:", JSON.stringify(hiredJobsResponse.data, null, 2));
        const allJobsForHired = hiredJobsResponse.data.data?.jobs || [];

        // Filter jobs that have been hired (have freelancerId)
        const hiredJobs = allJobsForHired.filter(job => job.freelancerId);

        // Fetch active and completed orders
        console.log("[ProjectTracker] Fetching orders");
        const ordersResponse = await axiosInstance.get("/orders/client", {
          params: { page: 1, limit: 50 },
        });
        console.log("[ProjectTracker] Orders response:", JSON.stringify(ordersResponse.data, null, 2));
        const orders = ordersResponse.data.data?.orders || [];

        // Categorize data
        const activeOrders = orders
          .filter((order) => ["ACCEPTED", "IN_PROGRESS"].includes(order.status))
          .map((order) => ({
            id: order.id,
            title: order.gig?.title || "Custom Project",
            status: order.status === "IN_PROGRESS" ? "In Progress" : "Awaiting Files",
            editor: order.freelancer?.user
              ? `${order.freelancer.user.firstname} ${order.freelancer.user.lastname}`
              : "N/A",
            editorAvatar: order.freelancer?.user?.avatar || "/placeholder.svg",
            deadline: order.deliveryDeadline ? new Date(order.deliveryDeadline).toLocaleDateString("en-US") : "N/A",
            category: order.gig?.category || "General",
            tags: order.gig?.tags || [],
            progress: order.progress || (order.status === "ACCEPTED" ? 50 : order.status === "IN_PROGRESS" ? 75 : 0),
            lastUpdated: order.updatedAt
              ? new Date(order.updatedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }) + ", " + new Date(order.updatedAt).toLocaleDateString("en-US")
              : "N/A",
            milestones: order.deliveryDeadline
              ? [
                  {
                    name: "First Draft",
                    deadline: new Date(order.deliveryDeadline).toLocaleDateString("en-US"),
                    completed: order.progress >= 50,
                  },
                  {
                    name: "Client Review",
                    deadline: new Date(order.deliveryDeadline).toLocaleDateString("en-US"),
                    completed: order.progress >= 75,
                  },
                  {
                    name: "Final Delivery",
                    deadline: new Date(order.deliveryDeadline).toLocaleDateString("en-US"),
                    completed: order.progress === 100,
                  },
                ]
              : [],
            freelancerId: order.freelancerId,
          }));

        // Add hired jobs to active projects
        const hiredJobsFormatted = hiredJobs.map((job) => ({
          id: job.id,
          kind: "job",
          jobId: job.id,
          title: job.title,
          status: "In Progress",
          editor: job.freelancer
            ? `${job.freelancer.firstname} ${job.freelancer.lastname}`
            : "N/A",
          editorAvatar: job.freelancer?.profilePicture || "/placeholder.svg",
          deadline: job.deadline ? new Date(job.deadline).toLocaleDateString("en-US") : "N/A",
          category: job.category || "General",
          tags: job.skills || [],
          progress: job.progress || 25,
          lastUpdated: job.updatedAt
            ? new Date(job.updatedAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }) + ", " + new Date(job.updatedAt).toLocaleDateString("en-US")
            : "N/A",
          budget: `₹${Number(job.budgetMin || 0).toLocaleString("en-IN")} - ₹${Number(job.budgetMax || 0).toLocaleString("en-IN")}`,
          freelancerId: job.freelancer_id || job.freelancerId,
          freelancer: job.freelancer || null,
        }));

        const pendingJobsFormatted = pendingJobs.map((job) => ({
          id: job.id,
          title: job.title,
          status: "Pending Approval",
          editor: "N/A",
          editorAvatar: "/placeholder.svg",
          deadline: job.deadline ? new Date(job.deadline).toLocaleDateString("en-US") : "N/A",
          category: job.category || "General",
          tags: job.skills || [],
          progress: 0,
          lastUpdated: job.updatedAt
            ? new Date(job.updatedAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }) + ", " + new Date(job.updatedAt).toLocaleDateString("en-US")
            : "N/A",
          budget: `₹${Number(job.budgetMin || 0).toLocaleString("en-IN")} - ₹${Number(job.budgetMax || 0).toLocaleString("en-IN")}`,
          shortlistedEditors: job.applicationCount || 0,
        }));

        const completedOrders = orders
          .filter((order) => order.status === "COMPLETED")
          .map((order) => ({
            id: order.id,
            title: order.gig?.title || "Custom Project",
            status: "Completed",
            editor: order.freelancer?.user
              ? `${order.freelancer.user.firstname} ${order.freelancer.user.lastname}`
              : "N/A",
            editorAvatar: order.freelancer?.user?.avatar || "/placeholder.svg",
            deadline: order.deliveryDeadline ? new Date(order.deliveryDeadline).toLocaleDateString("en-US") : "N/A",
            category: order.gig?.category || "General",
            tags: order.gig?.tags || [],
            progress: 100,
            lastUpdated: order.completedAt
              ? new Date(order.completedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }) + ", " + new Date(order.completedAt).toLocaleDateString("en-US")
              : "N/A",
            rating: order.freelancer?.rating || 4.5,
            invoiceLink: `/invoices/${order.id}`,
            freelancerId: order.freelancerId,
          }));

        setCategories({
          active: [...activeOrders, ...hiredJobsFormatted],
          pending: pendingJobsFormatted,
          completed: completedOrders,
        });
        setError(null);
      } catch (err) {
        logError("Data fetch", err);
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          toast.error("Session expired. Please log in again.");
          navigate("/login");
        } else {
          setError("Failed to load projects. Please try again.");
          toast.error("Failed to load projects. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Handle job/order actions
  const handleViewOrder = (project) => {
    console.log(`[ProjectTracker] Navigating to ${activeTab === "pending" ? "job" : "order"} ${project.id}`);
    navigate(activeTab === "pending" ? `/jobs/${project.id}` : `/orders/${project.id}`);
  };

  const handleMessageFreelancer = (project) => {
    if (activeTab === "pending") {
      toast.info("Please hire a freelancer to start messaging.");
      return;
    }
    const jobId = project.jobId || (project.kind === "job" ? project.id : null);
    if (!jobId) {
      toast.info("Chat is available for project-based hires (created via Jobs).");
      return;
    }
    openChatWidget(jobId, {
      id: project.freelancerId,
      firstname: project.freelancer?.firstname || project.editor?.split(" ")[0],
      lastname: project.freelancer?.lastname || project.editor?.split(" ").slice(1).join(" "),
      avatar: project.freelancer?.profilePicture || project.editorAvatar,
    });
  };

  const handleViewDetails = (project) => {
    console.log(`[ProjectTracker] Viewing details for ${activeTab === "pending" ? "job" : "order"} ${project.id}`);
    navigate(activeTab === "pending" ? `/client/jobs/${project.id}/applicants` : `/orders/${project.id}/details`);
  };

  const handleRejectJob = async (jobId) => {
    try {
      console.log(`[ProjectTracker] Rejecting job ${jobId}`);
      await axiosInstance.patch(`/jobs/${jobId}/status`, { status: "CANCELLED" });
      toast.success("Job cancelled successfully");
      // Refresh pending jobs
      const jobsResponse = await axiosInstance.get("/jobs", { params: { page: 1, limit: 50, status: "OPEN" } });
      const pendingJobs = jobsResponse.data.data?.jobs || [];
      setCategories((prev) => ({
        ...prev,
        pending: pendingJobs.map(mapJob),
      }));
    } catch (error) {
      logError(`Reject job ${jobId}`, error);
      toast.error("Failed to cancel job. Please try again.");
    }
  };

  // Map job data to UI format
  const mapJob = (job) => ({
    id: job.id,
    title: job.title,
    status: "Pending Approval",
    editor: "N/A",
    editorAvatar: "/placeholder.svg",
    deadline: job.deadline ? new Date(job.deadline).toLocaleDateString("en-US") : "N/A",
    category: job.category || "General",
    tags: job.skills || [],
    progress: 0,
    lastUpdated: job.updatedAt
      ? new Date(job.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) +
        ", " +
        new Date(job.updatedAt).toLocaleDateString("en-US")
      : "N/A",
    budget: `₹${Number(job.budgetMin || 0).toLocaleString("en-IN")} - ₹${Number(job.budgetMax || 0).toLocaleString("en-IN")}`,
    shortlistedEditors: job.applicationCount || 0,
  });

  // Map order data to UI format
  const mapOrder = (order) => ({
    id: order.id,
    title: order.gig?.title || "Custom Project",
    status: order.status === "IN_PROGRESS" ? "In Progress" : order.status === "ACCEPTED" ? "Awaiting Files" : "Completed",
    editor: order.freelancer?.user
      ? `${order.freelancer.user.firstname} ${order.freelancer.user.lastname}`
      : "N/A",
    editorAvatar: order.freelancer?.user?.avatar || "/placeholder.svg",
    deadline: order.deliveryDeadline ? new Date(order.deliveryDeadline).toLocaleDateString("en-US") : "N/A",
    category: order.gig?.category || "General",
    tags: order.gig?.tags || [],
    progress: order.progress || (order.status === "COMPLETED" ? 100 : order.status === "ACCEPTED" ? 50 : 75),
    lastUpdated: order.completedAt || order.updatedAt
      ? new Date(order.completedAt || order.updatedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }) + ", " + new Date(order.completedAt || order.updatedAt).toLocaleDateString("en-US")
      : "N/A",
    rating: order.status === "COMPLETED" ? order.freelancer?.rating || 4.5 : undefined,
    invoiceLink: order.status === "COMPLETED" ? `/invoices/${order.id}` : undefined,
    freelancerId: order.freelancerId,
    milestones: order.deliveryDeadline
      ? [
          {
            name: "First Draft",
            deadline: new Date(order.deliveryDeadline).toLocaleDateString("en-US"),
            completed: order.progress >= 50,
          },
          {
            name: "Client Review",
            deadline: new Date(order.deliveryDeadline).toLocaleDateString("en-US"),
            completed: order.progress >= 75,
          },
          {
            name: "Final Delivery",
            deadline: new Date(order.deliveryDeadline).toLocaleDateString("en-US"),
            completed: order.progress === 100,
          },
        ]
      : [],
  });

  // Filter projects based on search term
  const filteredProjects = categories[activeTab].filter(
    (project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.editor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Awaiting Files":
        return "bg-amber-100 text-amber-800";
      case "Pending Approval":
        return "bg-purple-100 text-purple-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Project Tracker</h1>

      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!loading && !error && (
        <>
          {/* Tabs */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  aria-label={`View ${tab.name}`}
                >
                  <span className="font-medium">{tab.name}</span>
                  <span
                    className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search projects"
              />
            </div>
            <button
              className="flex items-center px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-gray-50 transition-colors"
              aria-label="Filter projects"
            >
              <Filter className="w-5 h-5 mr-2 text-gray-500" />
              <span className="text-gray-700">Filters</span>
            </button>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="col-span-2 text-center py-12">
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">No {activeTab} projects found</h3>
                <p className="mt-1 text-sm text-gray-500">No projects match your search criteria.</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <img
                        src={project.editorAvatar}
                        alt={project.editor}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => (e.target.src = "/placeholder.svg")}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.editor}</p>
                        <p className="text-xs text-gray-500">Editor</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {project.deadline}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <div className="flex space-x-2">
                      {project.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {"budget" in project && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">Budget: </span>
                      <span className="text-sm text-gray-500">{project.budget}</span>
                    </div>
                  )}

                  {project.progress > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-500">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {"milestones" in project && project.milestones.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900">Milestones</h4>
                      <ul className="mt-1 space-y-1">
                        {project.milestones.map((milestone, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <span className={`mr-2 ${milestone.completed ? "text-green-500" : "text-gray-400"}`}>
                              {milestone.completed ? "✓" : "○"}
                            </span>
                            <span>
                              {milestone.name} - {milestone.deadline}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {"rating" in project && (
                    <div className="mb-4 flex items-center">
                      <span className="text-yellow-400">{"★".repeat(Math.round(project.rating))}</span>
                      <span className="ml-1 text-sm text-gray-500">{project.rating}/5</span>
                    </div>
                  )}

                  {"invoiceLink" in project && (
                    <div className="mb-4">
                      <a
                        href={project.invoiceLink}
                        className="text-sm text-blue-600 hover:underline"
                        aria-label={`View invoice for order ${project.id}`}
                      >
                        View Invoice
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Updated {project.lastUpdated}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewOrder(project)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        aria-label={`View ${activeTab === "pending" ? "job" : "order"} ${project.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMessageFreelancer(project)}
                        className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                        aria-label={`Message freelancer for ${activeTab === "pending" ? "job" : "order"} ${project.id}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewDetails(project)}
                        className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
                        aria-label={`View details for ${activeTab === "pending" ? "job" : "order"} ${project.id}`}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {activeTab === "pending" && (
                        <>
                          <button
                            onClick={() => handleViewDetails(project)} // Redirect to applicants page instead of approving
                            className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                            aria-label={`Select freelancer for job ${project.id}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectJob(project.id)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            aria-label={`Reject job ${project.id}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}


