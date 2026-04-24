
import { FileVideo, Lock, Upload } from "lucide-react"

export function VideoSettings() {
  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900">
      <div className="border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-6 py-4">
        <h2 className="text-xl font-bold text-violet-900 dark:text-violet-100">Video Tools & Settings</h2>
        <p className="text-violet-600 dark:text-violet-400 text-sm">
          Configure video-specific preferences for your portfolio and deliverables
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 mr-2 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                <Upload className="h-3.5 w-3.5" />
              </div>
              Upload Settings
            </h4>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Video Format</label>
              <select className="w-full rounded-md border border-violet-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-violet-700 dark:bg-violet-900/20 dark:text-gray-200">
                <option value="mp4" selected>
                  MP4 (H.264)
                </option>
                <option value="mov">MOV (QuickTime)</option>
                <option value="avi">AVI</option>
                <option value="webm">WebM</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This format will be used for preview videos and default exports
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Default Resolution</label>
              <select className="w-full rounded-md border border-violet-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-violet-700 dark:bg-violet-900/20 dark:text-gray-200">
                <option value="720p">720p (HD)</option>
                <option value="1080p" selected>
                  1080p (Full HD)
                </option>
                <option value="2k">2K</option>
                <option value="4k">4K (Ultra HD)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 mr-2 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                    <FileVideo className="h-3.5 w-3.5" />
                  </div>
                  Portfolio Watermark
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
                  Add your logo or name to portfolio videos
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" defaultChecked className="peer sr-only" />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="rounded-lg border-2 border-dashed border-violet-200 p-4 text-center dark:border-violet-700">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
                <div className="mb-4 rounded-full bg-violet-100 p-2 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800">
                  <Upload className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="mb-1 text-sm font-medium text-gray-900 dark:text-white">Upload Watermark Image</h3>
                <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                  PNG or SVG with transparent background recommended
                </p>
                <button className="rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30">
                  Select Image
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                <select className="w-full rounded-md border border-violet-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-violet-700 dark:bg-violet-900/20 dark:text-gray-200">
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right" selected>
                    Bottom Right
                  </option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Opacity</label>
                <div className="pt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="50"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 mr-2 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  Video Privacy
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
                  Control who can view your portfolio videos
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 border border-green-200 dark:bg-green-900/20 dark:border-green-800/50">
                  <FileVideo className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Public Videos</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Anyone can view these videos on your profile
                  </p>
                </div>
                <select className="w-[140px] rounded-md border border-violet-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-violet-700 dark:bg-violet-900/20 dark:text-gray-200">
                  <option value="all" selected>
                    All Videos
                  </option>
                  <option value="selected">Selected Only</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Private Videos</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Only visible to clients you've shared with</p>
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-[140px] rounded-md border border-violet-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-violet-700 dark:bg-violet-900/20 dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h4 className="text-base font-medium text-gray-900 dark:text-white flex items-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 mr-2 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                <FileVideo className="h-3.5 w-3.5" />
              </div>
              Video Player Settings
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Autoplay Portfolio Videos</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Videos will play automatically when a client views your profile
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                </label>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Loop Videos</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Videos will play on repeat</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                </label>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-violet-100 p-4 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white">Show Controls</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display playback controls on portfolio videos
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
