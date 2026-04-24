import { useState } from 'react'
import { Film, Wand2, Palette, Sparkles, Music, Play, CuboidIcon as Cube, Layers } from 'lucide-react'



const categories= [
  { icon: Film, label: 'Video Editing', color: 'bg-blue-500' },
  { icon: Wand2, label: 'Motion Graphics', color: 'bg-purple-500' },
  { icon: Palette, label: 'Color Grading', color: 'bg-pink-500' },
  { icon: Sparkles, label: 'VFX', color: 'bg-yellow-500' },
  { icon: Music, label: 'Sound Design', color: 'bg-green-500' },
  { icon: Play, label: 'Animation', color: 'bg-red-500' },
  { icon: Cube, label: '3D Modeling', color: 'bg-indigo-500' },
  { icon: Layers, label: 'Compositing', color: 'bg-orange-500' },
]

export function Sidebar() {
  const [selectedCategories, setSelectedCategories] = useState([])
  const [budgetRange, setBudgetRange] = useState({ min: '', max: '' })
  const [projectLength, setProjectLength] = useState([])

  const toggleCategory = (label) => {
    setSelectedCategories(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    )
  }

  const toggleProjectLength = (duration) => {
    setProjectLength(prev =>
      prev.includes(duration) ? prev.filter(d => d !== duration) : [...prev, duration]
    )
  }

  return (
    <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
      <div className="p-6">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Find Work</h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="mb-4 text-sm font-medium text-gray-500">CATEGORIES</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.label}
                  onClick={() => toggleCategory(category.label)}
                  className={`group flex w-full items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                    selectedCategories.includes(category.label)
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`rounded p-2 ${category.color} bg-opacity-10`}>
                    <category.icon className={`h-4 w-4 ${category.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-gray-500">BUDGET RANGE</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Min"
                  value={budgetRange.min}
                  onChange={(e) => setBudgetRange(prev => ({ ...prev, min: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Max"
                  value={budgetRange.max}
                  onChange={(e) => setBudgetRange(prev => ({ ...prev, max: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-medium text-gray-500">PROJECT LENGTH</h3>
            <div className="space-y-2">
              {['Less than 1 week', '1 to 4 weeks', '1 to 3 months', '3+ months'].map((duration) => (
                <button
                  key={duration}
                  onClick={() => toggleProjectLength(duration)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${
                    projectLength.includes(duration)
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                    projectLength.includes(duration)
                      ? 'border-4 border-blue-500'
                      : 'border-gray-300'
                  }`} />
                  <span className="text-sm font-medium text-gray-900">{duration}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

