"use client"

import { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
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

  const roleLabel = role === "FREELANCER" ? "Find Work" : role === "CLIENT" ? "Explore Editors" : "Services"

  // SearchBar handles navigation internally; we keep this as a no-op so any
  // future analytics hook has a stable callback to wire into.
  const handleSearch = () => {}

  const roleIcons = {
    "Find Work": <Briefcase className="w-4 h-4" />,
    "My Gigs": <Layers className="w-4 h-4" />,
    "Explore Editors": <Users className="w-4 h-4" />,
    "My Jobs": <Briefcase className="w-4 h-4" />,
  }

  const aboutIcons = {
    "Team Members": <Users className="w-4 h-4" />,
    Pricing: <DollarSign className="w-4 h-4" />,
    Blog: <BookOpen className="w-4 h-4" />,
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
              activeSection === item ? "text-purple-600" : "text-gray-700 hover:text-purple-600"
            }`}
          >
            <span className="relative z-10">{item.charAt(0).toUpperCase() + item.slice(1)}</span>

            {/* Animated underline */}
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 transform origin-left transition-transform duration-300 ${
                activeSection === item ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            ></span>

            {/* Hover background effect */}
            <span className="absolute inset-0 bg-purple-50 rounded-md transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </Link>
        ))}

        {/* Role Dropdown */}
        <div className="relative group" ref={roleDropdownRef}>
          <button
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              activeSection === "role" ? "text-purple-600" : "text-gray-700 hover:text-purple-600"
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
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 transform origin-left transition-transform duration-300 ${
                activeSection === "role" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            ></span>

            {/* Hover background effect */}
            <span className="absolute inset-0 bg-purple-50 rounded-md transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </button>

          {/* Role Dropdown Menu */}
          <div
            className={`absolute left-0 mt-2 w-56 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 transition-all duration-300 z-50 overflow-hidden ${
              isRoleDropdownOpen
                ? "opacity-100 translate-y-0 transform scale-100"
                : "opacity-0 -translate-y-4 pointer-events-none transform scale-95"
            }`}
          >
            <div className="py-2" role="menu">
              {role === "FREELANCER" ? (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Freelancer Options
                  </div>
                  <Link
                    to="/find-work"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                      {roleIcons["Find Work"]}
                    </span>
                    <div>
                      <div className="font-medium">Find Work</div>
                      <div className="text-xs text-gray-500">Browse available projects</div>
                    </div>
                  </Link>
                  <Link
                    to="/editor/gigs"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3">
                      {roleIcons["My Gigs"]}
                    </span>
                    <div>
                      <div className="font-medium">My Gigs</div>
                      <div className="text-xs text-gray-500">Manage your services</div>
                    </div>
                  </Link>
                </>
              ) : role === "CLIENT" ? (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Client Options
                  </div>
                  <Link
                    to="/gigs"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                      {roleIcons["Explore Editors"]}
                    </span>
                    <div>
                      <div className="font-medium">Explore Editors</div>
                      <div className="text-xs text-gray-500">Find talented professionals</div>
                    </div>
                  </Link>
                  <Link
                    to="/client/jobs"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                    onClick={() => handleLinkClick("role")}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3">
                      {roleIcons["My Jobs"]}
                    </span>
                    <div>
                      <div className="font-medium">My Jobs</div>
                      <div className="text-xs text-gray-500">Manage your projects</div>
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Available Services
                  </div>
                  {[
                    { name: "Find Work", path: "/find-work", desc: "Browse available projects" },
                    { name: "Explore Editors", path: "/gigs", desc: "Find talented professionals" },
                  ].map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                      onClick={() => handleLinkClick("role")}
                    >
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                        {roleIcons[item.name]}
                      </span>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
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
              activeSection === "about" ? "text-purple-600" : "text-gray-700 hover:text-purple-600"
            }`}
            onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}
          >
            <span className="relative z-10 flex items-center">
              About
              <ChevronDown
                className={`ml-1 w-4 h-4 transition-transform duration-300 ${isAboutDropdownOpen ? "rotate-180" : ""}`}
              />
            </span>

            {/* Animated underline */}
            <span
              className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 transform origin-left transition-transform duration-300 ${
                activeSection === "about" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
            ></span>

            {/* Hover background effect */}
            <span className="absolute inset-0 bg-purple-50 rounded-md transform scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
          </button>

          {/* About Dropdown Menu */}
          <div
            className={`absolute left-0 mt-2 w-56 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 transition-all duration-300 z-50 overflow-hidden ${
              isAboutDropdownOpen
                ? "opacity-100 translate-y-0 transform scale-100"
                : "opacity-0 -translate-y-4 pointer-events-none transform scale-95"
            }`}
          >
            <div className="py-2" role="menu">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                About Us
              </div>
              {[
                { name: "Team Members", path: "/team", desc: "Meet our talented team" },
                { name: "Pricing", path: "/pricing", desc: "Service rates and packages" },
                { name: "Blog", path: "/blog", desc: "Industry insights and news" },
              ].map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                  onClick={() => handleLinkClick("about")}
                >
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                    {aboutIcons[item.name]}
                  </span>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
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