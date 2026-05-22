"use client"

import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ChevronDown,
  Briefcase,
  Users,
  Layers,
  BookOpen,
  DollarSign,
} from "lucide-react"

import { SearchBar } from "./search-bar"
import { LikedSection } from "./liked-sections"

const NavbarLinks = ({ activeSection, handleLinkClick, role, user }) => {
  const { t } = useTranslation()
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false)

  const roleDropdownRef = useRef(null)
  const aboutDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false)
      }
      if (aboutDropdownRef.current && !aboutDropdownRef.current.contains(event.target)) {
        setIsAboutDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const roleLabel =
    role === "FREELANCER"
      ? t("nav.jobs", "Find Work")
      : role === "CLIENT"
      ? t("nav.editors", "Explore Editors")
      : t("nav.gigs", "Services")
  const navLabels = {
    home: t("nav.home", "Home"),
    contact: t("footer.contact", "Contact"),
  }

  // SearchBar handles navigation internally; we keep this as a no-op so any
  // future analytics hook has a stable callback to wire into.
  const handleSearch = () => {}

  const roleIcons = {
    findWork: <Briefcase className="w-4 h-4" />,
    myGigs: <Layers className="w-4 h-4" />,
    exploreEditors: <Users className="w-4 h-4" />,
    myJobs: <Briefcase className="w-4 h-4" />,
  }

  const aboutIcons = {
    team: <Users className="w-4 h-4" />,
    pricing: <DollarSign className="w-4 h-4" />,
    blog: <BookOpen className="w-4 h-4" />,
  }

  return (
    <div className="hidden md:flex items-center">
      {/* Navigation Links */}
      <div className="flex items-center space-x-2 mr-4">
        {["home", "contact"].map((item) => (
          <Link
            key={item}
            to={item === "home" ? "/" : `/${item}`}
            onClick={() => handleLinkClick(item)}
            className={`relative group px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              activeSection === item ? "text-violet-600 dark:text-violet-400" : "text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400"
            }`}
          >
            <span className="relative z-10">{navLabels[item] || (item.charAt(0).toUpperCase() + item.slice(1))}</span>

            {/* Animated underline */}
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-400 to-violet-600 transform origin-left transition-transform duration-300 ${
                activeSection === item ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            ></span>

            {/* Hover background effect */}
            <span className="absolute inset-0 bg-violet-50 dark:bg-violet-900/20 rounded-md transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </Link>
        ))}

        {/* Role Dropdown */}
        <div className="relative group" ref={roleDropdownRef}>
          <button
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              activeSection === "role" ? "text-violet-600 dark:text-violet-400" : "text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400"
            }`}
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
          >
            <span className="relative z-10 flex items-center">
              {roleLabel}
              <ChevronDown
                className={`ml-1 w-4 h-4 transition-transform duration-300 ${isRoleDropdownOpen ? "rotate-180" : ""}`}
              />
            </span>

            {/* Animated underline */}
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-400 to-violet-600 transform origin-left transition-transform duration-300 ${
                activeSection === "role" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            ></span>

            {/* Hover background effect */}
            <span className="absolute inset-0 bg-violet-50 dark:bg-violet-900/20 rounded-md transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </button>

          {/* Role Dropdown Menu */}
          <div
            className={`absolute left-0 mt-2 w-56 rounded-xl shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 dark:ring-white/10 transition-all duration-300 z-50 overflow-hidden ${
              isRoleDropdownOpen
                ? "opacity-100 translate-y-0 transform scale-100"
                : "opacity-0 -translate-y-4 pointer-events-none transform scale-95"
            }`}
          >
            <div className="py-2" role="menu">
              {role === "FREELANCER" ? (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                    {t("nav.freelancerOptions", "Freelancer Options")}
                  </div>
                  <Link
                    to="/find-work"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                      {roleIcons.findWork}
                    </span>
                    <div>
                      <div className="font-medium">{t("jobs.findWork", "Find Work")}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{t("nav.browseProjects", "Browse available projects")}</div>
                    </div>
                  </Link>
                  <Link
                    to="/editor/gigs"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3">
                      {roleIcons.myGigs}
                    </span>
                    <div>
                      <div className="font-medium">{t("gigs.myGigs", "My Gigs")}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{t("nav.manageServices", "Manage your services")}</div>
                    </div>
                  </Link>
                </>
              ) : role === "CLIENT" ? (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                    {t("nav.clientOptions", "Client Options")}
                  </div>
                  <Link
                    to="/gigs"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                      {roleIcons.exploreEditors}
                    </span>
                    <div>
                      <div className="font-medium">{t("nav.exploreEditors", "Explore Editors")}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{t("nav.findProfessionals", "Find talented professionals")}</div>
                    </div>
                  </Link>
                  <Link
                    to="/client/jobs"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3">
                      {roleIcons.myJobs}
                    </span>
                    <div>
                      <div className="font-medium">{t("jobs.myJobs", "My Jobs")}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{t("nav.manageProjects", "Manage your projects")}</div>
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                    {t("nav.availableServices", "Available Services")}
                  </div>
                  {[
                    { id: "findWork", labelKey: "jobs.findWork", fallback: "Find Work", path: "/find-work", descKey: "nav.browseProjects", desc: "Browse available projects" },
                    { id: "exploreEditors", labelKey: "nav.exploreEditors", fallback: "Explore Editors", path: "/gigs", descKey: "nav.findProfessionals", desc: "Find talented professionals" },
                  ].map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200"
                      onClick={() => handleLinkClick("role")}
                    >
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                        {roleIcons[item.id]}
                      </span>
                      <div>
                        <div className="font-medium">{t(item.labelKey, item.fallback)}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{t(item.descKey, item.desc)}</div>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* About Dropdown */}
        <div className="relative group" ref={aboutDropdownRef}>
          <button
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              activeSection === "about" ? "text-violet-600 dark:text-violet-400" : "text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400"
            }`}
            onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}
          >
            <span className="relative z-10 flex items-center">
              {t("nav.about", "About")}
              <ChevronDown
                className={`ml-1 w-4 h-4 transition-transform duration-300 ${isAboutDropdownOpen ? "rotate-180" : ""}`}
              />
            </span>

            {/* Animated underline */}
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-400 to-violet-600 transform origin-left transition-transform duration-300 ${
                activeSection === "about" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            ></span>

            {/* Hover background effect */}
            <span className="absolute inset-0 bg-violet-50 dark:bg-violet-900/20 rounded-md transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </button>

          {/* About Dropdown Menu */}
          <div
            className={`absolute left-0 mt-2 w-56 rounded-xl shadow-xl bg-white dark:bg-slate-900 ring-1 ring-black ring-opacity-5 dark:ring-white/10 transition-all duration-300 z-50 overflow-hidden ${
              isAboutDropdownOpen
                ? "opacity-100 translate-y-0 transform scale-100"
                : "opacity-0 -translate-y-4 pointer-events-none transform scale-95"
            }`}
          >
            <div className="py-2" role="menu">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                {t("footer.about", "About Us")}
              </div>
              {[
                { id: "team", labelKey: "routes.team", fallback: "Our Team", path: "/team", descKey: "nav.meetTeam", desc: "Meet our talented team" },
                { id: "pricing", labelKey: "nav.pricing", fallback: "Pricing", path: "/pricing", descKey: "nav.serviceRates", desc: "Service rates and packages" },
                { id: "blog", labelKey: "footer.blog", fallback: "Blog", path: "/blog", descKey: "nav.industryInsights", desc: "Industry insights and news" },
              ].map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200"
                  onClick={() => handleLinkClick("about")}
                >
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                    {aboutIcons[item.id]}
                  </span>
                  <div>
                    <div className="font-medium">{t(item.labelKey, item.fallback)}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{t(item.descKey, item.desc)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="flex items-center">
        <SearchBar role={role} onSearch={handleSearch} />

        {/* Liked Section with Heart Icon */}
        <LikedSection user={user} />
      </div>
    </div>
  )
}

// Add this to your global CSS file

export default NavbarLinks