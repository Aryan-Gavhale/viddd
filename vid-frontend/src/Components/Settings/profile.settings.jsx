
import { Star, Award, Briefcase, Shield, ChevronDown } from "lucide-react"

export function ProfileSettings() {
  // Read-only data
  const userData = {
    name: "John Doe",
    bio: "Video Editor with 5+ years in YouTube content specializing in motion graphics and color grading. Worked with top creators and brands to deliver high-quality video content.",
    skills: ["Motion Graphics", "Color Grading", "Video Editing", "After Effects", "Premiere Pro"],
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
        <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Profile Information</h2>
            <p className="text-violet-600 dark:text-violet-400 text-sm">
              Your professional information visible to clients
            </p>
          </div>
          <div className="px-3 py-1 bg-violet-100 dark:bg-violet-800/40 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
            Public Profile
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <Star className="h-4 w-4 mr-2 text-violet-500" />
                Display Name
              </label>
              <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-4 py-3 text-gray-800 dark:border-violet-800/50 dark:bg-violet-900/10 dark:text-gray-200">
                {userData.name}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <Briefcase className="h-4 w-4 mr-2 text-violet-500" />
                Professional Bio
              </label>
              <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 text-gray-800 dark:border-violet-800/50 dark:bg-violet-900/10 dark:text-gray-200">
                <p>{userData.bio}</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Brief description of your skills and experience
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                <Award className="h-4 w-4 mr-2 text-violet-500" />
                Skills & Expertise
              </label>

              <div className="flex flex-wrap gap-2">
                {userData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Skills that showcase your expertise</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Shield className="h-4 w-4 mr-2 text-violet-500" />
                  Profile Visibility
                </label>
                <button className="flex items-center text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  Advanced Settings
                </button>
              </div>

              <div className="space-y-4 rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Public Profile</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Make your profile visible to everyone</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" defaultChecked className="peer sr-only" />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                  </label>
                </div>

                <div className="border-t border-violet-100 dark:border-violet-800/30 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Available for Work</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show clients you're open to new projects
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" defaultChecked className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                    </label>
                  </div>
                </div>

                <div className="border-t border-violet-100 dark:border-violet-800/30 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Featured Creator</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Apply to be featured on our homepage</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                    <Star className="h-4 w-4" />
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-violet-800 dark:text-violet-300">Complete your profile</h3>
                  <div className="mt-1 text-sm text-violet-600 dark:text-violet-400">
                    <p>Add portfolio items and testimonials to increase your visibility by 40%</p>
                  </div>
                  <div className="mt-2">
                    <button className="text-xs font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200">
                      Complete Profile →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
