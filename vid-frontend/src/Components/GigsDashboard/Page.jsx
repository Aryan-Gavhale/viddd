import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate for redirection
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Grid,
  List,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Star,
  Trash,
  TrendingUp,
  Video,
} from "lucide-react";
import axiosInstance from "../../utils/axios";
import { SkeletonGigGrid } from "../Skeleton";
import CreateGigForm from "./GigForm";

export default function GigDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [gigs, setGigs] = useState([]);
  const [stats, setStats] = useState({
    activeGigs: 0,
    pendingOrders: 0,
    totalViews: 0,
    monthlyEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // For redirecting after delete
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [gigToUpdate, setGigToUpdate] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gigsResponse, pendingOrdersResponse, earningsResponse] = await Promise.all([
        axiosInstance.get("/gigs/freelancer"),
        axiosInstance.get("/orders/pending"),
        axiosInstance.get("/transactions/earnings"),
      ]);

      const gigsData = gigsResponse.data.data || [];
      // If gigsData is an object with a 'gigs' property, use that, else fallback to gigsData itself (for backward compatibility)
      const gigsArray = Array.isArray(gigsData) ? gigsData : (gigsData.gigs || []);
      setGigs(gigsArray);

      const pendingOrders = pendingOrdersResponse.data.data.length || 0;
      const totalViews = gigsArray.reduce((sum, gig) => sum + (gig.views || 0), 0);
      const activeGigs = gigsArray.filter(gig => gig.status === "ACTIVE").length;
      const monthlyEarnings = earningsResponse.data.data.reduce((sum, earning) => sum + (earning.amount || 0), 0);

      setStats({
        activeGigs,
        pendingOrders,
        totalViews,
        monthlyEarnings: monthlyEarnings.toLocaleString(),
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      console.log("Error response:", err.response?.data);
      setError(err.response?.data?.message || "Failed to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a gig
  const handleDeleteGig = async (gigId, isDraft) => {
    if (!window.confirm("Are you sure you want to delete this gig?")) return;

    try {
      const endpoint = isDraft ? `/gigs/draft/${gigId}` : `/gigs/${gigId}`;
      await axiosInstance.delete(endpoint);
      setGigs(gigs.filter(gig => gig.id !== gigId));
      fetchDashboardData(); // Refresh stats after deletion
      alert("Gig deleted successfully!");
    } catch (err) {
      console.error("Delete gig error:", err);
      setError(err.response?.data?.message || "Failed to delete gig.");
    }
  };

  // Pause/Unpause a gig
  const handlePauseGig = async (gigId) => {
    try {
      setLoading(true);
      const response = await axiosInstance.patch(`/gigs/${gigId}/pause`, {});
      
      // Update the gig's status locally to avoid a full refetch
      setGigs(prevGigs => 
        prevGigs.map(gig => 
          gig.id === gigId 
            ? { ...gig, status: gig.status === "PAUSED" ? "ACTIVE" : "PAUSED" } 
            : gig
        )
      );
      
      // Show success message
      alert(response?.data?.message || "Gig status updated successfully");
      
      // Refresh data to ensure everything is up to date
      fetchDashboardData();
    } catch (err) {
      console.error("Error pausing/unpausing gig:", err);
      alert("Failed to update gig status. " + (err.response?.data?.message || "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  // Update a gig
  const handleUpdateGig = (gig) => {
    navigate(`/editor/gigs/${gig.id}/edit`);
  };

  const handleUpdateSubmit = async (updatedData) => {
    try {
      await axiosInstance.put(`/gigs/${gigToUpdate.id}`, updatedData);
      setShowUpdateModal(false);
      setGigToUpdate(null);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to update gig");
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredGigs = gigs.filter(gig => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return gig.status === "ACTIVE";
    if (activeTab === "paused") return gig.status === "PAUSED";
    if (activeTab === "draft") return gig.status === "DRAFT"; // Corrected to "DRAFT"
    return false;
  });

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse bg-gray-200 rounded h-8 w-48 mb-6" />
          <SkeletonGigGrid count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-64 bg-gradient-to-bl from-purple-100/30 to-indigo-100/10 rounded-bl-full -z-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/4 h-64 bg-gradient-to-tr from-purple-100/20 to-indigo-100/5 rounded-tr-full -z-10 blur-3xl"></div>

        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-6 md:p-8 mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Gigs</h1>
              <p className="text-purple-100 max-w-lg">
                Manage your video editing services and track performance all in one place
              </p>
            </div>
            <button className="mt-6 md:mt-0 group inline-flex items-center px-6 py-3 rounded-full text-purple-700 bg-white hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl">
              <Plus className="w-5 h-5 mr-2" />
              <Link to="/editor/gigs/new">
                <span className="font-medium">Create New Gig</span>
              </Link>
              <ArrowUpRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Gigs</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {stats.activeGigs}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                <Video className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+{Math.round(stats.activeGigs * 0.25)} from last month</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  {stats.pendingOrders}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-xs text-red-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+{Math.round(stats.pendingOrders * 0.4)} from last week</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {stats.totalViews}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+{Math.round(stats.totalViews * 0.18)}% from last month</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Earnings</p>
                <h3 className="text-3xl font-bold mt-1 bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  ${stats.monthlyEarnings}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-xs text-green-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+12% from last month</span>
            </div>
          </div>
        </div>

        {/* Gigs Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  activeTab === "all"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All Gigs
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  activeTab === "active"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("paused")}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  activeTab === "paused"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Paused
              </button>
              <button
                onClick={() => setActiveTab("draft")}
                className={`px-4 py-2 text-sm rounded-full transition-all ${
                  activeTab === "draft"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Drafts
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <button className="flex items-center px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-all">
                  <span>Sort By</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
              </div>

              <div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-all ${viewMode === "grid" ? "bg-purple-600 text-white" : "bg-white text-gray-600"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-all ${viewMode === "list" ? "bg-purple-600 text-white" : "bg-white text-gray-600"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gigs Grid */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGigs.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">You have not created any gigs yet.</p>
              </div>
            ) : (
              filteredGigs.map(gig => (
                <Link key={gig.id} to={`/editor/gigs/${gig.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div
                    className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 duration-300"
                  >
                    <div className="relative">
                      <img
                        src={gig.sampleMedia[0]?.mediaUrl || "/placeholder.svg?height=180&width=320"}
                        width={320}
                        height={180}
                        alt={gig.title}
                        className="w-full h-48 object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                      <div
                        className={`absolute top-3 right-3 text-white text-xs px-3 py-1 rounded-full shadow-md ${
                          gig.status === "ACTIVE"
                            ? "bg-green-500"
                            : gig.status === "PAUSED"
                            ? "bg-amber-500"
                            : gig.status === "DRAFT"
                            ? "bg-gray-500"
                            : "bg-gray-500"
                        }`}
                      >
                        {gig.status.charAt(0) + gig.status.slice(1).toLowerCase()}
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">{gig.title}</h3>
                      <div className="flex items-center mb-4">
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${star <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-700 ml-2">4.9</span> {/* Placeholder */}
                        </div>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-sm text-gray-500">{gig.orders?.length || 0} Orders</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-500">
                          Starting at{" "}
                          <span className="text-xl font-bold text-gray-900">${gig.pricing[0]?.price || 0}</span>
                        </p>
                        <div className="flex space-x-1">
                          <Link to={`/editor/gigs/${gig.id}/edit`} onClick={e => e.stopPropagation()}>
                            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                              <Edit className="w-5 h-5 text-gray-500" />
                            </button>
                          </Link>
                          <button
                            onClick={e => { e.preventDefault(); handlePauseGig(gig.id); }}
                            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                              gig.status === "PAUSED" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {gig.status === "PAUSED" ? "Unpause" : "Pause"}
                          </button>
                          <button
                            onClick={e => { e.preventDefault(); handleDeleteGig(gig.id, gig.status === "DRAFT"); }}
                            className="p-2 rounded-full hover:bg-red-100 transition-colors"
                          >
                            <Trash className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Gigs List */}
        {viewMode === "list" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gig
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredGigs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        You have not created any gigs yet.
                      </td>
                    </tr>
                  ) : (
                    filteredGigs.map(gig => (
                      <tr key={gig.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-12 w-20 flex-shrink-0 rounded-lg overflow-hidden">
                              <img
                                src={gig.sampleMedia[0]?.mediaUrl || "/placeholder.svg?height=48&width=80"}
                                width={80}
                                height={48}
                                alt={gig.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                <Link to={`/editor/gigs/${gig.id}`}>{gig.title}</Link>
                              </div>
                              <div className="text-xs text-gray-500">
                                Updated {new Date(gig.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              gig.status === "ACTIVE"
                                ? "bg-green-100 text-green-800"
                                : gig.status === "PAUSED"
                                ? "bg-amber-100 text-amber-800"
                                : gig.status === "DRAFT"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {gig.status.charAt(0) + gig.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="ml-1 text-sm text-gray-900">4.9</span> {/* Placeholder */}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {gig.orders?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${gig.pricing[0]?.price || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link to={`/editor/gigs/${gig.id}/edit`}>
                              <button className="text-indigo-600 hover:text-indigo-900 font-medium">
                                Edit
                              </button>
                            </Link>
                            <button
                              onClick={() => handlePauseGig(gig.id)}
                              className={`${
                                gig.status === "PAUSED"
                                  ? "text-green-600 hover:text-green-900"
                                  : "text-gray-600 hover:text-gray-900"
                              } font-medium`}
                            >
                              {gig.status === "PAUSED" ? "Unpause" : "Pause"}
                            </button>
                            <button
                              onClick={() => handleDeleteGig(gig.id, gig.status === "DRAFT")}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Placeholder */}
        {filteredGigs.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">{filteredGigs.length}</span> of{" "}
              <span className="font-medium">{gigs.length}</span> results
            </div>
            <div className="flex space-x-2">
              <button className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all">
                Previous
              </button>
              <button className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all">
                1
              </button>
              <button className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all">
                Next
              </button>
            </div>
          </div>
        )}

        {showUpdateModal && (
          <Modal onClose={() => setShowUpdateModal(false)}>
            <CreateGigForm initialValues={gigToUpdate} onSubmit={handleUpdateSubmit} isUpdate />
          </Modal>
        )}
      </div>
    </div>
  );
}