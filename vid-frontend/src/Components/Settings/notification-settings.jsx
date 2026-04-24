"use client"

import { Bell, Mail, MessageSquare, Clock } from "lucide-react"

export function NotificationSettings() {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
        <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Notification Preferences</h2>
        <p className="text-violet-600 dark:text-violet-400 text-sm">
          Control how and when you receive notifications from Vidlancing
        </p>
      </div>
      <div className="p-6">
        <div className="mb-6 flex border-b border-violet-200 dark:border-violet-700">
          <button className="border-b-2 border-violet-600 px-4 py-2 text-sm font-medium text-violet-600 dark:border-violet-400 dark:text-violet-400">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Push</span>
            </span>
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>In-App</span>
            </span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Job Invitations</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive emails when clients invite you to their projects
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Messages</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get notified when you receive new messages from clients
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Payment Updates</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive notifications about payments and withdrawals
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Platform News</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Stay updated with new features and platform changes
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Marketing & Promotions</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive special offers and promotional content
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-violet-100 dark:border-violet-800/30">
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-violet-500" />
              Email Frequency
            </h4>
            <div className="space-y-2 rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
              <div className="flex items-center">
                <input
                  id="instant"
                  type="radio"
                  name="frequency"
                  defaultChecked
                  className="h-4 w-4 border-gray-300 text-violet-600 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-violet-600"
                />
                <label htmlFor="instant" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Instant
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="daily"
                  type="radio"
                  name="frequency"
                  className="h-4 w-4 border-gray-300 text-violet-600 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-violet-600"
                />
                <label htmlFor="daily" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Daily Digest
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="weekly"
                  type="radio"
                  name="frequency"
                  className="h-4 w-4 border-gray-300 text-violet-600 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-violet-600"
                />
                <label htmlFor="weekly" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weekly Summary
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
