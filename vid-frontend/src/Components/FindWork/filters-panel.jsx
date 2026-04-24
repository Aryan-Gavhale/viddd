import { useState } from 'react'
import { Sliders, X } from 'lucide-react'

export function FiltersPanel() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-20 rounded-full bg-blue-600 p-3 text-white shadow-lg md:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Sliders className="h-6 w-6" />
      </button>
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform overflow-y-auto bg-white p-6 shadow-lg transition-transform duration-300 ease-in-out md:static md:block md:transform-none md:shadow-none ${
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
            <h4 className="mb-2 font-semibold">Budget Range</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Min"
              />
              <span>-</span>
              <input
                type="number"
                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Max"
              />
            </div>
          </div>
          <div>
            <h4 className="mb-2 font-semibold">Categories</h4>
            <div className="space-y-2">
              {['Video Editing', 'Motion Graphics', 'Color Grading', 'Sound Design', 'VFX'].map(
                (category) => (
                  <label key={category} className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    {category}
                  </label>
                )
              )}
            </div>
          </div>
          <div>
            <h4 className="mb-2 font-semibold">Deadline</h4>
            <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
              <option>Any</option>
              <option>Less than 24 hours</option>
              <option>1 to 3 days</option>
              <option>3 to 7 days</option>
              <option>1 to 2 weeks</option>
              <option>2 to 4 weeks</option>
              <option>More than 4 weeks</option>
            </select>
          </div>
        </div>
      </div>
    </>
  )
}

