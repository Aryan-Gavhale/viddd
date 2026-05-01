import { useState, useEffect } from "react";
import {
  Eye,
  MessageCircle,
  ShoppingCart,
  Star,
  Users,
  TrendingUp,
  Edit3,
  Pause,
  Play,
  Copy,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  ImageIcon,
  Video,
  Filter,
  Search,
} from "lucide-react";
import axiosInstance from "../../utils/axios";
import { toast } from "react-toastify";
import { useParams } from "react-router-dom";
import { SkeletonDashboard } from "../Skeleton";


const GigDashboard = ({ gigId }) => {
  const [gig, setGig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchGigData = async () => {
      setLoading(true);
      try {
        const [gigResponse, analyticsResponse] = await Promise.all([
          axiosInstance.get(`/gigs/${gigId}`),
          axiosInstance.get(`/gigs/${gigId}/analytics`),
        ]);

        setGig(gigResponse.data.data);
        setAnalytics(analyticsResponse.data.data);
        setIsPaused(gigResponse.data.data.status === "PAUSED");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load gig data");
        toast.error("Failed to load gig data");
      } finally {
        setLoading(false);
      }
    };

    fetchGigData();
  }, [gigId]);

  const toggleGigStatus = async () => {
    try {
      const response = await axiosInstance.patch(
        `/gigs/${gigId}/pause`,
        {}
      );
      setIsPaused(!isPaused);
      setGig(gig ? { ...gig, status: response.data.data.status } : null);
      toast.success(`Gig ${response.data.data.status === "PAUSED" ? "paused" : "activated"} successfully`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update gig status");
    }
  };

  const copyGigLink = () => {
    const link = `${window.location.origin}/gigs/${gigId}`;
    navigator.clipboard.writeText(link);
    toast.success("Gig link copied to clipboard");
  };

  const deleteGig = async () => {
    if (!window.confirm("Are you sure you want to delete this gig?")) return;
    try {
      await axiosInstance.delete(`/gigs/${gigId}`);
      toast.success("Gig deleted successfully");
      // Redirect or update UI as needed
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete gig");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error || !gig || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || "Failed to load gig data"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notifications */}
        {gig.status === "DRAFT" && (
          <div className="mb-6 space-y-3">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-800 font-medium">Draft Mode</p>
                <p className="text-amber-700 text-sm">This gig is in draft mode and not visible to clients.</p>
              </div>
            </div>
          </div>
        )}

        {/* Gig Overview Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-8 text-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">{gig.category}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      gig.status === "ACTIVE"
                        ? "bg-green-500/20 text-green-100"
                        : gig.status === "PAUSED"
                          ? "bg-yellow-500/20 text-yellow-100"
                          : "bg-gray-500/20 text-gray-100"
                    }`}
                  >
                    {gig.status}
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-2">{gig.title}</h2>
                <p className="text-blue-100 mb-4">{gig.description}</p>
                <div className="flex items-center text-blue-100 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Last updated: {new Date(gig.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Packages</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gig.pricing.map((tier, index) => (
                <div
                  key={tier.name}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                    index === 1 ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {index === 1 && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 mb-2">{tier.name}</h4>
                    <div className="text-2xl font-bold text-gray-900 mb-1">${tier.price}</div>
                    <div className="flex items-center justify-center text-gray-600 text-sm mb-3">
                      <Clock className="w-4 h-4 mr-1" />
                      {tier.delivery}
                    </div>
                    <p className="text-gray-600 text-sm">{tier.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Performance Metrics */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Performance Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">+12%</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalViews.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Views</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">+8%</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalInquiries}</div>
                  <div className="text-sm text-gray-600">Inquiries</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                    <span className="text-xs text-purple-600 font-medium">+15%</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.totalPurchases}</div>
                  <div className="text-sm text-gray-600">Orders</div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Star className="w-5 h-5 text-yellow-600" />
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < Math.floor(analytics.averageRating) ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.averageRating.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Avg Rating</div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs text-indigo-600 font-medium">+5%</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.repeatClients}</div>
                  <div className="text-sm text-gray-600">Repeat Clients</div>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-pink-600" />
                    <span className="text-xs text-pink-600 font-medium">+3%</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.conversionRate}%</div>
                  <div className="text-sm text-gray-600">Conversion</div>
                </div>
              </div>
            </div>

            {/* Gig Description and Media */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Gig Details</h3>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200">
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Details</span>
                </button>
              </div>

              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 leading-relaxed">{gig.description}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Portfolio & Media</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gig.sampleMedia.map((media, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-4 flex flex-col items-center justify-center aspect-square hover:shadow-lg transition-all duration-200 cursor-pointer"
                    >
                      {media.mediaType === "VIDEO" ? (
                        <Video className="w-8 h-8 text-gray-600 mb-2" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-600 mb-2" />
                      )}
                      <span className="text-sm text-gray-600 text-center">{media.title || "Media"}</span>
                    </div>
                  ))}
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 flex flex-col items-center justify-center aspect-square hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-dashed border-blue-300">
                    <span className="text-2xl text-blue-600 mb-2">+</span>
                    <span className="text-sm text-blue-600 text-center">Add Media</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Recent Orders</h3>
                <div className="flex items-center space-x-3">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gig.orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-mono text-sm text-blue-600">{order.id}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {order.client.firstname[0] + order.client.lastname[0]}
                            </div>
                            <span className="font-medium text-gray-900">
                              {order.client.firstname} {order.client.lastname}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-gray-900">${order.amount}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : order.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "DELIVERED"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium text-sm">
                            <MessageCircle className="w-4 h-4" />
                            <span>Chat</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Client Feedback */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Client Reviews</h3>
              <div className="space-y-6">
                {gig.reviews.map((review, index) => (
                  <div key={index} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {review.client.firstname[0] + review.client.lastname[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {review.client.firstname} {review.client.lastname}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{review.feedback}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Gig</span>
                </button>

                <button
                  onClick={toggleGigStatus}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl ${
                    isPaused
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                      : "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700"
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? "Resume Gig" : "Pause Gig"}</span>
                </button>

                <button
                  onClick={copyGigLink}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Gig Link</span>
                </button>

                <button
                  onClick={deleteGig}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Gig</span>
                </button>
              </div>
            </div>

            {/* Analytics Chart */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Views Analytics</h3>
              <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Chart visualization</p>
                  <p className="text-gray-500 text-xs">Daily views trend</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-semibold text-gray-900">${analytics.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">New Orders</span>
                  <span className="font-semibold text-gray-900">{analytics.totalPurchases}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold text-gray-900">{analytics.responseTime != null ? analytics.responseTime.toFixed(1) : 'N/A'}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-green-600">{analytics.completionRate != null ? analytics.completionRate.toFixed(1) : 'N/A'}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GigDetailWrapper = () => {
  const { gigId } = useParams();
  return <GigDashboard gigId={gigId} />;
};

export default GigDetailWrapper;