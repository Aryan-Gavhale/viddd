
import { Bell, Menu } from "lucide-react"


export default function DashboardHeader({ activeSection, toggleSidebar }) {
  const getSectionTitle = (section) => {
    const titles = {
      projects: "Projects",
      shortlist: "Shortlist",
      payments: "Payments",
      settings: "Settings",
    }
    return titles[section] || "Dashboard"
  }

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getSectionTitle(activeSection)}</h1>
            <p className="text-sm text-gray-500">Manage your freelance projects and team</p>
          </div>
        </div>

       
      </div>
    </header>
  )
}
