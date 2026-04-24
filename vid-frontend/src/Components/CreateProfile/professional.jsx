import { useState } from "react"

export default function ProfessionalOverview({ onNext, onPrev, data }) {
  const [formData, setFormData] = useState({
    jobTitle: data.jobTitle || "",
    overview: data.overview || "",
    languages: data.languages || [],
  })
  const [newLanguage, setNewLanguage] = useState("")
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const addLanguage = () => {
    if (newLanguage && !formData.languages.includes(newLanguage)) {
      setFormData({ ...formData, languages: [...formData.languages, newLanguage] })
      setNewLanguage("")
    }
  }

  const removeLanguage = (lang) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter((language) => language !== lang),
    })
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.jobTitle) newErrors.jobTitle = "Job title is required"
    if (!formData.overview) newErrors.overview = "Professional overview is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext(formData)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Professional Overview</h2>
        <p className="text-gray-600 text-sm mt-1">Tell clients about your professional background and expertise.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="jobTitle"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.jobTitle ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500`}
            placeholder="e.g., Video Editor, Cinematographer"
            required
          />
          {errors.jobTitle ? (
            <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">Your professional title that describes your expertise</p>
          )}
        </div>

        <div>
          <label htmlFor="overview" className="block text-sm font-medium text-gray-700 mb-1">
            Professional Overview <span className="text-red-500">*</span>
          </label>
          <textarea
            id="overview"
            name="overview"
            rows={5}
            value={formData.overview}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${
              errors.overview ? "border-red-300" : "border-gray-300"
            } rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none`}
            placeholder="Describe your professional background, experience, and expertise..."
            required
          ></textarea>
          {errors.overview ? (
            <p className="text-red-500 text-xs mt-1">{errors.overview}</p>
          ) : (
            <p className="text-gray-500 text-xs mt-1">A comprehensive summary of your professional experience</p>
          )}
        </div>

        <div>
          <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">
            Languages
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              id="languages"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Add a language"
            />
            <button
              onClick={addLanguage}
              type="button"
              className="px-4 py-2 border border-purple-500 rounded-md text-sm font-medium text-purple-500 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.languages.map((language) => (
              <span
                key={language}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
              >
                {language}
                <button
                  type="button"
                  onClick={() => removeLanguage(language)}
                  className="ml-1.5 inline-flex text-purple-500 hover:text-purple-700"
                >
                  <span className="sr-only">Remove {language}</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-1">Languages you speak and your proficiency level</p>
        </div>
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
