"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import axiosInstance from "../../utils/axios" // Adjust path as needed
import {
  Clock,
  Star,
  Check,
  ChevronRight,
  Share2,
  MessageCircle,
  Play,
  Calendar,
  Shield,
  Award,
  Globe,
  Package,
  Zap,
  Video,
  Music,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Heart,
} from "lucide-react"

export default function GigDescriptionPage() {
  const { gigId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [gig, setGig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPackage, setSelectedPackage] = useState("Basic")
  const [expandedDesc, setExpandedDesc] = useState({})

  useEffect(() => {
    const fetchGig = async () => {
      try {
        setLoading(true)
        const response = await axiosInstance.get(`/gig/${gigId}`)
        console.log("Backend response:", response.data)

        if (!response.data || !response.data.data) {
          throw new Error("Invalid response structure or gig not found")
        }

        const gigData = response.data.data
        const experienceMap = {
          ENTRY: "1-3 years",
          INTERMEDIATE: "3-7 years",
          EXPERT: "7+ years",
        }

        setGig({
          id: gigData.id || "",
          title: gigData.title || "Untitled Gig",
          description: gigData.description || "No description provided.",
          category: gigData.category || "general",
          rating: gigData.rating || 0,
          reviews: gigData.reviews || 0,
          thumbnail:
            gigData.sampleMedia?.find((media) => media.mediaType === "THUMBNAIL")?.mediaUrl ||
            "/placeholder.svg?height=720&width=1280",
          portfolio:
            gigData.sampleMedia
              ?.filter((media) => media.mediaType !== "THUMBNAIL")
              .map((media, index) => ({
                id: index,
                url: media.mediaUrl || `/placeholder.svg?height=180&width=320&text=Sample ${index + 1}`,
              })) || [],
          seller: {
            name:
              gigData.freelancer?.user?.firstname && gigData.freelancer?.user?.lastname
                ? `${gigData.freelancer.user.firstname} ${gigData.freelancer.user.lastname}`
                : gigData.freelancer?.user?.firstname || "Anonymous",
            avatar: gigData.freelancer?.user?.profilePicture || "/placeholder.svg?height=200&width=200",
            badge: gigData.freelancer?.userBadges?.[0]?.badge?.name || "Standard",
            rating: gigData.freelancer?.rating || 0,
            reviews: gigData.freelancer?.reviewsReceived?.length || 0,
            location: gigData.freelancer?.city || gigData.freelancer?.user?.country || "Unknown",
            experience: experienceMap[gigData.freelancer?.experienceLevel] || "Not specified",
            responseTime: "Not specified",
            bio: gigData.freelancer?.overview || gigData.freelancer?.user?.bio || "No bio available.",
          },
          packages: Array.isArray(gigData.pricing)
            ? gigData.pricing.map((pkg) => ({
                type: pkg.name || "Basic",
                name: pkg.name || "Unnamed Package",
                price: pkg.price || 0,
                description: pkg.description || gigData.description,
                delivery: pkg.deliveryTime || "Not specified",
                revisions: pkg.revisions || 0,
                duration: pkg.duration || "Not specified",
                features: pkg.features || [],
              }))
            : [
                {
                  type: "Basic",
                  name: "Default Package",
                  price: 0,
                  description: "",
                  delivery: "Not specified",
                  revisions: 0,
                  duration: "Not specified",
                  features: [],
                },
              ],
          testimonials: gigData.reviewsReceived || [],
        })
      } catch (err) {
        console.error("Error fetching gig:", err)
        setError(
          err.response?.status === 404
            ? "Gig not found."
            : err.response?.status === 401
              ? "Please log in to view this gig."
              : "Failed to load gig details. Please try again.",
        )
      } finally {
        setLoading(false)
      }
    }

    if (gigId) {
      fetchGig()
    } else {
      setError("Invalid gig ID.")
      setLoading(false)
    }
  }, [gigId])

  const toggleDescription = (packageType) => {
    setExpandedDesc((prev) => ({
      ...prev,
      [packageType]: !prev[packageType],
    }))
  }

  const truncateText = (text, maxLength = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const getPackageColors = (index) => {
    const colors = [
      {
        bg: "from-emerald-500 to-teal-600",
        border: "border-emerald-200",
        text: "text-emerald-700",
        accent: "bg-emerald-50",
        button: "bg-emerald-600 hover:bg-emerald-700",
        tab: "bg-emerald-100 text-emerald-800",
      },
      {
        bg: "from-blue-500 to-indigo-600",
        border: "border-blue-200",
        text: "text-blue-700",
        accent: "bg-blue-50",
        button: "bg-blue-600 hover:bg-blue-700",
        tab: "bg-blue-100 text-blue-800",
      },
      {
        bg: "from-purple-500 to-pink-600",
        border: "border-purple-200",
        text: "text-purple-700",
        accent: "bg-purple-50",
        button: "bg-purple-600 hover:bg-purple-700",
        tab: "bg-purple-100 text-purple-800",
      },
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 absolute top-0"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <p className="text-red-600 text-lg mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
          <p className="text-gray-600 text-lg mb-6">Gig not found.</p>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Mobile Pricing Modal Overlay */}
      <div
        className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 opacity-0 pointer-events-none transition-opacity duration-300"
        id="mobile-pricing-overlay"
      ></div>

      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8 lg:mb-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-full text-sm font-semibold mb-4 lg:mb-6 shadow-sm">
              <Zap className="w-4 h-4" />
              <span>{gig.category.charAt(0).toUpperCase() + gig.category.slice(1)}</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
              {gig.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-sm border border-white/20">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.floor(gig.rating) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 font-bold text-gray-900">{gig.rating.toFixed(1)}</span>
                <span className="ml-1 text-gray-600">({gig.reviews.toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-sm border border-white/20">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-gray-700">{gig.seller.badge}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 lg:self-start">
            <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white border border-white/20 text-gray-700 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white border border-white/20 text-gray-700 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Portfolio & Info */}
          <div className="lg:col-span-2 space-y-8 lg:space-y-12">
            {/* Portfolio Showcase */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 aspect-video group shadow-2xl border border-white/10">
              <img
                src={gig.thumbnail || "/placeholder.svg"}
                alt={`${gig.title} portfolio`}
                width={1280}
                height={720}
                className="object-cover w-full h-full opacity-70 group-hover:opacity-50 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="bg-white/90 hover:bg-white rounded-full p-6 transition-all duration-300 transform hover:scale-110 shadow-2xl backdrop-blur-sm border border-white/20">
                  <Play className="w-10 h-10 text-purple-700 fill-purple-700" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                <div className="text-white text-xl lg:text-3xl font-bold mb-2 drop-shadow-lg">
                  {gig.title.toUpperCase()}
                </div>
                <div className="text-gray-200 text-sm lg:text-base drop-shadow-md">
                  {truncateText(gig.description, 100)}
                </div>
              </div>
            </div>

            {/* Portfolio Grid */}
            {gig.portfolio.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
                {gig.portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 cursor-pointer hover:opacity-80 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-2 border border-white/20"
                  >
                    <img
                      src={item.url || "/placeholder.svg"}
                      alt={`Portfolio sample ${item.id}`}
                      width={320}
                      height={180}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* About This Gig */}
            <div className="space-y-6 lg:space-y-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                About This Gig
              </h2>

              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-6 rounded-3xl border border-emerald-100 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-3 text-emerald-800 font-bold text-lg">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  100% Satisfaction Guarantee or Full Refund
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-xl border border-white/20">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">{gig.description}</p>
                <p className="text-gray-600 mb-8">
                  My expertise spans across multiple domains including commercial production, YouTube content
                  optimization, wedding cinematography, corporate videos, and advanced techniques like multicam editing
                  and green screen compositing.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-100 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      Technical Excellence
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700">Output in any format including 4K HDR</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700">Professional color grading & LUTs</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700">Adobe Premiere Pro & After Effects</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 shadow-lg">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      Creative Services
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700">Custom motion graphics & animations</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700">Curated royalty-free music library</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700">Professional sound design & mixing</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* About Seller */}
            <div className="space-y-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                Meet Your Editor
              </h2>

              <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/20 shadow-xl p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-purple-100 to-indigo-100">
                      <img
                        src={gig.seller.avatar || "/placeholder.svg"}
                        alt={`${gig.seller.name} profile`}
                        width={200}
                        height={200}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-2 border-4 border-white shadow-lg">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">{gig.seller.name}</h3>
                    <p className="text-purple-700 font-semibold mb-3">Senior Video Editor & Colorist</p>
                    <div className="flex items-center gap-2 mb-4 bg-amber-50 rounded-2xl px-4 py-2 w-fit">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.floor(gig.seller.rating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-gray-200 text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-gray-900">{gig.seller.rating.toFixed(1)}</span>
                      <span className="text-gray-600">({gig.seller.reviews.toLocaleString()})</span>
                    </div>
                    <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                      Contact Me
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mt-8 pt-6 border-t border-gray-100">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">Location</div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-gray-700">{gig.seller.location}</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">Experience</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-gray-700">{gig.seller.experience}</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl">
                    <div className="text-sm text-gray-500 mb-1">Response Time</div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold text-gray-700">{gig.seller.responseTime}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-gray-700 italic leading-relaxed">{gig.seller.bio}</p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            {gig.testimonials.length > 0 && (
              <div className="space-y-6 lg:space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    Client Testimonials
                  </h2>
                  <a href="#" className="text-purple-600 hover:text-purple-800 font-semibold text-sm lg:text-base">
                    View all {gig.reviews.toLocaleString()} reviews
                  </a>
                </div>

                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-6 lg:p-8 rounded-3xl border border-amber-100 shadow-xl">
                  <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
                    <div className="text-center">
                      <div className="text-4xl lg:text-6xl font-bold text-gray-900 mb-2">{gig.rating.toFixed(1)}</div>
                      <div className="flex justify-center mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 lg:w-6 lg:h-6 ${
                              star <= Math.floor(gig.rating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-amber-200 text-amber-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-600 font-semibold">Exceptional</div>
                    </div>

                    <div className="flex-1 space-y-3 w-full">
                      {[
                        { stars: 5, percentage: 92, count: 1271 },
                        { stars: 4, percentage: 5, count: 45 },
                        { stars: 3, percentage: 1, count: 10 },
                        { stars: 2, percentage: 0.5, count: 6 },
                        { stars: 1, percentage: 0.2, count: 2 },
                      ].map((rating) => (
                        <div key={rating.stars} className="flex items-center gap-4">
                          <div className="text-sm font-semibold w-16">{rating.stars} Stars</div>
                          <div className="flex-1 h-3 bg-amber-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-1000"
                              style={{ width: `${rating.percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-gray-600 w-12 text-right">({rating.count})</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {gig.testimonials.slice(0, 3).map((review) => (
                    <div
                      key={review.id}
                      className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-100 to-indigo-100 flex-shrink-0">
                          <img
                            src={`/placeholder.svg?height=100&width=100&text=${review.name.charAt(0)}`}
                            alt={`${review.name} avatar`}
                            width={100}
                            height={100}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900">{review.name}</h4>
                            <div className="text-sm text-gray-500">{review.date}</div>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "fill-gray-200 text-gray-200"
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                              {review.country}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed mb-4">{review.comment}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">
                            {review.package}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{review.delivery}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Pricing (Desktop) */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
                {/* Package Tabs */}
                <div className="flex border-b border-gray-100">
                  {gig.packages.map((pkg, index) => {
                    const colors = getPackageColors(index)
                    return (
                      <button
                        key={pkg.type}
                        className={`flex-1 py-4 px-2 font-semibold text-center relative transition-all duration-300 ${
                          selectedPackage === pkg.type
                            ? `${colors.tab} border-b-2 border-current`
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedPackage(pkg.type)}
                      >
                        <div className="text-sm">{pkg.name}</div>
                        <div className="text-xs opacity-75">${pkg.price}</div>
                      </button>
                    )
                  })}
                </div>

                {/* Package Content */}
                <div className="p-6">
                  {gig.packages.map((pkg, index) => {
                    const colors = getPackageColors(index)
                    const isExpanded = expandedDesc[pkg.type]
                    const shouldTruncate = pkg.description.length > 80

                    return (
                      <div key={pkg.type} className={selectedPackage === pkg.type ? "block" : "hidden"}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-xl text-gray-900">{pkg.name}</h3>
                          <div
                            className={`text-3xl font-bold bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}
                          >
                            ${pkg.price}
                          </div>
                        </div>

                        <div className="mb-5 pb-5 border-b border-gray-100">
                          <p className="text-gray-600 leading-relaxed">
                            {shouldTruncate && !isExpanded ? truncateText(pkg.description, 80) : pkg.description}
                          </p>
                          {shouldTruncate && (
                            <button
                              onClick={() => toggleDescription(pkg.type)}
                              className="text-purple-600 hover:text-purple-800 text-sm font-semibold mt-2 flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  Show less <ChevronUp className="w-4 h-4" />
                                </>
                              ) : (
                                <>
                                  See more <ChevronDown className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                          <div
                            className={`flex items-center gap-2 ${colors.accent} p-3 rounded-xl border ${colors.border}`}
                          >
                            <Clock className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                            <div className="text-gray-700 font-semibold text-sm">{pkg.delivery}</div>
                          </div>
                          <div
                            className={`flex items-center gap-2 ${colors.accent} p-3 rounded-xl border ${colors.border}`}
                          >
                            <Package className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                            <div className="text-gray-700 font-semibold text-sm">
                              {pkg.revisions} Revision{pkg.revisions !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 mb-6">
                          <h4 className="font-bold text-gray-900 text-sm">Service Includes:</h4>
                          <div className="space-y-2">
                            {pkg.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-start gap-2">
                                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-gray-700 text-sm">{feature}</span>
                              </div>
                            ))}
                            <div className="flex items-start gap-2">
                              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-gray-700 text-sm">{pkg.duration}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() =>
                              navigate(`/gig/${gig.id}/${pkg.name}/project-brief`, { state: { gig, pkg } })
                            }
                            className={`w-full py-4 ${colors.button} text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
                          >
                            Continue
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <button className="w-full py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 font-semibold rounded-2xl transition-all duration-300 hover:border-gray-300">
                            Contact Me
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-3xl p-6 text-white shadow-2xl border border-purple-800/20">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-purple-900" />
                  </div>
                  Need a Custom Quote?
                </h3>
                <p className="mb-4 text-purple-100 text-sm leading-relaxed">
                  Have a unique project? Let's discuss your specific requirements.
                </p>
                <button className="w-full py-3 bg-white text-purple-900 font-bold rounded-2xl hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  Request Custom Package
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Pricing Section */}
        <div className="lg:hidden mt-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            {/* Mobile Package Tabs */}
            <div className="flex overflow-x-auto scrollbar-hide">
              {gig.packages.map((pkg, index) => {
                const colors = getPackageColors(index)
                return (
                  <button
                    key={pkg.type}
                    className={`flex-shrink-0 py-4 px-6 font-semibold text-center transition-all duration-300 ${
                      selectedPackage === pkg.type
                        ? `${colors.tab} border-b-2 border-current`
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setSelectedPackage(pkg.type)}
                  >
                    <div className="text-sm whitespace-nowrap">{pkg.name}</div>
                    <div className="text-xs opacity-75">${pkg.price}</div>
                  </button>
                )
              })}
            </div>

            {/* Mobile Package Content */}
            <div className="p-4">
              {gig.packages.map((pkg, index) => {
                const colors = getPackageColors(index)
                const isExpanded = expandedDesc[pkg.type]
                const shouldTruncate = pkg.description.length > 60

                return (
                  <div key={pkg.type} className={selectedPackage === pkg.type ? "block" : "hidden"}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
                      <div className={`text-2xl font-bold bg-gradient-to-r ${colors.bg} bg-clip-text text-transparent`}>
                        ${pkg.price}
                      </div>
                    </div>

                    <div className="mb-4 pb-4 border-b border-gray-100">
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {shouldTruncate && !isExpanded ? truncateText(pkg.description, 60) : pkg.description}
                      </p>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleDescription(pkg.type)}
                          className="text-purple-600 hover:text-purple-800 text-sm font-semibold mt-2 flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              Show less <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              See more <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div
                        className={`flex items-center gap-2 ${colors.accent} p-2 rounded-xl border ${colors.border}`}
                      >
                        <Clock className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                        <div className="text-gray-700 font-semibold text-xs">{pkg.delivery}</div>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${colors.accent} p-2 rounded-xl border ${colors.border}`}
                      >
                        <Package className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                        <div className="text-gray-700 font-semibold text-xs">
                          {pkg.revisions} Rev{pkg.revisions !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <h4 className="font-bold text-gray-900 text-sm">Includes:</h4>
                      <div className="space-y-1">
                        {pkg.features.slice(0, 3).map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start gap-2">
                            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                            <span className="text-gray-700 text-xs">{feature}</span>
                          </div>
                        ))}
                        {pkg.features.length > 3 && (
                          <div className="text-xs text-gray-500 ml-6">+{pkg.features.length - 3} more features</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => navigate(`/gig/${gig.id}/${pkg.name}/project-brief`, { state: { gig, pkg } })}
                        className={`w-full py-3 ${colors.button} text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg`}
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-200 font-semibold rounded-2xl transition-all duration-300 text-sm">
                        Contact Me
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
