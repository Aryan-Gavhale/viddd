
import { Clock, PauseCircle, CheckCircle } from "lucide-react"

export function GigSettings() {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
        <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Gig & Work Preferences</h2>
        <p className="text-violet-600 dark:text-violet-400 text-sm">Manage your service offerings and availability</p>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white">Availability Status</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Let clients know if you're currently accepting new work
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Available</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-violet-100 p-2 border border-violet-200 dark:bg-violet-900/30 dark:border-violet-800">
                  <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Response Time Expectation</h5>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Set client expectations for how quickly you typically respond
                  </p>
                  <select className="w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-violet-700 dark:bg-violet-900/20 dark:text-gray-200">
                    <option value="1">Within 1 hour</option>
                    <option value="4" selected>
                      Within 4 hours
                    </option>
                    <option value="24">Within 24 hours</option>
                    <option value="48">Within 2 days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 mr-2 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                <PauseCircle className="h-3.5 w-3.5" />
              </div>
              Active Gigs
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 transition-colors hover:bg-violet-50/50 dark:border-violet-800/50 dark:hover:bg-violet-900/10 bg-white dark:bg-slate-900">
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">Professional Video Editing</h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Starting at $150</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
                    Edit
                  </button>
                  <button className="flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    <PauseCircle className="mr-1 h-4 w-4" />
                    Pause
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 transition-colors hover:bg-violet-50/50 dark:border-violet-800/50 dark:hover:bg-violet-900/10 bg-white dark:bg-slate-900">
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white">Motion Graphics & Animation</h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Starting at $250</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
                    Edit
                  </button>
                  <button className="flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                    <PauseCircle className="mr-1 h-4 w-4" />
                    Pause
                  </button>
                </div>
              </div>
            </div>

            <button className="flex w-full items-center justify-center rounded-md border border-violet-300 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
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
                className="mr-2 h-4 w-4"
              >
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              Create New Gig
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
