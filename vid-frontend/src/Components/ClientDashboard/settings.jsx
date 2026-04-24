"use client"

import { useState } from "react"
import { User, Users, Bell, CreditCard, Shield, Camera, Plus, Trash2 } from "lucide-react"

export default function SettingsSection() {
  const [activeTab, setActiveTab] = useState("profile")

  const tabs = [
    { id: "profile", name: "Profile", icon: User },
    { id: "team", name: "Team Management", icon: Users },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "billing", name: "Billing & Invoicing", icon: CreditCard },
    { id: "security", name: "Security", icon: Shield },
  ]

  const teamMembers = [
    {
      id: 1,
      name: "Alice Johnson",
      email: "alice@company.com",
      role: "Admin",
      status: "Active",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      name: "Bob Smith",
      email: "bob@company.com",
      role: "Viewer",
      status: "Active",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Profile Picture</h3>
                <p className="text-gray-600">Upload a professional photo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  defaultValue="John"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  defaultValue="Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  defaultValue="john@company.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  defaultValue="+1 (555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  defaultValue="Acme Corporation"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                Save Changes
              </button>
            </div>
          </div>
        )

      case "team":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
                <p className="text-gray-600">Manage your team access and permissions</p>
              </div>
              <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-white rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={member.avatar || "/placeholder.svg"}
                        alt={member.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                        <option value="approver">Approver</option>
                      </select>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {member.status}
                      </span>
                      <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { title: "Project Updates", description: "Get notified when projects are updated" },
                  { title: "New Messages", description: "Receive notifications for new messages" },
                  { title: "Payment Alerts", description: "Get alerts for payment confirmations" },
                  { title: "Deadline Reminders", description: "Reminders for upcoming deadlines" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm">In-app</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "billing":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                <input
                  type="text"
                  placeholder="Enter GST number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company PAN</label>
                <input
                  type="text"
                  placeholder="Enter PAN number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Billing Address</label>
              <textarea
                rows={4}
                placeholder="Enter complete billing address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-between items-center">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:shadow-lg transition-all duration-200">
                Save Billing Info
              </button>
              <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Export All Invoices
              </button>
            </div>
          </div>
        )

      case "security":
        return (
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Enable 2FA
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Change Password</h4>
                  <p className="text-sm text-gray-500">Update your account password</p>
                </div>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Change Password
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Recent Login Activity</h4>
              <div className="space-y-3">
                {[
                  { location: "New York, US", time: "2 hours ago", device: "Chrome on MacOS" },
                  { location: "London, UK", time: "1 day ago", device: "Safari on iPhone" },
                  { location: "Tokyo, JP", time: "3 days ago", device: "Firefox on Windows" },
                ].map((login, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{login.location}</p>
                      <p className="text-sm text-gray-500">{login.device}</p>
                    </div>
                    <span className="text-sm text-gray-500">{login.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Settings Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">{renderTabContent()}</div>
    </div>
  )
}
