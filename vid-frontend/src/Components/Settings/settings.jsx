import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronRight, X, Save, SettingsIcon } from "lucide-react"

import { ProfileSettings } from "./profile.settings"
import { AccountSettings } from "./account-settings"
import { NotificationSettings } from "./notification-settings"
import { PaymentSettings } from "./payment.settings"
import { GigSettings } from "./gig-settings"
import { VideoSettings } from "./video-settings"
import { AppearanceSettings } from "./appearance-settings"
import { PrivacySettings } from "./privacy-settings"
import { cn } from "../../lib/utils"

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile")
  const [saved, setSaved] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setShowModal(true)
    setTimeout(() => {
      setSaved(false)
      setTimeout(() => {
        setShowModal(false)
      }, 500)
    }, 2000)
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "account", label: "Account & Security" },
    { id: "notifications", label: "Notifications" },
    { id: "payment", label: "Payment"},
    { id: "gigs", label: "Gig Preferences" },
    { id: "video", label: "Video Tools" },
    { id: "appearance", label: "Appearance" },
    { id: "privacy", label: "Privacy & Data" },
  ]

  return (
    <div className="mx-auto max-w-6xl mt-10 mb-10 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <SettingsIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your account settings and preferences</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={handleSave}
            className="relative rounded-md bg-violet-600 hover:bg-violet-700 px-8 py-2.5 text-white border border-violet-700 transition-all hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] active:scale-95 flex items-center space-x-2"
          >
            {saved ? (
              <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center">
                <Check className="mr-2 h-4 w-4" /> Saved
              </motion.span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white"
            >
              <Check className="h-3 w-3" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="hidden md:block">
          <div className="sticky top-10 space-y-1 rounded-xl border border-violet-200 dark:border-violet-800 bg-white p-4 dark:bg-slate-900">
            <div className="mb-4 px-3 py-2">
              <div className="h-1 w-12 rounded-full bg-violet-200 dark:bg-violet-800 mb-2"></div>
              <div className="h-1 w-20 rounded-full bg-violet-100 dark:bg-violet-900/50"></div>
            </div>
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all",
                  activeTab === item.id
                    ? "bg-violet-50 text-violet-700 border-l-4 border-violet-600 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-500"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50",
                )}
              >
                <div className="flex items-center">
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </div>
                {activeTab === item.id && <ChevronRight className="h-4 w-4" />}
              </button>
            ))}

            <div className="mt-8 rounded-lg border border-dashed border-violet-300 dark:border-violet-800 p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Need help with settings?</p>
              <button className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
                Contact Support
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-6 overflow-x-auto md:hidden">
            <div className="flex space-x-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-white p-2 dark:bg-slate-900">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center",
                    activeTab === item.id
                      ? "bg-violet-600 text-white"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50",
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className={cn("space-y-6", activeTab === "profile" ? "block" : "hidden")}>
              <ProfileSettings />
            </div>
            <div className={cn("space-y-6", activeTab === "account" ? "block" : "hidden")}>
              <AccountSettings />
            </div>
            <div className={cn("space-y-6", activeTab === "notifications" ? "block" : "hidden")}>
              <NotificationSettings />
            </div>
            <div className={cn("space-y-6", activeTab === "payment" ? "block" : "hidden")}>
              <PaymentSettings />
            </div>
            <div className={cn("space-y-6", activeTab === "gigs" ? "block" : "hidden")}>
              <GigSettings />
            </div>
            <div className={cn("space-y-6", activeTab === "video" ? "block" : "hidden")}>
              <VideoSettings />
            </div>
            <div className={cn("space-y-6", activeTab === "appearance" ? "block" : "hidden")}>
              <AppearanceSettings />
            </div>
            <div className={cn("space-y-6", activeTab === "privacy" ? "block" : "hidden")}>
              <PrivacySettings />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative mx-4 max-w-md rounded-2xl bg-white border border-violet-200 p-6 dark:bg-slate-900 dark:border-violet-800"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-violet-50 border border-violet-200 dark:bg-violet-900/30 dark:border-violet-800">
                  <Check className="h-10 w-10 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Settings Saved!</h3>
                <p className="mb-6 text-gray-500 dark:text-gray-400">
                  Your changes have been successfully saved and applied to your account.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-md bg-violet-600 hover:bg-violet-700 px-6 py-2.5 text-white border border-violet-700 transition-all hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] active:scale-95"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
