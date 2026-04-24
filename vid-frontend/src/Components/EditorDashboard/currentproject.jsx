import { Clock, MoreVertical } from 'lucide-react'


export default function CurrentProjectsCard() {
  const projects = [
    { id: '1', title: 'Corporate Training Series', client: 'TechCorp', deadline: '2023-07-15', progress: 65 },
    { id: '2', title: 'Wedding Highlight Reel', client: 'Johnson Family', deadline: '2023-07-10', progress: 80 },
    { id: '3', title: 'Product Launch Video', client: 'GadgetCo', deadline: '2023-07-20', progress: 30 },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Current Projects</h3>
      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{project.title}</h4>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-gray-600">Client: {project.client}</p>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Deadline: {project.deadline}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${project.progress}%` }}
              ></div>
            </div>
            <p className="mt-1 text-right text-xs text-gray-600">{project.progress}% Complete</p>
          </div>
        ))}
      </div>
    </div>
  )
}

