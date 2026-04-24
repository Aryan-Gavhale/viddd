import { Code, Cog } from 'lucide-react'

export default function SkillsSoftwareCard() {
  const skills = ['Video Editing', 'Color Grading', 'Motion Graphics', 'Sound Design', 'Storytelling']
  const software = ['Adobe Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut Pro', 'Audition']

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Skills & Software</h3>
        <button className="rounded-full bg-blue-100 p-2 text-blue-600 transition-colors hover:bg-blue-200">
          <Cog className="h-5 w-5" />
        </button>
      </div>
      <div className="mb-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">Skills</h4>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span key={skill} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {skill}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">Software</h4>
        <div className="flex flex-wrap gap-2">
          {software.map((sw) => (
            <span key={sw} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
              {sw}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

