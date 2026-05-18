import { useState, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";

import {
  Film,
  Clock,
  Calendar,
  BarChart2,
  ChevronRight,
  MoreVertical,
  Plus,
  FileText,
  Briefcase,
  Award,
  Zap,
  DollarSign,
  ArrowUpRight,
  Check,
  Clock3,
  Moon,
  Sun,
  TrendingUp,
  PieChart,
  Users,
  Target,
  ChevronDown,
  Eye,
  Lightbulb,
  Star,
  Sparkles,
  Flame,
  X
} from "lucide-react";
import axiosInstance from "../../utils/axios";
import { useSelector } from "react-redux";
import { SkeletonDashboard } from "../Skeleton";

export default function VideoEditorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("current");
  const [activeJobTab, setActiveJobTab] = useState("currentJobs");
  const [darkMode, setDarkMode] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [currentOrders, setCurrentOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [rejectedOrders, setRejectedOrders] = useState([]);
  const [currentJobs, setCurrentJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [portfolioStats, setPortfolioStats] = useState({ popular: [], metrics: [] });
  const [skills, setSkills] = useState([]);
  const [software, setSoftware] = useState([]);
  const [earningsData, setEarningsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);


  const user = useSelector((state) => state.user);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiCalls = [
          { name: "currentOrders", promise: axiosInstance.get("/orders/current") },
          { name: "pendingOrders", promise: axiosInstance.get("/orders/pending") },
          { name: "completedOrders", promise: axiosInstance.get("/orders/completed") },
          { name: "rejectedOrders", promise: axiosInstance.get("/orders/rejected") },
          { name: "currentJobs", promise: axiosInstance.get("/jobs/current") },
          { name: "appliedJobs", promise: axiosInstance.get("/jobs/applied") },
          { name: "completedJobs", promise: axiosInstance.get("/jobs/completed") },
          { name: "portfolioStats", promise: axiosInstance.get("/portfolios/stats") },
          { name: "skills", promise: axiosInstance.get("/freelancers/skills") },
          { name: "software", promise: axiosInstance.get("/freelancers/software") },
          { name: "earnings", promise: axiosInstance.get("/transactions/earnings") },
        ];

        const responses = await Promise.all(
          apiCalls.map(async ({ name, promise }) => {
            try {
              const response = await promise;
              return { name, response };
            } catch (err) {
              console.error(`Error fetching ${name}:`, err.message, err.response?.status, err.response?.data);
              return { name, response: null, error: err.response?.data?.message || `Failed to fetch ${name}` };
            }
          })
        );

        const data = {
          currentOrders: [],
          pendingOrders: [],
          completedOrders: [],
          rejectedOrders: [],
          currentJobs: [],
          appliedJobs: [],
          completedJobs: [],
          portfolioStats: { popular: [], metrics: [] },
          skills: [],
          software: [],
          earnings: [],
        };

        const errors = [];
        responses.forEach(({ name, response, error }) => {
          if (response && response.data && response.data.data) {
            data[name] = response.data.data;
          } else {
            console.warn(`Invalid or empty response for ${name}:`, response);
            errors.push(error || `Failed to fetch ${name}`);
          }
        });

        if (errors.length > 0) {
          setError(`Some data failed to load: ${errors.join("; ")}`);
        }

        setCurrentOrders(data.currentOrders);
        setPendingOrders(data.pendingOrders);
        setCompletedOrders(data.completedOrders);
        setRejectedOrders(data.rejectedOrders);
        setCurrentJobs(data.currentJobs);
        setAppliedJobs(data.appliedJobs);
        setCompletedJobs(data.completedJobs);
        setPortfolioStats(data.portfolioStats);
        setSkills(data.skills);
        setSoftware(data.software);
        setEarningsData(data.earnings);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeTab]);

  useEffect(() => {
    const tabContent = document.getElementById("tab-content");
    if (tabContent) {
      tabContent.classList.add("fade-in");
      const timer = setTimeout(() => tabContent.classList.remove("fade-in"), 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  useEffect(() => {
    const jobTabContent = document.getElementById("job-tab-content");
    if (jobTabContent) {
      jobTabContent.classList.add("fade-in");
      const timer = setTimeout(() => jobTabContent.classList.remove("fade-in"), 300);
      return () => clearTimeout(timer);
    }
  }, [activeJobTab]);

  const fetchOrders = async () => {
    try {
      const [currentRes, pendingRes, completedRes, rejectedRes] = await Promise.all([
        axiosInstance.get("/orders/current"),
        axiosInstance.get("/orders/pending"),
        axiosInstance.get("/orders/completed"),
        axiosInstance.get("/orders/rejected"),
      ]);
      console.log("fetchOrders results:", {
        current: currentRes.data.data.length,
        pending: pendingRes.data.data.length,
        completed: completedRes.data.data.length,
        rejected: rejectedRes.data.data.length,
      });
      setCurrentOrders(currentRes.data.data);
      setPendingOrders(pendingRes.data.data);
      setCompletedOrders(completedRes.data.data);
      setRejectedOrders(rejectedRes.data.data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  };
  
  

  const handleProceedToWork = async (order) => {
    try {
      if (order.status === "CURRENT") return;
  
      const response = await axiosInstance.patch(`/orders/${order.id}/status`, {
        status: "CURRENT",
      });
  
      if (response.data && response.data.data) {
        setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
        setCurrentOrders((prev) => [response.data.data, ...prev]);
        setActiveTab("current");
      }
    } catch (err) {
      console.error("Failed to proceed to work:", err);
    }
  };
  
  const handleDeclineOrder = async (order) => {
    try {
      if (order.status === "REJECTED") return;
  
      const response = await axiosInstance.patch(`/orders/${order.id}/status`, {
        status: "REJECTED",
      });
  
      if (response.data && response.data.data) {
        setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
        setRejectedOrders((prev) => [response.data.data, ...prev]);
        setActiveTab("rejected");
      }
    } catch (err) {
      console.error("Failed to reject order:", err);
    }
  };
  
  

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "dark bg-gradient-to-br from-gray-900 to-slate-900 text-white"
          : "bg-gradient-to-br from-purple-50 to-indigo-50 text-gray-800"
      }`}
    >
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div
              className={`${
                darkMode
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                  : "bg-gradient-to-r from-purple-500 to-indigo-400"
              } p-2 rounded-lg shadow-lg`}
            >
              <Film className="h-8 w-8 text-white" />
            </div>
            <h1
              className={`text-3xl font-bold ${
                darkMode
                  ? "bg-gradient-to-r from-purple-400 to-indigo-300"
                  : "bg-gradient-to-r from-purple-600 to-indigo-500"
              } text-transparent bg-clip-text`}
            >
              {user?.firstname || "Freelancer"} Studio
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${
                darkMode
                  ? "bg-gray-800 text-purple-400 hover:bg-gray-700"
                  : "bg-white text-purple-600 hover:bg-gray-100"
              } transition-colors shadow-sm`}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div
              className={`flex items-center gap-2 ${
                darkMode ? "bg-gray-800" : "bg-white"
              } p-2 px-4 rounded-full shadow-sm`}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500">
                <img
                  src={user?.profilePicture || "/placeholder.svg?height=40&width=40"}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-medium">{user?.firstname || "User"}</p>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Senior Video Editor</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-4 shadow-sm transition-colors`}>
              <div className="flex border-b mb-4 relative">
                <button
                  onClick={() => setActiveTab("current")}
                  className={`px-6 py-3 font-medium text-center relative transition-colors ${
                    activeTab === "current"
                      ? darkMode
                        ? "text-purple-400"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Current Orders
                  {activeTab === "current" && (
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 ${
                        darkMode ? "bg-purple-400" : "bg-purple-600"
                      } transition-all duration-300`}
                    ></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`px-6 py-3 font-medium text-center relative transition-colors ${
                    activeTab === "pending"
                      ? darkMode
                        ? "text-purple-400"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Pending Orders
                  {activeTab === "pending" && (
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 ${
                        darkMode ? "bg-purple-400" : "bg-purple-600"
                      } transition-all duration-300`}
                    ></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("completed")}
                  className={`px-6 py-3 font-medium text-center relative transition-colors ${
                    activeTab === "completed"
                      ? darkMode
                        ? "text-purple-400"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Completed Orders
                  {activeTab === "completed" && (
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 ${
                        darkMode ? "bg-purple-400" : "bg-purple-600"
                      } transition-all duration-300`}
                    ></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("rejected")}
                  className={`px-6 py-3 font-medium text-center relative transition-colors ${
                    activeTab === "rejected"
                      ? darkMode
                        ? "text-purple-400"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Rejected Orders
                  {activeTab === "rejected" && (
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 ${
                        darkMode ? "bg-purple-400" : "bg-purple-600"
                      } transition-all duration-300`}
                    ></span>
                  )}
                </button>
              </div>

              <div id="tab-content" className="transition-opacity duration-300">
                {activeTab === "current" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Briefcase className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                        Current Orders
                      </h2>
                      <Link
                        to="/editor/gigs/new"
                        className={`${
                          darkMode ? "bg-purple-500 hover:bg-purple-600" : "bg-purple-600 hover:bg-purple-700"
                        } text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md`}
                      >
                        <Plus className="h-4 w-4" />
                        New Gig
                      </Link>
                    </div>

                    {currentOrders.length === 0 ? (
                      <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No current orders</p>
                    ) : (
                      currentOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`${
                            darkMode ? "border-gray-700 hover:bg-gray-700/50" : "border-gray-100 hover:shadow-md"
                          } border rounded-xl p-4 transition-all`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{order.gig?.title || order.title || 'Untitled Order'}</h3>
                              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Client: {order.client?.firstname || ''} {order.client?.lastname || ''}
                              </p>
                            </div>
                            <button
                              className={`${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                          </div>

                          <div
                            className={`mt-3 flex items-center gap-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            <Clock className="h-4 w-4" />
                            <span>Deadline: {new Date(order.deliveryDeadline).toLocaleDateString()}</span>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{order.progress}% Complete</span>
                              <span className={`${darkMode ? "text-purple-400" : "text-purple-600"} font-medium`}>
                                {order.daysLeft} days left
                              </span>
                            </div>
                            <div className={`w-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded-full h-2`}>
                              <div
                                className={`h-2 rounded-full ${
                                  darkMode
                                    ? "bg-gradient-to-r from-purple-500 to-indigo-400"
                                    : "bg-gradient-to-r from-purple-500 to-indigo-400"
                                }`}
                                style={{ width: `${order.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/editor/workspace?orderId=${order.id}`)}
                              className={`${
                                darkMode
                                  ? "text-purple-400 hover:text-purple-300"
                                  : "text-purple-600 hover:text-purple-800"
                              } text-sm font-medium flex items-center gap-1`}
                            >
                              View Details
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "pending" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock3 className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                        Pending Orders
                      </h2>
                      <button
                        className={`${
                          darkMode
                            ? "text-purple-400 text-sm font-medium hover:text-purple-300"
                            : "text-purple-600 text-sm font-medium hover:text-purple-800"
                        }`}
                      >
                        View All
                      </button>
                    </div>

                    {pendingOrders.length === 0 ? (
                      <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No pending orders</p>
                    ) : (
                      pendingOrders.map((order) => (
                        <div key={order.id}>
                          <div
                            className={`flex items-center gap-3 p-4 rounded-xl ${
                              darkMode ? "bg-gray-800/50 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                            } shadow-sm transition-all`}
                          >
                            <div
                              className={`w-12 h-12 rounded-lg ${
                                darkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600"
                              } flex items-center justify-center flex-shrink-0`}
                            >
                              <Calendar className="h-6 w-6" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <h3 className="font-medium truncate">{order.title}</h3>
                              <p className={`text-sm truncate ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                {order.description}
                              </p>
                              <div
                                className={`flex items-center gap-2 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                              >
                                <span>Due: {new Date(order.deliveryDeadline).toLocaleDateString()}</span>
                                <span className={`w-1 h-1 rounded-full ${darkMode ? "bg-gray-500" : "bg-gray-300"}`}></span>
                                <span>{order.progress}% Complete</span>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                              }
                              className={`flex-shrink-0 p-2 ${
                                darkMode ? "text-purple-400 hover:bg-gray-700" : "text-purple-600 hover:bg-purple-50"
                              } rounded-lg`}
                            >
                              <ChevronRight 
                                className={`h-5 w-5 transform transition-transform duration-200 ${
                                  expandedOrderId === order.id ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                          </div>
                          {expandedOrderId === order.id && (
                            <div
                              className={`mt-2 rounded-2xl p-4 shadow-sm border-l-4 ${
                                darkMode
                                  ? "border-purple-500 bg-gray-800 text-gray-100"
                                  : "border-purple-600 bg-white text-gray-800"
                              }`}
                            >
                              <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <FileText className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                                Order Details
                              </h4>

                              <ul className="space-y-1 text-sm">
                                <li><strong>Title:</strong> {order.title}</li>
                                <li><strong>Video Type:</strong> {order.videoType}</li>
                                <li><strong>Number of Videos:</strong> {order.numberOfVideos}</li>
                                <li><strong>Total Duration:</strong> {order.totalDuration} sec</li>
                                <li><strong>Description:</strong> {order.description}</li>
                                <li><strong>Reference URL:</strong> {order.referenceUrl || "N/A"}</li>
                                <li><strong>Aspect Ratio:</strong> {order.aspectRatio}</li>
                                <li><strong>Add Subtitles:</strong> {order.addSubtitles ? "Yes" : "No"}</li>
                                <li><strong>Express Delivery:</strong> {order.expressDelivery ? "Yes" : "No"}</li>
                                {order.uploadedFiles && order.uploadedFiles.length > 0 && (
                                  <li>
                                    <strong>Uploaded Files:</strong>
                                    <ul className="ml-4 list-disc">
                                      {order.uploadedFiles.map((file, index) => (
                                        <li key={index}>
                                          {file.name} ({Math.round(file.size / 1024)} KB)
                                        </li>
                                      ))}
                                    </ul>
                                  </li>
                                )}
                              </ul>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  onClick={() => {
                                    handleProceedToWork(order)
                                    setActiveTab("current")
                                  }}
                                  className={`flex items-center justify-center gap-2 px-4 py-2 w-40 rounded-lg transition shadow-sm whitespace-nowrap ${
                                    darkMode
                                      ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white hover:from-purple-700 hover:to-indigo-800"
                                      : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700"
                                  }`}
                                >
                                  <Check className="h-4 w-4" />
                                  Proceed to Work
                                </button>

                                <button
                                  onClick={() => {
                                    handleDeclineOrder(order)
                                    setActiveTab("rejected")
                                  }}
                                  className={`flex items-center justify-center gap-2 px-4 py-2 w-40 rounded-lg transition shadow-sm border whitespace-nowrap ${
                                    darkMode
                                      ? "bg-white text-purple-700 border-purple-700 hover:bg-gray-100"
                                      : "bg-white text-purple-700 border-purple-700 hover:bg-purple-50"
                                  }`}
                                >
                                  <X className="h-4 w-4" />
                                  Decline Order
                                </button>
                              </div>

                            </div>
                          )}

                        </div> 
                      ))
                    )}
                  </div>
                )}



                {activeTab === "completed" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Check className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                        Completed Orders
                      </h2>
                      <button
                        className={`${
                          darkMode
                            ? "text-purple-400 text-sm font-medium hover:text-purple-300"
                            : "text-purple-600 text-sm font-medium hover:text-purple-800"
                        }`}
                      >
                        View All
                      </button>
                    </div>

                    {completedOrders.length === 0 ? (
                      <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No completed orders</p>
                    ) : (
                      completedOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`flex items-center gap-3 p-4 rounded-xl ${
                            darkMode ? "bg-gray-800/50 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                          } shadow-sm transition-all`}
                        >
                          <div
                            className={`w-12 h-12 rounded-lg ${
                              darkMode ? "bg-gray-700 text-purple-400" : "bg-purple-100 text-purple-600"
                            } flex items-center justify-center flex-shrink-0`}
                          >
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium truncate">{order.gig?.title || order.title || 'Untitled Order'}</h3>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              Client: {order.client?.firstname || ''} {order.client?.lastname || ''}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-sm font-medium ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                              ${order.totalPrice.toFixed(2)}
                            </span>
                            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {new Date(order.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "rejected" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <X className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                        Rejected Orders
                      </h2>
                      <button
                        className={`${
                          darkMode
                            ? "text-purple-400 text-sm font-medium hover:text-purple-300"
                            : "text-purple-600 text-sm font-medium hover:text-purple-800"
                        }`}
                      >
                        View All
                      </button>
                    </div>

                    {rejectedOrders.length === 0 ? (
                      <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No rejected orders</p>
                    ) : (
                      rejectedOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`flex items-center gap-3 p-4 rounded-xl ${
                            darkMode ? "bg-gray-800/50 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                          } shadow-sm transition-all`}
                        >
                          <div
                            className={`w-12 h-12 rounded-lg ${
                              darkMode ? "bg-gray-700 text-purple-400" : "bg-purple-100 text-purple-600"
                            } flex items-center justify-center flex-shrink-0`}
                          >
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium truncate">{order.gig?.title || order.title || 'Untitled Order'}</h3>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              Client: {order.client?.firstname || ''} {order.client?.lastname || ''}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-sm font-medium ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                              ${order.totalPrice.toFixed(2)}
                            </span>
                            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {new Date(order.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Jobs Section */}
            <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-4 shadow-sm transition-colors`}>
              <div className="flex border-b mb-4 relative">
                <button
                  onClick={() => setActiveJobTab("currentJobs")}
                  className={`px-6 py-3 font-medium text-center relative transition-colors ${
                    activeJobTab === "currentJobs"
                      ? darkMode
                        ? "text-purple-400"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Current Jobs
                  {activeJobTab === "currentJobs" && (
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 ${
                        darkMode ? "bg-purple-400" : "bg-purple-600"
                      } transition-all duration-300`}
                    ></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveJobTab("appliedJobs")}
                  className={`px-6 py-3 font-medium text-center relative transition-colors ${
                    activeJobTab === "appliedJobs"
                      ? darkMode
                        ? "text-purple-400"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Applied Jobs
                  {activeJobTab === "appliedJobs" && (
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 ${
                        darkMode ? "bg-purple-400" : "bg-purple-600"
                      } transition-all duration-300`}
                    ></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveJobTab("completedJobs")}
                  className={`px-6 py-3 font-medium text-center relative transition-colors ${
                    activeJobTab === "completedJobs"
                      ? darkMode
                        ? "text-purple-400"
                        : "text-purple-600"
                      : darkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Completed Jobs
                  {activeJobTab === "completedJobs" && (
                    <span
                      className={`absolute bottom-0 left-0 w-full h-0.5 ${
                        darkMode ? "bg-purple-400" : "bg-purple-600"
                      } transition-all duration-300`}
                    ></span>
                  )}
                </button>
              </div>

              <div id="job-tab-content" className="transition-opacity duration-300">
                {activeJobTab === "currentJobs" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Briefcase className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                        Current Jobs
                      </h2>
                      <button
                        onClick={() => navigate("/find-work")}
                        className={`${
                          darkMode ? "bg-purple-500 hover:bg-purple-600" : "bg-purple-600 hover:bg-purple-700"
                        } text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md`}
                      >
                        <Plus className="h-4 w-4" />
                        Apply for Job
                      </button>
                    </div>

                    {currentJobs.length === 0 ? (
                      <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No current jobs</p>
                    ) : (
                      currentJobs.map((job) => (
                        <div
                          key={job.id}
                          className={`${
                            darkMode ? "border-gray-700 hover:bg-gray-700/50" : "border-gray-100 hover:shadow-md"
                          } border rounded-xl p-4 transition-all`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{job.title}</h3>
                              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Client: {job.client?.firstname || ''} {job.client?.lastname || ''}
                              </p>
                            </div>
                            <button
                              className={`${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                          </div>

                          <div
                            className={`mt-3 flex items-center gap-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                          >
                            <Clock className="h-4 w-4" />
                            <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{job.progress}% Complete</span>
                              <span className={`${darkMode ? "text-purple-400" : "text-purple-600"} font-medium`}>
                                {job.daysLeft} days left
                              </span>
                            </div>
                            <div className={`w-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded-full h-2`}>
                              <div
                                className={`h-2 rounded-full ${
                                  darkMode
                                    ? "bg-gradient-to-r from-purple-500 to-indigo-400"
                                    : "bg-gradient-to-r from-purple-500 to-indigo-400"
                                }`}
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => navigate(`/editor/workspace?jobId=${job.id}`)}
                              className={`${
                                darkMode
                                  ? "text-purple-400 hover:text-purple-300"
                                  : "text-purple-600 hover:text-purple-800"
                              } text-sm font-medium flex items-center gap-1`}
                            >
                              View Details
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeJobTab === "appliedJobs" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock3 className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                        Applied Jobs
                      </h2>
                      <button
                        className={`${
                          darkMode
                            ? "text-purple-400 text-sm font-medium hover:text-purple-300"
                            : "text-purple-600 text-sm font-medium hover:text-purple-800"
                        }`}
                      >
                        View All
                      </button>
                    </div>

                    {appliedJobs.length === 0 ? (
                      <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No applied jobs</p>
                    ) : (
                      appliedJobs.map((job) => (
                        <div
                          key={job.id}
                          className={`flex items-center gap-3 p-4 rounded-xl ${
                            darkMode ? "bg-gray-800/50 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                          } shadow-sm transition-all`}
                        >
                          <div
                            className={`w-12 h-12 rounded-lg ${
                              darkMode ? "bg-amber-900/30 text-amber-400" : "bg-amber-100 text-amber-600"
                            } flex items-center justify-center flex-shrink-0`}
                          >
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium truncate">{job.title}</h3>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              Client: {job.client?.firstname || ''} {job.client?.lastname || ''}
                            </p>
                            <div
                              className={`flex items-center gap-2 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                              <span>Applied: {new Date(job.applicationDate).toLocaleDateString()}</span>
                              <span className={`w-1 h-1 rounded-full ${darkMode ? "bg-gray-500" : "bg-gray-300"}`}></span>
                              <span>Status: {job.applicationStatus}</span>
                            </div>
                          </div>
                          <button
                            className={`flex-shrink-0 p-2 ${
                              darkMode ? "text-purple-400 hover:bg-gray-700" : "text-purple-600 hover:bg-purple-50"
                            } rounded-lg`}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeJobTab === "completedJobs" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Check className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                        Completed Jobs
                      </h2>
                      <button
                        className={`${
                          darkMode
                            ? "text-purple-400 text-sm font-medium hover:text-purple-300"
                            : "text-purple-600 text-sm font-medium hover:text-purple-800"
                        }`}
                      >
                        View All
                      </button>
                    </div>

                    {completedJobs.length === 0 ? (
                      <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No completed jobs</p>
                    ) : (
                      completedJobs.map((job) => (
                        <div
                          key={job.id}
                          className={`flex items-center gap-3 p-4 rounded-xl ${
                            darkMode ? "bg-gray-800/50 hover:bg-gray-700" : "bg-white hover:bg-gray-50"
                          } shadow-sm transition-all`}
                        >
                          <div
                            className={`w-12 h-12 rounded-lg ${
                              darkMode ? "bg-gray-700 text-purple-400" : "bg-purple-100 text-purple-600"
                            } flex items-center justify-center flex-shrink-0`}
                          >
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium truncate">{job.title}</h3>
                            <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              Client: {job.client?.firstname || ''} {job.client?.lastname || ''}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-sm font-medium ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                              ${job.totalPrice.toFixed(2)}
                            </span>
                            <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {new Date(job.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 shadow-sm transition-colors`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Award className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                  Portfolio Insights
                </h2>
                <button
                  className={`${
                    darkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-800"
                  } text-sm font-medium flex items-center gap-1`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Portfolio
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"} p-4 rounded-xl`}>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Sparkles className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                    Most Popular Content
                  </h3>
                  <div className="space-y-3">
                    {portfolioStats.popular.length === 0 ? (
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No popular content available</p>
                    ) : (
                      portfolioStats.popular.map((video) => (
                        <div key={video.id} className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={video.videoUrl || "/placeholder.svg?height=64&width=64"}
                              alt={video.title}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{video.title}</h4>
                            <div className="flex items-center gap-2 text-xs mt-1">
                              <span className={`flex items-center ${darkMode ? "text-purple-400" : "text-purple-600"}`}>
                                <Eye className="h-3 w-3 mr-1" />
                                {video.views}
                              </span>
                              <span className={`w-1 h-1 rounded-full ${darkMode ? "bg-gray-500" : "bg-gray-300"}`}></span>
                              <span className={darkMode ? "text-gray-400" : "text-gray-500"}>{video.category}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={`${darkMode ? "bg-gray-700/50" : "bg-gray-50"} p-4 rounded-xl`}>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                    Performance Metrics
                  </h3>
                  <div className="space-y-4">
                    {portfolioStats.metrics.length === 0 ? (
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No metrics available</p>
                    ) : (
                      portfolioStats.metrics.map((metric) => (
                        <div key={metric.id}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{metric.name}</span>
                            <span
                              className={`text-sm font-medium ${
                                metric.trend === "up" ? "text-emerald-500" : metric.trend === "down" ? "text-red-500" : ""
                              }`}
                            >
                              {metric.value}
                              {metric.trend === "up" && <ArrowUpRight className="h-3 w-3 inline ml-1" />}
                            </span>
                          </div>
                          <div className={`w-full ${darkMode ? "bg-gray-600" : "bg-gray-200"} rounded-full h-1.5`}>
                            <div
                              className={`h-1.5 rounded-full ${
                                darkMode
                                  ? "bg-gradient-to-r from-purple-500 to-indigo-400"
                                  : "bg-gradient-to-r from-purple-500 to-indigo-400"
                              }`}
                              style={{ width: `${metric.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 shadow-sm transition-colors`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Zap className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                  Skills & Expertise Insights
                </h2>
                <button
                  onClick={() => setShowInsights(!showInsights)}
                  className={`${
                    darkMode ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-800"
                  } text-sm font-medium flex items-center gap-1`}
                >
                  {showInsights ? "Hide Insights" : "Show Insights"}
                  <ChevronDown className={`h-4 w-4 transition-transform ${showInsights ? "rotate-180" : ""}`} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3
                    className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-3 flex items-center gap-2`}
                  >
                    <Star className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                    Top Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.length === 0 ? (
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No skills listed</p>
                    ) : (
                      skills.map((skill) => (
                        <span
                          key={skill.id}
                          className={`px-3 py-1 ${
                            darkMode ? "bg-gray-700 text-purple-400" : "bg-purple-50 text-purple-700"
                          } rounded-full text-sm`}
                        >
                          {skill.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3
                    className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"} mb-3 flex items-center gap-2`}
                  >
                    <Flame className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                    Software Proficiency
                  </h3>
                  <div className="space-y-3">
                    {software.length === 0 ? (
                      <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>No software listed</p>
                    ) : (
                      software.map((sw) => (
                        <div key={sw.id} className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-md ${
                              darkMode
                                ? "bg-gradient-to-br from-purple-500 to-indigo-400"
                                : "bg-gradient-to-br from-purple-500 to-indigo-400"
                            } flex items-center justify-center text-white`}
                          >
                            {sw.icon}
                          </div>
                          <div className="flex-grow">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{sw.name}</span>
                              <span className="text-xs font-medium">{sw.level}%</span>
                            </div>
                            <div className={`w-full ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded-full h-1.5`}>
                              <div
                                className={`h-1.5 rounded-full ${
                                  darkMode
                                    ? "bg-gradient-to-r from-purple-500 to-indigo-400"
                                    : "bg-gradient-to-r from-purple-500 to-indigo-400"
                                }`}
                                style={{ width: `${sw.level}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {showInsights && (
                <div className={`mt-6 p-4 rounded-xl ${darkMode ? "bg-gray-700/50" : "bg-gray-50"}`}>
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Lightbulb className={`h-4 w-4 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                    Skill Development Recommendations
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                        <Target className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                      </div>
                      <div>
                        <h4 className="font-medium">Expand Motion Graphics Skills</h4>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Based on industry trends, improving your 3D motion graphics skills could increase your project
                          rate by up to 25%.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${darkMode ? "bg-gray-600" : "bg-white"} shadow-sm`}>
                        <Users className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                      </div>
                      <div>
                        <h4 className="font-medium">Client Preferences</h4>
                        <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                          Your corporate clients respond best to your storytelling approach. Consider highlighting this
                          skill in your portfolio.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div
              className={`${
                darkMode
                  ? "bg-gradient-to-br from-purple-600 to-indigo-700"
                  : "bg-gradient-to-br from-purple-500 to-indigo-600"
              } rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Earnings
                </h2>
                <span className="text-purple-100 bg-white/10 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-5" />
                  +15% this month
                </span>
              </div>

              <div className="text-4xl font-bold mb-6">
                ${earningsData.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </div>

              <div className="h-32 mb-6 relative">
                <div className="absolute bottom-0 left-0 w-full h-full flex items-end">
                  {earningsData.length === 0 ? (
                    <p className="text-center text-purple-200 w-full">No earnings data available</p>
                  ) : (
                    earningsData.map((item) => (
                      <div key={item.id} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full max-w-[20px] bg-white/20 rounded-t-sm mx-0.5 group relative cursor-pointer hover:bg-white/30 transition-colors"
                          style={{ height: `${(item.amount / Math.max(...earningsData.map((e) => e.amount))) * 100}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                            ${item.amount} in {item.month}
                          </div>
                        </div>
                        <span className="text-xs mt-1 text-purple-100">{item.month.substring(0, 3)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <PieChart className="h-4 w-4 text-purple-200" />
                    <span className="text-sm text-purple-100">Revenue Sources</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Corporate</span>
                      <span className="text-xs font-medium">65%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1">
                      <div className="bg-white h-1 rounded-full" style={{ width: "65%" }}></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Personal</span>
                      <span className="text-xs font-medium">35%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1">
                      <div className="bg-white h-1 rounded-full" style={{ width: "35%" }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart2 className="h-4 w-4 text-purple-200" />
                    <span className="text-sm text-purple-100">Order Stats</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Avg. Order Value</span>
                      <span className="text-xs font-medium">
                        $
                        {(completedOrders.reduce((sum, o) => sum + o.totalPrice, 0) / completedOrders.length || 0).toFixed(
                          2
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Completion Rate</span>
                      <span className="text-xs font-medium">
                        {Math.round(
                          (completedOrders.length /
                            (currentOrders.length + pendingOrders.length + completedOrders.length || 1)) *
                            100
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Repeat Clients</span>
                      <span className="text-xs font-medium">68%</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className={`w-full mt-6 ${
                  darkMode
                    ? "bg-white text-purple-700 hover:bg-gray-100"
                    : "bg-white text-purple-700 hover:bg-purple-50"
                } py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2`}
              >
                <BarChart2 className="h-4 w-4" />
                View Detailed Report
              </button>
            </div>

            <div className={`${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 shadow-sm transition-colors`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Briefcase className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-600"}`} />
                  Work Requests
                </h2>
                <button
                  className={`${
                    darkMode
                      ? "text-purple-400 text-sm font-medium hover:text-purple-300"
                      : "text-purple-600 text-sm font-medium hover:text-purple-800"
                  }`}
                >
                  View All Jobs
                </button>
              </div>

              <div className="space-y-3">
                <div
                  className={`flex justify-between items-center p-3 rounded-xl ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  } transition-colors`}
                >
                  <span className="font-medium">Available Jobs</span>
                  <span
                    className={`${
                      darkMode ? "bg-gray-700 text-purple-400" : "bg-purple-100 text-purple-700"
                    } px-2 py-1 rounded-md text-sm font-medium`}
                  >
                    15
                  </span>
                </div>
                <div
                  className={`flex justify-between items-center p-3 rounded-xl ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  } transition-colors`}
                >
                  <span className="font-medium">My Applications</span>
                  <span
                    className={`${
                      darkMode ? "bg-gray-700 text-purple-400" : "bg-purple-100 text-purple-700"
                    } px-2 py-1 rounded-md text-sm font-medium`}
                  >
                    5
                  </span>
                </div>
                <div
                  className={`flex justify-between items-center p-3 rounded-xl ${
                    darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  } transition-colors`}
                >
                  <span className="font-medium">Job Invitations</span>
                  <span
                    className={`${
                      darkMode ? "bg-gray-700 text-purple-400" : "bg-purple-100 text-purple-700"
                    } px-2 py-1 rounded-md text-sm font-medium`}
                  >
                    3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}