import { FolderOpen, Bookmark, CreditCard, Settings, ChevronLeft, Search, User, LogOut } from "lucide-react"


export default function Sidebar({ activeSection, setActiveSection, collapsed, setCollapsed }) {
  const navigation = [
    { id: "projects", name: "Projects", icon: FolderOpen, count: 12 },
    { id: "shortlist", name: "Shortlist", icon: Bookmark, count: 8 },
    { id: "payments", name: "Payments", icon: CreditCard, count: null },
    { id: "settings", name: "Settings", icon: Settings, count: null },
  ]

  return (
    <div
      className={`fixed left-0 top-20 h-[calc(100vh-5rem)] bg-white/80 backdrop-blur-xl border-r border-gray-200/50 transition-all duration-300 z-40 ${collapsed ? "w-20" : "w-72"}`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                FreelanceHub
              </h1>
              <p className="text-sm text-gray-500 mt-1">Enterprise Dashboard</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeSection === item.id
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <item.icon className={`w-5 h-5 ${collapsed ? "mx-auto" : "mr-3"}`} />
            {!collapsed && (
              <>
                <span className="font-medium">{item.name}</span>
                {item.count && (
                  <span
                    className={`ml-auto px-2 py-1 text-xs rounded-full ${
                      activeSection === item.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      
    </div>
  )
}
