import { useState, useEffect } from "react"
import {
  Star,
  Heart,
  Clock,
  RefreshCw,
  CheckCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Award,
  Zap,
  MapPin,
  Calendar,
  Globe,
  Clock3,
  CheckCheck,
} from "lucide-react"

export default function GigPage() {
  const [activeTab, setActiveTab] = useState("Standard")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [expandedFAQ, setExpandedFAQ] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const pricingTiers = [
    {
      name: "Basic",
      price: "₹1,351",
      description: "Starter",
      features: [
        "1 short video ad UP TO 20 SECONDS",
        "20 Sec Explainer Video",
        "High quality footages",
        "Video editing",
        "Script writing",
        "20 seconds running time",
        "1 length variation",
        "1 size orientation",
        "Product imagery",
      ],
      delivery: "1-day delivery",
      revisions: "Unlimited Revisions",
    },
    {
      name: "Standard",
      price: "₹2,702",
      description: "Professional",
      features: [
        "2 short video ads UP TO 30 SECONDS",
        "30 Sec Explainer Video",
        "Premium quality footages",
        "Advanced video editing",
        "Professional script writing",
        "30 seconds running time",
        "2 length variations",
        "2 size orientations",
        "Premium product imagery",
        "Background music",
      ],
      delivery: "2-day delivery",
      revisions: "Unlimited Revisions",
    },
    {
      name: "Premium",
      price: "₹4,053",
      description: "Enterprise",
      features: [
        "3 short video ads UP TO 60 SECONDS",
        "60 Sec Explainer Video",
        "Ultra HD quality footages",
        "Professional video editing",
        "Premium script writing",
        "60 seconds running time",
        "3 length variations",
        "3 size orientations",
        "Premium product imagery",
        "Custom background music",
        "Voice over included",
      ],
      delivery: "3-day delivery",
      revisions: "Unlimited Revisions",
    },
  ]

  const reviews = [
    {
      name: "Sarah Johnson",
      country: "United States",
      rating: 5,
      date: "4 days ago",
      text: "PromoSwift did an outstanding job creating Facebook video ads for my brand, EssenHerbs. His creativity and expertise helped elevate my brand's presence with exceptional quality and attention to detail.",
      avatar: "/placeholder.svg?height=50&width=50",
    },
    {
      name: "Michael Chen",
      country: "Canada",
      rating: 5,
      date: "1 week ago",
      text: "Absolutely fantastic work! The video quality exceeded my expectations and the turnaround time was impressive. Will definitely work with PromoSwift again.",
      avatar: "/placeholder.svg?height=50&width=50",
    },
  ]

  const faqItems = [
    {
      question: "Do you create Explainer videos only?",
      answer:
        "No, I create various types of video content including promotional videos, social media ads, product demos, and explainer videos. Each video is tailored to your specific needs and platform requirements.",
    },
    {
      question: "Should I put Order directly or contact you first?",
      answer:
        "I recommend contacting me first to discuss your project requirements, timeline, and specific needs. This ensures we're aligned on expectations and I can provide the best possible service for your project.",
    },
    {
      question: "What platforms do you optimize videos for?",
      answer:
        "I optimize videos for all major platforms including Facebook, Instagram, TikTok, YouTube, LinkedIn, and more. Each platform has specific requirements which I ensure are met for maximum engagement.",
    },
    {
      question: "Do you provide revisions?",
      answer:
        "Yes, I provide unlimited revisions until you're completely satisfied with the final product. Your satisfaction is my priority, and I work closely with you to achieve your vision.",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white text-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Hero Section */}
            <div
              className={`bg-white border border-indigo-100 rounded-lg overflow-hidden transition-all duration-700 transform ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            >
              <div className="p-8">
                <h1 className="text-4xl font-bold text-black mb-6 leading-tight">
                  I will create perfect facebook video ads, tiktok ads, dropshipping video ads
                </h1>

                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-pulse opacity-50"></div>
                    <img
                      src="/placeholder.svg?height=70&width=70"
                      alt="PromoSwift"
                      width={70}
                      height={70}
                      className="rounded-full border-2 border-indigo-200 relative z-10"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full border-2 border-white flex items-center justify-center z-20">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-black text-lg">PromoSwift</h3>
                      <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs px-3 py-1 rounded-md font-medium">
                        Level 2 Pro
                      </span>
                      <span className="text-black text-sm font-medium flex items-center gap-1">
                        <Zap className="w-4 h-4" />3 orders in queue
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="text-lg font-bold text-black">4.8</span>
                      <span className="text-black">(954 reviews)</span>
                    </div>
                  </div>
                </div>

                {/* Video Preview */}
                <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 aspect-video group">
                  <img
                    src="/placeholder.svg?height=400&width=700"
                    alt="Video Preview"
                    width={700}
                    height={400}
                    className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-md p-6 transition-all duration-300 transform hover:scale-105">
                      <Play className="w-8 h-8 text-black ml-1" />
                    </button>
                  </div>

                  {/* Navigation Arrows */}
                  <button className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-md p-3 transition-all duration-300 opacity-0 group-hover:opacity-100">
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-md p-3 transition-all duration-300 opacity-0 group-hover:opacity-100">
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>

                  {/* Quality Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-md font-medium">
                      4K Quality
                    </span>
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-md font-medium">
                      Fast Delivery
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* About This Gig */}
            <div
              className={`bg-white border border-indigo-100 rounded-lg p-8 transition-all duration-700 transform delay-100 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            >
              <h2 className="text-3xl font-bold text-black mb-8">About this gig</h2>

              <div className="prose max-w-none">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-6 mb-8">
                  <p className="text-black font-semibold text-lg mb-2">
                    Tired of generic video ads that don't cut through the noise?
                  </p>
                  <p className="text-black">
                    Transform your marketing with videos that actually convert and engage your audience.
                  </p>
                </div>

                <p className="text-black mb-6 text-lg leading-relaxed">
                  I'm here to craft compelling video ads that resonate with your target audience and drive real results.
                  With <strong className="text-black">over 5 years of experience</strong> in the video advertising
                  industry, I specialize in creating high-quality, attention-grabbing videos for all major social media
                  platforms including Facebook, TikTok, Instagram, YouTube.
                </p>

                <h3 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
                  <Award className="w-6 h-6 text-indigo-600" />
                  What you'll get:
                </h3>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                    {
                      icon: <CheckCircle className="w-5 h-5 text-indigo-600" />,
                      title: "Tailored video ads",
                      desc: "designed to meet your specific goals and messaging.",
                    },
                    {
                      icon: <CheckCircle className="w-5 h-5 text-indigo-600" />,
                      title: "Ultra HD and HQ",
                      desc: "content used to create ads.",
                    },
                    {
                      icon: <CheckCircle className="w-5 h-5 text-indigo-600" />,
                      title: "Unlimited revisions",
                      desc: "until you're completely satisfied with the final product.",
                    },
                    {
                      icon: <CheckCircle className="w-5 h-5 text-indigo-600" />,
                      title: "Professional editing",
                      desc: "services for a polished look.",
                    },
                    {
                      icon: <CheckCircle className="w-5 h-5 text-indigo-600" />,
                      title: "Fast delivery",
                      desc: "to accelerate your campaign's success.",
                    },
                    {
                      icon: <CheckCircle className="w-5 h-5 text-indigo-600" />,
                      title: "Custom soundtracks",
                      desc: "and voice-overs available.",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-white rounded-md border border-indigo-100 hover:border-indigo-300 transition-all duration-300"
                    >
                      <span>{item.icon}</span>
                      <div>
                        <h4 className="font-semibold text-black mb-1">{item.title}</h4>
                        <p className="text-black text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Why choose me?
                  </h3>
                  <p className="text-black leading-relaxed">
                    Looking to have a solid social media presence and skyrocket your e-commerce journey? We can help. We
                    specialize in social media marketing and video ad creation, providing customized strategies and
                    top-notch production to help your business succeed in the digital world. Let us help you achieve
                    your digital marketing goals and reach new heights in your business journey.
                  </p>
                </div>
              </div>
            </div>

            {/* Portfolio Section */}
            <div
              className={`bg-white border border-indigo-100 rounded-lg p-8 transition-all duration-700 transform delay-200 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            >
              <h2 className="text-3xl font-bold text-black mb-8">My Portfolio</h2>

              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    title: "Volcano Humidifier Ad",
                    date: "April 2023",
                    description:
                      "Crafted a captivating video ad highlighting the humidifier's volcano-inspired design and benefits.",
                    category: "Marketing & Advertising",
                    cost: "Up to $50",
                    duration: "1-7 days",
                    gradient: "from-indigo-500 to-purple-500",
                  },
                  {
                    title: "Fitness App Promo",
                    date: "March 2023",
                    description:
                      "Dynamic promotional video showcasing app features and user testimonials for maximum engagement.",
                    category: "Health & Fitness",
                    cost: "Up to $100",
                    duration: "3-5 days",
                    gradient: "from-purple-500 to-indigo-500",
                  },
                ].map((project, index) => (
                  <div key={index} className="group cursor-pointer">
                    <div
                      className={`relative aspect-video rounded-md overflow-hidden bg-gradient-to-br ${project.gradient} mb-6`}
                    >
                      <img
                        src="/placeholder.svg?height=300&width=400"
                        alt="Portfolio Item"
                        width={400}
                        height={300}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-indigo-900/20 group-hover:bg-indigo-900/30 transition-all duration-300"></div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-sm rounded-md p-4">
                          <Play className="w-8 h-8 text-black" />
                        </div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-md p-2 transition-all duration-300">
                          <Heart className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-indigo-600 font-medium">From: {project.date}</p>
                      <h3 className="font-bold text-black text-xl group-hover:text-indigo-700 transition-colors duration-300">
                        {project.title}
                      </h3>
                      <p className="text-black leading-relaxed">{project.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-100 text-black px-4 py-2 rounded-md text-sm font-medium">
                          {project.category}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 text-sm text-black">
                        <span className="font-medium">Cost: {project.cost}</span>
                        <span>Duration: {project.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div
              className={`bg-white border border-indigo-100 rounded-lg p-8 transition-all duration-700 transform delay-300 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            >
              <h2 className="text-3xl font-bold text-black mb-8">Frequently Asked Questions</h2>

              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div
                    key={index}
                    className="border border-indigo-100 rounded-md overflow-hidden hover:border-indigo-200 transition-all duration-300"
                  >
                    <button
                      className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-indigo-50/50 transition-all duration-300"
                      onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                    >
                      <span className="font-semibold text-black text-lg">{item.question}</span>
                      <ChevronDown
                        className={`w-6 h-6 text-indigo-600 transition-transform duration-300 ${expandedFAQ === index ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-500 ${expandedFAQ === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
                    >
                      <div className="px-6 pb-5 text-black leading-relaxed bg-indigo-50/50">{item.answer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <div
              className={`bg-white border border-indigo-100 rounded-lg p-8 transition-all duration-700 transform delay-400 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-black">Reviews</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-2xl text-black">4.8</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-black mb-6 text-lg">954 reviews for this Gig</p>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-4">
                        <span className="text-black w-16">{stars} Stars</span>
                        <div className="flex-1 bg-gray-200 rounded-sm h-3">
                          <div
                            className="bg-gradient-to-r from-indigo-400 to-purple-400 h-3 rounded-sm transition-all duration-1000"
                            style={{ width: stars === 5 ? "92%" : stars === 4 ? "6%" : "1%" }}
                          ></div>
                        </div>
                        <span className="text-black w-12 text-right">
                          {stars === 5 ? "878" : stars === 4 ? "56" : stars === 3 ? "10" : stars === 2 ? "3" : "7"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black mb-6 text-xl">Rating Breakdown</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Seller communication level", rating: 4.8 },
                      { label: "Quality of delivery", rating: 4.8 },
                      { label: "Value of delivery", rating: 4.8 },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-md">
                        <span className="text-black">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-black">{item.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {reviews.map((review, index) => (
                  <div key={index} className="border-b border-indigo-100 pb-6 last:border-b-0">
                    <div className="flex items-start gap-6">
                      <img
                        src={review.avatar || "/placeholder.svg"}
                        alt={review.name}
                        width={60}
                        height={60}
                        className="rounded-full border-2 border-indigo-200"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <h4 className="font-bold text-black text-lg">{review.name}</h4>
                          <span className="text-black">{review.country}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                            ))}
                            <span className="font-bold text-black ml-1">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-black mb-3 leading-relaxed">{review.text}</p>
                        <p className="text-sm text-gray-600">{review.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Pricing */}
          <div className="lg:col-span-4">
            <div
              className={`sticky top-8 transition-all duration-700 transform delay-100 ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            >
              <div className="bg-white border border-indigo-100 rounded-lg overflow-hidden">
                {/* Pricing Tabs */}
                <div className="flex border-b border-indigo-100">
                  {pricingTiers.map((tier) => (
                    <button
                      key={tier.name}
                      onClick={() => setActiveTab(tier.name)}
                      className={`flex-1 px-4 py-4 text-sm font-semibold transition-all duration-300 relative ${
                        activeTab === tier.name
                          ? "text-black bg-white"
                          : "text-black hover:text-indigo-700 bg-indigo-50/30"
                      }`}
                    >
                      {tier.name}
                      {activeTab === tier.name && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Active Pricing Content */}
                {pricingTiers.map(
                  (tier) =>
                    activeTab === tier.name && (
                      <div key={tier.name} className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-2xl font-bold text-black">{tier.description}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-bold text-black">{tier.price}</span>
                          </div>
                        </div>

                        <div className="space-y-3 mb-8">
                          {tier.features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-2 rounded-md hover:bg-indigo-50/50 transition-all duration-300"
                            >
                              <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                              <span className="text-black">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-6 mb-8 p-4 bg-indigo-50/50 rounded-md">
                          <div className="flex items-center gap-2 text-black">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            <span className="font-medium">{tier.delivery}</span>
                          </div>
                          <div className="flex items-center gap-2 text-black">
                            <RefreshCw className="w-5 h-5 text-indigo-600" />
                            <span className="font-medium">{tier.revisions}</span>
                          </div>
                        </div>

                        <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-md font-semibold transition-all duration-300 transform hover:scale-[1.02] mb-4 flex items-center justify-center gap-2">
                          Continue
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        <button className="w-full border-2 border-indigo-200 hover:border-indigo-300 text-black py-4 rounded-md font-semibold hover:bg-indigo-50/50 transition-all duration-300">
                          Contact me
                        </button>
                      </div>
                    ),
                )}
              </div>

              {/* Seller Contact Card */}
              <div className="bg-white border border-indigo-100 rounded-md p-6 mt-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src="/placeholder.svg?height=60&width=60"
                      alt="PromoSwift"
                      width={60}
                      height={60}
                      className="rounded-full border-2 border-indigo-200"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-black">PromoSwift</h4>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-sm text-black">Online • Avg. response time: 1 Hour</p>
                  </div>
                  <button className="p-3 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-all duration-300">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Seller Stats */}
              <div className="bg-white border border-indigo-100 rounded-md p-6 mt-6">
                <h3 className="font-bold text-black mb-6 text-lg">Seller Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 border-b border-indigo-100 pb-4">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-600">From</p>
                      <p className="font-medium text-black">Pakistan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-b border-indigo-100 pb-4">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-600">Member since</p>
                      <p className="font-medium text-black">February 2021</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 border-b border-indigo-100 pb-4">
                    <Clock3 className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-600">Average response time</p>
                      <p className="font-medium text-black">1 hour</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-600">Languages</p>
                      <p className="font-medium text-black">English, Spanish, Urdu, German</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Achievements */}
              <div className="bg-white border border-indigo-100 rounded-md p-6 mt-6">
                <h3 className="font-bold text-black mb-6 text-lg">Achievements</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-md">
                      <Award className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-black">Top Rated Seller</p>
                      <p className="text-sm text-gray-600">Consistently delivers exceptional quality</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-md">
                      <CheckCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-black">Verified Professional</p>
                      <p className="text-sm text-gray-600">Identity and credentials verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
