import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function AdvancedSearchOptions() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mt-4 w-full max-w-2xl">
      <button
        className="flex w-full items-center justify-between rounded-md bg-blue-100 px-4 py-2 text-blue-700 hover:bg-blue-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Advanced Search Options</span>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isOpen && (
        <div className="mt-2 grid gap-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-2">
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
              Experience Level
            </label>
            <select
              id="experience"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option>Any</option>
              <option>Entry Level</option>
              <option>Intermediate</option>
              <option>Expert</option>
            </select>
          </div>
          <div>
            <label htmlFor="project-length" className="block text-sm font-medium text-gray-700">
              Project Length
            </label>
            <select
              id="project-length"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option>Any</option>
              <option>Less than 1 week</option>
              <option>1 to 4 weeks</option>
              <option>1 to 3 months</option>
              <option>3 to 6 months</option>
              <option>Over 6 months</option>
            </select>
          </div>
          <div>
            <label htmlFor="hours-per-week" className="block text-sm font-medium text-gray-700">
              Hours per week
            </label>
            <select
              id="hours-per-week"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option>Any</option>
              <option>Less than 10 hours</option>
              <option>10 to 20 hours</option>
              <option>20 to 30 hours</option>
              <option>30 to 40 hours</option>
              <option>More than 40 hours</option>
            </select>
          </div>
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
              Keywords
            </label>
            <input
              type="text"
              id="keywords"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., After Effects, Premiere Pro"
            />
          </div>
        </div>
      )}
    </div>
  )
}

