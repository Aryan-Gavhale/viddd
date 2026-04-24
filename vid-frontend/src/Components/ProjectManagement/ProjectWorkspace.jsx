import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Calendar,
  DollarSign,
  Users,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  BarChart2,
  Send,
  Paperclip,
  Image,
  Video,
  FileText,
  Mic,
  Smile,
  Search,
  PieChart,
  TrendingUp,
  CreditCard,
  Download,
  Upload,
  List,
  Grid,
  ChevronDown,
  MessageSquare,
  Activity,
} from "lucide-react"

const ProjectWorkspace = () => {
  const [activeSection, setActiveSection] = useState("communication")
  const [isPlaying, setIsPlaying] = useState(false)
  const [message, setMessage] = useState("")

  const togglePlay = () => setIsPlaying(!isPlaying)

  const stats = [
    { label: "Progress", value: "65%", icon: BarChart2, color: "text-blue-500" },
    { label: "Budget", value: "$12,500", icon: DollarSign, color: "text-green-500" },
    { label: "Tasks", value: "24/36", icon: CheckCircle, color: "text-indigo-500" },
    { label: "Due Date", value: "Aug 31", icon: Calendar, color: "text-red-500" },
  ]

  const activities = [
    { user: "Sarah K.", action: "completed editing", item: "Scene 2 - Product Showcase", time: "2h ago" },
    { user: "Mike R.", action: "added comments on", item: "Final Cut v2", time: "4h ago" },
    { user: "Anna M.", action: "uploaded", item: "New B-roll footage", time: "6h ago" },
  ]

  const messages = [
    {
      id: 1,
      user: "John Doe",
      content: "Hey team, how's the progress on the intro sequence?",
      time: "10:30 AM",
      type: "text",
    },
    {
      id: 2,
      user: "Sarah K.",
      content: "I've just finished the first draft. Here's a screenshot:",
      time: "10:45 AM",
      type: "text",
    },
    { id: 3, user: "Sarah K.", content: "/placeholder.svg?height=200&width=300", time: "10:46 AM", type: "image" },
    {
      id: 4,
      user: "Mike R.",
      content: "Looks great! Can we add more emphasis on the product features?",
      time: "11:15 AM",
      type: "text",
    },
  ]

  const financialTransactions = [
    { id: 1, description: "Equipment Rental", amount: -500, date: "2023-07-15", category: "Expenses" },
    { id: 2, description: "Client Payment", amount: 5000, date: "2023-07-20", category: "Income" },
    { id: 3, description: "Software Subscription", amount: -99, date: "2023-07-22", category: "Expenses" },
    { id: 4, description: "Freelancer Payment", amount: -1000, date: "2023-07-25", category: "Expenses" },
  ]

  const scheduleEvents = [
    { id: 1, title: "Team Brainstorming", start: "2023-07-28T09:00", end: "2023-07-28T10:30", type: "meeting" },
    { id: 2, title: "Client Review", start: "2023-07-29T14:00", end: "2023-07-29T15:00", type: "review" },
    { id: 3, title: "Editing Session", start: "2023-07-30T10:00", end: "2023-07-30T16:00", type: "work" },
    { id: 4, title: "Final Cut Deadline", start: "2023-08-05T18:00", end: "2023-08-05T18:00", type: "deadline" },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-800">CutPro Studio</h1>
        </div>
        <nav className="mt-6">
          {[
            { id: "communication", label: "Communication", icon: MessageSquare },
            { id: "finances", label: "Finances", icon: DollarSign },
            { id: "schedule", label: "Schedule", icon: Calendar },
            { id: "activity", label: "Activity", icon: Activity },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-4 py-2 flex items-center space-x-2 ${
                activeSection === item.id ? "bg-blue-100 text-blue-600" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeSection === "communication" && (
                <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Team Communication</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {msg.user[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{msg.user}</p>
                          {msg.type === "text" ? (
                            <p className="mt-1 text-gray-600">{msg.content}</p>
                          ) : (
                            <img
                              src={msg.content || "/placeholder.svg"}
                              alt="Shared image"
                              className="mt-2 rounded-lg max-w-xs"
                            />
                          )}
                          <p className="mt-1 text-xs text-gray-400">{msg.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                      <button className="p-2 text-gray-500 hover:text-gray-700">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-500 hover:text-gray-700">
                        <Image className="w-5 h-5" />
                      </button>
                      <button className="p-2 text-gray-500 hover:text-gray-700">
                        <Video className="w-5 h-5" />
                      </button>
                      <button className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "finances" && (
                <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Financial Overview</h2>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200">
                        <Download className="w-4 h-4 inline-block mr-1" />
                        Export
                      </button>
                      <button className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded-md hover:bg-green-200">
                        <Upload className="w-4 h-4 inline-block mr-1" />
                        Import
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-blue-100 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-800">Total Budget</h3>
                        <p className="text-2xl font-bold text-blue-600">$25,000</p>
                      </div>
                      <div className="bg-green-100 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-800">Income</h3>
                        <p className="text-2xl font-bold text-green-600">$15,000</p>
                      </div>
                      <div className="bg-red-100 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-red-800">Expenses</h3>
                        <p className="text-2xl font-bold text-red-600">$7,500</p>
                      </div>
                    </div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Recent Transactions</h3>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Description</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Amount</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Date</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financialTransactions.map((transaction) => (
                              <tr key={transaction.id} className="border-t border-gray-200">
                                <td className="px-4 py-2 text-sm">{transaction.description}</td>
                                <td
                                  className={`px-4 py-2 text-sm font-medium ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}
                                >
                                  ${Math.abs(transaction.amount).toFixed(2)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">{transaction.date}</td>
                                <td className="px-4 py-2 text-sm">{transaction.category}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">Expense Breakdown</h3>
                        <PieChart className="w-full h-40" />
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">Budget Trend</h3>
                        <TrendingUp className="w-full h-40" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "schedule" && (
                <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Project Schedule</h2>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200">
                        <List className="w-4 h-4 inline-block mr-1" />
                        List View
                      </button>
                      <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200">
                        <Grid className="w-4 h-4 inline-block mr-1" />
                        Grid View
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">July 2023</h3>
                        <div className="flex space-x-2">
                          <button className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <div key={day} className="text-center text-sm font-medium text-gray-500">
                            {day}
                          </div>
                        ))}
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                          <div
                            key={date}
                            className="aspect-square bg-white border rounded-lg flex items-center justify-center"
                          >
                            <span className="text-sm">{date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Upcoming Events</h3>
                      {scheduleEvents.map((event) => (
                        <div key={event.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-md font-semibold">{event.title}</h4>
                              <p className="text-sm text-gray-600">
                                {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleTimeString()}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                event.type === "meeting"
                                  ? "bg-blue-100 text-blue-800"
                                  : event.type === "review"
                                    ? "bg-purple-100 text-purple-800"
                                    : event.type === "work"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                              }`}
                            >
                              {event.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "activity" && (
                <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
                  <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Project Activity</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-6">
                      {activities.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                            {activity.user.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-semibold">{activity.user}</span> {activity.action}{" "}
                              <span className="font-semibold">{activity.item}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default ProjectWorkspace

