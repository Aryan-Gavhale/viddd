import { useState, useEffect } from "react"
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../utils/axios"; 
import {
  ChevronDownIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  ClockIcon,
  DocumentTextIcon,
  LinkIcon,
  RectangleStackIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
} from "@heroicons/react/24/outline"

export default function ProjectBriefForm() {
  const { gigId, pkgName } = useParams();
  const navigate = useNavigate();

  const location = useLocation();
  const gig = location.state?.gig;
  const pkg = location.state?.pkg;
  console.log("Gig ID:", gigId);
  console.log("Package Name:", pkgName);

  const [formData, setFormData] = useState({
    projectTitle: "",
    videoType: "",
    numberOfVideos: 1,
    totalDuration: 0,
    description: "",
    referenceUrl: "",
    aspectRatio: "16:9",
    addSubtitles: false,
    expressDelivery: false,
  })

  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])

  // const [gig, setGig] = useState(null);
  // const [selectedPackage, setSelectedPackage] = useState(null);

  if (!gig || !pkg) {
    // fallback to fetch if someone visits directly
    return <div>Loading package...</div>;
  }

  const planDetails = {
    name: pkg.name,
    price: pkg.price,
    included: "3 Reels, 30 seconds each, Basic transitions, 3-day delivery",
    maxVideos: 3,
    maxDurationPerVideo: 30,
  }

  const exceedsLimits =
    formData.numberOfVideos > planDetails.maxVideos ||
    formData.totalDuration / formData.numberOfVideos > planDetails.maxDurationPerVideo

  if (formData.numberOfVideos > planDetails.maxVideos) {
    console.log("formData.numberOfVideos > planDetails.maxVideos");
  }
  if (formData.totalDuration / formData.numberOfVideos > planDetails.maxDurationPerVideo) {
    console.log("formData.totalDuration / formData.numberOfVideos > planDetails.maxDurationPerVideo");
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files)
      setUploadedFiles((prev) => [...prev, ...files])
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setUploadedFiles((prev) => [...prev, ...files])
    }
  }

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // const handleSubmit = (e) => {
  //   e.preventDefault();

  //   navigate(
  //     `/gig/${gigId}/${pkg.name}/project-brief/payment?aspectRatio=${encodeURIComponent(formData.aspectRatio)}`,
  //     { state: { gig, pkg, addSubtitles: formData.addSubtitles, expressDelivery: formData.expressDelivery } }
  //   );
  // }

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      // 1️⃣ Build payload
      const payload = {
        gigId: gig.id,
        selectedPackage: pkg.name,
        title: formData.projectTitle,
        description: formData.description,
        videoType: formData.videoType,
        numberOfVideos: formData.numberOfVideos,
        totalDuration: formData.totalDuration,
        referenceUrl: formData.referenceUrl,
        aspectRatio: formData.aspectRatio,
        addSubtitles: formData.addSubtitles,
        expressDelivery: formData.expressDelivery,
        uploadedFiles: uploadedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })), // 👈 Or upload to S3 first and pass URLs
        requirements: "Any specific requirements",
        customDetails: {},
      };
  
      // 2️⃣ Make API request
      const res = await axiosInstance.post("/orders", payload);
  
      if (res.status === 201) {
        const order = res.data.data;
  
        // ✅ 3️⃣ Navigate to payment page with order info
        navigate(
          `/gig/${gigId}/${pkg.name}/project-brief/payment`,
          {
            state: {
              gig,
              pkg,
              orderId: order.id,
              orderNumber: order.orderNumber,
              totalPrice: order.totalPrice,
              // addSubtitles: formData.addSubtitles,
              // expressDelivery: formData.expressDelivery,
            },
          }
        );
      } else {
        console.log("couldn't navigate");
      }
    } catch (error) {
      console.error("Order creation failed:", error);
      alert("Failed to create order. Please try again.");
    }
  };
  

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
     

      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Brief</h1>
          <p className="text-gray-600">Tell us about your video editing project</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Side - Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Gig Plan Selected</p>
                  <p className="font-medium text-gray-900">{planDetails.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-2xl font-bold text-gray-900">{planDetails.price}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">What's included</p>
                  <p className="text-sm text-gray-700">{planDetails.included}</p>
                </div>

                {formData.expressDelivery && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Express Delivery</span>
                      <span className="text-sm font-medium">+₹500</span>
                    </div>
                  </div>
                )}

                {exceedsLimits && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Plan Limit Exceeded</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Your requirements exceed the selected plan limits. Please adjust or upgrade your plan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">
                      ₹{Number.parseInt(planDetails.price.replace("₹", "")) + (formData.expressDelivery ? 500 : 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Basic Information
                  <span className="text-sm font-medium text-purple-600 ml-2">Required</span>
                </h2>
                <p className="text-gray-600 text-sm">Let clients know what you offer and why they should choose you.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Project Title */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Project Title
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.projectTitle}
                      onChange={(e) => handleInputChange("projectTitle", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Professional YouTube Video Editing"
                      maxLength={60}
                    />
                    <div className="absolute right-3 top-3 text-xs text-gray-400">
                      {formData.projectTitle.length}/60
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    A catchy title helps your project stand out and appear in search results.
                  </p>
                </div>

                {/* Video Type */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <PlayIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Video Type
                  </label>
                  <div className="relative">
                    <select
                      value={formData.videoType}
                      onChange={(e) => handleInputChange("videoType", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white transition-all duration-200 cursor-pointer hover:border-gray-400"
                    >
                      <option value="">Select...</option>
                      <option value="reels">Reels</option>
                      <option value="vlog">Vlog</option>
                      <option value="ad">Ad</option>
                      <option value="product-demo">Product Demo</option>
                      <option value="youtube">YouTube</option>
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Choose a category to help clients find your project.</p>
                </div>

                {/* Number of Videos and Duration */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <RectangleStackIcon className="w-4 h-4 mr-2 text-gray-500" />
                      Number of Videos
                    </label>
                    <div className="relative">
                      <select
                        value={formData.numberOfVideos}
                        onChange={(e) => handleInputChange("numberOfVideos", Number.parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white transition-all duration-200 cursor-pointer hover:border-gray-400"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <ClockIcon className="w-4 h-4 mr-2 text-gray-500" />
                      Total Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.totalDuration}
                      onChange={(e) => handleInputChange("totalDuration", Number.parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Project Description */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Description
                  </label>
                  <div className="relative">
                    <textarea
                      rows={6}
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                      placeholder="Describe the job in detail..."
                      maxLength={1000}
                    />
                    <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                      {formData.description.length}/1000
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 50 characters required. Be specific about what you offer.
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <CloudArrowUpIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Upload Sample Footage
                  </label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      dragActive
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-300 hover:border-purple-300 hover:bg-gray-50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop your files here, or{" "}
                      <label className="text-purple-600 hover:text-purple-500 cursor-pointer underline">
                        browse
                        <input type="file" multiple accept="video/*" onChange={handleFileInput} className="hidden" />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500">Support for video files up to 500MB each</p>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border"
                        >
                          <div className="flex items-center">
                            <PlayIcon className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reference Video URL */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <LinkIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Reference Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.referenceUrl}
                    onChange={(e) => handleInputChange("referenceUrl", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                    <RectangleStackIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Aspect Ratio
                  </label>
                  <div className="flex space-x-4">
                    {["16:9", "9:16", "1:1"].map((ratio) => (
                      <label key={ratio} className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="aspectRatio"
                          value={ratio}
                          checked={formData.aspectRatio === ratio}
                          onChange={(e) => handleInputChange("aspectRatio", e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 mr-3 transition-all duration-200 ${
                            formData.aspectRatio === ratio
                              ? "border-purple-500 bg-purple-500"
                              : "border-gray-300 group-hover:border-purple-300"
                          }`}
                        >
                          {formData.aspectRatio === ratio && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{ratio}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggle Switches */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2 text-gray-500" />
                      Add Subtitles?
                    </label>
                    <button
                      type="button"
                      onClick={() => handleInputChange("addSubtitles", !formData.addSubtitles)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        formData.addSubtitles ? "bg-purple-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          formData.addSubtitles ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <BoltIcon className="w-4 h-4 mr-2 text-gray-500" />
                      Express Delivery (+₹500)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleInputChange("expressDelivery", !formData.expressDelivery)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        formData.expressDelivery ? "bg-purple-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          formData.expressDelivery ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                  <button
                    type="button"
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={exceedsLimits}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      exceedsLimits
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                    }`}
                  >
                    Proceed to Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}