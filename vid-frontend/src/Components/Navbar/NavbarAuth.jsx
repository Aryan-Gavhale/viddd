"use client"

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  LogOut,
  LogIn,
  User,
  Settings,
  HelpCircle,
  Bookmark,
  Heart,
  MessageSquare,
  ChevronDown,
  Briefcase,
  XCircle,
  CheckCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axios";

const NavbarAuth = ({ user, handleLogout, handleLinkClick }) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationSummary, setNotificationSummary] = useState({ unread: 0, total: 0, urgent: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const profileDropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotificationSummary = async () => {
    if (!user?.id) return;
    try {
      const response = await axiosInstance.get("/notifications/summary");
      setNotificationSummary(response.data?.data || { unread: 0, total: 0, urgent: 0 });
    } catch (error) {
      console.error("Error fetching notification summary:", error);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setNotificationError("");
      const response = await axiosInstance.get("/notifications");
      const data = response.data?.data || {};
      setNotifications(data.notifications || []);
      setNotificationSummary((prev) => ({
        ...prev,
        unread: Number(data.unread ?? prev.unread ?? 0),
        total: Number(data.total ?? prev.total ?? 0),
      }));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotificationError(error?.response?.data?.message || "Could not load notifications. Pull down to retry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && isNotificationsOpen) {
      fetchNotifications();
    }
  }, [user?.id, isNotificationsOpen]);

  useEffect(() => {
    if (!user?.id) return undefined;
    fetchNotificationSummary();
    const interval = window.setInterval(fetchNotificationSummary, 45000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axiosInstance.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setNotificationSummary((prev) => ({
        ...prev,
        unread: Math.max(0, Number(prev.unread || 0) - 1),
      }));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error(error?.response?.data?.message || "Could not mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosInstance.put("/notifications/read-all");
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setNotificationSummary((prev) => ({ ...prev, unread: 0, urgent: 0 }));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error(error?.response?.data?.message || "Could not mark all as read");
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const target = notifications.find((n) => n.id === notificationId);
      await axiosInstance.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setNotificationSummary((prev) => ({
        ...prev,
        total: Math.max(0, Number(prev.total || 0) - 1),
        unread: target && !target.isRead ? Math.max(0, Number(prev.unread || 0) - 1) : prev.unread,
      }));
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error(error?.response?.data?.message || "Could not remove notification");
    }
  };

  const unreadCount = Number(notificationSummary.unread || 0);

  const notificationTitle = (notification) => {
    if (notification.metadata?.title) return notification.metadata.title;
    if (notification.entityType === "APPLICATION") return "Application update";
    return String(notification.type || "SYSTEM").split("_").join(" ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  };

  const notificationHref = (notification) => {
    const entityId = notification.entityId || notification.metadata?.entityId;
    if (notification.entityType === "ORDER" && entityId) return `/orders/${entityId}`;
    if (notification.entityType === "MESSAGE" && notification.metadata?.jobId) {
      return `/workspace?jobId=${notification.metadata.jobId}`;
    }
    if (notification.entityType === "APPLICATION") return "/client/jobs";
    return "/notifications";
  };

  // Define base menu sections
  const baseMenuSections = [
    {
      title: "Account",
      items: [
        {
          name: "Dashboard",
          icon: <User className="w-4 h-4" />,
          link: user?.role === "FREELANCER" ? "/editor/dashboard" : user?.role === "CLIENT" ? "/client/dashboard" : "/dashboard",
        },
        {
          name: "Workspace",
          icon: <MessageSquare className="w-4 h-4" />,
          link:
            user?.role === "EDITOR" || user?.role === "FREELANCER"
              ? "/editor/workspace"
              : "/client/workspace",
        },
        {
          name: "Profile",
          icon: <User className="w-4 h-4" />,
          link: user?.role === "FREELANCER" ? `/freelancers/${user?.id}` : user?.role === "CLIENT" ? "/client/profile" : "/dashboard",
        },
        { name: "Settings", icon: <Settings className="w-4 h-4" />, link: "/settings" },
      ],
    },
    {
      title: "Content",
      items: [
        { name: "Saved Items", icon: <Bookmark className="w-4 h-4" />, link: "/saved" },
        { name: "Favorites", icon: <Heart className="w-4 h-4" />, link: "/favorites" },
        { name: "Messages", icon: <MessageSquare className="w-4 h-4" />, link: "/messages" },
      ],
    },
    {
      title: "Support",
      items: [
        { name: "Help Center", icon: <HelpCircle className="w-4 h-4" />, link: "/help" },
        { name: "Logout", icon: <LogOut className="w-4 h-4" />, action: handleLogout },
      ],
    },
  ];

  // Conditionally add "Gigs Dashboard" for freelancers
  const menuSections = user?.role === "FREELANCER"
    ? [
        {
          ...baseMenuSections[0], // Account section
          items: [
            ...baseMenuSections[0].items,
            {
              name: "Gigs Dashboard",
              icon: <Briefcase className="w-4 h-4" />,
              link: "/editor/gigs",
            },
          ],
        },
        ...baseMenuSections.slice(1), // Rest of the sections unchanged
      ]
    : baseMenuSections;

  return (
    <div className="hidden md:flex items-center space-x-4">
      {user?.id ? (
        <>
          <div className="relative" ref={notificationsRef}>
            <button
              className="relative text-gray-700 hover:text-purple-600 transition-colors duration-300 p-2 rounded-full hover:bg-purple-50"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label="Notifications"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full transform transition-transform duration-300 hover:scale-110">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div
              className={`absolute right-0 mt-2 w-80 rounded-xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 transition-all duration-300 z-50 overflow-hidden ${
                isNotificationsOpen
                  ? "opacity-100 translate-y-0 transform scale-100"
                  : "opacity-0 -translate-y-4 pointer-events-none transform scale-95"
              }`}
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                    <p className="text-xs text-gray-500">
                      {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 cursor-pointer transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-500" />
                    <p>Loading notifications...</p>
                  </div>
                ) : notificationError ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-medium text-red-600">{notificationError}</p>
                    <button
                      type="button"
                      onClick={fetchNotifications}
                      className="mt-3 inline-flex items-center rounded-md bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                    >
                      Retry
                    </button>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group px-4 py-3 hover:bg-purple-50 transition-colors duration-200 border-l-4 ${
                        notification.isRead ? "border-transparent" : "border-purple-500"
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3 mt-1 bg-gray-100 rounded-full p-2">
                          {notification.entityType === "APPLICATION" ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : notification.type === "MESSAGE" ? (
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Bell className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Link
                              to={notificationHref(notification)}
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                if (!notification.isRead) handleMarkAsRead(notification.id);
                              }}
                              className={`text-sm font-medium hover:text-purple-700 ${
                              notification.entityType === "APPLICATION" ? "text-red-600" : 
                              notification.isRead ? "text-gray-700" : "text-gray-900"
                            }`}
                            >
                              {notificationTitle(notification)}
                            </Link>
                            <span className="text-xs text-gray-500">
                              {notification.metadata?.rejectedAt 
                                ? new Date(notification.metadata.rejectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`text-xs ${
                            notification.entityType === "APPLICATION" ? "text-red-600" : "text-gray-600"
                          } mt-1`}>
                            {notification.content}
                            {notification.metadata?.jobTitle && (
                              <span className="block mt-1 text-gray-500">
                                Job: {notification.metadata.jobTitle}
                              </span>
                            )}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-[11px] font-medium text-purple-600 hover:text-purple-800"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <p>No notifications yet</p>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 bg-gray-50 text-center">
                <Link
                  to="/notifications"
                  className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    handleLinkClick && handleLinkClick("notifications");
                  }}
                >
                  View all notifications
                </Link>
              </div>
            </div>
          </div>

          <div className="relative group" ref={profileDropdownRef}>
            <button
              className="flex items-center space-x-2 focus:outline-none"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              aria-label="User menu"
            >
              {user.profilePicture ? (
                <div className="relative">
                  <img
                    src={user.profilePicture || "/placeholder.svg"}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-purple-500 transition-all duration-300"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  {user.role === "FREELANCER" && !user.isProfileComplete && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
              ) : (
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold border-2 border-transparent group-hover:border-purple-300 transition-all duration-300 shadow-md">
                  {user.firstname ? user.firstname.charAt(0).toUpperCase() : "U"}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  {user.role === "FREELANCER" && !user.isProfileComplete && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
              )}
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isProfileDropdownOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>

            <div
              className={`absolute right-0 mt-3 w-64 rounded-xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 transition-all duration-300 z-50 ${
                isProfileDropdownOpen
                  ? "opacity-100 translate-y-0 transform scale-100"
                  : "opacity-0 -translate-y-4 pointer-events-none transform scale-95"
              }`}
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture || "/placeholder.svg"}
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                      {user.firstname ? user.firstname.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.firstname || "User"}</p>
                    <p className="text-xs text-gray-500">View your profile</p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                {menuSections.map((section, sectionIndex) => (
                  <div key={section.title} className={sectionIndex > 0 ? "border-t border-gray-100 pt-2 mt-2" : ""}>
                    <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section.title}
                    </p>
                    {section.items
                      .filter(item => !item.condition || item.condition)
                      .map((item) =>
                        item.action ? (
                          <button
                            key={item.name}
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              item.action();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200"
                          >
                            <span className="mr-3 text-gray-500">{item.icon}</span>
                            {item.name}
                          </button>
                        ) : (
                          <Link
                            key={item.name}
                            to={item.link}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-200"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              handleLinkClick && handleLinkClick(item.link.replace("/", ""));
                            }}
                          >
                            <span className="mr-3 text-gray-500">{item.icon}</span>
                            {item.name}
                          </Link>
                        )
                      )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <Link
            to="/login"
            className="relative overflow-hidden group px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors duration-300"
          >
            <span className="relative z-10 flex items-center">
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </span>
            <span className="absolute inset-0 bg-purple-100 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
          </Link>
          <Link
            to="/join"
            className="relative overflow-hidden group px-4 py-2 rounded-md text-sm font-medium text-white transition-colors duration-300"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600"></span>
            <span className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative z-10">Sign Up</span>
          </Link>
        </>
      )}
    </div>
  );
};

export default NavbarAuth;