"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  Camera,
  Check,
  Clock,
  Heart,
  ImageIcon,
  MapPin,
  MessageCircle,
  MoreVertical,
  Share2,
  Star,
  User,
  Briefcase,
  Zap,
  Edit,
  Upload,
  Plus,
  X,
  Video,
  Save,
  Sparkles,
  Award,
  Palette,
  Settings,
  Calendar,
  CheckCircle,
  AlertCircle,
  Globe,
  BookOpen,
  GraduationCap,
  CalendarDays,
  Phone,
  ExternalLink,
  Languages,
  Film,
  Monitor,
  Scissors,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "react-toastify"
import { useSelector } from "react-redux"
import "./animation.css"
import axiosInstance from "../../utils/axios"
import FreelancerPortfolio from "../Portfolio/FreelancerPortfolio"

// Helper function to replace the cn utility
function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

export default function ProfilePage() {
  const { freelancerId } = useParams()
  const navigate = useNavigate()
  const currentUserId = useSelector((state) => state.user.id)
  const [activeTab, setActiveTab] = useState("portfolio")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(null)
  const [profile, setProfile] = useState({})
  const [portfolioItems, setPortfolioItems] = useState([])
  const [about, setAbout] = useState({ text: "", services: [] })
  const [equipment, setEquipment] = useState({ cameras: [], lenses: [], lighting: [] })
  const [gigs, setGigs] = useState([])
  const [badges, setBadges] = useState([])
  const [isOwner, setIsOwner] = useState(false)
  const [stats, setStats] = useState({ totalJobs: 0, totalHours: 0, successRate: 0, rating: 0 })
  const [isAddingContent, setIsAddingContent] = useState(false)
  const [contentType, setContentType] = useState("")
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
    category: "",
    description: "",
    mediaType: "image",
    mediaUrl: "",
  })
  const [newEquipment, setNewEquipment] = useState({
    type: "cameras",
    name: "",
  })
  const [isEditingAbout, setIsEditingAbout] = useState(false)
  const [freelancerProfileId, setFreelancerProfileId] = useState(null)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [notificationType, setNotificationType] = useState("success")
  const [aboutMe, setAboutMe] = useState({
    intro: "",
    background: "",
    projectTypes: [],
    languages: [],
    whyFreelance: "",
    reelUrl: "",
    portfolioUrl: "",
  })
  const [certifications, setCertifications] = useState([])
  const [availability, setAvailability] = useState({
    workingHours: { start: "09:00", end: "17:00" },
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    deliveryWindows: ["24h", "3-day", "1-week"],
    discoveryCall: { enabled: true, duration: 30, price: 0 },
    timeOff: [],
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef(null)

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      try {
        const endpoint = freelancerId ? `/users/profile/${freelancerId}` : "/users/me"
        console.log("Fetching profile - Endpoint:", endpoint)
        console.log("Freelancer ID from params:", freelancerId)

        const { data } = await axiosInstance.get(endpoint)
        console.log("Raw API Response:", data)
        console.log("User data received:", data.data)

        const userData = data.data
        if (!userData) {
          console.error("No user data found in response")
          toast.error("Freelancer profile not found")
          return
        }

        // Set profile data
        setProfile({
          id: userData.id,
          firstname: userData.firstname || "",
          lastname: userData.lastname || "",
          profilePicture: userData.profilePicture || "/placeholder.svg?height=160&width=160",
          isVerified: userData.isVerified || false,
          lastNameChange: userData.lastNameChange || null,
          hourlyRate: userData.freelancerProfile?.hourlyRate || 85,
          country: userData.country || "United States",
          city: userData.freelancerProfile?.city || "New York",
          bio: userData.bio || "",
        })

        setFreelancerProfileId(userData.freelancerProfile?.id ?? null)

        // Map portfolio videos (used by legacy add/delete flows; display uses FreelancerPortfolio)
        const mappedPortfolioItems = (userData.freelancerProfile?.portfolioVideos || []).map((video) => ({
          id: video.id,
          title: video.title,
          mediaType: "video",
          mediaUrl: video.videoUrl,
          description: video.description,
          category: video.category,
          uploadedAt: video.uploadedAt,
        }))
        setPortfolioItems(mappedPortfolioItems)

        // Set about data
        setAbout({
          text: userData.freelancerProfile?.overview || "",
          services: userData.freelancerProfile?.skills || [],
        })

        // Set equipment data
        setEquipment({
          cameras: userData.freelancerProfile?.equipmentCameras?.split(", ") || [],
          lenses: userData.freelancerProfile?.equipmentLenses?.split(", ") || [],
          lighting: userData.freelancerProfile?.equipmentLighting?.split(", ") || [],
        })

        // Set gigs data
        setGigs(userData.freelancerProfile?.gigs || [])

        // Set badges with editor-specific badges
        const editorBadges = [
          {
            id: 1,
            name: "Video Editor Pro",
            icon: <Film className="w-3.5 h-3.5 text-blue-500" />,
            achieved: true,
            isVisible: true,
          },
          {
            id: 2,
            name: "Motion Graphics",
            icon: <Monitor className="w-3.5 h-3.5 text-green-500" />,
            achieved: true,
            isVisible: true,
          },
          {
            id: 3,
            name: "Color Grading Expert",
            icon: <Palette className="w-3.5 h-3.5 text-purple-500" />,
            achieved: true,
            isVisible: true,
          },
          {
            id: 4,
            name: "Audio Specialist",
            icon: <Play className="w-3.5 h-3.5 text-red-500" />,
            achieved: true,
            isVisible: true,
          },
          {
            id: 5,
            name: "Fast Turnaround",
            icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
            achieved: true,
            isVisible: true,
          },
        ]
        setBadges(editorBadges)

        // Set stats data
        setStats({
          totalJobs: userData.totalJobs || 0,
          totalHours: userData.totalHours || 0,
          successRate: userData.successRate || 0,
          rating: userData.rating || 0,
        })

        // Check if current user is the owner (auth via cookies; id from Redux)
        if (currentUserId) {
          setIsOwner(!freelancerId || userData.id === currentUserId)
        } else {
          setIsOwner(false)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error(error.response?.data?.message || "Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [freelancerId, currentUserId])

  // Owner-only handlers with isOwner check
  const handleSaveProfile = async (updatedProfile) => {
    if (!isOwner) {
      toast.error("You don't have permission to edit this profile")
      return
    }
    try {
      const { data } = await axiosInstance.patch("/users/me", updatedProfile)
      setProfile(data.data)
      setIsModalOpen(false)
      showNotificationMessage("Profile updated successfully", "success")
    } catch (error) {
      console.error("Error updating profile:", error)
      showNotificationMessage("Failed to update profile", "error")
    }
  }

  const handleDeleteItem = async (type, id) => {
    if (!isOwner) {
      toast.error("You don't have permission to delete items from this profile")
      return
    }
    try {
      await axiosInstance.delete(`/users/me/${type}/${id}`)
      if (type === "portfolio") setPortfolioItems((prev) => prev.filter((item) => item.id !== id))
      if (type === "gigs") setGigs((prev) => prev.filter((gig) => gig.id !== id))
      showNotificationMessage(`${type} item deleted successfully`, "success")
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
      showNotificationMessage(`Failed to delete ${type} item`, "error")
    }
  }

  const handleUpdateItem = async (type, id, updatedItem) => {
    if (!isOwner) {
      toast.error("You don't have permission to update items on this profile")
      return
    }
    try {
      await axiosInstance.patch(`/users/me`, { [type]: updatedItem })
      if (type === "portfolio") setPortfolioItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)))
      if (type === "gigs") setGigs((prev) => prev.map((gig) => (gig.id === id ? updatedItem : gig)))
      showNotificationMessage(`${type} item updated successfully`, "success")
    } catch (error) {
      console.error(`Error updating ${type}:`, error)
      showNotificationMessage(`Failed to update ${type} item`, "error")
    }
  }

  const handleAddItem = async (type) => {
    if (!isOwner) {
      toast.error("You don't have permission to add items to this profile")
      return
    }
    try {
      let payload = {}
      let response
      if (type === "portfolio") {
        payload = { portfolio: newPortfolioItem }
        response = await axiosInstance.post("/users/me/portfolio", newPortfolioItem)
        setPortfolioItems((prev) => [...prev, response.data.data])
      } else if (type === "equipment") {
        const updatedEquipment = {
          ...equipment,
          [newEquipment.type]: [...equipment[newEquipment.type], newEquipment.name],
        }
        setEquipment(updatedEquipment)
        payload = {
          [`equipment${newEquipment.type.charAt(0).toUpperCase() + newEquipment.type.slice(1)}`]:
            updatedEquipment[newEquipment.type].join(", "),
        }
        await axiosInstance.patch("/users/me", payload)
      }
      setIsAddingContent(false)
      setNewPortfolioItem({ title: "", category: "", description: "", mediaType: "image", mediaUrl: "" })
      setNewEquipment({ type: "cameras", name: "" })
      showNotificationMessage(`New ${type} added successfully`, "success")
    } catch (error) {
      console.error(`Error adding ${type}:`, error)
      showNotificationMessage(`Failed to add ${type}`, "error")
    }
  }

  const handleSaveAbout = async () => {
    if (!isOwner) {
      toast.error("You don't have permission to edit this profile")
      return
    }
    try {
      await axiosInstance.patch("/users/me", { overview: about.text })
      setIsEditingAbout(false)
      showNotificationMessage("About section updated successfully", "success")
    } catch (error) {
      console.error("Error updating about section:", error)
      showNotificationMessage("Failed to update about section", "error")
    }
  }

  const showNotificationMessage = (message, type) => {
    setNotificationMessage(message)
    setNotificationType(type)
    setShowNotification(true)
    setTimeout(() => {
      setShowNotification(false)
    }, 3000)
  }

  const handleFileUpload = (e) => {
    if (!isOwner) {
      toast.error("You don't have permission to upload files to this profile")
      return
    }
    const file = e.target.files[0]
    if (file) {
      const localUrl = URL.createObjectURL(file)
      setNewPortfolioItem({
        ...newPortfolioItem,
        mediaUrl: localUrl,
      })
    }
  }

  const handleCreateGig = () => {
    navigate("/editor/gigs/new")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-purple-200 to-indigo-200" />
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-5 -mt-16">
                <div className="h-32 w-32 rounded-full bg-gray-300 border-4 border-white shadow-lg" />
                <div className="mt-6 flex-1 space-y-3">
                  <div className="h-7 w-64 bg-gray-300 rounded" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-24 bg-gray-100 rounded-xl" />
                <div className="h-24 bg-gray-100 rounded-xl" />
                <div className="h-24 bg-gray-100 rounded-xl" />
              </div>
              <div className="mt-8 space-y-3">
                <div className="h-6 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-4 w-5/6 bg-gray-100 rounded" />
                <div className="h-4 w-4/6 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {showNotification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg notification-slide-in ${
            notificationType === "success"
              ? "bg-green-50 text-green-800 border-l-4 border-green-500"
              : "bg-red-50 text-red-800 border-l-4 border-red-500"
          }`}
        >
          <div className="mr-3">
            {notificationType === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <p>{notificationMessage}</p>
          <button onClick={() => setShowNotification(false)} className="ml-4 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Professional Header Section */}
      <section className="relative bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Profile Image & Basic Info */}
              <div className="flex flex-col items-center lg:items-start">
                <div className="relative group">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl overflow-hidden border-4 border-white shadow-xl ring-1 ring-gray-200">
                    <img
                      src={profile.profilePicture || "/placeholder.svg"}
                      alt={`${profile.firstname} ${profile.lastname}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  {isOwner && (
                    <div className="absolute -bottom-2 -right-2">
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-gray-900 text-white p-3 rounded-xl shadow-lg hover:bg-gray-800 transition-all duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-6 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                {/* Badges */}
                <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2 max-w-xs">
                  {badges
                    .filter((b) => b.isVisible)
                    .slice(0, 3)
                    .map((badge) => (
                      <span
                        key={badge.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors"
                      >
                        {badge.icon}
                        <span className="ml-1.5">{badge.name}</span>
                      </span>
                    ))}
                </div>
              </div>

              {/* Main Profile Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                      {profile.firstname} {profile.lastname}
                      {profile.isVerified && (
                        <span className="inline-flex items-center ml-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </span>
                      )}
                    </h1>
                    <div className="text-gray-600 flex items-center justify-center lg:justify-start mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      {profile.city}, {profile.country}
                    </div>
                  </div>

                  <div className="text-center lg:text-right">
                    <div className="text-3xl font-bold text-gray-900">${profile.hourlyRate}</div>
                    <div className="text-sm text-gray-500">per hour</div>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-gray-600 text-lg leading-relaxed mb-6 max-w-3xl">
                  {profile.bio ||
                    "Professional video editor specializing in creative storytelling and high-quality post-production."}
                </p>

                {/* Action Buttons */}
                {!isOwner && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                    <button className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Message
                    </button>
                    <button className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center">
                      <Phone className="w-5 h-5 mr-2" />
                      Book Call
                    </button>
                    <button className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <Briefcase className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">COMPLETED</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalJobs}</div>
                <div className="text-sm text-gray-500">Projects</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">TOTAL</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalHours}</div>
                <div className="text-sm text-gray-500">Hours</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">SUCCESS</span>
                </div>
                <div className="text-2xl font-bold text-emerald-600">{stats.successRate}%</div>
                <div className="text-sm text-gray-500">Rate</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <Star className="w-6 h-6 text-amber-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">RATING</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">{stats.rating}/5</div>
                <div className="text-sm text-gray-500">Average</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <EditProfileModal
          profile={profile}
          badges={badges}
          onSave={handleSaveProfile}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Add Content Modal */}
      {isAddingContent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden modal-content">
            <div className="bg-gray-900 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {contentType === "portfolio" && "Add Portfolio Item"}
                  {contentType === "equipment" && "Add Equipment"}
                </h2>
                <button onClick={() => setIsAddingContent(false)} className="text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {contentType === "portfolio" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={newPortfolioItem.title}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      placeholder="Enter portfolio item title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={newPortfolioItem.category}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, category: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                    >
                      <option value="">Select a category</option>
                      <option value="Video Editing">Video Editing</option>
                      <option value="Motion Graphics">Motion Graphics</option>
                      <option value="Color Grading">Color Grading</option>
                      <option value="Audio Post">Audio Post</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newPortfolioItem.description}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none min-h-[100px]"
                      placeholder="Describe your portfolio item"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Media Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={newPortfolioItem.mediaType === "image"}
                          onChange={() => setNewPortfolioItem({ ...newPortfolioItem, mediaType: "image" })}
                          className="mr-2"
                        />
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Image
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={newPortfolioItem.mediaType === "video"}
                          onChange={() => setNewPortfolioItem({ ...newPortfolioItem, mediaType: "video" })}
                          className="mr-2"
                        />
                        <Video className="w-4 h-4 mr-1" />
                        Video
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {newPortfolioItem.mediaType === "image" ? "Upload Image" : "Video URL"}
                    </label>
                    {newPortfolioItem.mediaType === "image" ? (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        >
                          {newPortfolioItem.mediaUrl ? (
                            <div className="relative">
                              <img
                                src={newPortfolioItem.mediaUrl || "/placeholder.svg"}
                                alt="Preview"
                                className="max-h-40 mx-auto rounded-lg"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setNewPortfolioItem({ ...newPortfolioItem, mediaUrl: "" })
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Click to upload an image</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={newPortfolioItem.mediaUrl}
                        onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, mediaUrl: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                        placeholder="Enter YouTube or Vimeo URL"
                      />
                    )}
                  </div>
                </div>
              )}
              {contentType === "equipment" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type</label>
                    <select
                      value={newEquipment.type}
                      onChange={(e) => setNewEquipment({ ...newEquipment, type: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                    >
                      <option value="cameras">Camera</option>
                      <option value="lenses">Lens</option>
                      <option value="lighting">Lighting</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Name</label>
                    <input
                      type="text"
                      value={newEquipment.name}
                      onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      placeholder="E.g., Canon EOS R5"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setIsAddingContent(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddItem(contentType)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add {contentType === "portfolio" ? "Item" : "Equipment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="flex overflow-x-auto">
              {["portfolio", "about-me", "certifications", "availability", "equipment", "gigs"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 px-6 flex flex-col items-center justify-center transition-all duration-300 min-w-[120px] ${
                    activeTab === tab
                      ? "bg-gray-50 text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <div className={`p-2 rounded-xl mb-2 ${activeTab === tab ? "bg-gray-200" : "bg-gray-100"}`}>
                    {tab === "portfolio" && <ImageIcon className="w-5 h-5" />}
                    {tab === "about-me" && <User className="w-5 h-5" />}
                    {tab === "certifications" && <GraduationCap className="w-5 h-5" />}
                    {tab === "availability" && <CalendarDays className="w-5 h-5" />}
                    {tab === "equipment" && <Camera className="w-5 h-5" />}
                    {tab === "gigs" && <Briefcase className="w-5 h-5" />}
                  </div>
                  <span className="text-sm font-medium capitalize">{tab.replace("-", " ")}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {/* Portfolio Tab */}
            {activeTab === "portfolio" && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Palette className="w-6 h-6 mr-3 text-gray-700" />
                      Portfolio
                    </h2>
                    <p className="text-gray-600 mt-1">Showcase your best work and creative projects</p>
                  </div>
                  {isOwner && (
                    <Link
                      to="/editor/portfolio"
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Manage videos
                    </Link>
                  )}
                </div>
                {freelancerProfileId == null ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
                    <ImageIcon className="w-14 h-14 text-gray-300 mb-4" />
                    <p>Freelancer profile not found — this tab will show the video portfolio when available.</p>
                  </div>
                ) : (
                  <FreelancerPortfolio freelancerId={Number(freelancerProfileId)} />
                )}
              </div>
            )}

            {/* About Me Tab */}
            {activeTab === "about-me" && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <User className="w-6 h-6 mr-3 text-gray-700" />
                      About Me
                    </h2>
                    <p className="text-gray-600 mt-1">Learn more about my background and expertise</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditingAbout(true)}
                      className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  )}
                </div>

                <div className="space-y-8">
                  {/* Introduction */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                      Introduction
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {about.text ||
                        "I'm a passionate video editor with over 5 years of experience in post-production. I specialize in creating compelling visual narratives that engage audiences and bring stories to life through creative editing techniques."}
                    </p>
                  </div>

                  {/* Background in Editing */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Film className="w-5 h-5 mr-2 text-green-500" />
                      Background in Editing
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Started my journey in video editing during college, working on short films and documentaries. Over
                      the years, I've expanded my expertise to include commercial work, social media content, and
                      corporate videos. I'm proficient in Adobe Premiere Pro, Final Cut Pro, and DaVinci Resolve.
                    </p>
                  </div>

                  {/* Project Types */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Heart className="w-5 h-5 mr-2 text-red-500" />
                      Types of Projects I Love
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        "Music Videos",
                        "Short Films",
                        "Corporate Videos",
                        "Social Media Content",
                        "Documentaries",
                        "Commercials",
                      ].map((type) => (
                        <div
                          key={type}
                          className="bg-white rounded-lg p-3 text-center text-sm font-medium text-gray-700 border border-gray-200"
                        >
                          {type}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Languages className="w-5 h-5 mr-2 text-purple-500" />
                      Languages Spoken
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {["English (Native)", "Spanish (Fluent)", "French (Conversational)"].map((lang) => (
                        <span
                          key={lang}
                          className="bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Why I Freelance */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-amber-500" />
                      Why I Freelance
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Freelancing allows me to work on diverse projects and collaborate with creative minds from around
                      the world. I love the flexibility it provides and the opportunity to constantly learn new
                      techniques and styles while helping clients bring their visions to life.
                    </p>
                  </div>

                  {/* External Links */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <ExternalLink className="w-5 h-5 mr-2 text-indigo-500" />
                      External Portfolio & Reel
                    </h3>
                    <div className="space-y-3">
                      <a
                        href="#"
                        className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <Play className="w-5 h-5 mr-3 text-red-500" />
                        <div>
                          <div className="font-medium text-gray-900">Demo Reel 2024</div>
                          <div className="text-sm text-gray-500">Watch my latest work compilation</div>
                        </div>
                        <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
                      </a>
                      <a
                        href="#"
                        className="flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <Globe className="w-5 h-5 mr-3 text-blue-500" />
                        <div>
                          <div className="font-medium text-gray-900">Personal Website</div>
                          <div className="text-sm text-gray-500">View my complete portfolio</div>
                        </div>
                        <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Certifications Tab */}
            {activeTab === "certifications" && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <GraduationCap className="w-6 h-6 mr-3 text-gray-700" />
                      Certifications & Education
                    </h2>
                    <p className="text-gray-600 mt-1">Professional qualifications and educational background</p>
                  </div>
                  {isOwner && (
                    <button className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center shadow-sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Certification
                    </button>
                  )}
                </div>

                <div className="grid gap-6">
                  {/* Adobe Certification */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="p-3 bg-red-100 rounded-xl mr-4">
                          <Award className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Adobe Certified Expert</h3>
                          <p className="text-red-600 font-medium">Premiere Pro & After Effects</p>
                          <p className="text-gray-600 mt-2">
                            Advanced certification in video editing and motion graphics
                          </p>
                          <div className="flex items-center mt-3 text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            Certified: March 2023
                          </div>
                        </div>
                      </div>
                      <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">Verified</div>
                    </div>
                  </div>

                  {/* Film School */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="p-3 bg-blue-100 rounded-xl mr-4">
                          <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Bachelor of Fine Arts</h3>
                          <p className="text-blue-600 font-medium">Film & Television Production</p>
                          <p className="text-gray-600 mt-2">New York Film Academy</p>
                          <div className="flex items-center mt-3 text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            Graduated: May 2019
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Degree</div>
                    </div>
                  </div>

                  {/* Final Cut Pro */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="p-3 bg-gray-100 rounded-xl mr-4">
                          <Scissors className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Final Cut Pro Masterclass</h3>
                          <p className="text-gray-600 font-medium">Advanced Editing Techniques</p>
                          <p className="text-gray-600 mt-2">
                            Completed comprehensive training in professional video editing workflows
                          </p>
                          <div className="flex items-center mt-3 text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            Completed: January 2022
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">Course</div>
                    </div>
                  </div>

                  {/* DaVinci Resolve */}
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="p-3 bg-yellow-100 rounded-xl mr-4">
                          <Palette className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">DaVinci Resolve Certified Colorist</h3>
                          <p className="text-yellow-600 font-medium">Color Grading & Correction</p>
                          <p className="text-gray-600 mt-2">
                            Professional certification in color grading and post-production workflows
                          </p>
                          <div className="flex items-center mt-3 text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            Certified: September 2023
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                        Verified
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === "availability" && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <CalendarDays className="w-6 h-6 mr-3 text-gray-700" />
                      Availability & Booking
                    </h2>
                    <p className="text-gray-600 mt-1">Schedule consultations and view my availability</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Calendar */}
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                      Calendar Availability
                    </h3>
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h4 className="font-semibold">January 2024</h4>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <div key={day} className="p-2 font-medium text-gray-500">
                            {day}
                          </div>
                        ))}
                        {Array.from({ length: 31 }, (_, i) => (
                          <button
                            key={i + 1}
                            className={`p-2 rounded-lg hover:bg-gray-100 ${
                              [5, 12, 19, 26].includes(i + 1)
                                ? "bg-red-100 text-red-600"
                                : [3, 10, 17, 24, 31].includes(i + 1)
                                  ? "bg-green-100 text-green-600"
                                  : ""
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-100 rounded mr-2"></div>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-100 rounded mr-2"></div>
                          <span>Busy</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking Options */}
                  <div className="space-y-6">
                    {/* Discovery Call */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start">
                          <div className="p-3 bg-blue-100 rounded-xl mr-4">
                            <Phone className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Discovery Call</h3>
                            <p className="text-gray-600">30-minute consultation to discuss your project</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">Free</div>
                        </div>
                      </div>
                      <button className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">
                        Book Discovery Call
                      </button>
                    </div>

                    {/* Working Hours */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-green-500" />
                        Working Hours
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monday - Friday</span>
                          <span className="font-medium">9:00 AM - 5:00 PM EST</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Saturday</span>
                          <span className="font-medium">10:00 AM - 2:00 PM EST</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sunday</span>
                          <span className="text-red-500">Closed</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Windows */}
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-amber-500" />
                        Delivery Options
                      </h3>
                      <div className="grid gap-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                          <div>
                            <div className="font-medium">Rush Delivery</div>
                            <div className="text-sm text-gray-500">24 hours</div>
                          </div>
                          <div className="text-amber-600 font-medium">+50%</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                          <div>
                            <div className="font-medium">Standard</div>
                            <div className="text-sm text-gray-500">3-5 days</div>
                          </div>
                          <div className="text-green-600 font-medium">Standard Rate</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                          <div>
                            <div className="font-medium">Extended</div>
                            <div className="text-sm text-gray-500">1-2 weeks</div>
                          </div>
                          <div className="text-blue-600 font-medium">-15%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === "equipment" && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Camera className="w-6 h-6 mr-3 text-gray-700" />
                      Equipment
                    </h2>
                    <p className="text-gray-600 mt-1">Professional tools and hardware I use</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setContentType("equipment")
                        setIsAddingContent(true)
                      }}
                      className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Equipment
                    </button>
                  )}
                </div>
                <div className="space-y-8">
                  {["cameras", "lenses", "lighting"].map((category) => (
                    <div key={category} className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 capitalize flex items-center">
                        {category === "cameras" && <Camera className="w-5 h-5 mr-3 text-green-600" />}
                        {category === "lenses" && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5 mr-3 text-blue-600"
                          >
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                            <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                            <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                            <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                          </svg>
                        )}
                        {category === "lighting" && <Zap className="w-5 h-5 mr-3 text-amber-600" />}
                        {category}
                      </h3>
                      {equipment[category].length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 empty-state bg-white rounded-xl border-2 border-dashed border-gray-300">
                          <p className="text-gray-500 mb-4">No {category} added yet</p>
                          {isOwner && (
                            <button
                              onClick={() => {
                                setContentType("equipment")
                                setNewEquipment({ type: category, name: "" })
                                setIsAddingContent(true)
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center text-sm"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add {category.slice(0, -1)}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {equipment[category].map((item, index) => (
                            <div
                              key={index}
                              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center gap-3 relative group hover:shadow-md transition-all"
                            >
                              {isOwner && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setIsDropdownOpen(`${category}-${index}`)}
                                    className="p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  {isDropdownOpen === `${category}-${index}` && (
                                    <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-lg overflow-hidden z-10 w-36">
                                      <button
                                        onClick={() => {
                                          const updated = prompt(`Update ${category} item:`, item)
                                          if (updated) {
                                            const updatedEquipment = {
                                              ...equipment,
                                              [category]: equipment[category].map((i, idx) =>
                                                idx === index ? updated : i,
                                              ),
                                            }
                                            setEquipment(updatedEquipment)
                                            handleUpdateItem("equipment", null, {
                                              [`equipment${category.charAt(0).toUpperCase() + category.slice(1)}`]:
                                                updatedEquipment[category].join(", "),
                                            })
                                          }
                                          setIsDropdownOpen(null)
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                                      >
                                        <Edit className="w-4 h-4 mr-2 text-gray-500" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => {
                                          const updatedEquipment = {
                                            ...equipment,
                                            [category]: equipment[category].filter((_, idx) => idx !== index),
                                          }
                                          setEquipment(updatedEquipment)
                                          handleUpdateItem("equipment", null, {
                                            [`equipment${category.charAt(0).toUpperCase() + category.slice(1)}`]:
                                              updatedEquipment[category].join(", "),
                                          })
                                          setIsDropdownOpen(null)
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 flex items-center"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                                {category === "cameras" && (
                                  <div className="p-2 bg-green-100 rounded-full">
                                    <Camera className="w-5 h-5 text-green-600" />
                                  </div>
                                )}
                                {category === "lenses" && (
                                  <div className="p-2 bg-blue-100 rounded-full">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24"
                                      height="24"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="w-5 h-5 text-blue-600"
                                    >
                                      <circle cx="12" cy="12" r="3"></circle>
                                      <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                                      <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                                      <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                                      <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                                    </svg>
                                  </div>
                                )}
                                {category === "lighting" && (
                                  <div className="p-2 bg-amber-100 rounded-full">
                                    <Zap className="w-5 h-5 text-amber-600" />
                                  </div>
                                )}
                              </div>
                              <span className="font-medium text-gray-900">{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gigs Tab */}
            {activeTab === "gigs" && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <Briefcase className="w-6 h-6 mr-3 text-gray-700" />
                      Gigs
                    </h2>
                    <p className="text-gray-600 mt-1">Fixed-price services and packages</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={handleCreateGig}
                      className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Gig
                    </button>
                  )}
                </div>
                {gigs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 empty-state bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="bg-gray-100 rounded-2xl p-8 mb-6 empty-state-icon">
                      <Briefcase className="w-16 h-16 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">No gigs created yet</h3>
                    <p className="text-center text-gray-500 max-w-md mb-8 leading-relaxed">
                      Create gigs to offer your services with fixed prices and delivery times.
                    </p>
                    {isOwner && (
                      <button
                        onClick={handleCreateGig}
                        className="px-8 py-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your First Gig
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {gigs.map((gig) => (
                      <div
                        key={gig.id}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all relative group border border-gray-200"
                      >
                        {isOwner && (
                          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setIsDropdownOpen(gig.id)}
                              className="p-2 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white shadow-sm"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {isDropdownOpen === gig.id && (
                              <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-lg overflow-hidden z-10 w-36">
                                <button
                                  onClick={() => {
                                    const updatedTitle = prompt("Update gig title:", gig.title)
                                    if (updatedTitle)
                                      handleUpdateItem("gigs", gig.id, {
                                        ...gig,
                                        title: updatedTitle,
                                      })
                                    setIsDropdownOpen(null)
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                                >
                                  <Edit className="w-4 h-4 mr-2 text-gray-500" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteItem("gigs", gig.id)
                                    setIsDropdownOpen(null)
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500 flex items-center"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                          <img
                            src={`/placeholder.svg?height=200&width=400`}
                            alt={gig.title}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="p-6">
                          <h3 className="font-semibold text-lg text-gray-900 mb-2">{gig.title}</h3>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-2xl font-bold text-gray-900">
                              ${typeof gig.pricing === "string" ? JSON.parse(gig.pricing).basic : gig.pricing?.basic}
                            </div>
                            <div className="text-sm text-gray-500">Starting price</div>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-3 mb-4">{gig.description}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                            <Clock className="w-4 h-4" />
                            <span>Delivery in {gig.deliveryTime} days</span>
                          </div>
                          {gig.category && <div className="text-sm text-gray-500 mb-4">Category: {gig.category}</div>}
                          {!isOwner && (
                            <button className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all duration-300 shadow-sm hover:shadow">
                              Order Now
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit Profile Modal
function EditProfileModal({ profile, badges, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...profile })
  const [selectedImage, setSelectedImage] = useState(null)
  const [updatedBadges, setUpdatedBadges] = useState(badges)
  const [activeTab, setActiveTab] = useState("profile")
  const fileInputRef = useRef(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(URL.createObjectURL(file))
      setFormData({ ...formData, profilePicture: file }) // Will need to upload to S3
    }
  }

  const handleDeleteImage = () => {
    setSelectedImage(null)
    setFormData({ ...formData, profilePicture: null })
  }

  const canChangeName = () => {
    if (!formData.lastNameChange) return true
    const lastChange = new Date(formData.lastNameChange)
    const now = new Date()
    const diffMonths = (now - lastChange) / (1000 * 60 * 60 * 24 * 30)
    return diffMonths >= 3
  }

  const handleSubmit = () => {
    const payload = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      profilePicture: formData.profilePicture, // Handle file upload separately
      isVerified: formData.isVerified,
      hourlyRate: formData.hourlyRate,
      country: formData.country,
      city: formData.city,
      bio: formData.bio,
      userBadges: updatedBadges.map((b) => ({ id: b.id, isVisible: b.isVisible })),
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 modal-overlay">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden modal-content">
        <div className="bg-gray-900 p-6 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Edit Your Profile</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="mt-2 text-white/80">Update your personal information and profile settings</p>
        </div>
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${activeTab === "profile" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500"}`}
          >
            <User className="w-5 h-5 mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${activeTab === "settings" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500"}`}
          >
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab("badges")}
            className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center ${activeTab === "badges" ? "text-gray-900 border-b-2 border-gray-900" : "text-gray-500"}`}
          >
            <Award className="w-5 h-5 mr-2" />
            Badges
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg ring-1 ring-gray-200">
                      <img
                        src={selectedImage || formData.profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/20 rounded-full">
                        <Edit className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Change
                    </button>
                    <button
                      onClick={handleDeleteImage}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={formData.firstname}
                        onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                        disabled={!canChangeName()}
                        className={`w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all ${!canChangeName() ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      />
                      {!canChangeName() && (
                        <p className="text-sm text-red-500 mt-1 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Name can only be changed every 3 months
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastname}
                        onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                        disabled={!canChangeName()}
                        className={`w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all ${!canChangeName() ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate ($)</label>
                    <input
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none min-h-[100px]"
                      placeholder="Tell clients about yourself..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Check className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Verified Badge</h3>
                    <p className="text-sm text-gray-500">Show verification badge on your profile</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-xl">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive email notifications for messages</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={true} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Profile Visibility</h3>
                    <p className="text-sm text-gray-500">Make your profile visible to everyone</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={true} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>
            </div>
          )}
          {activeTab === "badges" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select which badges to display on your profile.</p>
              <div className="grid gap-3">
                {updatedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${badge.isVisible ? "border-gray-300 bg-gray-50" : "border-gray-200"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${badge.isVisible ? "bg-gray-200" : "bg-gray-100"}`}>
                        {badge.icon}
                      </div>
                      <div>
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-xs text-gray-500">Earned on Jan 15, 2023</p>
                      </div>
                    </div>
                    {badge.achieved && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={badge.isVisible}
                          onChange={(e) =>
                            setUpdatedBadges((prev) =>
                              prev.map((b) => (b.id === badge.id ? { ...b, isVisible: e.target.checked } : b)),
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow flex items-center"
          >
            <Save className="w-4 h-4 mr-1" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
