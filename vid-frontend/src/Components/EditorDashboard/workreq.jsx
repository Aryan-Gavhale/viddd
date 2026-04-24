import { Briefcase, Filter } from 'lucide-react'

export default function WorkRequestsCard() {
  const jobCategories = [
    { name: 'Available Jobs', count: 15 },
    { name: 'My Applications', count: 5 },
    { name: 'Job Invitations', count: 3 },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Work Requests</h3>
        <button className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>
      <div className="space-y-4">
        {jobCategories.map((category) => (
          <div key={category.name} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100">
            <span className="text-sm font-medium text-gray-700">{category.name}</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600">
              {category.count}
            </span>
          </div>
        ))}
      </div>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
        <Briefcase className="h-4 w-4" />
        View All Jobs
      </button>
    </div>
  )
}

