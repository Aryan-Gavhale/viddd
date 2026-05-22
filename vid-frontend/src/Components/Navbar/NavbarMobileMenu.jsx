// src/components/Navbar/NavbarMobileMenu.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Bell, LogOut } from "lucide-react";

const NavbarMobileMenu = ({ isOpen, activeSection, handleLinkClick, role, token, firstname, profilePicture, handleLogout }) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);
  const aboutDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleDropdownOpen(false);
      }
      if (aboutDropdownRef.current && !aboutDropdownRef.current.contains(event.target)) {
        setIsAboutDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roleLabel = role === "FREELANCER" ? "Find Work" : role === "CLIENT" ? "Explore Editors" : "Services";

  return (
    <div
      className={`md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 shadow-lg dark:shadow-black/40 transition-all duration-300 ease-in-out ${
        isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"
      }`}
    >
      <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
        {["home", "contact"].map((item) => (
          <Link
            key={item}
            to={item === "home" ? "/" : `/${item}`}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              activeSection === item ? "text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30" : "text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            }`}
            onClick={() => handleLinkClick(item)}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Link>
        ))}
        <div className="relative" ref={roleDropdownRef}>
          <button
            className={`flex items-center w-full px-3 py-2 rounded-md text-base font-medium ${
              activeSection === "role" ? "text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30" : "text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            }`}
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
          >
            {roleLabel}{" "}
            <ChevronDown className={`ml-1 w-4 h-4 transition-transform duration-200 ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          <div className={`mt-2 space-y-1 ${isRoleDropdownOpen ? "block" : "hidden"}`}>
            {role === "FREELANCER" ? (
              <>
                <Link to="/find-work" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  Find Work
                </Link>
                <Link to="/editor/gigs" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  My Gigs
                </Link>
              </>
            ) : role === "CLIENT" ? (
              <>
                <Link to="/gigs" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  Explore Editors
                </Link>
                <Link to="/client/jobs" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  My Jobs
                </Link>
              </>
            ) : (
              <>
                <Link to="/find-work" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  Find Work
                </Link>
                <Link to="/gigs" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  Explore Editors
                </Link>
                <Link to="/video-production" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  Video Production
                </Link>
                <Link to="/post-production" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  Post-Production
                </Link>
                <Link to="/animation" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("role")}>
                  Animation
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="relative" ref={aboutDropdownRef}>
          <button
            className={`flex items-center w-full px-3 py-2 rounded-md text-base font-medium ${
              activeSection === "about" ? "text-violet-600 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30" : "text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            }`}
            onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}
          >
            About{" "}
            <ChevronDown className={`ml-1 w-4 h-4 transition-transform duration-200 ${isAboutDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          <div className={`mt-2 space-y-1 ${isAboutDropdownOpen ? "block" : "hidden"}`}>
            <Link to="/team" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("about")}>
              Team Members
            </Link>
            <Link to="/pricing" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("about")}>
              Pricing
            </Link>
            <Link to="/blog" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("about")}>
              Blog
            </Link>
            <Link to="/careers" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("about")}>
              Careers
            </Link>
            <Link to="/testimonials" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("about")}>
              Testimonials
            </Link>
          </div>
        </div>
      </div>
      <div className="pt-4 pb-3 border-t border-gray-200 dark:border-slate-800">
        {token ? (
          <>
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-slate-700 flex items-center justify-center text-gray-800 dark:text-slate-100 font-semibold">
                    {firstname ? firstname.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800 dark:text-slate-100">{firstname || "User"}</div>
                <div className="text-sm font-medium text-gray-500 dark:text-slate-400">{role || "Role"}</div>
              </div>
              <Link to="/notifications" className="ml-auto text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400">
                <Bell className="w-6 h-6" />
              </Link>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("dashboard")}>
                Dashboard
              </Link>
              <Link to="/profile" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("profile")}>
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
              >
                <LogOut className="inline w-4 h-4 mr-2" /> Logout
              </button>
            </div>
          </>
        ) : (
          <div className="mt-3 px-2 space-y-1">
            <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("login")}>
              Login
            </Link>
            <Link to="/join" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => handleLinkClick("signup")}>
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavbarMobileMenu;