import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  ChevronDown,
  MessageCircle,
  ArrowRight,
  Users,
  CreditCard,
  Settings,
  Video,
  Zap,
  Clock,
  DollarSign,
  Shield,
  HelpCircle,
  BookOpen,
  BarChart,
} from "lucide-react"

// Basic Input component
const Input = ({ className, ...props }) => (
  <input
    className={`w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
)

// Basic Button component
const Button = ({ children, className, ...props }) => (
  <button
    className={`px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  >
    {children}
  </button>
)

// Basic Badge component
const Badge = ({ children, className, ...props }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`} {...props}>
    {children}
  </span>
)

// Basic Card component
const Card = ({ children, className, ...props }) => (
  <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`} {...props}>
    {children}
  </div>
)

const categories = [
  {
    id: "video-editors",
    label: "For Video Editors",
    icon: Video,
    description: "Learn about getting started, payments, and best practices",
    color: "bg-purple-500",
  },
  {
    id: "clients",
    label: "For Clients",
    icon: Users,
    description: "Discover how to find and work with editors",
    color: "bg-blue-500",
  },
  {
    id: "billing",
    label: "Payments & Billing",
    icon: CreditCard,
    description: "Understanding payments, fees, and transactions",
    color: "bg-green-500",
  },
  {
    id: "technical",
    label: "Technical Support",
    icon: Settings,
    description: "Get help with technical issues and platform features",
    color: "bg-orange-500",
  },
]

const popularQuestions = [
  { question: "How to get started?", icon: Zap },
  { question: "Pricing plans", icon: DollarSign },
  { question: "Account security", icon: Shield },
  { question: "Response time", icon: Clock },
]

const faqs = {
  "video-editors": [
    {
      question: "How do I get started as a video editor?",
      answer:
        "Getting started is easy! First, create your profile highlighting your skills and experience. Then, browse available projects and submit proposals. Make sure to showcase your best work in your portfolio.",
      tag: "Getting Started",
    },
    {
      question: "What equipment do I need?",
      answer:
        "You'll need a reliable computer with video editing software (like Adobe Premiere Pro, Final Cut Pro, or DaVinci Resolve), good internet connection, and storage space for project files.",
      tag: "Requirements",
    },
    {
      question: "How do payments work?",
      answer:
        "Payments are processed securely through our platform. Once a milestone is completed and approved, the funds are released to your account within 24-48 hours.",
      tag: "Payments",
    },
    {
      question: "What are the platform fees?",
      answer:
        "Our platform charges a competitive 10% fee on all completed projects. This covers payment processing, platform maintenance, and customer support.",
      tag: "Fees",
    },
    {
      question: "How can I increase my chances of getting hired?",
      answer:
        "Complete your profile with detailed information, showcase your best work in your portfolio, maintain high ratings, and write personalized proposals for each project.",
      tag: "Success Tips",
    },
  ],
  clients: [
    {
      question: "How do I find the right editor for my project?",
      answer:
        "You can post your project with detailed requirements and budget. Our matching system will suggest qualified editors, or you can browse editor profiles and invite them to your project.",
      tag: "Hiring",
    },
    {
      question: "What if I'm not satisfied with the work?",
      answer:
        "We offer a revision period for each milestone. If you're not satisfied, you can request changes or work with our support team to resolve any issues.",
      tag: "Quality Assurance",
    },
    {
      question: "How do I write a good project brief?",
      answer:
        "Include clear project requirements, timeline, budget, and any specific preferences. The more detailed your brief, the better matches you'll receive.",
      tag: "Best Practices",
    },
  ],
  // More categories can be added here...
}

const stats = [
  { label: "Active Users", value: "50K+", icon: Users },
  { label: "Response Time", value: "< 2hrs", icon: Clock },
  { label: "Success Rate", value: "99%", icon: BarChart },
]

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState("video-editors")
  const [searchQuery, setSearchQuery] = useState("")
  const [openQuestion, setOpenQuestion] = useState(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:16px_16px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">How can we help you?</h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-12">
                Search our knowledge base or browse categories to find the answers you need.
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl mx-auto"
            >
              <div className="relative group">
                <Input
                  type="search"
                  placeholder="Type your question here..."
                  className="w-full h-14 pl-14 pr-4 rounded-2xl border-0 bg-white/10 backdrop-blur-xl text-white placeholder:text-blue-200 focus:ring-2 focus:ring-blue-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-200 group-focus-within:text-white transition-colors" />
              </div>

              {/* Popular Questions */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {popularQuestions.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={i}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl text-sm font-medium transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      {item.question}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats */}
        <div className="relative border-t border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-3 gap-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <div key={i} className="flex items-center justify-center gap-3">
                    <Icon className="w-5 h-5 text-blue-200" />
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-sm text-blue-200">{stat.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {categories.map((category) => {
            const Icon = category.icon
            const isSelected = selectedCategory === category.id
            return (
              <Card
                key={category.id}
                className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
                  isSelected ? "ring-2 ring-blue-500 shadow-lg" : "hover:shadow-md"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{category.label}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {faqs[selectedCategory ]?.map((faq, index) => (
                <Card key={index} className="overflow-hidden">
                  <button
                    onClick={() => setOpenQuestion(openQuestion === faq.question ? null : faq.question)}
                    className="w-full flex items-start justify-between p-6 text-left"
                  >
                    <div className="flex gap-4">
                      <div className="mt-1">
                        <HelpCircle
                          className={`w-5 h-5 ${openQuestion === faq.question ? "text-blue-500" : "text-gray-400"}`}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 mb-1">{faq.question}</div>
                        <Badge className="bg-gray-100 text-gray-600">{faq.tag}</Badge>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        openQuestion === faq.question ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {openQuestion === faq.question && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-6 text-gray-600 border-t">
                          <div className="pt-4">{faq.answer}</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Contact Support Section */}
        <div className="mt-20">
          <Card className="relative overflow-hidden">
            <div className="p-8 sm:p-12">
              <div className="absolute right-0 top-0 w-1/2 h-full">
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
                <div className="absolute inset-0 bg-grid-black/[0.02]" />
                <div className="h-full w-full flex items-center justify-center">
                  <BookOpen className="w-48 h-48 text-indigo-900" />
                </div>
              </div>

              <div className="relative max-w-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">Still need help?</h3>
                </div>

                <p className="text-gray-600 mb-8 text-lg">
                  Can't find what you're looking for? Our support team is here to help you withlooking for? Our support
                  team is here to help you with any questions or concerns.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Button className="group bg-blue-600 text-white hover:bg-blue-700">
                    Contact Support
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-50">
                    Schedule a Call
                    <Clock className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

