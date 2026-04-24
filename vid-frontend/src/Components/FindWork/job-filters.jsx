import { useState } from 'react'
import { Search, Sliders, X } from 'lucide-react'

export function JobFilters() {
  const [isOpen, setIsOpen] = useState(false)

  const categories = [
    'Video Editing',
    'Motion Graphics',
    'Color Grading',
    'VFX',
    'Sound Design',
    'Animation',
    '3D Modeling',
    'Compositing',
  ]

  const experienceLevels = ['Entry Level', 'Intermediate', 'Expert']

  const projectLengths = [
    'Less than 1 week',
    '1 to 4 weeks',
    '1 to 3 months',
    '3 to 6 months',
    'Over 6 months',
  ]

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-20 rounded-full bg-blue-600 p-3 text-white shadow-lg md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Sliders className="h-6 w-6" />
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-30 w-80 transform overflow-y-auto bg-white p-6 shadow-lg transition-transform duration-300 ease-in-out md:sticky md:top-0 md:block md:h-[calc(100vh-2rem)] md:transform-none md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between md:hidden">
          <h3 className="text-lg font-semibold">Filters</h3>
          <button onClick={() => setIsOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="mb-4 font-semibold">Search</h4>
            <div className="relative">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search jobs..."
              />
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Categories</h4>
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{category}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Experience Level</h4>
            <div className="space-y-2">
              {experienceLevels.map((level) => (
                <label key={level} className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Project Length</h4>
            <div className="space-y-2">
              {projectLengths.map((length) => (
                <label key={length} className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{length}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Hourly Rate</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-24 rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Min"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  className="w-24 rounded-md border border-gray-300 px-3 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Max"
                />
              </div>
              <input
                type="range"
                min="0"
                max="200"
                className="w-full"
                defaultValue="100"
              />
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Client History</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Payment verified</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Has verified payment method</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">$1K+ spent</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

