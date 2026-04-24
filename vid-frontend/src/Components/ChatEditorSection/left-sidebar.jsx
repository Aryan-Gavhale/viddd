"use client"

import { useState, useEffect } from "react";
import {
  User,
  FileText,
  Plus,
  Upload,
  FileIcon as FileInvoice,
  ChevronDown,
  ChevronRight,
  Moon,
  Sun,
  AlertCircle,
  X,
  Briefcase,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { useSelector } from "react-redux";
import axiosInstance from "../../utils/axios.js";

export default function LeftSidebar({
  currentProject,
  onNewTask,
  onGenerateInvoice,
  isCollapsed,
  onProjectSelect,
  onClose,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useSelector((state) => state.user);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user?.id) {
      fetchActiveProjects();
    } else {
      setLoading(false);
      setProjects([]);
    }
  }, [user?.id, user?.role]);

  // Effect to select first project when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      onProjectSelect(projects[0]);
    }
  }, [projects, currentProject, onProjectSelect]);

  const fetchActiveProjects = async () => {
    if (!user?.id) {
      setError("Not authenticated. Please log in.");
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let endpoint = "/orders/freelancer/active";
      if (user.role === "CLIENT") {
        endpoint = "/orders/client/active";
      }
      const response = await axiosInstance.get(endpoint);
      console.log("Active orders response:", response.data.data); // Debug log
      const fetchedProjects = Array.isArray(response.data.data) ? response.data.data : [];
      // Map backend data to include status and progress if not provided
      const projectsWithStatus = fetchedProjects.map((project) => ({
        ...project,
        status: project.status || inferStatus(project.deliveryDeadline, project.completedAt),
        progress: project.progress || calculateProgress(project.deliveryDeadline, project.completedAt),
      }));
      setProjects(projectsWithStatus);
      setError(null);
    } catch (err) {
      setError("Failed to fetch active orders");
      console.error("Error fetching active orders:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Infer status based on deadline and completion
  const inferStatus = (deadline, completedAt) => {
    if (completedAt) return "Completed";
    if (!deadline) return "In Progress";
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return now > deadlineDate ? "Review" : "In Progress";
  };

  // Calculate progress based on deadline or completion
  const calculateProgress = (deadline, completedAt) => {
    if (completedAt) return 100;
    if (!deadline) return 50; // Default for ongoing projects
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Assume 30 days ago as start
    const deadlineDate = new Date(deadline);
    const totalDuration = deadlineDate - start;
    const elapsed = now - start;
    return Math.min(Math.round((elapsed / totalDuration) * 100), 90); // Cap at 90% unless completed
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Review":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "Completed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "In Progress":
        return <Clock className="w-3 h-3" />;
      case "Review":
        return <AlertCircle className="w-3 h-3" />;
      case "Completed":
        return <CheckCircle2 className="w-3 h-3" />;
      default:
        return <Briefcase className="w-3 h-3" />;
    }
  };

  if (isCollapsed) return null;

  return (
    <div className="h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-xl lg:shadow-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Workspace
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-600/50">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user?.firstname && user?.lastname
                ? `${user.firstname} ${user.lastname}`
                : "Loading User..."}
            </h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">● Available</p>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Projects
          </h2>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-500">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 dark:text-slate-400">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No Projects Available</p>
            <p className="text-xs mt-1 text-center">You haven't been accepted for any projects yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onProjectSelect(project)}
                className={`group relative p-4 rounded-xl transition-all duration-200 cursor-pointer border ${
                  project.id === currentProject?.id
                    ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700 shadow-md"
                    : "bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Due:{" "}
                        {project.deadline
                          ? new Date(project.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "No deadline"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(project.status)}`}
                  >
                    {getStatusIcon(project.status)}
                    <span>{project.status}</span>
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{project.progress}%</div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onNewTask}
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">New Task</span>
          </button>

          <button
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group border border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Upload</span>
          </button>

          <button
            onClick={onGenerateInvoice}
            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200 group border border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
              <FileInvoice className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}