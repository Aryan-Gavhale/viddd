import { useState } from "react"
import { X } from "lucide-react"

export default function SkillsPortfolio({ onNext, onPrev, data }) {
  const [skills, setSkills] = useState(data.skills || [])
  const [newSkill, setNewSkill] = useState("")
  const [portfolioVideos, setPortfolioVideos] = useState(
    data.portfolioVideos || [{ videoUrl: "", title: "", description: "" }],
  )
  const [errors, setErrors] = useState({})

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill])
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove))
  }

  const handleVideoChange = (index, field, value) => {
    const newVideos = [...portfolioVideos]
    newVideos[index][field] = value
    setPortfolioVideos(newVideos)
  }

  const addVideo = () => {
    if (portfolioVideos.length < 5) {
      setPortfolioVideos([...portfolioVideos, { videoUrl: "", title: "", description: "" }])
    }
  }

  const removeVideo = (index) => {
    setPortfolioVideos(portfolioVideos.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    const newErrors = {}
    if (skills.length === 0) newErrors.skills = "At least one skill is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext({ skills, portfolioVideos })
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Skills & Portfolio</h2>
        <p className="text-gray-600 text-sm mt-1">Showcase your skills and portfolio to attract potential clients.</p>
      </div>

      <div>
        <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
          Skills <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            id="skills"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Add a skill"
          />
          <button
            onClick={addSkill}
            type="button"
            className="px-4 py-2 border border-purple-500 rounded-md text-sm font-medium text-purple-500 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="ml-1.5 inline-flex text-purple-500 hover:text-purple-700"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
        {errors.skills ? (
          <p className="text-red-500 text-xs mt-1">{errors.skills}</p>
        ) : (
          <p className="text-gray-500 text-xs mt-1">Add skills that showcase your expertise</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Videos (Max 5)</label>
        {portfolioVideos.map((video, index) => (
          <div key={index} className="space-y-2 mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label htmlFor={`videoUrl-${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                Video URL
              </label>
              <input
                type="text"
                id={`videoUrl-${index}`}
                placeholder="e.g., https://youtube.com/watch?v=..."
                value={video.videoUrl}
                onChange={(e) => handleVideoChange(index, "videoUrl", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label htmlFor={`title-${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id={`title-${index}`}
                placeholder="Enter video title"
                value={video.title}
                onChange={(e) => handleVideoChange(index, "title", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label htmlFor={`description-${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id={`description-${index}`}
                placeholder="Describe this video project"
                value={video.description}
                onChange={(e) => handleVideoChange(index, "description", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={2}
              />
            </div>
            <button
              onClick={() => removeVideo(index)}
              className="text-red-500 hover:text-red-700 text-sm flex items-center"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </button>
          </div>
        ))}
        {portfolioVideos.length < 5 && (
          <button
            onClick={addVideo}
            type="button"
            className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Add Another Video
          </button>
        )}
        <p className="text-gray-500 text-xs mt-2">Add videos that showcase your best work</p>
      </div>

      <div className="flex justify-between pt-6 border-t mt-8">
        <button
          onClick={onPrev}
          className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Previous
        </button>
        <button
          onClick={handleSubmit}
          className="py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Next
        </button>
      </div>
    </div>
  )
}
