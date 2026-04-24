
import { Shield, Eye, Lock, Database } from "lucide-react"

export function PrivacySettings() {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
        <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Privacy & Data</h2>
        <p className="text-violet-600 dark:text-violet-400 text-sm">
          Manage your privacy settings and data preferences
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Profile Visibility</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Control who can see your profile in search results
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Show Earnings</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Display your earnings on your public profile
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Data Sharing</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Allow usage data to be shared with third parties
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Cookie Preferences</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage how we use cookies to improve your experience
                  </p>
                </div>
              </div>
              <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
                Manage
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-violet-800 dark:text-violet-300">Data Protection</h3>
                <div className="mt-1 text-sm text-violet-600 dark:text-violet-400">
                  <p>Your data is protected under our privacy policy and GDPR compliance measures</p>
                </div>
                <div className="mt-2">
                  <button className="text-xs font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200">
                    View Privacy Policy →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
