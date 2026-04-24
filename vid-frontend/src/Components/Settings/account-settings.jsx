

import { useState } from "react"
import { AlertCircle, Smartphone, Shield, Mail, Key, LinkIcon } from "lucide-react"

export function AccountSettings() {
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Read-only data
  const userData = {
    email: "john.doe@example.com",
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
        <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
          <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Account & Security</h2>
          <p className="text-violet-600 dark:text-violet-400 text-sm">
            Manage your login information and account security settings
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Mail className="h-4 w-4 mr-2 text-violet-500" />
                  Email Address
                </label>
                <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-4 py-3 text-gray-800 dark:border-violet-800/50 dark:bg-violet-900/10 dark:text-gray-200 flex items-center justify-between">
                  <span>{userData.email}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50">
                    Verified
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="flex items-center rounded-md border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-violet-500" />
                      Two-Factor Authentication
                    </h4>
                    <span className="flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                      Enabled
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                </label>
              </div>

              <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 dark:border-violet-800/50 dark:bg-violet-900/10">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-violet-100 p-2 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800">
                    <Smartphone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">Authenticator App</h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Use an authenticator app like Google Authenticator or Authy
                    </p>
                    <button className="mt-2 rounded-md bg-white border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:bg-violet-800/50 dark:text-violet-300 dark:border-violet-700 dark:hover:bg-violet-800">
                      Set up
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                <LinkIcon className="h-4 w-4 mr-2 text-violet-500" />
                Linked Accounts
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                      <svg className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.861-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">YouTube</h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Import your videos from YouTube</p>
                    </div>
                  </div>
                  <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-800/50 dark:text-violet-300 dark:hover:bg-violet-800">
                    Connect
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                      <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.2234 0H1.77187C0.792187 0 0 0.773438 0 1.72969V22.2656C0 23.2219 0.792187 24 1.77187 24H22.2234C23.2031 24 24 23.2219 24 22.2703V1.72969C24 0.773438 23.2031 0 22.2234 0ZM7.12031 20.4516H3.55781V8.99531H7.12031V20.4516ZM5.33906 7.43438C4.19531 7.43438 3.27188 6.51094 3.27188 5.37187C3.27188 4.23281 4.19531 3.30937 5.33906 3.30937C6.47813 3.30937 7.40156 4.23281 7.40156 5.37187C7.40156 6.50625 6.47813 7.43438 5.33906 7.43438ZM20.4516 20.4516H16.8937V14.8828C16.8937 13.5562 16.8703 11.8453 15.0422 11.8453C13.1906 11.8453 12.9094 13.2937 12.9094 14.7891V20.4516H9.35625V8.99531H12.7687V10.5609H12.8156C13.2891 9.66094 14.4516 8.70938 16.1813 8.70938C19.7859 8.70938 20.4516 11.0813 20.4516 14.1656V20.4516Z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">LinkedIn</h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Connect to showcase your work history</p>
                    </div>
                  </div>
                  <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-800/50 dark:text-violet-300 dark:hover:bg-violet-800">
                    Connect
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/20 dark:bg-red-900/10">
              <div className="flex items-start">
                <AlertCircle className="mr-3 h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-base font-medium text-red-800 dark:text-red-400">Danger Zone</h3>
                  <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                    Deactivating your account will remove your profile from search results and make your services
                    unavailable.
                  </p>
                  <button className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600">
                    Deactivate Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-violet-200 dark:border-violet-800 dark:bg-slate-900">
            <button
              onClick={() => setShowChangePasswordModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Change Password</h3>
              <p className="text-gray-500 dark:text-gray-400">Create a new secure password for your account</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowChangePasswordModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-violet-700 active:scale-95">
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
